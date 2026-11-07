// Read-only database check and /health: 200 when SELECT 1 works, 503 with a safe code when it does not, never leaking secrets.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {classifyDbError,checkDatabase} from '../src/db-health';
import {createAPI} from '../src/api';
import {configFrom} from '../src/config';
import {MySQLDatabase,type Database} from '../src/database';
import {setup,testConfig} from './helpers';

// What a real MySQL "access denied" error looks like: the MESSAGE contains the user and host, which must never be logged.
const SECRET_HOST='secret-db-host.example.net',SECRET_USER='secret_db_user',SECRET_PASSWORD='Secret-Pa55#word';
const deniedError=()=>Object.assign(new Error(`Access denied for user '${SECRET_USER}'@'${SECRET_HOST}' (using password: YES) ${SECRET_PASSWORD}`),{code:'ER_ACCESS_DENIED_ERROR',errno:1045,sqlState:'28000'});
const failingDb=(error:()=>Error):Database=>({locking:false,query:async()=>{throw error()},execute:async()=>{throw error()},transaction:async work=>work(failingDb(error)),close:async()=>{}});

function captureLogs(){
 const lines:string[]=[];const original=console.error;
 console.error=(...args:unknown[])=>{lines.push(args.map(String).join(' '))};
 return {lines,restore:()=>{console.error=original}};
}
const noSecrets=(text:string)=>![SECRET_HOST,SECRET_USER,SECRET_PASSWORD,'Access denied'].some(s=>text.includes(s));

test('database errors are classified from their code only',()=>{
 const cases:[object,string][]=[
  [{code:'ER_ACCESS_DENIED_ERROR',errno:1045},'DB_ACCESS_DENIED'],[{code:'ER_DBACCESS_DENIED_ERROR',errno:1044},'DB_ACCESS_DENIED'],[{errno:1130},'DB_ACCESS_DENIED'],
  [{code:'ER_BAD_DB_ERROR',errno:1049},'DB_NOT_FOUND'],
  [{code:'ECONNREFUSED'},'DB_CONNECTION_REFUSED'],[{code:'PROTOCOL_CONNECTION_LOST'},'DB_CONNECTION_REFUSED'],
  [{code:'ETIMEDOUT'},'DB_TIMEOUT'],[{code:'DB_CHECK_TIMEOUT'},'DB_TIMEOUT'],
  [{code:'ENOTFOUND'},'DB_HOST_NOT_FOUND'],[{code:'HANDSHAKE_SSL_ERROR'},'DB_TLS_FAILED'],
  [{code:'ER_PARSE_ERROR'},'DB_QUERY_FAILED'],[{},'DB_QUERY_FAILED'],[null,'DB_QUERY_FAILED'],
 ];
 for(const [error,expected] of cases)assert.equal(classifyDbError(error),expected,JSON.stringify(error));
});

test('a working database passes the check',async()=>{
 const env=await setup();
 try{assert.deepEqual(await checkDatabase(env.db),{ok:true})}finally{await env.close()}
});

test('a failing database gives a safe code and logs no host, user, password or message',async()=>{
 const logs=captureLogs();
 try{
  const result=await checkDatabase(failingDb(deniedError));
  assert.deepEqual(result,{ok:false,code:'DB_ACCESS_DENIED',errorCode:'ER_ACCESS_DENIED_ERROR',errorName:'Error'});
  assert.equal(logs.lines.length,1);
  assert.ok(noSecrets(logs.lines[0]),'the log line must not contain secrets');
  assert.deepEqual(JSON.parse(logs.lines[0]),{event:'db_check_failed',diagnostic:'DB_ACCESS_DENIED',error_code:'ER_ACCESS_DENIED_ERROR',error_name:'Error'});
 }finally{logs.restore()}
});

test('a database that never answers is reported as DB_TIMEOUT',async()=>{
 const logs=captureLogs();
 try{
  const hanging:Database={locking:false,query:()=>new Promise(()=>{}),execute:()=>new Promise(()=>{}),transaction:async work=>work(hanging),close:async()=>{}};
  assert.deepEqual(await checkDatabase(hanging,50),{ok:false,code:'DB_TIMEOUT',errorCode:'DB_CHECK_TIMEOUT',errorName:'Error'});
 }finally{logs.restore()}
});

test('the real MySQL driver: nothing listening gives DB_CONNECTION_REFUSED',async()=>{
 const logs=captureLogs();
 // Port 1 on this machine: a closed local port (automated tests may only target local databases).
 const db=MySQLDatabase.create(configFrom({PORT:'3000',DB_HOST:'127.0.0.1',DB_PORT:'1',DB_NAME:'nothing',DB_USER:SECRET_USER,DB_PASSWORD:SECRET_PASSWORD}));
 try{
  const result=await checkDatabase(db,8000);
  assert.equal(result.ok,false);
  assert.equal(result.ok===false&&result.code,'DB_CONNECTION_REFUSED');
  assert.ok(logs.lines.every(noSecrets),'no secrets in the log');
 }finally{logs.restore();await db.close()}
});

test('GET /health: 200 {status:"ok"} when the database answers',async()=>{
 const env=await setup();
 try{
  const r=await env.client().get('/health');
  assert.equal(r.status,200);assert.deepEqual(r.json,{status:'ok'});
  assert.equal(r.headers.get('cache-control'),'no-store');
 }finally{await env.close()}
});

test('GET /health: 503 "database unavailable" with a safe code, and nothing secret in the response or logs',async()=>{
 const logs=captureLogs();
 const api=await createAPI(failingDb(deniedError),testConfig({ALLOW_DB_WRITES:'false'}));
 const server=await new Promise<import('node:http').Server>(resolve=>{const s=api.app.listen(0,'127.0.0.1',()=>resolve(s))});
 try{
  const response=await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/health`);
  const text=await response.text();
  assert.equal(response.status,503);
  assert.deepEqual(JSON.parse(text),{status:'unavailable',detail:'database unavailable',code:'DB_ACCESS_DENIED',error_code:'ER_ACCESS_DENIED_ERROR'});
  assert.ok(noSecrets(text),'the response must not contain secrets');
  assert.ok(logs.lines.length>=1&&logs.lines.every(noSecrets),'the logs must not contain secrets');
 }finally{logs.restore();await new Promise(resolve=>server.close(resolve))}
});
