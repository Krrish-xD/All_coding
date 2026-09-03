import argparse
import os
from moviepy.editor import VideoFileClip

def extract_audio(video_path, audio_path=None):
    """
    Strips the audio from a video file and saves it as an audio file.
    """
    # Check if the input video exists
    if not os.path.exists(video_path):
        print(f"Error: The file '{video_path}' does not exist.")
        return

    # If no output path is provided, use the video's name and change the extension to .mp3
    if audio_path is None:
        base_name = os.path.splitext(video_path)[0]
        audio_path = f"{base_name}.mp3"

    try:
        print(f"Loading video: {video_path}")
        # Load the video clip
        video_clip = VideoFileClip(video_path)
        
        # Extract the audio
        audio_clip = video_clip.audio
        
        if audio_clip is None:
            print("Error: No audio track found in the video file.")
            video_clip.close()
            return

        print(f"Extracting and saving audio to: {audio_path}")
        # Write the audio to a file (MoviePy automatically detects format from the extension)
        audio_clip.write_audiofile(audio_path, logger='bar')
        
        # Close the clips to free up system resources
        audio_clip.close()
        video_clip.close()
        
        print("\nSuccess! Audio extraction complete.")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    # Set up command-line arguments
    parser = argparse.ArgumentParser(description="Extract audio from a video file.")
    parser.add_argument("input", help="Path to the input video file (e.g., video.mp4)")
    parser.add_argument("-o", "--output", help="Path to the output audio file (e.g., audio.mp3). If omitted, saves as an mp3 in the same folder.", default=None)
    
    args = parser.parse_args()
    
    # Run the extraction
    extract_audio(args.input, args.output)