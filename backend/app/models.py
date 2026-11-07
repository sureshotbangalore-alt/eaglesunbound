from datetime import datetime, timezone, date
from uuid import uuid4
from sqlalchemy import String, Text, JSON, ForeignKey, UniqueConstraint, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base


def now():
    return datetime.now(timezone.utc)


class Entity:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class AdminUser(Entity, Base):
    __tablename__ = 'admin_users'
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(20), default='admin')
    active: Mapped[bool] = mapped_column(default=True)


class AdminSession(Entity, Base):
    __tablename__ = 'admin_sessions'
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('admin_users.id', ondelete='CASCADE'))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PageContent(Entity, Base):
    __tablename__ = 'page_content'
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    content: Mapped[dict] = mapped_column(JSON)


class SiteSetting(Entity, Base):
    __tablename__ = 'site_settings'
    key: Mapped[str] = mapped_column(String(100), unique=True)
    value: Mapped[dict] = mapped_column(JSON)


class ContentFields(Entity):
    slug: Mapped[str] = mapped_column(String(150), unique=True)
    name: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text, default='')
    image: Mapped[str] = mapped_column(Text, default='')
    published: Mapped[bool] = mapped_column(default=False)
    display_order: Mapped[int] = mapped_column(default=0)
    details: Mapped[dict] = mapped_column(JSON, default=dict)


class Programme(ContentFields, Base):
    __tablename__ = 'programmes'


class Activity(ContentFields, Base):
    __tablename__ = 'activities'


class Client(ContentFields, Base):
    __tablename__ = 'clients'


class GalleryAlbum(ContentFields, Base):
    __tablename__ = 'gallery_albums'


class ProgrammeActivity(Base):
    __tablename__ = 'programme_activities'
    programme_id: Mapped[str] = mapped_column(ForeignKey('programmes.id'), primary_key=True)
    activity_id: Mapped[str] = mapped_column(ForeignKey('activities.id'), primary_key=True)


class Package(ContentFields, Base):
    __tablename__ = 'packages'
    programme_id: Mapped[str | None] = mapped_column(ForeignKey('programmes.id'), nullable=True)


class Booking(Entity, Base):
    __tablename__ = 'bookings'
    reference: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254))
    mobile: Mapped[str] = mapped_column(String(25))
    programme_id: Mapped[str] = mapped_column(ForeignKey('programmes.id'))
    preferred_date: Mapped[date]
    preferred_time: Mapped[str] = mapped_column(String(40), default='')
    participants: Mapped[int]
    group_type: Mapped[str] = mapped_column(String(80))
    organisation: Mapped[str] = mapped_column(String(180), default='')
    message: Mapped[str] = mapped_column(Text, default='')
    consent: Mapped[bool]
    status: Mapped[str] = mapped_column(String(20), default='Pending')
    internal_notes: Mapped[str] = mapped_column(Text, default='')
    details: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("('{}')"))


class BookingStatusHistory(Entity, Base):
    __tablename__ = 'booking_status_history'
    booking_id: Mapped[str] = mapped_column(ForeignKey('bookings.id'))
    status: Mapped[str] = mapped_column(String(20))
    actor_id: Mapped[str | None] = mapped_column(ForeignKey('admin_users.id'), nullable=True)


class Enquiry(Entity, Base):
    __tablename__ = 'enquiries'
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254))
    phone: Mapped[str] = mapped_column(String(25))
    category: Mapped[str] = mapped_column(String(100))
    message: Mapped[str] = mapped_column(Text)
    consent: Mapped[bool]
    status: Mapped[str] = mapped_column(String(20), default='New')
    internal_notes: Mapped[str] = mapped_column(Text, default='')
    details: Mapped[dict] = mapped_column(JSON, default=dict, server_default=text("('{}')"))


class Availability(Entity, Base):
    __tablename__ = 'availability'
    programme_id: Mapped[str] = mapped_column(ForeignKey('programmes.id'))
    weekday: Mapped[int]
    enabled: Mapped[bool] = mapped_column(default=True)
    __table_args__ = (UniqueConstraint('programme_id', 'weekday'),)


class BlockedDate(Entity, Base):
    __tablename__ = 'blocked_dates'
    day: Mapped[date] = mapped_column(unique=True)
    reason: Mapped[str] = mapped_column(String(200), default='')


class MediaAsset(Entity, Base):
    __tablename__ = 'media_assets'
    name: Mapped[str] = mapped_column(String(180))
    url: Mapped[str] = mapped_column(Text)
    mime_type: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(100), default='general')
    album_id: Mapped[str | None] = mapped_column(ForeignKey('gallery_albums.id'), nullable=True)


class Testimonial(Entity, Base):
    __tablename__ = 'testimonials'
    client_id: Mapped[str] = mapped_column(ForeignKey('clients.id'))
    quote: Mapped[str] = mapped_column(Text)
    approved: Mapped[bool] = mapped_column(default=False)


class FAQ(Entity, Base):
    __tablename__ = 'faqs'
    question: Mapped[str] = mapped_column(String(300))
    answer: Mapped[str] = mapped_column(Text)
    published: Mapped[bool] = mapped_column(default=False)
    page: Mapped[str] = mapped_column(String(150), default='/faqs')
    display_order: Mapped[int] = mapped_column(default=0)


class AuditLog(Entity, Base):
    __tablename__ = 'audit_logs'
    actor_id: Mapped[str] = mapped_column(ForeignKey('admin_users.id'))
    action: Mapped[str] = mapped_column(String(200))
