# compress_videos.py

Batch video compressor that re-encodes videos to **AV1** (via SVT-AV1) while preserving folder structure, metadata, audio, and subtitles. 

## Prerequisites

- **Python 3.9+**
- **FFmpeg** built with `libsvtav1`
- Both `ffmpeg` and `ffprobe` must be in your `PATH`

```bash
# check you have what's needed
ffmpeg -hide_banner -encoders | grep svtav1
```

> **Note on GPU encoding:** Hardware encoding (`av1_nvenc`) requires an **RTX 4000+** (Ada Lovelace) GPU. Older NVIDIA cards (3050, 3060, etc.) only have H.264/HEVC NVENC — they cannot encode AV1 in hardware. This script intentionally uses CPU encoding (SVT-AV1), which yields superior compression file sizes compared to hardware encoders.

## Usage

```bash
python compress_videos.py --source /path/to/videos --output /path/to/compressed
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `-s, --source` | *(required)* | Source directory to scan recursively |
| `-o, --output` | *(required)* | Output directory (mirrors source structure) |
| `--crf` | `34` | Base quality level, 1–63 (lower = better quality, bigger file) |
| `--preset` | `4` | SVT-AV1 encoding speed, 0–13 (lower = slower, better compression) |
| `--workers` | `cpu_count / 4` | Parallel encodes (conservative default since encoders are multi-threaded) |
| `--csv` | `compression_results.csv` | Path for the results log |
| `--errors` | `compression_errors.log` | Path for the error log |
| `--dry-run` | — | List files that would be processed, without encoding |
| `--force` | — | Re-encode everything, ignoring resume state and existing outputs |
| `--keep-larger` | — | Keep output even if it's larger than the original |

### Examples

**Preview what would be encoded:**

```bash
python compress_videos.py -s ~/Videos -o ~/Compressed --dry-run
```

**Force re-encode with high quality and slow preset (default):**

```bash
python compress_videos.py -s ~/Videos -o ~/Compressed --force --crf 28 --preset 4
```

## How It Works

1. Recursively scans `--source` for `.mp4`, `.mkv`, `.mov`, `.avi`, `.webm`, `.m4v` files
2. Skips files already successfully encoded (tracked via the CSV) or whose output already exists — unless `--force` is set
3. Detects output name collisions (e.g. `clip.mkv` + `clip.mov` → `clip.mp4` + `clip_mov.mp4`)
4. Encodes each file to `.mp4` with AV1 video, copying audio/subs/attachments/metadata as-is
5. **If the output is larger than the original**, deletes the bloated MP4 and copies the original file to the output directory instead (override with `--keep-larger`)
6. Logs results to CSV and errors to a separate log file, including precise encoding durations
7. Handles `Ctrl+C` / `SIGTERM` gracefully — terminates in-flight FFmpeg processes and saves progress

## Resume

Just re-run the same command. The script reads the CSV to skip previously successful encodes and also skips any output files that already exist with non-zero size.

## Supported Formats

| Input | Output |
|-------|--------|
| `.mp4`, `.mkv`, `.mov`, `.avi`, `.webm`, `.m4v` | `.mp4` |
