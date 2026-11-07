// Settings Hostinger will use: environment variable names, defaults and the refusals that protect production.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {configFrom,ConfigError} from '../src/config';
import {resolveInternalApiURL} from '../src/env';

// The documented Hostinger values (placeholders for the database name, user and password).
const hostinger={NODE_ENV:'production',PORT:'3001',DB_HOST:'127.0.0.1',DB_PORT:'3306',DB_NAME:'db_name',DB_USER:'db_user',DB_PASSWORD:'db_password',NEXT_PUBLIC_API_URL:'/api',API_INTERNAL_URL:'/api',CORS_ORIGINS:'https://eagles.example.com',TRUST_PROXY:'1',ALLOW_DB_WRITES:'false'};

test('the documented Hostinger settings produce a safe production config',()=>{
 const c=configFrom(hostinger);
 assert.equal(c.production,true);assert.equal(c.port,3001);
 assert.deepEqual(c.origins,['https://eagles.example.com']);
 assert.equal(c.cookieSecure,true,'secure cookies are the production default, with no COOKIE_SECURE variable');
 assert.equal(c.trustProxy,1);
 assert.equal(c.writesAllowed,false,'ALLOW_DB_WRITES=false keeps the site read-only');
 assert.equal(c.db.ssl,undefined,'a same-server database (127.0.0.1) is reached without TLS');
 assert.equal(c.db.host,'127.0.0.1');assert.equal(c.db.port,3306);
});

test('writes are enabled only by the exact value true',()=>{
 for(const value of [undefined,'','false','0','yes','1','TRUEish','enabled'])assert.equal(configFrom({...hostinger,ALLOW_DB_WRITES:value}).writesAllowed,false,String(value));
 for(const value of ['true','TRUE',' true '])assert.equal(configFrom({...hostinger,ALLOW_DB_WRITES:value}).writesAllowed,true,value);
});

test('CORS_ORIGINS takes several origins, so a custom domain needs no code change',()=>{
 const c=configFrom({...hostinger,CORS_ORIGINS:'https://eagles.example.com, https://www.eagles-unbound.example/ ,https://eagles.example.com'});
 assert.deepEqual(c.origins,['https://eagles.example.com','https://www.eagles-unbound.example']);
 assert.equal(c.origin,'https://eagles.example.com');
 assert.throws(()=>configFrom({...hostinger,CORS_ORIGINS:'http://eagles.example.com'}),/https/);
 assert.throws(()=>configFrom({...hostinger,CORS_ORIGINS:'https://eagles.example.com/path'}),/plain origins/);
 assert.throws(()=>configFrom({...hostinger,CORS_ORIGINS:'https://user:pw@eagles.example.com'}),/plain origins/);
 assert.throws(()=>configFrom({...hostinger,CORS_ORIGINS:'not a url'}),/invalid origin/);
 const {CORS_ORIGINS:_unused,...without}=hostinger;
 assert.throws(()=>configFrom(without),/CORS_ORIGINS must list/);
});

test('production refuses insecure cookies, but local development stays easy',()=>{
 assert.throws(()=>configFrom({...hostinger,COOKIE_SECURE:'false'}),/secure cookies/);
 assert.equal(configFrom({...hostinger,COOKIE_SECURE:'true'}).cookieSecure,true);
 const dev=configFrom({PORT:'3000',DB_HOST:'127.0.0.1',DB_NAME:'d',DB_USER:'u',DB_PASSWORD:'p'});
 assert.equal(dev.production,false);assert.equal(dev.cookieSecure,false);assert.deepEqual(dev.origins,['http://localhost:3000']);
});

test('TLS: on for remote databases, off for the same server, always overridable',()=>{
 assert.ok(configFrom({...hostinger,DB_HOST:'db.example.net'}).db.ssl,'remote database is verified TLS by default');
 assert.equal(configFrom({...hostinger,DB_HOST:'db.example.net',DB_SSL:'false'}).db.ssl,undefined);
 assert.ok(configFrom({...hostinger,DB_SSL:'true'}).db.ssl,'explicit DB_SSL=true wins even on 127.0.0.1');
});

test('configuration errors name the variable and never include a value',()=>{
 const secret='Sup3r-Secret-Value-123';
 for(const bad of [{DB_HOST:''},{PORT:'abc'},{TRUST_PROXY:'true'},{CORS_ORIGINS:'ftp://x.example'},{DB_PORT:'99999'},{SESSION_HOURS:'-1'}]){
  try{configFrom({...hostinger,DB_PASSWORD:secret,...bad});assert.fail('should have thrown')}
  catch(error:any){assert.ok(error instanceof ConfigError,'ConfigError');assert.ok(!error.message.includes(secret));assert.ok(!error.message.includes('db_user'))}
 }
 assert.throws(()=>configFrom({...hostinger,DB_HOST:'',DB_PASSWORD:''}),/Set DB_HOST, DB_PASSWORD/);
});

test('API_INTERNAL_URL=/api is resolved against this same process',()=>{
 assert.equal(resolveInternalApiURL('/api',3001),'http://127.0.0.1:3001/api');
 assert.equal(resolveInternalApiURL(undefined,3001),'http://127.0.0.1:3001/api');
 assert.equal(resolveInternalApiURL('api/',3001),'http://127.0.0.1:3001/api');
 assert.equal(resolveInternalApiURL('http://127.0.0.1:9000/api/',3001),'http://127.0.0.1:9000/api');
});
