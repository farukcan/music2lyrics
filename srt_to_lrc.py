"""Convert SRT subtitle file to LRC karaoke format."""

import re
import sys


def parse_srt_time(time_str: str) -> float:
    """Parse SRT timestamp (HH:MM:SS,mmm) to total seconds."""
    match = re.match(r'(\d+):(\d+):(\d+),(\d+)', time_str)
    if not match:
        raise ValueError(f"Invalid SRT timestamp: {time_str}")
    h, m, s, ms = int(match.group(1)), int(match.group(2)), int(match.group(3)), int(match.group(4))
    return h * 3600 + m * 60 + s + ms / 1000


def srt_to_lrc(srt_path: str, lrc_path: str) -> None:
    """Read an SRT file and write equivalent LRC file."""
    with open(srt_path, encoding="utf-8") as f:
        content = f.read()

    blocks = re.split(r'\n\n+', content.strip())
    lrc_lines: list[str] = []

    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 3:
            continue
        total_sec = parse_srt_time(lines[1].split(' --> ')[0])
        mm = int(total_sec // 60)
        ss = total_sec % 60
        text = ' '.join(lines[2:])
        lrc_lines.append(f"[{mm:02d}:{ss:05.2f}]{text}")

    with open(lrc_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lrc_lines))
    print(f"LRC created: {lrc_path}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python srt_to_lrc.py <input.srt> <output.lrc>")
        sys.exit(1)
    srt_to_lrc(sys.argv[1], sys.argv[2])
