import pytest
from pydantic import ValidationError
from sqlalchemy.engine import make_url
from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects.mysql import dialect
from app.config import Settings
from app.db import Base
from app import models


def test_mysql_fields_preserve_password_characters():
    password = 'test-only!#@:/value'
    config = Settings(_env_file=None, database_url='', db_host='db.example.test',
                      db_name='eagles', db_user='app', db_password=password)
    url = make_url(config.database_url)
    assert url.drivername == 'mysql+pymysql'
    assert url.password == password
    assert url.query['charset'] == 'utf8mb4'
    assert password not in repr(config.db_password)


def test_explicit_database_url_preserves_local_database():
    config = Settings(_env_file=None, database_url='sqlite:///local.db', db_host='db.example.test')
    assert config.database_url == 'sqlite:///local.db'


def test_production_requires_supported_database_and_secure_cookies():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, database_url='sqlite:///local.db', environment='production', cookie_secure=True, public_origin='https://eagles.example.com')
    config = Settings(_env_file=None, database_url='', db_host='db.example.test', db_name='eagles',
                      db_user='app', db_password='test-password', environment='production', cookie_secure=True, public_origin='https://eagles.example.com')
    assert make_url(config.database_url).get_backend_name() == 'mysql'


def test_schema_compiles_for_mysql():
    statements = [str(CreateTable(table).compile(dialect=dialect())) for table in Base.metadata.sorted_tables]
    assert len(statements) == 19
    assert all('CREATE TABLE' in statement for statement in statements)
    booking = str(CreateTable(models.Booking.__table__).compile(dialect=dialect()))
    assert "DEFAULT ('{}')" in booking


def test_database_exception_parameters_are_redacted():
    from app.db import engine
    assert engine.hide_parameters is True
