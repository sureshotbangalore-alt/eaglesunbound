import type { CSSProperties, ElementType } from 'react';

type Props = { text: string; as?: ElementType; className?: string; id?: string };

/** Heading split into masked lines/words. "\n" breaks a line. Words rise into view when revealed.
 *  The words stay real text (spaces included), so search engines and screen readers read the heading once. */
export function SplitLines({ text, as: Tag = 'h2', className = '', id }: Props) {
  let w = 0;
  return <Tag id={id} className={`split ${className}`} data-reveal="lines">
    {text.split('\n').map((line, li) => <span className="ln" key={li}>
      {line.split(' ').filter(Boolean).map((word, wi) => <span key={wi}><span className="wd" style={{ '--i': w++ } as CSSProperties}><span>{word}</span></span> </span>)}
    </span>)}
  </Tag>;
}

/** Paragraph whose words light up as the reader scrolls through it. */
export function FillText({ text, className = '' }: { text: string; className?: string }) {
  return <p className={`fill-text ${className}`} data-fill>
    {text.split(' ').map((word, i) => <span className="fw" key={i}>{word} </span>)}
  </p>;
}
