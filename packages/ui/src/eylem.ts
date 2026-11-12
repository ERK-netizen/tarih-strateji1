// Eylem yardımcıları: komut çalıştırma, önizleme, emir gönderme, zaman ilerletme.
import { istemci, komutSonuc, tost, tazele, ilerliyor, ilerleme, rapor, harita, sessiz, komutHatirla, taninmayanEkle, seciliBirlik, ozet, cekmece } from './durum.ts';

export async function komutCalistir(metin: string) {
  const m = metin.trim();
  if (!m) return;
  const r = await istemci.istek('command', { metin: m, secili: [...seciliBirlik.value] });
  const s = r.sonuc;
  if (s.tur === 'zaman') { komutSonuc.value = null; komutHatirla(m); return ilerlet(s.birim, s.adet); }
  if (s.tur === 'sistem') {
    komutSonuc.value = null;
    if (s.komut === 'kaydet') { await istemci.istek('save', { yuva: 'manuel' }); tost('Oyun kaydedildi (manuel yuva).'); }
    else komutSonuc.value = { tur: 'yardim' };
    return;
  }
  if (s.tur === 'ret') taninmayanEkle(m);
  if (s.tur === 'emir') komutHatirla(m);
  komutSonuc.value = { ...s, ek: r.ek, metin: m };
}

/** Menü eylemi: önizleme kartı açar; kart eşdeğer komutu da gösterir (C04). */
export async function onizle(emir: Record<string, unknown>) {
  const k = await istemci.istek('preview', emir);
  komutSonuc.value = { tur: 'emir', yorum: { emir, esdeger: k.esdeger, guven: 1 }, ek: k, menu: true };
}

export async function gonder(emir: Record<string, unknown>) {
  // idempotency: aynı dünya sürümünde aynı emre iki kez dokunmak tek emir sayılır
  const surum = ozet.value?.surum;
  const r = await istemci.istek('submit', { ...emir, beklenenSurum: surum, idem: `${surum}:${JSON.stringify(emir)}` });
  if (r.kabul === false) { tost(r.neden, 'hata'); return false; }
  const s = r.sonuc?.[0];
  if (s && !s.kabul) { tost(s.neden ?? 'Emir reddedildi.', 'hata'); return false; }
  komutSonuc.value = null;
  tost(`Onaylandı: ${s?.esdeger ?? s?.baslik ?? 'emir'} — ${s?.aninda ? 'anında işlendi' : 'sonraki gün işleyecek'}${r.kayit === true ? ', kaydedildi.' : r.kayit === false ? '; KAYIT YAZILAMADI.' : '.'}`, r.kayit === false ? 'hata' : 'iyi');
  if (emir.tur === 'hareket' || emir.tur === 'saldir' || emir.tur === 'dur') seciliBirlik.value = new Set();
  // Anında verilen emirler (araştırma, proje, teklif vb.) bir gün atlamadan görünür.
  await tazele();
  return true;
}

export async function ilerlet(birim: string, adet = 1) {
  if (ilerliyor.value) return;
  ilerliyor.value = true;
  rapor.value = null;
  ilerleme.value = { yuzde: 0, tarih: ozet.value?.tarih ?? '' };
  try {
    const son = await istemci.istek('advance', { birim, adet, sessiz: sessiz.value }, (t, p) => {
      if (t === 'dayCommitted') {
        ilerleme.value = { yuzde: p.ilerleme, tarih: p.tarih };
        if (harita.value) {
          const d = new Int16Array(p.delta);
          const v = harita.value;
          for (let r = 0; r < v.bolgeler.length; r++) v.bolgeler[r]!.k = d[r]!;
          harita.value = { ...v };
        }
      }
    }, ['stopped']);
    rapor.value = { neden: son.neden, gecen: son.gecen, olaylar: son.rapor.olaylar, durmalar: son.durmalar };
    // tek pencere: panel açıksa rapor onun yerine geçmez, kısa bildirim verilir
    const c = cekmece.value;
    const kayda = son.durmalar.length > 0 || son.rapor.olaylar.length > 0;
    if (kayda && (!c || c.tur !== 'panel')) cekmece.value = { tur: 'rapor' };
    else if (kayda) tost(`${son.gecen} gün geçti: ${son.durmalar[0]?.metin ?? son.rapor.olaylar[0]?.metin ?? ''}`.slice(0, 140));
  } catch (e: any) {
    tost(e?.ayrinti ?? 'Zaman ilerletilemedi.', 'hata');
  } finally {
    ilerliyor.value = false; ilerleme.value = null;
    await tazele();
  }
}

export function durdur() { istemci.durdur(); }
