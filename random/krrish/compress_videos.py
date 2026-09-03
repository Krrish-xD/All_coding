#!/usr/bin/env python3
"""Recursive video compressor using FFmpeg + SVT-AV1.

This script scans a source directory for common video files and re-encodes
them into MP4 containers with libsvtav1 video compression while preserving
folder structure in an output directory.

Features:
- Recursive source traversal
- Common video formats supported: .mp4, .mkv, .mov, .avi, .webm, .m4v
- Skips already encoded files via resume support and existing output detection
- Uses ffprobe for input validation
- Preserves metadata and subtitles where possible
- Parallel encoding matching CPU resources
- Detailed size logging, encoding time, and summary CSV output
- Error logging and continued execution on failures
- Graceful shutdown on SIGINT/SIGTERM with in-flight encode cleanup
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import shutil
import signal
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

SUPPORTED_EXTENSIONS = {".mp4", ".mkv", ".mov", ".avi", ".webm", ".m4v"}
DEFAULT_CSV = "compression_results.csv"
DEFAULT_ERRORS = "compression_errors.log"


@dataclass
class VideoTask:
    source_path: Path
    output_path: Path
    relative_path: Path


@dataclass
class CompressionResult:
    source_path: Path
    output_path: Path
    original_size: int
    compressed_size: int
    saved_percent: float
    status: str
    encoding_time_seconds: float
    error_message: Optional[str] = None


def find_executable(name: str) -> Path:
    path = shutil.which(name)
    if not path:
        raise FileNotFoundError(f"Required executable '{name}' not found in PATH.")
    return Path(path)


def check_ffmpeg_support(ffmpeg_path: Path) -> None:
    try:
        result = subprocess.run(
            [str(ffmpeg_path), "-hide_banner", "-encoders"],
            capture_output=True,
            text=True,
            check=True,
        )
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"Failed to query ffmpeg encoders: {exc.stderr.strip()}") from exc

    if "libsvtav1" not in result.stdout:
        raise RuntimeError("FFmpeg does not support libsvtav1. Please install a build with SVT-AV1 support.")


def validate_video(ffprobe_path: Path, source_path: Path) -> Dict[str, object]:
    command = [
        str(ffprobe_path),
        "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        str(source_path),
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "ffprobe failed without an error message.")

    try:
        metadata = json.loads(result.stdout)
        if not metadata.get("format") or not metadata.get("streams"):
            raise ValueError("ffprobe returned incomplete metadata.")
        return metadata
    except Exception as exc:
        raise RuntimeError(f"Unable to parse ffprobe output: {exc}") from exc


def format_size(bytes_value: int) -> str:
    value = float(bytes_value)
    if value < 1024:
        return f"{bytes_value} B"
    for unit in ["KiB", "MiB", "GiB", "TiB"]:
        value /= 1024.0
        if abs(value) < 1024.0:
            return f"{value:0.2f} {unit}"
    return f"{value:0.2f} PiB"


def build_video_tasks(
    source_dir: Path,
    output_dir: Path,
    resume_map: Dict[str, str],
    force: bool = False,
) -> List[VideoTask]:
    tasks: List[VideoTask] = []
    output_seen: Dict[str, Path] = {}

    for path in source_dir.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue

        relative_path = path.relative_to(source_dir)
        output_relative = relative_path.with_suffix(".mp4")
        output_path = output_dir.joinpath(output_relative)

        # Detect output path collisions (e.g. video.mkv and video.mov -> video.mp4)
        output_key = str(output_path)
        if output_key in output_seen:
            # Disambiguate by appending the original extension before .mp4
            stem = relative_path.stem
            original_ext = relative_path.suffix.lstrip(".")
            disambiguated = relative_path.parent / f"{stem}_{original_ext}.mp4"
            output_path = output_dir.joinpath(disambiguated)
            output_key = str(output_path)
        output_seen[output_key] = path

        if not force:
            task_key = str(path.resolve())
            if task_key in resume_map and resume_map[task_key] in ("success", "copied-original"):
                continue
            if output_path.exists() and output_path.stat().st_size > 0:
                continue

        tasks.append(VideoTask(source_path=path, output_path=output_path, relative_path=relative_path))
    return sorted(tasks, key=lambda t: str(t.source_path))


def load_resume_map(csv_path: Path) -> Dict[str, str]:
    if not csv_path.exists():
        return {}

    resume: Dict[str, str] = {}
    with csv_path.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if "source_path" in row and "status" in row:
                resume[row["source_path"]] = row["status"]
    return resume


def append_csv_row(csv_path: Path, result: CompressionResult, csv_lock: threading.Lock) -> None:
    header = [
        "source_path",
        "output_path",
        "original_size",
        "compressed_size",
        "saved_percent",
        "status",
        "encoding_time_seconds",
        "error_message",
    ]
    row = {
        "source_path": str(result.source_path),
        "output_path": str(result.output_path),
        "original_size": result.original_size,
        "compressed_size": result.compressed_size,
        "saved_percent": f"{result.saved_percent:.2f}",
        "status": result.status,
        "encoding_time_seconds": f"{result.encoding_time_seconds:.2f}",
        "error_message": result.error_message or "",
    }

    with csv_lock:
        is_new_file = not csv_path.exists()
        with csv_path.open("a", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=header)
            if is_new_file:
                writer.writeheader()
            writer.writerow(row)


def encode_video(
    ffmpeg_path: Path,
    ffprobe_path: Path,
    task: VideoTask,
    crf: int,
    preset: int,
    logger: logging.Logger,
    shutdown_event: threading.Event,
    keep_larger: bool = False,
) -> CompressionResult:
    if shutdown_event.is_set():
        raise InterruptedError("Shutdown requested before encoding started.")

    encode_start_time = time.time()
    source = task.source_path
    output = task.output_path

    output.parent.mkdir(parents=True, exist_ok=True)
    metadata = validate_video(ffprobe_path, source)
    original_size = source.stat().st_size

    # Calculate dynamic bitrate cap to guarantee file size savings (target ~60-70% savings)
    duration_str = metadata.get("format", {}).get("duration", "0")
    try:
        duration = float(duration_str)
    except ValueError:
        duration = 0.0

    bitrate_args = []
    if duration > 0:
        total_bitrate = (original_size * 8) / duration
        max_bitrate = int(total_bitrate * 0.4)  # Cap at 40% of original bitrate
        buf_size = max_bitrate * 2
        bitrate_args = [
            "-maxrate", str(max_bitrate),
            "-bufsize", str(buf_size)
        ]

    ffmpeg_command = [
        str(ffmpeg_path),
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(source),
        "-map",
        "0",
        "-c:v",
        "libsvtav1",
        "-crf",
        str(crf),
        "-preset",
        str(preset),
        *bitrate_args,
        "-c:a",
        "copy",
        "-c:s",
        "copy",
        "-c:t",
        "copy",
        "-map_metadata",
        "0",
        str(output),
    ]

    process = subprocess.Popen(ffmpeg_command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    try:
        # Poll for completion while checking for shutdown requests
        while process.poll() is None:
            if shutdown_event.is_set():
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                if output.exists():
                    try:
                        output.unlink()
                    except OSError:
                        pass
                raise InterruptedError("Shutdown requested during encoding.")
            time.sleep(0.5)

        # Process has exited — read any error output
        stderr_output = ""
        if process.stderr:
            stderr_output = process.stderr.read().decode("utf-8", errors="replace").strip()

        if process.returncode != 0:
            if output.exists():
                try:
                    output.unlink()
                except OSError:
                    logger.warning("Unable to remove incomplete output file %s", output)
            raise RuntimeError(stderr_output or "Unknown FFmpeg error.")

        compressed_size = output.stat().st_size
        saved_percent = 100.0 * (original_size - compressed_size) / original_size if original_size else 0.0
        encoding_time_seconds = time.time() - encode_start_time

        # If re-encoding made the file larger, discard the output (unless --keep-larger)
        if compressed_size >= original_size and not keep_larger:
            try:
                output.unlink()
                original_output_path = output.with_suffix(source.suffix)
                shutil.copy2(source, original_output_path)
            except OSError as e:
                logger.warning(f"Failed to cleanup or copy original file for {source.name}: {e}")
                original_output_path = output  # Fallback just in case

            return CompressionResult(
                source_path=source,
                output_path=original_output_path,
                original_size=original_size,
                compressed_size=original_size,
                saved_percent=0.0,
                status="copied-original",
                encoding_time_seconds=encoding_time_seconds,
            )

        return CompressionResult(
            source_path=source,
            output_path=output,
            original_size=original_size,
            compressed_size=compressed_size,
            saved_percent=saved_percent,
            status="success",
            encoding_time_seconds=encoding_time_seconds,
        )
    except InterruptedError:
        raise
    except OSError as exc:
        if output.exists():
            try:
                output.unlink()
            except OSError:
                logger.warning("Unable to remove incomplete output file %s", output)
        raise RuntimeError(f"OS error during encoding: {exc}") from exc


def setup_logger(error_log_path: Path) -> logging.Logger:
    logger = logging.getLogger("compress_videos")
    logger.setLevel(logging.DEBUG)
    logger.handlers.clear()

    handler = logging.FileHandler(error_log_path, encoding="utf-8")
    handler.setLevel(logging.ERROR)
    formatter = logging.Formatter("%(asctime)s %(levelname)s: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    console_handler = logging.StreamHandler(stream=sys.stderr)
    console_handler.setLevel(logging.WARNING)
    console_handler.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
    logger.addHandler(console_handler)

    return logger


def print_progress(
    completed: int,
    total: int,
    start_time: float,
    success_count: int,
    failure_count: int,
    copied_count: int = 0,
) -> None:
    elapsed = time.time() - start_time
    rate = completed / elapsed if elapsed > 0 else 0.0
    remaining = total - completed
    eta = remaining / rate if rate else float("inf")
    eta_text = "--:--:--" if rate == 0 else time.strftime("%H:%M:%S", time.gmtime(eta))

    parts = [
        f"Processed {completed}/{total}",
        f"Success {success_count}",
        f"Failures {failure_count}",
    ]
    if copied_count:
        parts.append(f"Copied (larger) {copied_count}")
    parts.extend([
        f"Elapsed {time.strftime('%H:%M:%S', time.gmtime(elapsed))}",
        f"ETA {eta_text}",
    ])
    text = " | ".join(parts)
    print(f"\r\033[K{text}", end="", file=sys.stdout, flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Recursively compress videos with FFmpeg + SVT-AV1.")
    parser.add_argument("--source", "-s", required=True, help="Source directory to scan for videos.")
    parser.add_argument("--output", "-o", required=True, help="Output directory to write compressed videos.")
    parser.add_argument("--crf", type=int, default=45, help="CRF value for libsvtav1 (1-63, default: 34).")
    parser.add_argument("--preset", type=int, default=7, help="Preset value for libsvtav1 (0-13, default: 4 for high compression).")
    parser.add_argument(
        "--workers",
        type=int,
        default=max(1, (os.cpu_count() or 1) // 4),
        help="Number of parallel encodes. Defaults to CPU cores / 4 (SVT-AV1 is multi-threaded).",
    )
    parser.add_argument("--csv", default=DEFAULT_CSV, help="CSV file path for compression results.")
    parser.add_argument("--errors", default=DEFAULT_ERRORS, help="Error log file path.")
    parser.add_argument(
        "--dry-run", action="store_true", help="List files that would be processed without encoding."
    )
    parser.add_argument(
        "--force", action="store_true", help="Re-encode all files, ignoring resume state and existing outputs."
    )
    parser.add_argument(
        "--keep-larger", action="store_true",
        help="Keep output files even if they are larger than the original.",
    )
    args = parser.parse_args()

    # Validate CRF and preset ranges
    if not 1 <= args.crf <= 63:
        parser.error(f"CRF must be between 1 and 63 (got {args.crf}).")
    if not 0 <= args.preset <= 13:
        parser.error(f"Preset must be between 0 and 13 (got {args.preset}).")

    source_dir = Path(args.source).expanduser().resolve()
    output_dir = Path(args.output).expanduser().resolve()
    csv_path = Path(args.csv).expanduser().resolve()
    error_log_path = Path(args.errors).expanduser().resolve()

    if not source_dir.exists() or not source_dir.is_dir():
        parser.error(f"Source directory does not exist or is not a directory: {source_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)

    logger = setup_logger(error_log_path)

    try:
        ffmpeg_path = find_executable("ffmpeg")
        ffprobe_path = find_executable("ffprobe")
        check_ffmpeg_support(ffmpeg_path)
    except (FileNotFoundError, RuntimeError) as exc:
        logger.error(str(exc))
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    resume_map = load_resume_map(csv_path) if not args.force else {}
    tasks = build_video_tasks(source_dir, output_dir, resume_map, force=args.force)
    total_files = len(tasks)

    if total_files == 0:
        print("No video files require encoding.")
        return 0

    if args.dry_run:
        print(f"Dry run: {total_files} file(s) would be processed:\n")
        for task in tasks:
            size = format_size(task.source_path.stat().st_size)
            print(f"  {task.relative_path}  ({size})")
        return 0

    print(f"Found {total_files} files to process. Using {args.workers} workers.")

    shutdown_event = threading.Event()

    def shutdown_handler(signum: int, frame: Optional[object]) -> None:
        shutdown_event.set()

    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    completed = 0
    success_count = 0
    failure_count = 0
    copied_count = 0
    total_original = 0
    total_compressed = 0
    lock = threading.Lock()
    csv_lock = threading.Lock()
    start_time = time.time()

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        future_to_task = {
            executor.submit(
                encode_video, ffmpeg_path, ffprobe_path, task, args.crf, args.preset, logger, shutdown_event, args.keep_larger
            ): task
            for task in tasks
        }
        for future in as_completed(future_to_task):
            task = future_to_task[future]
            try:
                result = future.result()
                append_csv_row(csv_path, result, csv_lock)
                with lock:
                    completed += 1
                    if result.status == "copied-original":
                        copied_count += 1
                        print(
                            f"\r\033[K⚠️  Copied Original: {task.source_path.name} (compressed output was >= original)",
                            flush=True
                        )
                    else:
                        success_count += 1
                        print(
                            f"\r\033[K✅ Compressed: {task.source_path.name} "
                            f"({format_size(result.original_size)} -> {format_size(result.compressed_size)}, "
                            f"saved {result.saved_percent:.1f}%)",
                            flush=True
                        )
                    total_original += result.original_size
                    total_compressed += result.compressed_size
                    print_progress(completed, total_files, start_time, success_count, failure_count, copied_count)
            except InterruptedError:
                with lock:
                    completed += 1
                    print_progress(completed, total_files, start_time, success_count, failure_count, copied_count)
            except Exception as exc:
                error_message = str(exc)
                print(f"\r\033[K❌ Failed: {task.source_path.name} - {error_message}", flush=True)
                logger.error("Failed %s: %s", task.source_path, error_message)
                result = CompressionResult(
                    source_path=task.source_path,
                    output_path=task.output_path,
                    original_size=task.source_path.stat().st_size if task.source_path.exists() else 0,
                    compressed_size=0,
                    saved_percent=0.0,
                    status="failure",
                    encoding_time_seconds=0.0,
                    error_message=error_message,
                )
                append_csv_row(csv_path, result, csv_lock)
                with lock:
                    completed += 1
                    failure_count += 1
                    print_progress(completed, total_files, start_time, success_count, failure_count, copied_count)

            if shutdown_event.is_set():
                # Cancel any remaining queued futures
                for f in future_to_task:
                    f.cancel()
                print("\nInterrupted by user. Saving progress and exiting.")
                return 2

    print("\nEncoding complete.")
    total_saved_percent = (
        100.0 * (total_original - total_compressed) / total_original if total_original else 0.0
    )
    print(f"Total files encoded: {success_count}")
    print(f"Total failures: {failure_count}")
    if copied_count:
        print(f"Copied (output >= original): {copied_count}")
    print(f"Total original size: {format_size(total_original)}")
    print(f"Total compressed size: {format_size(total_compressed)}")
    print(f"Total saved: {total_saved_percent:.2f}%")
    print(f"Results CSV: {csv_path}")
    print(f"Error log: {error_log_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
