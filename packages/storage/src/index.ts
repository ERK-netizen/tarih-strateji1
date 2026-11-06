// Bölüm 24.1: tek kayıt deposu — nesil dosyaları + A/B başlık. Oyun kuralı uygulamaz.
// Birincil: OPFS (Worker içi). Yedek: IndexedDB. Testlerde bellek adaptörü.

export interface Depo {
  oku(ad: string): Promise<Uint8Array | null>;
  yaz(ad: string, veri: Uint8Array): Promise<void>;
  sil(ad: string): Promise<void>;
  liste(): Promise<string[]>;
}

export class BellekDepo implements Depo {
  m = new Map<string, Uint8Array>();
  bozuk = new Set<string>(); // test: yazılırken çökme benzetimi
  async oku(ad: string) { return this.m.get(ad)?.slice() ?? null; }
  async yaz(ad: string, veri: Uint8Array) {
    if (this.bozuk.has(ad)) { this.m.set(ad, veri.slice(0, Math.floor(veri.length / 2))); throw new Error('yazma kesildi'); }
    this.m.set(ad, veri.slice());
  }
  async sil(ad: string) { this.m.delete(ad); }
  async liste() { return [...this.m.keys()].sort(); }
}

export class OpfsDepo implements Depo {
  private kok: Promise<FileSystemDirectoryHandle>;
  constructor() { this.kok = navigator.storage.getDirectory(); }
  async oku(ad: string) {
    try {
      const d = await this.kok;
      const f = await d.getFileHandle(ad);
      return new Uint8Array(await (await f.getFile()).arrayBuffer());
    } catch { return null; }
  }
  async yaz(ad: string, veri: Uint8Array) {
    const d = await this.kok;
    const f = await d.getFileHandle(ad, { create: true });
    const fh = f as unknown as { createSyncAccessHandle?: () => Promise<{ truncate(n: number): void; write(b: Uint8Array, o: { at: number }): number; flush(): void; close(): void }> };
    if (typeof fh.createSyncAccessHandle === 'function') {
      const h = await fh.createSyncAccessHandle();
      try { h.truncate(0); h.write(veri, { at: 0 }); h.flush(); } finally { h.close(); }
    } else {
      const wr = await (f as unknown as { createWritable(): Promise<{ write(b: Uint8Array): Promise<void>; close(): Promise<void> }> }).createWritable();
      await wr.write(veri); await wr.close();
    }
  }
  async sil(ad: string) { try { const d = await this.kok; await d.removeEntry(ad); } catch { /* yok */ } }
  async liste() {
    const d = await this.kok;
    const out: string[] = [];
    for await (const [ad] of (d as unknown as { entries(): AsyncIterable<[string, unknown]> }).entries()) out.push(ad);
    return out.sort();
  }
}

export class IdbDepo implements Depo {
  private db: Promise<IDBDatabase>;
  constructor() {
    this.db = new Promise((res, rej) => {
      const r = indexedDB.open('tarih-strateji', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('dosya');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  private async tx<T>(mod: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.db;
    return new Promise((res, rej) => { const q = f(db.transaction('dosya', mod).objectStore('dosya')); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  }
  async oku(ad: string) { const v = await this.tx('readonly', (s) => s.get(ad)); return v ? new Uint8Array(v as ArrayBuffer) : null; }
  async yaz(ad: string, veri: Uint8Array) { await this.tx('readwrite', (s) => s.put(veri.slice().buffer, ad)); }
  async sil(ad: string) { await this.tx('readwrite', (s) => s.delete(ad)); }
  async liste() { return ((await this.tx('readonly', (s) => s.getAllKeys())) as string[]).sort(); }
}

export async function varsayilanDepo(): Promise<Depo> {
  try {
    if (typeof navigator !== 'undefined' && typeof (navigator.storage as { getDirectory?: unknown } | undefined)?.getDirectory === 'function') {
      const d = new OpfsDepo();
      await d.liste();
      return d;
    }
  } catch { /* OPFS yok */ }
  return new IdbDepo();
}

// ---------- Nesil dosyaları + A/B başlık ----------
export interface Baslik { yuva: string; nesil: number; boyut: number; ozet: string; gun: number; etiket: string; sandbox: boolean; ulke: number; zaman: string; paket?: string; senaryo?: string; sema?: number }

function crc32(b: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < b.length; i++) { c ^= b[i]!; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
}
const ozet = (b: Uint8Array) => crc32(b).toString(16).padStart(8, '0');

export class KayitDeposu {
  constructor(private d: Depo) {}
  private hdr(yuva: string, ab: 'A' | 'B') { return `${yuva}.hdr${ab}`; }
  private gen(yuva: string, n: number) { return `${yuva}.g${String(n).padStart(6, '0')}`; }

  private async basliklar(yuva: string): Promise<Baslik[]> {
    const out: Baslik[] = [];
    for (const ab of ['A', 'B'] as const) {
      const b = await this.d.oku(this.hdr(yuva, ab));
      if (!b) continue;
      try { out.push(JSON.parse(new TextDecoder().decode(b)) as Baslik); } catch { /* bozuk başlık */ }
    }
    return out.sort((a, b) => b.nesil - a.nesil);
  }

  /** Atomik kayıt: önce tam nesil dosyası, sonra eski nesle ait başlığın üzerine yeni başlık. */
  async kaydet(yuva: string, veri: Uint8Array, meta: Omit<Baslik, 'yuva' | 'nesil' | 'boyut' | 'ozet'>): Promise<Baslik> {
    const var_ = await this.basliklar(yuva);
    const nesil = (var_[0]?.nesil ?? 0) + 1;
    await this.d.yaz(this.gen(yuva, nesil), veri);
    const b: Baslik = { ...meta, yuva, nesil, boyut: veri.length, ozet: ozet(veri) };
    const ab = nesil % 2 === 0 ? 'A' : 'B';
    await this.d.yaz(this.hdr(yuva, ab), new TextEncoder().encode(JSON.stringify(b)));
    // en çok iki nesil tutulur
    for (const n of [nesil - 2, nesil - 3]) if (n > 0) await this.d.sil(this.gen(yuva, n));
    return b;
  }

  /** Geçerli en yeni nesli yükler: boyut ve özet tutmayan nesil atlanır (T117–T118). */
  async yukle(yuva: string): Promise<{ veri: Uint8Array; baslik: Baslik } | null> {
    for (const b of await this.basliklar(yuva)) {
      const v = await this.d.oku(this.gen(yuva, b.nesil));
      if (v && v.length === b.boyut && ozet(v) === b.ozet) return { veri: v, baslik: b };
    }
    return null;
  }

  async yuvalar(): Promise<Baslik[]> {
    const adlar = await this.d.liste();
    const yuvalar = [...new Set(adlar.filter((a) => /\.hdr[AB]$/.test(a)).map((a) => a.replace(/\.hdr[AB]$/, '')))];
    const out: Baslik[] = [];
    for (const y of yuvalar) { const b = (await this.basliklar(y))[0]; if (b) out.push(b); }
    return out.sort((a, b) => b.zaman.localeCompare(a.zaman));
  }

  async sil(yuva: string): Promise<void> {
    for (const a of await this.d.liste()) if (a.startsWith(`${yuva}.`)) await this.d.sil(a);
  }
}
