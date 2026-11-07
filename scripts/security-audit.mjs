// Non-invasive repository audit. Sends only locked npm package names and versions to OSV (api.osv.dev).
// Usage: node scripts/security-audit.mjs   (exit code 1 when anything needs attention)
import {readFileSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname,basename,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).split('\n').filter(Boolean);
const issues=[];
const secret=/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16}/;
// Reviewed and accepted: FX_BOOT (a constant script) and JSON-LD output with '<' escaped.
const risky=[[/\beval\s*\(/,'Dynamic code execution requires review'],[/new Function\s*\(/,'Dynamic code execution requires review'],[/shell\s*:\s*true/,'Shell execution requires review'],[/dangerouslySetInnerHTML/,'Raw HTML injection requires review']];
for(const name of files){
 const path=resolve(root,name);let stat;try{stat=statSync(path)}catch{continue}
 if(!stat.isFile()||stat.size>1_000_000||name.startsWith('.claude/'))continue;
 const file=basename(name);
 if(file.startsWith('.env')&&file!=='.env.example'&&!file.endsWith('.example'))issues.push({file:name,issue:'Environment file must not be committed'});
 if(!['.ts','.tsx','.mjs','.cjs','.json','.md','.yml','.yaml','.sql','.env','.example'].includes(extname(name)))continue;
 const source=readFileSync(path,'utf8');
 if(secret.test(source))issues.push({file:name,issue:'Possible embedded secret (value redacted)'});
 if(/^(backend\/src|frontend\/src)\//.test(name)&&/\.(ts|tsx)$/.test(name))source.split('\n').forEach((line,i)=>{for(const [pattern,issue] of risky)if(pattern.test(line)&&!(/^Raw HTML/.test(issue)&&/FX_BOOT|u003c/.test(line)))issues.push({file:name,line:i+1,issue})});
}
const lock=JSON.parse(readFileSync(resolve(root,'package-lock.json'),'utf8')).packages;
const queries=Object.entries(lock).filter(([k,v])=>k.includes('node_modules/')&&v.version).map(([k,v])=>({package:{name:k.split('node_modules/').pop(),ecosystem:'npm'},version:v.version}));
const advisories=[];let scanError=null;
try{
 for(let i=0;i<queries.length;i+=500){
  const chunk=queries.slice(i,i+500);
  const response=await fetch('https://api.osv.dev/v1/querybatch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({queries:chunk}),signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw Error('status '+response.status);
  (await response.json()).results.forEach((r,n)=>{if(r.vulns?.length)advisories.push({package:chunk[n].package.name,version:chunk[n].version,ids:r.vulns.map(v=>v.id)})});
 }
}catch(error){scanError=error.name+': dependency scan could not complete'}
console.log(JSON.stringify({static_issues:issues,npm_advisories:advisories,scan_error:scanError,packages_checked:queries.length,scope:'Source patterns and locked npm packages. Run npm audit as well. This is not a penetration-test certification.'},null,2));
process.exit(issues.length||advisories.length||scanError?1:0);
