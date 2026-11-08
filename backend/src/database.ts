import {randomUUID} from 'node:crypto';
import mysql,{type Pool,type PoolConnection} from 'mysql2/promise';
import schema from './schema.json';
import type {Config} from './config';
import {assertSafeDatabaseTarget} from './env';
export type Row=Record<string,any>;
export interface Database {query(sql:string,values?:unknown[]):Promise<Row[]>;execute(sql:string,values?:unknown[]):Promise<void>;transaction<T>(work:(db:Database)=>Promise<T>):Promise<T>;close():Promise<void>;readonly locking:boolean}
export class MySQLDatabase implements Database {
 readonly locking=true;
 constructor(private pool:Pool,private connection?:PoolConnection){}
 static create(config:Config){assertSafeDatabaseTarget(config);return new MySQLDatabase(mysql.createPool({...config.db,connectionLimit:5,maxIdle:3,idleTimeout:60000,waitForConnections:true,queueLimit:100,timezone:'Z',dateStrings:true,multipleStatements:false,connectTimeout:10000,enableKeepAlive:true}));}
 async query(sql:string,values:unknown[]=[]){const [rows]=await (this.connection||this.pool).execute(sql,values as any[]);return rows as Row[]}
 async execute(sql:string,values:unknown[]=[]){await (this.connection||this.pool).execute(sql,values as any[])}
 async transaction<T>(work:(db:Database)=>Promise<T>):Promise<T>{if(this.connection)return work(this);const c=await this.pool.getConnection();try{await c.beginTransaction();const result=await work(new MySQLDatabase(this.pool,c));await c.commit();return result}catch(error){await c.rollback();throw error}finally{c.release()}}
 async close(){if(!this.connection)await this.pool.end()}
}
export const tables=schema as Record<string,{columns:{name:string;type:string;nullable:boolean}[];primary:string[]}>;
export function table(name:string){if(!tables[name])throw Error('Unknown internal table');return '`'+name+'`'}
export function decode(name:string,row:Row):Row{
 const result={...row};for(const c of tables[name].columns){let value=result[c.name];if(value==null)continue;if(c.type==='JSON'&&typeof value==='string')value=JSON.parse(value);if(c.type==='BOOLEAN')value=!!Number(value);if(c.type==='DATETIME')value=String(value).replace(' ','T');result[c.name]=value;}return result;
}
export async function rows(db:Database,name:string,where='',values:unknown[]=[],suffix=''){return(await db.query(`SELECT * FROM ${table(name)}${where?' WHERE '+where:''}${suffix?' '+suffix:''}`,values)).map(row=>decode(name,row))}
export async function one(db:Database,name:string,where:string,values:unknown[]=[],lock=false){return(await rows(db,name,where,values,'LIMIT 1'+(lock&&db.locking?' FOR UPDATE':'')))[0]}
export const now=()=>new Date().toISOString().replace('T',' ').replace('Z','');
const defaults:Record<string,Row>={admin_users:{role:'admin',active:true},programmes:{},activities:{},clients:{},gallery_albums:{},packages:{programme_id:null},bookings:{preferred_time:'',organisation:'',message:'',status:'Pending',internal_notes:'',details:{}},enquiries:{status:'New',internal_notes:'',details:{}},booking_status_history:{actor_id:null},availability:{enabled:true},blocked_dates:{reason:''},media_assets:{category:'general',album_id:null},testimonials:{approved:false},visitor_feedback:{organisation:'',publish_consent:false,status:'Pending',display_name:'',admin_notes:'',approved_at:null},faqs:{published:false,page:'/faqs',display_order:0}};
const contentTables=new Set(['programmes','activities','clients','gallery_albums','packages']);
function bind(name:string,key:string,value:any){const c=tables[name].columns.find(x=>x.name===key);if(!c)throw Error('Unknown internal column');return c.type==='JSON'?JSON.stringify(value):typeof value==='boolean'?Number(value):value}
export async function insert(db:Database,name:string,input:Row){const stamp=now();const row:Row={...(contentTables.has(name)?{description:'',image:'',published:false,display_order:0,details:{}}:{}),...(defaults[name]||{}),...(tables[name].columns.some(c=>c.name==='id')?{id:randomUUID(),created_at:stamp,updated_at:stamp}:{}),...input};const keys=Object.keys(row);await db.execute(`INSERT INTO ${table(name)} (${keys.map(k=>'`'+k+'`').join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,keys.map(k=>bind(name,k,row[k])));return decode(name,row)}
export async function update(db:Database,name:string,id:string,values:Row){const row:Row={...values,updated_at:now()};const keys=Object.keys(row);await db.execute(`UPDATE ${table(name)} SET ${keys.map(k=>'`'+k+'`=?').join(',')} WHERE id=?`,[...keys.map(k=>bind(name,k,row[k])),id]);return one(db,name,'id=?',[id])}
export async function remove(db:Database,name:string,id:string){await db.execute(`DELETE FROM ${table(name)} WHERE id=?`,[id])}
export async function audit(db:Database,user:Row,action:string){await insert(db,'audit_logs',{actor_id:user.id,action})}
