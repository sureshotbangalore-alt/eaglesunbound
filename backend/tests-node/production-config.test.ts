// What Hostinger will actually run: production settings, https origin, secure cookies, and the real S3 client talking to a storage endpoint.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {rows} from '../src/database';
import {PASSWORD,setup} from './helpers';

const ORIGIN='https://eagles.example.com';
const production={NODE_ENV:'production',FRONTEND_URL:ORIGIN,COOKIE_SECURE:'true'};
const headers={'X-Requested-With':'EaglesAdmin',Origin:ORIGIN};

test('production: secure HttpOnly SameSite cookie, https-only CORS and a locked-down API CSP',async()=>{
 const env=await setup({env:production});
 try{
  const c=env.client();
  const login=await c.post('/admin/login',{email:'admin@example.com',password:PASSWORD},headers);
  assert.equal(login.status,200);
  const cookie=login.setCookie;
  assert.match(cookie,/^eu_session=/);assert.match(cookie,/; HttpOnly/);assert.match(cookie,/; Secure/);assert.match(cookie,/; SameSite=lax/);assert.match(cookie,/; Path=\//);
  assert.match(cookie,/Max-Age=28800/,'8 hour default session');
  assert.equal(login.headers.get('access-control-allow-origin'),ORIGIN);
  assert.equal(login.headers.get('access-control-allow-credentials'),'true');
  assert.match(login.headers.get('content-security-policy')||'',/default-src 'none'; frame-ancestors 'none'/);
  assert.equal((await c.request('post','/admin/login',{json:{email:'admin@example.com',password:PASSWORD},headers:{...headers,Origin:'http://eagles.example.com'}})).status,403,'the plain-http origin must be rejected');
  assert.equal((await c.request('post','/bookings',{json:{},headers:{Origin:'https://evil.example.net'}})).status,403);
  const me=await c.request('get','/admin/me',{headers});
  assert.equal(me.status,200);assert.equal(me.headers.get('cache-control'),'no-store');
  const logout=await c.post('/admin/logout',undefined,headers);
  assert.match(logout.setCookie,/Max-Age=0/);assert.equal((await c.get('/admin/me')).status,401);
 }finally{await env.close()}
});

test('the same API paths work behind /api and at the root (Hostinger serves both)',async()=>{
 const env=await setup({env:production});
 try{
  const c=env.client();
  assert.equal((await c.get('/health')).status,200);
  assert.equal((await c.get('/public/home')).status,200);
  assert.equal((await c.get('/does-not-exist')).status,404);
 }finally{await env.close()}
});

test('media storage: the real S3 client uploads to and deletes from the configured endpoint',async()=>{
 const seen:{method?:string;url?:string;type?:string;cache?:string}[]=[];
 const storage=createServer((req,res)=>{req.resume();req.on('end',()=>{seen.push({method:req.method,url:req.url,type:String(req.headers['content-type']||''),cache:String(req.headers['cache-control']||'')});res.statusCode=req.method==='DELETE'?204:200;res.setHeader('ETag','"mock"');res.end()})});
 await new Promise<void>(resolve=>storage.listen(0,'127.0.0.1',resolve));
 const endpoint=`http://127.0.0.1:${(storage.address() as AddressInfo).port}`;
 const env=await setup({env:{...production,S3_ENDPOINT_URL:endpoint,S3_BUCKET:'eu-media',S3_REGION:'auto',S3_ACCESS_KEY_ID:'test-access',S3_SECRET_ACCESS_KEY:'test-secret',MEDIA_PUBLIC_URL:'https://media.example.com'}});
 try{
  const c=env.client();await c.post('/admin/login',{email:'admin@example.com',password:PASSWORD},headers);
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.from('tiny test image')]);
  const form=new FormData();form.append('file',new Blob([png],{type:'image/png'}),'../../hero.png');
  const upload=await c.request('post','/admin/media/upload',{body:form,headers});
  assert.equal(upload.status,201);
  assert.match(upload.json.url,/^https:\/\/media\.example\.com\/media\/[0-9a-f]{32}\.png$/);
  const put=seen.find(r=>r.method==='PUT')!;
  assert.ok(put,'the object was sent to the storage endpoint');
  assert.match(put.url!,/eu-media\/media\/[0-9a-f]{32}\.png|^\/media\/[0-9a-f]{32}\.png/);
  assert.equal(put.type,'image/png');assert.match(put.cache,/immutable/);
  assert.ok(!put.url!.includes('hero')&&!put.url!.includes('..'),'user file names never reach the object key');
  assert.equal((await rows(env.db,'media_assets')).length,1);
  assert.equal((await c.request('delete','/admin/media/'+upload.json.id,{headers})).status,200);
  assert.ok(seen.some(r=>r.method==='DELETE'&&/media\/[0-9a-f]{32}\.png/.test(r.url!)),'the object was deleted from storage');
  assert.equal((await rows(env.db,'media_assets')).length,0);
 }finally{await env.close();await new Promise(resolve=>storage.close(resolve))}
});
