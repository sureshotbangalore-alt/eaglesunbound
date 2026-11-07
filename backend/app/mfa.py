"""Optional administrator TOTP. Secrets encrypted; recovery codes hashed; no schema change."""
import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote, urlencode
from cryptography.fernet import Fernet, InvalidToken
from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from .config import settings
from . import models as m


class FactorInput(BaseModel):
    password: str = Field(min_length=1, max_length=200)
    code: str = Field(default='', max_length=80)


def cipher():
    try:
        return Fernet(settings.mfa_encryption_key.get_secret_value().encode())
    except (ValueError, TypeError):
        raise HTTPException(503, 'Administrator MFA requires a valid server encryption key.')


def totp(secret: str, counter: int):
    digest = hmac.new(base64.b32decode(secret), struct.pack('>Q', counter), hashlib.sha1).digest()
    offset = digest[-1] & 15
    return f'{(struct.unpack(">I", digest[offset:offset+4])[0] & 0x7fffffff) % 1000000:06d}'


def factor_row(db, user):
    return db.scalar(select(m.SiteSetting).where(m.SiteSetting.key == 'mfa:' + user.id).with_for_update())


def verify_factor(value, code):
    """Returns updated state only on success. TOTP counters and recovery codes are single use."""
    if not code:
        return None
    recovery_hash = hashlib.sha256(code.strip().lower().encode()).hexdigest()
    hashes = value.get('recovery', [])
    if any(hmac.compare_digest(recovery_hash, saved) for saved in hashes):
        return {**value, 'recovery': [saved for saved in hashes if not hmac.compare_digest(saved, recovery_hash)]}
    if not code.isascii() or not code.isdecimal() or len(code) != 6:
        return None
    try:
        secret = cipher().decrypt(value['secret'].encode()).decode()
    except (InvalidToken, KeyError):
        raise HTTPException(503, 'MFA unavailable. Contact the server administrator; password-only fallback is disabled.')
    counter = int(time.time() // 30)
    for candidate in (counter - 1, counter, counter + 1):
        if candidate > value.get('last_counter', -1) and hmac.compare_digest(code, totp(secret, candidate)):
            return {**value, 'last_counter': candidate}
    return None


def check_login_factor(db, user, code):
    row = factor_row(db, user)
    if row and row.value.get('enabled'):
        updated = verify_factor(row.value, code)
        if updated is None:
            raise HTTPException(401, 'Enter a valid authenticator or unused recovery code.')
        row.value = updated


def register_mfa(app, current_user, get_db, password_hash, rate_limit, audit, end_sessions):
    def authorised(user):
        if user.role != 'admin':
            raise HTTPException(403, 'Administrator role required')

    def reauthenticate(data, request, user):
        authorised(user)
        rate_limit(request, 'mfa', 8, user.id)
        if not password_hash.verify(data.password, user.password_hash):
            raise HTTPException(401, 'Current password is incorrect.')

    @app.get('/admin/security/mfa')
    def status(user=Depends(current_user), db=Depends(get_db)):
        authorised(user)
        row = factor_row(db, user)
        return {'available': bool(settings.mfa_encryption_key.get_secret_value()),
                'enabled': bool(row and row.value.get('enabled')),
                'recovery_codes_remaining': len(row.value.get('recovery', [])) if row else 0}

    @app.post('/admin/security/mfa/setup')
    def setup(data: FactorInput, request: Request, user=Depends(current_user), db=Depends(get_db)):
        reauthenticate(data, request, user)
        encryptor = cipher()
        row = factor_row(db, user)
        if row and row.value.get('enabled'):
            raise HTTPException(409, 'MFA is already enabled. Disable it before replacing the authenticator.')
        secret = base64.b32encode(secrets.token_bytes(20)).decode()
        value = {'enabled': False, 'secret': encryptor.encrypt(secret.encode()).decode(),
                 'pending_until': time.time() + 600, 'last_counter': -1, 'recovery': []}
        if row:
            row.value = value
        else:
            db.add(m.SiteSetting(key='mfa:' + user.id, value=value))
        audit(db, user, 'Started MFA setup')
        db.commit()
        label = quote('Eagles Unbound:' + user.email, safe='')
        return {'secret': secret, 'uri': 'otpauth://totp/' + label + '?' + urlencode({'secret': secret, 'issuer': 'Eagles Unbound', 'algorithm': 'SHA1', 'digits': 6, 'period': 30})}

    @app.post('/admin/security/mfa/confirm')
    def confirm(data: FactorInput, request: Request, user=Depends(current_user), db=Depends(get_db)):
        reauthenticate(data, request, user)
        row = factor_row(db, user)
        if not row or row.value.get('enabled') or row.value.get('pending_until', 0) < time.time():
            raise HTTPException(409, 'Start a new MFA setup. Setup expires after ten minutes.')
        updated = verify_factor(row.value, data.code)
        if updated is None:
            raise HTTPException(401, 'Authenticator code is incorrect.')
        codes = [secrets.token_hex(10) for _ in range(10)]
        row.value = {**updated, 'enabled': True, 'pending_until': 0,
                     'recovery': [hashlib.sha256(code.encode()).hexdigest() for code in codes]}
        end_sessions(db, user.id)
        audit(db, user, 'Enabled MFA and revoked all sessions')
        db.commit()
        return {'recovery_codes': codes, 'message': 'MFA enabled. Save these codes offline and sign in again.'}

    @app.post('/admin/security/mfa/disable')
    def disable(data: FactorInput, request: Request, user=Depends(current_user), db=Depends(get_db)):
        reauthenticate(data, request, user)
        row = factor_row(db, user)
        if not row or not row.value.get('enabled') or verify_factor(row.value, data.code) is None:
            raise HTTPException(401, 'A valid authenticator or unused recovery code is required.')
        db.delete(row)
        end_sessions(db, user.id)
        audit(db, user, 'Disabled MFA and revoked all sessions')
        db.commit()
        return {'message': 'MFA disabled. Sign in again.'}
