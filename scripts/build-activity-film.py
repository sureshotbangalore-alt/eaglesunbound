"""Builds the Activities film from real Eagles Unbound footage, with titles, chapter markers and a logo end card.

Usage: python scripts/build-activity-film.py ["<source media folder>"]
Output: frontend/public/assets/video/motion/activity-reel-19s.mp4 / .webm and activity-reel-poster.jpg (used by the
home page Activities section and the Activities page). Source footage is never modified. Needs ffmpeg on PATH.
"""
import os, subprocess, sys, tempfile, shutil

SRC = next((a for a in sys.argv[1:] if not a.startswith('--')), None) or r'C:\Users\iamdn\Downloads\website images\website images'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'frontend', 'public', 'assets')
OUT = os.path.join(ASSETS, 'video', 'motion')
FPS, W, H, XF, SHOT = 30, 1280, 720, 0.4, 2.3
RED, GOLD, CREAM = '0xD3312E', '0xD6B25E', '0xF3EFE6'
BOLD, SEMI = 'font-1.ttf', 'font-0.ttf'   # Barlow Condensed 700 / 600, run with cwd = public/assets

# folder, file, start s, slow-motion factor, crop (x, y, w, h fractions) or None, title, subtitle
CHAPTERS = [
    ('zip line', 'MVI_5602.MP4', 0.2, 1.2, None, 'ZIP LINE', 'FLY ACROSS THE VALLEY'),
    ('wall climbing', 'MVI_5533.MP4', 3.4, 1.15, (0.12, 0.05, 0.62, 0.62), 'WALL CLIMB', 'REACH THE TOP'),
    ('archery', 'MVI_8798.MP4', 6.0, 1.2, (0.12, 0.0, 0.76, 0.76), 'ARCHERY', 'FIND YOUR FOCUS'),
    ('highrope course', 'MVI_5536.MP4', 3.0, 1.15, None, 'HIGH ROPES', 'TRUST EVERY STEP'),
    ('Group obstacle race', 'MVI_8909.MP4', 0.8, 1.2, None, 'OBSTACLE NET', 'CLIMB AS ONE'),
    ('Shooting', 'MVI_8812.MP4', 2.6, 1.2, (0.0, 0.05, 0.7, 0.7), 'AIR RIFLE', 'STEADY. AIM. FIRE.'),
    ('Rapelling', 'IMG_6724.MOV', 15.0, 1.0, None, 'RAPPELLING', 'DESCEND THE ROCK FACE'),
    ('camp fire', 'MVI_5711.MP4', 5.4, 1.1, None, 'CAMPFIRE', 'END THE DAY TOGETHER'),
]
GRADE = ("eq=contrast=1.09:saturation=1.08:brightness=-0.015:gamma=0.98,"
         "colorbalance=rs=-0.03:bs=0.045:rm=0.01:bm=-0.01:rh=0.045:gh=0.015:bh=-0.035,vignette=angle=PI/4.6")

def run(args, cwd=None):
    r = subprocess.run(args, capture_output=True, text=True, cwd=cwd)
    if r.returncode: raise SystemExit(r.stderr[-2000:])

def text_layer(i, title, sub):
    n = len(CHAPTERS); ease = "(1-pow(1-min(max(t-{d},0)/0.55,1),3))"
    f = []
    # legibility: soft dark band behind the title area
    for k, a in enumerate((0.18, 0.28, 0.38)):
        f.append(f"drawbox=x=0:y={H - 300 + k * 60}:w={W}:h={300 - k * 60}:color=black@{a}:t=fill")
    # chapter progress markers along the top
    seg = 70
    for k in range(n):
        f.append(f"drawbox=x={64 + k * (seg + 8)}:y=40:w={seg}:h=4:color={RED if k <= i else CREAM}@{1 if k <= i else 0.35}:t=fill")
    f.append(f"drawtext=fontfile={SEMI}:text='EAGLES UNBOUND  /  ACTIVITIES':fontsize=20:fontcolor={CREAM}@0.85:x=64:y=58")
    # red title bar grows in, then number, title and subtitle slide in
    f.append(f"drawbox=x=64:y={H - 196}:w=7:h=132:color={RED}:t=fill:enable='gte(t,0.15)'")
    f.append(f"drawtext=fontfile={SEMI}:text='{i + 1:02d} / {n:02d}':fontsize=26:fontcolor={GOLD}:x=90:y={H - 196}:alpha='{ease.format(d=0.2)}'")
    f.append(f"drawtext=fontfile={BOLD}:text='{title}':fontsize=104:fontcolor={CREAM}:x='90-50*(1-{ease.format(d=0.3)})':y={H - 164}:alpha='{ease.format(d=0.3)}':shadowcolor=black@0.5:shadowx=3:shadowy=3")
    f.append(f"drawtext=fontfile={SEMI}:text='{sub}':fontsize=30:fontcolor={GOLD}:x='92-30*(1-{ease.format(d=0.5)})':y={H - 62}:alpha='{ease.format(d=0.5)}'")
    return ','.join(f)

def chapter(i, folder, name, start, slow, crop, title, sub, tmp):
    src = os.path.join(SRC, folder, name)
    frames = int(round(SHOT * FPS))
    vf = []
    if crop: x, y, w, h = crop; vf.append(f"crop=iw*{w}:ih*{h}:iw*{x}:ih*{y}")
    vf += [f"scale={W}:{H}:force_original_aspect_ratio=increase", f"crop={W}:{H}", f"setpts={slow}*PTS", f"fps={FPS}",
           f"zoompan=z='1+0.05*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS}",
           GRADE, "setpts=PTS-STARTPTS", text_layer(i, title, sub), "format=yuv420p"]
    out = os.path.join(tmp, f'c{i:02d}.mp4')
    run(['ffmpeg', '-v', 'error', '-y', '-ss', str(start), '-t', f'{SHOT / slow + 0.2:.2f}', '-i', src, '-an', '-vf', ','.join(vf),
         '-frames:v', str(frames), '-c:v', 'libx264', '-crf', '12', '-preset', 'fast', out], cwd=ASSETS)
    return out

def end_card(tmp, seconds=2.6):
    out = os.path.join(tmp, 'end.mp4'); ease = "(1-pow(1-min(max(t-{d},0)/0.6,1),3))"
    logo_h = 200
    filt = (f"color=c=0xF1ECE0:s={W}x{H}:r={FPS}:d={seconds}[bg];[1:v]scale=-1:{logo_h},format=rgba,fade=t=in:st=0.15:d=0.6:alpha=1[lg];"
            f"[bg][lg]overlay=x=(W-w)/2:y=170[a];"
            f"[a]drawtext=fontfile={BOLD}:text='PICK YOUR CHALLENGE':fontsize=66:fontcolor=0x111619:x=(w-tw)/2:y=430:alpha='{ease.format(d=0.6)}',"
            f"drawbox=x={W // 2 - 110}:y=518:w=220:h=5:color={RED}:t=fill:enable='gte(t,0.9)',"
            f"drawtext=fontfile={SEMI}:text='BOOK YOUR ADVENTURE AT EAGLES UNBOUND':fontsize=24:fontcolor=0x6F5A35:x=(w-tw)/2:y=548:alpha='{ease.format(d=1.0)}',format=yuv420p[v]")
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc', '-loop', '1', '-i', 'eagles-unbound-logo.png', '-filter_complex', filt,
         '-map', '[v]', '-t', str(seconds), '-c:v', 'libx264', '-crf', '12', '-preset', 'fast', out], cwd=ASSETS)
    return out, seconds

def main():
    os.makedirs(OUT, exist_ok=True); tmp = tempfile.mkdtemp(prefix='eu-reel-')
    try:
        clips = [(chapter(i, *c, tmp), SHOT) for i, c in enumerate(CHAPTERS)] + [end_card(tmp)]
        inputs, filt, last = [], [], '0:v'
        for p, _ in clips: inputs += ['-i', p]
        offset = clips[0][1] - XF
        for i in range(1, len(clips)):
            kind = 'fade' if i == len(clips) - 1 else ('slideleft' if i % 2 else 'smoothleft')
            filt.append(f"[{last}][{i}:v]xfade=transition={kind}:duration={XF}:offset={offset:.3f}[x{i}]"); last = f'x{i}'; offset += clips[i][1] - XF
        total = offset + XF
        filt.append(f"[{last}]fade=t=in:st=0:d=0.4,fade=t=out:st={total - 0.5:.3f}:d=0.5,format=yuv420p[v]")
        master = os.path.join(tmp, 'master.mp4')
        run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(filt), '-map', '[v]', '-c:v', 'libx264', '-crf', '10', '-preset', 'medium', master])
        secs = round(total)
        base = os.path.join(OUT, f'activity-reel-{secs}s')
        run(['ffmpeg', '-v', 'error', '-y', '-i', master, '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-tune', 'film', '-maxrate', '1.6M', '-bufsize', '3.2M', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', base + '.mp4'])
        run(['ffmpeg', '-v', 'error', '-y', '-i', master, '-c:v', 'libvpx-vp9', '-b:v', '1.3M', '-crf', '38', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-an', base + '.webm'])
        run(['ffmpeg', '-v', 'error', '-y', '-ss', '1.6', '-i', master, '-frames:v', '1', '-q:v', '3', os.path.join(OUT, 'activity-reel-poster.jpg')])
        print(f'activity film: {total:.1f}s -> {os.path.basename(base)}.mp4 {os.path.getsize(base + ".mp4") / 1024:.0f} KB, .webm {os.path.getsize(base + ".webm") / 1024:.0f} KB')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

main()
