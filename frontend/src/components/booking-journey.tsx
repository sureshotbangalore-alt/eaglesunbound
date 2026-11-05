export function BookingJourney({step,busy=false}:{step:number;busy?:boolean}) {
  return <ol className="booking-journey" aria-label="Booking request progress">{['Choose experience','Your details','Request saved'].map((label,i)=><li key={label} className={i<=step?'is-complete':''} aria-current={i===step?'step':undefined}><span>{i<step?'✓':String(i+1).padStart(2,'0')}</span><p>{busy&&i===2?'Saving request…':label}</p></li>)}</ol>;
}
