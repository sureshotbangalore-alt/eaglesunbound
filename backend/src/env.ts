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
import type {Config} from './config';

/**
 * Parses .env text. Quoted values ("..." or '...' or `...`) are taken exactly (\n in double quotes becomes a newline).
 * Unlike dotenv, an UNQUOTED value keeps any '#' that is not preceded by whitespace, so a password such as abc#123 is not
 * cut short when a hosting panel writes it without quotes. "KEY=value # note" still treats "# note" as a comment.
 */
export function parseEnvText(text:string):Record<string,string>{
 const out:Record<string,string>={};
 for(const raw of text.replace(/^\uFEFF/,'').split(/\r\n|\n|\r/)){
  const m=raw.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/);
  if(!m)continue;
  let value=m[2].trim();
  const quote=value[0];
  const end=quote==='"'||quote==="'"||quote==='`'?value.lastIndexOf(quote):-1;
  if(end>0){
   value=value.slice(1,end);
   if(quote==='"')value=value.replace(/\\n/g,'\n').replace(/\\r/g,'\r').replace(/\\"/g,'"');
  }else value=value.replace(/\s+#.*$/,'').trim();
  out[m[1]]=value;
 }
 return out;
}

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
  const parsed=parseEnvText(readFileSync(file,'utf8'));used.push(file);
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
