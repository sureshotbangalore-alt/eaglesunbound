from pydantic import SecretStr, model_validator
from sqlalchemy.engine import make_url, URL
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = ''
    db_host: str = ''
    db_port: int = 3306
    db_name: str = ''
    db_user: str = ''
    db_password: SecretStr = SecretStr('')
    db_ssl: bool = True
    db_ssl_ca: str = ''
    environment: str = 'development'
    public_origin: str = 'http://localhost:3000'
    cookie_secure: bool = False
    admin_email: str = 'admin@example.com'
    admin_password: str = ''
    session_hours: int = 8
    mfa_encryption_key: SecretStr = SecretStr('')
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


    @model_validator(mode='after')
    def configure_database(self):
        # An explicit DATABASE_URL takes priority over DB_* configuration.
        if not self.database_url:
            if self.db_host:
                if not self.db_name or not self.db_user or not self.db_password.get_secret_value():
                    raise ValueError('MySQL requires DB_NAME, DB_USER and DB_PASSWORD')
                self.database_url = URL.create(
                    'mysql+pymysql', username=self.db_user,
                    password=self.db_password.get_secret_value(), host=self.db_host,
                    port=self.db_port, database=self.db_name,
                    query={'charset': 'utf8mb4'},
                ).render_as_string(hide_password=False)
            else:
                self.database_url = 'sqlite:///./eagles-local.db'
        if self.environment == 'production':
            if not self.public_origin.startswith('https://'):
                raise ValueError('Production requires an HTTPS PUBLIC_ORIGIN')
            backend = make_url(self.database_url).get_backend_name()
            if not self.cookie_secure or backend not in {'postgresql', 'mysql'}:
                raise ValueError('Production requires PostgreSQL or MySQL and secure cookies')
        return self


settings = Settings()
