// Unpublish duplicate and non-activity entries (list and reasons: docs/activities-review.md). Nothing is deleted: every
// record stays in the admin panel and can be published again with one click.
//   Preview (default, no writes):  npm run db:tidy-activities
//   Apply:  ALLOW_DB_WRITES=true npm run db:tidy-activities -- --apply --confirm-database=<exact database name>
import {resolve} from 'node:path';
import {configFrom,ConfigError} from './config';
import {loadEnvFiles,defaultEnvFiles,assertWriteConfirmed} from './env';
import {MySQLDatabase,rows,update,type Database} from './database';

/** Activity name -> why it is hidden (duplicate of / part of another activity). */
export const HIDE:Record<string,string>={
 'Target Archery':'duplicate of Archery','Fun Archery Games':'duplicate of Archery','Archery for All Skill Levels':'duplicate of Archery',
 'Night Camping':'duplicate of Camping','Outdoor Camping':'duplicate of Camping','Tent Pitching':'part of Camping',
 'Bonfire':'duplicate of Campfire with Music','Campfire Games':'part of Campfire with Music','Morning Trek':'duplicate of Trekking',
 'Group Games':'part of Team Building Activities','Interactive Team Games':'part of Team Building Activities','Icebreaker Activities':'part of Team Building Activities','Energizer Activities':'part of Team Building Activities',
 'Team Sports':'covered by Cricket, Football and Volleyball','Organised Tournaments':'covered by Cricket, Football and Volleyball','Cricket Nets':'part of Cricket',
 'Clay Modelling':'made in the Pottery session','Pottery Wheel':'made in the Pottery session','Animal Figurines':'made in the Pottery session','DIY Planters':'made in the Pottery session',
 'Lanterns and Tealight Holders':'made in the Pottery session','Name Plates':'made in the Pottery session','Traditional Designs':'made in the Pottery session',
 'Dairy Farming Experience':'part of Farm Interaction Activities','Cow Feeding':'part of Farm Interaction Activities','Animal Care':'part of Farm Interaction Activities','Milking Experience':'part of Farm Interaction Activities',
 'Seed Ball Making':'part of Kitchen Gardening','Herb Garden Making':'part of Kitchen Gardening','Composting':'part of Kitchen Gardening','Vermicomposting':'part of Kitchen Gardening','Soil Exploration':'part of Kitchen Gardening',
 'Swimming Pool':'a facility, not an activity','Chess':'indoor game, not an adventure activity','Carom':'indoor game, not an adventure activity',
};

export async function tidyActivities(db:Database,{apply=false}={}){
 const found:{name:string;reason:string;was_published:boolean}[]=[];
 for(const row of await rows(db,'activities')){
  const reason=HIDE[String(row.name)];if(!reason)continue;
  found.push({name:row.name,reason,was_published:!!row.published});
  if(apply&&row.published)await update(db,'activities',row.id,{published:false});
 }
 return {to_hide:found.filter(f=>f.was_published).length,already_hidden:found.filter(f=>!f.was_published).length,not_found:Object.keys(HIDE).filter(n=>!found.some(f=>f.name===n)),list:found};
}

if(require.main===module){
 loadEnvFiles(defaultEnvFiles(resolve(__dirname,'../..')));
 const args=process.argv.slice(2);const apply=args.includes('--apply');let db:MySQLDatabase|undefined;
 (async()=>{
  const config=configFrom({...process.env,PORT:process.env.PORT||'3000'});
  if(apply)assertWriteConfirmed(config);
  db=MySQLDatabase.create(config);
  console.log(JSON.stringify({mode:apply?'applied (unpublished, nothing deleted)':'preview only (nothing written)',...await tidyActivities(db,{apply})},null,1));
 })().catch((error:any)=>{
  const detail=error instanceof ConfigError||/^This command writes/.test(error?.message||'')?error.message:'Tidy failed. No secrets are shown.';
  console.error(JSON.stringify({event:'tidy_activities_failed',message:detail,code:/^[A-Z0-9_]+$/.test(error?.code||'')?error.code:undefined}));process.exitCode=1;
 }).finally(()=>db?.close());
}
