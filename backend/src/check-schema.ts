import {resolve} from 'node:path';
import {loadEnvFiles,defaultEnvFiles} from './env';
import {configFrom} from './config';
import {MySQLDatabase,tables} from './database';
/** Tables added by an additive migration; until it is run the site keeps working without the feature. */
const OPTIONAL:Record<string,string>={visitor_feedback:'Not created yet: run backend/schema/migrations/2026-11-07-visitor-feedback.sql to enable visitor feedback'};
export async function checkSchema(db:MySQLDatabase){
 const columns=await db.query('SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE()');
 const problems:{table:string;column?:string;issue:string}[]=[];const notices:{table:string;issue:string}[]=[];
 for(const [table,definition]of Object.entries(tables)){
  const existing=columns.filter(c=>c.TABLE_NAME===table);if(!existing.length){if(OPTIONAL[table])notices.push({table,issue:OPTIONAL[table]});else problems.push({table,issue:'Required existing table is missing'});continue}
  for(const expected of definition.columns){const c=existing.find(x=>x.COLUMN_NAME===expected.name);if(!c){problems.push({table,column:expected.name,issue:'Required existing column is missing'});continue}
   const type=String(c.DATA_TYPE).toLowerCase();const compatible=expected.type==='JSON'?['json','longtext'].includes(type):expected.type==='BOOLEAN'?['tinyint','bit','boolean'].includes(type):expected.type==='INTEGER'?['int','integer','bigint','smallint'].includes(type):expected.type.startsWith('VARCHAR')?type==='varchar'&&Number(c.CHARACTER_MAXIMUM_LENGTH)>=Number(expected.type.match(/\d+/)![0]):expected.type==='DATETIME'?['datetime','timestamp'].includes(type):expected.type==='DATE'?type==='date':expected.type==='TEXT'?['text','mediumtext','longtext'].includes(type):true;
   if(!compatible)problems.push({table,column:expected.name,issue:'Column type is incompatible'});
   if(!expected.nullable&&c.IS_NULLABLE==='YES')problems.push({table,column:expected.name,issue:'Expected non-null column'});
  }
 }
 return {compatible:problems.length===0,required_tables:Object.keys(tables).length-Object.keys(OPTIONAL).length,problems,notices,mode:'read-only; no DDL or data changes'};
}
if(require.main===module){
 loadEnvFiles(defaultEnvFiles(resolve(__dirname,'../..')));
 let db:MySQLDatabase|undefined;
 (async()=>{db=MySQLDatabase.create(configFrom({...process.env,PORT:process.env.PORT||'3000'}));const report=await checkSchema(db);console.log(JSON.stringify(report,null,2));if(!report.compatible)process.exitCode=1})().catch((error:any)=>{console.error(JSON.stringify({event:'schema_check_failed',code:/^[A-Z0-9_]+$/.test(error?.code||'')?error.code:'CONFIGURATION_OR_CONNECTION_ERROR'}));process.exitCode=1}).finally(()=>db?.close());
}
