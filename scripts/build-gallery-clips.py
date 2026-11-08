"""Short silent gallery clips (single real shots, 720p, ~5 s) with WebP posters.

Usage: python scripts/build-gallery-clips.py ["<source media folder>"]
Output: frontend/public/media/clips/<key>.mp4 and <key>.webp. Originals are only read.
"""
import os, subprocess, sys
SRC = next((a for a in sys.argv[1:] if not a.startswith('--')), None) or r'C:\Users\iamdn\Downloads\website images\website images'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'frontend', 'public', 'media', 'clips')
GRADE = ("eq=contrast=1.08:saturation=1.07:brightness=-0.01,"
         "colorbalance=rs=-0.03:bs=0.04:rh=0.04:bh=-0.03,vignette=angle=PI/5")
# key: folder, file, start, seconds, crop (x, y, w, h) or None
CLIPS = {
    'rain-dance': ('rain dance', 'MVI_9001.MOV', 4.0, 5, None),
    'campfire': ('camp fire', 'MVI_5711.MP4', 5.0, 5, None),
    'zip-line': ('zip line', 'MVI_5604.MP4', 0.5, 5, None),
    'rappelling': ('Rapelling', 'IMG_6724.MOV', 14.0, 5, None),
    'pottery': ('pottery', 'MVI_6231 (1).MOV', 3.0, 5, None),
    'tractor-ride': ('tractor ride', 'MVI_6214.MOV', 1.0, 5, None),
    'kids-net': ('mud obstacles', 'MVI_6354.MOV', 0.5, 5, None),
    'pgt': ('progressive group task', 'MVI_8965.MP4', 2.0, 5, None),
    'archery': ('archery', 'MVI_8798.MP4', 5.5, 5, (0.1, 0.0, 0.8, 0.8)),
    'team-games': ('team building games', 'MVI_8384.MP4', 6.0, 5, None),
}
os.makedirs(OUT, exist_ok=True)
total = 0
for key, (folder, name, start, secs, crop) in CLIPS.items():
    src = os.path.join(SRC, folder, name)
    vf = ([f"crop=iw*{crop[2]}:ih*{crop[3]}:iw*{crop[0]}:ih*{crop[1]}"] if crop else []) + \
         ["scale=1280:720:force_original_aspect_ratio=increase", "crop=1280:720", "fps=30", GRADE,
          f"fade=t=in:st=0:d=0.3,fade=t=out:st={secs - 0.35}:d=0.35", "scale=out_range=tv,format=yuv420p"]
    mp4 = os.path.join(OUT, key + '.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(start), '-t', str(secs), '-i', src, '-an', '-vf', ','.join(vf),
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-tune', 'film', '-maxrate', '1M', '-bufsize', '2M', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', mp4], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(secs / 2), '-i', mp4, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '78', os.path.join(OUT, key + '.webp')], check=True)
    size = os.path.getsize(mp4) + os.path.getsize(os.path.join(OUT, key + '.webp')); total += size
    print(f'{key}: {size / 1024:.0f} KB')
print(f'total {total / 1048576:.1f} MB')
