"""One-time local setup. Writes credentials to the ignored backend/.env only."""
from pathlib import Path
import secrets
root = Path(__file__).resolve().parents[1]
target = root / 'backend' / '.env'
if target.exists():
    print('backend/.env already exists; preserving your configuration.')
else:
    target.write_text('DATABASE_URL=sqlite:///./eagles-local.db\nENVIRONMENT=development\nPUBLIC_ORIGIN=http://localhost:3000\nCOOKIE_SECURE=false\nADMIN_EMAIL=admin@example.com\nADMIN_PASSWORD=' + secrets.token_urlsafe(24) + '\n', encoding='utf-8')
    print('Created backend/.env with a unique local admin password. Open that file to sign in. Do not commit it.')
