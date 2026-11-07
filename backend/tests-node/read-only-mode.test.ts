// ALLOW_DB_WRITES not "true" means a read-only site: reads work, every write is refused, nothing reaches the database.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rows,insert} from '../src/database';
import {isReadOnlySql,readOnlyDatabase,READ_ONLY_MESSAGE} from '../src/write-guard';
import {HttpError} from '../src/validation';
import {setup,booking,enquiry,PASSWORD,HEADERS} from './helpers';

test('only SELECT-style statements are classified as read-only',()=>{
 for(const sql of ['SELECT 1','  select * from bookings','SHOW TABLES','DESCRIBE bookings','EXPLAIN SELECT 1','SELECT * FROM a WHERE x=? FOR UPDATE'])assert.equal(isReadOnlySql(sql),true,sql);
 for(const sql of ['INSERT INTO a VALUES (1)','UPDATE a SET b=1','DELETE FROM a','REPLACE INTO a VALUES (1)','DROP TABLE a','ALTER TABLE a ADD b INT','TRUNCATE a','CREATE TABLE a (b INT)','GRANT ALL ON *.* TO x','SELECT 1 INTO OUTFILE "/tmp/x"','','-- c\nINSERT INTO a VALUES (1)','WITH x AS (SELECT 1) DELETE FROM a'])assert.equal(isReadOnlySql(sql),false,sql);
});

test('the database wrapper refuses writes, including inside a transaction, and still reads',async()=>{
 const env=await setup();
 try{
  const guarded=readOnlyDatabase(env.db);
  assert.ok((await guarded.query('SELECT COUNT(*) AS c FROM programmes'))[0].c>0);
  await assert.rejects(guarded.execute('DELETE FROM programmes'),(e:unknown)=>e instanceof HttpError&&e.status===503);
  await assert.rejects(guarded.transaction(async tx=>{await tx.execute("UPDATE programmes SET name='x'")}),(e:unknown)=>e instanceof HttpError&&e.status===503);
  await assert.rejects(insert(guarded,'faqs',{question:'q',answer:'a'}),/./);
  assert.ok((await rows(env.db,'programmes')).every(p=>p.name!=='x'),'nothing was changed');
 }finally{await env.close()}
});

test('read-only API: public reads and /health work; bookings, enquiries, sign-in and CMS saves return 503 without touching data',async()=>{
 const env=await setup({env:{ALLOW_DB_WRITES:'false'}});
 try{
  const c=env.client();
  assert.deepEqual((await c.get('/health')).json,{status:'ok'});
  assert.equal((await c.get('/public/programmes')).json.length,1);
  assert.equal((await c.get('/public/home')).status,200);
  const attempts=[
   c.post('/bookings',booking(env.programmeId),{}),
   c.post('/enquiries',enquiry,{}),
   c.post('/admin/login',{email:'admin@example.com',password:PASSWORD}),
   c.put('/admin/content',{}),
   c.delete('/admin/records/programmes/'+env.programmeId),
  ];
  for(const response of await Promise.all(attempts)){assert.equal(response.status,503);assert.equal(response.json.detail,READ_ONLY_MESSAGE);}
  assert.equal((await rows(env.db,'bookings')).length,0);assert.equal((await rows(env.db,'enquiries')).length,0);
  assert.equal((await rows(env.db,'admin_sessions')).length,0,'no session row was created');
  assert.ok(await env.find('programmes','id=?',[env.programmeId]),'the programme still exists');
  // Cross-origin writes are still rejected first (403), not reported as read-only.
  assert.equal((await c.post('/bookings',{},{Origin:'https://evil.example.net'})).status,403);
 }finally{await env.close()}
});

test('with ALLOW_DB_WRITES=true the same requests succeed (the guard is the only difference)',async()=>{
 const env=await setup({env:{ALLOW_DB_WRITES:'true'}});
 try{
  const c=env.client();
  assert.equal((await c.post('/bookings',booking(env.programmeId),{})).status,201);
  assert.equal((await rows(env.db,'bookings')).length,1);
  assert.equal((await c.post('/admin/login',{email:'admin@example.com',password:PASSWORD})).status,200);
 }finally{await env.close()}
});

test('several CORS origins are accepted and others rejected',async()=>{
 const env=await setup({env:{CORS_ORIGINS:'http://localhost:3000,https://shop.example.com'}});
 try{
  const c=env.client();
  for(const origin of ['http://localhost:3000','https://shop.example.com']){
   const r=await c.request('options','/bookings',{headers:{Origin:origin}});
   assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),origin);assert.equal(r.headers.get('access-control-allow-credentials'),'true');
  }
  const denied=await c.request('options','/bookings',{headers:{Origin:'https://other.example.org'}});
  assert.equal(denied.status,403);assert.equal(denied.headers.get('access-control-allow-origin'),null);
  assert.equal((await c.post('/admin/login',{email:'x@example.com',password:'y'},{...HEADERS,Origin:'https://shop.example.com'})).status,401,'an allowed origin reaches the handler');
 }finally{await env.close()}
});
