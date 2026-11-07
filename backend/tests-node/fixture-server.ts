// Local-only test server: API + the built Next.js site on one origin, backed by an in-memory fixture database.
// Never touches MySQL. Usage: npm run build, then `npx tsx backend/tests-node/fixture-server.ts` (from the repo root or backend/).
import {resolve} from 'node:path';
import {createServer} from 'node:http';
import express from 'express';
import next from 'next';
import {createAPI} from '../src/api';
import {insert} from '../src/database';
import {passwordHash} from '../src/crypto';
import {FixtureDatabase} from './database';
import {testConfig} from './helpers';
import fixtures from './fixtures.json';

const port = Number(process.env.FIXTURE_PORT || 3000);
(async () => {
  const db = new FixtureDatabase();
  const password_hash = await passwordHash(fixtures.password);
  await insert(db, 'admin_users', {email: 'admin@example.com', password_hash, role: 'admin'});
  await insert(db, 'admin_users', {email: 'staff@example.com', password_hash, role: 'staff_viewer'});
  await insert(db, 'page_content', {slug: 'home', content: process.env.FIXTURE_MEDIA === 'true' ? {...fixtures.home, hero_video: 'https://media.example.test/hero.mp4'} : fixtures.home});
  await insert(db, 'site_settings', {key: 'contact', value: {...fixtures.contact, whatsapp: '919876543210', whatsapp_message: 'Hello, I would like to plan an experience.'}});
  const programmes = [];
  for (const [i, name] of ['Corporate Unbound', 'Students Unbound', 'Adventure Unbound'].entries())
    programmes.push(await insert(db, 'programmes', {slug: name.toLowerCase().replace(/ /g, '-'), name, description: `${name} sample programme.`, published: true, display_order: i * 10}));
  for (const [i, name] of ['Zip Line', 'Wall Climbing', 'Archery', 'Rope Course'].entries())
    await insert(db, 'activities', {slug: name.toLowerCase().replace(/ /g, '-'), name, description: `${name} sample activity.`, published: true, display_order: i * 10, details: name === 'Archery' ? {categories: ['Shooting And Archery']} : {}});
  await insert(db, 'packages', {slug: 'day-pass', name: 'Day pass', description: 'Sample enquiry-only package.', published: true, display_order: 0, programme_id: programmes[0].id});
  await insert(db, 'clients', {slug: 'sample-client', name: 'Sample Client', description: '', published: true, display_order: 0});
  await insert(db, 'gallery_albums', {slug: 'sample-album', name: 'Sample album', description: '', published: true, display_order: 0, details: {media: []}});
  await insert(db, 'faqs', {question: 'Is this a sample question?', answer: 'Yes, this is test data.', published: true, page: '/faqs', display_order: 0});

  const config = testConfig({FRONTEND_URL: `http://127.0.0.1:${port}`});
  const api = await createAPI(db, config);
  const app = express();
  app.use('/api', api.app);
  process.env.API_INTERNAL_URL = `http://127.0.0.1:${port}/api`;
  const frontend = next({dev: false, dir: resolve(__dirname, '../../frontend'), hostname: '127.0.0.1', port});
  await frontend.prepare();
  const handler = frontend.getRequestHandler();
  app.use((req, res) => handler(req, res));
  createServer(app).listen(port, '127.0.0.1', () => console.log(`fixture site + API on http://127.0.0.1:${port}`));
})();
