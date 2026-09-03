import subprocess
import time

while True:
    output = subprocess.check_output(
        ["hyprctl", "cursorpos"],
        text=True
    ).strip()

    print(output, end="\r")
