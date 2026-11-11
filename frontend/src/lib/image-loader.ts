// Image loader for next/image: no server-side resizing (it times out on the shared host). Eagles Unbound photographs have
// pre-built widths in public/media/photos (<key>-640.webp, <key>-1080.webp, <key>.webp at 1800 px, made by
// scripts/optimise-photos.py); everything else (logo, posters, CMS and remote images) is served exactly as stored.
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  const photo = /^\/media\/photos\/([a-z0-9-]+?)(?:-(?:640|1080))?\.webp$/.exec(src);
  if (!photo) return src;
  return `/media/photos/${photo[1]}${width <= 640 ? '-640' : width <= 1200 ? '-1080' : ''}.webp`;
}
