// Filolar ve hava kanatları (şartname v1.6, PR-08): her birimin tek konumu/üssü ve tek görevi vardır.
import { useState } from 'preact/hooks';
import { fmt, cekmece } from './durum.ts';
import { onizle } from './eylem.ts';
import { bolgeyeGit } from './App.tsx';

const git = (r: number) => { bolgeyeGit(r); cekmece.value = { tur: 'bolge', r }; };

export function FiloBolumu({ k }: { k: any }) {
  const [acik, setAcik] = useState(-1);
  const [hedef, setHedef] = useState(-1);
  if (!k.filolar?.length) return null;
  // hedef seçenekleri: kıyı cepheleri ve kendi limanlarımız
  const kiyilar: { r: number; ad: string }[] = [...k.cepheler.filter((x: any) => x.kiyi).map((x: any) => ({ r: x.r, ad: `⚓ ${x.ad}` })), ...k.limanlarim.filter((l: any) => !k.cepheler.some((x: any) => x.r === l.r))];
  return (
    <section>
      <h3>Filolar · {k.filolar.length}/{k.filoAzami}</h3>
      <p class="soluk kucuk">Her filo tek bir bölgededir ve tek görev yürütür; yoldayken hiçbir bölgede etkili değildir. Menzil ana limandan {k.denizMenzil} bölge.</p>
      <ul class="komutan-liste">
        {k.filolar.map((f: any) => (
          <li key={f.id}>
            <div class="km-bas">
              <button class="bag km-ad" aria-expanded={acik === f.id} onClick={() => { setAcik(acik === f.id ? -1 : f.id); setHedef(-1); }}><strong>{f.ad}</strong></button>
              <span class="km-rozet">{k.denizGorevler[f.gorev]}</span>
              <span class="soluk kucuk">{f.toplam} gemi · güç {fmt(f.guc)}{f.hasar > 0 ? ` · hasar %${Math.floor(f.hasar / 10_000)}` : ''}</span>
            </div>
            <div class="kucuk">
              <button class="bag" onClick={() => git(f.konum)}>{f.konumAd}</button>
              {f.hedefAd ? <span> → <button class="bag" onClick={() => git(f.hedef)}>{f.hedefAd}</button> <span class="soluk">({f.kalan} gün, yolda)</span></span> : null}
              <span class="soluk"> · ana liman {f.usAd}</span>
            </div>
            <div class="km-nitelik kucuk soluk">{k.gemiler.filter((g: any) => f.gemi[g.k] > 0).map((g: any) => <span key={g.k}>{f.gemi[g.k]} {g.ad.toLocaleLowerCase('tr')}</span>)}</div>
            {acik === f.id && (
              <div class="km-emir">
                <div class="satir-ayar"><label for={`fh${f.id}`}>Hedef bölge</label>
                  <select id={`fh${f.id}`} value={hedef} onChange={(e) => setHedef(Number((e.target as HTMLSelectElement).value))}>
                    <option value={-1}>Yerinde kal ({f.hedefAd ?? f.konumAd})</option>
                    {kiyilar.map((x) => <option key={x.r} value={x.r}>{x.ad}</option>)}
                  </select></div>
                <div class="cipler sar">{k.denizGorevler.map((g: string, i: number) => <button key={g} class={`cip ${f.gorev === i ? 'acik' : ''}`} aria-pressed={f.gorev === i} onClick={() => onizle({ tur: 'filoGorev', filo: f.id, gorev: i, bolge: i === 0 ? -1 : hedef })}>{g}</button>)}</div>
                <div class="satir-ayar"><span class="soluk kucuk">Filoyu böl: seçilen sınıfın yarısı yeni filoya geçer</span>
                  <span class="dugmeler">{k.gemiler.filter((g: any) => f.gemi[g.k] >= 2).map((g: any) => <button key={g.k} class="kucuk-dugme" disabled={k.filolar.length >= k.filoAzami} onClick={() => onizle({ tur: 'filoAktar', filo: f.id, hedefFilo: -1, sinif: g.k, adet: Math.floor(f.gemi[g.k] / 2) })}>{g.ad}</button>)}</span></div>
                {k.filolar.filter((x: any) => x.id !== f.id && x.konum === f.konum && !x.hedefAd && !f.hedefAd).map((x: any) => (
                  <div class="satir-ayar" key={x.id}><span class="soluk kucuk">Bütün gemileri {x.ad} ile birleştir</span>
                    <span class="dugmeler">{k.gemiler.filter((g: any) => f.gemi[g.k] > 0).map((g: any) => <button key={g.k} class="kucuk-dugme" onClick={() => onizle({ tur: 'filoAktar', filo: f.id, hedefFilo: x.id, sinif: g.k, adet: f.gemi[g.k] })}>{g.ad}</button>)}</span></div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function KanatBolumu({ k }: { k: any }) {
  const [acik, setAcik] = useState(-1);
  const [hedef, setHedef] = useState(-1);
  if (!k.kanatlar?.length) return null;
  const us = k.uslerim.filter((x: any) => x.us > 0);
  return (
    <section>
      <h3>Hava kanatları · {k.kanatlar.length}/{k.kanatAzami}</h3>
      <p class="soluk kucuk">Her kanat tek bir üsse bağlıdır ve tek hedefte sayılır; menzil kendi üssünden {k.havaMenzil} bölgedir. Üs kapasitesi aşılırsa verim düşer.</p>
      <ul class="komutan-liste">
        {k.kanatlar.map((x: any) => (
          <li key={x.id} class={x.usUcak > x.usKapasite && x.usKapasite > 0 ? 'asim' : ''}>
            <div class="km-bas">
              <button class="bag km-ad" aria-expanded={acik === x.id} onClick={() => { setAcik(acik === x.id ? -1 : x.id); setHedef(-1); }}><strong>{x.ad}</strong></button>
              <span class="km-rozet">{k.havaGorevler[x.gorev]}</span>
              <span class="soluk kucuk">{x.toplam} uçak{x.hasar > 0 ? ` · hasar %${Math.floor(x.hasar / 10_000)}` : ''}</span>
            </div>
            <div class="kucuk">
              <span class="soluk">üs </span><button class="bag" onClick={() => git(x.us)}>{x.usAd}</button><span class={x.usUcak > x.usKapasite ? 'kotu-yazi' : 'soluk'}> ({x.usUcak}/{x.usKapasite})</span>
              {x.hedefAd ? <span> → <button class="bag" onClick={() => git(x.hedef)}>{x.hedefAd}</button></span> : null}
            </div>
            <div class="km-nitelik kucuk soluk">{k.ucaklar.filter((h: any) => x.ucak[h.k] > 0).map((h: any) => <span key={h.k}>{x.ucak[h.k]} {h.ad.toLocaleLowerCase('tr')}</span>)}</div>
            {acik === x.id && (
              <div class="km-emir">
                <div class="satir-ayar"><label for={`kh${x.id}`}>Hedef bölge</label>
                  <select id={`kh${x.id}`} value={hedef} onChange={(e) => setHedef(Number((e.target as HTMLSelectElement).value))}>
                    <option value={-1}>—</option>
                    {k.cepheler.map((c: any) => <option key={c.r} value={c.r}>{c.ad}{c.bizim ? '' : ' (düşman)'}{x.menzilde.includes(c.r) ? '' : ' — bu üsten menzil dışı'}</option>)}
                  </select></div>
                <div class="cipler sar">{k.havaGorevler.map((g: string, i: number) => <button key={g} class={`cip ${x.gorev === i ? 'acik' : ''}`} aria-pressed={x.gorev === i} disabled={i > 0 && hedef < 0} onClick={() => onizle({ tur: 'kanatGorev', kanat: x.id, gorev: i, bolge: i === 0 ? -1 : hedef })}>{g}</button>)}</div>
                {us.length > 1 && <div class="satir-ayar"><label for={`ku${x.id}`}>Üs değiştir</label>
                  <select id={`ku${x.id}`} value={x.us} onChange={(e) => onizle({ tur: 'kanatUs', kanat: x.id, bolge: Number((e.target as HTMLSelectElement).value) })}>
                    {us.map((u: any) => <option key={u.r} value={u.r}>{u.ad} (düzey {u.us})</option>)}
                  </select></div>}
                <div class="satir-ayar"><span class="soluk kucuk">Kanadı böl: seçilen türün yarısı yeni kanada geçer</span>
                  <span class="dugmeler">{k.ucaklar.filter((h: any) => x.ucak[h.k] >= 2).map((h: any) => <button key={h.k} class="kucuk-dugme" disabled={k.kanatlar.length >= k.kanatAzami} onClick={() => onizle({ tur: 'kanatAktar', kanat: x.id, hedefKanat: -1, tip: h.k, adet: Math.floor(x.ucak[h.k] / 2) })}>{h.ad}</button>)}</span></div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
