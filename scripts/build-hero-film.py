"""Builds the home-page hero film from real Eagles Unbound footage.

Usage: python scripts/build-hero-film.py ["<source media folder>"] [--loops]   (--loops: inner-page header loops only)
Each shot: trim -> 30 fps -> gentle slow motion -> colour grade (steady frame, no digital zoom) -> vignette, joined with
crossfades. Outputs to frontend/public/assets/video/: hero-film-1080.mp4 (large screens), hero-film-720.mp4 (normal screens), hero-film-540.mp4 (phones),
hero-film-poster.webp. Needs ffmpeg on PATH. Source footage is never modified.
"""
import os, subprocess, sys, tempfile, shutil

SRC = next((a for a in sys.argv[1:] if not a.startswith('--')), None) or r'C:\Users\iamdn\Downloads\website images\website images'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'frontend', 'public', 'assets', 'video')
FPS, W, H, XF = 30, 1920, 1080, 0.45

# (folder, file, start s, length s on screen, slow-motion factor, optional crop as fractions x,y,w,h)
SHOTS = [
    ('Rapelling', 'IMG_6724.MOV', 15.0, 2.3, 1.0, None),
    ('zip line', 'MVI_5602.MP4', 0.2, 1.9, 1.25, None),
    ('Group obstacle race', 'MVI_8909.MP4', 0.8, 1.8, 1.25, None),
    ('highrope course', 'MVI_5536.MP4', 3.4, 1.8, 1.15, None),
    ('archery', 'MVI_8798.MP4', 6.2, 1.8, 1.25, (0.12, 0.0, 0.76, 0.76)),
    ('wall climbing', 'MVI_5533.MP4', 3.6, 1.7, 1.15, (0.12, 0.05, 0.62, 0.62)),
    ('Shooting', 'MVI_8812.MP4', 2.6, 1.6, 1.2, (0.0, 0.05, 0.7, 0.7)),
    ('mud obstacles', 'MVI_6354.MOV', 0.9, 1.6, 1.25, None),
    ('Trekking', 'IMG_6708.MOV', 17.5, 2.0, 1.0, None),
    ('camp fire', 'MVI_5711.MP4', 5.6, 2.2, 1.15, None),
]
GRADE = ("eq=contrast=1.09:saturation=1.08:brightness=-0.015:gamma=0.98,"
         "colorbalance=rs=-0.03:gs=0.0:bs=0.045:rm=0.01:bm=-0.01:rh=0.045:gh=0.015:bh=-0.035,"
         "vignette=angle=PI/4.6,unsharp=5:5:0.25")

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode: raise SystemExit(r.stderr[-1500:])

def shot(i, folder, name, start, length, slow, crop, tmp):
    src = os.path.join(SRC, folder, name)
    need = length / slow + 0.1                      # source seconds needed before slow motion
    frames = int(round(length * FPS))
    vf = []
    if crop: x, y, w, h = crop; vf.append(f"crop=iw*{w}:ih*{h}:iw*{x}:ih*{y}")
    vf += ["deshake=rx=32:ry=32:edge=mirror", "crop=iw*0.94:ih*0.94"]   # stabilise handheld footage (slight crop hides the edges)
    vf += [f"scale={W}:{H}:force_original_aspect_ratio=increase", f"crop={W}:{H}", f"setpts={slow}*PTS", f"fps={FPS}",
           GRADE, "scale=out_range=tv,format=yuv420p"]
    out = os.path.join(tmp, f's{i:02d}.mp4')
    run(['ffmpeg', '-v', 'error', '-y', '-ss', str(start), '-t', f'{need:.2f}', '-i', src, '-an', '-vf', ','.join(vf),
         '-frames:v', str(frames), '-c:v', 'libx264', '-crf', '12', '-preset', 'fast', out])
    return out, length

# Short header loops for inner pages (720p, no poster text; the page photo is the poster).
LOOPS = {
    'loop-bootcamp': [('Group obstacle race', 'MVI_8909.MP4', 0.8, 2.6, 1.2, None), ('Group obstacle race', 'MVI_8895.MP4', 1.2, 2.6, 1.2, None), ('progressive group task', 'MVI_8965.MP4', 2.0, 2.4, 1.15, None)],
    'loop-activities': [('zip line', 'MVI_5602.MP4', 0.2, 2.4, 1.2, None), ('highrope course', 'MVI_5536.MP4', 3.0, 2.4, 1.15, None), ('archery', 'MVI_8798.MP4', 6.0, 2.4, 1.2, (0.12, 0.0, 0.76, 0.76))],
    'loop-about': [('Trekking', 'IMG_6708.MOV', 16.0, 3.0, 1.0, None), ('camp fire', 'MVI_5711.MP4', 5.4, 2.6, 1.1, None)],
}

def loops():
    os.makedirs(OUT, exist_ok=True)
    for name, shots in LOOPS.items():
        tmp = tempfile.mkdtemp(prefix='eu-loop-')
        try:
            clips = [shot(i, *s, tmp) for i, s in enumerate(shots)]
            inputs, filt, last = [], [], '0:v'
            for p, _ in clips: inputs += ['-i', p]
            offset = clips[0][1] - XF
            for i in range(1, len(clips)):
                filt.append(f"[{last}][{i}:v]xfade=transition=fade:duration={XF}:offset={offset:.3f}[x{i}]"); last = f'x{i}'; offset += clips[i][1] - XF
            total = offset + XF
            filt.append(f"[{last}]fade=t=in:st=0:d=0.4,fade=t=out:st={total - 0.5:.3f}:d=0.5,scale=1280:720,scale=out_range=tv,format=yuv420p[v]")
            dst = os.path.join(OUT, name + '.mp4')
            run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(filt), '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-tune', 'film', '-maxrate', '1.1M', '-bufsize', '2.2M', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', '-an', dst])
            print(f'{name}: {total:.1f}s, {os.path.getsize(dst) / 1024:.0f} KB')
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

def main():
    os.makedirs(OUT, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix='eu-hero-')
    try:
        clips = [shot(i, *s, tmp) for i, s in enumerate(SHOTS)]
        inputs, filt, last, offset = [], [], '0:v', 0.0
        for i, (p, _) in enumerate(clips): inputs += ['-i', p]
        offset = clips[0][1] - XF
        for i in range(1, len(clips)):
            label = f'x{i}'
            filt.append(f"[{last}][{i}:v]xfade=transition=fade:duration={XF}:offset={offset:.3f}[{label}]")
            last = label; offset += clips[i][1] - XF
        total = offset + XF
        filt.append(f"[{last}]fade=t=in:st=0:d=0.5,fade=t=out:st={total - 0.6:.3f}:d=0.6,scale=out_range=tv,format=yuv420p[v]")
        master = os.path.join(tmp, 'master.mp4')
        run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(filt), '-map', '[v]', '-c:v', 'libx264', '-crf', '10', '-preset', 'medium', master])
        base = os.path.join(OUT, 'hero-film')
        run(['ffmpeg', '-v', 'error', '-y', '-i', master, '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-tune', 'film', '-maxrate', '2.4M', '-bufsize', '4.8M', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', '-an', base + '-1080.mp4'])
        run(['ffmpeg', '-v', 'error', '-y', '-i', master, '-vf', 'scale=1280:720', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-tune', 'film', '-maxrate', '1.35M', '-bufsize', '2.7M', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', '-an', base + '-720.mp4'])
        run(['ffmpeg', '-v', 'error', '-y', '-i', master, '-vf', 'scale=960:540', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-tune', 'film', '-maxrate', '0.75M', '-bufsize', '1.5M', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', '-an', base + '-540.mp4'])
        # poster: a strong frame from the zip-line shot
        t = SHOTS[0][3] - XF + 0.9
        run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', master, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '80', base + '-poster.webp'])
        print(f'hero film: {total:.1f}s')
        for ext in ('-1080.mp4', '-720.mp4', '-540.mp4', '-poster.webp'):
            print(f'  {os.path.basename(base + ext)}: {os.path.getsize(base + ext) / 1024:.0f} KB')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

loops() if "--loops" in sys.argv else main()
