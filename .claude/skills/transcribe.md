---
name: transcribe
description: Transcribe lyrics from an audio file in raw/ directory using demucs + mlx-whisper
user_invocable: true
arguments:
  - name: file
    description: Audio file path (e.g. raw/song.mp3)
    required: true
  - name: language
    description: Language code for transcription (default: tr)
    required: false
---

# Transcribe Lyrics

Transcribe lyrics from an audio file using the music2lyrics pipeline.

## Steps

1. Verify the input file exists at `$ARGUMENTS.file`
2. Activate the virtual environment: `source venv/bin/activate`
3. Run the transcription script: `./transcribe.sh $ARGUMENTS.file $ARGUMENTS.language`
4. Show the user the output files in `output/<filename>/`
5. If the user wants to see the lyrics, read the `.srt` or `.lrc` file from the output directory

## Notes

- Default language is Turkish (`tr`). Pass a different language code as the second argument.
- First run downloads models (~3GB whisper + ~300MB demucs). Subsequent runs use cache.
- The pipeline: demucs (vocal separation) -> mlx-whisper (transcription) -> srt_to_lrc.py (LRC conversion)
