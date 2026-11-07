import Link from 'next/link';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';
import { RangeGame } from '@/components/range-game';
import { SplitLines } from '@/components/split-text';
import { AcademyHeroFilm } from '@/components/academy-hero-film';

export async function generateMetadata() {
  return pageMetadata('/shooting-academy', 'Shooting Academy Range Challenge', 'Play Eagle Eye Range, the Eagles Unbound arcade target challenge: thirty seconds, three difficulty levels, pop-up targets, drones and reward strikes. Free to play in your browser.');
}

export default function ShootingAcademy() {
  return (
    <main id="main" className="academy">
      <section className="academy-hero">
        <span className="academy-reticle" aria-hidden="true"><i /></span>
        <figure className="academy-hero-film"><AcademyHeroFilm /><span className="corner tl" aria-hidden="true" /><span className="corner br" aria-hidden="true" /></figure>
        <div className="academy-hero-copy">
          <p className="label"><span className="live-dot" />Shooting Academy · Arcade range</p>
          <h1>Steady hands.<br /><em>Sharp eyes.</em></h1>
          <p className="lead">Step up to Eagle Eye Range: a thirty-second arcade target challenge. Pick a difficulty, line up the scope and see whether you earn the Eagle Eye rank.</p>
          <div className="hero-actions">
            <a className="button button-red" href="#range">Enter the range <ArrowDown size={17} /></a>
            <Link className="button button-light" href="/book-now">Book an adventure day <ArrowUpRight size={17} /></Link>
          </div>
        </div>
      </section>

      <section className="chapter night academy-section" aria-labelledby="briefing-title">
        <div className="chapter-head" data-reveal="rule"><span className="label">01 — Range briefing</span><span className="label">How it works</span></div>
        <h2 id="briefing-title" className="sr-only">How the range challenge works</h2>
        <SplitLines text={'Aim. Fire.\nOutscore yourself.'} className="display-xl" />
        <ol className="academy-steps" data-stagger>
          <li><h3>Choose your level</h3><p>Recruit, Regular or Elite. Each level changes how fast targets move and how long they stay up.</p></li>
          <li><h3>Hit the targets</h3><p>Centre hits score the most. Drones are worth 25 and crates take out everything around them.</p></li>
          <li><h3>Leave the allies</h3><p>Green ally flags cost you 20 points. Watch before you fire.</p></li>
          <li><h3>Earn reward strikes</h3><p>Five hits in a row call in a rocket, arrow or bomb strike on another target.</p></li>
        </ol>
      </section>

      <section id="range" className="chapter night academy-section" aria-labelledby="range-title">
        <div className="chapter-head" data-reveal="rule"><span className="label">02 — Eagle Eye Range</span><span className="label">30-second round</span></div>
        <h2 id="range-title" className="sr-only">Eagle Eye Range game</h2>
        <RangeGame />
        <p className="academy-note">This is a fictional, arcade-style game for fun. It is not weapons training, there are no prizes, and nothing you do here is sent to us. Scores are saved only in this browser.</p>
      </section>
    </main>
  );
}
