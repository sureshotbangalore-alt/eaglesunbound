import contracts from './contracts.json';
import isEmail from 'validator/lib/isEmail';
import type {Row} from './database';
export class HttpError extends Error{constructor(public status:number,public detail:any='Not Found',public plain=false){super(typeof detail==='string'?detail:'Request validation failed')}}
export function fail(status:number,detail:any='Not Found'):never{throw new HttpError(status,detail)}
type Definition=Record<string,any>;
function issue(type:string,loc:(string|number)[],msg:string,input:any,ctx?:Row):never{throw new HttpError(422,[{type,loc,msg,...(type==='missing'?{}:{input}),...(ctx?{ctx}:{})}])}
function value(def:Definition,input:any,loc:(string|number)[],defs:Definition):any{
 if(def.$ref)return value(defs[def.$ref.split('/').pop()!],input,loc,defs);
 if(def.anyOf){if(input===null&&def.anyOf.some((x:Definition)=>x.type==='null'))return null;return value(def.anyOf.find((x:Definition)=>x.type!=='null'),input,loc,defs)}
 if('const' in def){if(input!==def.const&&!(def.const===true&&input===1))issue('literal_error',loc,'Input should be True',input,{expected:'True'});return def.const}
 if(def.enum&&!def.enum.includes(input))issue('literal_error',loc,'Input should be '+def.enum.map((x:string)=>`'${x}'`).join(', '),input,{expected:def.enum.map((x:string)=>`'${x}'`).join(', ')});
 if(def.type==='object'){
  if(typeof input!=='object'||input===null||Array.isArray(input))issue('dict_type',loc,'Input should be a valid dictionary',input);
  if(!def.properties)return input;
  const out:Row={};const errors:any[]=[];
  for(const [key,spec] of Object.entries(def.properties) as [string,Definition][]){try{if(!(key in input)){if('default'in spec)out[key]=structuredClone(spec.default);else if(def.required?.includes(key))issue('missing',[...loc,key],'Field required',undefined)}else out[key]=value(spec,input[key],[...loc,key],defs)}catch(e){if(e instanceof HttpError&&Array.isArray(e.detail))errors.push(...e.detail);else throw e}}
  if(errors.length)throw new HttpError(422,errors);return out;
 }
 if(def.type==='array'){if(!Array.isArray(input))issue('list_type',loc,'Input should be a valid list',input);if(def.maxItems!=null&&input.length>def.maxItems)issue('too_long',loc,`List should have at most ${def.maxItems} items after validation, not ${input.length}`,input,{field_type:'List',max_length:def.maxItems,actual_length:input.length});return input.map((x:any,i:number)=>value(def.items,x,[...loc,i],defs))}
 if(def.type==='boolean'){if(typeof input==='boolean')return input;if(input===0||input===1)return !!input;if(typeof input==='string'&&/^(true|false|yes|no|on|off|y|n|t|f|0|1)$/i.test(input))return /^(true|yes|on|y|t|1)$/i.test(input);issue('bool_parsing',loc,'Input should be a valid boolean, unable to interpret input',input)}
 if(def.type==='integer'){
  const v=typeof input==='boolean'?Number(input):typeof input==='number'?input:typeof input==='string'&&input.trim()!==''?Number(input):NaN;
  if(!Number.isFinite(v))issue('int_parsing',loc,'Input should be a valid integer, unable to parse string as an integer',input);
  if(!Number.isInteger(v))issue('int_from_float',loc,'Input should be a valid integer, got a number with a fractional part',input);
  if(def.minimum!=null&&v<def.minimum)issue('greater_than_equal',loc,`Input should be greater than or equal to ${def.minimum}`,input,{ge:def.minimum});
  if(def.maximum!=null&&v>def.maximum)issue('less_than_equal',loc,`Input should be less than or equal to ${def.maximum}`,input,{le:def.maximum});return v;
 }
 if(def.type==='string'){
  if(typeof input!=='string')issue('string_type',loc,'Input should be a valid string',input);
  const length=Array.from(input).length;
  if(def.minLength!=null&&length<def.minLength)issue('string_too_short',loc,`String should have at least ${def.minLength} characters`,input,{min_length:def.minLength});
  if(def.maxLength!=null&&length>def.maxLength)issue('string_too_long',loc,`String should have at most ${def.maxLength} characters`,input,{max_length:def.maxLength});
  // With the 'u' flag \d is already ASCII-only, so contract patterns are used unchanged.
  if(def.pattern&&!new RegExp(def.pattern,'u').test(input))issue('string_pattern_mismatch',loc,`String should match pattern '${def.pattern}'`,input,{pattern:def.pattern});
  if(def.format==='date'){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(input)||!Number.isFinite(Date.parse(input))||new Date(input+'T00:00:00Z').toISOString().slice(0,10)!==input)issue('date_from_datetime_parsing',loc,'Input should be a valid date or datetime, invalid date',input,{error:'invalid date'});
  }
  if(def.format==='email'){
   const email=input.trim();const at=email.lastIndexOf('@');const domain=email.slice(at+1).toLowerCase();
   if(!isEmail(email,{allow_utf8_local_part:true,require_tld:true,allow_ip_domain:false})||/\.(test|invalid|localhost|local|example|onion)$/i.test(domain))issue('value_error',loc,'value is not a valid email address',input,{reason:'Invalid email address'});
   return email.slice(0,at)+'@'+domain;
  }
 }
 return input;
}
export function validate(name:string,input:any):Row{
 const def=(contracts as Definition)[name];if(!def)throw Error('Unknown validation contract');
 const parsed=value(def,input,['body'],def.$defs||{});
 // Python default_factory fields are not represented in the exported JSON contracts.
 if(name==='ContentInput')parsed.details??={};
 if(name==='PageInput')parsed.sections??=[];
 const error=(field:string,message:string)=>issue('value_error',['body',field],'Value error, '+message,input[field],{error:{}});
 if(name==='Homepage'&&new Set(parsed.sections.map((x:Row)=>x.id)).size!==parsed.sections.length)error('sections','Each homepage section may appear only once');
 if(name==='Homepage'&&parsed.hero_video&&(!parsed.hero_video.startsWith('https://')||!parsed.hero_video.split('?')[0].match(/\.(mp4|webm)$/)))error('hero_video','Use an HTTPS MP4 or WebM video URL');
 if(name==='ContentInput'){
  if(parsed.details.testimonial_video&&!String(parsed.details.testimonial_video).startsWith('https://'))error('details','Testimonial videos must use an HTTPS URL');
  if(parsed.image&&!/^(\/assets\/|https:\/\/)/.test(parsed.image))error('image','Use a local /assets/ path or HTTPS image URL');
 }
 if(name==='ContactSettings'){
  for(const field of ['maps_url','business_profile_url','instagram','facebook','youtube'])if(parsed[field]&&!parsed[field].startsWith('https://'))error(field,'Use an HTTPS URL');
  if(parsed.email){try{value({type:'string',format:'email'},parsed.email,['body','email'],{})}catch{error('email','Invalid email address')}}
 }
 if(name==='SEOInput'){
  if(parsed.canonical){let valid=false;try{const u=new URL(parsed.canonical);valid=u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password&&!u.search&&!u.hash}catch{}if(!valid)error('canonical','Use a complete HTTPS canonical URL without a query or fragment')}
  if(parsed.image&&!/^(https:\/\/|\/assets\/)/.test(parsed.image))error('image','Use an HTTPS URL or /assets/ path');
 }
 if(name==='MediaInput'&&!parsed.url.startsWith('https://'))error('url','Use an HTTPS media URL');return parsed;
}
