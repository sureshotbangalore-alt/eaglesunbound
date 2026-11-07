// Read-only mode. Unless ALLOW_DB_WRITES=true, the API wraps its database in this guard: only SELECT-style
// statements run; anything else (INSERT, UPDATE, DELETE, REPLACE, DDL, ...) is refused before it reaches MySQL.
import type {Database} from './database';
import {HttpError} from './validation';

export const READ_ONLY_MESSAGE='The website is in read-only mode, so changes cannot be saved right now. Please try again later.';

const readStatement=/^\s*(select|show|describe|desc|explain)\b/i;
/** True only for statements that cannot change data. */
export const isReadOnlySql=(sql:string)=>readStatement.test(sql)&&!/\binto\s+(outfile|dumpfile)\b/i.test(sql);

export function readOnlyDatabase(db:Database):Database{
 const check=(sql:string)=>{
  if(isReadOnlySql(sql))return;
  console.warn(JSON.stringify({event:'write_blocked',reason:'ALLOW_DB_WRITES is not true'}));
  throw new HttpError(503,READ_ONLY_MESSAGE);
 };
 return {
  get locking(){return db.locking},
  // async: a refused statement is a rejected promise, never a synchronous throw
  query:async(sql,values)=>{check(sql);return db.query(sql,values)},
  execute:async(sql,values)=>{check(sql);return db.execute(sql,values)},
  transaction:work=>db.transaction(inner=>work(readOnlyDatabase(inner))),
  close:()=>db.close(),
 };
}
