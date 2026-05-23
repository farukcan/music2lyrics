#!/bin/bash
# Setup script for music2lyrics pipeline
# Requires: Homebrew, macOS with Apple Silicon

set -e

# Ensure Homebrew is in PATH when launched from macOS .app
if [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -x /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
fi

echo "=== music2lyrics setup ==="

# Check Homebrew
if ! command -v brew &> /dev/null; then
    echo "ERROR: Homebrew not found. Install: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

# Install system dependencies
echo "Installing ffmpeg and python@3.11..."
brew install python@3.11 ffmpeg 2>/dev/null || true

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3.11 -m venv venv
fi

# Activate and install packages
source venv/bin/activate
echo "Installing Python packages..."
pip install --upgrade pip
pip install mlx-whisper demucs torchcodec

# Patch demucs for PyTorch 2.x compatibility (in-place tensor ops)
DEMUCS_SEP="venv/lib/python3.11/site-packages/demucs/separate.py"
if [ -f "$DEMUCS_SEP" ]; then
    echo "Patching demucs for PyTorch 2.x compatibility..."
    sed -i '' 's/wav -= ref\.mean()/wav = wav - ref.mean()/' "$DEMUCS_SEP"
    sed -i '' 's/wav \/= ref\.std()/wav = wav \/ ref.std()/' "$DEMUCS_SEP"
    sed -i '' 's/sources \*= ref\.std()/sources = sources * ref.std()/' "$DEMUCS_SEP"
    sed -i '' 's/sources += ref\.mean()/sources = sources + ref.mean()/' "$DEMUCS_SEP"
fi

# Create directories
mkdir -p raw output separated

echo ""
echo "=== Setup complete ==="
echo "Usage:"
echo "  source venv/bin/activate"
echo "  ./transcribe.sh raw/song.mp3"
echo ""
echo "Put your mp3/wav files in the raw/ directory."
