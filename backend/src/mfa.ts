import {randomBytes} from 'node:crypto';
import {type createRouter,response,admin,endSessions} from './core';
import {one,insert,update,remove,audit} from './database';
import {fail} from './validation';
import {base32,encryptSecret,verifyFactor,passwordVerify,sha256} from './crypto';
export function registerMFA({route,limiter}:ReturnType<typeof createRouter>){
 route('get','/admin/security/mfa',async({db,user,config})=>{admin(user);const row=await one(db,'site_settings','`key`=?',['mfa:'+user!.id],true);return response({available:!!config.mfaKey,enabled:!!row?.value.enabled,recovery_codes_remaining:row?.value.recovery?.length||0})});
 for(const mode of ['setup','confirm','disable'])route('post','/admin/security/mfa/'+mode,async({db,user,req,body,config})=>{
  admin(user);const data=body('FactorInput');limiter.use(req,'mfa',8,user!.id);if(!await passwordVerify(user!.password_hash,data.password))fail(401,'Current password is incorrect.');
  const row=await one(db,'site_settings','`key`=?',['mfa:'+user!.id],true);
  if(mode==='setup'){
   if(row?.value.enabled)fail(409,'MFA is already enabled. Disable it before replacing the authenticator.');
   const secret=base32(randomBytes(20));const value={enabled:false,secret:encryptSecret(secret,config.mfaKey),pending_until:Date.now()/1000+600,last_counter:-1,recovery:[]};
   if(row)await update(db,'site_settings',row.id,{value});else await insert(db,'site_settings',{key:'mfa:'+user!.id,value});await audit(db,user!,'Started MFA setup');
   const params=new URLSearchParams({secret,issuer:'Eagles Unbound',algorithm:'SHA1',digits:'6',period:'30'});return response({secret,uri:'otpauth://totp/'+encodeURIComponent('Eagles Unbound:'+user!.email)+'?'+params.toString()});
  }
  if(mode==='confirm'){
   if(!row||row.value.enabled||(row.value.pending_until||0)<Date.now()/1000)fail(409,'Start a new MFA setup. Setup expires after ten minutes.');
   const updated=verifyFactor(row.value,data.code,config.mfaKey);if(!updated)fail(401,'Authenticator code is incorrect.');
   const codes=Array.from({length:10},()=>randomBytes(10).toString('hex'));await update(db,'site_settings',row.id,{value:{...updated,enabled:true,pending_until:0,recovery:codes.map(sha256)}});await endSessions(db,user!.id);await audit(db,user!,'Enabled MFA and revoked all sessions');return response({recovery_codes:codes,message:'MFA enabled. Save these codes offline and sign in again.'});
  }
  if(!row?.value.enabled||!verifyFactor(row.value,data.code,config.mfaKey))fail(401,'A valid authenticator or unused recovery code is required.');
  await remove(db,'site_settings',row.id);await endSessions(db,user!.id);await audit(db,user!,'Disabled MFA and revoked all sessions');return response({message:'MFA disabled. Sign in again.'});
 });
}
