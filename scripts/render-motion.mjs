// Renders the site's motion-graphics videos: deterministic SVG scenes -> PNG frames -> ffmpeg (MP4 + WebM + poster).
// Usage: node scripts/render-motion.mjs [scene ...]   (default: all scenes)
// Needs @playwright/test's Chromium and ffmpeg on PATH. Output: frontend/public/assets/video/motion/
import {createRequire} from 'node:module';
const {chromium} = createRequire(import.meta.url.replace('/scripts/', '/frontend/'))('@playwright/test');
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'frontend/public/assets');
const out = join(assets, 'video/motion');
const FPS = 30, W = 1280, H = 720;
const font = f => 'data:font/ttf;base64,' + readFileSync(join(assets, f)).toString('base64');
const logoData = 'data:image/png;base64,' + readFileSync(join(assets, 'eagles-unbound-logo.png')).toString('base64');

// name, duration (s), poster time (s), background
const scenes = {
  'brand-reveal': {seconds: 6, poster: 4.6, bg: '#f5f3ed'},
  'bootcamp-route': {seconds: 8, poster: 7.0, bg: '#111619'},
  'activity-lines': {seconds: 8, poster: 6.0, bg: '#111619'},
  'academy-intro': {seconds: 8, poster: 6.6, bg: '#0c1411'},
  'eagle-flight': {seconds: 6, poster: 4.4, bg: '#0c1411'},
  'activity-reel': {seconds: 12, poster: 6.9, bg: '#0c1411'},
};

const html = (scene, bg) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:'Barlow Condensed';font-weight:700;src:url(${font('font-1.ttf')})}
@font-face{font-family:'Barlow Condensed';font-weight:600;src:url(${font('font-0.ttf')})}
html,body{margin:0;background:${bg};overflow:hidden}svg{display:block}
text{font-family:'Barlow Condensed',Impact,sans-serif;font-weight:700}</style>
<svg id="s" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"></svg>
<script>
const W=${W},H=${H},NS='http://www.w3.org/2000/svg',svg=document.getElementById('s'),LOGO='${logoData}',SCENE='${scene}';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),prog=(t,a,b)=>clamp((t-a)/(b-a));
const easeOut=x=>1-Math.pow(1-x,3),easeInOut=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const el=(n,a={},p=svg)=>{const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);p.appendChild(e);return e};
const INK='#111619',CREAM='#f5f3ed',RED='#d3312e',STEEL='#788387';
// Topographic contour rings that drift on a loop-safe phase.
function contours(g,cx,cy,count,color,opacity,width){
  const rings=[];for(let i=0;i<count;i++)rings.push(el('path',{fill:'none',stroke:color,'stroke-opacity':opacity*(1-i/(count*1.4)),'stroke-width':width},g));
  return (t,T)=>{const ph=2*Math.PI*t/T;rings.forEach((p,i)=>{const r=60+i*46;let d='';for(let k=0;k<=96;k++){const a=k/96*2*Math.PI;
    const w=1+.10*Math.sin(3*a+i*.7+ph)+.06*Math.sin(5*a-i*.5-ph)+.04*Math.sin(2*a+i*.3+2*ph);
    const x=cx+r*1.55*w*Math.cos(a),y=cy+r*w*Math.sin(a);d+=(k?'L':'M')+x.toFixed(1)+','+y.toFixed(1)}p.setAttribute('d',d+'Z')})}}
const scenes={
'brand-reveal'(){
  const T=6,bg=el('g'),c=contours(bg,640,380,15,INK,.16,1.2);
  const rule=el('rect',{x:640-200,y:470,width:400,height:3,fill:RED});
  const logo=el('image',{href:LOGO,x:640-266,y:360-102-20,width:532,height:204});
  const tag=el('text',{x:640,y:530,'text-anchor':'middle','font-size':26,'letter-spacing':7,fill:INK},svg);tag.textContent='ONE DESTINATION. ENDLESS ADVENTURES.';
  return t=>{c(t,T*1.5);bg.setAttribute('opacity',.35+.65*easeOut(prog(t,0,1.6)));
    const lp=easeOut(prog(t,.5,2.2));logo.setAttribute('opacity',lp);logo.setAttribute('transform','translate(640 360) scale('+(1.035-.035*lp)+') translate(-640 -360)');
    const rp=easeInOut(prog(t,1.6,2.9));rule.setAttribute('width',400*rp);rule.setAttribute('x',640-200*rp);rule.setAttribute('opacity',1);
    tag.setAttribute('opacity',easeOut(prog(t,2.6,3.8)));tag.setAttribute('transform','translate(0 '+(10*(1-easeOut(prog(t,2.6,3.8))))+')')}
},
'bootcamp-route'(){
  const T=8,bg=el('g'),c=contours(bg,760,380,16,STEEL,.28,1);
  const grid=el('g');for(let x=0;x<=W;x+=80)el('line',{x1:x,y1:0,x2:x,y2:H,stroke:CREAM,'stroke-opacity':.04},grid);for(let y=0;y<=H;y+=80)el('line',{x1:0,y1:y,x2:W,y2:y,stroke:CREAM,'stroke-opacity':.04},grid);
  const d='M150,540 C270,540 300,320 440,320 S650,470 780,450 S960,210 1110,210';
  const base=el('path',{d,fill:'none',stroke:CREAM,'stroke-opacity':.12,'stroke-width':3,'stroke-dasharray':'2 10','stroke-linecap':'round'});
  const route=el('path',{d,fill:'none',stroke:RED,'stroke-width':5,'stroke-linecap':'round'});const L=route.getTotalLength();route.setAttribute('stroke-dasharray',L+' '+L);
  const pts=[[150,540,'PREPARE',0],[440,320,'CHALLENGE',0],[780,450,'COLLABORATE',1],[1110,210,'OVERCOME',0]].map(([x,y,n,below],i)=>{
    let lo=0,hi=L;for(let k=0;k<30;k++){const m=(lo+hi)/2;route.getPointAtLength(m).x<x-.5?lo=m:hi=m}
    const g=el('g',{transform:'translate('+x+' '+y+')'});const ring=el('circle',{r:12,fill:'none',stroke:RED,'stroke-width':2},g),dot=el('circle',{r:7,fill:CREAM},g);
    const num=el('text',{x:0,y:below?44:-34,'text-anchor':'middle','font-size':16,'letter-spacing':4,fill:RED},g);num.textContent='STAGE 0'+(i+1);
    const lab=el('text',{x:0,y:below?76:-58,'text-anchor':'middle','font-size':34,'letter-spacing':3,fill:CREAM},g);lab.textContent=n;return {g,ring,dot,num,lab,at:lo/L}});
  const head=el('circle',{r:6,fill:CREAM});
  return t=>{c(t,T);const fin=prog(t,0,.6),fout=1-prog(t,7.2,8),a=fin*fout;svg.setAttribute('opacity',a);
    const p=easeInOut(prog(t,.7,6.2));route.setAttribute('stroke-dashoffset',L*(1-p));const pt=route.getPointAtLength(L*p);head.setAttribute('cx',pt.x);head.setAttribute('cy',pt.y);head.setAttribute('opacity',p>0&&p<1?1:0);
    pts.forEach(s=>{const k=easeOut(prog(p,s.at-.08,s.at));s.g.setAttribute('opacity',k);s.dot.setAttribute('r',7*k);const pulse=prog(t-(.7+5.5*s.at),0,1.1);s.ring.setAttribute('r',12+30*easeOut(pulse)*(pulse<1&&k>0?1:0));s.ring.setAttribute('stroke-opacity',pulse<1&&k>0?1-pulse:0)})}
},
'activity-lines'(){
  const T=8,bg=el('g'),c=contours(bg,640,360,14,STEEL,.2,1);
  const panels=[250,640,1030].map(x=>el('g',{transform:'translate('+x+' 300)'}));
  const label=(g,s)=>{const t=el('text',{x:0,y:210,'text-anchor':'middle','font-size':30,'letter-spacing':6,fill:CREAM},g);t.textContent=s};
  // Zip line
  const z=panels[0];label(z,'ZIP LINE');const cable=el('line',{x1:-150,y1:-120,x2:150,y2:60,stroke:CREAM,'stroke-width':2.5},z);
  el('rect',{x:-158,y:-170,width:8,height:130,fill:STEEL},z);el('rect',{x:150,y:10,width:8,height:130,fill:STEEL},z);
  const trail=el('line',{x1:-150,y1:-120,x2:-150,y2:-120,stroke:RED,'stroke-width':3},z);const rider=el('g',{},z);
  el('rect',{x:-9,y:-6,width:18,height:12,rx:3,fill:RED},rider);el('line',{x1:0,y1:6,x2:0,y2:44,stroke:CREAM,'stroke-width':2.5},rider);el('circle',{cx:0,cy:52,r:9,fill:CREAM},rider);
  // Wall climb
  const w=panels[1];label(w,'WALL CLIMB');el('rect',{x:-130,y:-170,width:260,height:340,rx:4,fill:'none',stroke:CREAM,'stroke-opacity':.5,'stroke-width':2},w);
  for(let i=1;i<4;i++)el('line',{x1:-130+i*65,y1:-170,x2:-130+i*65,y2:170,stroke:CREAM,'stroke-opacity':.08},w);for(let i=1;i<5;i++)el('line',{x1:-130,y1:-170+i*68,x2:130,y2:-170+i*68,stroke:CREAM,'stroke-opacity':.08},w);
  const holds=[[-70,140],[-20,100],[40,60],[0,10],[-60,-30],[-10,-80],[50,-120]];const wl=el('polyline',{fill:'none',stroke:RED,'stroke-width':3,'stroke-linejoin':'round'},w);
  const hs=holds.map(([x,y])=>({c:el('circle',{cx:x,cy:y,r:9,fill:'none',stroke:CREAM,'stroke-opacity':.55,'stroke-width':2},w),x,y}));const me=el('circle',{r:8,fill:CREAM},w);
  // Rope bridge
  const r=panels[2];label(r,'ROPE COURSE');el('rect',{x:-162,y:-60,width:8,height:200,fill:STEEL},r);el('rect',{x:154,y:-60,width:8,height:200,fill:STEEL},r);
  const rope=el('path',{fill:'none',stroke:CREAM,'stroke-width':2.5,'stroke-linecap':'round'},r),planks=[];for(let i=0;i<13;i++)planks.push(el('line',{stroke:RED,'stroke-width':4,'stroke-linecap':'round'},r));
  return t=>{c(t,T);const a=prog(t,0,.6)*(1-prog(t,7.3,8));svg.setAttribute('opacity',a);
    const zp=easeInOut(prog(t,.8,6.2)),zx=-150+300*zp,zy=-120+180*zp;rider.setAttribute('transform','translate('+zx+' '+zy+')');trail.setAttribute('x2',zx);trail.setAttribute('y2',zy);
    const step=(t-1)/.8,n=clamp(Math.floor(step)+1,0,holds.length);const lit=holds.slice(0,n);wl.setAttribute('points',lit.map(h=>h.join(',')).join(' '));
    hs.forEach((h,i)=>{h.c.setAttribute('fill',i<n?RED:'none');h.c.setAttribute('stroke',i<n?RED:CREAM)});
    const cur=clamp(step,0,holds.length-1),i0=Math.floor(cur),i1=Math.min(holds.length-1,i0+1),f=easeInOut(cur-i0);me.setAttribute('cx',holds[i0][0]+(holds[i1][0]-holds[i0][0])*f);me.setAttribute('cy',holds[i0][1]+(holds[i1][1]-holds[i0][1])*f);me.setAttribute('opacity',t>.9&&t<7?1:0);
    const sway=x=>(Math.sin(2*Math.PI*(x/330-t/4))*7+Math.sin(2*Math.PI*(x/330+t/8))*3)*Math.sin(Math.PI*(x+158)/316);
    const yAt=x=>-60+16+70*(1-Math.pow((x/158),2))*.55+sway(x);let dd='';for(let k=0;k<=40;k++){const x=-158+316*k/40;dd+=(k?'L':'M')+x+','+yAt(x)}rope.setAttribute('d',dd);
    planks.forEach((p,i)=>{const x=-135+270*i/12,y=yAt(x);p.setAttribute('x1',x);p.setAttribute('x2',x);p.setAttribute('y1',y-6);p.setAttribute('y2',y+6)})}
},
'academy-intro'(){
  // Dusk firing range: a scope sweeps in, locks on three targets in turn, scores, then the title reveals.
  const T=8,GOLD='#c2a46e';
  const defs=el('defs');
  defs.innerHTML='<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1411"/><stop offset=".55" stop-color="#2c3a2c"/><stop offset="1" stop-color="#b98450"/></linearGradient>'+
    '<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>'+
    '<mask id="lens"><rect width="1280" height="720" fill="#fff"/><circle id="hole" cx="640" cy="360" r="210" fill="#000"/></mask>';
  el('rect',{x:0,y:0,width:W,height:H,fill:'url(#sky)'});
  el('path',{fill:'#18221c',d:'M0,470 C160,420 260,450 380,430 S600,380 760,420 S1020,370 1280,410 L1280,720 L0,720Z'});
  el('rect',{x:0,y:470,width:W,height:250,fill:'#2e3427'});
  for(let i=-5;i<=5;i++)el('line',{x1:640+i*60,y1:470,x2:640+i*260,y2:720,stroke:CREAM,'stroke-opacity':.08,'stroke-width':1.5});
  const targets=[[330,430,46],[700,400,36],[1010,445,52]].map(([x,y,r])=>{const g=el('g',{transform:'translate('+x+' '+y+')'});
    el('line',{x1:0,y1:r,x2:0,y2:r+60,stroke:'#2a2a22','stroke-width':4},g);
    [[1,CREAM],[.8,INK],[.62,CREAM],[.45,RED],[.28,CREAM],[.14,RED]].forEach(([k,c])=>el('circle',{r:r*k,fill:c},g));
    const ring=el('circle',{r:r,fill:'none',stroke:'#ffd36b','stroke-width':4,opacity:0},g);
    const pts=el('text',{x:0,y:-r-18,'text-anchor':'middle','font-size':34,fill:'#ffd36b',opacity:0},g);pts.textContent='+10';return {g,x,y,r,ring,pts}});
  const dark=el('rect',{x:0,y:0,width:W,height:H,fill:'#050806',mask:'url(#lens)'});
  const scope=el('g');el('circle',{r:210,fill:'none',stroke:INK,'stroke-width':10},scope);el('circle',{r:210,fill:'none',stroke:GOLD,'stroke-width':2,'stroke-opacity':.7},scope);
  el('path',{d:'M-210,0H-24M24,0H210M0,-210V-24M0,24V210',stroke:INK,'stroke-width':3},scope);
  for(let i=-4;i<=4;i++)if(i)el('line',{x1:i*22,y1:-6,x2:i*22,y2:6,stroke:INK,'stroke-width':2},scope);
  el('circle',{r:3,fill:RED},scope);const lock=el('circle',{r:30,fill:'none',stroke:RED,'stroke-width':3,opacity:0},scope);
  const hole=document.getElementById('hole');
  el('rect',{x:0,y:0,width:W,height:H,fill:'url(#vig)'});
  const title=el('g',{opacity:0});const t1=el('text',{x:640,y:330,'text-anchor':'middle','font-size':120,'letter-spacing':6,fill:CREAM},title);t1.textContent='SHOOTING ACADEMY';
  const t2=el('text',{x:640,y:395,'text-anchor':'middle','font-size':30,'letter-spacing':12,fill:GOLD},title);t2.textContent='STEADY HANDS · SHARP EYES';
  const bar=el('rect',{x:640,y:420,width:0,height:4,fill:RED},title);
  const way=[[120,250],[targets[0].x,targets[0].y],[targets[1].x,targets[1].y],[targets[2].x,targets[2].y],[640,360]];
  const times=[0,1.3,2.6,3.9,5.3];
  return t=>{
    let k=times.length-2;for(let i=0;i<times.length-1;i++)if(t<times[i+1]){k=i;break}
    const f=easeInOut(prog(t,times[k]+.25,times[k+1]));const x=way[k][0]+(way[k+1][0]-way[k][0])*f,y=way[k][1]+(way[k+1][1]-way[k][1])*f;
    const zoom=1-.06*Math.sin(Math.PI*prog(t,0,1));scope.setAttribute('transform','translate('+x+' '+y+') scale('+zoom+')');hole.setAttribute('cx',x);hole.setAttribute('cy',y);
    const open=1-easeInOut(prog(t,5.4,6.2));dark.setAttribute('opacity',open);scope.setAttribute('opacity',open);hole.setAttribute('r',210+700*(1-open));
    targets.forEach((tg,i)=>{const hit=times[i+1];const h=prog(t,hit,hit+.6);
      tg.ring.setAttribute('opacity',h>0&&h<1?1-h:0);tg.ring.setAttribute('r',tg.r*(1+h*.9));
      tg.pts.setAttribute('opacity',h>0?Math.max(0,1-prog(t,hit+.5,hit+1.1)):0);tg.pts.setAttribute('transform','translate(0 '+(-30*easeOut(h))+')');
      tg.g.setAttribute('transform','translate('+tg.x+' '+tg.y+') scale(1,'+(h>0?Math.max(.08,1-easeInOut(prog(t,hit+.15,hit+.45))*.92):1)+')')});
    const near=targets.some((tg,i)=>Math.abs(t-(times[i+1]-.15))<.3);lock.setAttribute('opacity',near?1:0);lock.setAttribute('r',near?30-10*Math.sin(t*20):30);
    const tp=easeOut(prog(t,6,7));title.setAttribute('opacity',tp*(1-prog(t,7.6,8)));title.setAttribute('transform','translate(0 '+(16*(1-tp))+')');
    const bp=easeInOut(prog(t,6.3,7.2));bar.setAttribute('width',360*bp);bar.setAttribute('x',640-180*bp);
    svg.setAttribute('opacity',prog(t,0,.4)*(1-prog(t,7.6,8)));}
},
'eagle-flight'(){
  // A stylised eagle glides over layered ridgelines, drawing an expedition route behind it. No text: it sits behind page headings.
  const T=6,GOLD='#c2a46e';const defs=el('defs');
  defs.innerHTML='<linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1411"/><stop offset=".6" stop-color="#22301f"/><stop offset="1" stop-color="#a5713f"/></linearGradient>';
  el('rect',{width:W,height:H,fill:'url(#dusk)'});
  const sun=el('circle',{cx:930,cy:470,r:110,fill:'#e7b46a',opacity:.35});
  const ridge=(y,amp,color,seed)=>{let d='M-200,'+H;for(let x=-200;x<=W+520;x+=16)d+=' L'+x+','+(y-amp*(Math.sin(x/170+seed)*.6+Math.sin(x/61+seed*2)*.25+Math.sin(x/23+seed)*.08));return el('path',{d:d+' L'+(W+520)+','+H+'Z',fill:color})};
  const far=ridge(470,60,'#1d2a22',1),mid=ridge(540,70,'#151f19',3),near=ridge(620,50,'#0e1612',5);
  const route=el('path',{fill:'none',stroke:RED,'stroke-width':3,'stroke-dasharray':'10 8','stroke-linecap':'round'});
  const bird=el('g');
  const wingBack=el('path',{fill:'#cfc8b8'},bird);
  el('path',{d:'M-46,0 C-20,-10 20,-10 46,-2 L60,0 L46,4 C20,10 -20,8 -46,0Z',fill:CREAM},bird);
  el('path',{d:'M-46,0 L-70,-12 L-64,0 L-70,12Z',fill:CREAM},bird);el('path',{d:'M46,-3 L64,1 L46,5Z',fill:GOLD},bird);
  const wingFront=el('path',{fill:CREAM},bird);
  const wing=lift=>{const tip=-(70+34*lift),mid=-(38+18*lift);return 'M-14,0 C-4,'+mid+' 20,'+tip+' 34,'+(tip*1.05)+' L22,'+(tip*.62)+' L28,'+(tip*.72)+' L14,'+(tip*.4)+' L18,'+(tip*.48)+' L4,'+(mid*.4)+' L22,0Z'};
  const title=el('text',{x:640,y:160,'text-anchor':'middle','font-size':84,'letter-spacing':10,fill:CREAM,opacity:0});title.textContent='';
  const sub=el('text',{x:640,y:205,'text-anchor':'middle','font-size':26,'letter-spacing':9,fill:GOLD,opacity:0});sub.textContent='';
  const pathAt=u=>({x:-120+1230*u,y:380-130*Math.sin(Math.PI*u)+26*Math.sin(u*9)});
  return t=>{const u=easeInOut(prog(t,.2,5.4));const p=pathAt(u),q=pathAt(Math.min(1,u+.01));
    let d='';for(let k=0;k<=60;k++){const pt=pathAt(u*k/60);d+=(k?'L':'M')+pt.x.toFixed(1)+','+(pt.y+34).toFixed(1)}route.setAttribute('d',d);
    const glide=prog(t,2.2,3.0)*(1-prog(t,3.6,4.2));const f=Math.sin(t*2*Math.PI*1.6)*(1-glide*.85);
    wingFront.setAttribute('d',wing(f));wingBack.setAttribute('d',wing(-f*.6));wingBack.setAttribute('transform','translate(-6 2) scale(.92 .8)');
    bird.setAttribute('transform','translate('+p.x+' '+p.y+') rotate('+(Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI)+') scale(1.2)');
    far.setAttribute('transform','translate('+(-20*t)+' 0)');mid.setAttribute('transform','translate('+(-45*t)+' 0)');near.setAttribute('transform','translate('+(-80*t)+' 0)');
    sun.setAttribute('opacity',.25+.15*prog(t,0,6));
    const tp=easeOut(prog(t,3.6,4.6));title.setAttribute('opacity',tp);sub.setAttribute('opacity',easeOut(prog(t,4.1,5)));title.setAttribute('transform','translate(0 '+(14*(1-tp))+')');
    svg.setAttribute('opacity',prog(t,0,.4)*(1-prog(t,5.6,6)));}
},
'activity-reel'(){
  // 12 s reel in four chapters: zip line, wall climb, archery, rope course, then an end card. Stylised figures, no footage.
  const T=12,GOLD='#c2a46e',NAVY='#1d3f8c',SKY1='#0c1411',SKY2='#25351f',DUSK='#b98450';
  const defs=el('defs');
  defs.innerHTML='<linearGradient id="rsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+SKY1+'"/><stop offset=".62" stop-color="'+SKY2+'"/><stop offset="1" stop-color="'+DUSK+'"/></linearGradient>'+
   '<radialGradient id="rsun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffb46a" stop-opacity="0"/></radialGradient>'+
   '<linearGradient id="rwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f33"/><stop offset="1" stop-color="#262b22"/></linearGradient>';
  const CH=[{name:'ZIP LINE',sub:'FLY THE VALLEY',a:0,b:2.8},{name:'WALL CLIMB',sub:'REACH HIGHER',a:2.8,b:5.6},{name:'ARCHERY',sub:'FIND YOUR FOCUS',a:5.6,b:8.4},{name:'ROPE COURSE',sub:'TRUST THE TEAM',a:8.4,b:11}];
  const ridge=(g,y,amp,color,seed,w=W*2)=>{let d='M0,'+H;for(let x=0;x<=w;x+=14)d+=' L'+x+','+(y-amp*(Math.sin(x/170+seed)*.6+Math.sin(x/61+seed*2)*.25+Math.sin(x/23+seed)*.08));return el('path',{d:d+' L'+w+','+H+'Z',fill:color},g)};
  const tree=(g,x,y,s,c='#0e1612')=>el('path',{d:\`M\${x},\${y} l\${-14*s},\${30*s} h\${8*s} l\${-12*s},\${26*s} h\${12*s} v\${12*s} h\${12*s} v\${-12*s} h\${12*s} l\${-12*s},\${-26*s} h\${8*s}Z\`,fill:c},g);
  // person: returns setter pose({x,y,rot,arms:[[a1,a2],[a1,a2]],legs:[[a1,a2],[a1,a2]]}) angles in degrees from straight down
  function person(g,color=CREAM,scale=1){
    const root=el('g',{},g);const parts={};
    parts.legs=[0,1].map(()=>[el('line',{stroke:color,'stroke-width':7*scale,'stroke-linecap':'round'},root),el('line',{stroke:color,'stroke-width':6*scale,'stroke-linecap':'round'},root)]);
    parts.torso=el('line',{stroke:color,'stroke-width':9*scale,'stroke-linecap':'round'},root);
    parts.arms=[0,1].map(()=>[el('line',{stroke:color,'stroke-width':6*scale,'stroke-linecap':'round'},root),el('line',{stroke:color,'stroke-width':5*scale,'stroke-linecap':'round'},root)]);
    parts.head=el('circle',{r:11*scale,fill:color},root);parts.helmet=el('path',{fill:RED},root);
    const seg=(line,x,y,deg,len)=>{const r=deg*Math.PI/180,x2=x+Math.sin(r)*len,y2=y+Math.cos(r)*len;line.setAttribute('x1',x);line.setAttribute('y1',y);line.setAttribute('x2',x2);line.setAttribute('y2',y2);return [x2,y2]};
    return p=>{const s=scale;root.setAttribute('transform',\`translate(\${p.x} \${p.y}) rotate(\${p.rot||0})\`);
      const hip=[0,0],neck=[0,-44*s];seg(parts.torso,0,0,180,44*s);
      parts.head.setAttribute('cx',0);parts.head.setAttribute('cy',-58*s);parts.helmet.setAttribute('d',\`M\${-12*s},\${-60*s} a\${12*s},\${12*s} 0 0 1 \${24*s},0 Z\`);
      p.legs.forEach((l,i)=>{const [kx,ky]=seg(parts.legs[i][0],hip[0],hip[1],l[0],26*s);seg(parts.legs[i][1],kx,ky,l[1],26*s)});
      p.arms.forEach((a,i)=>{const [ex,ey]=seg(parts.arms[i][0],neck[0],neck[1]+4*s,a[0],22*s);seg(parts.arms[i][1],ex,ey,a[1],22*s)});}
  }
  const bg=el('rect',{width:W,height:H,fill:'url(#rsky)'});
  const sun=el('circle',{cx:960,cy:420,r:200,fill:'url(#rsun)'});
  const scenes=CH.map(()=>el('g',{opacity:0}));

  // ---- 1. ZIP LINE
  const z=scenes[0];const zfar=ridge(z,430,70,'#1d2a22',1),zmid=ridge(z,520,80,'#151f19',3);
  const ztrees=el('g',{},z);for(let i=0;i<26;i++)tree(ztrees,i*110+rand(i)*40,560+rand(i+3)*40,1.2+rand(i+7)*.6);
  el('line',{x1:60,y1:110,x2:1240,y2:600,stroke:CREAM,'stroke-width':3},z);
  el('rect',{x:40,y:90,width:14,height:420,fill:'#5a5a46'},z);
  const zspeed=el('g',{},z);const zl=[0,1,2,3,4].map(i=>el('line',{stroke:CREAM,'stroke-opacity':.5,'stroke-width':2,'stroke-linecap':'round'},zspeed));
  const zrider=el('g',{},z);el('rect',{x:-16,y:-8,width:32,height:14,rx:4,fill:RED},zrider);el('line',{x1:0,y1:6,x2:0,y2:30,stroke:'#888',"stroke-width":2},zrider);
  const zpose=person(el('g',{transform:'translate(0 120)'},zrider),CREAM,1.45);
  // ---- 2. WALL CLIMB
  const w=scenes[1];const wcam=el('g',{},w);
  ridge(wcam,620,60,'#151f19',6);
  el('rect',{x:470,y:-640,width:340,height:1300,fill:'url(#rwall)',stroke:'#5b6150','stroke-width':3},wcam);
  for(let y=-620;y<640;y+=80)el('line',{x1:470,y1:y,x2:810,y2:y,stroke:'#fff','stroke-opacity':.05},wcam);
  const holdsXY=[];for(let i=0;i<16;i++){const x=520+((i*137)%240),y=600-i*78;holdsXY.push([x,y]);el('circle',{cx:x,cy:y,r:9+(i%3)*3,fill:[RED,GOLD,'#5ab0d6','#7fd18b'][i%4]},wcam)}
  el('line',{x1:640,y1:-640,x2:640,y2:640,stroke:GOLD,'stroke-width':2,'stroke-dasharray':'2 6'},wcam);
  const flag=el('g',{transform:'translate(800 -620)'},wcam);el('rect',{x:0,y:0,width:5,height:70,fill:CREAM},flag);const flagCloth=el('path',{fill:RED},flag);
  const climber=el('g',{},wcam);const cpose=person(climber,CREAM,1.5);
  // ---- 3. ARCHERY
  const a=scenes[2];ridge(a,520,50,'#1b271f',2);el('rect',{x:0,y:520,width:W,height:200,fill:'#2e3427'},a);
  for(let i=-6;i<=6;i++)el('line',{x1:640+i*50,y1:520,x2:640+i*240,y2:720,stroke:CREAM,'stroke-opacity':.06},a);
  const target=el('g',{transform:'translate(1040 430)'},a);el('rect',{x:-6,y:60,width:12,height:120,fill:'#3a2c1c'},target);
  const rings=[[90,CREAM],[74,INK],[58,CREAM],[42,RED],[26,CREAM],[12,RED]].map(([r,c])=>el('circle',{r,fill:c},target));
  const burst=el('circle',{r:90,fill:'none',stroke:'#ffd36b','stroke-width':5,opacity:0},target);
  const archer=el('g',{transform:'translate(250 448)'},a);const apose=person(archer,CREAM,1.7);
  const bow=el('path',{fill:'none',stroke:GOLD,'stroke-width':5,'stroke-linecap':'round'},archer);const string=el('polyline',{fill:'none',stroke:CREAM,'stroke-width':1.5},archer);
  const arrow=el('g',{},a);el('line',{x1:-60,y1:0,x2:0,y2:0,stroke:'#c9a77a','stroke-width':4},arrow);el('path',{d:'M8,0 L-6,-7 L-6,7Z',fill:CREAM},arrow);el('path',{d:'M-52,0 L-66,-10 L-60,0 L-66,10Z',fill:RED},arrow);
  const trail=el('line',{stroke:'#ffd36b','stroke-width':3,'stroke-opacity':.6,'stroke-linecap':'round'},a);
  const bull=el('text',{x:1040,y:300,'text-anchor':'middle','font-size':72,'letter-spacing':6,fill:'#ffd36b',stroke:'#0c1411','stroke-width':2,opacity:0},a);bull.textContent='BULLSEYE';
  // ---- 4. ROPE COURSE
  const r=scenes[3];ridge(r,470,60,'#1d2a22',4);ridge(r,560,70,'#151f19',8);
  const rtrees=el('g',{},r);for(let i=0;i<14;i++)tree(rtrees,i*100,600+rand(i+11)*30,1.3);
  [[150,'L'],[1130,'R']].forEach(([x])=>{el('rect',{x:x-12,y:300,width:24,height:420,fill:'#5a4a33'},r);el('rect',{x:x-60,y:290,width:120,height:14,fill:'#7a6446'},r)});
  const ropeTop=el('path',{fill:'none',stroke:CREAM,'stroke-width':3},r),ropeLow=el('path',{fill:'none',stroke:CREAM,'stroke-width':3,'stroke-opacity':.6},r);
  const planks=[];for(let i=0;i<22;i++)planks.push(el('line',{stroke:'#c9a77a','stroke-width':7,'stroke-linecap':'round'},r));
  const walker=el('g',{},r);const wpose=person(walker,CREAM,1.4);const pole=el('line',{stroke:GOLD,'stroke-width':4,'stroke-linecap':'round'},walker);
  const meter=el('text',{x:640,y:250,'text-anchor':'middle','font-size':26,'letter-spacing':8,fill:GOLD},r);
  // ---- titles, progress, wipe, end card
  const num=el('text',{x:70,y:150,'font-size':150,fill:CREAM,'fill-opacity':.12});
  const title=el('text',{x:70,y:640,'font-size':92,'letter-spacing':4,fill:CREAM});const sub=el('text',{x:74,y:678,'font-size':24,'letter-spacing':10,fill:GOLD});
  const bars=CH.map((c,i)=>{el('rect',{x:70+i*150,y:40,width:136,height:4,fill:CREAM,'fill-opacity':.2});return el('rect',{x:70+i*150,y:40,width:0,height:4,fill:RED})});
  const wipe=el('rect',{x:0,y:0,width:W,height:H,fill:RED}),wipe2=el('rect',{x:0,y:0,width:W,height:H,fill:INK});
  const end=el('g',{opacity:0});el('rect',{width:W,height:H,fill:CREAM},end);contours(el('g',{},end),640,360,10,INK,.12,1.2)(0,1);
  el('image',{href:LOGO,x:640-266,y:200,width:532,height:204},end);
  const et=el('text',{x:640,y:500,'text-anchor':'middle','font-size':54,'letter-spacing':8,fill:INK},end);et.textContent='PICK YOUR CHALLENGE';
  el('rect',{x:540,y:525,width:200,height:4,fill:RED},end);
  function rand(i){return (Math.sin(i*12.9898)*43758.5453)%1+(Math.sin(i*12.9898)*43758.5453<0?1:0)}
  const hillY=x=>0;
  return t=>{
    const idx=CH.findIndex(c=>t>=c.a&&t<c.b);
    scenes.forEach((g,i)=>g.setAttribute('opacity',i===idx?1:0));
    // chapter wipe: red then ink bar crossing at each boundary
    let wx=W+120;for(const c of CH){const k=prog(t,c.a-.28,c.a+.28);if(k>0&&k<1&&c.a>0)wx=-W+2*W*easeInOut(k)}
    wipe.setAttribute('x',wx);wipe2.setAttribute('x',wx-60);
    bars.forEach((b,i)=>b.setAttribute('width',136*prog(t,CH[i].a,CH[i].b)));
    if(idx>=0){const c=CH[idx],u=prog(t,c.a,c.b),tin=easeOut(prog(t,c.a+.2,c.a+.7)),tout=1-prog(t,c.b-.25,c.b);
      num.textContent='0'+(idx+1);num.setAttribute('opacity',tin*tout);title.textContent=c.name;sub.textContent=c.sub;
      title.setAttribute('opacity',tin*tout);title.setAttribute('transform',\`translate(\${-40*(1-tin)} 0)\`);sub.setAttribute('opacity',easeOut(prog(t,c.a+.4,c.a+.9))*tout);
      if(idx===0){ // zip line: accelerating ride, parallax, speed lines, swinging legs
        const k=Math.pow(u,1.6),x=80+1120*k,y=110+(490*(x-60)/1180);zrider.setAttribute('transform',\`translate(\${x} \${y}) rotate(22)\`);
        const swing=Math.sin(t*9)*12*k;zpose({x:0,y:0,rot:-22+swing*.3,arms:[[175,180],[185,180]],legs:[[-25+swing,10],[-5+swing,20]]});
        zfar.setAttribute('transform',\`translate(\${-80*u} 0)\`);zmid.setAttribute('transform',\`translate(\${-220*u} 0)\`);ztrees.setAttribute('transform',\`translate(\${-700*u} 0)\`);
        zl.forEach((l,i)=>{const len=40+100*k;l.setAttribute('x1',x-60-i*18);l.setAttribute('y1',y+30+i*14-20);l.setAttribute('x2',x-60-i*18-len);l.setAttribute('y2',y+30+i*14-20-len*.41);l.setAttribute('stroke-opacity',.6*k)});
      }
      if(idx===1){ // wall climb: camera rises, alternating reach
        const k=easeInOut(u),step=k*12,i0=Math.floor(step),f=step-i0;wcam.setAttribute('transform',\`translate(0 \${k*720})\`);
        const h0=holdsXY[Math.min(15,i0)],h1=holdsXY[Math.min(15,i0+1)];const cx=h0[0]+(h1[0]-h0[0])*f-20,cy=h0[1]+(h1[1]-h0[1])*f+60;
        const reach=Math.sin(f*Math.PI);cpose({x:cx,y:cy,rot:0,arms:[[150-40*reach,170],[210,190+30*(1-reach)]],legs:[[20+30*reach,-20],[-30,10+20*(1-reach)]]});
        const wave=Math.sin(t*8)*6;flagCloth.setAttribute('d',\`M5,0 Q30,\${-6+wave} 60,0 L60,34 Q30,\${28-wave} 5,34Z\`);
      }
      if(idx===2){ // archery: draw, release, flight, impact
        const draw=easeOut(prog(u,.08,.38)),rel=prog(u,.42,.7),hit=prog(u,.7,1);
        apose({x:0,y:0,rot:0,arms:[[100,90],[100-30*draw,90+120*draw]],legs:[[20,0],[-20,0]]});
        bow.setAttribute('d','M66,-165 Q108,-96 66,-27');const sx=66-38*draw*(rel>0?0:1);string.setAttribute('points',\`66,-165 \${sx},-96 66,-27\`);
        const ax=316+(1040-316)*easeInOut(rel),ay=374-70*Math.sin(Math.PI*rel)+56*rel;
        arrow.setAttribute('transform',\`translate(\${rel>0?ax:250+66-38*draw} \${rel>0?ay:374}) rotate(\${rel>0?(-12+30*rel):0})\`);
        trail.setAttribute('x1',rel>0?Math.max(300,ax-260):0);trail.setAttribute('y1',rel>0?ay+20:0);trail.setAttribute('x2',rel>0?ax-60:0);trail.setAttribute('y2',rel>0?ay:0);trail.setAttribute('opacity',rel>0&&hit===0?1:0);
        if(hit>0)arrow.setAttribute('transform',\`translate(\${1040-4+Math.sin(hit*60)*4*(1-hit)} 430) rotate(18)\`);
        burst.setAttribute('opacity',hit>0?1-hit:0);burst.setAttribute('r',90+120*hit);
        target.setAttribute('transform',\`translate(1040 430) rotate(\${hit>0?Math.sin(hit*40)*4*(1-hit):0})\`);
        bull.setAttribute('opacity',hit>0?Math.min(1,hit*4):0);bull.setAttribute('transform',\`translate(0 \${-20*easeOut(hit)})\`);
      }
      if(idx===3){ // rope course: swaying bridge, walker crossing with a balance pole
        const yAt=(x,sw)=>300+60*(1-Math.pow((x-640)/490,2))+sw*Math.sin(Math.PI*(x-150)/980);
        const sw=Math.sin(t*3.2)*12;let d1='',d2='';for(let k=0;k<=40;k++){const x=150+980*k/40;d1+=(k?'L':'M')+x+','+(yAt(x,sw)-70);d2+=(k?'L':'M')+x+','+yAt(x,sw)}
        ropeTop.setAttribute('d',d1);ropeLow.setAttribute('d',d2);planks.forEach((p,i)=>{const x=175+930*i/21,y=yAt(x,sw);p.setAttribute('x1',x-12);p.setAttribute('x2',x+12);p.setAttribute('y1',y);p.setAttribute('y2',y)});
        const wx=170+940*easeInOut(prog(u,.05,.95)),wy=yAt(wx,sw)-74,tilt=Math.sin(t*4)*6;const stepA=Math.sin(t*10)*22;
        wpose({x:wx,y:wy,rot:tilt,arms:[[95,90],[265,270]],legs:[[stepA,0],[-stepA,0]]});pole.setAttribute('x1',wx-80);pole.setAttribute('x2',wx+80);pole.setAttribute('y1',wy-48+tilt);pole.setAttribute('y2',wy-48-tilt);
        meter.textContent=\`HEIGHT 12 M  ·  \${Math.round(prog(u,.05,.95)*100)}% ACROSS\`;
      }
    } else {num.setAttribute('opacity',0);title.setAttribute('opacity',0);sub.setAttribute('opacity',0)}
    const e=easeOut(prog(t,11,11.5));end.setAttribute('opacity',e);
    svg.setAttribute('opacity',prog(t,0,.35)*(1-prog(t,11.7,12)));
  }
}};
const draw=scenes[SCENE]();window.setT=t=>draw(t);
</script>`;

mkdirSync(out, {recursive: true});
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(scenes);
const browser = await chromium.launch();
try {
  for (const name of wanted) {
    const spec = scenes[name]; if (!spec) throw Error('Unknown scene ' + name);
    const dir = mkdtempSync(join(tmpdir(), 'eu-motion-'));
    const page = await browser.newPage({viewport: {width: W, height: H}});
    page.on('pageerror', e => { throw e; });
    await page.setContent(html(name, spec.bg)); await page.evaluate(() => document.fonts.ready);
    const frames = spec.seconds * FPS;
    for (let f = 0; f < frames; f++) {
      await page.evaluate(t => window.setT(t), f / FPS);
      await page.screenshot({path: join(dir, 'f' + String(f).padStart(4, '0') + '.png')});
    }
    await page.evaluate(t => window.setT(t), spec.poster);
    await page.screenshot({path: join(out, name + '-poster.jpg'), type: 'jpeg', quality: 86});
    await page.close();
    const input = ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(dir, 'f%04d.png')];
    const base = join(out, `${name}-${spec.seconds}s`);
    execFileSync('ffmpeg', [...input, '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', base + '.mp4']);
    execFileSync('ffmpeg', [...input, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-an', base + '.webm']);
    rmSync(dir, {recursive: true, force: true});
    console.log('rendered', name);
  }
} finally { await browser.close(); }
