import argparse
import os
from moviepy.editor import AudioFileClip, concatenate_audioclips

def merge_audio(input_paths, output_path):
    """
    Merges multiple audio files sequentially into a single audio file.
    """
    audio_clips = []
    
    try:
        # 1. Verify and load each audio file
        for path in input_paths:
            if not os.path.exists(path):
                print(f"Error: The file '{path}' does not exist. Skipping.")
                continue
            
            print(f"Loading: {path}")
            clip = AudioFileClip(path)
            audio_clips.append(clip)
            
        if not audio_clips:
            print("Error: No valid audio files were loaded. Exiting.")
            return

        # 2. Concatenate the audio clips
        print(f"\nMerging {len(audio_clips)} audio files...")
        final_audio = concatenate_audioclips(audio_clips)
        
        # 3. Write the merged audio to the output file
        print(f"Saving merged audio to: {output_path}")
        final_audio.write_audiofile(output_path, logger='bar')
        
        print("\nSuccess! Audio merge complete.")

    except Exception as e:
        print(f"An error occurred: {e}")
        
    finally:
        # 4. Clean up resources to prevent memory leaks
        for clip in audio_clips:
            try:
                clip.close()
            except:
                pass

if __name__ == "__main__":
    # Set up command-line arguments
    parser = argparse.ArgumentParser(description="Merge multiple audio files into one.")
    
    # 'nargs='+'' allows the user to pass one or more files separated by spaces
    parser.add_argument("inputs", nargs='+', help="List of audio files to merge (e.g., audio1.mp3 audio2.mp3)")
    parser.add_argument("-o", "--output", help="Path for the merged output file (e.g., merged.mp3).", default="merged_output.mp3")
    
    args = parser.parse_args()
    
    # Run the merger
    merge_audio(args.inputs, args.output)