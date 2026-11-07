import type {AddressInfo} from 'node:net';
import type {Server} from 'node:http';
import {configFrom} from '../src/config';
import {createAPI} from '../src/api';
import {insert,one,type Row} from '../src/database';
import {passwordHash} from '../src/crypto';
import type {Storage} from '../src/media';
import {FixtureDatabase} from './database';
import fixtures from './fixtures.json';

export const PASSWORD = fixtures.password;
export const ORIGIN = 'http://localhost:3000';
export const HEADERS = {'X-Requested-With': 'EaglesAdmin', Origin: ORIGIN};
let hash: Promise<string> | undefined;

export function testConfig(overrides: Record<string, string> = {}) {
  return configFrom({PORT: '3000', FRONTEND_URL: ORIGIN, DB_HOST: 'fixture', DB_NAME: 'fixture', DB_USER: 'fixture', DB_PASSWORD: 'fixture', DB_SSL: 'false', MFA_ENCRYPTION_KEY: fixtures.fernet_key, ...overrides});
}

/** A tiny HTTP client that keeps the session cookie between requests, like a browser. */
export class Client {
  cookie = '';
  constructor(private base: string) {}
  async request(method: string, path: string, options: {json?: unknown; body?: BodyInit; headers?: Record<string, string>} = {}) {
    const headers: Record<string, string> = {...options.headers};
    if (this.cookie) headers.Cookie = 'eu_session=' + this.cookie;
    let body = options.body;
    if (options.json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(options.json); }
    const response = await fetch(this.base + path, {method: method.toUpperCase(), headers, body, redirect: 'manual'});
    const set = response.headers.get('set-cookie') || '';
    const match = set.match(/eu_session=([^;]*)/);
    if (match) this.cookie = match[1] === '""' ? '' : match[1];
    const text = await response.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = undefined; }
    return {status: response.status, headers: response.headers, text, json: data, setCookie: set};
  }
  get(path: string, headers?: Record<string, string>) { return this.request('get', path, {headers}); }
  post(path: string, json?: unknown, headers: Record<string, string> = HEADERS) { return this.request('post', path, {json, headers}); }
  put(path: string, json?: unknown, headers: Record<string, string> = HEADERS) { return this.request('put', path, {json, headers}); }
  patch(path: string, json?: unknown, headers: Record<string, string> = HEADERS) { return this.request('patch', path, {json, headers}); }
  delete(path: string, headers: Record<string, string> = HEADERS) { return this.request('delete', path, {headers}); }
  async login(email = 'admin@example.com') {
    const response = await this.post('/admin/login', {email, password: PASSWORD});
    if (response.status !== 200) throw Error(`login failed for ${email}: ${response.status}`);
    return response;
  }
}

export async function setup(options: {env?: Record<string, string>; storage?: Storage} = {}) {
  const db = new FixtureDatabase();
  hash ||= passwordHash(PASSWORD);
  const password_hash = await hash;
  for (const [email, role] of [['admin@example.com', 'admin'], ['editor@example.com', 'editor'], ['staff@example.com', 'staff_viewer']])
    await insert(db, 'admin_users', {email, password_hash, role});
  await insert(db, 'page_content', {slug: 'home', content: fixtures.home});
  await insert(db, 'site_settings', {key: 'contact', value: fixtures.contact});
  const programme = await insert(db, 'programmes', {slug: 'test-programme', name: 'Test programme', published: true});
  await insert(db, 'programmes', {slug: 'draft-programme', name: 'Draft programme', published: false});
  const api = await createAPI(db, testConfig(options.env), options.storage);
  const server: Server = await new Promise(resolve => { const s = api.app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    db, base, programmeId: programme.id as string, limiter: api.limiter,
    client: () => new Client(base),
    find: (table: string, where: string, values: unknown[] = []) => one(db, table, where, values) as Promise<Row | undefined>,
    async close() { await new Promise(resolve => server.close(resolve)); await db.close(); },
  };
}

export const futureDate = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
export const booking = (programme_id: string) => ({name: 'Test Visitor', email: 'visitor@example.com', mobile: '+919876543210', programme_id, preferred_date: futureDate(10), participants: 8, group_type: 'Corporate', consent: true});
export const enquiry = {name: 'Enquiry Visitor', email: 'ask@example.com', phone: '+919876543210', category: 'Corporate', message: 'Tell me about team days.', consent: true};
