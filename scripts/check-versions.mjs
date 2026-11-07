// Fails on runtime or dependency drift. Does not install or upgrade anything.
// Usage: node scripts/check-versions.mjs
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const runtime=read('runtime-lock.json'),lock=read('package-lock.json').packages;
const errors=[];
const check=(label,actual,expected)=>{if(actual!==expected)errors.push(`${label}: expected ${expected}, found ${actual}`)};
check('Node',process.versions.node,runtime.node);
check('npm',execFileSync('npm',['--version'],{encoding:'utf8',shell:process.platform==='win32'}).trim(),runtime.npm);
// npm workspaces hoist dependencies to the root node_modules unless a workspace needs a different version.
for(const workspace of ['.','backend','frontend']){
 const pkg=read(workspace+'/package.json'),prefix=workspace==='.'?'':workspace+'/';
 for(const group of ['dependencies','devDependencies','optionalDependencies'])for(const [name,version] of Object.entries(pkg[group]||{})){
  if(!/^\d+\.\d+\.\d+(-[\w.-]+)?$/.test(version))errors.push(`Floating version in ${workspace}: ${name}=${version}`);
  const entry=lock[prefix+'node_modules/'+name]||lock['node_modules/'+name];
  check(`${workspace}: ${name} lockfile`,entry?.version,version);
 }
}
for(const file of ['.node-version','.nvmrc'])check(file,readFileSync(resolve(root,file),'utf8').trim(),runtime.node);
if(errors.length){console.log(errors.join('\n'));process.exit(1)}
console.log('PASS: exact Node and npm versions, exact npm workspace dependencies matching package-lock.json.');
