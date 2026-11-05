# Kabul testi raporu — Aşama 1A

Tarih: 4 Kasım 2026 · Toplam: **100** test · Geçen: **100** · Kalan: 0

Komutlar: `npm run tip` (TypeScript strict), `npm run lint` (5.5/6.3 kuralları, 0 hata), `npm test`.

Laboratuvar (Node 22, 1 yıl, gözlemci modu): `365 gün: 1288 ms (3.53 ms/gün), soğuk yol: 0, hash 9d3f6e05d90690c5`

## cekirdek.test.ts

| Test | Sonuç | Süre (ms) |
|---|---|---|
| 6.2 aritmetik › mulRatio şartname örneği: 7.300.000.000.123 × 1,25 | ✓ | 2 |
| 6.2 aritmetik › mulRatio BigInt ile aynı (özellik) | ✓ | 17 |
| 6.2 aritmetik › divRatio ve mulDiv taban doğruluğu | ✓ | 13 |
| 6.2 aritmetik › sqrtInt tam kare denetimi | ✓ | 9 |
| 6.2 aritmetik › roundHalfEven | ✓ | 0 |
| 6.2 aritmetik › largestRemainder toplamı korur | ✓ | 4 |
| 6.5 rastlantı rng.v1 › sabit test vektörleri | ✓ | 1 |
| 6.5 rastlantı rng.v1 › T097 muharebe çarpanı r ∈ [0,85; 1,15] | ✓ | 12 |
| 6.6–6.7 hash ve kimlik › hash.v1 kararlı ve hassas | ✓ | 1 |
| 6.6–6.7 hash ve kimlik › T010 silinen yuva yeniden kullanılınca eski kimlik geçersiz | ✓ | 1 |
| 6.6–6.7 hash ve kimlik › 6.4 takvim: ay atlaması son güne kırpılır, gidiş-dönüş | ✓ | 0 |
| 6.6–6.7 hash ve kimlik › T101 soğuk yol sayacı başlangıçta tanımlı | ✓ | 0 |

## komut.test.ts

| Test | Sonuç | Süre (ms) |
|---|---|---|
| T119 kip × olumsuzluk matrisi › olumlu: Tunçkale'ye saldır | ✓ | 12 |
| T119 kip × olumsuzluk matrisi › olumlu: Tunçkale'ye saldırın | ✓ | 3 |
| T119 kip × olumsuzluk matrisi › olumlu: Tunçkale'ye saldırsın | ✓ | 2 |
| T119 kip × olumsuzluk matrisi › olumlu: Tunçkale'ye saldıralım | ✓ | 2 |
| T119 kip × olumsuzluk matrisi › olumlu: Tunçkale'ye saldırmalıyız | ✓ | 2 |
| T119 kip × olumsuzluk matrisi › olumlu: Tunçkale'ye saldırılsın | ✓ | 3 |
| T119 kip × olumsuzluk matrisi › olumlu: Tunçkale'ye saldıracak | ✓ | 2 |
| T119 kip × olumsuzluk matrisi › olumlu: Tunçkale'ye saldırmak istiyorum | ✓ | 2 |
| T119 kip × olumsuzluk matrisi › olumsuz: Tunçkale'ye saldırma | ✓ | 4 |
| T119 kip × olumsuzluk matrisi › olumsuz: Tunçkale'ye saldırmayın | ✓ | 3 |
| T119 kip × olumsuzluk matrisi › olumsuz: Tunçkale'ye saldırmasın | ✓ | 3 |
| T119 kip × olumsuzluk matrisi › olumsuz: Tunçkale'ye saldırmayalım | ✓ | 2 |
| T119 kip × olumsuzluk matrisi › olumsuz: Tunçkale'ye saldırmamalıyız | ✓ | 2 |
| T119 kip × olumsuzluk matrisi › isim-fiil + istek olumludur: "saldırma emri ver" | ✓ | 4 |
| T120 hal ekleri rol belirler › yönelme = hedef, ayrılma = kaynak ülke | ✓ | 8 |
| T120 hal ekleri rol belirler › bulunma+ki = birlik seçimi | ✓ | 3 |
| T120 hal ekleri rol belirler › ASCII yazım (Türkçe klavyesiz) tanınır | ✓ | 2 |
| T121 soru cümleleri danışmana gider, emir üretmez › Huzur neden düşüyor? | ✓ | 2 |
| T121 soru cümleleri danışmana gider, emir üretmez › ne yapmalıyım | ✓ | 2 |
| T121 soru cümleleri danışmana gider, emir üretmez › Demirhan saldıracak mı | ✓ | 2 |
| T121 soru cümleleri danışmana gider, emir üretmez › savaş nasıl gidiyor | ✓ | 2 |
| T121 soru cümleleri danışmana gider, emir üretmez › Gıda yeterli mi? | ✓ | 2 |
| T122 tanınmayan komut: ret + en yakın üç seçenek › uçak gemisi inşa et | ✓ | 2 |
| T122 tanınmayan komut: ret + en yakın üç seçenek › anlamsız metin | ✓ | 3 |
| T093A/T094 güven eşiği ve kabul kümesi › güven < 0,80 → uygulanabilir emir değil, en çok üç yorum çipi | ✓ | 1 |
| T093A/T094 güven eşiği ve kabul kümesi › Türkçe kabul kümesi (58 cümle) ≥ %90 doğru tür | ✓ | 69 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › vergi | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › askerlik | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › ekonomi | ✓ | 2 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › karne | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › birlikKur | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › hareket | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › saldir | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › arastir | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › insa | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › satinAl | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › sat | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › teklif | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › gerekce | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › savasIlan | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › baris | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › tutum | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › borcAl | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › otoCephe | ✓ | 1 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › uretim | ✓ | 2 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › sandbox | ✓ | 2 |
| T123 her menü eyleminin eşdeğer komutu aynı emre geri çözülür › isgalPol | ✓ | 1 |

## simulasyon.test.ts

| Test | Sonuç | Süre (ms) |
|---|---|---|
| belirlenimcilik › aynı tohum ve emirler aynı günlük hash dizisini üretir | ✓ | 1063 |
| belirlenimcilik › farklı tohum farklı sonuç | ✓ | 388 |
| belirlenimcilik › kayıt → yükleme → devam aynı hash (yeniden oynatma) | ✓ | 676 |
| belirlenimcilik › T114 zorlaTamYol açık/kapalı aynı hash | ✓ | 423 |
| belirlenimcilik › T115 tahsis önbelleği kapalı/açık aynı hash | ✓ | 439 |
| belirlenimcilik › T096 anlatı hash'i simülasyon hash'inden ayrı | ✓ | 24 |
| belirlenimcilik › T092 önizleme dünya hash'ini değiştirmez | ✓ | 15 |
| korunum ve muhasebe › nüfus korunumu ve köken defteri 400 gün boyunca (savaş dâhil) | ✓ | 1253 |
| korunum ve muhasebe › T102 köken: birlik partileri + ulusal defter + yoldaki = A hücreleri | ✓ | 604 |
| korunum ve muhasebe › T103 kimlik hücresi üst sınırı ve toplam = nüfus | ✓ | 157 |
| korunum ve muhasebe › T024 negatif nüfus hücresi yoktur; çocuk bandında S/Y/E yoktur | ✓ | 1216 |
| korunum ve muhasebe › T104–T105 aylık kohort ve doğal akış nüfusu yalnız doğum−ölüm kadar değiştirir | ✓ | 4 |
| korunum ve muhasebe › T101 standart fixture günlük hatta soğuk yol (BigInt) sayısı 0 | ✓ | 291 |
| korunum ve muhasebe › askerlik yasası aktarımı yalnız S↔Y değiştirir (10.4) | ✓ | 4 |
| korunum ve muhasebe › emir kuyruğu P2'de işler: vergi değişimi ertesi gün | ✓ | 7 |

## sistemler.test.ts

| Test | Sonuç | Süre (ms) |
|---|---|---|
| 11–14 ekonomi ve lojistik › T030 hasat beklentisi tam 1,000000 | ✓ | 1 |
| 11–14 ekonomi ve lojistik › T036 ödeme sırası: önce borç servisi; nakit yetmezse bakım payı düşer | ✓ | 8 |
| 11–14 ekonomi ve lojistik › T039 temerrüt bir kez işler | ✓ | 263 |
| 11–14 ekonomi ve lojistik › T040–T041 üretim: girdi yoksa q=0, kesirli ürün WIP'te birikir | ✓ | 9 |
| 11–14 ekonomi ve lojistik › T046/T048 ortak kapasite ve kaynak stoğu sınırı | ✓ | 13 |
| 11–14 ekonomi ve lojistik › T052 sıfır arzda işlem miktarı sıfır, fiyat referansa yaklaşır | ✓ | 3 |
| 11–14 ekonomi ve lojistik › T053 sipariş satır sırası tahsisi değiştirmez | ✓ | 14 |
| 15 kara muharebesi › T055 referans istatistik ekipman adediyle çarpılmaz | ✓ | 3 |
| 15 kara muharebesi › T054 savunma artışı etkin vuruşu artırmaz | ✓ | 1 |
| 15 kara muharebesi › T057–T059 savaş: kayıplar mevcut personelle sınırlı, köken muhasebesi korunur | ✓ | 320 |
| 15 kara muharebesi › T050 karşılıklı geçişte tek çatışma kaydı | ✓ | 6 |
| 9 kontrol ve işgal › T110–T111 kontrol hedefi şartname örnekleri | ✓ | 9 |
| 9 kontrol ve işgal › T108–T109 işgal: başlangıç itaati 0–40, taban erişim tavanın %25'i | ✓ | 3 |
| 17 siyaset ve 19 istihbarat › T112 yorgunluk o ayın ölü + kalıcı sakat kaybıyla artar, birikimli değil | ✓ | 6 |
| 17 siyaset ve 19 istihbarat › T132 gerçek değer istihbarat aralığının içinde; aralık istihbaratla daralır | ✓ | 3 |
| 17 siyaset ve 19 istihbarat › T124 niyet göstergesi yalnız kamu sinyalinden: gizli plan değişince değişmez | ✓ | 3 |
| 17 siyaset ve 19 istihbarat › barış paketi atomik: bölgeler, ateşkes, işgal iadesi | ✓ | 3 |

## sunucu.test.ts

| Test | Sonuç | Süre (ms) |
|---|---|---|
| 5.3 Worker protokolü › bilinmeyen tür ve yanlış sürüm error üretir, sessizce yutulmaz | ✓ | 3 |
| 5.3 Worker protokolü › T061 Durdur bir sonraki gün sınırında uygulanır | ✓ | 87 |
| 5.3 Worker protokolü › T067 günlük delta ayrı ArrayBuffer olarak aktarılır; dünya tamponları aktarılmaz | ✓ | 37 |
| 5.3 Worker protokolü › komut → önizleme kartı ve eşdeğer komut | ✓ | 17 |
| 5.3 Worker protokolü › Gözlemci modunda emir reddedilir | ✓ | 3 |
| 24.1 kayıt deposu (nesil + A/B başlık) › T117 kesilen yazım bir önceki geçerli nesle döner | ✓ | 2 |
| 24.1 kayıt deposu (nesil + A/B başlık) › T118 başlık var ama nesil dosyası bozuk → özet tutmaz, eski nesil | ✓ | 1 |
| 24.1 kayıt deposu (nesil + A/B başlık) › tam kayıt kapsayıcısı: kaydet → yükle aynı hash ve Kronik | ✓ | 131 |
| 26 performans › T116 bir yıllık atlama Node'da 6 saniyenin altında | ✓ | 1653 |

## Kapsam dışı kalan T kimlikleri

1A bayrakları kapalı olduğundan T106–T107 (seferberlik), T113 (seçim), T125 (büyük taarruz), T126 (tahkimat), T127 (zırh), T128 (deniz/hava), T129 (Sandbox senaryo dışa aktarma), T130 (MapLibre feature-state), T131 (durağan cephe özeti), T133 (para basma) 1B aşamalarına aittir. T091 (sis altında karar) dolaylı olarak T124 ve gözlem katmanı testleriyle sınanır.