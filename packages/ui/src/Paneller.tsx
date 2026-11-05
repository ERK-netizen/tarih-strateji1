import { useEffect, useState } from 'preact/hooks';
import { pkg, istemci, panel, ozet, panelSurum, fmt, kisalt, puan, yuzde, nedenAcik, tost, sessiz, sessizDegis, taninmayan, ekran, seciliBirlik, harita, tazele } from './durum.ts';
import { onizle, komutCalistir } from './eylem.ts';
import { haritaCizici } from './App.tsx';

function useGorunum(gorunum: string, kapsam?: number, ek?: Record<string, unknown>) {
  const [v, setV] = useState<any>(null);
  const s = panelSurum.value;
  useEffect(() => { void istemci.istek('query', { gorunum, kapsam, ...ek }).then((x) => setV(x.veri)); }, [gorunum, kapsam, s, JSON.stringify(ek ?? {})]);
  return v;
}
const neden = (k: string) => void istemci.istek('explain', k).then((x) => { nedenAcik.value = x; });

export function Paneller() {
  const p = panel.value!;
  const baslik = { devlet: 'Devlet', ordu: 'Ordu', ekonomi: 'Ekonomi', diplomasi: 'Diplomasi', arastirma: 'Araştırma', istatistik: 'Devlet istatistikleri', kronik: 'Kronik', kayit: 'Kayıt ve ayarlar' }[p];
  return (
    <aside class="panel" aria-label={baslik}>
      <header class="panel-bas"><h2>{baslik}</h2><button class="kapat" onClick={() => { panel.value = null; }} aria-label="Paneli kapat">×</button></header>
      <div class="panel-govde">
        {p === 'devlet' && <Devlet />}
        {p === 'ordu' && <Ordu />}
        {p === 'ekonomi' && <Ekonomi />}
        {p === 'diplomasi' && <Diplomasi />}
        {p === 'arastirma' && <Arastirma />}
        {p === 'istatistik' && <Istatistik />}
        {p === 'kronik' && <Kronik />}
        {p === 'kayit' && <Kayit />}
      </div>
    </aside>
  );
}

// ---------- Devlet ----------
function Devlet() {
  const o = ozet.value;
  if (!o) return null;
  const P = o.oyuncu;
  const bt = ['Bilim', 'Eğitim', 'Altyapı/Tarım', 'Sosyal/Güvenlik'];
  const butceDegis = (i: number, d: number) => {
    const p = [...o.butce];
    p[i] = Math.max(0, Math.min(1_000_000, p[i] + d));
    const j = p.findIndex((x: number, k: number) => k !== i && x - d >= 0 && x - d <= 1_000_000);
    if (j < 0) return;
    p[j] -= d;
    void onizle({ tur: 'butce', paylar: p });
  };
  return (
    <div class="bolumler">
      <section>
        <h3>{o.ulke.ad}</h3>
        <p class="soluk">{o.ulke.yonetim} · {o.ulke.lider}</p>
        <dl class="cift">
          <dt>Meşruiyet</dt><dd><button class="bag" onClick={() => neden(`mesru:${P}`)}>{puan(o.mesru)}</button></dd>
          <dt>Huzur</dt><dd><button class="bag" onClick={() => neden(`huzur:${P}`)}>{puan(o.huzur)}</button></dd>
          <dt>Savaşa destek</dt><dd><button class="bag" onClick={() => neden(`destek:${P}`)}>{puan(o.destek)}</button></dd>
          <dt>Yaşam düzeyi</dt><dd><button class="bag" onClick={() => neden(`yasam:${P}`)}>{puan(o.yasam)}</button></dd>
          <dt>Yönetim kapasitesi</dt><dd><button class="bag" onClick={() => neden(`kapasite:${P}`)}>Ayrıntı</button></dd>
        </dl>
      </section>
      <section>
        <h3>Vergi ve bütçe</h3>
        <div class="satir-ayar"><span>Vergi oranı <strong>{yuzde(o.vergi)}</strong></span>
          <span class="dugmeler"><button onClick={() => onizle({ tur: 'vergi', oran: o.vergi - 10_000 })}>−1</button><button onClick={() => onizle({ tur: 'vergi', oran: o.vergi + 10_000 })}>+1</button></span></div>
        {bt.map((ad, i) => (
          <div class="satir-ayar" key={ad}><span>{ad} <strong>{yuzde(o.butce[i])}</strong></span>
            <span class="cubukluk"><span style={{ width: `${o.butce[i] / 10_000}%` }} /></span>
            <span class="dugmeler"><button onClick={() => butceDegis(i, -50_000)}>−5</button><button onClick={() => butceDegis(i, 50_000)}>+5</button></span></div>
        ))}
        <div class="satir-ayar"><span>Politika harcaması <strong>{yuzde(o.harcamaOran)}</strong> <span class="soluk">gelir fazlasından</span></span>
          <span class="dugmeler"><button onClick={() => onizle({ tur: 'harcama', oran: Math.max(0, o.harcamaOran - 100_000) })}>−10</button><button onClick={() => onizle({ tur: 'harcama', oran: Math.min(1_000_000, o.harcamaOran + 100_000) })}>+10</button></span></div>
        <div class="satir-ayar"><span>Borç <strong>{kisalt(o.borc)}</strong> <span class="soluk">limit {kisalt(o.krediLimit)} · faiz %{(o.faiz / 10_000).toFixed(1)}</span></span>
          <span class="dugmeler"><button onClick={() => onizle({ tur: 'borcAl', miktar: Math.min(o.krediLimit, 1_000_000) })} disabled={o.krediLimit <= 0}>Al 1 mn</button><button onClick={() => onizle({ tur: 'borcOde', miktar: o.borc })} disabled={o.borc <= 0}>Öde</button></span></div>
      </section>
      <section>
        <h3>Yasalar</h3>
        <SecimSatiri ad="Askerlik" secenek={o.ayarlar.yasa.askerlik} deger={o.askerlik} sec={(i) => onizle({ tur: 'askerlik', yasa: i })} />
        <SecimSatiri ad="Ekonomi" secenek={o.ayarlar.yasa.ekonomi} deger={o.ekonomiYasa} sec={(i) => onizle({ tur: 'ekonomi', yasa: i })} />
        <SecimSatiri ad="İşgal" secenek={o.ayarlar.yasa.isgal} deger={o.isgalPol} sec={(i) => onizle({ tur: 'isgalPol', pol: i })} />
        <SecimSatiri ad="Karne" secenek={['Yok', 'Uygula']} deger={o.karne} sec={(i) => onizle({ tur: 'karne', acik: i })} />
        <p class="soluk kucuk">Seferberlik, seçim ve para basma bu aşamada (1A) kapalı özellik bayraklarıdır.</p>
      </section>
      <section>
        <h3>Otomasyon</h3>
        <SecimSatiri ad="Cephe" secenek={['Kapalı', 'Uygula']} deger={o.otoCephe} sec={(i) => onizle({ tur: 'otoCephe', acik: i })} />
        <SecimSatiri ad="Takviye" secenek={['Kapalı', 'Açık']} deger={o.otoTakviye} sec={(i) => onizle({ tur: 'otoTakviye', acik: i })} />
        <SecimSatiri ad="Gıda alımı" secenek={['Kapalı', 'Açık']} deger={o.kaliciGida} sec={(i) => onizle({ tur: 'kaliciGida', acik: i })} />
      </section>
      {o.mod === 1 && <Sandbox />}
    </div>
  );
}

function SecimSatiri({ ad, secenek, deger, sec }: { ad: string; secenek: string[]; deger: number; sec: (i: number) => void }) {
  return (
    <div class="secim-satiri"><span>{ad}</span>
      <div class="segment">{secenek.map((s, i) => <button key={s} class={i === deger ? 'acik' : ''} onClick={() => i !== deger && sec(i)}>{s}</button>)}</div>
    </div>
  );
}

function Sandbox() {
  const [ulke, setUlke] = useState(ozet.value?.oyuncu ?? 0);
  const alanlar: [string, string, number][] = [['hazine', 'Hazine', 1_000_000], ['gida', 'Gıda', 1000], ['muhimmat', 'Mühimmat', 200], ['celik', 'Çelik', 100], ['pg', 'Siyasi güç', 50], ['huzur', 'Huzur', 10], ['insan', 'İnsan gücü', 20_000], ['ekip0', 'Piyade silahı', 1000]];
  return (
    <section class="sandbox">
      <h3>Sandbox</h3>
      <div class="segment">{pkg.ulkeler.map((u, i) => <button class={ulke === i ? 'acik' : ''} onClick={() => setUlke(i)}>{u.kisa}</button>)}</div>
      {alanlar.map(([k, ad, m]) => (
        <div class="satir-ayar" key={k}><span>{ad}</span><span class="dugmeler">
          <button onClick={() => onizle({ tur: 'sandbox', alan: k, miktar: -m, hedefUlke: ulke })}>−{kisalt(m)}</button>
          <button onClick={() => onizle({ tur: 'sandbox', alan: k, miktar: m, hedefUlke: ulke })}>+{kisalt(m)}</button></span></div>
      ))}
    </section>
  );
}

// ---------- Ordu ----------
function Ordu() {
  const b = useGorunum('birlik');
  const o = ozet.value;
  const [sab, setSab] = useState(0);
  const [adet, setAdet] = useState(1);
  if (!b || !o) return null;
  const sec = seciliBirlik.value;
  const tikla = (id: number) => {
    const s = new Set(sec); if (s.has(id)) s.delete(id); else s.add(id);
    seciliBirlik.value = s;
    const c = haritaCizici(); if (c) { c.seciliBirlik = s; c.isaretle(); }
  };
  return (
    <div class="bolumler">
      <section>
        <h3>Birlik kur</h3>
        <div class="segment">{['Piyade Tümeni', 'Süvari Tümeni', 'Topçu Alayı', 'Yedek Tümen'].map((s, i) => <button class={sab === i ? 'acik' : ''} onClick={() => setSab(i)}>{s}</button>)}</div>
        <div class="satir-ayar"><span>Adet <strong>{adet}</strong></span><span class="dugmeler"><button onClick={() => setAdet(Math.max(1, adet - 1))}>−</button><button onClick={() => setAdet(Math.min(10, adet + 1))}>+</button><button class="ana" onClick={() => onizle({ tur: 'birlikKur', sablon: sab, adet })}>Önizle</button></span></div>
        <p class="soluk kucuk">Erişilebilir çağrılabilir insan gücü {fmt(o.insanY)} · eğitimli yedek {fmt(o.insan.E)} · mühimmat {fmt(Math.floor(o.muhimmat / 1000))} birim</p>
      </section>
      <section>
        <h3>Birlikler · {b.length}</h3>
        {sec.size > 0 && <div class="dugmeler satir-bas"><span class="soluk">{sec.size} seçili — haritada hedefe dokunun</span>
          <button onClick={() => onizle({ tur: 'durus', birlikler: [...sec], durus: 0 })}>Hattı tut</button><button onClick={() => onizle({ tur: 'durus', birlikler: [...sec], durus: 1 })}>Esnek</button><button onClick={() => onizle({ tur: 'terhis', birlikler: [...sec] })}>Terhis</button></div>}
        <table class="tablo">
          <thead><tr><th>Birlik</th><th>Konum</th><th class="sayi">Kişi</th><th class="sayi">Org.</th><th class="sayi">Sal/Sav</th><th class="sayi">İkmal</th></tr></thead>
          <tbody>
            {b.map((x: any) => (
              <tr key={x.id} class={sec.has(x.id) ? 'secili' : ''} onClick={() => tikla(x.id)}>
                <td><strong>{x.ad}</strong><br /><span class="soluk kucuk">{x.egitim ? `eğitimde ${x.egitim} gün` : x.muharebe ? 'muharebede' : x.hedefAd ? `→ ${x.hedefAd}` : x.durus}</span></td>
                <td>{x.bolgeAd}</td>
                <td class="sayi">{fmt(x.kisi)}<br /><span class="soluk kucuk">/{fmt(x.kisiHedef)}</span></td>
                <td class="sayi"><Bar v={x.org / Math.max(1, x.orgMax)} /></td>
                <td class="sayi">{Math.round(x.YS / 1000)}/{Math.round(x.SV / 1000)}</td>
                <td class="sayi">{yuzde(Math.min(x.ikmalGida, x.ikmalMuh))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p class="soluk kucuk">Çekirdek muharebe modu: saldırı, savunma, kırılma ve organizasyon. Zırh, delme ve sertlik 1A'da kapalıdır.</p>
      </section>
    </div>
  );
}
function Bar({ v }: { v: number }) {
  const c = v > 0.6 ? 'iyi' : v > 0.3 ? 'orta' : 'kotu';
  return <span class={`mini-bar ${c}`} title={`%${Math.round(v * 100)}`}><span style={{ width: `${Math.max(0, Math.min(100, v * 100))}%` }} /></span>;
}

// ---------- Ekonomi ----------
function Ekonomi() {
  const e = useGorunum('ekonomi');
  const [mal, setMal] = useState(0);
  const [miktar, setMiktar] = useState(100);
  const [kalici, setKalici] = useState(0);
  if (!e) return null;
  const hat = (urun: number) => e.hatlar.find((h: any) => h.urun === urun);
  const urunler: [number, string][] = [[0, 'Piyade silahı I'], [1, 'Piyade silahı II'], [2, 'Piyade silahı III'], [3, 'Süvari teçhizatı'], [4, 'Makineli tüfek'], [5, 'Sahra topu'], [6, 'Ağır top'], [7, 'Ağır top II'], [100, 'Mühimmat']];
  const atanan = e.hatlar.reduce((s: number, h: any) => s + h.fabrika, 0);
  return (
    <div class="bolumler">
      <section>
        <h3>Askerî üretim</h3>
        <p class="soluk">Etkin askerî fabrika {(e.askeriF / 1000).toFixed(1)} · atanan {(atanan / 1000).toFixed(1)} · çelik {(e.celikDun / 1000).toFixed(1)}/gün (stok {(e.celik / 1000).toFixed(0)}) · kömür {(e.komurDun / 1000).toFixed(1)}/gün</p>
        <table class="tablo">
          <thead><tr><th>Ürün</th><th class="sayi">Stok</th><th class="sayi">Fabrika</th><th class="sayi">Verim</th><th /></tr></thead>
          <tbody>{urunler.map(([u, ad]) => {
            const h = hat(u);
            const stok = u === 100 ? Math.floor(e.muhimmat / 1000) : e.ekip[u]?.stok ?? 0;
            const kilit = u !== 100 && e.ekip[u]?.kilitli;
            return (
              <tr key={u} class={kilit ? 'soluk' : ''}>
                <td>{ad}{kilit ? ' · araştırma gerekir' : ''}</td><td class="sayi">{fmt(stok)}</td>
                <td class="sayi">{h ? (h.fabrika / 1000).toFixed(1) : '—'}</td><td class="sayi">{h ? yuzde(h.verim) : '—'}</td>
                <td class="dugmeler">{!kilit && <><button onClick={() => onizle({ tur: 'uretim', urun: u, fabrika: Math.max(0, (h?.fabrika ?? 0) - 1000) })} disabled={!h}>−</button><button onClick={() => onizle({ tur: 'uretim', urun: u, fabrika: (h?.fabrika ?? 0) + 1000 })}>+</button></>}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </section>
      <section>
        <h3>İnşaat · sivil sanayi</h3>
        <p class="soluk">Etkin sivil fabrika {(e.sivilF / 1000).toFixed(1)} · tüketim malı yeterliliği {yuzde(e.tuketimYet)}</p>
        {e.projeler.length ? <ul class="liste">{e.projeler.map((p: any) => <li><span>{p.ad} · {p.bolge}</span><Bar v={p.yuzde / 100} /></li>)}</ul> : <p class="soluk">Süren proje yok. Haritada kendi bölgenize dokunup inşa edin.</p>}
      </section>
      <section>
        <h3>Dünya pazarı</h3>
        <table class="tablo"><thead><tr><th>Mal</th><th class="sayi">Fiyat</th><th class="sayi">Referans</th><th class="sayi">Son hacim</th></tr></thead>
          <tbody>{e.fiyat.map((f: any) => <tr><td>{f.ad}</td><td class={`sayi ${f.fiyat > f.p0 * 1.1 ? 'kotu-yazi' : f.fiyat < f.p0 * 0.9 ? 'iyi-yazi' : ''}`}>{fmt(f.fiyat)}</td><td class="sayi soluk">{fmt(f.p0)}</td><td class="sayi">{fmt(Math.floor(f.hacim / 1000))}</td></tr>)}</tbody></table>
        <div class="segment">{['Gıda', 'Çelik', 'Kömür', 'Mühimmat'].map((m, i) => <button class={mal === i ? 'acik' : ''} onClick={() => setMal(i)}>{m}</button>)}</div>
        <div class="satir-ayar"><span>Miktar <strong>{fmt(miktar)}</strong> birim</span><span class="dugmeler"><button onClick={() => setMiktar(Math.max(10, Math.round(miktar / 2)))}>÷2</button><button onClick={() => setMiktar(miktar * 2)}>×2</button></span></div>
        <SecimSatiri ad="Sıklık" secenek={['Bir kez', 'Her hafta']} deger={kalici} sec={setKalici} />
        <div class="dugmeler"><button onClick={() => onizle({ tur: 'satinAl', mal, miktar, kalici })}>Satın al</button><button onClick={() => onizle({ tur: 'sat', mal, miktar, kalici })}>Sat</button></div>
        {e.siparis.length > 0 && <ul class="liste">{e.siparis.map((s: any) => <li><span>{s.yon}: {fmt(s.miktar)} {s.mal.toLocaleLowerCase('tr')}</span><span class="soluk">{s.kalici ? 'haftalık' : 'tek sefer'}</span></li>)}</ul>}
      </section>
      <section>
        <h3>Gelir ve gider (günlük)</h3>
        <dl class="cift">
          <dt>Vergi geliri</dt><dd><button class="bag" onClick={() => neden(`gelir:${ozet.value.oyuncu}`)}>{fmt(e.gelirDun)}</button></dd>
          <dt>Personel</dt><dd>−{fmt(e.gider.personel)}</dd><dt>Ekipman bakımı</dt><dd>−{fmt(e.gider.bakim)}</dd><dt>İdare</dt><dd>−{fmt(e.gider.idari)}</dd><dt>Borç servisi</dt><dd>−{fmt(e.gider.borc)}</dd>
          <dt>Son üç ay geliri</dt><dd>{kisalt(e.g1)} · {kisalt(e.g2)} · {kisalt(e.g3)}</dd>
        </dl>
      </section>
    </div>
  );
}

// ---------- Diplomasi ----------
function Diplomasi() {
  const d = useGorunum('diplomasi');
  const h = harita.value;
  const [baris, setBaris] = useState<{ ulke: number; rs: number[]; tur: number } | null>(null);
  if (!d) return null;
  const P = ozet.value?.oyuncu ?? 0;
  const tehdit = (p: number) => (p >= 60_000 ? ['Yüksek', 'kotu'] : p >= 30_000 ? ['Orta', 'orta'] : ['Düşük', 'iyi']);
  return (
    <div class="bolumler">
      {d.gelen.length > 0 && (
        <section class="vurgulu">
          <h3>Gelen teklifler</h3>
          {d.gelen.map((t: any) => (
            <div class="teklif" key={t.id}>
              <span><strong>{t.kimdenAd}</strong>: {t.ad}{t.detay ? ` — ${t.detay}` : ''}</span>
              <span class="dugmeler"><button onClick={() => onizle({ tur: 'teklifYanit', teklif: t.id, kabul: 0 })}>Reddet</button><button class="ana" onClick={() => onizle({ tur: 'teklifYanit', teklif: t.id, kabul: 1 })}>Kabul et</button></span>
            </div>
          ))}
        </section>
      )}
      {d.ulkeler.map((u: any) => {
        const [tad, tton] = tehdit(u.tehdit);
        const izin = (esik: number) => u.gorusBize >= esik;
        return (
          <section key={u.id} class="ulke-dip">
            <header class="ud-bas"><span class="muhur" style={{ background: u.renk }} /><div><h3>{u.ad}</h3><span class="soluk">{u.yonetim} · {u.kisilik} · {u.lider}</span></div>
              <span class={`durum-cip ${tton}`} title={u.tehditBilesen.filter((b: any) => b.deger > 0).map((b: any) => b.ad).join(', ')}>Tehdit: {tad}</span></header>
            <div class="iki-bar">
              <div><span class="soluk kucuk">Bize görüşü</span><GorusBar v={u.gorusBize} /></div>
              <div><span class="soluk kucuk">Bizim görüşümüz</span><GorusBar v={u.gorusumuz} /></div>
            </div>
            <p class="kucuk">
              {u.savasta ? <strong class="kotu-yazi">SAVAŞTAYIZ · skor {u.skor >= 0 ? '+' : ''}{puan(u.skor)} · barışa isteklilik %{Math.floor(u.isteklilikleri / 10_000)}</strong> : (u.anlasmalar.join(' · ') || 'Anlaşma yok')}
              {u.gerekceBize && <span class="kotu-yazi"> · Size karşı gerekçe hazırlıyor</span>}
              {u.gerekceBizim && <span> · Gerekçemiz {u.gerekceBizim}</span>}
            </p>
            <p class="soluk kucuk">Niyet işaretleri: {u.tehditBilesen.filter((b: any) => b.deger > 0).map((b: any) => b.ad.toLocaleLowerCase('tr')).join(', ') || 'yok'} · hazine {u.hazine} · ordu ≈ {Math.round(u.gucAlt / 1000)}–{Math.round(u.gucUst / 1000)} güç (istihbarat {puan(u.istihbarat)}){u.savastaMi.length ? ` · savaşta: ${u.savastaMi.join(', ')}` : ''}</p>
            <div class="dugmeler sar">
              {u.savasta ? <>
                <button onClick={() => onizle({ tur: 'baris', kime: u.id, barisTur: 0, bolgeler: [] })}>Beyaz barış</button>
                <button onClick={() => setBaris({ ulke: u.id, rs: (h?.bolgeler ?? []).map((b, i) => ({ b, i })).filter(({ b }) => b.s === u.id && b.k === P).map(({ i }) => i), tur: 1 })}>Toprak iste…</button>
              </> : <>
                <button disabled={!izin(20_000)} onClick={() => onizle({ tur: 'teklif', kime: u.id, tip: 0 })}>Ticaret</button>
                <button disabled={!izin(40_000)} onClick={() => onizle({ tur: 'teklif', kime: u.id, tip: 1 })}>Saldırmazlık</button>
                <button disabled={!izin(60_000)} onClick={() => onizle({ tur: 'teklif', kime: u.id, tip: 2 })}>Geçiş hakkı</button>
                <button disabled={!izin(60_000)} onClick={() => onizle({ tur: 'teklif', kime: u.id, tip: 3 })}>Garanti ver</button>
                <button disabled={!izin(80_000)} onClick={() => onizle({ tur: 'teklif', kime: u.id, tip: 4 })}>İttifak</button>
                <button disabled={!izin(60_000)} onClick={() => onizle({ tur: 'teklif', kime: u.id, tip: 14, ekip: 0, adet: 200 })}>200 tüfek al</button>
                <button onClick={() => onizle({ tur: 'gerekce', hedef: u.id })}>Gerekçe</button>
                <button class="tehlike" onClick={() => onizle({ tur: 'savasIlan', hedef: u.id })}>Savaş ilan et</button>
              </>}
              <button onClick={() => onizle({ tur: 'tutum', kime: u.id, tutum: u.tutumumuz === 'Dostane' ? 1 : 0 })}>{u.tutumumuz === 'Dostane' ? 'Nötr tutum' : 'Dostane tutum'}</button>
              <button onClick={() => onizle({ tur: 'tutum', kime: u.id, tutum: 3 })}>Düşmanca</button>
            </div>
            {baris && baris.ulke === u.id && (
              <div class="baris-sec">
                <p class="kucuk">İstenecek bölgeler (taviz bütçesi {u.tavizButcesi} puan):</p>
                <div class="cipler">{(h?.bolgeler ?? []).map((b, i) => ({ b, i })).filter(({ b }) => b.s === u.id).map(({ b, i }) => (
                  <button class={`cip ${baris.rs.includes(i) ? 'acik' : ''} ${b.k === P ? '' : 'soluk'}`} onClick={() => setBaris({ ...baris, rs: baris.rs.includes(i) ? baris.rs.filter((x) => x !== i) : [...baris.rs, i] })}>{pkg.bolgeler[i]!.ad}</button>
                ))}</div>
                <div class="dugmeler"><button onClick={() => setBaris(null)}>Vazgeç</button><button class="ana" onClick={() => { void onizle({ tur: 'baris', kime: u.id, barisTur: baris.tur, bolgeler: baris.rs }); setBaris(null); }}>Önizle</button></div>
              </div>
            )}
          </section>
        );
      })}
      <p class="soluk kucuk">Eşikler: ticaret 20 · saldırmazlık 40 · geçiş, garanti ve ekipman 60 · ittifak 80 (karşı tarafın size görüşü). İzin kabul değildir.</p>
    </div>
  );
}
function GorusBar({ v }: { v: number }) {
  const p = v / 1000;
  return <span class="gorus-bar"><span class={p >= 60 ? 'iyi' : p >= 30 ? 'orta' : 'kotu'} style={{ width: `${p}%` }} /><b>{Math.round(p)}</b>{[20, 40, 60, 80].map((e) => <i style={{ left: `${e}%` }} />)}</span>;
}

// ---------- Araştırma ----------
function Arastirma() {
  const a = useGorunum('arastirma');
  if (!a) return null;
  const yuva = a.yuvalar.map((t: number) => (t >= 0 ? a.teknolojiler[t] : null));
  return (
    <div class="bolumler">
      <section>
        <h3>Yuvalar</h3>
        <p class="soluk">Günlük hız {(a.hiz / 1000).toFixed(2)} puan (bilim bütçesi ve eğitimle artar)</p>
        <ul class="liste">{yuva.map((t: any, i: number) => <li key={i}>{t ? <><span>{t.ad} · {t.kalanGun} gün</span><Bar v={t.yuzde / 100} /></> : <span class="soluk">Boş yuva</span>}</li>)}</ul>
      </section>
      <section>
        <h3>Teknolojiler</h3>
        <ul class="tek-liste">{a.teknolojiler.map((t: any) => (
          <li key={t.i} class={t.bitti ? 'bitti' : !t.uygun ? 'kilit' : ''}>
            <div><strong>{t.ad}</strong> <span class="soluk">{t.yil}</span><br /><span class="kucuk">{t.etki}</span>{t.on.length > 0 && <span class="kucuk soluk"> · ön koşul: {t.on.join(', ')}</span>}</div>
            {t.bitti ? <span class="durum-cip iyi">Bitti</span> : t.arastiriliyor ? <span class="durum-cip orta">%{t.yuzde}</span> : <button disabled={!t.uygun} onClick={() => onizle({ tur: 'arastir', tek: t.i })}>Araştır{t.yuzde > 0 ? ` (%${t.yuzde})` : ''}</button>}
          </li>
        ))}</ul>
      </section>
    </div>
  );
}

// ---------- İstatistik (bölüm 22) ----------
function Istatistik() {
  const [u, setU] = useState(ozet.value?.oyuncu ?? 0);
  const s = useGorunum('istatistik', u);
  return (
    <div class="bolumler">
      <div class="segment">{pkg.ulkeler.map((x, i) => <button class={u === i ? 'acik' : ''} onClick={() => setU(i)}><span class="muhur kucuk-muhur" style={{ background: x.renk }} />{x.kisa}</button>)}</div>
      {s && <>
        {!s.kesin && <p class="soluk kucuk">Yabancı devlet: değerler istihbarat aralığıyla gösterilir (istihbarat {puan(s.istihbarat)}).</p>}
        {s.seri.length > 1 && <section class="seriler">
          <Seri ad="Hazine" v={s.seri.map((x: any) => x.d[0])} />
          <Seri ad="Aylık gelir" v={s.seri.map((x: any) => x.d[1])} />
          <Seri ad="Huzur" v={s.seri.map((x: any) => x.d[2] / 1000)} />
          <Seri ad="Yorgunluk" v={s.seri.map((x: any) => x.d[4] / 1000)} kotu />
          <Seri ad="Asker" v={s.seri.map((x: any) => x.d[6])} />
          <Seri ad="Gıda güvencesi" v={s.seri.map((x: any) => x.d[7] / 10_000)} />
        </section>}
        {s.gruplar.map((g: any) => (
          <section key={g.ad}><h3>{g.ad}</h3><table class="tablo ist"><tbody>{g.satir.map(([a, b]: string[]) => <tr><td>{a}</td><td class="sayi">{b}</td></tr>)}</tbody></table></section>
        ))}
      </>}
    </div>
  );
}
function Seri({ ad, v, kotu }: { ad: string; v: number[]; kotu?: boolean }) {
  const W = 140, H = 36;
  const min = Math.min(...v), max = Math.max(...v);
  const sx = (i: number) => (i / Math.max(1, v.length - 1)) * W;
  const sy = (x: number) => H - 3 - ((x - min) / Math.max(1e-9, max - min)) * (H - 6);
  const d = v.map((x, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(x).toFixed(1)}`).join('');
  const son = v[v.length - 1] ?? 0;
  return (
    <figure class="seri">
      <figcaption><span>{ad}</span><strong>{Math.abs(son) >= 1e4 ? kisalt(son) : son.toFixed(son < 100 ? 1 : 0).replace('.', ',')}</strong></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={`${d}L${W},${H}L0,${H}Z`} class={`alan ${kotu ? 'kotu' : ''}`} />
        <path d={d} class={`cizgi ${kotu ? 'kotu' : ''}`} />
        <circle cx={sx(v.length - 1)} cy={sy(son)} r="2.4" class={`nokta ${kotu ? 'kotu' : ''}`} />
      </svg>
    </figure>
  );
}

// ---------- Kronik ----------
function Kronik() {
  const [hepsi, setHepsi] = useState(false);
  const k = useGorunum('kronik', undefined, { hepsi });
  if (!k) return null;
  return (
    <div class="bolumler">
      <div class="segment"><button class={!hepsi ? 'acik' : ''} onClick={() => setHepsi(false)}>Önemli</button><button class={hepsi ? 'acik' : ''} onClick={() => setHepsi(true)}>Tümü</button></div>
      <ol class="telgraf uzun" reversed>{[...k].reverse().map((a: any, i: number) => <li key={i} class={a.onem >= 3 ? 'onemli' : ''}><span class="t-tarih">{a.tarih}</span> {a.metin}</li>)}</ol>
    </div>
  );
}

// ---------- Kayıt ----------
/** Gömülü önizleme çerçevesinde indirme bağlantıları çalışmaz; APK ve tarayıcıda gösterilir. */
const indirilebilir = (() => { try { return window.top === window || !!(window as any).Capacitor?.isNativePlatform?.(); } catch { return false; } })();
function Kayit() {
  const [liste, setListe] = useState<any[]>([]);
  const [ad, setAd] = useState('');
  const yenile = () => void istemci.istek('saves', null).then(setListe);
  useEffect(yenile, []);
  const disaAktar = async () => {
    const r = await istemci.istek('exportSave', null);
    const blob = new Blob([r.bayt], { type: 'application/octet-stream' });
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        // APK: önbelleğe yaz, Android paylaşım sayfasıyla kaydet/gönder (ek izin gerekmez)
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        const b64 = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] ?? ''); fr.readAsDataURL(blob); });
        const w = await Filesystem.writeFile({ path: r.ad, data: b64, directory: Directory.Cache });
        await Share.share({ title: 'Tarih Strateji kaydı', files: [w.uri] });
        return;
      }
    } catch { /* tarayıcı yolu */ }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = r.ad; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    tost(`Dışa aktarıldı: ${r.ad}`, 'iyi');
  };
  const turler: [string, string][] = [['proje', 'Proje tamamlama'], ['arastirma', 'Araştırma'], ['egitim', 'Birlik hazır'], ['teklif', 'Teklif yanıtı'], ['bolge', 'Bölge el değiştirdi'], ['isyan', 'İsyan']];
  return (
    <div class="bolumler">
      <section>
        <h3>Kaydet</h3>
        <div class="satir-ayar"><label for="kayit-ad" class="gizli">Kayıt adı</label><input id="kayit-ad" value={ad} placeholder="Yuva adı (ör. akdag-savas)" onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
          <span class="dugmeler"><button class="ana" onClick={async () => { await istemci.istek('save', { yuva: ad.trim() || 'manuel' }); tost('Kaydedildi.', 'iyi'); yenile(); }}>Kaydet</button></span></div>
        <div class="dugmeler">{indirilebilir && <button onClick={disaAktar}>Dosyaya aktar (.tsk)</button>}<button onClick={async () => { await istemci.istek('branch', { ad: `dal-${Date.now() % 100000}` }); tost('Yeni dal açıldı.', 'iyi'); yenile(); }}>Bu günden dal aç</button></div>
        <p class="soluk kucuk">Her tur sonunda “otomatik” yuvasına kaydedilir. Kayıtlar nesil dosyası ve A/B başlıkla yazılır; yarım kalan yazım bir önceki nesle döner.</p>
      </section>
      <section>
        <h3>Kayıtlı oyunlar</h3>
        <ul class="liste">{liste.map((k) => (
          <li key={k.yuva}><span><strong>{k.yuva}</strong> · {k.etiket}{k.sandbox ? ' · SANDBOX' : ''} <span class="soluk">nesil {k.nesil}</span></span>
            <span class="dugmeler"><button onClick={async () => { await istemci.istek('load', { yuva: k.yuva }); await tazele(); tost('Yüklendi.', 'iyi'); }}>Yükle</button><button onClick={async () => { setListe(await istemci.istek('deleteSave', k.yuva)); }}>Sil</button></span></li>
        ))}</ul>
      </section>
      <section>
        <h3>Bildirimler</h3>
        <p class="soluk kucuk">Bu türler zamanı durdurmaz. Savaş ilanı, başkent tehdidi, kritik gıda ve zorunlu olaylar sessize alınamaz.</p>
        {turler.map(([k, a]) => <SecimSatiri key={k} ad={a} secenek={['Durdurur', 'Sessiz']} deger={sessiz.value.includes(k) ? 1 : 0} sec={() => sessizDegis(k)} />)}
      </section>
      <section>
        <h3>Tanınmayan komutlar · {taninmayan.value.length}</h3>
        <p class="soluk kucuk">Cihazınızda tutulur; komut kataloğunu büyütmek için dışa aktarılabilir.</p>
        <ul class="liste kucuk">{taninmayan.value.slice(0, 12).map((t) => <li><span>{t.metin}</span><span class="soluk">×{t.sayi}</span></li>)}</ul>
        <div class="dugmeler">{indirilebilir && <button onClick={() => { const b = new Blob([JSON.stringify(taninmayan.value, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'taninmayan-komutlar.json'; a.click(); }}>Günlüğü dışa aktar</button>}
          <button onClick={() => void komutCalistir('yardım')}>Komut örnekleri</button></div>
      </section>
      <section>
        <div class="dugmeler"><button class="tehlike" onClick={() => { ekran.value = 'baslangic'; panel.value = null; }}>Ana menüye dön</button></div>
      </section>
    </div>
  );
}
