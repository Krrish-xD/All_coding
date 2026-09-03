import argparse
import os
from moviepy.editor import AudioFileClip

def cut_audio(input_path, start_time, end_time, output_path=None):
    """
    Cuts a specific segment from an audio file based on start and end times (in seconds).
    """
    if not os.path.exists(input_path):
        print(f"Error: The file '{input_path}' does not exist.")
        return

    # If no output path is provided, generate one automatically
    if output_path is None:
        base_name, ext = os.path.splitext(input_path)
        output_path = f"{base_name}_cut_{start_time}_to_{end_time}{ext}"

    try:
        print(f"Loading audio: {input_path}")
        clip = AudioFileClip(input_path)
        
        # Check if the requested end time exceeds the audio duration
        if end_time > clip.duration:
            print(f"Warning: Requested end time ({end_time}s) is longer than the audio duration ({clip.duration}s).")
            print(f"Trimming up to the end of the file instead.")
            end_time = clip.duration

        print(f"Extracting audio from {start_time}s to {end_time}s...")
        
        # Create the subclip
        cut_clip = clip.subclip(start_time, end_time)
        
        print(f"Saving trimmed audio to: {output_path}")
        # Write the new file
        cut_clip.write_audiofile(output_path, logger='bar')
        
        # Close the clips to free resources
        cut_clip.close()
        clip.close()
        
        print("\nSuccess! Audio trimming complete.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cut a specific segment out of an audio file.")
    
    parser.add_argument("input", help="Path to the input audio file (e.g., song.mp3)")
    parser.add_argument("start", type=float, help="Start time in seconds (e.g., 0)")
    parser.add_argument("end", type=float, help="End time in seconds (e.g., 22)")
    parser.add_argument("-o", "--output", help="Path to the output file. If omitted, appends the timestamps to the original filename.", default=None)
    
    args = parser.parse_args()
    
    cut_audio(args.input, args.start, args.end, args.output)