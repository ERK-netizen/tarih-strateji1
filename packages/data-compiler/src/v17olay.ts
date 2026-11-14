// v1.7 R2 tasarım verisi → paket biçimi (adaptör). Kaynak: veri/v17/*.json (docs/v17/tasarim/veri ile aynı).
// Olay seçeneklerinin etkileri tasarımın "tradeoffs" ve "intentTag" alanlarından türetilir; tarih sonucu dayatılmaz:
// hiçbir seçenek savaş ilan etmez, bölge devretmez. Etkiler küçük, bedelli ve süreli değiştiricilerdir.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { OlayTanim } from './senaryo.ts';
import type { PaketHedef } from '../../engine/src/paket.ts';

const aydinlik = join(dirname(fileURLToPath(import.meta.url)), 'veri/v17');
const oku = <T>(ad: string): T => JSON.parse(readFileSync(join(aydinlik, ad), 'utf8')) as T;

interface TasarimOlay {
  id: string; eventKey: string; country: string; titleTr: string; dateWindow: { start: string; end: string };
  conditionsAll: { type: string; country?: string; value?: string }[]; blockIfFlag: string[];
  options: { id: string; titleTr: string; effects: { intentTag: string }[]; tradeoffs: string[]; aiAffinityFixed: number }[];
  cooldownDays: number;
}
/** Tasarım olaylarının karşı tarafları (ilişki etkisi için): tasarım verisinde yok, geliştirici girdisidir. */
const KARSI: Record<string, string[]> = {
  saraybosna_krizi: ['SRB'], sirbistan_yaniti: ['AUH', 'RUS'], avusturya_karar: ['SRB'], rusya_garanti: ['AUH'], almanya_ittifak_krizi: ['AUH', 'RUS'],
  fransa_seferberlik: ['GER'], belcika_gecis: ['BEL', 'GBR'], belcika_guvence: ['GER', 'GBR'], ingiltere_kita_karari: ['GER', 'FRA'], italya_tarafsizligi: ['AUH', 'GER'],
  osmanli_ittifak: ['GER', 'RUS'], goeben_krizi: ['GBR', 'GER'], karadeniz_harekati: ['RUS'], japonya_pasifik: ['GBR', 'GER'], rus_demiryolu: ['GER'],
  munimmat_acigi: [], muhimmat_fransa: ['GBR'], sivil_gida_krizi: [], britanya_konvoy: ['GER'], 'italya_koşullu_teklif': ['AUH', 'FRA'],
  canakkale_karar: ['OSM'], osmanli_savunma: ['GBR'], bulgaristan_pazarligi: ['SRB', 'OSM'], romanya_pazarligi: ['AUH', 'RUS'], ortak_baris_konferansi: ['GER'],
  denizalti_ticaret: ['GBR', 'USA'], italya_cephe_lojistik: ['AUH'], 'batı_cephe_yipratma': ['GER'], kafkas_ikmal_krizi: ['RUS'], avusturya_ic_reform: [],
  romanya_katilim: ['AUH'], rusya_1917_krizi: ['GER'], abd_deniz_krizi: ['GER'], abd_1917_secim: ['GER'], genel_ateskes: ['FRA', 'GBR'], savas_sonrasi_duzen: ['FRA', 'USA'],
};
/** Seçenek türüne göre ölçek: görüşme en hafif, siyaset (seferberlik/ilan düzeyi) en ağır. */
const OLCEK: Record<string, { gerg: number; goru: number; sav: number; uret: number; huzur: number; yorg: number; destek: number }> = {
  negotiation: { gerg: -5, goru: 6, sav: 0, uret: 0, huzur: 0, yorg: 0, destek: 0 },
  military_preparation: { gerg: 8, goru: -4, sav: 5, uret: 3, huzur: -1, yorg: 0, destek: 3 },
  policy_choice: { gerg: 15, goru: -8, sav: 8, uret: 8, huzur: -4, yorg: 2, destek: 5 },
};
const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const gunFark = (a: string, b: string): number => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000));

export function v17Olaylar(kodlar: ReadonlySet<string>): OlayTanim[] {
  const veri = oku<{ events: TasarimOlay[] }>('1914_olay_aglari.json');
  const hepsi = new Set(veri.events.map((e) => e.eventKey));
  return veri.events.map((o) => {
    const karsi = (KARSI[o.eventKey] ?? []).filter((k) => kodlar.has(k) && k !== o.country);
    const kosul: NonNullable<OlayTanim['kosul']> = { bayrakDegil: [`v17:${o.eventKey}`] };
    for (const c of o.conditionsAll) {
      if (c.type === 'country_active') continue;
      if (c.type === 'flag_active') { if (!hepsi.has(c.value!)) throw new Error(`v17 olay ${o.eventKey}: bayrak olayı yok: ${c.value}`); (kosul.bayrak ??= []).push(`v17:${c.value}`); }
      else if (c.type === 'crisis_active') (kosul.bayrak ??= []).push('v17:saraybosna_krizi'); // Avrupa krizi Saraybosna tutumuyla başlar
      else if (c.type === 'is_at_war') { const [a, b] = c.value!.split(':') as [string, string]; kosul.savasta = [a, b]; }
      else if (c.type === 'war_status') kosul.savastaMi = o.country;
      else throw new Error(`v17 olay ${o.eventKey}: bilinmeyen koşul ${c.type}`);
    }
    // saraybosna_krizi kendi bayrağını koyar; krizi bekleyen olaylar o bayrağa bağlıdır (kendisi için bayrak koşulu eklenmez)
    if (o.eventKey === 'saraybosna_krizi') kosul.bayrak = undefined;
    const s = o.dateWindow.start, e = o.dateWindow.end;
    return {
      kod: `v17_${o.eventKey}`, tarih: s, ulke: o.country, baslik: `${o.titleTr} — stratejik tutum`,
      metin: `${o.titleTr}: ${o.country} için kriz tutumunu belirleyin (${Number(s.slice(8))} ${AY[Number(s.slice(5, 7)) - 1]} ${s.slice(0, 4)}'ten ${e.slice(0, 4)}'e kadar geçerli). `
        + `Seçenekler siyasi sermaye, savaş riski ve itibar bedeli taşır; tarih bu sonucu dayatmaz.${karsi.length ? ` İlgili devletler: ${karsi.join(', ')}.` : ''}`,
      kosul, pencere: gunFark(s, e), olasilik: 100,
      sec: o.options.map((p) => {
        const tur = p.effects[0]!.intentTag;
        const k = OLCEK[tur];
        if (!k) throw new Error(`v17 olay ${o.eventKey}: bilinmeyen niyet ${tur}`);
        const ef: (string | number | boolean)[][] = [['bayrak', `v17:${o.eventKey}`]];
        // bedeller (tradeoffs): bütçe → siyasi sermaye, itibar → meşruiyet, savaş_riski → gerginlik ve karşı taraf ilişkisi
        if (p.tradeoffs.includes('bütçe')) ef.push(['pg', o.country, -10]);
        if (p.tradeoffs.includes('itibar')) ef.push(['mesru', o.country, -3]);
        if (k.gerg !== 0) ef.push(['gerginlik', o.country, k.gerg]);
        for (const c of karsi) if (k.goru !== 0) ef.push(['gorus', c, o.country, k.goru, true]);
        // kazanımlar: süreli ve sınırlı değiştiriciler
        if (k.sav) { ef.push(['etki', o.country, 'saldiri', k.sav, 60]); ef.push(['etki', o.country, 'savunma', k.sav, 60]); }
        if (k.uret) ef.push(['etki', o.country, 'uretim', k.uret, 90]);
        if (k.huzur) ef.push(['huzur', o.country, k.huzur]);
        if (k.yorg) ef.push(['yorgunluk', o.country, k.yorg]);
        if (k.destek) ef.push(['destek', o.country, k.destek]);
        const ozet = tur === 'negotiation' ? 'İlişkiler iyileşir, gerginlik düşer; itibar ve siyasi sermaye bedeli.'
          : tur === 'military_preparation' ? 'Birliklere 60 gün saldırı/savunma, 90 gün üretim desteği; gerginlik artar, ilişkiler soğur.'
            : 'Büyük askerî ve sanayi hamlesi: 90 gün üretim +%8; gerginlik, yorgunluk ve huzur bedeli ağır.';
        return { ad: p.titleTr, etki: ozet, yz: Math.max(1, Math.round(p.aiAffinityFixed / 10_000)), e: ef };
      }),
    } satisfies OlayTanim;
  });
}

interface TasarimHedef {
  id: string; country: string; titleTr: string; category: string; priorityWeight: number;
  success: { metric: string; value: number }[]; stages: { id: string; completionThreshold: number }[];
  alternatePaths: { titleTr: string; costs: string[] }[];
}
/** 1914 ulusal hedefleri (64). Ülke kodu → paket hedef listesi; ülke dizinine çevirme derleyicide yapılır. */
export function v17Hedefler(ulkeIdx: (kod: string) => number): PaketHedef[] {
  const veri = oku<{ goals: TasarimHedef[] }>('1914_ulusal_hedefler.json');
  return veri.goals.map((g) => ({
    kod: g.id, ulke: ulkeIdx(g.country), ad: g.titleTr, kat: g.category, agirlik: g.priorityWeight,
    metrik: g.success[0]!.metric, esik: g.success[0]!.value, asamalar: g.stages.map((s) => s.completionThreshold), yollar: g.alternatePaths.map((p) => `${p.titleTr} (bedel: ${p.costs.join(', ')})`),
  }));
}
