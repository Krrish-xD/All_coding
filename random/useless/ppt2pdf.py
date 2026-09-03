
import subprocess
import sys
import os
import shutil


def convert_ppt_to_pdf(input_file, output_file):
    if not shutil.which("libreoffice"):
        print("LibreOffice is not installed.")
        sys.exit(1)

    input_file = os.path.abspath(input_file)
    output_dir = os.path.dirname(os.path.abspath(output_file))

    # Convert using LibreOffice
    cmd = [
        "libreoffice",
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        output_dir,
        input_file
    ]

    subprocess.run(cmd, check=True)

    # LibreOffice saves using original filename
    generated_pdf = os.path.join(
        output_dir,
        os.path.splitext(os.path.basename(input_file))[0] + ".pdf"
    )

    # Rename if needed
    if generated_pdf != os.path.abspath(output_file):
        os.rename(generated_pdf, output_file)

    print(f"Converted: {output_file}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python ppt_to_pdf_linux.py input.pptx output.pdf")
        sys.exit(1)

    convert_ppt_to_pdf(sys.argv[1], sys.argv[2])