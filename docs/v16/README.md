# v1.6 geliştirme kiti — entegrasyon durumu

Kaynak: `Tarih_Strateji_v1_6_Entegre_Gelistirme_Kit.zip` (temel commit `3fdd26d`).

- `V16_BUTUNLESIK_ANA_GELISTIRME_PROMPTU.md` — v1.6'nın bütün gereksinimleri (değiştirilmeden alındı).
- `V16_MIMARI_VE_KABUL_PLANI.md` — mimari, sözleşmeler ve P0–P8 entegrasyon sırası.
- `referans/` — kitin **oyuna bağlı olmayan** referans kodu (`core/*.ts`), bağımsız smoke testi ve Canvas muharebe prototipi.
  Derlemeye, lint'e ve `npm test`e girmez. Bağımsız çalıştırma:
  `cd docs/v16/referans && node --experimental-strip-types --test tests/v16-smoke.test.ts` (9/9 geçer).

## Bu dalda uygulananlar

| Kalem | Durum | Kanıt |
|---|---|---|
| P0 istemci: akışlı isteğe `error` gelince Promise reddedilir; Worker çökerse bütün bekleyenler reddedilir; `postMessage` hatası yakalanır | tamamlandı / testlendi | T36 — `tests/acceptance/v16.test.ts` |
| P0 Worker tek yazar: mesajlar tek sırada; zaman ilerlerken sorgu/önizleme dışı mesaj `mesgul` | tamamlandı / testlendi | T38 (meşgul) |
| P0 sürüm kilidi (`beklenenSurum`), başarılı anlık emirde sürüm + hash yenilenir | tamamlandı / testlendi | T37 |
| P0 aynı gün idari emir + otomatik kayıt; olay kararı artık bir gün ilerletmez | tamamlandı / testlendi | T38, T39; K-46 |
| İstihbarat giderleri hazineyi negatife düşüremez | tamamlandı / testlendi | T47 |
| README: Android portre (`sensorPortrait`) | tamamlandı | `README.md` |
| Şehir düzeyi × 4 yapı yuvası; ağ/imar yatırımları yuva tüketmez; bedelsiz fabrika yok | tamamlandı / testlendi | T21, T40; K-45; bölge çekmecesinde “Yapı yuvası” satırı |
| `core/cities.ts` | motora uyarlandı (`systems/gelisim.ts` `yapiYuvasi`) | T40 |

### Kitteki yamadan bilerek uygulanmayanlar

- **1914 Brezilya başkenti** (`bas: 'Rio de Janeiro'`): haritada bu adla bölge yoktur; derleyici başkenti bulamaz.
  Brasília bölgesi 1914 ve 1939'da `adlar` eşlemesiyle zaten “Rio de Janeiro” olarak gösterilir. Hata değildir.
- README'deki ikinci metin değişikliği: çapa metni güncel README'de yoktu.

## Henüz yapılmayanlar (eksik)

P1 harita 463 → 787+ bölge ve kayıt göçü; P2 komutan/kişi/karargâh tabloları; P3 bağımsız filo/kanat tabloları;
P4 araştırma → prototip → üretim aşamaları; P5 seyrek demografi kohortları ve dinamik partiler; P6 çok maddeli
atomik barış ve güven aralıklı istihbarat raporları; P7 ayrı muharebe ekranı (P9 kayıtlarını oynatan), 3/6 aylık
zaman adımı ve iki ayrı rapor; P8 T01–T35, T41–T46, T48 ve 5/10/25 yıllık benchmark'lar; APK bu ortamda üretilmedi.
`referans/core/` içindeki diğer modüller (kişi, komutan, operasyon, muharebe, araştırma, demografi, barış, etki defteri)
bu kalemlerin taslağıdır; motorun saflık kurallarına (CLAUDE.md 2–5) göre uyarlanmadan bağlanmamalıdır.

## Doğrulama (bu dal)

`npm run tip` ✓ · `npm run lint` ✓ · `npm test` 220/220 ✓ · `npm run lab -- 365` iki koşuda aynı hash `fa35f69599b4c793`.
