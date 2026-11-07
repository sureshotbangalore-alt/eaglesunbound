import { test, expect } from '@playwright/test';
const key='eu.cookie-preferences';
test.setTimeout(60000);

test('optional consent starts off, persists rejection and can be changed and withdrawn',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Your visit. Your choice.'})).toBeVisible();
 await page.getByRole('button',{name:'Reject optional',exact:true}).click();
 await expect(page.locator('.consent-banner')).toHaveCount(0);
 await page.reload();await expect(page.locator('.consent-banner')).toHaveCount(0);
 await page.getByRole('button',{name:'Cookie settings',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 await expect(dialog.getByLabel('Allow functional media')).not.toBeChecked();
 await expect(dialog.getByLabel('Necessary cookies always enabled')).toBeChecked();
 await expect(dialog.getByLabel('Analytics not used')).toBeDisabled();
 await expect(dialog.getByLabel('Marketing not used')).toBeDisabled();
 await dialog.getByLabel('Allow functional media').check();
 await dialog.getByRole('button',{name:'Save preferences'}).click();
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).preferences.functional,key)).toBe(true);
 await page.getByRole('button',{name:'Cookie settings',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Reject optional',exact:true}).click();
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).preferences.functional,key)).toBe(false);
});

test('expired, malformed and old policy choices renew safely',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Reject optional',exact:true}).click();
 await page.evaluate(k=>{const r=JSON.parse(localStorage.getItem(k)!);r.savedAt=Date.now()-181*86400000;r.expiresAt=Date.now()-86400000;localStorage.setItem(k,JSON.stringify(r));},key);
 await page.reload();await expect(page.locator('.consent-banner')).toBeVisible();
 await page.evaluate(k=>localStorage.setItem(k,'broken-json'),key);await page.reload();await expect(page.locator('.consent-banner')).toBeVisible();
 await page.getByRole('button',{name:'Accept all',exact:true}).click();
 await page.evaluate(k=>{const r=JSON.parse(localStorage.getItem(k)!);r.version=0;localStorage.setItem(k,JSON.stringify(r));},key);
 await page.reload();await expect(page.locator('.consent-banner')).toBeVisible();
});

test('preferences are keyboard accessible and rejection does not block booking',async({page})=>{
 await page.goto('/book-now');await page.getByRole('button',{name:'Customise preferences'}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
 await page.getByRole('button',{name:'Reject optional',exact:true}).click();
 await page.getByRole('button',{name:'Add one participant'}).click();await expect(page.locator('input[name=participants]')).toHaveValue('3');
 await expect(page.locator('input[name=name]')).toBeEnabled();
});

test('external media never mounts before consent and unmounts on withdrawal',async({page})=>{
 test.skip(process.env.E2E_MEDIA_FIXTURE!=='true','Requires an isolated database with the reserved media.example.test video fixture.');
 const requests:string[]=[];page.on('request',request=>{if(request.url().includes('media.example.test'))requests.push(request.url())});
 await page.route('https://media.example.test/**',route=>route.fulfill({status:200,contentType:'video/mp4',body:Buffer.alloc(0)}));
 await page.goto('/');await expect(page.locator('video[src*="media.example.test"]')).toHaveCount(0);expect(requests).toEqual([]);
 await page.getByRole('button',{name:'Reject optional',exact:true}).click();await page.reload();await expect(page.locator('video[src*="media.example.test"]')).toHaveCount(0);expect(requests).toEqual([]);
 await page.getByRole('button',{name:'Cookie settings',exact:true}).click();await page.getByLabel('Allow functional media').check();await page.getByRole('button',{name:'Save preferences'}).click();
 await expect(page.locator('video[src*="media.example.test"]').first()).toBeAttached();
 await page.getByRole('button',{name:'Play background video',exact:true}).click();await expect.poll(()=>requests.length).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Cookie settings',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Reject optional',exact:true}).click();
 await expect(page.locator('video[src*="media.example.test"]')).toHaveCount(0);
});

test('blocked browser storage fails safely',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError')}});
 await page.goto('/');await page.getByRole('button',{name:'Reject optional',exact:true}).click();
 await expect(page.locator('.consent-banner')).toHaveCount(0);await expect(page.getByRole('status')).toContainText('could not save');
 await page.reload();await expect(page.locator('.consent-banner')).toBeVisible();
});
