#!/bin/bash
# Setup script for music2lyrics pipeline
# Requires: Homebrew, macOS with Apple Silicon

set -e

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

# Create directories
mkdir -p raw output separated

echo ""
echo "=== Setup complete ==="
echo "Usage:"
echo "  source venv/bin/activate"
echo "  ./transcribe.sh raw/song.mp3"
echo ""
echo "Put your mp3/wav files in the raw/ directory."
