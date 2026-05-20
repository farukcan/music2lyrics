#!/bin/bash
# Transcribe a single audio file: vocal separation + whisper transcription
# Usage: ./transcribe.sh <audio-file> [language]

set -e

if [ -z "$1" ]; then
    echo "Usage: ./transcribe.sh <audio-file> [language]"
    echo "Example: ./transcribe.sh raw/song.mp3 tr"
    exit 1
fi

INPUT="$1"
LANGUAGE="${2:-tr}"
NAME=$(basename "$INPUT" | sed 's/\.[^.]*$//')

if [ ! -f "$INPUT" ]; then
    echo "ERROR: File not found: $INPUT"
    exit 1
fi

echo "=== Processing: $NAME ==="
echo "Language: $LANGUAGE"

# Step 1: Vocal separation
echo "[1/3] Vocal separation (demucs)..."
demucs --two-stems=vocals -o separated "$INPUT"

VOCALS="separated/htdemucs/$NAME/vocals.wav"
if [ ! -f "$VOCALS" ]; then
    echo "ERROR: Vocals file not found: $VOCALS"
    exit 1
fi

# Step 2: Transcription
echo "[2/3] Transcription (mlx-whisper)..."
mkdir -p "output/$NAME"
mlx_whisper "$VOCALS" \
    --model mlx-community/whisper-large-v3-mlx \
    --language "$LANGUAGE" \
    --output-format all \
    --word-timestamps True \
    --output-dir "output/$NAME"

# Step 3: SRT to LRC conversion
echo "[3/3] Converting SRT to LRC..."
SRT_FILE="output/$NAME/vocals.srt"
LRC_FILE="output/$NAME/$NAME.lrc"
if [ -f "$SRT_FILE" ]; then
    python srt_to_lrc.py "$SRT_FILE" "$LRC_FILE"
else
    echo "WARNING: SRT file not found, skipping LRC conversion"
fi

echo ""
echo "=== Done: $NAME ==="
echo "Output directory: output/$NAME/"
ls -la "output/$NAME/"
