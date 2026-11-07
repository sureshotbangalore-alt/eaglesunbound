// Environment loading and database-target safeguards.
//
// Precedence (highest first):
//   1. Variables already set in the real process environment (Hostinger panel, shell, CI).
//   2. EU_ENV_FILE, when set: that single file replaces the defaults below (e.g. backend/.env.staging).
//   3. <repo>/.env, then <repo>/backend/.env.
// Database settings (DATABASE_URL, DB_*) are special: they are NEVER mixed from different places. If the process
// environment already selects a database, .env files cannot add or override any database setting; otherwise all
// database settings come from the first file that defines any of them.
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import dotenv from 'dotenv';
import type {Config} from './config';

export const DB_KEYS=['DATABASE_URL','DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD','DB_SSL','DB_SSL_CA'];

export function defaultEnvFiles(root:string,env:NodeJS.ProcessEnv=process.env){
 return env.EU_ENV_FILE?[resolve(root,env.EU_ENV_FILE)]:[resolve(root,'.env'),resolve(root,'backend/.env')];
}

/** Loads env files into `env` without overriding anything already set. Returns the files that were read. */
export function loadEnvFiles(files:string[],env:NodeJS.ProcessEnv=process.env){
 const processChoosesDatabase=DB_KEYS.some(key=>env[key]);
 let databaseFile:string|undefined;const used:string[]=[];
 for(const file of files){
  if(!existsSync(file))continue;
  const parsed=dotenv.parse(readFileSync(file));used.push(file);
  if(!processChoosesDatabase&&!databaseFile&&DB_KEYS.some(key=>parsed[key]))databaseFile=file;
  for(const [key,value] of Object.entries(parsed)){
   if(key in env)continue;
   if(DB_KEYS.includes(key)&&(processChoosesDatabase||file!==databaseFile))continue;
   env[key]=value;
  }
 }
 return used;
}

/** Turns API_INTERNAL_URL into an absolute URL the server can fetch. A relative value such as /api points at this same process. */
export function resolveInternalApiURL(value:string|undefined,port:number){
 const v=(value||'/api').trim();
 if(/^https?:\/\//i.test(v))return v.replace(/\/$/,'');
 return `http://127.0.0.1:${port}${v.startsWith('/')?v:'/'+v}`.replace(/\/$/,'');
}

/** True under `node --test`, NODE_ENV=test, or when EU_AUTOMATED_TEST=true is set by a test runner. */
export function isAutomatedTest(env:NodeJS.ProcessEnv=process.env,execArgv:string[]=process.execArgv){
 return env.NODE_ENV==='test'||env.EU_AUTOMATED_TEST==='true'||!!env.NODE_TEST_CONTEXT||execArgv.includes('--test');
}

export const isLoopbackHost=(host:string)=>/^(localhost|127(\.\d+){3}|\[?::1\]?)$/i.test(host.trim())||host.trim().toLowerCase().endsWith('.localhost');

/** Throws if automated tests are about to connect to a database that is not on this machine. */
export function assertSafeDatabaseTarget(config:Config,env:NodeJS.ProcessEnv=process.env,execArgv:string[]=process.execArgv){
 if(isAutomatedTest(env,execArgv)&&!isLoopbackHost(config.db.host))
  throw Error('Refusing to connect to a non-local database during automated tests. Use the in-memory fixture database or a local staging database (127.0.0.1).');
}

/**
 * Commands that write to the database (seed, create-user) need two explicit confirmations:
 * ALLOW_DB_WRITES=true in the environment, and --confirm-database=<exact database name> on the command line.
 */
export function assertWriteConfirmed(config:Config,args:string[]=process.argv.slice(2)){
 if(!config.writesAllowed)
  throw Error('This command writes to the database. Set ALLOW_DB_WRITES=true for this run only.');
 if(!args.includes('--confirm-database='+config.db.database))
  throw Error('This command writes to the database. Add --confirm-database=<exact database name> to confirm the target.');
}
