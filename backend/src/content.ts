import {type Row,rows,one,insert,update,remove,audit} from './database';
import {createRouter,response,admin,modelFor,publicPaths,editablePages} from './core';
import {fail} from './validation';
import {checkDatabase} from './db-health';
import {homeContent,contactSettings,pageUpdates,publicModule} from './public-data';
type API=ReturnType<typeof createRouter>;
export function registerContent({route,router,db:database}:API){
 // Health: SELECT 1 only, outside the request transaction, so a database problem gives a clear 503 instead of a generic 500.
 router.get('/health',async(_req,res)=>{
  const result=await checkDatabase(database);
  res.set('Cache-Control','no-store');
  if(result.ok)return res.json({status:'ok'});
  res.status(503).json({status:'unavailable',detail:'database unavailable',code:result.code,...(result.errorCode?{error_code:result.errorCode}:{})});
 });
 const home=homeContent,contact=contactSettings;
 route('get','/public/home',async({db})=>response(await home(db)));
 route('get','/public/settings',async({db})=>response(await contact(db)));
 route('get','/public/page-updates',async({db})=>response(await pageUpdates(db)));
 route('get','/public/:module',async({db,req})=>response(await publicModule(db,String(req.params.module))));
 route('get','/admin/master-review',async({db,user})=>{admin(user);return response((await one(db,'site_settings','`key`=?',['master_review']))?.value||{})});
 route('get','/admin/pages/:slug',async({db,req})=>{const slug=String(req.params.slug);if(!editablePages.has(slug))fail(404);return response((await one(db,'page_content','slug=?',[slug]))?.content||{title:'',intro:'',sections:[],published:false})});
 route('put','/admin/pages/:slug',async({db,user,req,body})=>{
  const slug=String(req.params.slug);if(!editablePages.has(slug))fail(404);const data=body('PageInput');const row=await one(db,'page_content','slug=?',[slug]);if(row)await update(db,'page_content',row.id,{content:data});else await insert(db,'page_content',{slug,content:data});await audit(db,user!,'Updated page '+slug);return response(data);
 });
 route('get','/admin/content',async({db})=>response(await home(db)));
 route('put','/admin/content',async({db,user,body})=>{const data=body('Homepage');const row=await one(db,'page_content','slug=?',['home']);if(!row)fail(404,'Seed the homepage first');await update(db,'page_content',row.id,{content:data});await audit(db,user!,'Updated homepage');return response(data)});
 route('get','/admin/settings',async({db,user})=>{admin(user);return response(await contact(db))});
 route('put','/admin/settings',async({db,user,body})=>{admin(user);const data=body('ContactSettings');const row=await one(db,'site_settings','`key`=?',['contact']);if(!row)fail(503,'Content has not been seeded');await update(db,'site_settings',row.id,{value:data});await audit(db,user!,'Updated contact settings');return response(data)});
 route('get','/admin/faqs',async({db})=>response(await rows(db,'faqs','',[],'ORDER BY display_order')));
 route('post','/admin/faqs',async({db,user,body})=>{const row=await insert(db,'faqs',body('FAQInput'));await audit(db,user!,'Created FAQ');return response(row,201)});
 route('put','/admin/faqs/:record_id',async({db,user,req,body})=>{const data=body('FAQInput');const id=String(req.params.record_id);if(!await one(db,'faqs','id=?',[id]))fail(404);const row=await update(db,'faqs',id,data);await audit(db,user!,'Updated FAQ');return response(row)});
 route('delete','/admin/faqs/:record_id',async({db,user,req})=>{const id=String(req.params.record_id);if(!await one(db,'faqs','id=?',[id]))fail(404);await remove(db,'faqs',id);await audit(db,user!,'Deleted FAQ');return response({ok:true})});
 route('get','/admin/seo',async({db})=>response((await rows(db,'site_settings','`key` LIKE ?',['seo:%'])).map(x=>x.value)));
 route('get','/admin/seo/audit',async({db})=>{
  const all=(await rows(db,'site_settings','`key` LIKE ?',['seo:%'])).map(x=>x.value);const warnings:Row[]=[];
  for(const row of all){const page=row.page||'';if(!publicPaths.includes(page))warnings.push({page,message:'This route is retired or does not exist. Set metadata on the consolidated public page.'});if(all.some(x=>x.page!==page&&(x.title||'').toLowerCase()===(row.title||'').toLowerCase()))warnings.push({page,message:'Duplicate override title.'});if(row.image&&!row.image_alt)warnings.push({page,message:'Social image needs descriptive alt text.'})}
  return response({pages:publicPaths,overrides:all.length,warnings,note:'Pages without overrides use their unique server-rendered defaults. Run browser route tests for links and rendered metadata.'});
 });
 route('put','/admin/seo',async({db,user,body})=>{const data=body('SEOInput');const key='seo:'+data.page;const row=await one(db,'site_settings','`key`=?',[key]);if(row)await update(db,'site_settings',row.id,{value:data});else await insert(db,'site_settings',{key,value:data});await audit(db,user!,'Updated SEO '+data.page);return response(data)});
 route('get','/admin/blocked-dates',async({db,user})=>{admin(user);return response(await rows(db,'blocked_dates','',[],'ORDER BY day'))});
 route('post','/admin/blocked-dates',async({db,user,body})=>{admin(user);const data=body('BlockedDateInput');const row=await insert(db,'blocked_dates',data);await audit(db,user!,'Blocked date '+data.day);return response(row,201)});
 route('delete','/admin/blocked-dates/:record_id',async({db,user,req})=>{admin(user);const id=String(req.params.record_id);if(!await one(db,'blocked_dates','id=?',[id]))fail(404,'Date not found');await remove(db,'blocked_dates',id);await audit(db,user!,'Removed blocked date');return response({ok:true})});
 route('get','/admin/records/:module',async({db,user,req})=>{
  const module=String(req.params.module);if(['bookings','enquiries'].includes(module)){admin(user);const [where,args]=requestFilter(req.query);return response(await rows(db,module,where,args,'ORDER BY created_at DESC LIMIT 500'))}
  return response(await rows(db,modelFor(module),'',[],'ORDER BY display_order'));
 });
 route('post','/admin/records/:module',async({db,user,req,body})=>{const module=String(req.params.module);const data=body('ContentInput');const row=await insert(db,modelFor(module),data);await audit(db,user!,`Created ${module}: ${data.slug}`);return response(row,201)});
 route('put','/admin/records/:module/:record_id',async({db,user,req,body})=>{const module=String(req.params.module);const table=modelFor(module);const data=body('ContentInput');const id=String(req.params.record_id);if(!await one(db,table,'id=?',[id]))fail(404,'Record not found');const row=await update(db,table,id,data);await audit(db,user!,`Updated ${module}: ${data.slug}`);return response(row)});
 route('delete','/admin/records/:module/:record_id',async({db,user,req})=>{const module=String(req.params.module);const table=modelFor(module);const id=String(req.params.record_id);if(!await one(db,table,'id=?',[id]))fail(404,'Record not found');await remove(db,table,id);await audit(db,user!,`Deleted ${module}: ${id}`);return response({ok:true})});
}
export function queryText(query:Record<string,any>,name:string){const value=query[name];return typeof value==='string'?value:Array.isArray(value)?String(value.at(-1)):''}
export function requestFilter(query:Record<string,any>,staff=false):[string,unknown[]]{const status=queryText(query,'status');const q=queryText(query,'q');const conditions:string[]=[];const args:unknown[]=[];if(status){conditions.push('status=?');args.push(staff?status.slice(0,20):status)}if(q){conditions.push('LOWER(name) LIKE LOWER(?)');args.push('%'+q.slice(0,100)+'%')}return [conditions.join(' AND '),args]}
