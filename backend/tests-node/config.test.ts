import {test} from 'node:test';
import assert from 'node:assert/strict';
import {configFrom} from '../src/config';
import {decryptSecret,passwordVerify} from '../src/crypto';
import fixtures from './fixtures.json';

const base = {PORT: '3000', DB_HOST: 'db.example.test', DB_NAME: 'eagles', DB_USER: 'app', DB_PASSWORD: 'test-password'};

test('DB_* variables configure MySQL and keep special password characters', () => {
  const password = 'test-only!#@:/value';
  const config = configFrom({...base, DB_PASSWORD: password, DB_PORT: '3307'});
  assert.equal(config.db.password, password);
  assert.equal(config.db.port, 3307);
  assert.equal(config.db.database, 'eagles');
});

test('legacy DATABASE_URL (mysql+pymysql) is still accepted', () => {
  const config = configFrom({PORT: '3000', DATABASE_URL: 'mysql+pymysql://app:p%40ss%3Aword@db.example.test:3306/eagles'});
  assert.equal(config.db.user, 'app');
  assert.equal(config.db.password, 'p@ss:word');
  assert.equal(config.db.database, 'eagles');
  assert.throws(() => configFrom({PORT: '3000', DATABASE_URL: 'sqlite:///local.db'}));
});

test('missing database settings fail without echoing values', () => {
  assert.throws(() => configFrom({PORT: '3000', DB_HOST: 'x'}), /DB_HOST, DB_NAME, DB_USER and DB_PASSWORD/);
});

test('production requires PORT, HTTPS origin and secure cookies', () => {
  const production = {...base, NODE_ENV: 'production', FRONTEND_URL: 'https://eagles.example.com', COOKIE_SECURE: 'true'};
  assert.equal(configFrom(production).production, true);
  assert.throws(() => configFrom({...production, PORT: ''}), /PORT/);
  assert.throws(() => configFrom({...production, COOKIE_SECURE: 'false'}));
  assert.throws(() => configFrom({...production, FRONTEND_URL: 'http://eagles.example.com'}));
  assert.throws(() => configFrom({...production, FRONTEND_URL: 'https://user:pw@eagles.example.com'}));
});

test('TRUST_PROXY must be an explicit list, never a blanket boolean', () => {
  assert.throws(() => configFrom({...base, TRUST_PROXY: 'true'}));
  assert.throws(() => configFrom({...base, TRUST_PROXY: '2'}));
  assert.deepEqual(configFrom({...base, TRUST_PROXY: 'loopback, 10.0.0.0/8'}).trustProxy, ['loopback', '10.0.0.0/8']);
});

test('password hashes and MFA secrets written by the Python backend still verify', async () => {
  assert.equal(await passwordVerify(fixtures.python_argon2_hash, fixtures.password), true);
  assert.equal(await passwordVerify(fixtures.python_argon2_hash, 'wrong'), false);
  assert.match(decryptSecret(fixtures.python_fernet_token, fixtures.fernet_key), /^[A-Z2-7]+$/);
});
