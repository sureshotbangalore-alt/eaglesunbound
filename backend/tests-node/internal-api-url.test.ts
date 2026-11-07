// Where the browser sends API calls, and the HTTP fallback address for server-side rendering.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {internalAPIURL,DEFAULT_SSR_API_URL} from '../../frontend/src/lib/internal-api-url';
import {browserAPIURL} from '../../frontend/src/lib/api';

test('browser requests use the relative /api path',()=>{
 const saved=process.env.NEXT_PUBLIC_API_URL;
 try{
  process.env.NEXT_PUBLIC_API_URL='/api';assert.equal(browserAPIURL('/public/home'),'/api/public/home');
  delete process.env.NEXT_PUBLIC_API_URL;assert.equal(browserAPIURL('/public/home'),'/api/public/home');
 }finally{if(saved===undefined)delete process.env.NEXT_PUBLIC_API_URL;else process.env.NEXT_PUBLIC_API_URL=saved}
});

test('SSR fallback: an absolute API_INTERNAL_URL is used as given, with /api kept',()=>{
 assert.equal(internalAPIURL({API_INTERNAL_URL:'https://eagles.example.com/api/'}),'https://eagles.example.com/api');
 assert.equal(internalAPIURL({API_INTERNAL_URL:'http://10.0.0.5:9000/api'}),'http://10.0.0.5:9000/api');
});

test('SSR fallback: a relative or missing API_INTERNAL_URL uses the public address, never /api or localhost',()=>{
 assert.equal(DEFAULT_SSR_API_URL,'https://eagles.ssbsureshot.in/api');
 const cases:NodeJS.ProcessEnv[]=[{API_INTERNAL_URL:'/api',PORT:'3000'},{API_INTERNAL_URL:'api/'},{API_INTERNAL_URL:''},{PORT:'41234'},{}];
 for(const env of cases){
  const url=internalAPIURL(env);
  assert.equal(url,'https://eagles.ssbsureshot.in/api',JSON.stringify(env));
  assert.ok(!/localhost|127\.0\.0\.1/.test(url),'never a local address');
 }
});
