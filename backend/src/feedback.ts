// Visitor feedback & testimonials.
// - POST /feedback (public): validated, rate-limited, honeypot, duplicate-safe; always stored as Pending.
// - GET /public/testimonials: only Approved feedback whose author allowed publishing; never email or notes.
// - /admin/feedback (Super Admin only): list, approve / reject / back to pending, set the public display name, delete.
// Staff Viewer accounts have no access, exactly as before. Until the visitor_feedback table exists (run
// backend/schema/migrations/2026-11-07-visitor-feedback.sql), the public list is empty and submissions get a clear 503.
import {rows,one,insert,update,remove,audit,now,type Database,type Row} from './database';
import {type createRouter,response,admin,pick} from './core';
import {fail} from './validation';
type API=ReturnType<typeof createRouter>;

const missingTable=(error:any)=>error?.code==='ER_NO_SUCH_TABLE'||/no such table/i.test(String(error?.message||''));

/** "Priya Sharma" -> "Priya S." unless an admin set a display name. */
export function publicName(row:Row){
 if(row.display_name)return String(row.display_name);
 const parts=String(row.name||'').trim().split(/\s+/).filter(Boolean);
 return parts.length>1?`${parts[0]} ${parts[parts.length-1][0].toUpperCase()}.`:parts[0]||'Visitor';
}

export async function approvedTestimonials(db:Database){
 try{
  const list=await rows(db,'visitor_feedback','status=? AND publish_consent=?',['Approved',1],'ORDER BY approved_at DESC, created_at DESC LIMIT 60');
  return list.map(r=>({id:r.id,name:publicName(r),visit_type:r.visit_type,organisation:r.organisation,rating:r.rating,message:r.message,date:String(r.approved_at||r.created_at).slice(0,10)}));
 }catch(error){if(missingTable(error))return [];throw error}
}

export function registerFeedback({route,limiter}:API){
 route('post','/feedback',async({db,req,body})=>{
  const data=body('FeedbackInput');limiter.use(req,'submission',10);if(data.website)fail(400,'Unable to submit this feedback');
  try{
   const cutoff=new Date(Date.now()-600000).toISOString().replace('T',' ').replace('Z','');
   const recent=await rows(db,'visitor_feedback','email=? AND created_at>=?',[data.email.toLowerCase(),cutoff],'ORDER BY created_at DESC LIMIT 5');
   if(!recent.some(r=>r.message===data.message))
    await insert(db,'visitor_feedback',{name:data.name.trim(),email:data.email.toLowerCase(),visit_type:data.visit_type,organisation:data.organisation.trim(),rating:data.rating,message:data.message.trim(),consent:true,publish_consent:!!data.publish_consent});
  }catch(error){if(missingTable(error))fail(503,'Feedback is not available yet. Please try again later.');throw error}
  return response({message:'Thank you for your feedback. Our team reviews every message before anything is published.'},201);
 });
 route('get','/admin/feedback',async({db,user})=>{
  admin(user);
  try{return response(await rows(db,'visitor_feedback','',[],'ORDER BY created_at DESC LIMIT 500'))}
  catch(error){if(missingTable(error))return response([],200,{'X-Feedback-Setup':'migration-required'});throw error}
 });
 route('patch','/admin/feedback/:record_id',async({db,user,req,body})=>{
  admin(user);const data=body('FeedbackUpdate');const id=String(req.params.record_id);
  const row=await one(db,'visitor_feedback','id=?',[id]);if(!row)fail(404,'Feedback not found');
  if(data.status==='Approved'&&!row.publish_consent)fail(422,'This visitor did not allow publishing. Keep it as private feedback.');
  const changes={status:data.status,display_name:data.display_name.trim(),admin_notes:data.admin_notes,approved_at:data.status==='Approved'?(row.approved_at||now()):null};
  const saved=await update(db,'visitor_feedback',id,changes);
  await audit(db,user!,`Feedback from ${row.name}: ${data.status}`);
  return response({...row,...pick(saved||changes,Object.keys(changes))});
 });
 route('delete','/admin/feedback/:record_id',async({db,user,req})=>{
  admin(user);const id=String(req.params.record_id);const row=await one(db,'visitor_feedback','id=?',[id]);if(!row)fail(404,'Feedback not found');
  await remove(db,'visitor_feedback',id);await audit(db,user!,`Deleted feedback from ${row.name}`);return response({ok:true});
 });
}
