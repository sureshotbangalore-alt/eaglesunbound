// The media command fills empty CMS image fields with real photographs, never overrides an admin's choice, and every
// photo it points at exists on disk.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {applyMedia} from '../src/apply-media';
import {insert,one} from '../src/database';
import {setup} from './helpers';

test('empty images get matching photos; admin-chosen images are kept; dry run writes nothing',async()=>{
 const env=await setup();
 try{
  await insert(env.db,'activities',{slug:'zip-line',name:'Zip Line',published:true});
  await insert(env.db,'activities',{slug:'archery',name:'Archery',published:true,image:'/uploads/chosen-by-admin.jpg'});
  await insert(env.db,'activities',{slug:'air-rifle',name:'Air Rifle Shooting',published:true});
  const preview=await applyMedia(env.db,{dryRun:true});
  assert.ok(preview.some(c=>c.name==='Zip Line'&&c.to==='/media/photos/zip-rider.webp'));
  assert.equal((await one(env.db,'activities','slug=?',['zip-line']))!.image,'','dry run changes nothing');
  const applied=await applyMedia(env.db);
  assert.equal((await one(env.db,'activities','slug=?',['zip-line']))!.image,'/media/photos/zip-rider.webp');
  assert.equal((await one(env.db,'activities','slug=?',['air-rifle']))!.image,'/media/photos/shooting.webp');
  assert.equal((await one(env.db,'activities','slug=?',['archery']))!.image,'/uploads/chosen-by-admin.jpg','admin choice kept');
  assert.ok(!applied.some(c=>c.name==='Archery'));
  assert.equal((await applyMedia(env.db)).length,0,'running again changes nothing');
  for(const c of applied)assert.ok(existsSync(resolve(__dirname,'../../frontend/public',c.to.slice(1))),`${c.to} exists`);
 }finally{await env.close()}
});
