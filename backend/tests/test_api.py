from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from pwdlib import PasswordHash
from app.main import app, limits
from app.db import Base, get_db
from app import models as m
from app.seed import HOME

HEADERS = {'X-Requested-With': 'EaglesAdmin', 'Origin': 'http://localhost:3000'}
TEST_PASSWORD = 'a-test-only-password-93849'


@pytest.fixture
def setup(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings,'smtp_host','')
    monkeypatch.setattr(settings,'s3_bucket','')
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    @event.listens_for(engine, 'connect')
    def foreign_keys(connection, _):
        connection.execute('PRAGMA foreign_keys=ON')
    Base.metadata.create_all(engine)
    sessions = sessionmaker(engine, expire_on_commit=False)
    with sessions() as db:
        db.add_all([
            m.AdminUser(email='admin@example.com', password_hash=PasswordHash.recommended().hash(TEST_PASSWORD), role='admin'),
            m.AdminUser(email='editor@example.com', password_hash=PasswordHash.recommended().hash(TEST_PASSWORD), role='editor'),
            m.AdminUser(email='staff@example.com', password_hash=PasswordHash.recommended().hash(TEST_PASSWORD), role='staff_viewer'),
            m.PageContent(slug='home', content=HOME),
            m.SiteSetting(key='contact', value={'phone': '+917259307111', 'whatsapp': '', 'email': '', 'address': 'Bengaluru'}),
            m.Programme(slug='test-programme', name='Test programme', published=True),
            m.Programme(slug='draft-programme', name='Draft programme', published=False),
        ])
        db.commit()
        programme_id = db.scalar(select(m.Programme.id).where(m.Programme.slug == 'test-programme'))
    def override():
        with sessions() as db:
            yield db
    app.dependency_overrides[get_db] = override
    limits.clear()
    with TestClient(app) as client:
        yield client, sessions, programme_id
    app.dependency_overrides.clear()
    engine.dispose()


def login(client, email='admin@example.com'):
    response = client.post('/admin/login', json={'email': email, 'password': TEST_PASSWORD}, headers=HEADERS)
    assert response.status_code == 200
    assert 'HttpOnly' in response.headers['set-cookie']
    assert 'SameSite=lax' in response.headers['set-cookie']


def payload(programme_id):
    return {'name': 'Test Visitor', 'email': 'visitor@example.com', 'mobile': '+919876543210', 'programme_id': programme_id, 'preferred_date': str(date.today() + timedelta(days=10)), 'participants': 8, 'group_type': 'Corporate', 'consent': True}


def test_private_routes_and_csrf(setup):
    c,_,_ = setup
    for path in ['/admin/me','/admin/records/bookings','/admin/content','/admin/media','/admin/seo']:
        assert c.get(path).status_code == 401
    assert c.post('/admin/login', json={'email':'admin@example.com','password':TEST_PASSWORD}).status_code == 403
    assert c.post('/admin/login', json={'email':'admin@example.com','password':TEST_PASSWORD}, headers={**HEADERS,'Origin':'https://attacker.invalid'}).status_code == 403


def test_login_logout_and_wrong_password(setup):
    c,_,_ = setup
    assert c.post('/admin/login', json={'email':'admin@example.com','password':'wrong'}, headers=HEADERS).status_code == 401
    login(c)
    assert c.get('/admin/me').json()['role'] == 'admin'
    assert c.post('/admin/logout', headers=HEADERS).status_code == 200
    assert c.get('/admin/me').status_code == 401


def test_cms_persists_and_updates_public_content(setup):
    c,sessions,_=setup
    login(c)
    content={**HOME,'hero_title':'THE PERSISTENT CHALLENGE.'}
    assert c.put('/admin/content',json=content,headers=HEADERS).status_code == 200
    assert c.get('/public/home').json()['hero_title'] == content['hero_title']
    with sessions() as db:
        assert db.scalar(select(m.PageContent)).content['hero_title'] == content['hero_title']
        assert db.scalar(select(m.AuditLog).where(m.AuditLog.action == 'Updated homepage')) is not None


def test_editor_cannot_access_customer_data_or_settings(setup):
    c,_,_=setup
    login(c,'editor@example.com')
    for path in ['/admin/records/bookings','/admin/records/enquiries','/admin/settings','/admin/export/bookings','/admin/overview']:
        assert c.get(path).status_code == 403
    assert c.put('/admin/content',json=HOME,headers=HEADERS).status_code == 200


def test_booking_persistence_reference_and_status_history(setup):
    c,sessions,pid=setup
    result=c.post('/bookings',json=payload(pid))
    assert result.status_code == 201
    assert result.json()['status'] == 'Pending'
    with sessions() as db:
        booking=db.scalar(select(m.Booking))
        assert booking.reference == result.json()['reference']
        booking_id=booking.id
        assert len(db.scalars(select(m.BookingStatusHistory)).all()) == 1
    login(c)
    update=c.patch('/admin/bookings/'+booking_id,json={'status':'Contacted','internal_notes':'Called the group organiser.'},headers=HEADERS)
    assert update.status_code == 200
    with sessions() as db:
        assert db.get(m.Booking,booking_id).status == 'Contacted'
        assert len(db.scalars(select(m.BookingStatusHistory)).all()) == 2


def test_booking_validation_and_blocked_dates(setup):
    c,_,pid=setup
    data=payload(pid)
    assert c.post('/bookings',json={**data,'participants':0}).status_code == 422
    assert c.post('/bookings',json={**data,'consent':False}).status_code == 422
    assert c.post('/bookings',json={**data,'programme_id':'missing'}).status_code == 422
    assert c.post('/bookings',json={**data,'preferred_date':'2020-01-01'}).status_code == 422
    assert c.post('/bookings',json={**data,'website':'spam'}).status_code == 400
    login(c)
    assert c.post('/admin/blocked-dates',json={'day':data['preferred_date'],'reason':'Closed'},headers=HEADERS).status_code == 201
    assert c.post('/bookings',json=data).status_code == 409


def test_enquiry_saved_and_admin_can_update(setup):
    c,sessions,_=setup
    response=c.post('/enquiries',json={'name':'Enquiry Test','email':'test@example.com','phone':'+919876543210','category':'General','message':'Tell me about the available experiences.','consent':True})
    assert response.status_code == 201
    with sessions() as db:
        row=db.scalar(select(m.Enquiry));rid=row.id
        assert row.status == 'New'
    login(c)
    assert c.patch('/admin/enquiries/'+rid,json={'status':'Resolved','internal_notes':'Replied.'},headers=HEADERS).status_code == 200
    assert 'test@example.com' in c.get('/admin/export/enquiries').text


def test_publishing_unique_slug_and_unpublishing(setup):
    c,_,_=setup
    assert len(c.get('/public/programmes').json()) == 1
    login(c)
    content={'name':'New experience','slug':'new-experience','description':'Test only','published':False}
    added=c.post('/admin/records/programmes',json=content,headers=HEADERS)
    assert added.status_code == 201
    rid=added.json()['id']
    assert len(c.get('/public/programmes').json()) == 1
    assert c.post('/admin/records/programmes',json=content,headers=HEADERS).status_code == 409
    assert c.put('/admin/records/programmes/'+rid,json={**content,'published':True},headers=HEADERS).status_code == 200
    assert len(c.get('/public/programmes').json()) == 2
    assert c.delete('/admin/records/programmes/'+rid,headers=HEADERS).status_code == 200


def test_seo_validation_and_faq_publishing(setup):
    c,_,_=setup;login(c)
    data={'page':'/about','title':'About Eagles Unbound','description':'Useful metadata about Eagles Unbound and its outdoor experiences.'}
    assert c.put('/admin/seo',json={**data,'canonical':'javascript:alert(1)'},headers=HEADERS).status_code == 422
    assert c.put('/admin/seo',json=data,headers=HEADERS).status_code == 200
    assert c.get('/public/seo').json()[0]['title'] == data['title']
    faq=c.post('/admin/faqs',json={'question':'What is this experience?','answer':'A client-approved answer goes here.','published':False},headers=HEADERS)
    assert faq.status_code == 201
    assert c.get('/public/faqs').json() == []
    assert c.put('/admin/faqs/'+faq.json()['id'],json={'question':'What is this experience?','answer':'A client-approved answer goes here.','published':True},headers=HEADERS).status_code == 200
    assert len(c.get('/public/faqs').json()) == 1


def test_rate_limit_and_unconfigured_storage(setup):
    c,_,_=setup
    for _ in range(8):
        c.post('/admin/login',json={'email':'nobody@example.com','password':'wrong'},headers=HEADERS)
    assert c.post('/admin/login',json={'email':'nobody@example.com','password':'wrong'},headers=HEADERS).status_code == 429
    limits.clear();login(c)
    assert c.post('/admin/media/upload',files={'file':('test.png',b'not an image','image/png')},headers=HEADERS).status_code == 503


def test_media_reference_protection(setup):
    c,_,_=setup;login(c)
    asset=c.post('/admin/media',json={'name':'Test photo','url':'https://example.com/photo.jpg','mime_type':'image/jpeg'},headers=HEADERS)
    assert asset.status_code == 201
    image=asset.json()['url'];rid=asset.json()['id']
    album=c.post('/admin/records/gallery',json={'name':'Test album','slug':'test-album','details':{'media':[{'url':image,'caption':'Test photo','type':'image'}]}},headers=HEADERS)
    assert album.status_code == 201
    assert c.delete('/admin/media/'+rid,headers=HEADERS).status_code == 409
    assert c.delete('/admin/records/gallery/'+album.json()['id'],headers=HEADERS).status_code == 200
    assert c.delete('/admin/media/'+rid,headers=HEADERS).status_code == 200


def test_expired_session_is_rejected(setup):
    from datetime import datetime, timezone
    c,sessions,_=setup;login(c)
    with sessions() as db:
        session=db.scalar(select(m.AdminSession))
        session.expires_at=datetime.now(timezone.utc)-timedelta(hours=1)
        db.commit()
    assert c.get('/admin/me').status_code == 401


def test_page_story_draft_and_publish(setup):
    c,_,_=setup;login(c,'editor@example.com')
    content={'title':'OUR APPROVED STORY','intro':'An approved introduction for this test.','sections':[{'heading':'Our approach','body':'Approved factual story text for testing.'}],'published':False}
    assert c.put('/admin/pages/about',json=content,headers=HEADERS).status_code == 200
    assert c.get('/public/pages').json() == []
    assert c.put('/admin/pages/about',json={**content,'published':True},headers=HEADERS).status_code == 200
    assert c.get('/public/pages').json()[0]['title'] == content['title']
    assert c.put('/admin/pages/nonexistent',json=content,headers=HEADERS).status_code == 404


def test_expanded_enquiry_details_and_meal_validation(setup):
    c,sessions,pid=setup
    request={'name':'Institution organiser','email':'group@example.com','phone':'+919876543210','category':'Student programme','message':'Please help us plan our group experience.','consent':True,'organisation':'Test school','visitor_category':'School','programme':'School Day Outing','participants':40,'preferred_date':str(date.today()+timedelta(days=20)),'vegetarian_meals':30,'non_vegetarian_meals':10,'special_requirements':'Please discuss access needs.'}
    assert c.post('/enquiries',json=request).status_code==201
    with sessions() as db:
        row=db.scalar(select(m.Enquiry));assert row.details['vegetarian_meals']==30;assert row.details['organisation']=='Test school';assert row.details['visitor_category']=='School'
    assert c.post('/enquiries',json={**request,'non_vegetarian_meals':20}).status_code==422
    assert c.post('/bookings',json={**payload(pid),'vegetarian_meals':9}).status_code==422
    assert c.post('/bookings',json={**payload(pid),'vegetarian_meals':6,'non_vegetarian_meals':2}).status_code==201
    with sessions() as db:assert db.scalar(select(m.Booking)).details['vegetarian_meals']==6


def test_master_catalogue_has_all_names_without_duplicates(setup,monkeypatch):
    import importlib,json
    module=importlib.import_module('app.seed_master')
    c,sessions,_=setup;monkeypatch.setattr(module,'SessionLocal',sessions)
    module.seed_master()
    with sessions() as db:
        rows=db.scalars(select(m.Activity)).all();before=len(rows)
        names={row.name for row in rows}
        names.update(alias for row in rows for alias in row.details.get('aliases',[]))
        expected=json.loads((module.DATA/'master-activities.json').read_text(encoding='utf-8'))
        assert {a['name'] for a in expected['activities']}<=names
        assert len({row.slug for row in rows})==len(rows)
        assert not db.scalar(select(m.Activity).where(m.Activity.name=='Pelvic Rest Shooting')).published
        assert not db.scalar(select(m.Activity).where(m.Activity.name=='Recove Bow Shooting')).published
    module.seed_master()
    with sessions() as db:assert len(db.scalars(select(m.Activity)).all())==before
    assert len([p for p in c.get('/public/programmes').json() if p['slug'] in {'school-day-outing','outbound-student-activities','college-adventure-program','overnight-stay-program','corporate-team-building','outdoor-adventure-program'}])==6
    assert c.get('/admin/master-review').status_code==401


def test_unapproved_testimonial_and_reported_claims_stay_private(setup):
    c,_,_=setup;login(c)
    row={'name':'Approved client','slug':'approved-client','published':True,'details':{'testimonial_quote':'A quotation awaiting permission.','testimonial_approved':False,'reported_service_claim':'Unverified fact'}}
    created=c.post('/admin/records/clients',json=row,headers=HEADERS);assert created.status_code==201
    details=c.get('/public/clients').json()[0]['details'];assert 'testimonial_quote' not in details;assert 'reported_service_claim' not in details
    assert c.put('/admin/records/clients/'+created.json()['id'],json={**row,'details':{**row['details'],'testimonial_approved':True}},headers=HEADERS).status_code==200
    assert c.get('/public/clients').json()[0]['details']['testimonial_quote']==row['details']['testimonial_quote']
    assert c.post('/admin/records/clients',json={**row,'slug':'invalid-video','details':{'testimonial_video':'javascript:alert(1)'}},headers=HEADERS).status_code==422


# ---------- Role-based access: Super Admin and Staff Viewer ----------
def seed_requests(client, programme_id):
    booking = client.post('/bookings', json=payload(programme_id), headers=HEADERS)
    assert booking.status_code == 201
    enquiry = client.post('/enquiries', json={'name': 'Enquiry Visitor', 'email': 'ask@example.com', 'phone': '+919876543210', 'category': 'Corporate', 'message': 'Tell me about team days.', 'consent': True}, headers=HEADERS)
    assert enquiry.status_code == 201
    return booking.json()['reference']


def test_staff_can_read_bookings_and_enquiries(setup):
    client, sessions, programme_id = setup
    reference = seed_requests(client, programme_id)
    with sessions() as db:
        row = db.scalar(select(m.Booking).where(m.Booking.reference == reference))
        row.internal_notes = 'admin-only note'
        db.commit()
    login(client, 'staff@example.com')
    assert client.get('/admin/me').json()['role'] == 'staff_viewer'
    bookings = client.get('/admin/staff/bookings')
    assert bookings.status_code == 200
    first = bookings.json()[0]
    assert first['reference'] == reference and first['name'] == 'Test Visitor' and first['mobile'] and first['participants'] == 8
    assert first['programme'] == 'Test programme' and first['status'] == 'Pending' and first['preferred_date']
    assert 'internal_notes' not in first and 'admin-only note' not in bookings.text
    enquiries = client.get('/admin/staff/enquiries')
    assert enquiries.status_code == 200 and enquiries.json()[0]['name'] == 'Enquiry Visitor'
    assert 'internal_notes' not in enquiries.json()[0]


def test_staff_is_blocked_from_every_restricted_api(setup):
    client, sessions, programme_id = setup
    seed_requests(client, programme_id)
    with sessions() as db:
        booking_id = db.scalar(select(m.Booking.id))
        enquiry_id = db.scalar(select(m.Enquiry.id))
        staff_id = db.scalar(select(m.AdminUser.id).where(m.AdminUser.email == 'staff@example.com'))
    login(client, 'staff@example.com')
    attempts = [
        ('get', '/admin/overview', None), ('get', '/admin/records/bookings', None), ('get', '/admin/records/enquiries', None),
        ('patch', f'/admin/bookings/{booking_id}', {'status': 'Confirmed', 'internal_notes': ''}),
        ('patch', f'/admin/enquiries/{enquiry_id}', {'status': 'Resolved', 'internal_notes': ''}),
        ('get', '/admin/export/bookings', None), ('get', '/admin/export/enquiries', None),
        ('get', '/admin/settings', None), ('put', '/admin/settings', {'phone': '+910000000000', 'whatsapp': '', 'email': '', 'address': 'x'}),
        ('get', '/admin/content', None), ('put', '/admin/content', {}),
        ('get', '/admin/records/programmes', None), ('post', '/admin/records/programmes', {'slug': 'x', 'name': 'X'}),
        ('delete', f'/admin/records/programmes/{programme_id}', None),
        ('get', '/admin/seo', None), ('get', '/admin/media', None), ('get', '/admin/pages/home', None), ('get', '/admin/faqs', None),
        ('get', '/admin/blocked-dates', None), ('get', '/admin/users', None),
        ('post', '/admin/users', {'email': 'new@example.com', 'password': 'another-password-123', 'role': 'admin'}),
        ('patch', f'/admin/users/{staff_id}', {'role': 'admin'}),
    ]
    for method, path, body in attempts:
        kwargs = {'json': body} if body is not None else {}
        response = getattr(client, method)(path, headers=HEADERS, **kwargs)
        assert response.status_code == 403, (method, path, response.status_code)
    with sessions() as db:
        assert db.get(m.Booking, booking_id).status == 'Pending'
        assert db.get(m.Enquiry, enquiry_id).status == 'New'
        assert db.get(m.AdminUser, staff_id).role == 'staff_viewer'
        assert db.get(m.Programme, programme_id) is not None


def test_super_admin_creates_and_disables_staff(setup):
    client, _, _ = setup
    login(client)
    created = client.post('/admin/users', json={'email': 'Team.Member@example.com', 'password': 'team-member-pass-42', 'role': 'staff_viewer'}, headers=HEADERS)
    assert created.status_code == 201
    assert created.json()['email'] == 'team.member@example.com' and created.json()['role'] == 'staff_viewer'
    assert 'password' not in created.text and 'hash' not in created.text
    assert client.post('/admin/users', json={'email': 'team.member@example.com', 'password': 'team-member-pass-42', 'role': 'staff_viewer'}, headers=HEADERS).status_code == 409
    assert client.post('/admin/users', json={'email': 'weak@example.com', 'password': 'short', 'role': 'staff_viewer'}, headers=HEADERS).status_code == 422
    assert client.post('/admin/users', json={'email': 'role@example.com', 'password': 'long-enough-pass-1', 'role': 'owner'}, headers=HEADERS).status_code == 422
    users = client.get('/admin/users').json()
    assert {u['email'] for u in users} >= {'admin@example.com', 'team.member@example.com'}
    me_id = next(u['id'] for u in users if u['email'] == 'admin@example.com')
    assert client.patch(f'/admin/users/{me_id}', json={'active': False}, headers=HEADERS).status_code == 400
    assert client.patch(f'/admin/users/{me_id}', json={'role': 'staff_viewer'}, headers=HEADERS).status_code == 400

    staff = TestClient(app)
    credentials = {'email': 'team.member@example.com', 'password': 'team-member-pass-42'}
    assert staff.post('/admin/login', json=credentials, headers=HEADERS).status_code == 200
    assert staff.get('/admin/staff/bookings').status_code == 200
    new_id = created.json()['id']
    disabled = client.patch(f'/admin/users/{new_id}', json={'active': False}, headers=HEADERS)
    assert disabled.status_code == 200 and disabled.json()['active'] is False
    assert staff.get('/admin/staff/bookings').status_code == 401  # session ended immediately
    assert staff.post('/admin/login', json=credentials, headers=HEADERS).status_code == 401


def test_only_super_admin_manages_users(setup):
    client, _, _ = setup
    login(client, 'editor@example.com')
    assert client.get('/admin/users').status_code == 403
    assert client.post('/admin/users', json={'email': 'x@example.com', 'password': 'long-enough-pass-1', 'role': 'admin'}, headers=HEADERS).status_code == 403
