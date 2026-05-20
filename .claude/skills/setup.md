---
name: setup
description: Setup the music2lyrics environment (venv, dependencies, ffmpeg)
user_invocable: true
---

# Setup music2lyrics

Install all dependencies and create the virtual environment.

## Steps

1. Run `./setup.sh` from the project root
2. Verify the installation by checking `source venv/bin/activate && mlx_whisper --help && demucs --help`
3. Report the result to the user
