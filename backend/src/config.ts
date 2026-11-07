import {readFileSync} from 'node:fs';
import {URL} from 'node:url';
import {isLoopbackHost} from './env';

/** A problem with environment configuration. The message names variables, never values, so it is safe to log. */
export class ConfigError extends Error{}

export type Config={
 production:boolean;port:number;
 /** Every origin allowed to call the API with cookies (CORS_ORIGINS); the first is the primary site origin. */
 origins:string[];origin:string;
 cookieSecure:boolean;sessionHours:number;mfaKey:string;
 /** Express "trust proxy": false, a number of reverse proxies in front of the app, or a list of proxy IPs/CIDRs. */
 trustProxy:false|number|string[];
 /** False unless ALLOW_DB_WRITES=true. While false, every database write is refused. */
 writesAllowed:boolean;
 db:{host:string;port:number;database:string;user:string;password:string;ssl?:{rejectUnauthorized:true;ca?:string}};
 s3:{endpoint?:string;bucket:string;region:string;accessKeyId:string;secretAccessKey:string;publicUrl:string};
};

const truthy=(value:string|undefined)=>['true','1','yes','on'].includes((value||'').trim().toLowerCase());
const falsy=(value:string|undefined)=>['false','0','no','off'].includes((value||'').trim().toLowerCase());

function parseOrigins(env:NodeJS.ProcessEnv,production:boolean){
 const raw=env.CORS_ORIGINS||env.FRONTEND_URL||env.PUBLIC_ORIGIN||(production?'':'http://localhost:3000');
 const origins=raw.split(',').map(x=>x.trim().replace(/\/$/,'')).filter(Boolean);
 if(!origins.length)throw new ConfigError('CORS_ORIGINS must list the public site origin(s), for example https://www.example.com');
 for(const origin of origins){
  let url:URL;try{url=new URL(origin)}catch{throw new ConfigError('CORS_ORIGINS contains an invalid origin')}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new ConfigError('CORS_ORIGINS entries must be plain origins (scheme and host only, no path or credentials)');
  if(production&&url.protocol!=='https:')throw new ConfigError('In production every CORS_ORIGINS entry must use https');
 }
 return [...new Set(origins)];
}

function parseTrustProxy(raw:string|undefined):false|number|string[]{
 const value=(raw||'').trim();
 if(!value)return false;
 if(/^(true|yes|on|\*)$/i.test(value))throw new ConfigError('TRUST_PROXY=true would trust every forwarding header a visitor can send. Use the number of reverse proxies in front of the app (for Hostinger: 1) or a list of proxy IPs/CIDRs.');
 if(/^\d+$/.test(value)){const hops=Number(value);if(hops>5)throw new ConfigError('TRUST_PROXY hop count must be between 0 and 5');return hops>0?hops:false}
 return value.split(',').map(x=>x.trim()).filter(Boolean);
}

export function configFrom(env:NodeJS.ProcessEnv):Config {
 const production=env.NODE_ENV==='production'||env.ENVIRONMENT==='production';
 const port=Number(env.PORT||(production?'':'3000'));
 if(!Number.isInteger(port)||port<1||port>65535)throw new ConfigError('PORT must be set to a valid listening port (Hostinger provides it)');
 const origins=parseOrigins(env,production);
 // Secure cookies are the default in production; turning them off there is refused.
 const cookieSecure=env.COOKIE_SECURE===undefined||env.COOKIE_SECURE===''?production:truthy(env.COOKIE_SECURE);
 if(production&&!cookieSecure)throw new ConfigError('Production requires secure cookies; remove COOKIE_SECURE=false');
 const db={host:env.DB_HOST||'',port:Number(env.DB_PORT||3306),database:env.DB_NAME||'',user:env.DB_USER||'',password:env.DB_PASSWORD||'',ssl:undefined as Config['db']['ssl']};
 if(env.DATABASE_URL){
  let parsed:URL;try{parsed=new URL(env.DATABASE_URL.replace(/^mysql\+pymysql:/,'mysql:'))}catch{throw new ConfigError('DATABASE_URL is invalid')}
  if(parsed.protocol!=='mysql:')throw new ConfigError('Node backend supports the existing MySQL/MariaDB database only');
  Object.assign(db,{host:parsed.hostname,port:Number(parsed.port||3306),database:decodeURIComponent(parsed.pathname.slice(1)),user:decodeURIComponent(parsed.username),password:decodeURIComponent(parsed.password)});
 }
 const missing=[['DB_HOST',db.host],['DB_NAME',db.database],['DB_USER',db.user],['DB_PASSWORD',db.password]].filter(([,value])=>!value).map(([name])=>name);
 if(missing.length)throw new ConfigError(`Database configuration is incomplete. Set ${missing.join(', ')} (or DATABASE_URL).`);
 if(!Number.isInteger(db.port)||db.port<1||db.port>65535)throw new ConfigError('DB_PORT is invalid');
 // A database on the same machine (DB_HOST=127.0.0.1, as on Hostinger) is not offered over TLS; remote databases are verified TLS by default.
 const wantsTLS=env.DB_SSL?!falsy(env.DB_SSL):!isLoopbackHost(db.host);
 if(wantsTLS)db.ssl={rejectUnauthorized:true,...(env.DB_SSL_CA?{ca:readFileSync(env.DB_SSL_CA,'utf8')}:{})};
 const sessionHours=Number(env.SESSION_HOURS||8);if(!Number.isFinite(sessionHours)||sessionHours<=0||sessionHours>8760)throw new ConfigError('SESSION_HOURS is invalid');
 return {production,port,origins,origin:origins[0],cookieSecure,sessionHours,mfaKey:env.MFA_ENCRYPTION_KEY||'',trustProxy:parseTrustProxy(env.TRUST_PROXY),writesAllowed:(env.ALLOW_DB_WRITES||'').trim().toLowerCase()==='true',db,s3:{endpoint:env.S3_ENDPOINT_URL||undefined,bucket:env.S3_BUCKET||'',region:env.S3_REGION||'auto',accessKeyId:env.S3_ACCESS_KEY_ID||'',secretAccessKey:env.S3_SECRET_ACCESS_KEY||'',publicUrl:(env.MEDIA_PUBLIC_URL||'').replace(/\/$/,'')}};
}
