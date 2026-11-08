// Tidying activities only unpublishes listed duplicates (never deletes), previews by default, and leaves others alone.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tidyActivities} from '../src/tidy-activities';
import {insert,one,rows} from '../src/database';
import {setup} from './helpers';

test('preview writes nothing; apply unpublishes listed duplicates only; nothing is deleted',async()=>{
 const env=await setup();
 try{
  for(const name of ['Archery','Target Archery','Name Plates','Zip Line'])await insert(env.db,'activities',{slug:name.toLowerCase().replace(/ /g,'-'),name,published:true});
  const before=(await rows(env.db,'activities')).length;
  const preview=await tidyActivities(env.db);
  assert.equal(preview.to_hide,2);assert.equal((await one(env.db,'activities','name=?',['Target Archery']))!.published,true,'preview changes nothing');
  await tidyActivities(env.db,{apply:true});
  assert.equal((await one(env.db,'activities','name=?',['Target Archery']))!.published,false);
  assert.equal((await one(env.db,'activities','name=?',['Name Plates']))!.published,false);
  assert.equal((await one(env.db,'activities','name=?',['Archery']))!.published,true,'the kept activity stays');
  assert.equal((await one(env.db,'activities','name=?',['Zip Line']))!.published,true);
  assert.equal((await rows(env.db,'activities')).length,before,'nothing deleted');
  assert.equal((await tidyActivities(env.db,{apply:true})).to_hide,0,'running again changes nothing');
 }finally{await env.close()}
});
