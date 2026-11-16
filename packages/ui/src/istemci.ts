// Worker istemcisi: istek/yanıt eşlemesi ve olay akışı.
import { PROTOKOL_SURUM } from '@ts/protocol';
import SimWorker from '../../worker/src/index.ts?worker&inline';

type Dinleyici = (t: string, p: any) => void;

export class Istemci {
  private w: Worker;
  private id = 1;
  private bekleyen = new Map<number, { coz: (v: any) => void; red: (e: any) => void; akis?: Dinleyici; son: string[] }>();
  dinle: Dinleyici = () => {};
  /** `w` yalnız testte sahte Worker vermek içindir. */
  constructor(w?: Worker) {
    this.w = w ?? new SimWorker();
    this.w.onmessage = (e) => {
      const m = e.data as { id: number; t: string; p: any };
      const b = this.bekleyen.get(m.id);
      if (m.t === 'error') { this.dinle('error', m.p); if (b) { this.bekleyen.delete(m.id); b.red(m.p); } return; }
      if (!b) { this.dinle(m.t, m.p); return; }
      if (b.akis && !b.son.includes(m.t)) { b.akis(m.t, m.p); return; }
      this.bekleyen.delete(m.id);
      b.coz(m.p);
    };
    this.w.onerror = (e) => {
      const hata = { kod: 'worker', ayrinti: e.message };
      this.dinle('error', hata);
      for (const b of this.bekleyen.values()) b.red(hata);
      this.bekleyen.clear();
    };
    this.w.onmessageerror = () => {
      const hata = { kod: 'mesaj', ayrinti: 'Worker yanıtı çözümlenemedi' };
      this.dinle('error', hata);
      for (const b of this.bekleyen.values()) b.red(hata);
      this.bekleyen.clear();
    };
  }
  istek<T = any>(t: string, p: unknown, akis?: Dinleyici, son: string[] = [], aktar?: Transferable[]): Promise<T> {
    const id = this.id++;
    return new Promise<T>((coz, red) => {
      this.bekleyen.set(id, { coz, red, akis, son });
      try { this.w.postMessage({ v: PROTOKOL_SURUM, id, t, p }, aktar ?? []); }
      catch (e) { this.bekleyen.delete(id); red(e); }
    });
  }
  durdur() { this.w.postMessage({ v: PROTOKOL_SURUM, id: 0, t: 'stop', p: null }); }
}
