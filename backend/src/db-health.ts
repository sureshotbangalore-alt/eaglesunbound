// Read-only database check (SELECT 1 only) with sanitized diagnostics.
// MySQL error MESSAGES can contain the host and user name ("Access denied for user 'x'@'host'"), so they are never logged
// or returned. Only the driver's error code (for example ER_ACCESS_DENIED_ERROR), the error class name and a safe
// category below are used.
import type {Database} from './database';

export type DbDiagnostic='DB_ACCESS_DENIED'|'DB_CONNECTION_REFUSED'|'DB_TIMEOUT'|'DB_NOT_FOUND'|'DB_HOST_NOT_FOUND'|'DB_TLS_FAILED'|'DB_QUERY_FAILED';
export type DbCheck={ok:true}|{ok:false;code:DbDiagnostic;errorCode?:string;errorName?:string};

const safeToken=(value:unknown)=>typeof value==='string'&&/^[A-Za-z0-9_]{1,64}$/.test(value)?value:undefined;

/** Maps a mysql2 / network error to a safe diagnostic code, using only the error's code and number. */
export function classifyDbError(error:any):DbDiagnostic{
 const code=String(error?.code||''),errno=Number(error?.errno);
 if(code==='ER_ACCESS_DENIED_ERROR'||code==='ER_DBACCESS_DENIED_ERROR'||code==='ER_HOST_NOT_PRIVILEGED'||[1044,1045,1130].includes(errno))return 'DB_ACCESS_DENIED';
 if(code==='ER_BAD_DB_ERROR'||errno===1049)return 'DB_NOT_FOUND';
 if(code==='ECONNREFUSED'||code==='ECONNRESET'||code==='EHOSTUNREACH'||code==='ENETUNREACH'||code==='PROTOCOL_CONNECTION_LOST')return 'DB_CONNECTION_REFUSED';
 if(code==='ETIMEDOUT'||code==='PROTOCOL_SEQUENCE_TIMEOUT'||code==='DB_CHECK_TIMEOUT')return 'DB_TIMEOUT';
 if(code==='ENOTFOUND'||code==='EAI_AGAIN')return 'DB_HOST_NOT_FOUND';
 if(/SSL|TLS|CERT|HANDSHAKE/.test(code))return 'DB_TLS_FAILED';
 return 'DB_QUERY_FAILED';
}

/** Runs SELECT 1 (and nothing else) with a time limit. Never throws; logs a sanitized line on failure. */
export async function checkDatabase(db:Database,timeoutMs=8000):Promise<DbCheck>{
 let timer:NodeJS.Timeout|undefined;
 try{
  const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(new Error('timeout'),{code:'DB_CHECK_TIMEOUT'})),timeoutMs)});
  await Promise.race([db.query('SELECT 1'),timeout]);
  return {ok:true};
 }catch(error:any){
  const result:DbCheck={ok:false,code:classifyDbError(error),errorCode:safeToken(error?.code),errorName:safeToken(error?.name)};
  console.error(JSON.stringify({event:'db_check_failed',diagnostic:result.code,error_code:result.errorCode,error_name:result.errorName}));
  return result;
 }finally{if(timer)clearTimeout(timer)}
}
