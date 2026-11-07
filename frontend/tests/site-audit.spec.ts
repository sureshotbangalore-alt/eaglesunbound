import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const paths=(process.env.E2E_AUDIT_PATHS || '/,/the-bootcamp,/what-we-offer,/activities,/about,/founder,/food-and-dining,/contact,/book-now,/privacy-policy,/cookie-policy,/terms-and-conditions,/booking-policy').split(',');
test('every public route has readable content, metadata and responsive layout',async({page},info)=>{
 test.setTimeout(240000);const titles=new Set<string>();const issues:unknown[]=[];
 for(const path of paths){
  const response=await page.goto(path);expect(response?.status(),path).toBe(200);
  if(await page.getByRole('button',{name:'Reject optional',exact:true}).isVisible())await page.getByRole('button',{name:'Reject optional',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveCount(1);await expect(page.getByRole('heading',{level:1})).toBeVisible();
  const title=await page.title();expect(titles.has(title),`Duplicate title: ${title}`).toBe(false);titles.add(title);
  expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
  const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');expect(new URL(canonical!).pathname).toBe(path);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow: ${path}`).toBe(true);
  if(path==='/')expect(await page.locator('h1 .wd').evaluateAll(words=>words.every(word=>word.getBoundingClientRect().right<=innerWidth)), 'Headline words are clipped').toBe(true);
  // Reveal scroll sections and let the actual entrance transitions finish before contrast checks.
  await page.evaluate(async()=>{document.documentElement.style.scrollBehavior='auto';for(let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,100));}window.scrollTo(0,0);});
  await page.waitForTimeout(1300);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();
  issues.push(...result.violations.map(v=>({path,id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
  if(['/','/contact','/book-now','/privacy-policy'].includes(path))await page.screenshot({path:`test-results/${path.replaceAll('/','')||'home'}-${info.project.name}.png`,fullPage:true});
 }
 await info.attach('accessibility-audit',{body:JSON.stringify(issues,null,2),contentType:'application/json'});
 expect(issues).toEqual([]);
});
test('retired pages redirect, crawler documents exclude private routes and 404 works',async({request})=>{
 for(const [old,current] of [['/gallery','/activities'],['/clients','/about'],['/faqs','/contact#faqs']]){
  const response=await request.get(old,{maxRedirects:0});expect(response.status()).toBe(301);expect(response.headers().location).toContain(current);
 }
 const sitemap=await request.get('/sitemap.xml');expect(sitemap.status()).toBe(200);const xml=await sitemap.text();expect(xml).toContain('/cookie-policy');expect(xml).not.toContain('/admin');expect(xml).not.toContain('/book-now');expect(xml).not.toContain('/gallery');expect(xml).toContain('<lastmod>');
 const robots=await request.get('/robots.txt');expect(robots.status()).toBe(200);expect(await robots.text()).toContain('Disallow: /');
 expect((await request.get('/this-page-does-not-exist')).status()).toBe(404);
 expect((await request.get('/api/admin/records/bookings')).status()).toBe(401);
});
test('contact enquiry saves in the isolated database',async({page})=>{
 test.skip(process.env.E2E_ALLOW_WRITES!=='true','Isolated database only.');
 await page.goto('/contact');await page.getByRole('button',{name:'Reject optional',exact:true}).click();
 await page.getByLabel('Your name').fill('E2E Enquiry Visitor');await page.getByLabel('Email address').fill('enquiry-e2e@example.com');await page.getByLabel('Mobile number').fill('+919876543210');
 await page.locator('textarea[name="message"]').fill('Please help plan our team experience for this test.');await page.locator('input[name="consent"]').check();
 await page.getByRole('button',{name:/Send your enquiry/}).click();await expect(page.getByRole('heading',{name:'Let’s make a plan.'})).toBeVisible();
});
