// Fill CMS image fields with real Eagles Unbound photographs (frontend/public/media/photos, see docs/media/photo-manifest.json).
//   Preview (no writes):  npm run db:apply-media -- --dry-run
//   Apply:                ALLOW_DB_WRITES=true npm run db:apply-media -- --confirm-database=<exact database name>
// Only activities and programmes WITHOUT an image are changed, unless --overwrite is given. Afterwards every image stays
// editable in the admin panel (Activities / Programmes -> Image), exactly like before.
import {resolve} from 'node:path';
import {configFrom,ConfigError} from './config';
import {loadEnvFiles,defaultEnvFiles,assertWriteConfirmed} from './env';
import {MySQLDatabase,rows,update,type Database} from './database';

const photo=(key:string)=>`/media/photos/${key}.webp`;
const LEGACY=['','/assets/forest.jpg','/assets/landscape.jpg','/assets/camp.jpg'];

/** Activity name -> photograph of that activity (first match wins). */
export const ACTIVITY_RULES:[RegExp,string][]=[
 [/zip/,'zip-rider'],[/high rope|bridge|burma/,'high-rope'],[/low rope/,'low-rope'],[/rappel/,'rappel'],[/cav(e|ing)/,'caving'],
 [/wall climb|climbing/,'wall-climb'],[/arch/,'archery'],[/rifle|shoot/,'shooting'],[/progressive|pgt/,'pgt'],
 [/snake|group obstacle|race/,'obstacle-net'],[/mud|kids/,'mud-kids'],[/obstacle|army|commando/,'obstacle-wall'],
 [/tent|camping/,'tents-night'],[/campfire|bonfire/,'campfire'],[/rain dance/,'rain-dance'],[/trek|hik|sunrise|walk|nature|bird/,'trek-vista'],
 [/pottery|clay|planter|lantern|name plate|figurine|traditional/,'pottery'],[/dairy|cow|milk|animal|farm/,'dairy'],
 [/garden|seed|herb|compost|soil/,'garden'],[/tractor/,'tractor'],[/tug|team|group|icebreaker|energi|leadership|mind|games|tournament/,'team-games'],
];
/** Programme slug -> photograph that matches its audience. */
export const PROGRAMME_RULES:[RegExp,string][]=[
 [/corporate.*building/,'team-games'],[/corporate/,'group-corporate'],[/outbound/,'briefing-assembly'],[/student/,'briefing'],[/school/,'group-kids'],
 [/college/,'obstacle-net'],[/overnight|stay/,'tent-stay'],[/adventure-unbound/,'zip-rider'],[/outdoor-adventure/,'trek-vista'],
];

export function photoFor(rules:[RegExp,string][],text:string){const t=text.toLowerCase();const hit=rules.find(([re])=>re.test(t));return hit?photo(hit[1]):undefined}

export async function applyMedia(db:Database,{overwrite=false,dryRun=false}={}){
 const changes:{table:string;name:string;from:string;to:string}[]=[];
 for(const [table,rules,key] of [['activities',ACTIVITY_RULES,'name'],['programmes',PROGRAMME_RULES,'slug']] as const){
  for(const row of await rows(db,table)){
   const current=String(row.image||'');
   if(!overwrite&&!LEGACY.includes(current))continue;   // an admin already chose an image: leave it
   const next=photoFor(rules,String(row[key]||''));
   if(!next||next===current)continue;
   changes.push({table,name:String(row.name),from:current,to:next});
   if(!dryRun)await update(db,table,row.id,{image:next});
  }
 }
 return changes;
}

if(require.main===module){
 loadEnvFiles(defaultEnvFiles(resolve(__dirname,'../..')));
 const args=process.argv.slice(2);const dryRun=args.includes('--dry-run');let db:MySQLDatabase|undefined;
 (async()=>{
  const config=configFrom({...process.env,PORT:process.env.PORT||'3000'});
  if(!dryRun)assertWriteConfirmed(config);
  db=MySQLDatabase.create(config);
  const changes=await applyMedia(db,{overwrite:args.includes('--overwrite'),dryRun});
  console.log(JSON.stringify({mode:dryRun?'dry-run (nothing written)':'applied',changes:changes.length,list:changes},null,1));
 })().catch((error:any)=>{
  const detail=error instanceof ConfigError||/^This command writes/.test(error?.message||'')?error.message:'Applying media failed. No secrets are shown.';
  console.error(JSON.stringify({event:'apply_media_failed',message:detail,code:/^[A-Z0-9_]+$/.test(error?.code||'')?error.code:undefined}));process.exitCode=1;
 }).finally(()=>db?.close());
}
