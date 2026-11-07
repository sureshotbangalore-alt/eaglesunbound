import express,{type Request,type Response,type NextFunction} from 'express';
import {type Config} from './config';
import {type Database,type Row,one} from './database';
import {HttpError,fail,validate} from './validation';
import {sha256} from './crypto';
export type Reply={body:any;status?:number;headers?:Record<string,string>;plain?:boolean};
export type Context={req:Request;db:Database;user?:Row;config:Config;body:(name:string)=>Row};
export const response=(body:any,status=200,headers?:Record<string,string>):Reply=>({body,status,headers});
export const modules:Record<string,string>={programmes:'programmes',activities:'activities',clients:'clients',gallery:'gallery_albums',packages:'packages'};
export const publicPaths=['/','/the-bootcamp','/what-we-offer','/activities','/about','/founder','/food-and-dining','/contact','/book-now','/privacy-policy','/cookie-policy','/terms-and-conditions','/booking-policy'];
export const editablePages=new Set(['cookie-policy','about','the-bootcamp','privacy-policy','terms-and-conditions','booking-policy','founder','kids-experiences','schools-and-colleges','corporate','accommodation','food-and-dining']);
export function modelFor(module:string){return modules[module]||fail(404,'Module not found')}
export function admin(user?:Row){if(user?.role!=='admin')fail(403,'Administrator role required')}
export const pick=(row:Row,keys:string[])=>Object.fromEntries(keys.map(key=>[key,row[key]]));
export const omit=(row:Row,keys:string[])=>Object.fromEntries(Object.entries(row).filter(([key])=>!keys.includes(key)));
export function publicDetails(details:Row){return Object.fromEntries(Object.entries(details).filter(([key])=>!key.startsWith('reported_')&&!['confirmation_required','source_status','internal_notes','password','password_hash','token','secret','email','phone','mobile'].includes(key)&&!['private_','internal_','secret_'].some(prefix=>key.startsWith(prefix))&&(details.testimonial_approved===true||!key.startsWith('testimonial_'))))}
export function cookies(req:Request){const out:Record<string,string>={};for(const part of (req.headers.cookie||'').split(';')){const index=part.indexOf('=');if(index<0)continue;try{out[part.slice(0,index).trim()]=decodeURIComponent(part.slice(index+1))}catch{}}return out}
export function userOut(user:Row){return pick(user,['id','email','role','active','created_at'])}
export async function endSessions(db:Database,user:string){await db.execute('DELETE FROM admin_sessions WHERE user_id=?',[user])}
const staffRoutes=new Set(['GET /admin/me','POST /admin/logout','GET /admin/staff/bookings','GET /admin/staff/enquiries']);
export async function currentUser(db:Database,req:Request){
 const session=await one(db,'admin_sessions','token_hash=?',[sha256(cookies(req).eu_session||'')]);
 if(!session||Date.parse(session.expires_at.replace(/Z$/,'')+'Z')<Date.now())fail(401,'Please sign in');
 const user=await one(db,'admin_users','id=?',[session.user_id]);if(!user||!user.active)fail(401,'Please sign in');
 if(user.role==='staff_viewer'&&!staffRoutes.has(req.method+' '+req.path))fail(403,'Your account can only view bookings and enquiries.');return user;
}
export class Limiter {
 private limits=new Map<string,number[]>();
 use(req:Request,category:string,maximum:number,identity?:string){const key=category+':'+(identity??req.ip??req.socket.remoteAddress??'unknown');const cutoff=Date.now()-600000;const bucket=(this.limits.get(key)||[]).filter(x=>x>=cutoff);if(bucket.length>=maximum)fail(429,'Too many attempts. Please try again in ten minutes.');bucket.push(Date.now());this.limits.set(key,bucket);if(this.limits.size>10000)for(const [k,v]of this.limits)if(!v.length||v.at(-1)!<cutoff)this.limits.delete(k)}
 clear(){this.limits.clear()}
}
export function createRouter(db:Database,config:Config){
 const router=express.Router({caseSensitive:true,strict:false});const limiter=new Limiter();
 router.use((req,res,next)=>{
  res.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','X-Robots-Tag':'noindex, nofollow'});
  if(req.path.startsWith('/admin')||['/bookings','/enquiries'].includes(req.path))res.set('Cache-Control','no-store');
  if(config.production)res.set('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  const origin=req.get('origin');if(origin===config.origin){res.set({'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true'});res.vary('Origin')}
  if(req.method==='OPTIONS'){
   if(origin&&origin!==config.origin)return next(new HttpError(403,'Origin not allowed',true));
   res.set({'Access-Control-Allow-Methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Requested-With'});return res.sendStatus(204);
  }
  if(['POST','PUT','PATCH','DELETE'].includes(req.method)){
   const length=req.get('content-length');const maximum=req.path==='/admin/media/upload'?26*1024*1024:128*1024;
   if(length&&(!/^\d+$/.test(length)||Number(length)>maximum))return next(new HttpError(413,'Request too large',true));
   if(origin&&origin!==config.origin)return next(new HttpError(403,'Origin not allowed',true));
   if(req.path.startsWith('/admin')&&req.get('x-requested-with')!=='EaglesAdmin')return next(new HttpError(403,'Missing request protection',true));
  }
  next();
 });
 router.use(express.json({limit:128*1024,strict:false}));
 type Handler=(ctx:Context)=>Promise<Reply>;
 function route(method:'get'|'post'|'put'|'patch'|'delete',path:string,handler:Handler){router[method](path,async(req,res)=>{
  const result=await db.transaction(async tx=>{
   const user=path.startsWith('/admin')&&path!=='/admin/login'?await currentUser(tx,req):undefined;
   return handler({req,db:tx,user,config,body:name=>validate(name,req.body)});
  });
  if(result.headers)res.set(result.headers);res.status(result.status||200);if(result.plain)res.send(result.body);else res.json(result.body);
 });}
 return {router,route,limiter};
}
export function errors(error:any,_req:Request,res:Response,next:NextFunction){
 if(res.headersSent)return next(error);
 if(error instanceof HttpError)return error.plain?res.status(error.status).type('text').send(error.detail):res.status(error.status).json({detail:error.detail});
 if(error?.code==='ER_DUP_ENTRY'||error?.code?.startsWith('SQLITE_CONSTRAINT')||[1451,1452].includes(error?.errno))return res.status(409).json({detail:'This slug or record already exists, or is still in use.'});
 if(error?.type==='entity.too.large')return res.status(413).type('text').send('Request too large');
 if(error instanceof SyntaxError&&'body'in error)return res.status(422).json({detail:[{type:'json_invalid',loc:['body',0],msg:'JSON decode error',input:{},ctx:{error:'Invalid JSON'}}]});
 // Never log SQL statements, parameters, URLs, request bodies or error messages containing credentials.
 const code=typeof error?.code==='string'&&/^[A-Z0-9_]+$/.test(error.code)?error.code:'INTERNAL_ERROR';console.error(JSON.stringify({event:'api_error',code}));return res.status(500).json({detail:'Internal Server Error'});
}
