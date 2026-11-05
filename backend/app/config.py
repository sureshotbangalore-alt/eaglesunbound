from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = 'sqlite:///./eagles-local.db'
    environment: str = 'development'
    public_origin: str = 'http://localhost:3000'
    cookie_secure: bool = False
    admin_email: str = 'admin@example.com'
    admin_password: str = ''
    session_hours: int = 8
    s3_endpoint_url: str = ''
    s3_bucket: str = ''
    s3_region: str = 'auto'
    s3_access_key_id: str = ''
    s3_secret_access_key: str = ''
    media_public_url: str = ''
    smtp_host: str = ''
    smtp_port: int = 587
    smtp_username: str = ''
    smtp_password: str = ''
    smtp_from: str = ''
    notification_email: str = ''
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')


settings = Settings()
if settings.environment == 'production':
    if not settings.cookie_secure or not settings.database_url.startswith('postgresql'):
        raise RuntimeError('Production requires PostgreSQL and secure cookies')
