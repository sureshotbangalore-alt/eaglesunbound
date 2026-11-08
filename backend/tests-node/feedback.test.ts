// Visitor feedback: public submission, Super Admin moderation, only approved + publishable feedback is public,
// Staff Viewers have no access, and private details never leak.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup,PASSWORD,HEADERS} from './helpers';
import {publicName} from '../src/feedback';

const good={name:'Priya Sharma',email:'Priya@Example.com',visit_type:'Corporate team',organisation:'Acme',rating:5,message:'The obstacle course brought our whole team together. Brilliant day.',consent:true,publish_consent:true};

async function login(client:any,email:string){const r=await client.post('/admin/login',{email,password:PASSWORD});assert.equal(r.status,200,email)}

test('public names are shortened unless an admin sets one',()=>{
 assert.equal(publicName({name:'Priya Sharma'}),'Priya S.');
 assert.equal(publicName({name:'Arun'}),'Arun');
 assert.equal(publicName({name:'Priya Sharma',display_name:'Priya, Acme'}),'Priya, Acme');
});

test('feedback is stored as Pending and is not public until approved',async()=>{
 const env=await setup();
 try{
  const visitor=env.client();
  const r=await visitor.post('/feedback',good);assert.equal(r.status,201);
  assert.equal((await visitor.post('/feedback',good)).status,201,'a double submit is accepted');
  const row=await env.find('visitor_feedback','email=?',['priya@example.com']);
  assert.equal(row?.status,'Pending');
  assert.deepEqual((await visitor.get('/public/testimonials')).json,[],'nothing public before approval');
  assert.equal((await visitor.post('/feedback',{...good,message:'short'})).status,422,'validation');
  assert.equal((await visitor.post('/feedback',{...good,consent:false})).status,422,'consent required');
  assert.equal((await visitor.post('/feedback',{...good,rating:9})).status,422,'rating 1-5');
  assert.equal((await visitor.post('/feedback',{...good,website:'spam.example'})).status,400,'honeypot');
 }finally{await env.close()}
});

test('Super Admin approves; only publishable feedback appears, without private details',async()=>{
 const env=await setup();
 try{
  const visitor=env.client();
  await visitor.post('/feedback',good);
  await visitor.post('/feedback',{...good,email:'quiet@example.com',name:'Quiet Visitor',message:'Lovely staff, but please keep my words private.',publish_consent:false});
  const adminClient=env.client();await login(adminClient,'admin@example.com');
  const list=(await adminClient.get('/admin/feedback')).json as any[];assert.equal(list.length,2,'one duplicate was ignored');
  const publishable=list.find(x=>x.publish_consent),privateOne=list.find(x=>!x.publish_consent);
  const denied=await adminClient.patch(`/admin/feedback/${privateOne.id}`,{status:'Approved'},HEADERS);assert.equal(denied.status,422,'cannot publish without permission');
  const ok=await adminClient.patch(`/admin/feedback/${publishable.id}`,{status:'Approved',display_name:''},HEADERS);assert.equal(ok.status,200);
  const pub=(await visitor.get('/public/testimonials')).json as any[];
  assert.equal(pub.length,1);assert.equal(pub[0].name,'Priya S.');assert.equal(pub[0].rating,5);
  assert.ok(!JSON.stringify(pub).includes('example.com'),'no email in public data');assert.ok(!('admin_notes' in pub[0]));
  await adminClient.patch(`/admin/feedback/${publishable.id}`,{status:'Rejected'},HEADERS);
  assert.deepEqual((await visitor.get('/public/testimonials')).json,[],'rejected feedback disappears');
  assert.equal((await adminClient.delete(`/admin/feedback/${privateOne.id}`,HEADERS)).status,200);
 }finally{await env.close()}
});

test('Staff Viewer and visitors cannot read or moderate feedback',async()=>{
 const env=await setup();
 try{
  await env.client().post('/feedback',good);
  const staff=env.client();await login(staff,'staff@example.com');
  assert.equal((await staff.get('/admin/feedback')).status,403);
  const anon=env.client();assert.equal((await anon.get('/admin/feedback')).status,401);
 }finally{await env.close()}
});
