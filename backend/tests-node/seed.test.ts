import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {rows,one} from '../src/database';
import {passwordVerify} from '../src/crypto';
import {seedDatabase} from '../src/seed';
import {FixtureDatabase} from './database';
import fixtures from './fixtures.json';

const catalogue=JSON.parse(readFileSync(resolve(__dirname,'../data/master-activities.json'),'utf8'));
const counts=async(db:FixtureDatabase)=>Object.fromEntries(await Promise.all(['activities','programmes','faqs','page_content','gallery_albums','site_settings'].map(async t=>[t,(await rows(db,t)).length])));

test('seed fills an empty database, includes every master activity, and is idempotent',async()=>{
 const db=new FixtureDatabase();
 try{
  const first=await seedDatabase(db,{force:true});assert.equal(first.skipped,undefined);
  const activities=await rows(db,'activities');
  const names=new Set(activities.flatMap(a=>[a.name,...(a.details?.aliases||[])]));
  for(const a of catalogue.activities)assert.ok(names.has(a.name),`missing activity ${a.name}`);
  assert.equal(new Set(activities.map(a=>a.slug)).size,activities.length);
  assert.equal((await one(db,'activities','name=?',['Pelvic Rest Shooting']))!.published,false);
  assert.equal((await one(db,'activities','name=?',['Recove Bow Shooting']))!.published,false);
  const master=['school-day-outing','outbound-student-activities','college-adventure-program','overnight-stay-program','corporate-team-building','outdoor-adventure-program'];
  for(const slug of master)assert.equal((await one(db,'programmes','slug=?',[slug]))!.published,true,slug);
  assert.ok((await one(db,'site_settings','`key`=?',['master_review']))!.value.contact_conflict);
  assert.ok((await one(db,'activities','slug=?',['archery']))!.details.categories.includes('Shooting And Archery'));
  const before=await counts(db);
  await seedDatabase(db,{force:true});
  assert.deepEqual(await counts(db),before);
 }finally{await db.close()}
});

test('seed refuses to touch an already-seeded database without --force',async()=>{
 const db=new FixtureDatabase();
 try{
  await seedDatabase(db,{force:true});const before=await counts(db);
  const again=await seedDatabase(db);
  assert.match(again.skipped||'',/already has homepage content/);
  assert.deepEqual(await counts(db),before);
 }finally{await db.close()}
});

test('admin creation is insert-only, enforces password length and hashes with argon2',async()=>{
 const db=new FixtureDatabase();
 try{
  await assert.rejects(seedDatabase(db,{adminOnly:true,admin:{email:'a@example.com',password:'short'}}),/14 characters/);
  const made=await seedDatabase(db,{adminOnly:true,admin:{email:'Boss@Example.com',password:fixtures.password+'-long-enough'}});
  assert.equal(made.admin,'created');
  const user=(await one(db,'admin_users','email=?',['boss@example.com']))!;
  assert.equal(user.role,'admin');assert.ok(user.password_hash.startsWith('$argon2id$'));
  assert.equal(await passwordVerify(user.password_hash,fixtures.password+'-long-enough'),true);
  assert.equal((await seedDatabase(db,{adminOnly:true,admin:{email:'boss@example.com',password:'a-different-password-123'}})).admin,'exists');
  assert.equal(await passwordVerify((await one(db,'admin_users','email=?',['boss@example.com']))!.password_hash,fixtures.password+'-long-enough'),true,'existing password must not be overwritten');
  assert.equal((await rows(db,'page_content')).length,0,'admin-only must not seed content');
 }finally{await db.close()}
});
