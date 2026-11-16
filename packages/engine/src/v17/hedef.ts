/**
 * v1.7 ulusal hedefler (G01). Her hedef bir ölçüte bağlıdır; ölçütler 0..S aralığında, oyuncunun kendi devletinin
 * gerçek durumundan hesaplanır (hayali sayaç yoktur). İlerleme, ölçütün 120 günlük üstel ortalamasıdır: bir kerelik
 * iyi durum hedefi tamamlamaz, sürdürülen performans tamamlar. Tarihî sonuç dayatılmaz; hedef yalnız ölçer ve ödüllendirir.
 */
import type { World } from '../state/world.ts';
import { S } from '../num/index.ts';
import { A } from '../state/world.ts';
import {
  uc,
  savasta,
  savastaMi,
  birlikIkmal,
  birlikIstat,
  efendi,
  iddiaVar,
  gorus,
  anlat,
  pasif,
  ulkeBolgeleri,
  anlasmaVar,
} from '../systems/ortak.ts';
import { ulkeGidaGuvence } from '../systems/ekonomi.ts';
import { nextV17Id, type V17State, type V17Goal } from './state.ts';

const clamp = (x: number) => (x < 0 ? 0 : x > S ? S : Math.trunc(x));
const bolu = (a: number, b: number) => (b <= 0 ? 0 : clamp(Math.floor((a * S) / b)));
const kodIdx = (w: World, kod: string) => w.pkg.ulkeler.findIndex((u) => u.kod === kod);
const ortala = (l: number[]) => (l.length ? Math.floor(l.reduce((a, b) => a + b, 0) / l.length) : 0);

/** Bir ülke için değerlendirme sırasında bir kez hesaplanan ortak okumalar (tembel). */
class Okuma {
  private o = new Map<string, number>();
  readonly w: World;
  readonly c: number;
  constructor(w: World, c: number) {
    this.w = w;
    this.c = c;
  }
  private al(k: string, f: () => number): number {
    let v = this.o.get(k);
    if (v === undefined) {
      v = f();
      this.o.set(k, v);
    }
    return v;
  }
  get huzur() {
    return this.al('huzur', () => bolu(this.w.C.c.huzur[this.c]!, 100_000));
  }
  get mesru() {
    return this.al('mesru', () => bolu(this.w.C.c.mesru[this.c]!, 100_000));
  }
  get istikrar() {
    return this.al('ist', () => Math.floor((this.huzur + this.mesru) / 2));
  }
  get yorgunluk() {
    return this.al('yor', () => bolu(this.w.C.c.yorgunluk[this.c]!, 100_000));
  }
  get gida() {
    return this.al('gida', () => clamp(ulkeGidaGuvence(this.w, this.c)));
  }
  get runway() {
    return this.al('run', () => {
      const C = this.w.C.c;
      if (C.hazine[this.c]! <= 0) return 0;
      const g = Math.max(1, C.giderDun[this.c]!);
      return clamp(Math.floor(((C.hazine[this.c]! / g) * S) / 180));
    });
  }
  /** Anayurt bölgelerinin ne kadarı hem sahip hem kontrolde. */
  homeland(kod?: number): number {
    const c = kod ?? this.c;
    return this.al(`home${c}`, () => {
      const R = this.w.R.c;
      let n = 0,
        t = 0;
      for (let r = 0; r < this.w.nR; r++) {
        if (!this.w.pkg.bolgeler[r]!.anaYurt.includes(c)) continue;
        t++;
        if (R.sahip[r] === c && R.kontrolEden[r] === c) n++;
      }
      return bolu(n, t);
    });
  }
  private birlikler() {
    return this.w.U.list().filter((u) => uc(this.w).ulke![u] === this.c);
  }
  /** Birlik ortalamaları: ikmal (gıda/mühimmat) ve hazırlık (organizasyon × ikmal). cephe=true: düşmana komşu birlikler. */
  ikmal(alan: 'gida' | 'muh' | 'oran', cephe = false): number {
    return this.al(`ik${alan}${cephe}`, () => {
      const w = this.w,
        U = uc(w),
        R = w.R.c;
      let l = this.birlikler();
      if (cephe) {
        const f = l.filter((u) => w.komsuluk[U.bolge![u]!]!.some((q) => savasta(w, this.c, R.kontrolEden[q]!)));
        if (f.length) l = f;
      }
      return l.length ? ortala(l.map((u) => birlikIkmal(w, u)[alan])) : S;
    });
  }
  get hazirlik() {
    return this.al('haz', () => {
      const w = this.w,
        U = uc(w);
      const l = this.birlikler();
      return l.length
        ? ortala(
            l.map((u) => {
              const m = birlikIstat(w, u).orgMax;
              return Math.min(bolu(U.org![u]!, m), birlikIkmal(w, u).oran);
            }),
          )
        : 0;
    });
  }
  get demiryolu() {
    return this.al('ray', () => {
      const R = this.w.R.c;
      const l = ulkeBolgeleri(this.w, this.c, true);
      return l.length ? bolu(l.filter((r) => R.demiryolu[r]! >= 1).length, l.length) : 0;
    });
  }
  get ticaret() {
    return this.al('tic', () => clamp(S - this.w.C.c.abluka[this.c]! - this.w.C.c.akinKayip[this.c]!));
  }
  get hasarTers() {
    return this.al('has', () => {
      const R = this.w.R.c;
      const l = ulkeBolgeleri(this.w, this.c, true).filter((r) => R.sivilF[r]! + R.askeriF[r]! > 0);
      return l.length ? clamp(S - ortala(l.map((r) => R.hasar[r]!))) : S;
    });
  }
  /** Anayurtta düşman birliği bulunan bölgelerin payının tersi. */
  get sinir() {
    return this.al('sin', () => {
      const w = this.w,
        U = uc(w);
      const l = ulkeBolgeleri(w, this.c, true);
      if (!l.length) return 0;
      const isg = new Set<number>();
      for (const u of w.U.list()) {
        const d = U.ulke![u]!;
        if (d !== this.c && savasta(w, this.c, d)) isg.add(U.bolge![u]!);
      }
      return clamp(S - bolu(l.filter((r) => isg.has(r)).length, l.length));
    });
  }
  get savasta() {
    return savastaMi(this.w, this.c);
  }
  barisIle(kod: string) {
    const d = kodIdx(this.w, kod);
    return d < 0 || !savasta(this.w, this.c, d) ? S : 0;
  }
  gorusOrt(l: number[]) {
    const g = l.filter((d) => d !== this.c && d >= 0);
    return g.length ? bolu(ortala(g.map((d) => gorus(this.w, this.c, d))), 100_000) : 500_000;
  }
  get dostlar() {
    return this.w.pkg.ulkeler.map((_, d) => d).filter((d) => d !== this.c && anlasmaVar(this.w, A.ittifak, this.c, d) > 0);
  }
  /** İddia edilen bölgelerin ne kadarı kontrolümüzde (iddia yoksa anayurt bütünlüğü). */
  get talep() {
    return this.al('tal', () => {
      const w = this.w,
        R = w.R.c;
      let n = 0,
        t = 0;
      for (let r = 0; r < w.nR; r++) {
        if (!iddiaVar(w, r, this.c)) continue;
        t++;
        if (R.kontrolEden[r] === this.c) n++;
      }
      return t ? bolu(n, t) : this.homeland();
    });
  }
  bolgeAdlari(adlar: string[]) {
    const w = this.w,
      R = w.R.c;
    const l = adlar.map((a) => w.pkg.bolgeler.findIndex((b) => b.ad === a)).filter((r) => r >= 0);
    return l.length ? bolu(l.filter((r) => R.kontrolEden[r] === this.c).length, l.length) : this.homeland();
  }
}

const TEMEL = (k: Okuma) => k.istikrar;
/** Ölçüt adı → 0..S. Adlar tasarım verisindeki 40 ölçüttür; açıklama arayüzde gösterilir. */
export const OLCUTLER: Record<string, { ad: string; f: (k: Okuma) => number }> = {
  fronts_supplied: { ad: 'Cephe ikmal oranı', f: (k) => k.ikmal('oran', true) },
  front_supply_days: { ad: 'Cephe ikmal oranı', f: (k) => k.ikmal('oran', true) },
  army_supply_days: { ad: 'Ordu ikmali (gıda ve mühimmat)', f: (k) => Math.floor((k.ikmal('gida') + k.ikmal('muh')) / 2) },
  ammo_supply_days: { ad: 'Mühimmat ikmali', f: (k) => k.ikmal('muh') },
  artillery_ammo_days: { ad: 'Mühimmat ikmali', f: (k) => k.ikmal('muh') },
  fuel_days_supply: {
    ad: 'Yakıt stoku (petrol ihtiyacının 90 günü)',
    f: (k) => {
      const C = k.w.C.c;
      return C.petrolIht[k.c]! <= 0 ? S : bolu(C.petrol[k.c]!, C.petrolIht[k.c]! * 90);
    },
  },
  overseas_supply_days: { ad: 'Denizaşırı ikmal (ikmal × deniz yolu güvenliği)', f: (k) => Math.floor((k.ikmal('oran') * k.ticaret) / S) },
  army_readiness: { ad: 'Ordu hazırlığı (organizasyon × ikmal)', f: (k) => k.hazirlik },
  defensive_readiness: { ad: 'Savunma hazırlığı (organizasyon × ikmal)', f: (k) => k.hazirlik },
  rail_mobilization_ready: { ad: 'Demiryolu ve seferberlik hazırlığı', f: (k) => Math.floor((k.demiryolu + k.hazirlik) / 2) },
  border_security: {
    ad: 'Sınır güvenliği (anayurt kontrolü ve düşmansız bölgeler)',
    f: (k) => Math.floor((k.homeland() * 6 + k.sinir * 4) / 10),
  },
  controlled_homeland: { ad: 'Anayurdun kontrol altındaki payı', f: (k) => k.homeland() },
  national_sovereignty: {
    ad: 'Egemenlik (anayurt kontrolü, kukla olmamak)',
    f: (k) => (efendi(k.w, k.c) < 0 ? k.homeland() : Math.floor((k.homeland() * 4) / 10)),
  },
  straits_security: {
    ad: 'Boğaz ve başkent bölgelerinin kontrolü',
    f: (k) => k.bolgeAdlari(['İstanbul', 'Çanakkale', 'Gelibolu', 'Edirne']),
  },
  belgian_security: {
    ad: 'Belçika’nın anayurt kontrolü',
    f: (k) => {
      const b = kodIdx(k.w, 'BEL');
      return b < 0 || pasif(k.w, b) ? 0 : k.homeland(b);
    },
  },
  serbia_security: {
    ad: 'Sırbistan’ın anayurt kontrolü',
    f: (k) => {
      const b = kodIdx(k.w, 'SRB');
      return b < 0 || pasif(k.w, b) ? 0 : k.homeland(b);
    },
  },
  serbia_crisis_resolution: {
    ad: 'Sırbistan krizinin çözümü (savaşta işgal, barışta ilişki)',
    f: (k) => {
      const b = kodIdx(k.w, 'SRB');
      if (b < 0) return S;
      if (savasta(k.w, k.c, b)) {
        const R = k.w.R.c;
        let n = 0,
          t = 0;
        for (let r = 0; r < k.w.nR; r++) {
          if (!k.w.pkg.bolgeler[r]!.anaYurt.includes(b)) continue;
          t++;
          if (R.kontrolEden[r] === k.c) n++;
        }
        return Math.floor((bolu(n, t) * 8) / 10);
      }
      return Math.floor(500_000 + gorus(k.w, k.c, b) * 5);
    },
  },
  crisis_resolution: { ad: 'Krizin barışla çözümü', f: (k) => Math.floor((k.barisIle('AUH') * 7 + k.istikrar * 3) / 10) },
  peace_with_GBR_days: { ad: 'Britanya ile barış', f: (k) => k.barisIle('GBR') },
  alliance_trust: { ad: 'Müttefik güveni (ittifak ortaklarının görüşü)', f: (k) => k.gorusOrt(k.dostlar) },
  alliance_policy: { ad: 'Müttefik güveni (ittifak ortaklarının görüşü)', f: (k) => k.gorusOrt(k.dostlar) },
  neutrality_commitment: {
    ad: 'Net duruş (ittifak ya da tarafsızlık) ve istikrar',
    f: (k) => Math.floor((k.istikrar + (k.dostlar.length > 0 || !k.savasta ? S : 300_000)) / 2),
  },
  neutrality_security: {
    ad: 'Tarafsızlığın güvenliği (barış ve sınır güvenliği)',
    f: (k) => (k.savasta ? Math.floor((k.homeland() * 2) / 10) : Math.floor(600_000 + (k.sinir * 4) / 10)),
  },
  war_choice_fulfilled: {
    ad: 'Savaş tercihi (barış ve büyük devletlerle ilişki)',
    f: (k) => Math.floor(((k.savasta ? 500_000 : S) + k.gorusOrt(['GER', 'GBR', 'FRA', 'AUH'].map((x) => kodIdx(k.w, x)))) / 2),
  },
  war_goal_progress: {
    ad: 'Savaş hedefi (anayurt ve işgal edilen düşman toprağı)',
    f: (k) => {
      if (!k.savasta) return k.homeland();
      const w = k.w,
        R = w.R.c;
      let isg = 0;
      for (let r = 0; r < w.nR; r++) if (R.kontrolEden[r] === k.c && R.sahip[r] !== k.c && savasta(w, k.c, R.sahip[r]!)) isg++;
      return Math.floor((k.homeland() * 5) / 10) + Math.floor((bolu(isg, 20) * 5) / 10);
    },
  },
  war_risk_management: { ad: 'Savaş riski yönetimi (gerginlik düşüklüğü)', f: (k) => clamp(S - bolu(k.w.C.c.gerginlik[k.c]!, 100_000)) },
  war_policy_stability: { ad: 'Savaş politikası istikrarı', f: (k) => Math.floor((k.istikrar * (S - k.yorgunluk)) / S) },
  war_fatigue_inverse: { ad: 'Savaş yorgunluğunun azlığı', f: (k) => clamp(S - k.yorgunluk) },
  territorial_claim_progress: { ad: 'Toprak talepleri (iddia edilen bölgelerin kontrolü)', f: (k) => k.talep },
  treaty_claim_progress: { ad: 'Toprak talepleri (iddia edilen bölgelerin kontrolü)', f: (k) => k.talep },
  political_stability: { ad: 'Siyasi istikrar (huzur ve meşruiyet)', f: TEMEL },
  stability_and_food: { ad: 'İstikrar ve gıda güvencesi (düşük olan)', f: (k) => Math.min(k.istikrar, k.gida) },
  treasury_runway: { ad: 'Hazine dayanıklılığı (180 günlük gider = tam)', f: (k) => k.runway },
  treasury_and_rail: { ad: 'Hazine ve demiryolu', f: (k) => Math.floor((k.runway + k.demiryolu) / 2) },
  industrial_damage_inverse: { ad: 'Sanayi tesislerinin sağlamlığı', f: (k) => k.hasarTers },
  industry_supply: {
    ad: 'Sanayi ve hammadde (tesis sağlamlığı, çelik stoku)',
    f: (k) => {
      const C = k.w.C.c;
      return Math.floor((k.hasarTers + bolu(C.celik[k.c]!, Math.max(1, C.celikDun[k.c]! * 30))) / 2);
    },
  },
  convoy_security: { ad: 'Deniz yolu güvenliği (abluka ve akın kaybı yok)', f: (k) => k.ticaret },
  naval_security: { ad: 'Deniz yolu güvenliği (abluka ve akın kaybı yok)', f: (k) => k.ticaret },
  trade_throughput: {
    ad: 'Ticaret hacmi (deniz yolu güvenliği × istikrar)',
    f: (k) => Math.floor((k.ticaret * (500_000 + k.istikrar / 2)) / S),
  },
  resource_exports: {
    ad: 'Hammadde üretimi (çelik ve kömür günlük üretimi)',
    f: (k) => {
      const C = k.w.C.c;
      return bolu(C.celikDun[k.c]! + C.komurDun[k.c]!, C.celikDun[k.c]! + C.komurDun[k.c]! + 20_000);
    },
  },
};

/** Oyuncu için hedefleri kurar: paketteki tasarım hedefleri varsa onlar, yoksa genel dört hedef. */
export function kurHedefler(w: World, s: V17State, c: number): void {
  s.goals = [];
  if (c < 0 || c >= w.nC || pasif(w, c)) return;
  const tasarim = (w.pkg.hedefler ?? []).filter((h) => h.ulke === c);
  const yeni = (g: Omit<V17Goal, 'id' | 'stage' | 'progress' | 'value' | 'status' | 'completedDay'>) =>
    s.goals.push({ ...g, id: nextV17Id(s), stage: 0, progress: 0, value: 0, status: 'active', completedDay: -1 });
  if (tasarim.length) {
    for (const h of tasarim) {
      if (!OLCUTLER[h.metrik]) throw Error(`v17 hedef ölçütü yok: ${h.metrik}`);
      yeni({
        country: c,
        code: h.kod,
        label: h.ad,
        category: h.kat,
        weight: h.agirlik,
        metric: h.metrik,
        threshold: h.esik,
        stages: [...h.asamalar],
        paths: [...h.yollar],
      });
    }
    return;
  }
  const genel: [string, string, string, string, number][] = [
    ['GEN_STABIL', 'Devleti ayakta ve istikrarlı tut', 'politics', 'political_stability', 80],
    ['GEN_HAZINE', 'Hazineyi dayanıklı tut', 'industry', 'treasury_runway', 70],
    ['GEN_TOPRAK', 'Anayurdu elde tut', 'security', 'controlled_homeland', 90],
    ['GEN_BARIS', 'Savaş yorgunluğunu düşük tut', 'war', 'war_fatigue_inverse', 60],
  ];
  for (const [kod, ad, kat, metrik, agirlik] of genel)
    yeni({
      country: c,
      code: `${w.pkg.ulkeler[c]!.kod}_${kod}`,
      label: ad,
      category: kat,
      weight: agirlik,
      metric: metrik,
      threshold: 700_000,
      stages: [250_000, 550_000, 700_000],
      paths: [],
    });
}

/** Haftalık değerlendirme (P11'den çağrılır): ölçüt → yumuşatılmış ilerleme → aşama/tamamlanma. Ülke yok olduysa hedef başarısızdır. */
export function guncelleHedefler(w: World, s: V17State): void {
  if (s.stats.goalDay >= 0 && w.gun - s.stats.goalDay < 7) return;
  // ilk değerlendirme yalnız ölçer (geçmiş süre yok); sonrakilerde geçen gün kadar (en çok 30) ilerler
  const adim = s.stats.goalDay < 0 ? 0 : Math.min(30, w.gun - s.stats.goalDay);
  s.stats.goalDay = w.gun;
  const okumalar = new Map<number, Okuma>();
  for (const g of s.goals) {
    if (g.status !== 'active') continue;
    if (pasif(w, g.country) || ulkeBolgeleri(w, g.country, false).length === 0) {
      g.status = 'failed';
      g.completedDay = w.gun;
      anlat(w, `Ulusal hedef kaybedildi: ${g.label}.`, 'hedef', g.country, 2);
      continue;
    }
    let k = okumalar.get(g.country);
    if (!k) {
      k = new Okuma(w, g.country);
      okumalar.set(g.country, k);
    }
    g.value = clamp(OLCUTLER[g.metric]!.f(k));
    g.progress = clamp(g.progress + Math.trunc(((g.value - g.progress) * adim) / 120));
    const yeni = g.stages.filter((e) => g.progress >= e).length;
    if (yeni > g.stage) {
      g.stage = yeni;
      if (g.progress >= g.threshold) {
        g.status = 'completed';
        g.completedDay = w.gun;
        s.stats.goalScore += g.weight;
        anlat(w, `Ulusal hedef tamamlandı: ${g.label} (+${g.weight} hedef puanı).`, 'hedef', g.country, 3);
      } else anlat(w, `Ulusal hedefte ilerleme: ${g.label} (aşama ${yeni}/${g.stages.length}).`, 'hedef', g.country, 2);
    }
  }
}

/** Ölçüt başına oyuncuya önerilen eylem (danışman metni; mevcut emir türlerine yönlendirir). */
const IKMAL =
  'Mühimmat ve gıda üretimini artırın, cepheye giden demiryolunu güçlendirin (inşa) ve ikmali bitmiş birliklerin hattını kısaltın.';
const ISTIKRAR =
  'Huzuru ve meşruiyeti yükseltin: vergiyi düşürün, sosyal ve eğitim bütçesini artırın, savaş yorgunluğu yüksekse barış yollarını deneyin.';
const GUVENLIK = 'Sınır bölgelerine savunma planı verin, tahkimatı artırın ve düşmanla aranızdaki güç dengesini istihbaratla izleyin.';
const MALI = 'Hazineyi güçlendirin: gelir getirmeyen harcamaları kısın, ticaret anlaşmaları yapın, gerekirse borcu yeniden yapılandırın.';
const DENIZ = 'Donanmayı ticaret yollarına ve limanlara yönlendirin (Deniz/Hava paneli); ablukaya karşı eskort ve konvoy görevleri verin.';
const DIPLO = 'Müttefik ve komşularla ilişkileri iyileştirin: müzakere teklifleri gönderin, ticaret ve saldırmazlık anlaşmaları önerin.';
const SAVAS = 'Savaş hedefinizi netleştirin: ezici olduğunuz cepheye saldırı planı verin, güçsüz olduğunuz cephede savunmaya geçin.';
const SANAYI = 'Fabrika ve maden yatırımı yapın; hasarlı tesisleri onarın, şehir sanayi politikasını verime çevirin.';
export const HEDEF_ONERI: Record<string, string> = {
  fronts_supplied: IKMAL,
  front_supply_days: IKMAL,
  army_supply_days: IKMAL,
  ammo_supply_days: IKMAL,
  artillery_ammo_days: IKMAL,
  overseas_supply_days: IKMAL + ' Denizaşırı ikmal için deniz yolu güvenliğini de koruyun.',
  fuel_days_supply:
    'Petrol stokunu artırın: petrol alın, petrol kuyusu ve maden yatırımı yapın ya da yakıt tüketen filo ve uçak sayısını azaltın.',
  army_readiness: 'Birlikleri dinlendirin (organizasyon yükselsin), ikmali tamamlayın ve komutan atayın.',
  defensive_readiness: 'Birlikleri dinlendirin (organizasyon yükselsin), ikmali tamamlayın ve komutan atayın.',
  rail_mobilization_ready: 'Demiryolu düzeyini artırın (inşa) ve birliklerin organizasyonunu yüksek tutun.',
  border_security: GUVENLIK,
  controlled_homeland: GUVENLIK,
  national_sovereignty: GUVENLIK,
  straits_security: GUVENLIK + ' Boğaz ve başkent bölgelerinde birlik bulundurun.',
  belgian_security: 'Belçika’nın güvenliği için diplomasi yürütün: garanti ve ittifak önerin, Almanya ile gerilimi düşürün.',
  serbia_security: 'Sırbistan’ın güvenliği için diplomasi ve askerî destek verin: garanti, yardım ve ittifak.',
  serbia_crisis_resolution: 'Krizi diplomasiyle çözün: müzakere teklifleri ve ateşkes; savaştaysanız işgal ilerlemesini artırın.',
  crisis_resolution: DIPLO,
  peace_with_GBR_days: 'Britanya ile savaşa girmeyin: ilişkileri iyileştirin, deniz silahlanmasında gerilimi düşürün.',
  alliance_trust: DIPLO,
  alliance_policy: DIPLO,
  neutrality_commitment: 'Duruşunuzu netleştirin: ya bir ittifaka katılın ya da tarafsız kalıp iç istikrarı güçlendirin.',
  neutrality_security: 'Savaştan uzak durun, sınırlarınızı koruyun ve komşularla saldırmazlık anlaşmaları yapın.',
  war_choice_fulfilled: 'Savaş tercihinizi diplomasi kozu olarak kullanın: büyük devletlerden teklif alın, ilişkilerinizi dengede tutun.',
  war_goal_progress: SAVAS,
  war_risk_management: 'Gerginliği düşürün: müzakere teklifleri yapın, sınır olaylarından kaçının.',
  war_policy_stability: ISTIKRAR,
  war_fatigue_inverse: 'Savaş yorgunluğunu azaltın: barış arayın, kayıpları sınırlayın, sosyal harcamaları artırın.',
  territorial_claim_progress: 'İddia ettiğiniz bölgelere yönelin: saldırı planı verin ya da müzakere ve antlaşmayla toprak isteyin.',
  treaty_claim_progress: 'İddia ettiğiniz bölgeler için antlaşma ve müzakere yürütün; güvenilir bir ortak olun.',
  political_stability: ISTIKRAR,
  stability_and_food: ISTIKRAR + ' Gıda güvencesi için tarım yatırımı ve ithalat yapın.',
  treasury_runway: MALI,
  treasury_and_rail: MALI + ' Demiryolu yatırımını da sürdürün.',
  industrial_damage_inverse: 'Hasarlı tesisleri onarın ve sabotaja karşı istihbarat ağı kurun.',
  industry_supply: SANAYI + ' Çelik stokunu da koruyun.',
  convoy_security: DENIZ,
  naval_security: DENIZ,
  trade_throughput: DENIZ + ' Ticaret anlaşmaları liman hacmini artırır.',
  resource_exports: 'Çelik ve kömür üretimini artırın: maden yatırımı yapın ve üretim hatlarını genişletin.',
};
