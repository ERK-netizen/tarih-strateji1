// Derlenmiş senaryo paketinin tipi (bölüm 25). Paket statiktir; kanonik duruma yalnız kimliği ve sürümü girer.
import type { BayrakAd } from './catalog.ts';

export interface PaketUlke {
  kod: string; ad: string; kisa: string; sifat: string; renk: string; yonetim: number; kisilik: number;
  baskent: number; hazine: number; pg: number; vergi: number; askerlik: number; ekonomi: number;
  huzur: number; mesru: number; kultur: number; inanc: number; yedekOran: number;
  tekler: string[]; lider: string;
}
export interface PaketEyalet { kod: string; ad: string; ulke: number; merkez: number; bolgeler: number[] }
export interface PaketBolge {
  kod: string; ad: string; eyalet: number; sahip: number; arazi: number; yerlesim: number;
  merkez: [number, number]; poligon: number[]; komsu: number[];
  alan: number; verim: number; isciYog: number; sulama: number; altyapi: number; demiryolu: number;
  sivilF: number; askeriF: number; celik: number; komur: number;
  nufus: number[]; // 32 hücre (yaş × statü)
  kimlik: number[]; // 7 hücre kişi
  kimlikAnahtar: [number, number][]; // her kimlik hücresi için (kültür, inanç); diğer = [-1,-1]
  kis: number[]; camur: number[]; // 12 aylık
  anaYurt: number[]; iddia: number[]; iklim: number;
}
export interface PaketKenar { a: number; b: number; km: number; sinir: number }
export interface PaketBirlik { ulke: number; sablon: string; bolge: number; ad: string }
export interface PaketAnlasma { tur: string; a: number; b: number }
export interface PaketOlay { kod: string; gun: number }

export interface Paket {
  kimlik: string;
  surum: string;
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
  birlikler: PaketBirlik[];
  harita: { gen: number; yuk: number; deniz: number[][]; cizgiler: { a: number; b: number; p: number[] }[]; denizAdlari: { ad: string; x: number; y: number }[] };
  uyarilar: string[];
}
