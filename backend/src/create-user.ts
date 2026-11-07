// Create one administrator or Staff Viewer account from the command line (insert-only; never changes an existing account).
//   ALLOW_DB_WRITES=true npm run db:create-user -- --email staff@example.com --role staff_viewer --password-from NEW_USER_PASSWORD --confirm-database=<exact database name>
// The password is read from the named environment variable (default NEW_USER_PASSWORD) and is never printed.
// Email, role and password go through the same validation as the admin panel (Users & roles).
import {resolve} from 'node:path';
import {configFrom,ConfigError} from './config';
import {loadEnvFiles,defaultEnvFiles,assertWriteConfirmed} from './env';
import {MySQLDatabase,insert,one,type Database} from './database';
import {validate,HttpError} from './validation';
import {passwordHash} from './crypto';

export async function createUser(db:Database,input:{email:string;password:string;role:string}):Promise<{status:'created'|'exists';email:string;role:string}>{
 const data=validate('UserCreate',input);              // same rules as POST /admin/users: valid email, role, password length
 const email=String(data.email).toLowerCase();
 if(await one(db,'admin_users','email=?',[email]))return {status:'exists',email,role:data.role};
 await insert(db,'admin_users',{email,password_hash:await passwordHash(data.password),role:data.role,active:true});
 return {status:'created',email,role:data.role};
}

const option=(args:string[],name:string)=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined};

if(require.main===module){
 loadEnvFiles(defaultEnvFiles(resolve(__dirname,'../..')));
 const args=process.argv.slice(2);let db:MySQLDatabase|undefined;
 (async()=>{
  const config=configFrom({...process.env,PORT:process.env.PORT||'3000'});
  assertWriteConfirmed(config);
  const email=option(args,'--email'),role=option(args,'--role'),passwordVar=option(args,'--password-from')||'NEW_USER_PASSWORD';
  if(!email||!role)throw Error('Usage: --email <address> --role <admin|staff_viewer> [--password-from <ENV_VAR_NAME>]');
  const password=process.env[passwordVar];if(!password)throw Error(`Environment variable ${passwordVar} is not set.`);
  db=MySQLDatabase.create(config);
  console.log(JSON.stringify(await createUser(db,{email,password,role})));
 })().catch((error:any)=>{
  const detail=error instanceof HttpError?'Input rejected by the same validation as the admin panel (check the email, role and password length).':error instanceof ConfigError||/^(Usage|Environment variable|This command writes)/.test(error?.message||'')?error.message:'See configuration and connection settings; secret values are never printed.';
  console.error(JSON.stringify({event:'create_user_failed',message:detail,code:/^[A-Z0-9_]+$/.test(error?.code||'')?error.code:undefined}));process.exitCode=1;
 }).finally(()=>db?.close());
}
