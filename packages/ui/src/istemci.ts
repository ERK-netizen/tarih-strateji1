// Worker istemcisi: istek/yanıt eşlemesi ve olay akışı.
import { PROTOKOL_SURUM } from '@ts/protocol';
import SimWorker from '../../worker/src/index.ts?worker&inline';

type Dinleyici = (t: string, p: any) => void;

export class Istemci {
  private w: Worker;
  private id = 1;
  private bekleyen = new Map<number, { coz: (v: any) => void; red: (e: any) => void; akis?: Dinleyici; son: string[] }>();
  dinle: Dinleyici = () => {};
  constructor() {
    this.w = new SimWorker();
    this.w.onmessage = (e) => {
      const m = e.data as { id: number; t: string; p: any };
      const b = this.bekleyen.get(m.id);
      if (m.t === 'error') { this.dinle('error', m.p); if (b && !b.akis) { this.bekleyen.delete(m.id); b.red(m.p); } return; }
      if (!b) { this.dinle(m.t, m.p); return; }
      if (b.akis && !b.son.includes(m.t)) { b.akis(m.t, m.p); return; }
      this.bekleyen.delete(m.id);
      b.coz(m.p);
    };
    this.w.onerror = (e) => this.dinle('error', { kod: 'worker', ayrinti: e.message });
  }
  istek<T = any>(t: string, p: unknown, akis?: Dinleyici, son: string[] = [], aktar?: Transferable[]): Promise<T> {
    const id = this.id++;
    return new Promise<T>((coz, red) => {
      this.bekleyen.set(id, { coz, red, akis, son });
      this.w.postMessage({ v: PROTOKOL_SURUM, id, t, p }, aktar ?? []);
    });
  }
  durdur() { this.w.postMessage({ v: PROTOKOL_SURUM, id: 0, t: 'stop', p: null }); }
}
