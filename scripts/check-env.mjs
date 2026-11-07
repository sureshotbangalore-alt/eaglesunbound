// Runs at the start of `npm run build`. Fails early, with the NAME of whatever is wrong (never a value), instead of
// producing a site that breaks at runtime. It never touches the database and never prints environment values.
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const problems=[],notes=[];

// 1. Node version (Hostinger: 22.x).
const major=Number(process.versions.node.split('.')[0]);
if(major!==22)problems.push(`Node.js 22.x is required (this is ${process.versions.node}). Choose Node 22.x in the Hostinger Node.js settings.`);

// 2. Build tools must be installed (dev dependencies are needed to compile TypeScript and the site).
// (Checked by looking for the installed package files: some packages do not export their package.json to require().)
for(const [pkg,from] of [['typescript','backend'],['next','frontend'],['tailwindcss','frontend'],['@tailwindcss/postcss','frontend']]){
 const installed=[resolve(root,from,'node_modules',pkg,'package.json'),resolve(root,'node_modules',pkg,'package.json')].some(existsSync);
 if(!installed)problems.push(`The build tool "${pkg}" is not installed. Run "npm install" from the repository root without --omit=dev or NODE_ENV=production (the root .npmrc sets include=dev).`);
}

// 3. Public site address, baked into the site at build time (canonical links, sitemap, structured data, HSTS).
const siteSource=process.env.NEXT_PUBLIC_SITE_URL?'NEXT_PUBLIC_SITE_URL':process.env.CORS_ORIGINS?'CORS_ORIGINS':null;
if(!siteSource)problems.push('Set NEXT_PUBLIC_SITE_URL (or CORS_ORIGINS) to the public https address of the site, for example https://www.example.com.');
else{
 const first=(process.env.NEXT_PUBLIC_SITE_URL||process.env.CORS_ORIGINS.split(',')[0]).trim();
 try{const url=new URL(first);if(!['http:','https:'].includes(url.protocol)||url.pathname!=='/'||url.username||url.password)throw Error();if(url.protocol!=='https:')notes.push(`${siteSource} is not https: fine for local or staging builds, but production must use https.`)}
 catch{problems.push(`${siteSource} must be a plain origin such as https://www.example.com (no path, no credentials).`)}
}

// 4. NEXT_PUBLIC_* values are readable by every visitor: refuse names that look like secrets.
for(const name of Object.keys(process.env))if(/^NEXT_PUBLIC_/.test(name)&&/(PASSWORD|SECRET|TOKEN|PRIVATE|API_?KEY|CREDENTIAL)/i.test(name))problems.push(`${name} would be published to every visitor. Rename it without the NEXT_PUBLIC_ prefix.`);

// 5. Database settings are not needed to build; they are checked when the server starts. Mention what is missing.
const dbMissing=['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD'].filter(name=>!process.env[name]&&!process.env.DATABASE_URL);
if(dbMissing.length)notes.push(`Not set in this build environment (needed when the server starts): ${dbMissing.join(', ')}.`);
if(process.env.ALLOW_DB_WRITES!=='true')notes.push('ALLOW_DB_WRITES is not "true": the site will start in read-only mode (no bookings, enquiries, sign-in or CMS saving).');

for(const note of notes)console.log('note: '+note);
if(problems.length){console.error('\nBuild stopped. Fix these and build again:\n'+problems.map(p=>' - '+p).join('\n')+'\n');process.exit(1)}
console.log('Environment check passed (no database access, no values printed).');
