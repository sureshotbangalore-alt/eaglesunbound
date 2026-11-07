import multer from 'multer';
import {randomBytes} from 'node:crypto';
import {S3Client,PutObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {type Response} from 'express';
import {type createRouter,response} from './core';
import {one,rows,insert,remove,audit} from './database';
import {fail} from './validation';
import type {Config} from './config';
export interface Storage {put(key:string,body:Buffer,mime:string):Promise<void>;delete(key:string):Promise<void>}
export function objectStorage(config:Config):Storage{const options=config.s3;const client=new S3Client({endpoint:options.endpoint,region:options.region,credentials:{accessKeyId:options.accessKeyId,secretAccessKey:options.secretAccessKey}});return {async put(key,body,mime){await client.send(new PutObjectCommand({Bucket:options.bucket,Key:key,Body:body,ContentType:mime,CacheControl:'public, max-age=31536000, immutable'}))},async delete(key){await client.send(new DeleteObjectCommand({Bucket:options.bucket,Key:key}))}}}
const parseUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024,files:1,fields:20,parts:22,fieldSize:128*1024}}).single('file');
export function registerMedia({route}:ReturnType<typeof createRouter>,storage?:Storage){
 route('get','/admin/media',async({db})=>response(await rows(db,'media_assets','',[],'ORDER BY created_at DESC')));
 route('post','/admin/media',async({db,user,body})=>{const data=body('MediaInput');if(data.mime_type==='video/youtube'){let host='';try{host=new URL(data.url).hostname}catch{}if(!['www.youtube.com','youtube.com','youtu.be'].includes(host))fail(422,'Use a YouTube URL')}const row=await insert(db,'media_assets',data);await audit(db,user!,'Added external media');return response(row,201)});
 route('post','/admin/media/upload',async({db,user,req,config})=>{
  await new Promise<void>((resolve,reject)=>parseUpload(req,{} as Response,error=>{if(error instanceof multer.MulterError){if(error.code==='LIMIT_FILE_SIZE')reject(Object.assign(new Error(),{status:413,detail:'Maximum upload size is 25 MB'}));else reject(Object.assign(new Error(),{status:422,detail:'Invalid multipart upload'}))}else error?reject(error):resolve()})).catch(error=>fail(error.status||422,error.detail||'Invalid multipart upload'));
  if(!req.file)fail(422,[{type:'missing',loc:['body','file'],msg:'Field required',input:null}]);
  const s3=config.s3;if(![s3.bucket,s3.accessKeyId,s3.secretAccessKey,s3.publicUrl].every(Boolean))fail(503,'Configure S3 storage and a public media URL before uploading. External HTTPS media links can be added now.');
  const allowed:Record<string,[string,Buffer|null]>={'image/jpeg':['.jpg',Buffer.from([255,216,255])],'image/png':['.png',Buffer.from([137,80,78,71,13,10,26,10])],'image/webp':['.webp',Buffer.from('RIFF')],'video/mp4':['.mp4',null],'video/webm':['.webm',Buffer.from([26,69,223,163])]};
  const mime=req.file.mimetype;const entry=allowed[mime];if(!entry)fail(422,'Supported formats: JPEG, PNG, WebP, MP4 and WebM');
  const content=req.file.buffer;const [extension,magic]=entry;if(!content.length||(magic&&!content.subarray(0,magic.length).equals(magic))||(mime==='video/mp4'&&content.subarray(4,8).toString()!=='ftyp')||(mime==='image/webp'&&content.subarray(8,12).toString()!=='WEBP'))fail(422,'File contents do not match the declared media format');
  const key='media/'+randomBytes(16).toString('hex')+extension;try{await (storage||objectStorage(config)).put(key,content,mime)}catch{fail(502,'Upload failed. Please try again.')}
  const row=await insert(db,'media_assets',{name:(req.file.originalname||'Upload').slice(0,180),url:s3.publicUrl+'/'+key,mime_type:mime});await audit(db,user!,'Uploaded media');return response(row,201);
 });
 route('delete','/admin/media/:record_id',async({db,user,req,config})=>{
  const id=String(req.params.record_id);const asset=await one(db,'media_assets','id=?',[id]);if(!asset)fail(404,'Asset not found');
  for(const table of ['programmes','activities','clients','gallery_albums','packages'])for(const row of await rows(db,table))if(row.image===asset.url||JSON.stringify(row.details).includes(asset.url))fail(409,'This asset is still used by website content. Remove those references first.');
  for(const row of await rows(db,'page_content'))if(JSON.stringify(row.content).includes(asset.url))fail(409,'This asset is used on a page.');
  for(const row of await rows(db,'site_settings'))if(JSON.stringify(row.value).includes(asset.url))fail(409,'This asset is used by site settings or metadata.');
  const prefix=config.s3.publicUrl+'/media/';if(config.s3.publicUrl&&config.s3.bucket&&asset.url.startsWith(prefix)){try{await (storage||objectStorage(config)).delete('media/'+asset.url.slice(prefix.length))}catch{fail(502,'Object storage deletion failed. The media record has been preserved.')}}
  await remove(db,'media_assets',id);await audit(db,user!,'Deleted unused media '+id);return response({ok:true});
 });
}
