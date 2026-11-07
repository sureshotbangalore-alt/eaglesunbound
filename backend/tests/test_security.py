from test_api import setup, login, HEADERS, TEST_PASSWORD
from sqlalchemy import select
from app import models as m


def test_session_rotation_and_self_password_reset(setup):
    c,sessions,_=setup;login(c);first=c.cookies.get('eu_session');login(c)
    assert c.cookies.get('eu_session')!=first
    with sessions() as db:
        assert len(db.scalars(select(m.AdminSession)).all())==1
        uid=db.scalar(select(m.AdminUser.id).where(m.AdminUser.email=='admin@example.com'))
    assert c.patch('/admin/users/'+uid,json={'password':'a-new-test-password-789'},headers=HEADERS).status_code==200
    assert c.get('/admin/me').status_code==401


def test_headers_limits_and_private_content_fields(setup):
    c,_,_=setup
    response=c.get('/public/programmes')
    assert response.headers['x-robots-tag']=='noindex, nofollow'
    assert response.headers['x-content-type-options']=='nosniff'
    assert c.post('/enquiries',content='x'*131073).status_code==413
    login(c)
    assert c.get('/admin/me').headers['cache-control']=='no-store'
    data={'slug':'private-data-check','name':'Public activity','published':True,'details':{'internal_notes':'NEVER PUBLIC','private_token':'PRIVATE','description':'Visible text'}}
    assert c.post('/admin/records/activities',json=data,headers=HEADERS).status_code==201
    public=c.get('/public/activities').text
    assert 'NEVER PUBLIC' not in public and 'PRIVATE' not in public and 'Visible text' in public
    assert c.put('/admin/seo',json={'page':'/about','title':'About Eagles','description':'A sufficiently long description.','canonical':'https://user:password@example.com/about'},headers=HEADERS).status_code==422


def test_mfa_enrolment_replay_recovery_and_roles(setup,monkeypatch):
    from cryptography.fernet import Fernet
    from app.config import settings
    from pydantic import SecretStr
    from app.mfa import totp
    import time
    monkeypatch.setattr(settings,'mfa_encryption_key',SecretStr(Fernet.generate_key().decode()))
    c,sessions,_=setup
    for email in ['staff@example.com','editor@example.com']:
        login(c,email)
        assert c.get('/admin/security/mfa').status_code==403
        assert c.post('/admin/security/mfa/setup',json={'password':TEST_PASSWORD},headers=HEADERS).status_code==403
    login(c)
    assert c.post('/admin/security/mfa/setup',json={'password':'wrong'},headers=HEADERS).status_code==401
    result=c.post('/admin/security/mfa/setup',json={'password':TEST_PASSWORD},headers=HEADERS)
    assert result.status_code==200
    secret=result.json()['secret'];counter=int(time.time()//30)
    with sessions() as db:
        assert secret not in str(db.scalar(select(m.SiteSetting).where(m.SiteSetting.key.like('mfa:%'))).value)
    code=totp(secret,counter)
    assert c.post('/admin/security/mfa/confirm',json={'password':TEST_PASSWORD,'code':'invalid'},headers=HEADERS).status_code==401
    confirmed=c.post('/admin/security/mfa/confirm',json={'password':TEST_PASSWORD,'code':code},headers=HEADERS)
    assert confirmed.status_code==200
    recovery=confirmed.json()['recovery_codes'];assert len(recovery)==10
    assert c.get('/admin/me').status_code==401
    credentials={'email':'admin@example.com','password':TEST_PASSWORD}
    assert c.post('/admin/login',json=credentials,headers=HEADERS).status_code==401
    assert c.post('/admin/login',json={**credentials,'code':code},headers=HEADERS).status_code==401
    assert c.post('/admin/login',json={**credentials,'code':recovery[0]},headers=HEADERS).status_code==200
    assert c.post('/admin/login',json={**credentials,'code':recovery[0]},headers=HEADERS).status_code==401
    status=c.get('/admin/security/mfa').json();assert status['enabled'] and status['recovery_codes_remaining']==9
    assert secret not in c.get('/public/settings').text
    with sessions() as db:
        assert recovery[1] not in str(db.scalar(select(m.SiteSetting).where(m.SiteSetting.key.like('mfa:%'))).value)
    assert c.post('/admin/security/mfa/disable',json={'password':TEST_PASSWORD,'code':recovery[1]},headers=HEADERS).status_code==200
    assert c.get('/admin/me').status_code==401
    assert c.post('/admin/login',json=credentials,headers=HEADERS).status_code==200


def test_mfa_cannot_enrol_without_server_key(setup,monkeypatch):
    from app.config import settings
    from pydantic import SecretStr
    monkeypatch.setattr(settings,'mfa_encryption_key',SecretStr(''))
    c,_,_=setup;login(c)
    assert c.get('/admin/security/mfa').json()['available'] is False
    assert c.post('/admin/security/mfa/setup',json={'password':TEST_PASSWORD},headers=HEADERS).status_code==503


def test_seo_audit_and_revision_dates(setup):
    c,_,_=setup
    assert c.get('/admin/seo/audit').status_code==401
    updates=c.get('/public/page-updates');assert updates.status_code==200 and '/' in updates.json()
    assert 'password' not in updates.text and 'email' not in updates.text
    login(c)
    data={'page':'/gallery','title':'Legacy gallery title','description':'A long description for an old route.'}
    assert c.put('/admin/seo',json=data,headers=HEADERS).status_code==200
    assert c.get('/admin/seo/audit').json()['warnings'][0]['page']=='/gallery'


def test_identical_form_retries_do_not_duplicate_records(setup):
    from test_api import payload
    c,sessions,pid=setup
    first=c.post('/bookings',json=payload(pid));second=c.post('/bookings',json=payload(pid))
    assert first.status_code==201 and second.status_code==201
    assert first.json()['reference']==second.json()['reference']
    enquiry={'name':'Retry Visitor','email':'retry@example.com','phone':'+919876543210','category':'General','message':'An enquiry repeated after a network error.','consent':True}
    assert c.post('/enquiries',json=enquiry).status_code==201
    assert c.post('/enquiries',json=enquiry).status_code==201
    with sessions() as db:
        assert len(db.scalars(select(m.Booking)).all())==1
        assert len(db.scalars(select(m.Enquiry)).all())==1


def test_production_disables_interactive_api_documentation():
    import os,subprocess,sys
    from pathlib import Path
    env={**os.environ,'ENVIRONMENT':'production','DATABASE_URL':'mysql+pymysql://unused:unused@127.0.0.1/unused','PUBLIC_ORIGIN':'https://eagles.example.com','COOKIE_SECURE':'true'}
    result=subprocess.run([sys.executable,'-c','from app.main import app; assert app.docs_url is None and app.redoc_url is None and app.openapi_url is None and not app.debug'],cwd=Path(__file__).resolve().parents[1],env=env,capture_output=True)
    assert result.returncode==0, result.stderr.decode()


def test_media_upload_validates_format_and_uses_generated_object_keys(setup,monkeypatch):
    import boto3
    from app.config import settings
    c,_,_=setup;login(c)
    for name,value in [('s3_bucket','test-bucket'),('s3_access_key_id','test-only'),('s3_secret_access_key','test-only'),('media_public_url','https://media.example.com')]:monkeypatch.setattr(settings,name,value)
    uploaded=[]
    class Storage:
        def put_object(self,**kwargs):uploaded.append(kwargs)
    monkeypatch.setattr(boto3,'client',lambda *a,**kw:Storage())
    assert c.post('/admin/media/upload',files={'file':('payload.svg',b'<svg/>','image/svg+xml')},headers=HEADERS).status_code==422
    assert c.post('/admin/media/upload',files={'file':('fake.png',b'<script>evil</script>','image/png')},headers=HEADERS).status_code==422
    assert c.post('/admin/media/upload',files={'file':('fake.webp',b'RIFF'+b'not webp','image/webp')},headers=HEADERS).status_code==422
    response=c.post('/admin/media/upload',files={'file':('../../payload.png',b'\x89PNG\r\n\x1a\n'+b'test bytes','image/png')},headers=HEADERS)
    assert response.status_code==201
    assert uploaded[0]['Key'].startswith('media/') and '..' not in uploaded[0]['Key'] and uploaded[0]['Key'].endswith('.png')
    assert uploaded[0]['ContentType']=='image/png'
