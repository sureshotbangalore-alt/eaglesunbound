import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {Database,Row} from '../src/database';
export class FixtureDatabase implements Database {
 readonly locking=false;private sqlite:DatabaseSync;private nested=false;
 constructor(){this.sqlite=new DatabaseSync(':memory:');this.sqlite.exec('PRAGMA foreign_keys=ON');this.sqlite.exec(readFileSync(resolve(__dirname,'fixture-schema.sql'),'utf8'))}
 async query(sql:string,values:unknown[]=[]){return this.sqlite.prepare(sql).all(...values as any[]) as Row[]}
 async execute(sql:string,values:unknown[]=[]){
  try{this.sqlite.prepare(sql).run(...values as any[])}
  // Report constraint failures the way mysql2 does, so the API's MySQL error mapping is exercised.
  catch(error:any){if(/UNIQUE constraint/.test(error?.message))throw Object.assign(error,{code:'ER_DUP_ENTRY'});if(/FOREIGN KEY constraint/.test(error?.message))throw Object.assign(error,{errno:1451});throw error}
 }
 async transaction<T>(work:(db:Database)=>Promise<T>):Promise<T>{if(this.nested)return work(this);this.nested=true;this.sqlite.exec('BEGIN');try{const result=await work(this);this.sqlite.exec('COMMIT');return result}catch(error){this.sqlite.exec('ROLLBACK');throw error}finally{this.nested=false}}
 async close(){this.sqlite.close()}
}
