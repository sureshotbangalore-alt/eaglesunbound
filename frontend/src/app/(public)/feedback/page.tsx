import { pageMetadata } from '@/lib/seo';
import { serverAPI } from '@/lib/api';
import { PageHero } from '@/components/page-hero';
import { FeedbackForm, Testimonials, type Testimonial } from '@/components/feedback';
import { photos } from '@/lib/imagery';

export async function generateMetadata() {
  return pageMetadata('/feedback', 'Visitor Feedback & Testimonials', 'Read what visitors say about their day at Eagles Unbound, and share your own experience.');
}

export default async function FeedbackPage() {
  let items: Testimonial[] = [];
  try { items = await serverAPI<Testimonial[]>('/public/testimonials'); } catch { items = []; }
  return (
    <main id="main" className="inner-page page-feedback">
      <PageHero title="In their words." intro="Honest feedback from groups who spent a day with us, published only with their permission." label="Feedback" path="/feedback" picture={photos.groupCorporate} />
      {items.length > 0 && <section className="content-section"><h2 className="display-l">What visitors say.</h2><Testimonials items={items} /></section>}
      <section className="content-section fb-section" id="share">
        <div className="fb-intro"><p className="label">Share your experience</p><h2 className="display-l">Tell us about your day.</h2><p>Your feedback helps us improve every programme. Our team reviews every message, and nothing is published without your permission.</p></div>
        <FeedbackForm />
      </section>
    </main>
  );
}
