import csv
import hashlib
import io
import logging
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone, date
from typing import Annotated
from fastapi import FastAPI, Depends, HTTPException, Request, Response, UploadFile, File, BackgroundTasks
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from pwdlib import PasswordHash
from .config import settings
from .db import get_db
from . import models as m, schemas as s
from .notifications import notify

app = FastAPI(title='Eagles Unbound API', version='0.1.0')
DB = Annotated[Session, Depends(get_db)]
password_hash = PasswordHash.recommended()
dummy_hash = password_hash.hash(secrets.token_urlsafe(32))
limits: dict[str, deque] = defaultdict(deque)
MODULES = {'programmes': m.Programme, 'activities': m.Activity, 'clients': m.Client, 'gallery': m.GalleryAlbum, 'packages': m.Package}


@app.middleware('http')
async def security(request: Request, call_next):
    if request.method in {'POST', 'PUT', 'PATCH', 'DELETE'}:
        origin = request.headers.get('origin')
        if origin and origin != settings.public_origin:
            return Response('Origin not allowed', status_code=403)
        if request.url.path.startswith('/admin') and request.headers.get('x-requested-with') != 'EaglesAdmin':
            return Response('Missing request protection', status_code=403)
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    if request.url.path.startswith('/admin'):
        response.headers['Cache-Control'] = 'no-store'
    return response


def rate_limit(request: Request, category: str, maximum: int):
    # Deliberately trust the socket peer only. Use an edge limiter for multi-worker production.
    key = category + ':' + (request.client.host if request.client else 'unknown')
    cutoff = time.monotonic() - 600
    bucket = limits[key]
    while bucket and bucket[0] < cutoff:
        bucket.popleft()
    if len(bucket) >= maximum:
        raise HTTPException(429, 'Too many attempts. Please try again in ten minutes.')
    bucket.append(time.monotonic())
    if len(limits) > 10000:
        for old_key in list(limits):
            if not limits[old_key] or limits[old_key][-1] < cutoff:
                del limits[old_key]


# Staff viewers are read-only and denied by default: these are the only admin routes they may call.
# Any other route, including ones added later, returns 403 for them.
STAFF_ROUTES = {('GET', '/admin/me'), ('POST', '/admin/logout'), ('GET', '/admin/staff/bookings'), ('GET', '/admin/staff/enquiries')}


def current_user(request: Request, db: DB):
    token = request.cookies.get('eu_session', '')
    session = db.scalar(select(m.AdminSession).where(m.AdminSession.token_hash == hashlib.sha256(token.encode()).hexdigest()))
    if not session or session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(401, 'Please sign in')
    user = db.get(m.AdminUser, session.user_id)
    if not user or not user.active:
        raise HTTPException(401, 'Please sign in')
    if user.role == 'staff_viewer' and (request.method, request.url.path) not in STAFF_ROUTES:
        raise HTTPException(403, 'Your account can only view bookings and enquiries.')
    return user


USER = Annotated[m.AdminUser, Depends(current_user)]


def require_admin(user):
    if user.role != 'admin':
        raise HTTPException(403, 'Administrator role required')


def audit(db, user, action):
    db.add(m.AuditLog(actor_id=user.id, action=action))


def model_for(module):
    model = MODULES.get(module)
    if not model:
        raise HTTPException(404, 'Module not found')
    return model


def public_details(details):
    approved=details.get('testimonial_approved') is True
    return {key:value for key,value in details.items() if not key.startswith('reported_') and key not in ('confirmation_required','source_status') and (approved or not key.startswith('testimonial_'))}


def commit(db):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'This slug or record already exists, or is still in use.')


@app.get('/health')
def health(db: DB):
    db.execute(select(1))
    return {'status': 'ok'}


@app.get('/public/home')
def home(db: DB):
    record = db.scalar(select(m.PageContent).where(m.PageContent.slug == 'home'))
    if not record:
        raise HTTPException(503, 'Content has not been seeded')
    return record.content


@app.get('/public/settings')
def contact_settings(db: DB):
    record = db.scalar(select(m.SiteSetting).where(m.SiteSetting.key == 'contact'))
    return record.value if record else {}


@app.get('/public/{module}')
def public_list(module: str, db: DB):
    if module == 'faqs':
        return db.scalars(select(m.FAQ).where(m.FAQ.published.is_(True)).order_by(m.FAQ.display_order)).all()
    if module == 'seo':
        return [r.value for r in db.scalars(select(m.SiteSetting).where(m.SiteSetting.key.like('seo:%'))).all()]
    if module == 'pages':
        return [{'slug':r.slug,**r.content} for r in db.scalars(select(m.PageContent).where(m.PageContent.slug != 'home')).all() if r.content.get('published')]
    model = model_for(module)
    rows=db.scalars(select(model).where(model.published.is_(True)).order_by(model.display_order)).all()
    return [{key:getattr(row,key) for key in ('id','slug','name','description','image','published','display_order','created_at','updated_at')} | {'details':public_details(row.details)} for row in rows]


EDITABLE_PAGES={'about','the-bootcamp','privacy-policy','terms-and-conditions','booking-policy','founder','kids-experiences','schools-and-colleges','corporate','accommodation','food-and-dining'}


@app.get('/admin/master-review')
def master_review(user: USER, db: DB):
    require_admin(user)
    row=db.scalar(select(m.SiteSetting).where(m.SiteSetting.key=='master_review'))
    return row.value if row else {}


@app.get('/admin/pages/{slug}')
def editable_page(slug: str, user: USER, db: DB):
    if slug not in EDITABLE_PAGES:
        raise HTTPException(404)
    row=db.scalar(select(m.PageContent).where(m.PageContent.slug == slug))
    return row.content if row else {'title':'','intro':'','sections':[],'published':False}


@app.put('/admin/pages/{slug}')
def save_page(slug: str, data: s.PageInput, user: USER, db: DB):
    if slug not in EDITABLE_PAGES:
        raise HTTPException(404)
    row=db.scalar(select(m.PageContent).where(m.PageContent.slug == slug))
    if row:
        row.content=data.model_dump()
    else:
        db.add(m.PageContent(slug=slug,content=data.model_dump()))
    audit(db,user,'Updated page '+slug)
    commit(db)
    return data


@app.get('/admin/faqs')
def admin_faqs(user: USER, db: DB):
    return db.scalars(select(m.FAQ).order_by(m.FAQ.display_order)).all()


@app.post('/admin/faqs', status_code=201)
def add_faq(data: s.FAQInput, user: USER, db: DB):
    row = m.FAQ(**data.model_dump())
    db.add(row)
    audit(db, user, 'Created FAQ')
    commit(db)
    return row


@app.put('/admin/faqs/{record_id}')
def edit_faq(record_id: str, data: s.FAQInput, user: USER, db: DB):
    row = db.get(m.FAQ, record_id)
    if not row:
        raise HTTPException(404)
    for key, value in data.model_dump().items():
        setattr(row, key, value)
    audit(db, user, 'Updated FAQ')
    commit(db)
    return row


@app.delete('/admin/faqs/{record_id}')
def delete_faq(record_id: str, user: USER, db: DB):
    row = db.get(m.FAQ, record_id)
    if not row:
        raise HTTPException(404)
    db.delete(row)
    audit(db, user, 'Deleted FAQ')
    commit(db)
    return {'ok': True}


@app.get('/admin/seo')
def admin_seo(user: USER, db: DB):
    return [r.value for r in db.scalars(select(m.SiteSetting).where(m.SiteSetting.key.like('seo:%'))).all()]


@app.put('/admin/seo')
def save_seo(data: s.SEOInput, user: USER, db: DB):
    key = 'seo:' + data.page
    row = db.scalar(select(m.SiteSetting).where(m.SiteSetting.key == key))
    if row:
        row.value = data.model_dump()
    else:
        db.add(m.SiteSetting(key=key, value=data.model_dump()))
    audit(db, user, 'Updated SEO ' + data.page)
    commit(db)
    return data


@app.get('/admin/media')
def media_list(user: USER, db: DB):
    return db.scalars(select(m.MediaAsset).order_by(m.MediaAsset.created_at.desc())).all()


@app.delete('/admin/media/{record_id}')
def delete_media(record_id: str, user: USER, db: DB):
    import json
    row = db.get(m.MediaAsset, record_id)
    if not row:
        raise HTTPException(404, 'Asset not found')
    for model in (m.Programme, m.Activity, m.Client, m.GalleryAlbum, m.Package):
        for content in db.scalars(select(model)).all():
            if content.image == row.url or row.url in json.dumps(content.details):
                raise HTTPException(409, 'This asset is still used by website content. Remove those references first.')
    for page in db.scalars(select(m.PageContent)).all():
        if row.url in json.dumps(page.content):
            raise HTTPException(409, 'This asset is used on a page.')
    for setting in db.scalars(select(m.SiteSetting)).all():
        if row.url in json.dumps(setting.value):
            raise HTTPException(409, 'This asset is used by site settings or metadata.')
    # External media remains owned by its original host. Uploaded objects use generated keys only.
    prefix=settings.media_public_url.rstrip('/') + '/media/'
    if settings.media_public_url and row.url.startswith(prefix) and settings.s3_bucket:
        import boto3
        storage=boto3.client('s3', endpoint_url=settings.s3_endpoint_url or None, region_name=settings.s3_region, aws_access_key_id=settings.s3_access_key_id, aws_secret_access_key=settings.s3_secret_access_key)
        try:
            storage.delete_object(Bucket=settings.s3_bucket, Key='media/' + row.url[len(prefix):])
        except Exception:
            raise HTTPException(502, 'Object storage deletion failed. The media record has been preserved.')
    db.delete(row)
    audit(db,user,'Deleted unused media ' + record_id)
    commit(db)
    return {'ok':True}


@app.post('/admin/media', status_code=201)
def add_media(data: s.MediaInput, user: USER, db: DB):
    if data.mime_type == 'video/youtube':
        from urllib.parse import urlparse
        if urlparse(data.url).hostname not in ('www.youtube.com', 'youtube.com', 'youtu.be'):
            raise HTTPException(422, 'Use a YouTube URL')
    row = m.MediaAsset(**data.model_dump())
    db.add(row)
    audit(db, user, 'Added external media')
    commit(db)
    return row


@app.post('/admin/media/upload', status_code=201)
def upload_media(user: USER, db: DB, file: UploadFile = File(...)):
    if not all([settings.s3_bucket, settings.s3_access_key_id, settings.s3_secret_access_key, settings.media_public_url]):
        raise HTTPException(503, 'Configure S3 storage and a public media URL before uploading. External HTTPS media links can be added now.')
    allowed = {'image/jpeg': ('.jpg', b'\xff\xd8\xff'), 'image/png': ('.png', b'\x89PNG\r\n\x1a\n'), 'image/webp': ('.webp', b'RIFF'), 'video/mp4': ('.mp4', None), 'video/webm': ('.webm', b'\x1aE\xdf\xa3')}
    mime = file.content_type or ''
    if mime not in allowed:
        raise HTTPException(422, 'Supported formats: JPEG, PNG, WebP, MP4 and WebM')
    content = file.file.read(25 * 1024 * 1024 + 1)
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(413, 'Maximum upload size is 25 MB')
    extension, magic = allowed[mime]
    if not content or (magic and not content.startswith(magic)) or (mime == 'video/mp4' and content[4:8] != b'ftyp') or (mime == 'image/webp' and content[8:12] != b'WEBP'):
        raise HTTPException(422, 'File contents do not match the declared media format')
    import boto3
    key = 'media/' + secrets.token_hex(16) + extension
    storage = boto3.client('s3', endpoint_url=settings.s3_endpoint_url or None, region_name=settings.s3_region, aws_access_key_id=settings.s3_access_key_id, aws_secret_access_key=settings.s3_secret_access_key)
    try:
        storage.put_object(Bucket=settings.s3_bucket, Key=key, Body=content, ContentType=mime, CacheControl='public, max-age=31536000, immutable')
    except Exception:
        logging.getLogger(__name__).exception('Object storage upload failed')
        raise HTTPException(502, 'Upload failed. Please try again.')
    row = m.MediaAsset(name=(file.filename or 'Upload')[:180], url=settings.media_public_url.rstrip('/') + '/' + key, mime_type=mime)
    db.add(row)
    audit(db, user, 'Uploaded media')
    commit(db)
    return row


@app.post('/bookings', status_code=201)
def create_booking(data: s.BookingInput, request: Request, db: DB, background_tasks: BackgroundTasks):
    rate_limit(request, 'submission', 10)
    if data.website:
        raise HTTPException(400, 'Unable to submit this request')
    if data.preferred_date < date.today():
        raise HTTPException(422, 'Please select a future date')
    programme = db.get(m.Programme, data.programme_id)
    if not programme or not programme.published:
        raise HTTPException(422, 'Please select an available programme')
    if db.scalar(select(m.BlockedDate).where(m.BlockedDate.day == data.preferred_date)):
        raise HTTPException(409, 'This date is unavailable. Please choose another date.')
    days = db.scalars(select(m.Availability).where(m.Availability.programme_id == programme.id)).all()
    if days and not any(d.weekday == data.preferred_date.weekday() and d.enabled for d in days):
        raise HTTPException(409, 'This programme is not available on that day.')
    reference = 'EU-' + secrets.token_hex(5).upper()
    extras={'vegetarian_meals','non_vegetarian_meals','special_requirements'}
    if data.vegetarian_meals+data.non_vegetarian_meals>data.participants:
        raise HTTPException(422,'Meal counts must not exceed the participant count')
    booking = m.Booking(reference=reference, details=data.model_dump(include=extras), **data.model_dump(exclude={'website'}|extras))
    db.add(booking)
    db.flush()
    db.add(m.BookingStatusHistory(booking_id=booking.id, status='Pending'))
    commit(db)
    background_tasks.add_task(notify, 'booking request', reference)
    return {'reference': reference, 'status': 'Pending', 'message': 'Request received. Our team will contact you. Your visit is not confirmed yet.'}


@app.post('/enquiries', status_code=201)
def create_enquiry(data: s.EnquiryInput, request: Request, db: DB, background_tasks: BackgroundTasks):
    rate_limit(request, 'submission', 10)
    if data.website:
        raise HTTPException(400, 'Unable to submit this request')
    extras={'organisation','visitor_category','programme','participants','preferred_date','vegetarian_meals','non_vegetarian_meals','special_requirements'}
    if data.participants and data.vegetarian_meals+data.non_vegetarian_meals>data.participants:
        raise HTTPException(422,'Meal counts must not exceed the participant count')
    db.add(m.Enquiry(details=data.model_dump(mode='json',include=extras), **data.model_dump(exclude={'website'}|extras)))
    commit(db)
    background_tasks.add_task(notify, 'enquiry')
    return {'message': 'Thank you. Our team will be in touch.'}


@app.post('/admin/login')
def login(data: s.Login, request: Request, response: Response, db: DB):
    rate_limit(request, 'login', 8)
    user = db.scalar(select(m.AdminUser).where(m.AdminUser.email == data.email.lower()))
    valid = password_hash.verify(data.password, user.password_hash if user else dummy_hash)
    if not user or not valid or not user.active:
        raise HTTPException(401, 'Invalid email or password')
    token = secrets.token_urlsafe(48)
    db.add(m.AdminSession(token_hash=hashlib.sha256(token.encode()).hexdigest(), user_id=user.id, expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.session_hours)))
    db.commit()
    response.set_cookie('eu_session', token, httponly=True, secure=settings.cookie_secure, samesite='lax', max_age=settings.session_hours * 3600, path='/')
    return {'email': user.email, 'role': user.role}


@app.get('/admin/me')
def me(user: USER):
    return {'email': user.email, 'role': user.role}


@app.post('/admin/logout')
def logout(request: Request, response: Response, user: USER, db: DB):
    session = db.scalar(select(m.AdminSession).where(m.AdminSession.token_hash == hashlib.sha256(request.cookies.get('eu_session', '').encode()).hexdigest()))
    if session:
        db.delete(session)
    db.commit()
    response.delete_cookie('eu_session', path='/')
    return {'ok': True}


@app.get('/admin/overview')
def overview(user: USER, db: DB):
    require_admin(user)
    def count(model, *criteria):
        return db.scalar(select(func.count()).select_from(model).where(*criteria))
    return {'Total bookings': count(m.Booking), 'Pending bookings': count(m.Booking, m.Booking.status == 'Pending'), 'Upcoming bookings': count(m.Booking, m.Booking.preferred_date >= date.today(), m.Booking.status == 'Confirmed'), 'Total enquiries': count(m.Enquiry), 'Unresolved enquiries': count(m.Enquiry, m.Enquiry.status != 'Resolved'), 'Published programmes': count(m.Programme, m.Programme.published.is_(True)), 'Published activities': count(m.Activity, m.Activity.published.is_(True))}


@app.get('/admin/content')
def get_content(user: USER, db: DB):
    return home(db)


@app.put('/admin/content')
def save_content(data: s.Homepage, user: USER, db: DB):
    record = db.scalar(select(m.PageContent).where(m.PageContent.slug == 'home'))
    if not record:
        raise HTTPException(404, 'Seed the homepage first')
    record.content = data.model_dump()
    audit(db, user, 'Updated homepage')
    commit(db)
    return record.content


@app.get('/admin/settings')
def get_settings(user: USER, db: DB):
    require_admin(user)
    return contact_settings(db)


@app.put('/admin/settings')
def save_settings(data: s.ContactSettings, user: USER, db: DB):
    require_admin(user)
    record = db.scalar(select(m.SiteSetting).where(m.SiteSetting.key == 'contact'))
    record.value = data.model_dump()
    audit(db, user, 'Updated contact settings')
    commit(db)
    return record.value


@app.get('/admin/blocked-dates')
def blocked_dates(user: USER, db: DB):
    require_admin(user)
    return db.scalars(select(m.BlockedDate).order_by(m.BlockedDate.day)).all()


@app.post('/admin/blocked-dates', status_code=201)
def block_date(data: s.BlockedDateInput, user: USER, db: DB):
    require_admin(user)
    row = m.BlockedDate(**data.model_dump())
    db.add(row)
    audit(db, user, 'Blocked date ' + str(data.day))
    commit(db)
    return row


@app.delete('/admin/blocked-dates/{record_id}')
def unblock_date(record_id: str, user: USER, db: DB):
    require_admin(user)
    row = db.get(m.BlockedDate, record_id)
    if not row:
        raise HTTPException(404, 'Date not found')
    db.delete(row)
    audit(db, user, 'Removed blocked date')
    commit(db)
    return {'ok': True}


@app.get('/admin/records/{module}')
def records(module: str, user: USER, db: DB, q: str = '', status: str = ''):
    if module in ('bookings', 'enquiries'):
        require_admin(user)
        model = m.Booking if module == 'bookings' else m.Enquiry
        query = select(model).order_by(model.created_at.desc())
        if status:
            query = query.where(model.status == status)
        if q:
            query = query.where(model.name.ilike('%' + q[:100] + '%'))
        return db.scalars(query.limit(500)).all()
    model = model_for(module)
    return db.scalars(select(model).order_by(model.display_order)).all()


@app.post('/admin/records/{module}', status_code=201)
def add_record(module: str, data: s.ContentInput, user: USER, db: DB):
    row = model_for(module)(**data.model_dump())
    db.add(row)
    audit(db, user, f'Created {module}: {data.slug}')
    commit(db)
    return row


@app.put('/admin/records/{module}/{record_id}')
def edit_record(module: str, record_id: str, data: s.ContentInput, user: USER, db: DB):
    row = db.get(model_for(module), record_id)
    if not row:
        raise HTTPException(404, 'Record not found')
    for key, value in data.model_dump().items():
        setattr(row, key, value)
    audit(db, user, f'Updated {module}: {data.slug}')
    commit(db)
    return row


@app.delete('/admin/records/{module}/{record_id}')
def delete_record(module: str, record_id: str, user: USER, db: DB):
    row = db.get(model_for(module), record_id)
    if not row:
        raise HTTPException(404, 'Record not found')
    db.delete(row)
    audit(db, user, f'Deleted {module}: {record_id}')
    commit(db)
    return {'ok': True}


@app.patch('/admin/bookings/{record_id}')
def update_booking(record_id: str, data: s.BookingUpdate, user: USER, db: DB):
    require_admin(user)
    row = db.get(m.Booking, record_id)
    if not row:
        raise HTTPException(404, 'Booking not found')
    if row.status != data.status:
        db.add(m.BookingStatusHistory(booking_id=row.id, status=data.status, actor_id=user.id))
    row.status, row.internal_notes = data.status, data.internal_notes
    audit(db, user, 'Updated booking ' + row.reference)
    commit(db)
    return row


@app.patch('/admin/enquiries/{record_id}')
def update_enquiry(record_id: str, data: s.EnquiryUpdate, user: USER, db: DB):
    require_admin(user)
    row = db.get(m.Enquiry, record_id)
    if not row:
        raise HTTPException(404, 'Enquiry not found')
    row.status, row.internal_notes = data.status, data.internal_notes
    audit(db, user, 'Updated enquiry ' + row.id)
    commit(db)
    return row


@app.get('/admin/export/{module}')
def export(module: str, user: USER, db: DB):
    require_admin(user)
    if module not in ('bookings', 'enquiries'):
        raise HTTPException(404)
    model = m.Booking if module == 'bookings' else m.Enquiry
    rows = db.scalars(select(model).order_by(model.created_at.desc())).all()
    buffer = io.StringIO()
    fields = [c.name for c in model.__table__.columns]
    writer = csv.writer(buffer)
    writer.writerow(fields)
    for row in rows:
        values = []
        for key in fields:
            value = str(getattr(row, key))
            values.append("'" + value if value.lstrip().startswith(('=', '+', '-', '@')) else value)
        writer.writerow(values)
    audit(db, user, 'Exported ' + module)
    db.commit()
    return Response(buffer.getvalue(), media_type='text/csv', headers={'Content-Disposition': f'attachment; filename="{module}.csv"'})


# ---------- Staff viewer: read-only bookings and enquiries ----------
def customer_details(details):
    """Customer-submitted extras only (meals, visitor type, ...); never internal notes."""
    return {k: v for k, v in (details or {}).items() if isinstance(v, (str, int, float)) and v not in ('', 0)}


@app.get('/admin/staff/bookings')
def staff_bookings(user: USER, db: DB, q: str = '', status: str = ''):
    query = select(m.Booking).order_by(m.Booking.created_at.desc())
    if status:
        query = query.where(m.Booking.status == status[:20])
    if q:
        query = query.where(m.Booking.name.ilike('%' + q[:100] + '%'))
    rows = db.scalars(query.limit(500)).all()
    programmes = dict(db.execute(select(m.Programme.id, m.Programme.name)).all())
    return [{'id': r.id, 'reference': r.reference, 'name': r.name, 'email': r.email, 'mobile': r.mobile, 'programme': programmes.get(r.programme_id, ''), 'preferred_date': r.preferred_date, 'preferred_time': r.preferred_time, 'participants': r.participants, 'group_type': r.group_type, 'organisation': r.organisation, 'message': r.message, 'details': customer_details(r.details), 'status': r.status, 'created_at': r.created_at} for r in rows]


@app.get('/admin/staff/enquiries')
def staff_enquiries(user: USER, db: DB, q: str = '', status: str = ''):
    query = select(m.Enquiry).order_by(m.Enquiry.created_at.desc())
    if status:
        query = query.where(m.Enquiry.status == status[:20])
    if q:
        query = query.where(m.Enquiry.name.ilike('%' + q[:100] + '%'))
    rows = db.scalars(query.limit(500)).all()
    return [{'id': r.id, 'name': r.name, 'email': r.email, 'phone': r.phone, 'category': r.category, 'message': r.message, 'details': customer_details(r.details), 'status': r.status, 'created_at': r.created_at} for r in rows]


# ---------- Super Admin: user accounts ----------
def user_out(u):
    return {'id': u.id, 'email': u.email, 'role': u.role, 'active': u.active, 'created_at': u.created_at}


def end_sessions(db, user_id):
    for session in db.scalars(select(m.AdminSession).where(m.AdminSession.user_id == user_id)).all():
        db.delete(session)


@app.get('/admin/users')
def list_users(user: USER, db: DB):
    require_admin(user)
    return [user_out(u) for u in db.scalars(select(m.AdminUser).order_by(m.AdminUser.created_at)).all()]


@app.post('/admin/users', status_code=201)
def create_user(data: s.UserCreate, user: USER, db: DB):
    require_admin(user)
    email = data.email.lower()
    if db.scalar(select(m.AdminUser).where(m.AdminUser.email == email)):
        raise HTTPException(409, 'An account with this email already exists.')
    row = m.AdminUser(email=email, password_hash=password_hash.hash(data.password), role=data.role, active=True)
    db.add(row)
    audit(db, user, f'Created user {email} ({data.role})')
    commit(db)
    return user_out(row)


@app.patch('/admin/users/{user_id}')
def update_user(user_id: str, data: s.UserUpdate, user: USER, db: DB):
    require_admin(user)
    row = db.get(m.AdminUser, user_id)
    if not row:
        raise HTTPException(404, 'User not found')
    if row.id == user.id and (data.active is False or (data.role and data.role != 'admin')):
        raise HTTPException(400, 'You cannot disable or demote your own account.')
    changed = []
    if data.role and data.role != row.role:
        row.role = data.role
        changed.append('role ' + data.role)
    if data.active is not None and data.active != row.active:
        row.active = data.active
        changed.append('enabled' if data.active else 'disabled')
    if data.password:
        row.password_hash = password_hash.hash(data.password)
        changed.append('password reset')
    if changed:
        if row.id != user.id:
            end_sessions(db, row.id)  # role, status or password changes take effect immediately
        audit(db, user, f'Updated user {row.email}: ' + ', '.join(changed))
    commit(db)
    return user_out(row)
