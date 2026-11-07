import {test} from 'node:test';
import assert from 'node:assert/strict';
import {one} from '../src/database';
import {passwordVerify} from '../src/crypto';
import {createUser} from '../src/create-user';
import {HttpError} from '../src/validation';
import {FixtureDatabase} from './database';

test('createUser makes a lower-cased Staff Viewer, hashes the password, and never overwrites an existing account',async()=>{
 const db=new FixtureDatabase();
 try{
  const made=await createUser(db,{email:'Staff@Example.com',password:'a-staff-test-password-1',role:'staff_viewer'});
  assert.deepEqual(made,{status:'created',email:'staff@example.com',role:'staff_viewer'});
  const row=(await one(db,'admin_users','email=?',['staff@example.com']))!;
  assert.equal(row.role,'staff_viewer');assert.equal(row.active,true);
  assert.ok(row.password_hash.startsWith('$argon2id$'));assert.ok(!row.password_hash.includes('a-staff-test-password-1'));
  assert.equal(await passwordVerify(row.password_hash,'a-staff-test-password-1'),true);
  const again=await createUser(db,{email:'staff@example.com',password:'a-completely-different-pass-9',role:'admin'});
  assert.equal(again.status,'exists');
  const after=(await one(db,'admin_users','email=?',['staff@example.com']))!;
  assert.equal(after.role,'staff_viewer');assert.equal(await passwordVerify(after.password_hash,'a-staff-test-password-1'),true);
 }finally{await db.close()}
});

test('createUser rejects bad input with the same rules as the admin panel',async()=>{
 const db=new FixtureDatabase();
 try{
  for(const bad of [{email:'not-an-email',password:'a-staff-test-password-1',role:'staff_viewer'},{email:'a@example.com',password:'short',role:'staff_viewer'},{email:'a@example.com',password:'a-staff-test-password-1',role:'owner'},{email:'a@example.com',password:'a-staff-test-password-1',role:'editor'}])
   await assert.rejects(createUser(db,bad),(e:unknown)=>e instanceof HttpError&&e.status===422);
 }finally{await db.close()}
});
