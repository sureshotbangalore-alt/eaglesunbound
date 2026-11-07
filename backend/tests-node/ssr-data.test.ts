// Server-side rendering reads public data directly in the same process: no HTTP call to the site itself.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {serverAPI} from '../../frontend/src/lib/api';
import {SERVER_DATA_KEY} from '../src/public-data';
import {setup} from './helpers';

const PATHS=['/public/settings','/public/home','/public/programmes','/public/activities','/public/clients','/public/seo','/public/pages','/public/faqs','/public/page-updates'];
const slot=globalThis as Record<symbol,unknown>;

/** Replaces fetch while `work` runs, recording every URL requested. */
async function withFetch<T>(fake:(url:string)=>Promise<Response>,work:(urls:string[])=>Promise<T>){
 const original=globalThis.fetch;const urls:string[]=[];
 globalThis.fetch=(async(input:any)=>{const url=String(input?.url??input);urls.push(url);return fake(url)}) as typeof fetch;
 try{return await work(urls)}finally{globalThis.fetch=original}
}
function captureErrors(){const lines:string[]=[];const original=console.error;console.error=(...a:unknown[])=>{lines.push(a.map(String).join(' '))};return {lines,restore:()=>{console.error=original}}}

test('public pages load their data without any HTTP request, with the same JSON the API returns',async()=>{
 const env=await setup({env:{ALLOW_DB_WRITES:'false'}});
 slot[SERVER_DATA_KEY]=env.readPublic;
 try{
  const direct=await withFetch(async()=>{throw Error('SSR must not make HTTP requests')},async urls=>{
   const out:Record<string,unknown>={};for(const path of PATHS)out[path]=await serverAPI(path);
   assert.deepEqual(urls,[],'no HTTP request was made');return out;
  });
  const client=env.client();
  for(const path of PATHS){const r=await client.get(path);assert.equal(r.status,200,path);assert.deepEqual(direct[path],r.json,`${path} matches the API response`)}
  assert.equal((direct['/public/programmes'] as unknown[]).length,1,'only published programmes');
 }finally{delete slot[SERVER_DATA_KEY];await env.close()}
});

test('a failing direct read logs only the path and a safe code, and shows the generic message',async()=>{
 const logs=captureErrors();
 slot[SERVER_DATA_KEY]=async()=>{throw Object.assign(Error("Access denied for user 'secret_user'@'db.example' password=Hunter2#x"),{code:'ER_ACCESS_DENIED_ERROR'})};
 try{
  await assert.rejects(serverAPI('/public/home'),/temporarily unavailable/);
  assert.deepEqual(logs.lines.map(l=>JSON.parse(l)),[{event:'ssr_data_failed',path:'/public/home',code:'ER_ACCESS_DENIED_ERROR'}]);
  assert.ok(!/secret_user|db\.example|Hunter2|Access denied/.test(logs.lines.join()),'no secrets in the log');
  slot[SERVER_DATA_KEY]=async()=>{throw Object.assign(Error('x'),{status:404})};
  await assert.rejects(serverAPI('/public/unknown'));
  assert.equal(JSON.parse(logs.lines[1]).code,'HTTP_404');
 }finally{delete slot[SERVER_DATA_KEY];logs.restore()}
});

test('without the direct reader, SSR uses an absolute URL: never relative /api, localhost or 127.0.0.1',async()=>{
 const saved=process.env.API_INTERNAL_URL;
 const cases:[string|undefined,string][]=[
  ['/api','https://eagles.ssbsureshot.in/api/public/home'],
  [undefined,'https://eagles.ssbsureshot.in/api/public/home'],
  ['https://eagles.example.com/api','https://eagles.example.com/api/public/home'],
 ];
 try{
  for(const [value,expected] of cases){
   if(value===undefined)delete process.env.API_INTERNAL_URL;else process.env.API_INTERNAL_URL=value;
   await withFetch(async()=>new Response('{"ok":true}',{status:200,headers:{'content-type':'application/json'}}),async urls=>{
    assert.deepEqual(await serverAPI('/public/home'),{ok:true});
    assert.deepEqual(urls,[expected]);
    assert.ok(!/localhost|127\.0\.0\.1/.test(urls[0])&&!urls[0].startsWith('/'));
   });
  }
 }finally{if(saved===undefined)delete process.env.API_INTERNAL_URL;else process.env.API_INTERNAL_URL=saved}
});

test('GET /health is 200, and with ALLOW_DB_WRITES=false writes are refused while SSR reads still work',async()=>{
 const env=await setup({env:{ALLOW_DB_WRITES:'false'}});
 try{
  const health=await env.client().get('/health');assert.equal(health.status,200);assert.deepEqual(health.json,{status:'ok'});
  const before=JSON.stringify(await env.readPublic('/public/settings'));
  const write=await env.client().post('/enquiries',{name:'x'});assert.equal(write.status,503,'writes are disabled');
  assert.equal(JSON.stringify(await env.readPublic('/public/settings')),before);
 }finally{await env.close()}
});

test('the SSR client and server never point at a guessed local port',()=>{
 const root=resolve(__dirname,'../..');
 for(const file of ['frontend/src/lib/api.ts','frontend/src/lib/internal-api-url.ts']){
  const source=readFileSync(resolve(root,file),'utf8');
  assert.ok(!/localhost:\d|127\.0\.0\.1/.test(source),`${file} has no local address`);
 }
 const server=readFileSync(resolve(root,'backend/src/server.ts'),'utf8');
 assert.match(server,/const HOST='0\.0\.0\.0'/);assert.match(server,/server\.listen\(config\.port,HOST/);
 assert.ok(!/API_INTERNAL_URL\s*=/.test(server),'the server no longer rewrites API_INTERNAL_URL');
});
