// Where server-side rendering sends its API calls, and where the browser sends them.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {internalAPIURL} from '../../frontend/src/lib/internal-api-url';
import {browserAPIURL} from '../../frontend/src/lib/api';

test('browser requests use the relative /api path',()=>{
 const saved=process.env.NEXT_PUBLIC_API_URL;
 try{
  process.env.NEXT_PUBLIC_API_URL='/api';assert.equal(browserAPIURL('/public/home'),'/api/public/home');
  delete process.env.NEXT_PUBLIC_API_URL;assert.equal(browserAPIURL('/public/home'),'/api/public/home');
 }finally{if(saved===undefined)delete process.env.NEXT_PUBLIC_API_URL;else process.env.NEXT_PUBLIC_API_URL=saved}
});

test('SSR with API_INTERNAL_URL=/api calls this process at 127.0.0.1 and PORT, keeping /api',()=>{
 assert.equal(internalAPIURL({API_INTERNAL_URL:'/api',PORT:'41234'}),'http://127.0.0.1:41234/api');
 assert.equal(internalAPIURL({API_INTERNAL_URL:'api/',PORT:'41234'}),'http://127.0.0.1:41234/api');
 assert.equal(internalAPIURL({API_INTERNAL_URL:' /api/ ',PORT:' 41234 '}),'http://127.0.0.1:41234/api');
});

test('SSR with an absolute API_INTERNAL_URL uses it as given',()=>{
 assert.equal(internalAPIURL({API_INTERNAL_URL:'https://eagles.example.com/api/',PORT:'41234'}),'https://eagles.example.com/api');
 assert.equal(internalAPIURL({API_INTERNAL_URL:'http://10.0.0.5:9000/api',PORT:'41234'}),'http://10.0.0.5:9000/api');
});

test('SSR without API_INTERNAL_URL falls back to 127.0.0.1, PORT and /api',()=>{
 assert.equal(internalAPIURL({PORT:'5123'}),'http://127.0.0.1:5123/api');
 assert.equal(internalAPIURL({API_INTERNAL_URL:'',PORT:'5123'}),'http://127.0.0.1:5123/api');
 assert.equal(internalAPIURL({}),'http://127.0.0.1:3000/api','3000 only when no PORT is provided');
});

test('the port is never fixed: each PORT value is used, read on every call',()=>{
 for(const port of ['3001','8080','49152','65535'])assert.equal(internalAPIURL({API_INTERNAL_URL:'/api',NODE_ENV:'production',PORT:port}),`http://127.0.0.1:${port}/api`);
 const saved={PORT:process.env.PORT,API:process.env.API_INTERNAL_URL};
 try{
  process.env.API_INTERNAL_URL='/api';
  process.env.PORT='40001';assert.equal(internalAPIURL(),'http://127.0.0.1:40001/api');
  process.env.PORT='40002';assert.equal(internalAPIURL(),'http://127.0.0.1:40002/api');
 }finally{
  for(const [k,v] of [['PORT',saved.PORT],['API_INTERNAL_URL',saved.API]] as const){if(v===undefined)delete process.env[k];else process.env[k]=v}
 }
 const source=readFileSync(resolve(__dirname,'../../frontend/src/lib/api.ts'),'utf8');
 assert.ok(!/127\.0\.0\.1:\d|localhost:\d/.test(source),'the SSR client has no fixed host:port');
});
