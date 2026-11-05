// Simülasyon Worker'ı giriş noktası.
/// <reference lib="webworker" />
import { varsayilanDepo, BellekDepo, type Depo } from '@ts/storage';
import { Sunucu } from './sunucu.ts';

declare const self: DedicatedWorkerGlobalScope;

/** Depo hazır olana dek bekleyen sarmalayıcı; depolama açılamazsa (ör. file://) bellekte çalışır. */
function gecikmeliDepo(): Depo {
  const zaman = new Promise<Depo>((r) => setTimeout(() => r(new BellekDepo()), 2500));
  const d = Promise.race([varsayilanDepo().catch(() => new BellekDepo()), zaman]);
  return {
    oku: async (a) => (await d).oku(a),
    yaz: async (a, v) => (await d).yaz(a, v),
    sil: async (a) => (await d).sil(a),
    liste: async () => { try { return await (await d).liste(); } catch { return []; } },
  };
}

// MessageChannel ile mikro görev zinciri olmadan mesaj döngüsüne dönüş (T061)
const ch = new MessageChannel();
const bekleyen: (() => void)[] = [];
ch.port1.onmessage = () => { const f = bekleyen.shift(); f?.(); };
const bekle = () => new Promise<void>((r) => { bekleyen.push(r); ch.port2.postMessage(0); });

const sunucu = new Sunucu(null, gecikmeliDepo(), (m, aktar) => self.postMessage(m, aktar ?? []), bekle);

self.onmessage = (e: MessageEvent) => {
  // stop: zaman ilerlerken anında işaretlenir
  if ((e.data as { t?: string })?.t === 'stop') { sunucu.durdurIstek = true; return; }
  void sunucu.isle(e.data);
};
