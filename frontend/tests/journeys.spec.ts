import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('navigation, mobile menu, no horizontal overflow and accessibility',async({page},testInfo)=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
  if(testInfo.project.name==='mobile')await page.getByRole('button',{name:'Open navigation'}).click();
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Activities',exact:true}).click();
  await expect(page).toHaveURL(/\/activities$/);
  await page.getByRole('button',{name:'Shooting And Archery',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Archery',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await page.screenshot({path:`test-results/activities-${testInfo.project.name}.png`,fullPage:true});
});

test('programme booking preselection and saved-request success',async({page})=>{
  test.skip(process.env.E2E_ALLOW_WRITES!=='true','Use only against an isolated test database with E2E_ALLOW_WRITES=true.');
  await page.goto('/programmes/corporate-unbound');
  await page.locator('#corporate-unbound').getByRole('link',{name:/^Enquire about this experience/}).click();
  await expect(page.locator('select[name="programme_id"] option:checked')).toHaveText('Corporate Unbound');
  await page.getByLabel('Your name').fill('E2E Test Visitor');
  await page.getByLabel('Email address').fill('e2e@example.com');
  await page.getByLabel('Mobile number').fill('+919876543210');
  const date=new Date();date.setDate(date.getDate()+14);
  await page.getByLabel('Preferred date').fill(date.toLocaleDateString('en-CA'));
  await page.getByLabel('Group type').selectOption('Corporate');
  await page.locator('input[name="consent"]').check();
  await page.getByRole('button',{name:'Send booking request'}).click();
  await expect(page.getByText(/EU-[A-F0-9]{10}/)).toBeVisible();
  await expect(page.getByText('Your visit is not confirmed yet.',{exact:false})).toBeVisible();
});

test('admin login protects customer records and opens the content editor',async({page})=>{
  test.skip(!process.env.E2E_ADMIN_PASSWORD,'Requires isolated test credentials.');
  await page.goto('/admin/bookings');
  await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();
  await page.getByLabel('Email address').fill(process.env.E2E_ADMIN_EMAIL||'admin@example.com');
  await page.getByLabel('Password',{exact:true}).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole('button',{name:/^Sign in/}).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await page.getByRole('link',{name:'Website content'}).click();
  await expect(page.getByLabel('hero title',{exact:true})).toBeVisible();
});
