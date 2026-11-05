'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="main" className="error-page"><p className="eyebrow">WE’LL BE BACK OUTSIDE SOON</p><h1>Taking a quick pause.</h1><p>We couldn’t load the website content. Please try again shortly.</p><button className="button button-red" onClick={reset}>Try again</button></main>;
}
