import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {configFrom} from '../src/config';
import {MySQLDatabase} from '../src/database';
import {loadEnvFiles,defaultEnvFiles,isAutomatedTest,isLoopbackHost,assertSafeDatabaseTarget,assertWriteConfirmed} from '../src/env';

const base={PORT:'3000',DB_HOST:'db.example.test',DB_NAME:'live_db',DB_USER:'u',DB_PASSWORD:'p',DB_SSL:'false'};
function files(contents:Record<string,string>){
 const dir=mkdtempSync(join(tmpdir(),'eu-env-'));const paths:Record<string,string>={};
 for(const [name,text] of Object.entries(contents)){paths[name]=join(dir,name);writeFileSync(paths[name],text)}
 return {paths,done:()=>rmSync(dir,{recursive:true,force:true})};
}

test('a database chosen by the real environment cannot be overridden by .env files',()=>{
 const f=files({'.env':'DATABASE_URL=mysql://prod:secret@live.example.test/prod\nDB_HOST=live.example.test\nSESSION_HOURS=4\nFRONTEND_URL=http://localhost:3000'});
 try{
  const env:NodeJS.ProcessEnv={DB_HOST:'127.0.0.1',DB_NAME:'staging_db'};
  loadEnvFiles([f.paths['.env']],env);
  assert.equal(env.DATABASE_URL,undefined,'DATABASE_URL from a file must be ignored');
  assert.equal(env.DB_HOST,'127.0.0.1');
  assert.equal(env.SESSION_HOURS,'4','non-database settings are still loaded');
 }finally{f.done()}
});

test('without an environment choice, database settings come from one file only (no mixing)',()=>{
 const f=files({'a.env':'DB_HOST=first.example.test\nDB_NAME=first\nPORT=3001','b.env':'DATABASE_URL=mysql://x:y@second.example.test/second\nDB_USER=second_user\nSESSION_HOURS=2'});
 try{
  const env:NodeJS.ProcessEnv={};
  loadEnvFiles([f.paths['a.env'],f.paths['b.env']],env);
  assert.equal(env.DB_HOST,'first.example.test');
  assert.equal(env.DB_USER,undefined,'DB_USER from the second file must not be mixed in');
  assert.equal(env.DATABASE_URL,undefined);
  assert.equal(env.PORT,'3001');assert.equal(env.SESSION_HOURS,'2');
 }finally{f.done()}
});

test('process variables always beat files, and EU_ENV_FILE replaces the default files',()=>{
 const f=files({'staging.env':'DB_HOST=127.0.0.1\nDB_NAME=staging_db\nSESSION_HOURS=1'});
 try{
  const env:NodeJS.ProcessEnv={SESSION_HOURS:'9'};
  loadEnvFiles([f.paths['staging.env']],env);
  assert.equal(env.SESSION_HOURS,'9');assert.equal(env.DB_NAME,'staging_db');
  assert.deepEqual(defaultEnvFiles('/repo',{EU_ENV_FILE:'backend/.env.staging'}),[resolve('/repo','backend/.env.staging')]);
  assert.deepEqual(defaultEnvFiles('/repo',{}),[resolve('/repo','.env'),resolve('/repo','backend/.env')]);
 }finally{f.done()}
});

test('automated tests are detected, and only local databases are allowed there',()=>{
 assert.equal(isAutomatedTest({}, []),false);
 assert.equal(isAutomatedTest({NODE_ENV:'test'},[]),true);
 assert.equal(isAutomatedTest({EU_AUTOMATED_TEST:'true'},[]),true);
 assert.equal(isAutomatedTest({NODE_TEST_CONTEXT:'child-v8'},[]),true);
 assert.equal(isAutomatedTest({},['--test']),true);
 for(const host of ['127.0.0.1','localhost','::1','db.localhost'])assert.equal(isLoopbackHost(host),true,host);
 for(const host of ['db.example.test','10.0.0.5','srv1.hstgr.io','127.0.0.1.evil.test'])assert.equal(isLoopbackHost(host),false,host);
 const remote=configFrom(base),local=configFrom({...base,DB_HOST:'127.0.0.1'});
 assert.throws(()=>assertSafeDatabaseTarget(remote,{EU_AUTOMATED_TEST:'true'},[]),/non-local database during automated tests/);
 assert.doesNotThrow(()=>assertSafeDatabaseTarget(local,{EU_AUTOMATED_TEST:'true'},[]));
 assert.doesNotThrow(()=>assertSafeDatabaseTarget(remote,{},[]),'normal runs are unaffected');
});

test('the real database factory refuses a remote host while this test run is active',async()=>{
 assert.equal(isAutomatedTest(),true,'the Node test runner must be detected');
 assert.throws(()=>MySQLDatabase.create(configFrom(base)),/non-local database/);
 const local=MySQLDatabase.create(configFrom({...base,DB_HOST:'127.0.0.1'}));  // creating a pool does not connect
 await local.close();
});

test('writing commands need the exact target database name',()=>{
 const config=configFrom(base);
 assert.throws(()=>assertWriteConfirmed(config,{}),/ALLOW_DB_WRITES/);
 assert.throws(()=>assertWriteConfirmed(config,{ALLOW_DB_WRITES:'other_db'}),/ALLOW_DB_WRITES/);
 assert.doesNotThrow(()=>assertWriteConfirmed(config,{ALLOW_DB_WRITES:'live_db'}));
});
