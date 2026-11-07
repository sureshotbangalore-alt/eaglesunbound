// Admin CMS journeys. Writes data, so run ONLY against the in-memory fixture server (backend/tests-node/fixture-server.ts)
// or another isolated database, with E2E_ALLOW_WRITES=true, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and E2E_STAFF_EMAIL.
import { test, expect, type Page } from '@playwright/test';
import { assertLocalWriteTarget } from './safety';
assertLocalWriteTarget();

test.skip(process.env.E2E_ALLOW_WRITES !== 'true' || !process.env.E2E_ADMIN_PASSWORD, 'Needs an isolated database and test credentials.');
test.describe.configure({ mode: 'serial' });
test.setTimeout(90000);

// One sign-in for the whole serial run (the API rate-limits logins to 8 per 10 minutes).
let page: Page;
test.beforeAll(async ({ browser }) => {
  page = await (await browser.newContext({ baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000' })).newPage();
  await signIn(page, process.env.E2E_ADMIN_EMAIL || 'admin@example.com');
});
test.afterAll(async () => { await page.context().close(); });

const staff = process.env.E2E_STAFF_EMAIL || 'staff@example.com';

async function signIn(page: Page, email: string) {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await page.waitForURL(/\/admin\/(dashboard|requests)$/);
}
const publicJSON = async (page: Page, path: string) => (await page.request.get('/api/public/' + path)).json();
const noErrors = (page: Page) => expect(page.locator('.notice.error')).toHaveCount(0);

test('every admin module opens without errors', async () => {
  const modules = ['dashboard', 'pages', 'programmes', 'activities', 'packages', 'bookings', 'enquiries', 'clients', 'gallery', 'media', 'faqs', 'settings', 'seo', 'users'];
  for (const m of modules) {
    await page.goto('/admin/' + m);
    await expect(page.locator('.admin-body main, main#main').first()).toBeVisible();
    await expect(page.getByText('That workspace page doesn’t exist.')).toHaveCount(0);
    await noErrors(page);
  }
});

test('homepage sections can be hidden and reordered and the public page follows', async () => {
  await page.goto('/admin/pages');
  await page.getByLabel('hero title', { exact: true }).fill('E2E EDITED HEADLINE.');
  await page.getByLabel('Founder', { exact: true }).uncheck();
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Move Programmes up' }).click();
  await page.getByRole('button', { name: 'Save homepage' }).click();
  await expect(page.getByText('Saved. Changes are live on the website.')).toBeVisible();
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('E2E EDITED HEADLINE');
  await expect(page.locator('section.founder')).toHaveCount(0);
  const programmesFirst = await page.evaluate(() => !!(document.querySelector('.programmes-section')!.compareDocumentPosition(document.querySelector('#experience')!) & Node.DOCUMENT_POSITION_FOLLOWING));
  expect(programmesFirst).toBe(true);
  // Persisted in the database, not only in the page.
  expect((await publicJSON(page, 'home')).sections.find((s: { id: string }) => s.id === 'founder').visible).toBe(false);
  // Restore defaults so later tests see the full homepage.
  await page.goto('/admin/pages');
  await page.getByLabel('Founder', { exact: true }).check();
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Move Programmes down' }).click();
  await page.getByRole('button', { name: 'Save homepage' }).click();
  await expect(page.getByText('Saved. Changes are live on the website.')).toBeVisible();
});

const records: [string, string, string][] = [['programmes', 'programmes', 'Add programme'], ['activities', 'activities', 'Add activity'], ['packages', 'packages', 'Add package'], ['clients', 'clients', 'Add client'], ['gallery', 'gallery', 'Add album']];
for (const [module, api, addLabel] of records) {
  test(`${module}: add draft, publish, reorder, unpublish and delete`, async () => {
    const name = `E2E ${module} item`;
    const slug = `e2e-${module}-item`;
      await page.goto('/admin/' + module);
    await page.getByRole('button', { name: new RegExp('^' + addLabel) }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('name', { exact: true }).fill(name);
    await dialog.getByLabel('slug', { exact: true }).fill(slug);
    await dialog.getByLabel('description', { exact: true }).fill('Created by the automated CMS test.');
    await dialog.getByRole('button', { name: 'Save record' }).click();
    await expect(page.getByText('Saved. Changes are live on the website.')).toBeVisible();
    const row = page.locator('.admin-record', { hasText: name });
    await expect(row.getByText('Draft')).toBeVisible();
    expect((await publicJSON(page, api)).some((r: { slug: string }) => r.slug === slug)).toBe(false);

    await row.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('dialog').getByLabel('Publish on the public website').check();
    await page.getByRole('dialog').getByRole('button', { name: 'Save record' }).click();
    await expect(page.locator('.admin-record', { hasText: name }).getByText('Published')).toBeVisible();
    expect((await publicJSON(page, api)).some((r: { slug: string }) => r.slug === slug)).toBe(true);

    // Reorder: move to the top, and confirm the saved order is what the public API returns.
    const up = page.getByRole('button', { name: `Move ${name} up` });
    await expect(up).toBeEnabled(); // new records are added at the end of the list
    while (await up.isEnabled()) { await up.click(); await expect(page.getByText('Order saved. The public website now uses this order.')).toBeVisible(); await expect(page.getByRole('button', { name: /^Move .* up$/ }).nth(1)).toBeEnabled(); }
    await expect(page.getByText('Order saved. The public website now uses this order.')).toBeVisible();
    expect((await publicJSON(page, api))[0].slug).toBe(slug);

    await page.locator('.admin-record', { hasText: name }).getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('dialog').getByLabel('Publish on the public website').uncheck();
    await page.getByRole('dialog').getByRole('button', { name: 'Save record' }).click();
    await expect(page.locator('.admin-record', { hasText: name }).getByText('Draft')).toBeVisible();
    expect((await publicJSON(page, api)).some((r: { slug: string }) => r.slug === slug)).toBe(false);

    page.once('dialog', d => d.dismiss());
    await page.locator('.admin-record', { hasText: name }).getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('.admin-record', { hasText: name })).toHaveCount(1); // cancelled: still there
    page.once('dialog', d => d.accept());
    await page.locator('.admin-record', { hasText: name }).getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('.admin-record', { hasText: name })).toHaveCount(0);
  });
}

test('FAQs: add, publish and delete', async () => {
  await page.goto('/admin/faqs');
  await page.getByRole('button', { name: /^Add FAQ/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('question', { exact: true }).fill('Does the CMS test work?');
  await dialog.getByLabel('answer', { exact: true }).fill('Yes, this answer was saved by the automated test.');
  await dialog.getByLabel(/Publish/).check();
  await dialog.getByRole('button', { name: /^Save/ }).click();
  await expect(page.locator('.admin-record', { hasText: 'Does the CMS test work?' })).toBeVisible();
  expect((await publicJSON(page, 'faqs')).some((f: { question: string }) => f.question === 'Does the CMS test work?')).toBe(true);
  page.once('dialog', d => d.accept());
  await page.locator('.admin-record', { hasText: 'Does the CMS test work?' }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.admin-record', { hasText: 'Does the CMS test work?' })).toHaveCount(0);
});

test('settings: contact details save and appear on the public site', async () => {
  await page.goto('/admin/settings');
  await page.getByLabel('phone', { exact: true }).fill('+919811122233');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Saved. Changes are live on the website.')).toBeVisible();
  await page.goto('/contact');
  await expect(page.locator('a[href="tel:+919811122233"]').first()).toBeVisible();
  await expect(page.locator('a[href*="wa.me"]').first()).toBeVisible();
});

test('SEO: metadata override is saved and used by the page', async () => {
  await page.goto('/admin/seo');
  await page.getByLabel('page', { exact: true }).fill('/about');
  await page.getByLabel('title', { exact: true }).fill('E2E About Title | Eagles Unbound');
  await page.getByLabel('description', { exact: true }).fill('A description saved by the automated SEO test for the About page.');
  await page.getByRole('button', { name: 'Save metadata' }).click();
  await expect(page.getByText(/Metadata saved/)).toBeVisible();
  await page.goto('/about');
  await expect(page).toHaveTitle('E2E About Title | Eagles Unbound');
});

test('media: external link is saved; upload reports missing storage clearly', async () => {
  await page.goto('/admin/media');
  await page.getByLabel('Name').fill('E2E test photo');
  await page.getByLabel('HTTPS URL').fill('https://example.com/e2e-photo.jpg');
  await page.getByRole('button', { name: 'Add media link' }).click();
  await expect(page.getByText('Media link saved.')).toBeVisible();
  await page.getByLabel('Choose media file').setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]) });
  await page.getByRole('button', { name: /Upload asset/ }).click();
  await expect(page.getByText(/Configure S3 storage/)).toBeVisible();
  page.once('dialog', d => d.accept());
  await page.locator('.admin-record', { hasText: 'E2E test photo' }).getByRole('button', { name: /Delete/ }).click();
  await expect(page.locator('.admin-record', { hasText: 'E2E test photo' })).toHaveCount(0);
});

test('users: create a staff viewer from the dashboard', async () => {
  await page.goto('/admin/users');
  await expect(page.getByRole('option', { name: /Content editor/ })).toHaveCount(0);
  await page.getByLabel('Login email').fill('e2e.viewer@example.com');
  await page.getByLabel(/Temporary password/).fill('e2e-viewer-password-1');
  await page.getByRole('button', { name: /^Create/ }).click();
  await expect(page.getByRole('heading', { name: 'e2e.viewer@example.com' })).toBeVisible();
});

test('bookings and enquiries: public submit, admin manages, staff only views', async ({ browser }) => {
  const programmes = await publicJSON(page, 'programmes');
  const date = new Date(); date.setDate(date.getDate() + 21);
  const booking = await page.request.post('/api/bookings', { data: { name: 'Request Visitor', email: 'request@example.com', mobile: '+919876543210', programme_id: programmes[0].id, preferred_date: date.toISOString().slice(0, 10), participants: 12, group_type: 'Corporate', message: 'Created by the e2e test.', consent: true } });
  expect(booking.status()).toBe(201);
  expect((await page.request.post('/api/enquiries', { data: { name: 'Enquiry Visitor', email: 'enquiry@example.com', phone: '+919876543210', category: 'General', message: 'Created by the e2e test.', consent: true } })).status()).toBe(201);

  await page.goto('/admin/bookings');
  const row = page.locator('.admin-record', { hasText: 'Request Visitor' });
  await expect(row).toBeVisible();
  await expect(row.getByText('Pending')).toBeVisible();
  await row.getByRole('button', { name: /View & update/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('request@example.com')).toBeVisible();
  await dialog.getByLabel(/Status/i).selectOption('Contacted');
  await dialog.getByRole('button', { name: /Save|Update/ }).click();
  await expect(page.locator('.admin-record', { hasText: 'Request Visitor' }).getByText('Contacted')).toBeVisible();
  await page.goto('/admin/enquiries');
  await expect(page.locator('.admin-record', { hasText: 'Enquiry Visitor' })).toBeVisible();

  // Staff viewer: sees the requests, has no edit/export controls and cannot call admin APIs.
  const ctx = await browser.newContext();
  const staffPage = await ctx.newPage();
  await signIn(staffPage, staff);
  await expect(staffPage).toHaveURL(/\/admin\/requests$/);
  await expect(staffPage.getByText('Request Visitor')).toBeVisible();
  await expect(staffPage.getByRole('link', { name: /Export/ })).toHaveCount(0);
  await expect(staffPage.getByRole('button', { name: /View & update|Save|Delete/ })).toHaveCount(0);
  await staffPage.goto('/admin/settings');
  await expect(staffPage).toHaveURL(/\/admin\/requests$/);
  for (const path of ['/api/admin/records/bookings', '/api/admin/settings', '/api/admin/users', '/api/admin/export/bookings', '/api/admin/overview'])
    expect((await staffPage.request.get(path)).status(), path).toBe(403);
  expect((await staffPage.request.patch('/api/admin/bookings/x', { data: { status: 'Confirmed', internal_notes: '' }, headers: { 'X-Requested-With': 'EaglesAdmin' } })).status()).toBe(403);
  await ctx.close();
});

test('cookie consent: Accept All, persistence, footer reopen and withdrawal', async ({ browser, baseURL }) => {
  const visitor = await browser.newPage({ baseURL });
  const page = visitor;
  await page.goto('/');
  await page.getByRole('button', { name: 'Accept all', exact: true }).click();
  await expect(page.locator('.consent-banner')).toHaveCount(0);
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('eu.cookie-preferences')!).preferences);
  expect(await stored()).toMatchObject({ necessary: true, functional: true, analytics: false, marketing: false });
  await page.reload();
  await expect(page.locator('.consent-banner')).toHaveCount(0);
  expect(await stored()).toMatchObject({ functional: true });
  await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Allow functional media')).toBeChecked();
  await dialog.getByLabel('Allow functional media').uncheck();
  await dialog.getByRole('button', { name: 'Save preferences' }).click();
  expect(await stored()).toMatchObject({ functional: false });
  expect(await page.evaluate(() => document.cookie)).toBe('');
});
