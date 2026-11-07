import {randomBytes} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {rows,one,insert,update,remove,audit,tables,type Row} from './database';
import {type createRouter,response,admin,pick,omit,cookies,userOut,endSessions} from './core';
import {requestFilter} from './content';
import {fail} from './validation';
import {sha256,passwordHash,passwordVerify,verifyFactor} from './crypto';
type API=ReturnType<typeof createRouter>;
export async function registerRequests({route,limiter}:API){
 const dummy=await passwordHash(randomBytes(32).toString('base64url'));
 const today=()=>new Date().toISOString().slice(0,10);
 const bookingMessage='Request received. Our team will contact you. Your visit is not confirmed yet.';
 route('post','/bookings',async({db,req,body})=>{
  const data=body('BookingInput');limiter.use(req,'submission',10);if(data.website)fail(400,'Unable to submit this request');
  if(data.preferred_date<today())fail(422,'Please select a future date');
  const programme=await one(db,'programmes','id=?',[data.programme_id]);if(!programme?.published)fail(422,'Please select an available programme');
  if(await one(db,'blocked_dates','day=?',[data.preferred_date]))fail(409,'This date is unavailable. Please choose another date.');
  const days=await rows(db,'availability','programme_id=?',[programme.id]);const weekday=(new Date(data.preferred_date+'T00:00:00Z').getUTCDay()+6)%7;
  if(days.length&&!days.some(day=>day.weekday===weekday&&day.enabled))fail(409,'This programme is not available on that day.');
  if(data.vegetarian_meals+data.non_vegetarian_meals>data.participants)fail(422,'Meal counts must not exceed the participant count');
  const extras=['vegetarian_meals','non_vegetarian_meals','special_requirements'];const fields=omit(data,['website',...extras]);const details=pick(data,extras);
  const cutoff=new Date(Date.now()-600000).toISOString().replace('T',' ').replace('Z','');
  const recent=await rows(db,'bookings','email=? AND status=? AND created_at>=?',[data.email,'Pending',cutoff],'ORDER BY created_at DESC LIMIT 10');
  const existing=recent.find(row=>Object.entries(fields).every(([key,value])=>row[key]===value)&&isDeepStrictEqual(row.details,details));
  if(existing)return response({reference:existing.reference,status:existing.status,message:bookingMessage},201);
  const reference='EU-'+randomBytes(5).toString('hex').toUpperCase();const booking=await insert(db,'bookings',{reference,details,...fields});await insert(db,'booking_status_history',{booking_id:booking.id,status:'Pending'});return response({reference,status:'Pending',message:bookingMessage},201);
 });
 route('post','/enquiries',async({db,req,body})=>{
  const data=body('EnquiryInput');limiter.use(req,'submission',10);if(data.website)fail(400,'Unable to submit this request');
  if(data.participants&&data.vegetarian_meals+data.non_vegetarian_meals>data.participants)fail(422,'Meal counts must not exceed the participant count');
  const extras=['organisation','visitor_category','programme','participants','preferred_date','vegetarian_meals','non_vegetarian_meals','special_requirements'];const fields=omit(data,['website',...extras]);const details=pick(data,extras);
  const cutoff=new Date(Date.now()-600000).toISOString().replace('T',' ').replace('Z','');const recent=await rows(db,'enquiries','email=? AND created_at>=?',[data.email,cutoff],'ORDER BY created_at DESC LIMIT 10');
  if(!recent.some(row=>Object.entries(fields).every(([k,v])=>row[k]===v)&&isDeepStrictEqual(row.details,details)))await insert(db,'enquiries',{details,...fields});return response({message:'Thank you. Our team will be in touch.'},201);
 });
 route('post','/admin/login',async({db,req,body,config})=>{
  const data=body('Login');limiter.use(req,'login',8);limiter.use(req,'login-account',12,sha256(data.email.toLowerCase()));
  const user=await one(db,'admin_users','email=?',[data.email.toLowerCase()]);const valid=await passwordVerify(user?.password_hash||dummy,data.password);if(!user||!valid||!user.active)fail(401,'Invalid email or password');
  const mfa=await one(db,'site_settings','`key`=?',['mfa:'+user.id],true);
  if(mfa?.value.enabled){const updated=verifyFactor(mfa.value,data.code,config.mfaKey);if(!updated)fail(401,'Enter a valid authenticator or unused recovery code.');await update(db,'site_settings',mfa.id,{value:updated})}
  const prior=await one(db,'admin_sessions','token_hash=?',[sha256(cookies(req).eu_session||'')]);if(prior)await remove(db,'admin_sessions',prior.id);
  const token=randomBytes(48).toString('base64url');await insert(db,'admin_sessions',{token_hash:sha256(token),user_id:user.id,expires_at:new Date(Date.now()+config.sessionHours*3600000).toISOString().replace('T',' ').replace('Z','')});await audit(db,user,'Signed in');
  return response(pick(user,['email','role']),200,{'Set-Cookie':`eu_session=${token}; HttpOnly; Max-Age=${config.sessionHours*3600}; Path=/; SameSite=lax${config.cookieSecure?'; Secure':''}`});
 });
 route('get','/admin/me',async({user})=>response(pick(user!,['email','role'])));
 route('post','/admin/logout',async({db,req,user})=>{const session=await one(db,'admin_sessions','token_hash=?',[sha256(cookies(req).eu_session||'')]);if(session)await remove(db,'admin_sessions',session.id);await audit(db,user!,'Signed out');return response({ok:true},200,{'Set-Cookie':'eu_session=""; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/; SameSite=lax'})});
 route('get','/admin/overview',async({db,user})=>{admin(user);const count=async(table:string,where='',values:unknown[]=[])=>Number((await db.query(`SELECT COUNT(*) AS c FROM \`${table}\`${where?' WHERE '+where:''}`,values))[0].c);return response({'Total bookings':await count('bookings'),'Pending bookings':await count('bookings','status=?',['Pending']),'Upcoming bookings':await count('bookings','preferred_date>=? AND status=?',[today(),'Confirmed']),'Total enquiries':await count('enquiries'),'Unresolved enquiries':await count('enquiries','status<>?',['Resolved']),'Published programmes':await count('programmes','published=?',[1]),'Published activities':await count('activities','published=?',[1])})});
 route('patch','/admin/bookings/:record_id',async({db,user,req,body})=>{admin(user);const data=body('BookingUpdate');const id=String(req.params.record_id);const row=await one(db,'bookings','id=?',[id]);if(!row)fail(404,'Booking not found');if(row.status!==data.status)await insert(db,'booking_status_history',{booking_id:id,status:data.status,actor_id:user!.id});const saved=await update(db,'bookings',id,data);await audit(db,user!,'Updated booking '+row.reference);return response(saved)});
 route('patch','/admin/enquiries/:record_id',async({db,user,req,body})=>{admin(user);const data=body('EnquiryUpdate');const id=String(req.params.record_id);if(!await one(db,'enquiries','id=?',[id]))fail(404,'Enquiry not found');const saved=await update(db,'enquiries',id,data);await audit(db,user!,'Updated enquiry '+id);return response(saved)});
 for(const module of ['bookings','enquiries'])route('get','/admin/staff/'+module,async({db,req})=>{
  const [where,args]=requestFilter(req.query,true);const all=await rows(db,module,where,args,'ORDER BY created_at DESC LIMIT 500');const programmes=new Map((await rows(db,'programmes')).map(x=>[x.id,x.name]));
  return response(all.map(row=>({...pick(row,module==='bookings'?['id','reference','name','email','mobile','preferred_date','preferred_time','participants','group_type','organisation','message','status','created_at']:['id','name','email','phone','category','message','status','created_at']),...(module==='bookings'?{programme:programmes.get(row.programme_id)||''}:{}),details:Object.fromEntries(Object.entries(row.details||{}).filter(([,v])=>['string','number','boolean'].includes(typeof v)&&v!==''&&v!==0&&v!==false))})));
 });
 route('get','/admin/export/:module',async({db,user,req})=>{admin(user);const module=String(req.params.module);if(!['bookings','enquiries'].includes(module))fail(404);const all=await rows(db,module,'',[],'ORDER BY created_at DESC');const fields=tables[module].columns.map(c=>c.name);const csv=[fields,...all.map(row=>fields.map(key=>{const column=tables[module].columns.find(c=>c.name===key)!;let value=column.type==='DATETIME'?String(row[key]).replace('T',' '):pythonString(row[key]);if(/^[=+@-]/.test(value.trimStart()))value="'"+value;return value}))].map(values=>values.map(csvCell).join(',')).join('\r\n')+'\r\n';await audit(db,user!,'Exported '+module);return {body:csv,plain:true,status:200,headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${module}.csv"`}}});
 route('get','/admin/users',async({db,user})=>{admin(user);return response((await rows(db,'admin_users','',[],'ORDER BY created_at')).map(userOut))});
 route('post','/admin/users',async({db,user,body})=>{admin(user);const data=body('UserCreate');const email=data.email.toLowerCase();if(await one(db,'admin_users','email=?',[email]))fail(409,'An account with this email already exists.');const row=await insert(db,'admin_users',{email,password_hash:await passwordHash(data.password),role:data.role,active:true});await audit(db,user!,`Created user ${email} (${data.role})`);return response(userOut(row),201)});
 route('patch','/admin/users/:user_id',async({db,user,req,body})=>{
  admin(user);const data=body('UserUpdate');const id=String(req.params.user_id);const row=await one(db,'admin_users','id=?',[id]);if(!row)fail(404,'User not found');
  if(id===user!.id&&(data.active===false||(data.role&&data.role!=='admin')))fail(400,'You cannot disable or demote your own account.');
  const changes:string[]=[];const updates:Row={};if(data.role&&data.role!==row.role){updates.role=data.role;changes.push('role '+data.role)}if(data.active!=null&&data.active!==row.active){updates.active=data.active;changes.push(data.active?'enabled':'disabled')}if(data.password){updates.password_hash=await passwordHash(data.password);changes.push('password reset')}
  if(changes.length){await update(db,'admin_users',id,updates);await endSessions(db,id);await audit(db,user!,`Updated user ${row.email}: `+changes.join(', '))}return response(userOut({...row,...updates}));
 });
}
function pythonString(value:any,nested=false):string{if(value===null)return 'None';if(value===true)return 'True';if(value===false)return 'False';if(typeof value==='string')return nested?"'"+value.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,'\\r')+"'":value;if(Array.isArray(value))return '['+value.map(v=>pythonString(v,true)).join(', ')+']';if(typeof value==='object')return '{'+Object.entries(value).map(([k,v])=>pythonString(k,true)+': '+pythonString(v,true)).join(', ')+'}';return String(value)}
function csvCell(value:string){return /[",\r\n]/.test(value)?'"'+value.replace(/"/g,'""')+'"':value}
