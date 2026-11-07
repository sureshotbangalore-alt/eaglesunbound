// Read-only database connection check: runs SELECT 1 and nothing else, then prints a sanitized result.
//   npm run db:ping
// Never prints the host, user, password or connection string; on failure only the safe diagnostic code is shown.
import {resolve} from 'node:path';
import {configFrom,ConfigError} from './config';
import {loadEnvFiles,defaultEnvFiles} from './env';
import {MySQLDatabase} from './database';
import {checkDatabase} from './db-health';

if(require.main===module){
 loadEnvFiles(defaultEnvFiles(resolve(__dirname,'../..')));
 let db:MySQLDatabase|undefined;
 (async()=>{
  db=MySQLDatabase.create(configFrom({...process.env,PORT:process.env.PORT||'3000'}));
  const result=await checkDatabase(db);
  console.log(JSON.stringify(result.ok?{database:'reachable',check:'SELECT 1'}:{database:'unavailable',diagnostic:result.code,error_code:result.errorCode}));
  if(!result.ok)process.exitCode=1;
 })().catch(error=>{console.error(JSON.stringify({event:'db_ping_failed',message:error instanceof ConfigError?error.message:'configuration problem; values are never printed'}));process.exitCode=1}).finally(()=>db?.close());
}
