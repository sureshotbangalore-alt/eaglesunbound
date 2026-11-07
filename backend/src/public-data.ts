// Public (read-only) site data. Used by the GET /public/* API routes AND, directly, by Next.js server-side rendering in the same
// process, so pages never need an HTTP call to their own server (Hostinger does not expose a local port to call).
import {type Database,rows,one} from './database';
import {modelFor,publicDetails,publicPaths,pick} from './core';
import {fail} from './validation';

export const homeContent=async(db:Database)=>{const row=await one(db,'page_content','slug=?',['home']);if(!row)fail(503,'Content has not been seeded');return row.content};
export const contactSettings=async(db:Database)=>(await one(db,'site_settings','`key`=?',['contact']))?.value||{};

export async function pageUpdates(db:Database){
 const dates:Record<string,string>={};const add=(path:string,date:string)=>{const normalized=date.replace(' ','T').replace(/(?:Z|\+00:00)$/,'')+'+00:00';if(!dates[path]||dates[path]<normalized)dates[path]=normalized};
 for(const row of await rows(db,'page_content'))if(row.slug==='home'||row.content.published){const path=row.slug==='home'?'/':'/'+row.slug;if(publicPaths.includes(path))add(path,row.updated_at)}
 for(const [path,table]of [['/what-we-offer','programmes'],['/activities','activities'],['/contact','faqs']])for(const row of await rows(db,table,'published=?',[1]))add(path,row.updated_at);
 for(const row of await rows(db,'site_settings','`key` LIKE ?',['seo:%']))if(publicPaths.includes(row.value.page))add(row.value.page,row.updated_at);return dates;
}

export async function publicModule(db:Database,module:string){
 if(module==='faqs')return rows(db,'faqs','published=?',[1],'ORDER BY display_order');
 if(module==='seo')return (await rows(db,'site_settings','`key` LIKE ?',['seo:%'])).map(x=>x.value);
 if(module==='pages')return (await rows(db,'page_content','slug<>?',['home'])).filter(x=>x.content.published).map(x=>({slug:x.slug,...x.content}));
 return (await rows(db,modelFor(module),'published=?',[1],'ORDER BY display_order')).map(row=>({...pick(row,['id','slug','name','description','image','published','display_order','created_at','updated_at']),details:publicDetails(row.details)}));
}

/** Reads one public path ("/public/home", "/public/programmes", ...) exactly as the API would answer it (same JSON). */
export async function readPublic(db:Database,path:string):Promise<unknown>{
 const name=/^\/public\/([a-z0-9-]+)$/.exec(path)?.[1];if(!name)fail(404);
 const body=await db.transaction(async tx=>name==='home'?homeContent(tx):name==='settings'?contactSettings(tx):name==='page-updates'?pageUpdates(tx):publicModule(tx,name));
 return JSON.parse(JSON.stringify(body));  // same shape the browser gets from res.json (dates become strings)
}

/** Key on globalThis where the running server shares readPublic with Next.js (same process). */
export const SERVER_DATA_KEY=Symbol.for('eaglesunbound.serverData');
