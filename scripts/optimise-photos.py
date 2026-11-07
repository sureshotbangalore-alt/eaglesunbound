"""Selects the strongest Eagles Unbound photographs, converts them to web-ready WebP and writes a manifest.

Usage: python scripts/optimise-photos.py "<source media folder>"
- Originals are only read, never changed. Output: frontend/public/media/photos/<key>.webp (max 1800 px long edge, quality 76;
  Next.js <Image> then serves smaller responsive sizes on demand) and docs/media/photo-manifest.json (source -> output, sizes).
- A few stills come from 4K/HD video where the footage is stronger than the photographs.
"""
import json, os, subprocess, sys, tempfile
from PIL import Image, ImageOps

SRC = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\iamdn\Downloads\website images\website images'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'frontend', 'public', 'media', 'photos')
DOC = os.path.join(ROOT, 'docs', 'media')
MAX, QUALITY = 1800, 76
WA = 'WhatsApp Image 2026-11-03 at '

# key: (category, folder, file, video time or None, alt text)
PHOTOS = {
  'obstacle-wall': ('Bootcamp and obstacles', 'Group obstacle race', 'IMG_8914.JPG', None, 'Teammates hauling each other over the obstacle wall'),
  'obstacle-net': ('Bootcamp and obstacles', 'Group obstacle race', 'IMG_8905.JPG', None, 'A group climbing the cargo net obstacle together'),
  'obstacle-race': ('Bootcamp and obstacles', 'Group obstacle race', 'IMG_8928.JPG', None, 'Participants climbing the angled ladder obstacle'),
  'obstacle-hurdles': ('Bootcamp and obstacles', 'Group obstacle race', 'IMG_8915.JPG', None, 'A participant vaulting the obstacle wall while the team waits'),
  'army-instructors': ('Bootcamp and obstacles', 'group photos for website', WA + '10.21.37 AM (5).jpeg', None, 'Instructors in camouflage guiding a team over the wall'),
  'army-briefing': ('Bootcamp and obstacles', 'group photos for website', WA + '10.21.37 AM (4).jpeg', None, 'Instructors in camouflage briefing a group in the field'),
  'individual-obstacles': ('Bootcamp and obstacles', 'Individual obstacles', 'IMG_5583.JPG', None, 'The individual obstacle frame with ladders, steps and rope'),
  'pgt': ('Bootcamp and obstacles', 'progressive group task', 'IMG_0992.JPG', None, 'A team balancing planks across the Progressive Group Task'),
  'pgt-team': ('Bootcamp and obstacles', 'progressive group task', 'IMG_6377.JPG', None, 'A team planning a crossing with planks and a log'),
  'zip-rider': ('Rope and height', 'zip line', 'IMG_6616.JPG', None, 'A rider in a helmet flying down the zip line'),
  'zip-team': ('Rope and height', 'zip line', 'IMG_7546.JPG', None, 'A group in helmets and harnesses ready for the zip line'),
  'high-rope': ('Rope and height', 'highrope course', 'IMG_8365.JPG', None, 'A participant crossing the high rope course among the trees'),
  'rope-bridge': ('Rope and height', 'highrope course', 'MVI_5536.MP4', 5.4, 'A participant crossing the high rope bridge'),
  'low-rope': ('Rope and height', 'low rope course', 'IMG_6343.JPG', None, 'Students crossing the low rope course'),
  'wall-climb': ('Rope and height', 'wall climbing', 'IMG_5492.JPG', None, 'A climber scaling the climbing tower'),
  'wall-tower': ('Rope and height', 'wall climbing', 'IMG_5566.JPG', None, 'Two climbers on the climbing tower'),
  'rappel': ('Rope and height', 'Rapelling', WA + '10.21.37 AM (2).jpeg', None, 'Rappelling down a granite rock face'),
  'caving': ('Rope and height', 'caving', 'VID_20210913_143307.mp4', 1.0, 'Crawling through a rock cave passage'),
  'archery': ('Range', 'archery', 'IMG_8785.JPG', None, 'An archer at full draw on the archery range'),
  'archery-coach': ('Range', 'archery', 'IMG_5197.JPG', None, 'An instructor coaching an archer'),
  'archery-line': ('Range', 'archery', 'IMG_1445.JPG', None, 'Archers taking aim on the shooting line'),
  'shooting': ('Range', 'Shooting', 'IMG_3718.JPG', None, 'A participant aiming an air rifle'),
  'shooting-range': ('Range', 'Shooting', 'IMG_8822.JPG', None, 'Participants on the air rifle range'),
  'shooting-aim': ('Range', 'Shooting', 'IMG_4004.JPG', None, 'Taking careful aim on the air rifle range'),
  'briefing': ('Teams and programmes', 'breifing', 'IMG_6169.JPG', None, 'An instructor briefing students before the day begins'),
  'briefing-assembly': ('Teams and programmes', 'breifing', 'IMG_8305.JPG', None, 'Students assembling for the morning briefing'),
  'team-games': ('Teams and programmes', 'team building games', 'IMG_7521.JPG', None, 'Teams playing a field game'),
  'team-circle': ('Teams and programmes', 'team building games', 'IMG_6682.JPG', None, 'A large group in a circle for a team game'),
  'group-corporate': ('Teams and programmes', 'group photos for website', WA + '10.34.54 AM.jpeg', None, 'A corporate group together after their day'),
  'group-cheer': ('Teams and programmes', 'group photos for website', 'IMG_1041.JPG', None, 'A team striking a pose together'),
  'group-students': ('Teams and programmes', 'group photos for website', 'IMG_7615.JPG', None, 'A large student group on the lawn'),
  'group-kids': ('Teams and programmes', 'group photos for website', 'IMG_8689.JPG', None, 'Schoolchildren in helmets and harnesses'),
  'group-fun': ('Teams and programmes', 'group photos for website', WA + '10.21.32 AM (1).jpeg', None, 'A cheerful group on the lawn'),
  'mud-kids': ('Kids and schools', 'mud obstacles', 'IMG_6357.JPG', None, 'Children climbing through the tyre and net obstacle'),
  'mud-net': ('Kids and schools', 'mud obstacles', 'IMG_9432.JPG', None, 'Children climbing the rope net'),
  'trek-vista': ('Outdoors and camping', 'Trekking', 'IMG_6708.MOV', 18.0, 'Trekkers on a granite summit above the valley'),
  'trek-trail': ('Outdoors and camping', 'Trekking', 'IMG_6710.MOV', 7.0, 'Trekkers walking down a rocky hillside'),
  'campfire': ('Outdoors and camping', 'camp fire', 'IMG_4794 (1).JPG', None, 'A group around a roaring campfire at night'),
  'campfire-circle': ('Outdoors and camping', 'camp fire', 'IMG_1967.JPG', None, 'A group sitting together on the lawn at night'),
  'tents-night': ('Outdoors and camping', 'tent pitching', '20230216_211735 (1).jpg', None, 'Camping tents pitched on the lawn at night'),
  'tent-pitching': ('Outdoors and camping', 'tent pitching', 'IMG_5636.JPG', None, 'An instructor demonstrating tent pitching'),
  'rain-dance': ('Outdoors and camping', 'rain dance', 'IMG_6481 (1).JPG', None, 'A group celebrating under the rain dance sprinklers'),
  'tent-stay': ('Stay and dining', 'luxurious Tent stay', 'IMG_1761.JPG', None, 'Luxury tents with private verandas'),
  'tent-interior': ('Stay and dining', 'luxurious Tent stay', 'IMG_1766 (1).JPG', None, 'Inside a luxury tent: double bed and wardrobe'),
  'tent-lounge': ('Stay and dining', 'luxurious Tent stay', 'IMG_1773.JPG', None, 'Seating area inside a luxury tent'),
  'tent-row': ('Stay and dining', 'luxurious Tent stay', 'IMG_1776.JPG', None, 'A row of luxury tents among coconut palms'),
  'cottage': ('Stay and dining', 'luxurious Tent stay', 'IMG_0059.JPG', None, 'A bamboo cottage with a veranda'),
  'dining': ('Stay and dining', 'having food', 'IMG_8887.JPG', None, 'Students sharing a meal in the dining hall'),
  'pottery': ('Farm and crafts', 'pottery', 'IMG_6243.JPG', None, 'A child shaping clay on the potter\u2019s wheel with the potter'),
  'tractor': ('Farm and crafts', 'tractor ride', 'IMG_6223.JPG', None, 'A tractor ride along the farm track'),
  'dairy': ('Farm and crafts', 'dairy farming', 'IMG_9390.JPG', None, 'Students feeding the farm animals'),
  'garden': ('Farm and crafts', 'kitchen garden', 'IMG_6273 (1).JPG', None, 'Planting seedlings in the kitchen garden'),
}

def load(folder, name, t):
    p = os.path.join(SRC, folder, name)
    if t is None: return ImageOps.exif_transpose(Image.open(p)).convert('RGB'), os.path.getsize(p)
    tmp = os.path.join(tempfile.gettempdir(), 'eu-still.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', p, '-frames:v', '1', tmp], check=True)
    return Image.open(tmp).convert('RGB'), os.path.getsize(p)

os.makedirs(OUT, exist_ok=True); os.makedirs(DOC, exist_ok=True)
manifest, before, after = [], 0, 0
for key, (cat, folder, name, t, alt) in PHOTOS.items():
    im, src_bytes = load(folder, name, t)
    im.thumbnail((MAX, MAX), Image.LANCZOS)
    dst = os.path.join(OUT, key + '.webp'); im.save(dst, 'WEBP', quality=QUALITY, method=6)
    out_bytes = os.path.getsize(dst)
    if t is None: before += src_bytes
    after += out_bytes
    manifest.append({'key': key, 'src': f'/media/photos/{key}.webp', 'alt': alt, 'category': cat, 'source': f'{folder}/{name}' + (f' @ {t}s' if t is not None else ''),
                     'width': im.width, 'height': im.height, 'source_kb': round(src_bytes / 1024) if t is None else None, 'webp_kb': round(out_bytes / 1024)})
json.dump(manifest, open(os.path.join(DOC, 'photo-manifest.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(f'{len(manifest)} photos; originals (photos only) {before/1048576:.1f} MB -> WebP {after/1048576:.1f} MB ({100*(1-after/before):.0f}% smaller)')
