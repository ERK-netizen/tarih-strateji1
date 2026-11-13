// Derlenmiş senaryo paketinin tipi (bölüm 25). Paket statiktir; kanonik duruma yalnız kimliği ve sürümü girer.
import type { BayrakAd } from './catalog.ts';

export interface PaketUlke {
  kod: string; ad: string; kisa: string; sifat: string; renk: string; yonetim: number; kisilik: number;
  baskent: number; hazine: number; pg: number; vergi: number; askerlik: number; ekonomi: number;
  huzur: number; mesru: number; kultur: number; inanc: number; yedekOran: number;
  tekler: string[]; lider: string;
  /** Pasif topluluk: karar modülü çalışmaz, diplomasi yapmaz */
  pasif?: boolean;
  /** Arayüzde gösterilecek yönetim adı (ör. Halifelik, Oligarşik cumhuriyet) */
  yonetimAd?: string;
  /** Başlangıç deposu */
  depo?: { muhimmat: number; ekip: number[] };
  guc?: number;
  /** Deniz gücü 0–10 (donanma soyutlaması: deniz geçişi ve abluka) */
  deniz?: number;
  /** Barış zamanı hedef tümen sayısı (karar modülü) */
  ordu?: number;
  /** Başlangıç savaşa desteği (×1000; yoksa 40) */
  destek?: number;
}
export interface PaketEyalet { kod: string; ad: string; ulke: number; merkez: number; bolgeler: number[] }
export interface PaketBolge {
  kod: string; ad: string; eyalet: number; sahip: number; arazi: number; yerlesim: number;
  merkez: [number, number]; poligon: number[] | number[][]; komsu: number[];
  /** Başlangıçta işgal eden (yoksa sahip) */
  kontrol?: number;
  iso?: string; lon?: number; lat?: number;
  alan: number; verim: number; isciYog: number; sulama: number; altyapi: number; demiryolu: number;
  sivilF: number; askeriF: number; celik: number; komur: number;
  nufus: number[]; // 32 hücre (yaş × statü)
  kimlik: number[]; // 7 hücre kişi
  kimlikAnahtar: [number, number][]; // her kimlik hücresi için (kültür, inanç); diğer = [-1,-1]
  kis: number[]; camur: number[]; // 12 aylık
  anaYurt: number[]; iddia: number[]; iklim: number;
  /** şema 7: kıyı bölgesi (donanma ve tersane) ve petrol yatağı [günlük milibirim, keşif yılı] */
  kiyi?: number; petrol?: [number, number];
}
export interface PaketKenar { a: number; b: number; km: number; sinir: number; tur?: number }
export interface PaketBirlik { ulke: number; sablon: string; bolge: number; ad: string }
export interface PaketAnlasma { tur: string; a: number; b: number }
export interface PaketOlay { kod: string; gun: number }
export interface PaketEylem { t: string; a?: number; b?: number; d?: number; v?: number; olay?: string; gecikme?: number; cagri?: boolean }
/** Olay koşulu: bütün verilen alanlar tutmalıdır. */
export interface PaketKosul {
  savasta?: [number, number]; barista?: [number, number]; kontrol?: [number, number]; kontrolDegil?: [number, number];
  /** Kararlarla konan tarih bayrakları */
  bayrak?: string[]; bayrakDegil?: string[];
  /** Ülke herhangi biriyle savaşta / hiç savaşta değil */
  savastaMi?: number; barisMi?: number;
  /** [ülke, eşik ×1000] */
  huzurAlt?: [number, number]; destekAlt?: [number, number]; yorgunlukUst?: [number, number];
  /** [ülke, ana yurt kaybı ‰]: ana yurdun bu kadarı düşman kontrolünde */
  kayipUst?: [number, number];
}
export interface PaketSenaryoOlay {
  kod: string; gun: number; ulke: number; baslik: string; metin: string; tekrar?: boolean;
  kosul?: PaketKosul;
  /** Koşul tutmazsa bu kadar gün boyunca haftada bir yeniden denenir (tarih penceresi) */
  pencere?: number;
  /** Koşul tuttuğunda gerçekleşme olasılığı (%); tutmazsa pencere içinde yeniden denenir */
  olasilik?: number;
  secenekler: { ad: string; etki: string; yz: number; e: PaketEylem[] }[];
}

export interface Paket {
  kimlik: string;
  surum: string;
  donem?: string;
  alt?: string;
  aciklama?: string;
  olaylar?: PaketSenaryoOlay[];
  oneCikan?: number[];
  senaryo: { ad: string; baslangic: { y: number; m: number; d: number }; bitis: { y: number; m: number; d: number } };
  tohum: number;
  bayraklar: Record<BayrakAd, boolean>;
  hasat: number[];
  hasatP: number[];
  kultur: { kod: string; ad: string; grup: number }[];
  inanc: { kod: string; ad: string }[];
  ulkeler: PaketUlke[];
  eyaletler: PaketEyalet[];
  bolgeler: PaketBolge[];
  kenarlar: PaketKenar[];
  gorus: number[][]; // [a][b] a'nın b'ye görüşü ×1000
  anlasmalar: PaketAnlasma[];
  /** Başlangıçta süren savaşlar: a saldıran tarafı, b savunan tarafı (ilk elemanlar lider) */
  savaslar?: { a: number[]; b: number[]; gun?: number; gerekceli?: boolean }[];
  birlikler: PaketBirlik[];
  harita: { gen: number; yuk: number; deniz: number[][]; cizgiler: { a: number; b: number; p: number[] }[]; denizAdlari: { ad: string; x: number; y: number }[]; gercek?: boolean };
  uyarilar: string[];
  /** Harita göçü: eski paket sürümü, her bölgenin eski haritadaki atası ve atanın aynı adlı devamı (tohum) olup olmadığı. */
  goc?: { surum: string; ata: number[]; tohum: number[] };
}
