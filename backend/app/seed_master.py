"""Import user-supplied master information without overwriting existing edited content."""
import json
import re
from pathlib import Path
from sqlalchemy import select
from .db import SessionLocal
from .models import Activity, Programme, PageContent, SiteSetting, ProgrammeActivity, GalleryAlbum

DATA=Path(__file__).parent/'data'
def slugify(value):
    return re.sub(r'[^a-z0-9]+','-',value.lower()).strip('-')


PAGES={
 'about':('THE SPIRIT OF ADVENTURE.','Outdoor experiences, shared challenges and opportunities to learn at Eagles Unbound.',[
  ('OUR STORY','Eagles Unbound is an outdoor adventure and experiential learning destination in the Kanakapura Road region of South Bengaluru. It brings together corporate groups, students, families and other visitors through adventure and time outdoors.'),
  ('OUR VISION','To create opportunities to discover strength, confidence and leadership through outdoor experiences.'),
  ('OUR MISSION','Adventure, learning, personal growth, leadership, teamwork and a connection with nature.'),
  ('OUR VALUES','Courage. Discipline. Teamwork. Resilience. Leadership. Confidence. Respect. Responsibility.'),
  ('OUR APPROACH','Programmes combine outdoor challenges, experiential learning, recreation and teamwork. The activity mix, participant suitability and final arrangements are confirmed for each group.'),
  ('OUR LEADERSHIP','Maj Gen V. P. S. Bhakuni, VSM (Retd.) is identified as Founder and CEO in the supplied business information. Visit the leadership page for the profile as it is prepared for publication.')]),
 'founder':('LEADERSHIP. WITH PURPOSE.','Meet the leadership behind Eagles Unbound.',[
  ('MAJ GEN V. P. S. BHAKUNI, VSM (RETD.)','Founder and CEO, as identified in the supplied business information. The extended biography, service highlights and official portrait will be published after client approval.'),
  ('A SHARED PHILOSOPHY','The business brings together adventure, experiential learning, discipline, courage and teamwork. Speak to the team about how these values inform your group experience.')]),
 'kids-experiences':('LITTLE EXPLORERS. BIG ADVENTURES.','Outdoor, creative and farm-based experiences to discuss for children and school groups.',[
  ('PLAY. CREATE. DISCOVER.','The supplied activity information includes kids zip line, low ropes, mud obstacles, soft archery and tractor rides. Suitability, age requirements and availability must be confirmed for each child or group.'),
  ('HANDS-ON LEARNING','Explore pottery, clay modelling, planters, seed balls, kitchen gardening, composting and nature-based learning. Ask which creative and farm activities can be included in your visit.'),
  ('PLAN WITH THE TEAM','Tell us the age range, group size and any access or dietary requirements. Confirm the programme and participation guidance before travelling.')]),
 'schools-and-colleges':('LEARNING. OUT IN THE OPEN.','Programme conversations for schools, colleges, teachers and coordinators.',[
  ('SCHOOLS','Explore School Day Outing and Outbound Student Activities. Discuss outdoor learning, creative and farm experiences, team challenges and the needs of your students.'),
  ('COLLEGES','Explore the College Adventure Program: a conversation about leadership, communication, collaboration and military-inspired civilian challenges.'),
  ('YOUR INSTITUTION. YOUR PLAN.','Share the student age range, organisation, preferred date, group size and meal preferences. Activities, menus, eligibility and the final schedule are confirmed with the team.')]),
 'corporate':('BUILD STRONGER TEAMS. BEYOND THE OFFICE.','Outdoor experiences for employees, HR teams, leadership groups and organisations.',[
  ('A SHARED CHALLENGE','Discuss team bonding, communication, collaboration, trust, problem-solving and employee engagement through outdoor experiences.'),
  ('TAILORED TO YOUR GROUP','The supplied programme information includes obstacle and rope activities, group challenges, tug of war, mind games and outdoor recreation. The team will discuss the right mix and current availability.'),
  ('START WITH A CONVERSATION','Tell us your organisation, group size, objectives, preferred date and meal preferences. Request a programme discussion without an online payment or an implied confirmed reservation.')]),
 'accommodation':('STAY FOR THE OUTDOORS.','Discuss camping and overnight arrangements with the Eagles Unbound team.',[
  ('CAMPING EXPERIENCES','The supplied programme information includes tent pitching, night camping, campfire activities, sunrise hiking and time in nature. Confirm availability and the programme format before making arrangements.'),
  ('TENTS AND GUEST ROOMS','Ask the team about currently available accommodation, room and tent types, washrooms, accessibility and group arrangements. Detailed facilities and original accommodation photography are awaiting verification.'),
  ('PLAN YOUR STAY','Explore the Overnight Stay Program and discuss your group, meals and any special requirements. The final itinerary and accommodation arrangements require team confirmation.')]),
 'food-and-dining':('GOOD FOOD. GREAT COMPANY.','Meal planning for your selected experience. Menus and inclusions are confirmed with the team.',[
  ('A MENU FOR YOUR PROGRAMME','Breakfast, lunch, hi-tea and dinner arrangements vary by programme. Not every meal or dish is included in every experience.'),
  ('TELL US WHAT YOUR GROUP NEEDS','Share vegetarian and non-vegetarian meal counts and any dietary requirements in your enquiry. Discuss allergies and specific needs directly with the team before booking.')]),
}


def seed_master():
    catalogue=json.loads((DATA/'master-activities.json').read_text(encoding='utf-8'))
    programmes=json.loads((DATA/'master-programmes.json').read_text(encoding='utf-8'))
    aliases={
      'Military Group Obstacle Race':'group-obstacle-race-snake-race',
      'Group Obstacle Race (GOR)':'group-obstacle-race-snake-race',
      'Military-Style Individual Obstacle Course':'individual-army-inspired-obstacles',
      'Individual Obstacles':'individual-army-inspired-obstacles',
      'Team-Building Activities':'team-building-activities',
    }
    needs_confirmation={'.22 Rifle Shooting','Pelvic Rest Shooting','Recove Bow Shooting','Standing Shooting','Target Practice'}
    with SessionLocal() as db:
        for i,entry in enumerate(catalogue['activities']):
            name=entry['name'];slug=aliases.get(name,slugify(name))
            row=db.scalar(select(Activity).where(Activity.slug==slug))
            categories=[('Military-inspired Group Challenges' if 'SSB' in c else c.title()) for c in entry['categories']]
            if not row:
                row=Activity(slug=slug,name=name,description=f'Discuss {name.lower()} as part of your Eagles Unbound experience. Current availability, suitability and programme inclusion are confirmed by the team.',published=name not in needs_confirmation,display_order=i+20,details={})
                db.add(row)
            existing=row.details or {}
            row.details={**existing,'source':catalogue['source'],'source_status':'Provided master brief; operational details require confirmation','categories':sorted(set(existing.get('categories',[])+categories)),'aliases':sorted(set(existing.get('aliases',[])+([name] if name!=row.name else []))),'confirmation_required':name in needs_confirmation}
        # Base-seed activities that the master catalogue doesn't list still need their category.
        for slug,category in {'archery':'Shooting And Archery'}.items():
            row=db.scalar(select(Activity).where(Activity.slug==slug))
            if row and category not in (row.details or {}).get('categories',[]):
                row.details={**(row.details or {}),'categories':sorted(set((row.details or {}).get('categories',[])+[category]))}
        for name in ['Soft Archery','Farm Interaction Activities','Interactive Team Games']:
            if not db.scalar(select(Activity).where(Activity.slug==slugify(name))):
                db.add(Activity(slug=slugify(name),name=name,description='Discuss this experience and its suitability for your group with the team.',published=True,display_order=110,details={'categories':['Kids Special Experiences'],'source':'Master brief: School Day Outing activities','confirmation_required':True}))
        db.flush()
        for i,entry in enumerate(programmes):
            if not db.scalar(select(Programme).where(Programme.slug==entry['slug'])):
                details=entry['details'];related=[]
                for name in details['activities']:
                    slug=aliases.get(name,slugify(name));activity=db.scalar(select(Activity).where(Activity.slug==slug))
                    if activity and activity.published:related.append(activity.slug)
                db.add(Programme(slug=entry['slug'],name=entry['name'],description=entry['description'],published=True,display_order=i+10,image='/assets/forest.jpg',details={**details,'related_slugs':related,'media_status':'Illustrative imagery; approved client media required','image_alt':'Illustrative woodland landscape'}))
        for slug,(title,intro,sections) in PAGES.items():
            if not db.scalar(select(PageContent).where(PageContent.slug==slug)):
                db.add(PageContent(slug=slug,content={'title':title,'intro':intro,'published':True,'sections':[{'heading':h,'body':b} for h,b in sections]}))
        for index,name in enumerate(['Adventure Activities','Military Bootcamp','School Outings','College Adventure','Corporate Experiences','Kids Experiences','Shooting and Archery','Obstacle Courses','Team Building','Nature and Wildlife','Camping and Accommodation','Events']):
            slug=slugify(name)
            if not db.scalar(select(GalleryAlbum).where(GalleryAlbum.slug==slug)):
                db.add(GalleryAlbum(slug=slug,name=name,published=False,display_order=index,details={'media':[],'source':'Master brief gallery taxonomy','approval_required':True}))
        if not db.scalar(select(SiteSetting).where(SiteSetting.key=='master_review')):
            db.add(SiteSetting(key='master_review',value={
                'source':'Eagles_Unbound_Master_Website_Development_Prompt.pdf, 37 pages',
                'contact_conflict':{'existing_site':'+917259307111','master_brief':'+918248333506','status':'Confirm before changing public contact'},
                'founder_claims_pending':['Recipient of Vishisht Seva Medal','35+ years of Army service','Decorated soldier','Military service highlights','Leadership philosophy','Founder message','Official portrait'],
                'accommodation_claims_pending':['Luxury tents','Comfortable beds','Attached washrooms','Private sit-out areas','Air-conditioned guest rooms','Hot water'],
                'booking_terms_pending':['Advance of 25 percent required for confirmation','Final headcount 3 days before event','Billing based on previously confirmed headcount','Weather-dependent activity changes','Charges for negligent equipment/property damage','Advance vegetarian and non-vegetarian meal requirements'],
                'missing_primary_documents':['Official 27-page activity brochure','Official 5-page 2026 programme brochure'],
                'unusual_activity_terms':['Pelvic Rest Shooting','Recove Bow Shooting'],
                'commercial_rule':'No public prices, rates, GST amounts, discounts, monetary figures or payment amounts',
            }))
        db.flush()
        review=db.scalar(select(SiteSetting).where(SiteSetting.key=='master_review'))
        review.value={**review.value,'programme_source_details':programmes,'activity_category_inventory':catalogue['categories'],'distinct_source_activity_names':len(catalogue['activities']),'bootcamp_suggested_flow':['Welcome and briefing','Team formation','Challenge introduction','Obstacle activities','Group challenges','Leadership experiences','Reflection and achievement'],'3d_assets_pending':['Approved eagle GLB model or layered brand animation','Verified park layout and zone locations','Official founder portrait','Original park photographs and action footage']}
        db.commit()
