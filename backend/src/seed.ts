// Opt-in starter content and first administrator (Node replacement for the old app/seed.py + app/seed_master.py).
// Insert-only for a fresh database: it never deletes anything and refuses to run on an already-seeded database unless --force is given.
//   npm run db:seed                 seed starter content (+ admin when ADMIN_EMAIL / ADMIN_PASSWORD are set)
//   npm run db:seed -- --admin-only create just the administrator account (safe on an existing database)
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadEnvFiles,defaultEnvFiles,assertWriteConfirmed} from './env';
import {configFrom} from './config';
import {MySQLDatabase,insert,one,update,type Database,type Row} from './database';
import {passwordHash} from './crypto';

const dataDir=resolve(__dirname,'../data');
const load=(name:string)=>JSON.parse(readFileSync(resolve(dataDir,name),'utf8'));
const slugify=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
// Same behaviour as Python's str.title(): a letter that follows a non-letter is capitalised.
const title=(value:string)=>value.toLowerCase().replace(/(^|[^a-z])([a-z])/g,(_m,a,b)=>a+b.toUpperCase());
const sorted=(values:Iterable<string>)=>[...new Set(values)].sort();
const aliases:Record<string,string>={'Military Group Obstacle Race':'group-obstacle-race-snake-race','Group Obstacle Race (GOR)':'group-obstacle-race-snake-race','Military-Style Individual Obstacle Course':'individual-army-inspired-obstacles','Individual Obstacles':'individual-army-inspired-obstacles','Team-Building Activities':'team-building-activities'};
const needsConfirmation=new Set(['.22 Rifle Shooting','Pelvic Rest Shooting','Recove Bow Shooting','Standing Shooting','Target Practice']);

export type SeedOptions={admin?:{email:string;password:string};adminOnly?:boolean;force?:boolean};
export type SeedResult={skipped?:string;admin:'created'|'exists'|'not-requested'};

export async function seedDatabase(db:Database,options:SeedOptions={}):Promise<SeedResult>{
 const result:SeedResult={admin:'not-requested'};
 if(options.admin){
  const {email,password}=options.admin;
  if(password.length<14)throw Error('ADMIN_PASSWORD must contain at least 14 characters');
  if(await one(db,'admin_users','email=?',[email.toLowerCase()]))result.admin='exists';
  else{await insert(db,'admin_users',{email:email.toLowerCase(),password_hash:await passwordHash(password),role:'admin',active:true});result.admin='created'}
 }
 if(options.adminOnly)return result;
 if(!options.force&&await one(db,'page_content','slug=?',['home'])){result.skipped='Database already has homepage content. Nothing was changed (use --force to add any missing starter rows).';return result}
 await db.transaction(async tx=>{await seedBase(tx);await seedMaster(tx)});
 return result;
}

async function seedBase(db:Database){
 const content=load('seed-content.json');
 if(!await one(db,'page_content','slug=?',['home']))await insert(db,'page_content',{slug:'home',content:content.home});
 if(!await one(db,'site_settings','`key`=?',['contact']))await insert(db,'site_settings',{key:'contact',value:content.contact});
 for(const [i,p] of content.programmes.entries())if(!await one(db,'programmes','slug=?',[p.slug]))await insert(db,'programmes',{slug:p.slug,name:p.name,description:p.description,image:p.image,published:true,display_order:i,details:{source:'https://www.eaglesunbound.com/',media_status:'illustrative stock; replace with approved client media'}});
 if(!await one(db,'programmes','slug=?',['military-inspired-bootcamp']))await insert(db,'programmes',{slug:'military-inspired-bootcamp',name:'Military-Inspired Bootcamp',description:'A civilian outdoor challenge experience. Programme details require client confirmation.',published:false});
 for(const [i,name] of (content.activities as string[]).entries()){const slug=name.toLowerCase().replaceAll(' / ','-').replaceAll(' ','-');if(!await one(db,'activities','slug=?',[slug]))await insert(db,'activities',{slug,name,description:'Contact our team to discuss this activity and its suitability for your group.',published:true,display_order:i,details:{source:'https://www.eaglesunbound.com/'}})}
 for(const [i,f] of content.faqs.entries())if(!await one(db,'faqs','question=?',[f.question]))await insert(db,'faqs',{question:f.question,answer:f.answer,published:true,display_order:i});
}

async function seedMaster(db:Database){
 const content=load('seed-content.json'),catalogue=load('master-activities.json'),programmes=load('master-programmes.json');
 for(const [i,entry] of (catalogue.activities as Row[]).entries()){
  const name=entry.name as string,slug=aliases[name]||slugify(name);let row=await one(db,'activities','slug=?',[slug]);
  const categories=(entry.categories as string[]).map(c=>c.includes('SSB')?'Military-inspired Group Challenges':title(c));
  if(!row)row=await insert(db,'activities',{slug,name,description:`Discuss ${name.toLowerCase()} as part of your Eagles Unbound experience. Current availability, suitability and programme inclusion are confirmed by the team.`,published:!needsConfirmation.has(name),display_order:i+20,details:{}});
  const existing=row.details||{};
  await update(db,'activities',row.id,{details:{...existing,source:catalogue.source,source_status:'Provided master brief; operational details require confirmation',categories:sorted([...(existing.categories||[]),...categories]),aliases:sorted([...(existing.aliases||[]),...(name!==row.name?[name]:[])]),confirmation_required:needsConfirmation.has(name)}});
 }
 const archery=await one(db,'activities','slug=?',['archery']);
 if(archery&&!(archery.details?.categories||[]).includes('Shooting And Archery'))await update(db,'activities',archery.id,{details:{...archery.details,categories:sorted([...(archery.details?.categories||[]),'Shooting And Archery'])}});
 for(const name of ['Soft Archery','Farm Interaction Activities','Interactive Team Games'])if(!await one(db,'activities','slug=?',[slugify(name)]))await insert(db,'activities',{slug:slugify(name),name,description:'Discuss this experience and its suitability for your group with the team.',published:true,display_order:110,details:{categories:['Kids Special Experiences'],source:'Master brief: School Day Outing activities',confirmation_required:true}});
 for(const [i,entry] of (programmes as Row[]).entries()){
  if(await one(db,'programmes','slug=?',[entry.slug]))continue;
  const details=entry.details as Row,related:string[]=[];
  for(const name of details.activities as string[]){const activity=await one(db,'activities','slug=?',[aliases[name]||slugify(name)]);if(activity?.published)related.push(activity.slug)}
  await insert(db,'programmes',{slug:entry.slug,name:entry.name,description:entry.description,published:true,display_order:i+10,image:'/assets/forest.jpg',details:{...details,related_slugs:related,media_status:'Illustrative imagery; approved client media required',image_alt:'Illustrative woodland landscape'}});
 }
 for(const [slug,page] of Object.entries(content.pages as Record<string,Row>))if(!await one(db,'page_content','slug=?',[slug]))await insert(db,'page_content',{slug,content:{title:page.title,intro:page.intro,published:true,sections:page.sections}});
 for(const [index,name] of (content.galleryAlbums as string[]).entries()){const slug=slugify(name);if(!await one(db,'gallery_albums','slug=?',[slug]))await insert(db,'gallery_albums',{slug,name,published:false,display_order:index,details:{media:[],source:'Master brief gallery taxonomy',approval_required:true}})}
 let review=await one(db,'site_settings','`key`=?',['master_review']);
 if(!review)review=await insert(db,'site_settings',{key:'master_review',value:content.masterReview});
 await update(db,'site_settings',review.id,{value:{...review.value,programme_source_details:programmes,activity_category_inventory:catalogue.categories,distinct_source_activity_names:catalogue.activities.length,bootcamp_suggested_flow:content.bootcampSuggestedFlow,'3d_assets_pending':content.pending3dAssets}});
}

if(require.main===module){
 loadEnvFiles(defaultEnvFiles(resolve(__dirname,'../..')));
 const args=process.argv.slice(2);let db:MySQLDatabase|undefined;
 (async()=>{
  const config=configFrom({...process.env,PORT:process.env.PORT||'3000'});
  assertWriteConfirmed(config); // seeding writes: the operator must name the target database explicitly
  db=MySQLDatabase.create(config);
  const admin=process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD?{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD}:undefined;
  if(args.includes('--admin-only')&&!admin)throw Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (14+ characters) to create an administrator.');
  const result=await seedDatabase(db,{admin,adminOnly:args.includes('--admin-only'),force:args.includes('--force')});
  console.log(JSON.stringify(result));
 })().catch((error:any)=>{console.error(JSON.stringify({event:'seed_failed',message:/^ADMIN_|^Set ADMIN_|^This command writes/.test(error?.message||'')?error.message:'See configuration and connection settings; secret values are never printed.',code:/^[A-Z0-9_]+$/.test(error?.code||'')?error.code:undefined}));process.exitCode=1}).finally(()=>db?.close());
}
