/** Decorative tactical layer for inner page headers: letterbox bars, corner brackets, a one-time scan line, a drifting
 *  reticle that locks on, and a coordinates readout. All aria-hidden. */
export function PageHeroHUD({ photo }: { photo: boolean }) {
  return (
    <div className="ph-hud" aria-hidden="true">
      {photo && <><span className="ph-letterbox top" /><span className="ph-letterbox bottom" /></>}
      <span className="ph-bracket b1" /><span className="ph-bracket b2" /><span className="ph-bracket b3" /><span className="ph-bracket b4" />
      <span className="ph-scanline" />
      <span className="ph-reticle"><i /><b /></span>
      <span className="ph-coords">12.79°N · 77.42°E · KANAKAPURA ROAD</span>
    </div>
  );
}
