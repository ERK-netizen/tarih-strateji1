// Şema 7 emirleri için kalıp ayrıştırıcı: donanma, hava, tabur, siyaset, demografi, ekonomi ayarları, örtülü diplomasi,
// genişletilmiş barış ve teklif türleri. Her emir türünün eşdeğer komut metni (yapiliMetin) buradaki kalıplarla geri çözülür (T123).
import { sozcukler, katla, ekle, type Token } from './turkce.ts';
import type { Katalog, Emir, Yorum } from './index.ts';

export const NUFUS_POL = ['Serbest', 'Doğum teşviki', 'Göç teşviki', 'Göç kısıtlaması'] as const;
const kucukIlk = (s: string): string => s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
const sayiYaz = (x: number): string => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const yuzdeYaz = (o: number): string => `%${Math.floor(o / 10_000)}`;

/** Sözcük eşleşmesi: aynı ya da (yumuşama/ek payı bırakılarak) önekli; kalan en çok 8 harf. */
function uyar(t: string, a: string): boolean {
  if (t === a) return true;
  if (a.length < 3) return false;
  const kok = a.length >= 5 ? a.slice(0, -1) : a;
  return t.startsWith(kok) && t.length - kok.length <= 8;
}
/** Adlar listesinden metinde geçen en uzun adı bulur (sözcük sözcük, ardışık). */
export function adBul(toks: Token[], adlar: readonly string[], ek: readonly (string | undefined)[] = []): number {
  let best = -1, uzun = 0;
  adlar.forEach((ad, i) => {
    for (const aday of [ad, ek[i]]) {
      if (!aday) continue;
      const ws = sozcukler(aday).map((t) => t.k).filter((x) => x.length > 0);
      if (!ws.length) continue;
      const L = ws.join(' ').length;
      if (L <= uzun) continue;
      for (let s = 0; s + ws.length <= toks.length; s++) {
        let ok = true;
        for (let j = 0; j < ws.length; j++) if (!uyar(toks[s + j]!.k, ws[j]!)) { ok = false; break; }
        if (ok) { best = i; uzun = L; break; }
      }
    }
  });
  return best;
}

export interface YVarlik { tur: string; id: number; hal: string; i0: number }
export interface YBaglam { k: Katalog; toks: Token[]; v: YVarlik[]; sayilar: number[]; yuzde?: number; birlikler: () => number[] }

const yorum = (emir: Emir, ozet: string, k: Katalog, guven = 0.9): Yorum => ({ emir, guven, ozet, esdeger: yapiliMetin(emir, k) ?? emir.tur });

/** Kalıp tanınırsa yorumu döndürür; tanınmazsa null (genel ayrıştırıcı devam eder). */
export function yapiliAyristir(c: YBaglam): Yorum | string | null {
  const { k, toks, v, sayilar } = c;
  const f = ` ${toks.map((t) => (t.ek ? `${t.k} ${t.ek}` : t.k)).join(' ')} `;
  const has = (re: RegExp) => re.test(f);
  const P = k.oyuncu;
  const ulke = v.find((x) => x.tur === 'ulke' && x.id !== P);
  // ülke adıyla aynı yazılan bölge (ör. başkent) ülke konumunda bölge sayılmaz; tekrarlar atılır
  const bolgeler = [...new Set(v.filter((x) => x.tur === 'bolge' && !(ulke && x.i0 === ulke.i0 && v.some((y) => y.tur === 'ulke' && y.i0 === x.i0 && y.id === ulke.id))).map((x) => x.id))];
  const bolge = bolgeler[0];
  const yuzde = c.yuzde ?? sayilar[0];
  // ---------- Çok maddeli barış antlaşması ----------
  if (has(/ antlasma/) && ulke) {
    const sayi = (re: RegExp, d: number) => { const m = re.exec(f); return m ? Number(m[1]) : d; };
    const tazminat = sayi(/ tazminat (\d+)/, 0);
    return yorum({ tur: 'antlasma', ulke: P, kime: ulke.id, bolgeler, tazminat, taksitYil: tazminat > 0 ? sayi(/ altin (\d+) yil/, 5) : 5, ateskesYil: sayi(/ ateskes (\d+) yil/, 5), garanti: has(/ garanti/) ? 1 : 0 }, 'çok maddeli antlaşma', k, 0.88);
  }
  // ---------- Komutanlar (şema 9) ----------
  if (k.komutanlar && k.komutanlar.length) {
    const ki = adBul(toks, k.komutanlar.map((x) => x.ad));
    const anahtar = has(/ komutan/);
    if (anahtar && has(/ dagit/)) return yorum({ tur: 'komutanOto', ulke: P }, 'komutanları dağıt', k);
    if (anahtar && has(/ ayir/)) {
      const ids = c.birlikler();
      if (!ids.length) return 'Hangi birlik? Birliği adıyla yazın ya da seçin.';
      return yorum({ tur: 'komutanAta', ulke: P, komutan: -1, birlikler: ids }, 'komutandan ayır', k);
    }
    if (ki >= 0 && (anahtar || has(/ (ata|atansin|ikmal|kurmay) /))) {
      const kom = k.komutanlar[ki]!;
      if (has(/ (kurmay|egitim)/)) return yorum({ tur: 'komutanEgit', ulke: P, komutan: kom.id }, `kurmay eğitimi: ${kom.ad}`, k);
      if (has(/ (ikmal|organizasyon|serbest|savun|taarruz|saldir)/) && !has(/ (olsun|ata|atansin) /)) {
        const emir = has(/ emir savun/) || (!has(/ emir /) && has(/ savun/)) ? 1 : has(/ emir taarruz/) ? 2 : 0;
        // eşikler: "ikmal %70", "organizasyon %50" (her biri kendi sözcüğünün ardındaki yüzde)
        const deger = (re: RegExp) => { const m = re.exec(f); const x = m ? Number(m[1]) : 0; return x > 0 && x <= 100 ? Math.round(x * 10_000) : 0; };
        const ikmalEsik = deger(/ ikmal (?:yuzde )?(\d+)/), orgEsik = deger(/ organizasyon (?:yuzde )?(\d+)/);
        return yorum({ tur: 'komutanEmir', ulke: P, komutan: kom.id, emir, ikmalEsik, orgEsik }, `komutan emri: ${kom.ad}`, k);
      }
      const ids = c.birlikler();
      if (!ids.length) return `${kom.ad} hangi birliklere atanacak? Birlikleri seçin ya da adlarını yazın.`;
      return yorum({ tur: 'komutanAta', ulke: P, komutan: kom.id, birlikler: ids }, `komutan ata: ${kom.ad}`, k);
    }
  }
  // ---------- Donanma ----------
  if (has(/ tersane/) || (has(/ (insa|siparis)/) && k.gemiler && adBul(toks, k.gemiler.map((g) => g.ad), k.gemiler.map((g) => g.kisa)) >= 0 && !has(/ fabrika/))) {
    const s = k.gemiler ? adBul(toks, k.gemiler.map((g) => g.ad), k.gemiler.map((g) => g.kisa)) : -1;
    if (s >= 0) {
      if (bolge === undefined) return 'Tersane bölgesi belirtilmedi (ör. "Kiel tersanesinde 2 muhrip inşa et").';
      return yorum({ tur: 'gemiInsa', ulke: P, sinif: s, adet: Math.max(1, Math.floor(sayilar[0] ?? 1)), bolge }, `tersane: ${k.gemiler![s]!.ad}`, k);
    }
  }
  if (has(/ donanma/) && bolge !== undefined && has(/ (cephe|gonder|sevk)/)) return yorum({ tur: 'donanmaGonder', ulke: P, bolge }, 'donanma cepheye', k);
  if (has(/ donanma/)) {
    if (has(/ liman/)) return yorum({ tur: 'donanmaGorev', ulke: P, gorev: 0 }, 'donanma limanda', k);
    const g = k.denizGorev ? adBul(toks, k.denizGorev) : -1;
    if (g >= 0) return yorum({ tur: 'donanmaGorev', ulke: P, gorev: g }, `donanma: ${k.denizGorev![g]}`, k);
  }
  // ---------- Hava ----------
  if (k.ucaklar?.length && has(/ (filo|ucak)/) && has(/ (siparis|uret)/)) {
    const t = adBul(toks, k.ucaklar.map((h) => h.ad), k.ucaklar.map((h) => h.kisa));
    if (t >= 0) return yorum({ tur: 'ucakUret', ulke: P, tip: t, adet: Math.max(1, Math.floor(sayilar[0] ?? 1)) }, `uçak: ${k.ucaklar[t]!.ad}`, k);
  }
  if (has(/ hava kuvvet/)) {
    if (has(/ (uss|uste|usse|us e)/)) return yorum({ tur: 'havaGorev', ulke: P, gorev: 0, bolge: -1 }, 'hava kuvvetleri üste', k);
    const g = k.havaGorev ? adBul(toks, k.havaGorev) : -1;
    if (g > 0) {
      if (bolge === undefined) return 'Hava görevi için hedef bölge belirtilmedi.';
      return yorum({ tur: 'havaGorev', ulke: P, gorev: g, bolge }, `hava: ${k.havaGorev![g]}`, k);
    }
  }
  // ---------- Tabur düzeni ----------
  if (k.taburlar && has(/ (tabur|boluk)/) && has(/ (ekle|cikar|kaldir)/)) {
    const t = adBul(toks, k.taburlar);
    const ids = c.birlikler();
    if (t >= 0) {
      if (!ids.length) return 'Hangi birlik? Birliği adıyla yazın ya da seçin.';
      if (has(/ (cikar|kaldir)/)) return yorum({ tur: 'taburCikar', ulke: P, birlikler: ids, tabur: t }, `tabur çıkar: ${k.taburlar[t]}`, k);
      return yorum({ tur: 'taburEkle', ulke: P, birlikler: ids, tabur: t, adet: Math.max(1, Math.floor(sayilar[0] ?? 1)) }, `tabur ekle: ${k.taburlar[t]}`, k);
    }
  }
  // ---------- Siyaset ----------
  if (has(/ rejim/) && k.rejimler) {
    const r = adBul(toks, k.rejimler);
    if (r >= 0) return yorum({ tur: 'rejim', ulke: P, rejim: r }, `rejim: ${k.rejimler[r]}`, k);
  }
  if (has(/ erken secim/)) return yorum({ tur: 'secimErken', ulke: P }, 'erken seçim', k);
  if (has(/ destekle/) && k.partiler && !has(/ (darbe|ayrilikci)/)) {
    const p = adBul(toks, k.partiler);
    if (p >= 0) return yorum({ tur: 'partiDestek', ulke: P, parti: p }, `parti: ${k.partiler[p]}`, k);
  }
  if (has(/ (nufus politika|dogum tesvik|goc tesvik|goc kisit)/)) {
    const p = adBul(toks, NUFUS_POL);
    if (p >= 0) return yorum({ tur: 'nufusPol', ulke: P, pol: p }, `nüfus: ${NUFUS_POL[p]}`, k);
  }
  // ---------- Demografi ----------
  // kimlik: tam ad ("Ermeni (Ortodoks)") ya da yalnız kültür adı ("Ermeni")
  const kimlikBul = (r: number): number => { const ad = k.bolgeler[r]?.kimlik; return ad ? adBul(toks, ad, ad.map((a) => a.replace(/\s*\(.*\)$/, ''))) : -1; };
  if (has(/ (surgun|soykirim|asimil)/)) {
    if (bolge === undefined) return 'Bölge belirtilmedi.';
    const ki = kimlikBul(bolge);
    if (ki < 0) return 'Hedef halk bulunamadı (bölgedeki kimlik adını yazın).';
    const tur = has(/ soykirim/) ? 'soykirim' : has(/ surgun/) ? 'surgun' : 'demografi';
    if (tur === 'demografi') return yorum({ tur, ulke: P, bolge, eylem: 1, kimlik: ki }, 'asimilasyon', k);
    return yorum({ tur, ulke: P, bolge, kimlik: ki }, tur === 'surgun' ? 'sürgün' : 'soykırım', k, 0.85);
  }
  if (has(/ iskan/) && bolge !== undefined) return yorum({ tur: 'demografi', ulke: P, bolge, eylem: 2, kimlik: 0 }, 'iskân', k);
  if (has(/ demografi/) && has(/ (kaldir|durdur|bitir)/) && bolge !== undefined) return yorum({ tur: 'demografi', ulke: P, bolge, eylem: 0, kimlik: 0 }, 'demografi politikası kalkar', k);
  // ---------- Ekonomi ayarları ----------
  if (has(/ model/) && k.ekoModeller) {
    const m = adBul(toks, k.ekoModeller);
    if (m >= 0) return yorum({ tur: 'ekoModel', ulke: P, model: m }, `model: ${k.ekoModeller[m]}`, k);
  }
  if (has(/ (gumruk|tarife)/) && yuzde !== undefined) return yorum({ tur: 'tarife', ulke: P, oran: Math.round(yuzde * 10_000) }, 'gümrük tarifesi', k);
  if (has(/ subvansiyon/) && yuzde !== undefined) {
    const alan = has(/ tarim/) ? 0 : has(/ sanayi/) ? 1 : -1;
    if (alan >= 0) return yorum({ tur: 'sub', ulke: P, alan, oran: Math.round(yuzde * 10_000) }, 'sübvansiyon', k);
  }
  if (has(/ (odag|odak)/) && k.tarimOdaklar) {
    const o = adBul(toks, k.tarimOdaklar);
    if (o >= 0) return yorum({ tur: 'tarimOdak', ulke: P, odak: o }, `tarım: ${k.tarimOdaklar[o]}`, k);
  }
  // ---------- Örtülü diplomasi ----------
  if (has(/ ambargo/) && ulke) return yorum({ tur: 'ambargo', ulke: P, kime: ulke.id, acik: has(/ (kaldir|bitir)/) ? 0 : 1 }, 'ambargo', k);
  if (has(/ sinir/) && has(/ olay/) && ulke) return yorum({ tur: 'sinirOlayi', ulke: P, hedef: ulke.id }, 'sınır olayı', k, 0.85);
  if (has(/ yardim/) && ulke && sayilar.length) return yorum({ tur: 'yardim', ulke: P, kime: ulke.id, miktar: Math.floor(sayilar[0]!) }, 'yardım', k);
  if (has(/ (casus|ajan)/) && ulke) return yorum({ tur: 'casusluk', ulke: P, hedef: ulke.id }, 'casusluk', k, 0.85);
  if (has(/ suikast/) && ulke) return yorum({ tur: 'suikast', ulke: P, hedef: ulke.id }, 'suikast', k, 0.85);
  if (has(/ sabotaj/) && bolge !== undefined) return yorum({ tur: 'sabotaj', ulke: P, hedef: k.bolgeler[bolge]!.sahip, bolge }, 'gizli saldırı', k, 0.85);
  if (has(/ isyan/) && has(/ (cikar|kiskirt)/) && ulke) return yorum({ tur: 'isyan', ulke: P, hedef: ulke.id }, 'isyan kışkırtma', k, 0.85);
  if (has(/ iliski/) && has(/ boz/)) {
    const ids = [...new Set(v.filter((x) => x.tur === 'ulke' && x.id !== P).map((x) => x.id))];
    if (ids.length >= 2) return yorum({ tur: 'iliskiBozma', ulke: P, hedef: ids[0]!, hedef2: ids[1]! }, 'ilişki bozma', k, 0.85);
  }
  if (has(/ darbe/) && ulke) return yorum({ tur: 'darbe', ulke: P, hedef: ulke.id }, 'darbe desteği', k, 0.85);
  if (has(/ ayrilikci/) && bolge !== undefined) return yorum({ tur: 'ayrilikci', ulke: P, hedef: k.bolgeler[bolge]!.sahip, bolge }, 'ayrılıkçı desteği', k, 0.85);
  if (has(/ bagimsizlik ilan/) && !has(/ garanti/)) return yorum({ tur: 'bagimsizlik', ulke: P }, 'bağımsızlık', k);
  // ---------- Genişletilmiş barış ve teklifler ----------
  if (ulke && has(/ tam ilhak/)) return yorum({ tur: 'baris', ulke: P, kime: ulke.id, barisTur: 3, bolgeler: [] }, 'tam ilhak', k);
  if (ulke && has(/ kukla devlet/) && k.savastaki.includes(ulke.id)) return yorum({ tur: 'baris', ulke: P, kime: ulke.id, barisTur: 4, bolgeler: bolgeler.filter((r) => k.bolgeler[r]!.sahip === ulke.id) }, 'kukla devlet', k);
  if (ulke && has(/ teslim olma/)) return yorum({ tur: 'baris', ulke: P, kime: ulke.id, barisTur: 5, bolgeler: bolgeler.filter((r) => k.bolgeler[r]!.sahip === P) }, 'teslim önerisi', k);
  if (ulke && has(/ himaye/)) return yorum({ tur: 'teklif', ulke: P, kime: ulke.id, tip: 17 }, 'himaye', k);
  if (ulke && has(/ ultimatom/)) return yorum({ tur: 'teklif', ulke: P, kime: ulke.id, tip: 16, bolgeler: bolgeler.filter((r) => k.bolgeler[r]!.sahip === ulke.id) }, 'ültimatom', k);
  if (ulke && has(/ devral/)) return yorum({ tur: 'teklif', ulke: P, kime: ulke.id, tip: 15, bolgeler: bolgeler.filter((r) => k.bolgeler[r]!.sahip === ulke.id), bedel: Math.floor(sayilar[0] ?? 0) }, 'toprak devri', k);
  return null;
}

/** Şema 7 emirlerinin eşdeğer komut metni; tanımadığı türde null. */
export function yapiliMetin(e: Emir, k: Katalog): string | null {
  const u = (i: unknown) => k.ulkeler[Number(i)]?.kisa ?? '?';
  const b = (i: unknown) => k.bolgeler[Number(i)]?.ad ?? '?';
  const birl = (ids: unknown): string => {
    const a = (ids as number[]) ?? [];
    if (a.length === 1) return k.birlikler.find((x) => x.id === a[0])?.ad ?? 'Birlik';
    return a.map((id) => k.birlikler.find((x) => x.id === id)?.ad ?? '?').join(', ');
  };
  const bs = (r: unknown) => ((r as number[]) ?? []).map(b).join(', ');
  const kAd = (id: unknown) => k.komutanlar?.find((x) => x.id === Number(id))?.ad ?? '?';
  switch (e.tur) {
    case 'komutanAta': return Number(e.komutan) < 0 ? `${birl(e.birlikler)}: komutandan ayır` : `${birl(e.birlikler)}: komutan ${kAd(e.komutan)} olsun`;
    case 'komutanEmir': return `Komutan ${kAd(e.komutan)}: emir ${['serbest', 'savun', 'taarruz'][Number(e.emir)] ?? 'serbest'}${Number(e.ikmalEsik) > 0 ? `, ikmal ${yuzdeYaz(Number(e.ikmalEsik))} altında beklesin` : ''}${Number(e.orgEsik) > 0 ? `, organizasyon ${yuzdeYaz(Number(e.orgEsik))} altında beklesin` : ''}`;
    case 'komutanEgit': return `Komutan ${kAd(e.komutan)} kurmay eğitimi alsın`;
    case 'komutanOto': return 'Komutanları birliklere dağıt';
    case 'antlasma': return `${ekle(u(e.kime), 'yonelme')} antlaşma öner${((e.bolgeler as number[]) ?? []).length ? `: ${bs(e.bolgeler)}` : ''}${Number(e.tazminat) > 0 ? `; tazminat ${Number(e.tazminat)} altın ${Number(e.taksitYil)} yılda` : ''}; ateşkes ${Number(e.ateskesYil)} yıl${Number(e.garanti) ? '; garanti' : ''}`;
    case 'gemiInsa': return `${b(e.bolge)} tersanesinde ${Number(e.adet)} ${kucukIlk(k.gemiler?.[Number(e.sinif)]?.ad ?? '?')} inşa et`;
    case 'ucakUret': return `${Number(e.adet)} filo ${kucukIlk(k.ucaklar?.[Number(e.tip)]?.ad ?? '?')} sipariş et`;
    case 'donanmaGonder': return `Donanma ${b(e.bolge)} cephesine gitsin`;
    case 'donanmaGorev': return Number(e.gorev) === 0 ? 'Donanma limana dönsün' : `Donanma ${kucukIlk(k.denizGorev?.[Number(e.gorev)] ?? '?')} görevine geçsin`;
    case 'havaGorev': return Number(e.gorev) === 0 ? 'Hava kuvvetleri üsse dönsün' : `Hava kuvvetleri ${b(e.bolge)} üzerinde ${kucukIlk(k.havaGorev?.[Number(e.gorev)] ?? '?')} görevine geçsin`;
    case 'taburEkle': return `${birl(e.birlikler)}: ${Number(e.adet ?? 1)} ${kucukIlk(k.taburlar?.[Number(e.tabur)] ?? '?')} ekle`;
    case 'taburCikar': return `${birl(e.birlikler)}: ${kucukIlk(k.taburlar?.[Number(e.tabur)] ?? '?')} çıkar`;
    case 'rejim': return `Rejimi ${kucukIlk(k.rejimler?.[Number(e.rejim)] ?? '?')} olarak değiştir`;
    case 'partiDestek': return `${k.partiler?.[Number(e.parti)] ?? '?'} partisini destekle`;
    case 'secimErken': return 'Erken seçime git';
    case 'nufusPol': return `Nüfus politikası: ${kucukIlk(NUFUS_POL[Number(e.pol)] ?? '?')}`;
    case 'demografi': {
      const ey = Number(e.eylem);
      if (ey === 0) return `${b(e.bolge)} bölgesinde demografi politikasını kaldır`;
      if (ey === 2) return `${b(e.bolge)} bölgesine iskân başlat`;
      return `${b(e.bolge)} bölgesindeki ${k.bolgeler[Number(e.bolge)]?.kimlik?.[Number(e.kimlik)] ?? '?'} halkını asimile et`;
    }
    case 'surgun': return `${b(e.bolge)} bölgesindeki ${k.bolgeler[Number(e.bolge)]?.kimlik?.[Number(e.kimlik)] ?? '?'} halkını sürgün et`;
    case 'soykirim': return `${b(e.bolge)} bölgesindeki ${k.bolgeler[Number(e.bolge)]?.kimlik?.[Number(e.kimlik)] ?? '?'} halkına soykırım uygula`;
    case 'ekoModel': return `Ekonomi modelini ${kucukIlk(k.ekoModeller?.[Number(e.model)] ?? '?')} yap`;
    case 'tarife': return `Gümrük tarifesini ${yuzdeYaz(Number(e.oran))} yap`;
    case 'sub': return `${Number(e.alan) === 0 ? 'Tarım' : 'Sanayi'} sübvansiyonunu ${yuzdeYaz(Number(e.oran))} yap`;
    case 'tarimOdak': return `Tarım odağını ${kucukIlk(k.tarimOdaklar?.[Number(e.odak)] ?? '?')} yap`;
    case 'ambargo': return Number(e.acik ?? 1) ? `${ekle(u(e.kime), 'yonelme')} ambargo uygula` : `${u(e.kime)} ambargosunu kaldır`;
    case 'sinirOlayi': return `${ekle(u(e.hedef), 'ilgi')} sınırında olay çıkar`;
    case 'yardim': return `${ekle(u(e.kime), 'yonelme')} ${sayiYaz(Number(e.miktar))} altın yardım gönder`;
    case 'casusluk': return `${ekle(u(e.hedef), 'yonelme')} casus gönder`;
    case 'suikast': return `${ekle(u(e.hedef), 'ilgi')} lideri için suikast düzenle`;
    case 'sabotaj': return `${b(e.bolge)} bölgesinde sabotaj düzenle`;
    case 'isyan': return `${ekle(u(e.hedef), 'bulunma')} isyan çıkar`;
    case 'iliskiBozma': return `${u(e.hedef)} ile ${u(e.hedef2)} ilişkisini boz`;
    case 'darbe': return `${ekle(u(e.hedef), 'bulunma')} darbeyi destekle`;
    case 'ayrilikci': return `${b(e.bolge)} ayrılıkçılarını destekle`;
    case 'bagimsizlik': return 'Bağımsızlık ilan et';
    case 'baris': {
      const t = Number(e.barisTur);
      if (t === 3) return `${ekle(u(e.kime), 'yonelme')} tam ilhak öner`;
      if (t === 4) return `${ekle(u(e.kime), 'yonelme')} kukla devlet öner${((e.bolgeler as number[]) ?? []).length ? ` (${bs(e.bolgeler)} ilhakıyla)` : ''}`;
      if (t === 5) return `${ekle(u(e.kime), 'yonelme')} teslim olmayı öner${((e.bolgeler as number[]) ?? []).length ? ` (${bs(e.bolgeler)} bırakılır)` : ''}`;
      return null;
    }
    case 'teklif': {
      const t = Number(e.tip);
      if (t === 15) return `${ekle(u(e.kime), 'ayrilma')} ${bs(e.bolgeler)} bölgelerini ${sayiYaz(Number(e.bedel ?? 0))} altına devral`;
      if (t === 16) return `${ekle(u(e.kime), 'yonelme')} ültimatom ver: ${bs(e.bolgeler)}`;
      if (t === 17) return `${ekle(u(e.kime), 'yonelme')} himaye antlaşması öner`;
      return null;
    }
  }
  return null;
}
void katla;
