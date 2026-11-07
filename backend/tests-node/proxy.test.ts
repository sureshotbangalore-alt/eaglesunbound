// Behind Hostinger's reverse proxy every request arrives from the proxy's address. TRUST_PROXY=1 makes the app use the
// visitor address the proxy forwards, so rate limits apply per visitor instead of to everyone at once.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup,HEADERS} from './helpers';

const attempt=(c:ReturnType<Awaited<ReturnType<typeof setup>>['client']>,visitor:string,n:number)=>
 c.post('/admin/login',{email:`nobody${n}@example.com`,password:'wrong-password'},{...HEADERS,'X-Forwarded-For':visitor});

test('TRUST_PROXY=1: one visitor is rate limited, other visitors are not',async()=>{
 const env=await setup({env:{TRUST_PROXY:'1'}});
 try{
  const c=env.client();
  for(let n=0;n<8;n++)assert.equal((await attempt(c,'203.0.113.10',n)).status,401);
  assert.equal((await attempt(c,'203.0.113.10',8)).status,429,'the noisy visitor is blocked');
  assert.equal((await attempt(c,'198.51.100.77',9)).status,401,'a different visitor is unaffected');
 }finally{await env.close()}
});

test('without TRUST_PROXY a forwarded address is ignored, so it cannot be used to dodge the limit',async()=>{
 const env=await setup();
 try{
  const c=env.client();
  for(let n=0;n<8;n++)assert.equal((await attempt(c,`203.0.113.${n+1}`,n)).status,401);
  assert.equal((await attempt(c,'198.51.100.200',8)).status,429,'a new forged address does not reset the limit');
 }finally{await env.close()}
});
