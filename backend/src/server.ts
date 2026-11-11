import {resolve} from 'node:path';
import {createServer} from 'node:http';
import express from 'express';
import next from 'next';
import {configFrom,ConfigError} from './config';
import {loadEnvFiles,defaultEnvFiles} from './env';
import {MySQLDatabase} from './database';
import {createAPI} from './api';
import {SERVER_DATA_KEY} from './public-data';

const root=resolve(__dirname,'../..');
// Listen on every interface so Hostinger's reverse proxy can reach the app.
const HOST='0.0.0.0';
const safeCode=(error:any)=>typeof error?.code==='string'&&/^[A-Z0-9_]+$/.test(error.code)?error.code:undefined;

async function main(){
 // Real environment variables win; .env files only fill gaps and can never change the database chosen by the environment (see env.ts).
 loadEnvFiles(defaultEnvFiles(root));
 const dev=process.argv.includes('--dev');(process.env as Record<string,string>).NODE_ENV=dev?'development':'production';
 const config=configFrom(process.env);const db=MySQLDatabase.create(config);
 const api=await createAPI(db,config);const app=express();app.disable('x-powered-by');
 // One reverse proxy (Hostinger) sits in front: trust its forwarding headers so req.ip and HTTPS detection are correct.
 app.set('trust proxy',config.trustProxy);
 // HSTS is set here, when the server starts, so it is present whenever the public address is https, even if the frontend build
 // could not see that address (Next.js fixes its own headers at build time).
 if(config.production&&config.origin.startsWith('https://'))app.use((_req,res,nextFn)=>{res.setHeader('Strict-Transport-Security','max-age=31536000');nextFn()});
 const apiOnly=process.argv.includes('--api-only');
 // One origin: the browser keeps /api paths and the session cookie scope.
 app.use('/api',api.app);app.get('/health',(req,res,nextFn)=>api.app(req,res,nextFn));
 let nextApp:ReturnType<typeof next>|undefined;
 if(apiOnly)app.use(api.app);
 else {
  // Server-side rendering reads public data directly in this process (no HTTP call to ourselves; see frontend/src/lib/api.ts).
  (globalThis as Record<symbol,unknown>)[SERVER_DATA_KEY]=api.readPublic;
  nextApp=next({dev,dir:resolve(root,'frontend'),hostname:'0.0.0.0',port:config.port,webpack:dev});
  await nextApp.prepare();const handler=nextApp.getRequestHandler();app.use((req,res)=>handler(req,res));
 }
 const server=createServer(app);server.requestTimeout=120000;server.headersTimeout=65000;
 server.listen(config.port,HOST,()=>{
  console.info(`Server listening on ${HOST}:${config.port}`);
  console.info(JSON.stringify({event:'server_ready',host:HOST,port:config.port,mode:apiOnly?'api':'combined',database_writes:config.writesAllowed?'enabled':'disabled (read-only)'}));
 });
 let closing=false;
 const shutdown=()=>{if(closing)return;closing=true;console.info(JSON.stringify({event:'shutdown_started'}));const timer=setTimeout(()=>{server.closeAllConnections();process.exit(1)},15000).unref();server.close(async()=>{try{await nextApp?.close();await db.close();clearTimeout(timer);process.exit(0)}catch{process.exit(1)}});server.closeIdleConnections()};
 process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
 // Log the kind of failure only; never the message, which could contain request or connection details.
 process.on('unhandledRejection',reason=>console.error(JSON.stringify({event:'unhandled_rejection',code:safeCode(reason)})));
 process.on('uncaughtException',error=>{console.error(JSON.stringify({event:'uncaught_exception',code:safeCode(error)}));shutdown()});
 server.on('error',()=>{console.error(JSON.stringify({event:'listen_failed'}));void db.close().finally(()=>process.exit(1))});
}
main().catch(error=>{
 // Configuration errors name the variable to fix and never contain values; anything else stays generic.
 const detail=error instanceof ConfigError?{message:error.message}:{hint:'Startup failed. Check the environment-variable names listed in docs/hostinger-node-deployment.md; secret values are never logged.',code:safeCode(error)};
 console.error(JSON.stringify({event:'startup_failed',...detail}));
 // Stay up on the platform's port and answer 503 with the same safe reason, instead of exiting: an exit makes the host restart the
 // app again and again (a restart loop uses up the account's process limit and hides the cause). Fix the setting and restart once.
 const port=Number(process.env.PORT)||3000;
 createServer((_req,res)=>{res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({status:'startup_failed',pid:process.pid,...detail}))})
  .on('error',()=>process.exit(1)).listen(port,HOST);
});
