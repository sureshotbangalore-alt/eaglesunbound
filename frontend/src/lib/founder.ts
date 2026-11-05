import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Picture } from './imagery';

// Server-side only (reads the file system). The founder's portrait is supplied by the client. It is used only once the file is in public/assets.
const file = 'founder-bhakuni.jpg';

export function founderPortrait(): Picture | null {
  return existsSync(join(process.cwd(), 'public', 'assets', file))
    ? { src: `/assets/${file}`, alt: 'Maj Gen V. P. S. Bhakuni, VSM (Retd.), Founder and CEO of Eagles Unbound' }
    : null;
}
