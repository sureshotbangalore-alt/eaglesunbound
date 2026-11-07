// Node port of backend/tests/test_api.py and test_security.py: same requests, same expected statuses.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rows,update} from '../src/database';
import {totp} from '../src/crypto';
import fixtures from './fixtures.json';
import {setup,booking,enquiry,futureDate,HEADERS,PASSWORD} from './helpers';

type Env = Awaited<ReturnType<typeof setup>>;
const scenario = (name: string, work: (env: Env) => Promise<void>, options?: Parameters<typeof setup>[0]) =>
  test(name, async () => { const env = await setup(options); try { await work(env); } finally { await env.close(); } });

scenario('health check reports database connectivity', async ({client}) => {
  const c = client();
  const response = await c.get('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(response.json, {status: 'ok'});
});

scenario('private routes require a session and CSRF protection', async ({client}) => {
  const c = client();
  for (const path of ['/admin/me', '/admin/records/bookings', '/admin/content', '/admin/media', '/admin/seo']) assert.equal((await c.get(path)).status, 401, path);
  assert.equal((await c.post('/admin/login', {email: 'admin@example.com', password: PASSWORD}, {})).status, 403);
  assert.equal((await c.post('/admin/login', {email: 'admin@example.com', password: PASSWORD}, {...HEADERS, Origin: 'https://attacker.invalid'})).status, 403);
});

scenario('login, logout and wrong password', async ({client}) => {
  const c = client();
  assert.equal((await c.post('/admin/login', {email: 'admin@example.com', password: 'wrong'})).status, 401);
  const login = await c.login();
  assert.match(login.setCookie, /HttpOnly/);
  assert.match(login.setCookie, /SameSite=lax/);
  assert.equal((await c.get('/admin/me')).json.role, 'admin');
  assert.equal((await c.post('/admin/logout')).status, 200);
  assert.equal((await c.get('/admin/me')).status, 401);
});

scenario('CMS edits persist and appear publicly', async ({client, db}) => {
  const c = client(); await c.login();
  const content = {...fixtures.home, hero_title: 'THE PERSISTENT CHALLENGE.'};
  assert.equal((await c.put('/admin/content', content)).status, 200);
  assert.equal((await c.get('/public/home')).json.hero_title, content.hero_title);
  assert.ok((await rows(db, 'audit_logs', 'action=?', ['Updated homepage'])).length);
});

scenario('editor cannot access customer data or settings', async ({client}) => {
  const c = client(); await c.login('editor@example.com');
  for (const path of ['/admin/records/bookings', '/admin/records/enquiries', '/admin/settings', '/admin/export/bookings', '/admin/overview']) assert.equal((await c.get(path)).status, 403, path);
  assert.equal((await c.put('/admin/content', fixtures.home)).status, 200);
});

scenario('booking is saved with reference and status history', async ({client, db, programmeId, find}) => {
  const c = client();
  const result = await c.post('/bookings', booking(programmeId), {});
  assert.equal(result.status, 201);
  assert.equal(result.json.status, 'Pending');
  const saved = await find('bookings', 'reference=?', [result.json.reference]);
  assert.ok(saved);
  assert.equal((await rows(db, 'booking_status_history')).length, 1);
  await c.login();
  assert.equal((await c.patch('/admin/bookings/' + saved.id, {status: 'Contacted', internal_notes: 'Called the group organiser.'})).status, 200);
  assert.equal((await find('bookings', 'id=?', [saved.id]))!.status, 'Contacted');
  assert.equal((await rows(db, 'booking_status_history')).length, 2);
});

scenario('booking validation and blocked dates', async ({client, programmeId}) => {
  const c = client(); const data = booking(programmeId);
  assert.equal((await c.post('/bookings', {...data, participants: 0}, {})).status, 422);
  assert.equal((await c.post('/bookings', {...data, consent: false}, {})).status, 422);
  assert.equal((await c.post('/bookings', {...data, programme_id: 'missing'}, {})).status, 422);
  assert.equal((await c.post('/bookings', {...data, preferred_date: '2020-01-01'}, {})).status, 422);
  assert.equal((await c.post('/bookings', {...data, email: 'not-an-email'}, {})).status, 422);
  assert.equal((await c.post('/bookings', {...data, website: 'spam'}, {})).status, 400);
  await c.login();
  assert.equal((await c.post('/admin/blocked-dates', {day: data.preferred_date, reason: 'Closed'})).status, 201);
  assert.equal((await c.post('/bookings', data, {})).status, 409);
});

scenario('draft programmes cannot be booked', async ({client, find}) => {
  const draft = await find('programmes', 'slug=?', ['draft-programme']);
  assert.equal((await client().post('/bookings', booking(draft!.id), {})).status, 422);
});

scenario('enquiry is saved and admin can update it', async ({client, find}) => {
  const c = client();
  assert.equal((await c.post('/enquiries', {...enquiry, email: 'test@example.com'}, {})).status, 201);
  const row = await find('enquiries', 'email=?', ['test@example.com']);
  assert.equal(row!.status, 'New');
  await c.login();
  assert.equal((await c.patch('/admin/enquiries/' + row!.id, {status: 'Resolved', internal_notes: 'Replied.'})).status, 200);
  const csv = await c.get('/admin/export/enquiries');
  assert.match(csv.headers.get('content-type') || '', /text\/csv/);
  assert.ok(csv.text.includes('test@example.com'));
});

scenario('CSV export neutralises spreadsheet formulas', async ({client}) => {
  const c = client();
  assert.equal((await c.post('/enquiries', {...enquiry, name: '=HYPERLINK("x")'}, {})).status, 201);
  await c.login();
  const csv = (await c.get('/admin/export/enquiries')).text;
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
});

scenario('publishing, unique slugs and unpublishing', async ({client}) => {
  const c = client();
  assert.equal((await c.get('/public/programmes')).json.length, 1);
  await c.login();
  const content = {name: 'New experience', slug: 'new-experience', description: 'Test only', published: false};
  const added = await c.post('/admin/records/programmes', content);
  assert.equal(added.status, 201);
  assert.equal((await c.get('/public/programmes')).json.length, 1);
  assert.equal((await c.post('/admin/records/programmes', content)).status, 409);
  assert.equal((await c.put('/admin/records/programmes/' + added.json.id, {...content, published: true})).status, 200);
  assert.equal((await c.get('/public/programmes')).json.length, 2);
  assert.equal((await c.delete('/admin/records/programmes/' + added.json.id)).status, 200);
  assert.equal((await c.get('/public/unknown-module')).status, 404);
});

scenario('SEO validation and FAQ publishing', async ({client}) => {
  const c = client(); await c.login();
  const data = {page: '/about', title: 'About Eagles Unbound', description: 'Useful metadata about Eagles Unbound and its outdoor experiences.'};
  assert.equal((await c.put('/admin/seo', {...data, canonical: 'javascript:alert(1)'})).status, 422);
  assert.equal((await c.put('/admin/seo', {...data, canonical: 'https://user:password@example.com/about'})).status, 422);
  assert.equal((await c.put('/admin/seo', data)).status, 200);
  assert.equal((await c.get('/public/seo')).json[0].title, data.title);
  const faq = await c.post('/admin/faqs', {question: 'What is this experience?', answer: 'A client-approved answer goes here.', published: false});
  assert.equal(faq.status, 201);
  assert.deepEqual((await c.get('/public/faqs')).json, []);
  assert.equal((await c.put('/admin/faqs/' + faq.json.id, {question: 'What is this experience?', answer: 'A client-approved answer goes here.', published: true})).status, 200);
  assert.equal((await c.get('/public/faqs')).json.length, 1);
});

scenario('login rate limit and unconfigured storage', async ({client, limiter}) => {
  const c = client();
  for (let i = 0; i < 8; i++) await c.post('/admin/login', {email: 'nobody@example.com', password: 'wrong'});
  assert.equal((await c.post('/admin/login', {email: 'nobody@example.com', password: 'wrong'})).status, 429);
  limiter.clear(); await c.login();
  const form = new FormData(); form.append('file', new Blob([Buffer.from('not an image')], {type: 'image/png'}), 'test.png');
  assert.equal((await c.request('post', '/admin/media/upload', {body: form, headers: HEADERS})).status, 503);
});

scenario('public submissions are rate limited', async ({client}) => {
  const c = client();
  for (let i = 0; i < 10; i++) assert.equal((await c.post('/enquiries', {...enquiry, message: 'Enquiry number ' + i}, {})).status, 201);
  assert.equal((await c.post('/enquiries', {...enquiry, message: 'One too many'}, {})).status, 429);
});

scenario('media that is in use cannot be deleted', async ({client}) => {
  const c = client(); await c.login();
  const asset = await c.post('/admin/media', {name: 'Test photo', url: 'https://example.com/photo.jpg', mime_type: 'image/jpeg'});
  assert.equal(asset.status, 201);
  const album = await c.post('/admin/records/gallery', {name: 'Test album', slug: 'test-album', details: {media: [{url: asset.json.url, caption: 'Test photo', type: 'image'}]}});
  assert.equal(album.status, 201);
  assert.equal((await c.delete('/admin/media/' + asset.json.id)).status, 409);
  assert.equal((await c.delete('/admin/records/gallery/' + album.json.id)).status, 200);
  assert.equal((await c.delete('/admin/media/' + asset.json.id)).status, 200);
});

scenario('expired sessions are rejected', async ({client, db}) => {
  const c = client(); await c.login();
  await db.execute('UPDATE admin_sessions SET expires_at=?', ['2000-01-01 00:00:00']);
  assert.equal((await c.get('/admin/me')).status, 401);
});

scenario('page story drafts and publishing', async ({client}) => {
  const c = client(); await c.login('editor@example.com');
  const content = {title: 'OUR APPROVED STORY', intro: 'An approved introduction for this test.', sections: [{heading: 'Our approach', body: 'Approved factual story text for testing.'}], published: false};
  assert.equal((await c.put('/admin/pages/about', content)).status, 200);
  assert.deepEqual((await c.get('/public/pages')).json, []);
  assert.equal((await c.put('/admin/pages/about', {...content, published: true})).status, 200);
  assert.equal((await c.get('/public/pages')).json[0].title, content.title);
  assert.equal((await c.put('/admin/pages/nonexistent', content)).status, 404);
});

scenario('expanded enquiry details and meal validation', async ({client, programmeId, find}) => {
  const c = client();
  const request = {name: 'Institution organiser', email: 'group@example.com', phone: '+919876543210', category: 'Student programme', message: 'Please help us plan our group experience.', consent: true, organisation: 'Test school', visitor_category: 'School', programme: 'School Day Outing', participants: 40, preferred_date: futureDate(20), vegetarian_meals: 30, non_vegetarian_meals: 10, special_requirements: 'Please discuss access needs.'};
  assert.equal((await c.post('/enquiries', request, {})).status, 201);
  const row = await find('enquiries', 'email=?', ['group@example.com']);
  assert.equal(row!.details.vegetarian_meals, 30);
  assert.equal(row!.details.organisation, 'Test school');
  assert.equal((await c.post('/enquiries', {...request, non_vegetarian_meals: 20}, {})).status, 422);
  assert.equal((await c.post('/bookings', {...booking(programmeId), vegetarian_meals: 9}, {})).status, 422);
  assert.equal((await c.post('/bookings', {...booking(programmeId), vegetarian_meals: 6, non_vegetarian_meals: 2}, {})).status, 201);
  assert.equal((await find('bookings', 'email=?', ['visitor@example.com']))!.details.vegetarian_meals, 6);
});

scenario('unapproved testimonials and reported claims stay private', async ({client}) => {
  const c = client(); await c.login();
  const row = {name: 'Approved client', slug: 'approved-client', published: true, details: {testimonial_quote: 'A quotation awaiting permission.', testimonial_approved: false, reported_service_claim: 'Unverified fact'}};
  const created = await c.post('/admin/records/clients', row);
  assert.equal(created.status, 201);
  let details = (await c.get('/public/clients')).json[0].details;
  assert.ok(!('testimonial_quote' in details) && !('reported_service_claim' in details));
  assert.equal((await c.put('/admin/records/clients/' + created.json.id, {...row, details: {...row.details, testimonial_approved: true}})).status, 200);
  details = (await c.get('/public/clients')).json[0].details;
  assert.equal(details.testimonial_quote, row.details.testimonial_quote);
  assert.equal((await c.post('/admin/records/clients', {...row, slug: 'invalid-video', details: {testimonial_video: 'javascript:alert(1)'}})).status, 422);
});

async function seedRequests(env: Env) {
  const c = env.client();
  const created = await c.post('/bookings', booking(env.programmeId));
  assert.equal(created.status, 201);
  assert.equal((await c.post('/enquiries', enquiry)).status, 201);
  return created.json.reference as string;
}

scenario('staff viewer reads permitted booking and enquiry fields only', async env => {
  const reference = await seedRequests(env);
  const saved = await env.find('bookings', 'reference=?', [reference]);
  await update(env.db, 'bookings', saved!.id, {internal_notes: 'admin-only note'});
  const c = env.client(); await c.login('staff@example.com');
  assert.equal((await c.get('/admin/me')).json.role, 'staff_viewer');
  const bookings = await c.get('/admin/staff/bookings');
  assert.equal(bookings.status, 200);
  const first = bookings.json[0];
  assert.equal(first.reference, reference); assert.equal(first.name, 'Test Visitor'); assert.equal(first.participants, 8);
  assert.equal(first.programme, 'Test programme'); assert.equal(first.status, 'Pending'); assert.ok(first.mobile && first.preferred_date);
  assert.ok(!('internal_notes' in first) && !bookings.text.includes('admin-only note'));
  const enquiries = await c.get('/admin/staff/enquiries');
  assert.equal(enquiries.json[0].name, 'Enquiry Visitor');
  assert.ok(!('internal_notes' in enquiries.json[0]));
});

scenario('staff viewer is blocked from every restricted API', async env => {
  await seedRequests(env);
  const bookingId = (await rows(env.db, 'bookings'))[0].id;
  const enquiryId = (await rows(env.db, 'enquiries'))[0].id;
  const staffId = (await env.find('admin_users', 'email=?', ['staff@example.com']))!.id;
  const c = env.client(); await c.login('staff@example.com');
  const attempts: [string, string, unknown?][] = [
    ['get', '/admin/overview'], ['get', '/admin/records/bookings'], ['get', '/admin/records/enquiries'],
    ['patch', '/admin/bookings/' + bookingId, {status: 'Confirmed', internal_notes: ''}],
    ['patch', '/admin/enquiries/' + enquiryId, {status: 'Resolved', internal_notes: ''}],
    ['get', '/admin/export/bookings'], ['get', '/admin/export/enquiries'],
    ['get', '/admin/settings'], ['put', '/admin/settings', {phone: '+910000000000', whatsapp: '', email: '', address: 'x'}],
    ['get', '/admin/content'], ['put', '/admin/content', {}],
    ['get', '/admin/records/programmes'], ['post', '/admin/records/programmes', {slug: 'x', name: 'X'}],
    ['delete', '/admin/records/programmes/' + env.programmeId],
    ['get', '/admin/seo'], ['get', '/admin/media'], ['get', '/admin/pages/about'], ['get', '/admin/faqs'],
    ['get', '/admin/blocked-dates'], ['get', '/admin/users'], ['get', '/admin/security/mfa'], ['get', '/admin/master-review'],
    ['post', '/admin/users', {email: 'new@example.com', password: 'another-password-123', role: 'admin'}],
    ['patch', '/admin/users/' + staffId, {role: 'admin'}],
  ];
  for (const [method, path, json] of attempts) assert.equal((await c.request(method, path, {json, headers: HEADERS})).status, 403, `${method} ${path}`);
  assert.equal((await env.find('bookings', 'id=?', [bookingId]))!.status, 'Pending');
  assert.equal((await env.find('enquiries', 'id=?', [enquiryId]))!.status, 'New');
  assert.equal((await env.find('admin_users', 'id=?', [staffId]))!.role, 'staff_viewer');
  assert.ok(await env.find('programmes', 'id=?', [env.programmeId]));
});

scenario('super admin creates and disables staff accounts', async ({client}) => {
  const c = client(); await c.login();
  const created = await c.post('/admin/users', {email: 'Team.Member@example.com', password: 'team-member-pass-42', role: 'staff_viewer'});
  assert.equal(created.status, 201);
  assert.equal(created.json.email, 'team.member@example.com'); assert.equal(created.json.role, 'staff_viewer');
  assert.ok(!created.text.includes('password') && !created.text.includes('hash'));
  assert.equal((await c.post('/admin/users', {email: 'team.member@example.com', password: 'team-member-pass-42', role: 'staff_viewer'})).status, 409);
  assert.equal((await c.post('/admin/users', {email: 'weak@example.com', password: 'short', role: 'staff_viewer'})).status, 422);
  assert.equal((await c.post('/admin/users', {email: 'role@example.com', password: 'long-enough-pass-1', role: 'owner'})).status, 422);
  const users = (await c.get('/admin/users')).json as {id: string; email: string}[];
  const me = users.find(u => u.email === 'admin@example.com')!.id;
  assert.equal((await c.patch('/admin/users/' + me, {active: false})).status, 400);
  assert.equal((await c.patch('/admin/users/' + me, {role: 'staff_viewer'})).status, 400);
  const staff = client();
  const credentials = {email: 'team.member@example.com', password: 'team-member-pass-42'};
  assert.equal((await staff.post('/admin/login', credentials)).status, 200);
  assert.equal((await staff.get('/admin/staff/bookings')).status, 200);
  const disabled = await c.patch('/admin/users/' + created.json.id, {active: false});
  assert.equal(disabled.status, 200); assert.equal(disabled.json.active, false);
  assert.equal((await staff.get('/admin/staff/bookings')).status, 401);
  assert.equal((await staff.post('/admin/login', credentials)).status, 401);
});

scenario('only the super admin manages users', async ({client}) => {
  const c = client(); await c.login('editor@example.com');
  assert.equal((await c.get('/admin/users')).status, 403);
  assert.equal((await c.post('/admin/users', {email: 'x@example.com', password: 'long-enough-pass-1', role: 'admin'})).status, 403);
});

scenario('sessions rotate on login and end after a password reset', async ({client, db, find}) => {
  const c = client(); await c.login(); const first = c.cookie; await c.login();
  assert.notEqual(c.cookie, first);
  assert.equal((await rows(db, 'admin_sessions')).length, 1);
  const id = (await find('admin_users', 'email=?', ['admin@example.com']))!.id;
  assert.equal((await c.patch('/admin/users/' + id, {password: 'a-new-test-password-789'})).status, 200);
  assert.equal((await c.get('/admin/me')).status, 401);
});

scenario('security headers, body limits and private content fields', async ({client}) => {
  const c = client();
  const response = await c.get('/public/programmes');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal((await c.request('post', '/enquiries', {body: 'x'.repeat(131073), headers: {'Content-Type': 'application/json'}})).status, 413);
  await c.login();
  assert.equal((await c.get('/admin/me')).headers.get('cache-control'), 'no-store');
  assert.equal((await c.post('/admin/records/activities', {slug: 'private-data-check', name: 'Public activity', published: true, details: {internal_notes: 'NEVER PUBLIC', private_token: 'PRIVATE', description: 'Visible text'}})).status, 201);
  const text = (await c.get('/public/activities')).text;
  assert.ok(!text.includes('NEVER PUBLIC') && !text.includes('PRIVATE') && text.includes('Visible text'));
});

scenario('CORS only allows the configured frontend origin', async ({client}) => {
  const c = client();
  const allowed = await c.request('options', '/bookings', {headers: {Origin: 'http://localhost:3000'}});
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');
  const denied = await c.request('options', '/bookings', {headers: {Origin: 'https://attacker.invalid'}});
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
  assert.equal((await c.post('/bookings', {}, {Origin: 'https://attacker.invalid'})).status, 403);
});

scenario('MFA enrolment, replay protection, recovery codes and roles', async ({client, db}) => {
  const c = client();
  for (const email of ['staff@example.com', 'editor@example.com']) {
    await c.login(email);
    assert.equal((await c.get('/admin/security/mfa')).status, 403);
    assert.equal((await c.post('/admin/security/mfa/setup', {password: PASSWORD})).status, 403);
  }
  await c.login();
  assert.equal((await c.post('/admin/security/mfa/setup', {password: 'wrong'})).status, 401);
  const setupResult = await c.post('/admin/security/mfa/setup', {password: PASSWORD});
  assert.equal(setupResult.status, 200);
  const secret = setupResult.json.secret as string;
  assert.ok(!JSON.stringify(await rows(db, 'site_settings', '`key` LIKE ?', ['mfa:%'])).includes(secret));
  const code = totp(secret, Math.floor(Date.now() / 30000));
  assert.equal((await c.post('/admin/security/mfa/confirm', {password: PASSWORD, code: 'invalid'})).status, 401);
  const confirmed = await c.post('/admin/security/mfa/confirm', {password: PASSWORD, code});
  assert.equal(confirmed.status, 200);
  const recovery = confirmed.json.recovery_codes as string[];
  assert.equal(recovery.length, 10);
  assert.equal((await c.get('/admin/me')).status, 401);
  const credentials = {email: 'admin@example.com', password: PASSWORD};
  assert.equal((await c.post('/admin/login', credentials)).status, 401);
  assert.equal((await c.post('/admin/login', {...credentials, code})).status, 401, 'a used TOTP code must not be replayed');
  assert.equal((await c.post('/admin/login', {...credentials, code: recovery[0]})).status, 200);
  assert.equal((await c.post('/admin/login', {...credentials, code: recovery[0]})).status, 401);
  const status = (await c.get('/admin/security/mfa')).json;
  assert.ok(status.enabled); assert.equal(status.recovery_codes_remaining, 9);
  assert.ok(!(await c.get('/public/settings')).text.includes(secret));
  assert.equal((await c.post('/admin/security/mfa/disable', {password: PASSWORD, code: recovery[1]})).status, 200);
  assert.equal((await c.get('/admin/me')).status, 401);
  assert.equal((await c.post('/admin/login', credentials)).status, 200);
});

scenario('MFA cannot be enrolled without a server key', async ({client}) => {
  const c = client(); await c.login();
  assert.equal((await c.get('/admin/security/mfa')).json.available, false);
  assert.equal((await c.post('/admin/security/mfa/setup', {password: PASSWORD})).status, 503);
}, {env: {MFA_ENCRYPTION_KEY: ''}});

scenario('SEO audit and page revision dates', async ({client}) => {
  const c = client();
  assert.equal((await c.get('/admin/seo/audit')).status, 401);
  const updates = await c.get('/public/page-updates');
  assert.equal(updates.status, 200); assert.ok('/' in updates.json);
  assert.ok(!updates.text.includes('password') && !updates.text.includes('email'));
  await c.login();
  assert.equal((await c.put('/admin/seo', {page: '/gallery', title: 'Legacy gallery title', description: 'A long description for an old route.'})).status, 200);
  assert.equal((await c.get('/admin/seo/audit')).json.warnings[0].page, '/gallery');
});

scenario('identical form retries do not duplicate records', async ({client, db, programmeId}) => {
  const c = client();
  const first = await c.post('/bookings', booking(programmeId), {});
  const second = await c.post('/bookings', booking(programmeId), {});
  assert.equal(first.status, 201); assert.equal(second.status, 201);
  assert.equal(first.json.reference, second.json.reference);
  const retry = {...enquiry, email: 'retry@example.com', message: 'An enquiry repeated after a network error.'};
  assert.equal((await c.post('/enquiries', retry, {})).status, 201);
  assert.equal((await c.post('/enquiries', retry, {})).status, 201);
  assert.equal((await rows(db, 'bookings')).length, 1);
  assert.equal((await rows(db, 'enquiries')).length, 1);
});

const uploaded: {key: string; mime: string}[] = [];
scenario('media upload validates content and generates safe object keys', async ({client}) => {
  const c = client(); await c.login();
  const upload = (name: string, bytes: Buffer, type: string) => { const form = new FormData(); form.append('file', new Blob([bytes], {type}), name); return c.request('post', '/admin/media/upload', {body: form, headers: HEADERS}); };
  assert.equal((await upload('payload.svg', Buffer.from('<svg/>'), 'image/svg+xml')).status, 422);
  assert.equal((await upload('fake.png', Buffer.from('<script>evil</script>'), 'image/png')).status, 422);
  assert.equal((await upload('fake.webp', Buffer.from('RIFFnot webp'), 'image/webp')).status, 422);
  const response = await upload('../../payload.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from('test bytes')]), 'image/png');
  assert.equal(response.status, 201);
  assert.ok(uploaded[0].key.startsWith('media/') && !uploaded[0].key.includes('..') && uploaded[0].key.endsWith('.png'));
  assert.equal(uploaded[0].mime, 'image/png');
}, {
  env: {S3_BUCKET: 'test-bucket', S3_ACCESS_KEY_ID: 'test-only', S3_SECRET_ACCESS_KEY: 'test-only', MEDIA_PUBLIC_URL: 'https://media.example.com'},
  storage: {async put(key, _body, mime) { uploaded.push({key, mime}); }, async delete() {}},
});

scenario('only Super Admin and Staff Viewer roles can be assigned', async ({client}) => {
  const c = client(); await c.login();
  assert.equal((await c.post('/admin/users', {email: 'ed@example.com', password: 'long-enough-pass-1', role: 'editor'})).status, 422);
  const staff = (await c.get('/admin/users')).json.find((u: any) => u.email === 'staff@example.com');
  assert.equal((await c.patch('/admin/users/' + staff.id, {role: 'editor'})).status, 422);
});

scenario('homepage sections can be hidden and reordered, and persist', async ({client}) => {
  const c = client(); await c.login();
  const sections = [{id: 'programmes', visible: true}, {id: 'founder', visible: false}, {id: 'experience', visible: true}];
  assert.equal((await c.put('/admin/content', {...fixtures.home, sections})).status, 200);
  assert.deepEqual((await c.get('/public/home')).json.sections, sections);
  assert.equal((await c.put('/admin/content', {...fixtures.home, sections: [{id: 'founder'}, {id: 'founder'}]})).status, 422);
  assert.equal((await c.put('/admin/content', {...fixtures.home, sections: [{id: 'unknown'}]})).status, 422);
  assert.equal((await c.put('/admin/content', fixtures.home)).status, 200);
  assert.deepEqual((await c.get('/public/home')).json.sections, []);
});
