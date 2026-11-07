import {resolve} from 'node:path';
import {createServer} from 'node:http';
import {loadEnvFiles,defaultEnvFiles} from './env';
import express from 'express';
import next from 'next';
import {configFrom} from './config';
import {MySQLDatabase} from './database';
import {createAPI} from './api';
const root=resolve(__dirname,'../..');
async function main(){
 // Real environment variables win; .env files fill gaps and can never override the database chosen by the environment (see env.ts).
 loadEnvFiles(defaultEnvFiles(root));
 const dev=process.argv.includes('--dev');(process.env as Record<string,string>).NODE_ENV=dev?'development':'production';
 const config=configFrom(process.env);const db=MySQLDatabase.create(config);
 const api=await createAPI(db,config);const app=express();app.disable('x-powered-by');app.set('trust proxy',config.trustProxy);
 const apiOnly=process.argv.includes('--api-only');
 // One origin: the browser keeps /api paths and existing session cookie scope.
 app.use('/api',api.app);app.get('/health',(req,res,nextFn)=>api.app(req,res,nextFn));
 let nextApp:ReturnType<typeof next>|undefined;
 if(apiOnly)app.use(api.app);
 else {
  process.env.API_INTERNAL_URL ||= `http://127.0.0.1:${config.port}/api`;
  nextApp=next({dev,dir:resolve(root,'frontend'),hostname:'0.0.0.0',port:config.port,webpack:dev});
  await nextApp.prepare();const handler=nextApp.getRequestHandler();app.use((req,res)=>handler(req,res));
 }
 const server=createServer(app);server.requestTimeout=120000;server.headersTimeout=65000;
 server.listen(config.port,'0.0.0.0',()=>console.info(JSON.stringify({event:'server_ready',mode:apiOnly?'api':'combined'})));
 let closing=false;
 const shutdown=()=>{if(closing)return;closing=true;console.info(JSON.stringify({event:'shutdown_started'}));const timer=setTimeout(()=>{server.closeAllConnections();process.exit(1)},15000).unref();server.close(async()=>{try{await nextApp?.close();await db.close();clearTimeout(timer);process.exit(0)}catch{process.exit(1)}});server.closeIdleConnections()};
 process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
 server.on('error',()=>{console.error(JSON.stringify({event:'listen_failed'}));void db.close().finally(()=>process.exit(1))});
}
main().catch(()=>{console.error(JSON.stringify({event:'startup_failed',hint:'Check runtime and environment-variable configuration; secret values are redacted.'}));process.exit(1)});
