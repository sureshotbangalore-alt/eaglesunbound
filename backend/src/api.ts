import express from 'express';
import type {Database} from './database';
import type {Config} from './config';
import {createRouter,errors} from './core';
import {registerContent} from './content';
import {registerRequests} from './requests';
import {registerMFA} from './mfa';
import {registerMedia,type Storage} from './media';
import {readOnlyDatabase} from './write-guard';
import {readPublic} from './public-data';
export async function createAPI(db:Database,config:Config,storage?:Storage){
 const app=express();app.disable('x-powered-by');app.set('trust proxy',config.trustProxy);
 // Defence in depth: unless ALLOW_DB_WRITES=true the database itself refuses anything that is not a read.
 const data=config.writesAllowed?db:readOnlyDatabase(db);const api=createRouter(data,config);registerContent(api);await registerRequests(api);registerMFA(api);registerMedia(api,storage);app.use(api.router);app.use((_req,res)=>res.status(404).json({detail:'Not Found'}));app.use(errors);return {app,limiter:api.limiter,readPublic:(path:string)=>readPublic(data,path)};
}
