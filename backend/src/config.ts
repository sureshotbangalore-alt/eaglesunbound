import {readFileSync} from 'node:fs';
import {URL} from 'node:url';
export type Config={production:boolean;port:number;origin:string;cookieSecure:boolean;sessionHours:number;mfaKey:string;trustProxy:false|string[];db:{host:string;port:number;database:string;user:string;password:string;ssl?:{rejectUnauthorized:true;ca?:string}};s3:{endpoint?:string;bucket:string;region:string;accessKeyId:string;secretAccessKey:string;publicUrl:string}};
export function configFrom(env:NodeJS.ProcessEnv):Config {
 const production=env.NODE_ENV==='production'||env.ENVIRONMENT==='production';
 const port=Number(env.PORT||(production?'':'3000'));
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be configured with a valid listening port');
 const origin=(env.FRONTEND_URL||env.PUBLIC_ORIGIN||'http://localhost:3000').replace(/\/$/,'');
 let url:URL;try{url=new URL(origin)}catch{throw Error('FRONTEND_URL or PUBLIC_ORIGIN must be a valid origin')}
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Frontend origin must not contain credentials or a path');
 const cookieSecure=['true','1','yes','on'].includes((env.COOKIE_SECURE||'false').toLowerCase());
 if(production&&(!cookieSecure||url.protocol!=='https:'))throw Error('Production requires HTTPS frontend origin and secure cookies');
 const db={host:env.DB_HOST||'',port:Number(env.DB_PORT||3306),database:env.DB_NAME||'',user:env.DB_USER||'',password:env.DB_PASSWORD||'',ssl:undefined as Config['db']['ssl']};
 if(env.DATABASE_URL){
  let parsed:URL;try{parsed=new URL(env.DATABASE_URL.replace(/^mysql\+pymysql:/,'mysql:'))}catch{throw Error('DATABASE_URL is invalid')}
  if(parsed.protocol!=='mysql:')throw Error('Node backend supports the existing MySQL/MariaDB database only');
  Object.assign(db,{host:parsed.hostname,port:Number(parsed.port||3306),database:decodeURIComponent(parsed.pathname.slice(1)),user:decodeURIComponent(parsed.username),password:decodeURIComponent(parsed.password)});
 }
 if(!db.host||!db.database||!db.user||!db.password)throw Error('Database configuration requires DB_HOST, DB_NAME, DB_USER and DB_PASSWORD, or DATABASE_URL');
 if(!Number.isInteger(db.port)||db.port<1||db.port>65535)throw Error('DB_PORT is invalid');
 if(!['false','0','no','off'].includes((env.DB_SSL||'true').toLowerCase()))db.ssl={rejectUnauthorized:true,...(env.DB_SSL_CA?{ca:readFileSync(env.DB_SSL_CA,'utf8')}:{})};
 const sessionHours=Number(env.SESSION_HOURS||8);if(!Number.isFinite(sessionHours)||sessionHours<=0||sessionHours>8760)throw Error('SESSION_HOURS is invalid');
 if(env.TRUST_PROXY==='true'||/^\d+$/.test(env.TRUST_PROXY||''))throw Error('TRUST_PROXY must list trusted proxy IPs/CIDRs, not a blanket boolean or hop count');
 return {production,port,origin,cookieSecure,sessionHours,mfaKey:env.MFA_ENCRYPTION_KEY||'',trustProxy:env.TRUST_PROXY?env.TRUST_PROXY.split(',').map(x=>x.trim()):false,db,s3:{endpoint:env.S3_ENDPOINT_URL||undefined,bucket:env.S3_BUCKET||'',region:env.S3_REGION||'auto',accessKeyId:env.S3_ACCESS_KEY_ID||'',secretAccessKey:env.S3_SECRET_ACCESS_KEY||'',publicUrl:(env.MEDIA_PUBLIC_URL||'').replace(/\/$/,'')}};
}
