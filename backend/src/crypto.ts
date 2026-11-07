import {createCipheriv,createDecipheriv,createHmac,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import * as argon2 from 'argon2';
import {fail} from './validation';
export const sha256=(value:string)=>createHash('sha256').update(value).digest('hex');
export const passwordHash=(password:string)=>argon2.hash(password,{type:argon2.argon2id,memoryCost:65536,timeCost:3,parallelism:4});
export async function passwordVerify(hash:string,password:string){try{return await argon2.verify(hash,password)}catch{return false}}
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(data:Buffer){let bits=0,n=0,out='';for(const x of data){n=(n<<8)|x;bits+=8;while(bits>=5){out+=alphabet[(n>>>(bits-5))&31];bits-=5}}if(bits)out+=alphabet[(n<<(5-bits))&31];return out}
function unbase32(value:string){let bits=0,n=0;const out:number[]=[];for(const x of value.replace(/=+$/,'')){const v=alphabet.indexOf(x.toUpperCase());if(v<0)throw Error('Invalid base32');n=(n<<5)|v;bits+=5;if(bits>=8){out.push((n>>>(bits-8))&255);bits-=8}}return Buffer.from(out)}
export function totp(secret:string,counter:number){const bytes=Buffer.alloc(8);bytes.writeBigUInt64BE(BigInt(counter));const hash=createHmac('sha1',unbase32(secret)).update(bytes).digest();const offset=hash[19]&15;return String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0')}
function keyBytes(key:string){const bytes=Buffer.from(key,'base64url');if(!/^[A-Za-z0-9_=-]+$/.test(key)||bytes.length!==32)fail(503,'Administrator MFA requires a valid server encryption key.');return bytes}
// Python cryptography.Fernet wire format: version + timestamp + IV + AES-CBC + HMAC-SHA256.
export function encryptSecret(secret:string,key:string){const bytes=keyBytes(key);const header=Buffer.alloc(9);header[0]=0x80;header.writeBigUInt64BE(BigInt(Math.floor(Date.now()/1000)),1);const iv=randomBytes(16);const cipher=createCipheriv('aes-128-cbc',bytes.subarray(16),iv);const body=Buffer.concat([header,iv,cipher.update(secret,'utf8'),cipher.final()]);return Buffer.concat([body,createHmac('sha256',bytes.subarray(0,16)).update(body).digest()]).toString('base64').replace(/\+/g,'-').replace(/\//g,'_')}
export function decryptSecret(token:string,key:string){const bytes=keyBytes(key);try{const raw=Buffer.from(token,'base64url');if(raw.length<73||raw[0]!==0x80)throw Error();const body=raw.subarray(0,-32);const expected=createHmac('sha256',bytes.subarray(0,16)).update(body).digest();if(!timingSafeEqual(expected,raw.subarray(-32)))throw Error();const cipher=createDecipheriv('aes-128-cbc',bytes.subarray(16),raw.subarray(9,25));return Buffer.concat([cipher.update(raw.subarray(25,-32)),cipher.final()]).toString('utf8')}catch{fail(503,'MFA unavailable. Contact the server administrator; password-only fallback is disabled.')}}
export function verifyFactor(value:Record<string,any>,code:string,key:string){
 if(!code)return null;const hash=sha256(code.trim().toLowerCase());const recovery:string[]=value.recovery||[];
 if(recovery.includes(hash))return {...value,recovery:recovery.filter(x=>x!==hash)};
 if(!/^\d{6}$/.test(code))return null;
 const secret=decryptSecret(value.secret,key);const counter=Math.floor(Date.now()/30000);
 for(const c of [counter-1,counter,counter+1])if(c>(value.last_counter??-1)&&timingSafeEqual(Buffer.from(code),Buffer.from(totp(secret,c))))return {...value,last_counter:c};return null;
}
