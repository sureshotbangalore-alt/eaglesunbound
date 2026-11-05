from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, EmailStr, field_validator
from urllib.parse import urlparse


class Login(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class Homepage(BaseModel):
    eyebrow: str = Field(max_length=100)
    hero_title: str = Field(min_length=5, max_length=120)
    hero_secondary: str = Field(default='AN EXPERIENCE THAT CHALLENGES YOU.', min_length=5, max_length=150)
    hero_subtitle: str = Field(min_length=5, max_length=300)
    experience_title: str = Field(min_length=5, max_length=120)
    experience_description: str = Field(min_length=10, max_length=1500)
    hero_video: str = Field(default='', max_length=1000)
    brand_tagline: str = Field(default='ONE DESTINATION. ENDLESS ADVENTURES.', max_length=150)
    @field_validator('hero_video')
    @classmethod
    def video_url(cls, v):
        if v and (not v.startswith('https://') or not v.split('?')[0].endswith(('.mp4', '.webm'))):
            raise ValueError('Use an HTTPS MP4 or WebM video URL')
        return v


class ContentInput(BaseModel):
    slug: str = Field(pattern=r'^[a-z0-9-]{2,150}$')
    name: str = Field(min_length=2, max_length=180)
    description: str = Field(max_length=10000, default='')
    image: str = Field(default='', max_length=1000)
    published: bool = False
    display_order: int = Field(default=0, ge=0, le=9999)
    details: dict = Field(default_factory=dict)
    @field_validator('details')
    @classmethod
    def safe_links(cls, value):
        if value.get('testimonial_video') and not str(value['testimonial_video']).startswith('https://'):
            raise ValueError('Testimonial videos must use an HTTPS URL')
        return value
    @field_validator('image')
    @classmethod
    def safe_image(cls, v):
        if v and not (v.startswith('/assets/') or v.startswith('https://')):
            raise ValueError('Use a local /assets/ path or HTTPS image URL')
        return v


class BookingInput(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    mobile: str = Field(pattern=r'^\+?[\d\s()-]{7,25}$')
    programme_id: str = Field(max_length=36)
    preferred_date: date
    preferred_time: str = Field(default='', max_length=40)
    participants: int = Field(ge=1, le=1000)
    group_type: str = Field(min_length=2, max_length=80)
    organisation: str = Field(default='', max_length=180)
    message: str = Field(default='', max_length=3000)
    consent: Literal[True]
    website: str = Field(default='', max_length=200)
    vegetarian_meals: int = Field(default=0, ge=0, le=1000)
    non_vegetarian_meals: int = Field(default=0, ge=0, le=1000)
    special_requirements: str = Field(default='', max_length=3000)


class EnquiryInput(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(pattern=r'^\+?[\d\s()-]{7,25}$')
    category: str = Field(min_length=2, max_length=100)
    message: str = Field(min_length=10, max_length=3000)
    consent: Literal[True]
    website: str = Field(default='', max_length=200)
    organisation: str = Field(default='', max_length=180)
    visitor_category: Literal['School','College','Corporate','Family','Individual','Other'] = 'Other'
    programme: str = Field(default='', max_length=180)
    participants: int | None = Field(default=None, ge=1, le=1000)
    preferred_date: date | None = None
    vegetarian_meals: int = Field(default=0, ge=0, le=1000)
    non_vegetarian_meals: int = Field(default=0, ge=0, le=1000)
    special_requirements: str = Field(default='', max_length=3000)


class BookingUpdate(BaseModel):
    status: Literal['Pending', 'Contacted', 'Confirmed', 'Cancelled', 'Completed']
    internal_notes: str = Field(default='', max_length=5000)


class EnquiryUpdate(BaseModel):
    status: Literal['New', 'Contacted', 'Resolved']
    internal_notes: str = Field(default='', max_length=5000)


class ContactSettings(BaseModel):
    phone: str = Field(pattern=r'^\+?[\d\s()-]{7,25}$')
    whatsapp: str = Field(default='', pattern=r'^\d{7,15}$|^$')
    email: str = Field(default='', max_length=254)
    address: str = Field(max_length=500)
    whatsapp_message: str = Field(default='Hello, I would like to plan an Eagles Unbound experience.', max_length=500)
    maps_url: str = Field(default='', max_length=1000)
    business_profile_url: str = Field(default='', max_length=1000)
    instagram: str = Field(default='', max_length=1000)
    facebook: str = Field(default='', max_length=1000)
    youtube: str = Field(default='', max_length=1000)
    @field_validator('maps_url', 'business_profile_url', 'instagram', 'facebook', 'youtube')
    @classmethod
    def url(cls, v):
        if v and not v.startswith('https://'):
            raise ValueError('Use an HTTPS URL')
        return v
    @field_validator('email')
    @classmethod
    def email_format(cls, v):
        if v:
            from pydantic import TypeAdapter
            TypeAdapter(EmailStr).validate_python(v)
        return v


class BlockedDateInput(BaseModel):
    day: date
    reason: str = Field(default='', max_length=200)


class FAQInput(BaseModel):
    question: str = Field(min_length=5, max_length=300)
    answer: str = Field(min_length=10, max_length=4000)
    page: str = Field(default='/faqs', pattern=r'^/[a-z0-9/-]*$')
    display_order: int = Field(default=0, ge=0, le=9999)
    published: bool = False


class SEOInput(BaseModel):
    page: str = Field(pattern=r'^/[a-z0-9/-]*$')
    title: str = Field(min_length=5, max_length=150)
    description: str = Field(min_length=20, max_length=400)
    canonical: str = Field(default='', max_length=1000)
    og_title: str = Field(default='', max_length=150)
    og_description: str = Field(default='', max_length=400)
    image: str = Field(default='', max_length=1000)
    image_alt: str = Field(default='', max_length=300)
    noindex: bool = False
    @field_validator('canonical')
    @classmethod
    def canonical_format(cls, v):
        if v and (not v.startswith('https://') or not urlparse(v).netloc or urlparse(v).query or urlparse(v).fragment):
            raise ValueError('Use a complete HTTPS canonical URL without a query or fragment')
        return v
    @field_validator('image')
    @classmethod
    def image_format(cls, v):
        if v and not (v.startswith('https://') or v.startswith('/assets/')):
            raise ValueError('Use an HTTPS URL or /assets/ path')
        return v


class MediaInput(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    url: str = Field(max_length=1000)
    mime_type: Literal['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/youtube']
    category: str = Field(default='general', max_length=100)
    @field_validator('url')
    @classmethod
    def url_format(cls, v):
        if not v.startswith('https://'):
            raise ValueError('Use an HTTPS media URL')
        return v


class PageSection(BaseModel):
    heading: str = Field(min_length=2, max_length=180)
    body: str = Field(min_length=10, max_length=10000)


class PageInput(BaseModel):
    title: str = Field(min_length=5, max_length=150)
    intro: str = Field(min_length=10, max_length=1000)
    sections: list[PageSection] = Field(default_factory=list, max_length=30)
    published: bool = False


# admin = Super Admin (full access). editor = website content only. staff_viewer = read-only bookings and enquiries.
Role = Literal['admin', 'editor', 'staff_viewer']


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=200)
    role: Role


class UserUpdate(BaseModel):
    role: Role | None = None
    active: bool | None = None
    password: str | None = Field(default=None, min_length=12, max_length=200)
