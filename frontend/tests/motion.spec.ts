import {test,expect} from '@playwright/test';

test('consolidated pages preserve record links and enquiries',async({page})=>{
 await page.goto('/activities/archery');
 await expect(page).toHaveURL(/activities#archery$/);
 await expect(page.locator('#archery')).toHaveAttribute('open','');
 await expect(page.locator('#archery').getByRole('link',{name:'Enquire about this experience'})).toHaveAttribute('href',/book-now/);
 await page.goto('/programmes/corporate-unbound');
 await expect(page).toHaveURL(/what-we-offer#corporate-unbound$/);
 await expect(page.locator('#corporate-unbound')).toHaveAttribute('open','');
 await page.goto('/gallery');await expect(page).toHaveURL(/activities$/);
});

test('reduced motion keeps content visible and booking controls usable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/book-now');
 await page.getByRole('button',{name:'Add one participant'}).click();
 await expect(page.locator('input[name="participants"]')).toHaveValue('3');
 await expect(page.locator('.booking-journey li').nth(2)).not.toHaveClass(/is-complete/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('core content remains available without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto('/');
 await expect(page.getByRole('heading',{level:1})).toBeVisible();
 await expect(page.getByRole('link',{name:'Book your adventure',exact:true})).toHaveAttribute('href','/book-now');
 await expect(page.locator('canvas')).toHaveCount(0);await context.close();
});
