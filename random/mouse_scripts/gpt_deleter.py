import time
import subprocess

def click(x, y):
    # Move mouse
    subprocess.run(["ydotool", "mousemove", "--absolute", str(x), str(y)])

    # Left click
    subprocess.run(["ydotool", "click", "0xC0"])

def auto_click(coords, n):
    # for i in range(3, 0, -1):
    #     print(f"Starting in {i} seconds...")
    #     time.sleep(1)

    for i in range(n):
        for x, y, delay in coords[:2]:  # Only use the first 3 coordinates
            click(x, y+5*i)
            time.sleep(delay)
        click(coords[2][0], coords[2][1])  # Click the last coordinate
        time.sleep(0.1)

# Example coordinates
# coordinates = [
#     (28, 95, 0.1),  # (x, y, delay in seconds)
#     (33, 128, 0.1),
#     (180, 175, 1)
# ]

coordinates = [
    (33, 95, 0.1),  # (x, y, delay in seconds)
    (33, 128, 0.1), 
    (180, 175, 0.1)
]

# for i in range(10):
#     auto_click(coordinates, n=25)
#     for i in range(10):
#         print(f"Time till next round: {10 - i} seconds", end="\r")
#         time.sleep(1)

auto_click(coordinates, n=25)