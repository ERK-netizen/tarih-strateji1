// game-icons.net simgeleri (CC BY 3.0: Lorc, Delapouite ve diğerleri). Yol verisi derleme sırasında çıkarılır.
import { SIMGE } from './durum.ts';

export function Simge({ ad, boy = 20, class: sinif, baslik }: { ad: string; boy?: number; class?: string; baslik?: string }) {
  const d = SIMGE[ad];
  if (!d) return null;
  return (
    <svg class={`simge ${sinif ?? ''}`} width={boy} height={boy} viewBox="0 0 512 512" aria-hidden={baslik ? undefined : 'true'} role={baslik ? 'img' : undefined}>
      {baslik && <title>{baslik}</title>}
      <path d={d} fill="currentColor" />
    </svg>
  );
}

/** Birlik pulu: ülke renginde levha üzerinde dönem simgesi (haritadaki pulla aynı dil). */
export function BirlikPulu({ simge, renk, boy = 40, adet }: { simge: string; renk: string; boy?: number; adet?: number }) {
  const acik = parlak(renk) > 0.58;
  return (
    <span class="pul" style={{ background: renk, color: acik ? '#141a20' : '#f7f2e6', width: `${Math.round(boy * 1.3)}px`, height: `${boy}px` }}>
      <Simge ad={simge} boy={Math.round(boy * 0.78)} />
      {adet !== undefined && adet > 1 && <b class="pul-adet">{adet}</b>}
    </span>
  );
}

function parlak(h: string): number {
  const x = h.replace('#', '');
  const r = parseInt(x.slice(0, 2), 16), g = parseInt(x.slice(2, 4), 16), b = parseInt(x.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
