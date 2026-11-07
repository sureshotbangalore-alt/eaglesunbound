import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Picture } from './imagery';

// Server-side only (reads the file system). The founder's portrait is supplied by the client. It is used only once the file is in public/assets.
const file = 'founder-bhakuni.jpg';

// npm start runs from the repository root (Hostinger too); next dev/build run from frontend/; tools may run from backend/.
const candidates = () => ['public', 'frontend/public', '../frontend/public'].map(dir => join(process.cwd(), dir, 'assets', file));

export function founderPortrait(): Picture | null {
  return candidates().some(existsSync)
    ? { src: `/assets/${file}`, alt: 'Maj Gen V. P. S. Bhakuni, VSM (Retd.), Founder and CEO of Eagles Unbound' }
    : null;
}
