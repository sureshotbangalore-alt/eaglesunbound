from sqlalchemy import select
from pwdlib import PasswordHash
from .db import SessionLocal
from .models import AdminUser, PageContent, SiteSetting, Programme, Activity, FAQ
from .config import settings

HOME = {
    'eyebrow': 'BENGALURU · OUTDOORS · BEYOND LIMITS',
    'hero_title': 'NOT JUST AN ADVENTURE.',
    'brand_tagline': 'ONE DESTINATION. ENDLESS ADVENTURES.',
    'hero_secondary': 'AN EXPERIENCE THAT CHALLENGES YOU.',
    'hero_subtitle': 'Experience military-inspired challenges, adventure and teamwork at Eagles Unbound.',
    'experience_title': 'BEYOND ADVENTURE. INTO YOUR ELEMENT.',
    'experience_description': 'Step out of the everyday and into the outdoors. Take on physical challenges, find your rhythm as a team and discover what happens when you go a little further. This is a civilian adventure experience inspired by military values: discipline, courage and working together.',
    'hero_video': '',
}
PROGRAMMES = [
    ('corporate-unbound', 'Corporate Unbound', 'Bring your team together through outdoor challenges and shared problem-solving.', '/assets/landscape.jpg'),
    ('students-unbound', 'Students Unbound', 'Take learning outside, with adventure and opportunities to work together.', '/assets/forest.jpg'),
    ('adventure-unbound', 'Adventure Unbound', 'Make room for outdoor recreation, adventure and time together.', '/assets/camp.jpg'),
]
ACTIVITIES = ['Individual Army-Inspired Obstacles', 'Group Obstacle Race / Snake Race', 'Wall Climbing', 'High Rope Course', 'Low Rope Course', 'Zip Line', 'Archery', 'Air Rifle Shooting', 'Team Building Activities', 'Mind Games', 'Trekking', 'Camping', 'Bonfire', 'Rain Dance']


def seed():
    with SessionLocal() as db:
        if not db.scalar(select(PageContent).where(PageContent.slug == 'home')):
            db.add(PageContent(slug='home', content=HOME))
        if not db.scalar(select(SiteSetting).where(SiteSetting.key == 'contact')):
            db.add(SiteSetting(key='contact', value={'phone': '+917259307111', 'whatsapp': '', 'email': '', 'address': 'KMS Farms, Sy No 23, Naukalpalya, Kaggalipura, off Kanakapura Road, South Bengaluru, Karnataka 560082', 'whatsapp_message': 'Hello, I would like to plan an Eagles Unbound experience.'}))
        for i, (slug, name, description, image) in enumerate(PROGRAMMES):
            if not db.scalar(select(Programme).where(Programme.slug == slug)):
                db.add(Programme(slug=slug, name=name, description=description, image=image, published=True, display_order=i, details={'source': 'https://www.eaglesunbound.com/', 'media_status': 'illustrative stock; replace with approved client media'}))
        if not db.scalar(select(Programme).where(Programme.slug == 'military-inspired-bootcamp')):
            db.add(Programme(slug='military-inspired-bootcamp', name='Military-Inspired Bootcamp', description='A civilian outdoor challenge experience. Programme details require client confirmation.', published=False))
        for i, name in enumerate(ACTIVITIES):
            slug=name.lower().replace(' / ', '-').replace(' ', '-')
            if not db.scalar(select(Activity).where(Activity.slug == slug)):
                db.add(Activity(slug=slug, name=name, description='Contact our team to discuss this activity and its suitability for your group.', published=True, display_order=i, details={'source': 'https://www.eaglesunbound.com/'}))
        faqs = [
            ('What is Eagles Unbound?', 'Eagles Unbound is an outdoor adventure and experiential learning destination off Kanakapura Road in South Bengaluru. Published programmes include corporate, student and adventure experiences.'),
            ('Is this an official military training programme?', 'No. The military-inspired concept is a civilian recreational adventure experience. It does not provide military service training, official armed-forces affiliation or military certification.'),
            ('Can corporate and student groups enquire?', 'Yes. Corporate Unbound and Students Unbound are existing programmes. Tell the team about your group, interests and preferred date to discuss suitable arrangements.'),
            ('How do I request a booking?', 'Use the booking request form to choose a published programme and preferred date, then share your group and contact details. A saved request receives a reference and remains Pending until the team confirms it.'),
            ('Can I request a preferred date?', 'Yes. Your preferred date is part of the request. It is subject to availability and team confirmation. Dates blocked by the team cannot be requested.'),
            ('What should participants bring?', 'Ask the team for the current clothing, footwear and equipment guidance for your selected experience. Confirm participation requirements and any access needs before visiting.'),
            ('Which activities are available?', 'The published library includes obstacle activities, rope courses, wall climbing, zip line, archery, air rifle shooting, team tasks, trekking and camping. Confirm current availability and programme inclusions with the team.'),
        ]
        for i, (question, answer) in enumerate(faqs):
            if not db.scalar(select(FAQ).where(FAQ.question == question)):
                db.add(FAQ(question=question, answer=answer, published=True, display_order=i))
        if settings.admin_password:
            if len(settings.admin_password) < 14:
                raise RuntimeError('ADMIN_PASSWORD must contain at least 14 characters')
            if not db.scalar(select(AdminUser).where(AdminUser.email == settings.admin_email.lower())):
                db.add(AdminUser(email=settings.admin_email.lower(), password_hash=PasswordHash.recommended().hash(settings.admin_password), role='admin'))
        db.commit()


if __name__ == '__main__':
    seed()
    from .seed_master import seed_master
    seed_master()
