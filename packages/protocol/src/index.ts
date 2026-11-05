// Bölüm 5.3: Worker mesaj protokolü. Her mesaj { v, id, t, p }. Bilinmeyen tür veya sürüm `error` üretir.
export const PROTOKOL_SURUM = 1;

export type IstekTur = 'init' | 'preview' | 'submit' | 'advance' | 'stop' | 'query' | 'explain' | 'save' | 'load' | 'branch' | 'sandbox' | 'exportSave' | 'command' | 'saves' | 'deleteSave' | 'switch';
export type YanitTur = 'ready' | 'previewCard' | 'orderResult' | 'dayCommitted' | 'stopped' | 'view' | 'explanation' | 'saveResult' | 'fileReady' | 'commandResult' | 'saveList' | 'error';

export interface Mesaj<T extends string = string, P = unknown> { v: number; id: number; t: T; p: P }

export const ISTEK_TURLERI: readonly IstekTur[] = ['init', 'preview', 'submit', 'advance', 'stop', 'query', 'explain', 'save', 'load', 'branch', 'sandbox', 'exportSave', 'command', 'saves', 'deleteSave', 'switch'];

export interface InitP { oyuncu: number; mod: number; yuva?: string; ayar?: { onbellekKapali?: boolean } }
export interface AdvanceP { birim: 'gun' | 'hafta' | 'ay' | 'yil' | 'olay'; adet: number; sessiz: string[] }
export interface QueryP { gorunum: 'ozet' | 'ulke' | 'bolge' | 'birlik' | 'diplomasi' | 'ekonomi' | 'arastirma' | 'kronik' | 'harita' | 'istatistik' | 'olaylar' | 'niyet'; kapsam?: number }

/** Gelen mesajın biçimini denetler (şema doğrulaması). */
export function dogrula(m: unknown): { ok: true; m: Mesaj } | { ok: false; neden: string } {
  if (typeof m !== 'object' || m === null) return { ok: false, neden: 'mesaj nesne değil' };
  const x = m as Record<string, unknown>;
  if (x.v !== PROTOKOL_SURUM) return { ok: false, neden: `protokol sürümü uyumsuz: ${String(x.v)}` };
  if (typeof x.id !== 'number') return { ok: false, neden: 'id eksik' };
  if (typeof x.t !== 'string' || !(ISTEK_TURLERI as readonly string[]).includes(x.t)) return { ok: false, neden: `bilinmeyen tür: ${String(x.t)}` };
  return { ok: true, m: x as unknown as Mesaj };
}

export function mesaj<T extends string, P>(id: number, t: T, p: P): Mesaj<T, P> {
  return { v: PROTOKOL_SURUM, id, t, p };
}
