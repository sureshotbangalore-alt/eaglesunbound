import ssl
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import settings


class Base(DeclarativeBase):
    pass


connect_args = {}
engine_options = {'pool_pre_ping': True, 'hide_parameters': True}
if settings.database_url.startswith('sqlite'):
    connect_args['check_same_thread'] = False
elif settings.database_url.startswith('mysql'):
    connect_args.update(connect_timeout=10, read_timeout=20, write_timeout=20)
    if settings.db_ssl:
        connect_args['ssl'] = ssl.create_default_context(cafile=settings.db_ssl_ca or None)
    engine_options.update(pool_size=3, max_overflow=2, pool_recycle=1800)
engine = create_engine(settings.database_url, connect_args=connect_args, **engine_options)
if settings.database_url.startswith('sqlite'):
    @event.listens_for(engine, 'connect')
    def enable_foreign_keys(connection, _):
        connection.execute('PRAGMA foreign_keys=ON')
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_db():
    with SessionLocal() as db:
        yield db
