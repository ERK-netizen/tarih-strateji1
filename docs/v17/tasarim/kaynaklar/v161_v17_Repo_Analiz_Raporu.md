# TARİH STRATEJİ — v1.6.1 KAYNAK KODU / v1.7 ENTEGRE GELİŞTİRME KARŞILAŞTIRMASI

**İnceleme tarihi:** 14 Kasım 2026  
**Repo:** https://github.com/ERK-netizen/tarih-strateji1  
**Kanonik inceleme dalı:** `ccr-949a01d1-3lmfyg`  
**İncelenen dal HEAD:** `9f3694c9af1afae86aa16771bcc5ed458058ee05`  
**Paket sürümü:** `1.6.1` (geliştirme dalındaki `package.json`)  
**Karşılaştırma:** `00_Tarih_Strateji_v1.7_Entegre_Gelistirme_Sartnamesi.md`; `03_Gelistirici_Uygulama_Planı_v1.7.md`; v1.7 kabul matrisi  
**İnceleme türü:** GitHub üzerinden kaynak kodu ve repo belgeleriyle statik inceleme. Kod çalıştırma, APK derleme, yeni test koşusu veya GitHub dosya değiştirme yapılmadı.

> **Önemli dal ayrımı.** `main` dalında paket sürümü `1.4.0`, README'de 463 bölge yazılıyken, `ccr-949a01d1-3lmfyg` dalında `1.6.1`, README'de 813 bölge ve `docs/v16` kayıtları bulunuyor. `main` dalına v1.7 değişikliği doğrudan uygulanmamalı. Önce doğru kanonik geliştirme dalı üzerinden çalışma açılmalı.

## A. Sonuç

v1.7'de talep edilen 13 alandan hiçbiri bütünüyle sıfırdan başlamak zorunda değil; hepsinin en az bir ilişkili altyapısı var. Fakat **R03, R07, R08, R10, R11 ve R12** veri modeli/algoritma değişimi; **R01, R02, R05, R13** davranış ve yapay zekâ/entegrasyon genişlemesi; **R04, R06, R09** mevcut işlevlerin daha görünür ve zengin hale getirilmesi şeklinde ele alınmalı. Bu tasnif göreli olup test koşusundan geçmiş tamamlanma yüzdesi değildir.

v1.6 repo belgesinin beyanına göre 70 kabul maddesinin 48'i PASS, 18'i PARTIAL, 2'si NOT_IMPLEMENTED, 2'si NOT_RUN; 324 testin geçtiği bildirilmiş. **Bu incelemede testler yeniden çalıştırılmadı.** Yeni v1.7 kabul matrisindeki 77 madde henüz NOT_RUN.

## B. 13 gereksinimin kod bazlı karşılaştırması

| ID | İstek | Kaynak kodda somut bulunanlar | Eksik veya yetersiz kalan | Etkilenen ana dosyalar | Mühendislik zorluğu | Önerilen PR |
|---|---|---|---|---|---|---|
| R01 | Diplomasi menüsü | `TK` teklif çeşitleri, `AN` anlaşma kayıtları, `antlasma` çok maddeli barış, ilişki puanı, ülke AI teklifleri | Çok turlu karşı teklif; antlaşma revision/yaşam döngüsü; gizli madde görünürlüğü; ihlal/taahhüt takibi; konferans | `systems/diplomasi.ts`, `orders.ts`, `emirEk.ts`, `decision/index.ts`, `ui/Paneller.tsx`, `state/world.ts` | 3/5 | PR-04 |
| R02 | Gelişmiş istihbarat | `emirEk.ts`: `casusluk`, `suikast`, `sabotaj`, `iliskiBozma`, `isyan`; `IR` rapor tablosu ve tarihli aralık | Kalıcı ajan/ağ/teşkilat; karşı istihbarat; hazırlık süresi, cooldown, bütçe; somut bakan/kişiyle tutarlı siyasi sonuç; gizli antlaşma sızması | `emirEk.ts`, `observe/index.ts`, `state/world.ts`, `systems/siyaset.ts`, `systems/olaylar.ts`, `worker/gorunum.ts` | 4/5 | PR-04 |
| R03 | Maden/petrol | Bölge `celik/komur/petrol` akışı, `maden` seviyesi, ülke petrol stoku ve ihtiyacı | Maden rezervi, cevher/işlenmiş ürün ayrımı, rafineri, saha ve şehir depoları, enerji, taşımacılık | `systems/ekonomi.ts`, `state/world.ts`, `data-compiler`, `systems/lojistik.ts`, `ui/Paneller.tsx` | 5/5 | PR-01 |
| R04 | İsimli ekipman | Dönem katalogları ve 8 ekipman sınıfı; teknoloji kademeleri; stok, birlik ekipmanı ve WIP | Adlı `EquipmentModel`; lisans, prototip, varyant, reçete ve üretim hattı dönüşümü | `donem.ts`, `catalog.ts`, `systems/ekonomi.ts`, `orders.ts`, `state/world.ts`, `ui/Paneller.tsx` | 3–4/5 | PR-02 |
| R05 | Cephe stabilitesi | `kara.ts` muharebe, organizasyon, tahkimat, hava desteği ve `Muharebe.tsx` viewer | Cephe/harekât durum makinesi, duruş-emir çakışmaları, stabil geri çekilme/testler, kayıtlı operasyon planı | `systems/kara.ts`, `systems/komutan.ts`, `decision/index.ts`, `state/world.ts`, `ui/Muharebe.tsx` | 5/5 | PR-03 |
| R06 | Doğrudan komutan | `komutanAta` emri ve UI **mevcut**; kalıcı `KM`, kapasite/deneyim/etkiler | Kolordu/ordu/cephe hiyerarşisi, üst komuta ve uygunluk kuralları; birlik kartından kolay doğrudan atama | `systems/komutan.ts`, `emirEk.ts`, `ui/Muharebe.tsx`, `ui/Cekmece.tsx` | 2–3/5 | PR-03 |
| R07 | Bakanlıklar/bakanlar | `BAKAN` beş bit alanı, bakan otomasyonu, `siyasiKisiler.ts` tarih kaynaklı siyasi aktörler | Kalıcı kabine/portföy/kişi-atama kayıtları; görev süresi, performans, bütçe, kurumsal politika, halefiyet | `state/world.ts`, `siyasiKisiler.ts`, `decision/index.ts`, `ui/Paneller.tsx`, `systems/siyaset.ts` | 4/5 | PR-05 |
| R08 | Sanayi alt türleri | Bölge `sivilF/askeriF`, `HT` ülke ürün hattı, proje/şehre ait fabrika sayıları | Şehre bağlı tekil tesis, üretim hattı, tesis türü/ismi/makine kapasitesi; tip bazlı dönüşüm | `state/world.ts`, `systems/ekonomi.ts`, `systems/gelisim.ts`, `data-compiler`, `ui/Cekmece.tsx` | 4–5/5 | PR-01 |
| R09 | Şehir menüsü | Bölge çekmecesi: yapı yuvaları, projeler, garnizon, petrol/maden, birlik emirleri | Ayrı şehir kimlikleri; şehirde üretim, depo, maliye, garnizon ve yönetim işlemlerinin birleştirilmesi; dikey ekran bilgi mimarisi | `ui/Cekmece.tsx`, `ui/Paneller.tsx`, `worker/gorunum.ts`, `data-compiler/src/harita.ts` | 3–4/5 | PR-05 |
| R10 | Üretim ölçeği | `HT`: fabrika, verim, WIP; `ekonomi.ts`: üretim puanı ve çelik/kömür darboğazı | Makine saati, işçilik süresi, ürün reçetesi, enerji, fiziksel adet, kalite ve stok/taşımacılık | `systems/ekonomi.ts`, `state/world.ts`, `catalog.ts`, `systems/lojistik.ts` | 5/5 | PR-01 |
| R11 | Ordu hareketi | `hareketGunu`, rota, yol km, arazi/mevsim, 3× ray hızı; ETA | Bir günde çok kenarlı ilerleme, taşan km'nin korunması, demiryolu yükleme ve kapasite, bölgesel gerçekçilik | `systems/kara.ts`, `systems/lojistik.ts`, `systems/ortak.ts`, `data-compiler/src/harita.ts` | 4–5/5 | PR-03 |
| R12 | Gelişmiş emirler | `hareket`, `saldir`, `dur`, `durus` ve dört duruş; `komutanEmir` | Yarma, kuşatma, geri çekilme, bölge güvenliği, isyan bastırma, harekât planları ve karşılıklı emir iptali | `orders.ts`, `emirEk.ts`, `systems/kara.ts`, `systems/siyaset.ts`, `command/index.ts`, `ui/Cekmece.tsx` | 4/5 | PR-03 |
| R13 | Hava/deniz | Şema 10 `FL/KN` ayrı tablolar; 5 deniz ve 5 hava görevi, üs, menzil, hava kanadı/filo UI | Deniz bölgeleri, ortak taşıma bütçesi, dönemsel kömür/petrol tüketim ayrımı, refit/bakım, karma operasyon planı | `systems/kuvvet.ts`, `systems/deniz.ts`, `systems/lojistik.ts`, `ui/Kuvvetler.tsx`, `decision/index.ts` | 4/5 | PR-06 |

### Kodla doğrulanan öncelikli davranış sorunları

**R11 – hareket:** `systems/kara.ts:37–88` içinde her günde yalnız `y.yol[1]` bir sonraki düğüme geçilir. Mesafe eşiği aşılınca `U.ilerleme[u]=0` yapılır. Dolayısıyla kalan mesafe/ilerleme kaybedilir ve birlik günde en çok bir kenar geçer. Bu, hızlı birlikler ve demiryolu için hissedilir yapısal sınırlama olabilir. `tahminiGun` ise kenar başına günleri `Math.ceil` ile toplar. Bu kaynak kod gözlemi; gerçek hata şiddetinin ölçümü yapılmadı.

**R10 – üretim:** `systems/ekonomi.ts:265–345` üretimi `fabrikaSP` puanına, fabrika payı/verim ve çelik/kömüre bağlar. `HAT_KOL` yalnız `ulke`, `urun`, `fabrika`, `verim`, `wip`, `oncelik` tutar (`state/world.ts:95`). Ayrı tesis işçiliği, makine zamanı, kalite/enerji hesabı yok. Birim gerçekçiliği için önce ürün/hat/tesis ölçeği belirlenmeli.

**R02 – operasyon sonuçları:** `emirEk.ts:421–440` başarılı suikastta meşruiyet/huzur azaltır, ancak `siyasiKisiler.ts` karakterini silmez, öldürmez veya gerçek halefiyet işlemi üretmez. `emirEk.ts:443–460` sabotajda tahkimatı sıfırlar, direnişi artırır; açıklamada fabrika aksaması geçmesine rağmen doğrudan `R.hasar` veya üretim hattı hasarı işlemi görülmez. `iliskiBozma` karşılıklı görüşü sabit 30 puan düşürür; kalıcı ağ ve karşı istihbarat değerlendirmesi yok. Bu, UI metni ile fiili sonuç tutarsızlığıdır.

**R07 – bakan:** `state/world.ts:110–114` beş bakanlık adı ve `C.bakan` bit maskesi tanımlı; `decision/index.ts:77–85` delege edilmiş alanları aylık karar fonksiyonuna verir. `siyasiKisiler.ts:1` açıkça kişilerin takvim/partiden türetildiğini, yeni sütun olmadığını belirtir. Bakan atama gerçek bir kişisel görevlendirme değildir.

**R06 – komutan zaten var:** `ui/Muharebe.tsx:19–60` komutan listesi, `komutanAta` ve daimî emir UI'si; `systems/komutan.ts` canlı `KM` kişiler, kapasite ve deneyim. Yeniden yazılmamalı. Üst ordu/kolordu hiyerarşisi ve birliğin kendi detay ekranındaki atama akışı tamamlanabilir.

**R01 – barış ve anlaşma var:** `systems/diplomasi.ts` içinde `TK.antlasma`, savaş skoru, teklifler, barış türleri var. Ancak `TEKLIF_KOL` alanları `kimden/kime/tur/p1/p2/gun/durum`; v1.7 çok sürümlü/çok turlu taslak, gizlilik, karşı teklif ve şartlı taahhüt için yeni kayıtlar gerektirir.

**R13 – filo/kanat var:** `systems/kuvvet.ts` gemileri filolarda ve uçakları kanatlarda tutar; `systems/deniz.ts` görev, menzil, petrol/yıpranma uygular. `docs/v16/README.md` filo konumlarının ayrı deniz bölgesi değil kıyı bölgeleri olduğunu ve kara/deniz ortak taşıma bütçesinin bulunmadığını bildirir.

**R09 – şehir mi bölge mi:** `ui/Cekmece.tsx` ve `worker/gorunum.ts` seçilen **bölge** için veri gösterir; `data-compiler/harita.ts` şehir merkezlerinden Voronoi bölgeleri üretir. Şartnamedeki bir şehir içinde birden fazla tesis/işletme/personel ve bağımsız `cityId` konusu model değişimidir, yalnız UI sekmesi eklemek değildir.

**1914 olayları:** `data-compiler/src/senaryolar/s1914.ts` Temmuz Krizi, Belçika, Osmanlı'da ittifak/Goeben/Karadeniz/Çanakkale gibi koşullu dalları barındırır; `decision/index.ts` ise genel aylık/haftalık planlara dayanır. v1.7 G01–G05 için uzun vadeli ülke hedef/plan hafızası hâlâ gerekir.

**Android yönü:** `apps/android/android/app/src/main/AndroidManifest.xml` içinde `android:screenOrientation="sensorPortrait"` bulunur; geliştirme dalının manifesti dikey yönü zaten kullanıyor. Eski analizdeki “yatay telefon varsayımı” v1.6.1 koduna uygulanmamalı. Gerçek telefon testi yapılmadığı bildiriliyor.

## C. Önerilen teknik hedef mimari ve değişim sırası

**Korunacak çekirdek:** Tek yazıcılı Worker (`packages/worker/src/sunucu.ts`), emir önizleme/uygulama kontratı (`orders.ts`), aynı doğrulamayı kullanan AI (`decision/index.ts`), sabit nokta aritmetik, deterministik RNG, sürüm kilidi, idempotency ve kayıt/hash. Yeni mekaniklerin UI ile doğrudan dünya durumu değiştirmesine izin verilmemeli.

### PR-00 | Ön hazırlık ve güvenlik bariyeri

- `ccr-949a01d1-3lmfyg` HEAD `9f369...` temel alınır; bu dalın üzerine yeni v1.7 çalışma dalı açılır.
- Başlangıç referansı: `npm run tip && npm run lint && npm test`; 5 senaryoda 365 gün; aynı tohumla save/load/hash; mevcut 70 kabul maddesi.
- İşlem öncesi v1.6.1 için en az 2 kayıt örneği alınır (1914, 2026); v1.7 göç testi için saklanır.
- V1.7'nin 77 maddesi `NOT_RUN`; 48/70 v1.6 kabul bilgisi önceki repo beyanıdır.

### PR-01 | Öncelikli hareket düzeltmesi (R11) — diğer askerî genişletmelerden önce izole uygulanabilir

1. Tek bir `hareketYurut(w,u,rota,gunButcesi)` algoritması tasarla; uygulama ve ETA aynı matematikten türetilsin.
2. Bir günlük kalan km süre bütçesi ikinci/üçüncü kenara aktarılabilsin. Düşman bölgesine giriş, fiili muharebe, boğaz/deniz geçişi, demiryolu yükleme gibi **durma koşullarında** ilerleme durdurulsun.
3. Hız ve mesafe hesabı güvenli tamsayı ile yapılır. Hız sıfır/negatif olamaz; gün içinde en fazla belli sayıda kenar işlenerek sonsuz döngü önlenir.
4. Rota yeniden planlandığında kullanılmayan ilerleme hesabı ve ETA tutarlı olmalı; bir gün içinde iki defa bölge kontrol devri ya da aynı muharebe yapılmamalı.
5. Test: 50km + 50km kenar, 150km/gün birlik uygun koşullarda aynı günde hedefe varabilir; arada düşman varsa muharebeyi atlayamaz; aynı seed+aynı emir => hash eşit.

**Not:** Önce bu sayısal kuralı test etmek, sonrasında 1914 yürüyüş/demiryolu tarihsel hızını kalibre etmek daha güvenlidir.

### PR-02 | Kanonik tesis/üretim ve kaynak defteri (R03+R08+R10)

- Mevcut `R.sivilF`, `R.askeriF` ve `HT` dizilerini göç sırasında silme. Önce yeni `Facility`, `ProductionLine`, `Deposit`, `LocalStock` tablolarını ekle; eski değerlerden deterministik oluştur.
- Tesis = fiziksel üretim yeri; hat = belirli ürünü üreten kapasite; model = araştırma/lisansla açılan ürün; depo = üretilmiş ürünün sahibi ve konumu.
- Aynı kaynağın iki hat tarafından tüketilmesini merkezi kaynak rezervasyonu ile engelle.
- Ürün başına işçi zamanı, makine zamanı, girdi reçetesi, enerji ve üretim verimi üzerinde en dar kapasite etkili olsun.
- Şehir arayüzü ancak bu model oturduktan sonra ayrıntılı tesis gösterebilir.
- Test: çelik 0 iken çelik isteyen ürün 0; işçi 0 veya makine 0 ise 0; yüzde verim artışı yoktan ürün oluşturmaz; göç sonrası fabrika sayısı/kapasite korunur.

### PR-03 | Ekipman/araştırma (R04)

- `Technology` ile `EquipmentModel` ayrılır. 1914 tarih/ülke ve üretim lisansı uygunsa Gewehr 98, SMLE Mk III, MG 08, B.E.2 vb. modeller açılabilir; model katalogu ayrı ID alır.
- Teknoloji tamamlanması doğrudan stok üretmez. Tasarım -> hazırlık -> üretim -> yerel depo -> sevkiyat -> birlik envanteri.
- Mevcut 8 ekipman sınıfı birlik tüketim aileleri olarak korunabilir; model adetleri bu sınıfa dönüştürülürken stok/kalibre kaybı olmamalı.
- Test: başlangıçta var olmayan 1916/1917 modeli otomatik açılmaz; prototip fabrikadan seri çıkış olarak sayılmaz.

### PR-04 | Kara emirleri, komutan, cephe (R05+R06+R12)

- `komutanAta` korunur, ordu/kolordu/cephe komuta katmanı ayrıca eklenir.
- Komutan kapasite bonusu **bir kez** uygulanır. Üst kademe komuta bonusunun tekrar sayılmasına izin verilmez.
- Emirler: `ATTACK`, `DEFEND`, `BREAKTHROUGH`, `ENCIRCLE`, `WITHDRAW`, `GARRISON`, `SECURE`, `SUPPRESS_REBELLION` gibi kararlı durum ve hedef koşullarıyla modellenir. İç güvenlik görevlerinin nüfus/huzur/direniş/moral bedeli de olmalı.
- `state/world.ts` içinde operasyonun kalıcı kimliği, hedefi, bağlı birlikleri ve durum geçişleri; `orders.ts`/`command/index.ts` ile arayüz ve Türkçe komut eşdeğerliği.
- Test: aynı birlik iki eşzamanlı cephede olamaz; savunma emri saldırı otomasyonuyla çakışmaz; komutansız birlik ve emekli komutan kayıtları doğru; muharebe viewer hash'i değiştirmez.

### PR-05 | Diplomasi/istihbarat (R01+R02)

- `TK` ve `A` mevcut tiplerini kaldırma; teklif ve antlaşma için ayrı `Draft/Revision/Clause/Secrecy/Commitment` kimlikleri ekle.
- Gizli madde yalnız yetkili tarafların görünümüne girer. UI ve danışman rakip ülke bilgisini kanonik dünya durumundan izinsiz okumamalı.
- İstihbarat `Agency`, `Network`, `Operation` ve rapor kayıtlarıyla genişler. İleri sonuçlar soyut strateji katmanında kalır.
- Suikast gibi siyasi kişi sonuçları ancak kalıcı siyasi kişiler eklendikten sonra gerçek kişi/halefiyet üzerinden işlenebilir; geçişte mevcut huzur/meşruiyet etkisi korunabilir ama UI metni “lider öldü” diye yanlış söylememeli.
- Sabotaj başarılıysa belirtilen tesis veya altyapı hasarını gerçekten yazmalı; bakım/onarım ve diplomatik risk doğmalı.
- Test: gizli protokol yanlış ülkeye görünmez; çoklu karşı teklif çift uygulanmaz; açıklanan etkiler gerçekleşir; operasyonda başarı/ifşa ve kayıt tekrarı deterministik olur.

### PR-06 | Kalıcı siyasi kişiler/kabine, şehir ve 1914 hedefleri (R07+R09+G01–G05)

- `siyasiKisiler.ts` katalog verisinden kişi kimlikleri üretilir. `Ministry`, `CabinetAssignment`, `PolicyEffect`, `StrategicGoal`, `StrategicPlan` kalıcı tablolara eklenir.
- Mevcut `BAKAN` otomasyonu kişi atamasına bağlanır ama davranış değiştirmeden önce eski bakan bit maskesi göçte korunur.
- Bölge kimliği ile şehir kimliği ayrılır. İlk geçişte her bölgenin ana yerleşimi `cityId` alabilir; diğer şehirler daha sonra eklenir.
- Başlangıç 1914: GER, FRA, GBR, RUS, AUH, OSM için bağımsız hedefler ve en az bir karşılıklı diplomasi zinciri. Dış politika, seferberlik ve savaş amaçları ortak AI planına bağlanır.
- Senaryonun tarihsel olayları yalnız ön koşulları gerçekleşirse tetiklenir; tarihsel sonuç zorlanmaz.

### PR-07 | Deniz/hava ve son kabul (R13)

- Mevcut `FL/KN` tabloları korunur. Liman/deniz alanı, yakıt tipi, bakım, deniz lojistiği ve ortak amfibi taşıma kapasitesi ayrıca eklenir.
- 1914 kömürle çalışan filo petrolsüz kalınca otomatik iptal edilmemeli; petrol/dizel kullanan platform ayrı olmalı.
- Senaryo ve dönem regresyonları: 750/1600 teknoloji uygunsuzluğu; 1914/1939/2026 ikmal ve savaş, petrol dengesi.
- En az 6 tohumla hızlı smoke, 24+ tohumla dengeler, daha uzun stres testleri, Android fiziksel cihaz profili ve 360×800 portre UI kontrolü.

## D. Mevcut testlerin durumu ve doğrulama sınırı

Kaynak: `docs/v16/README.md` ve `docs/v16/kabul-matrisi-v16.csv`:

- Repo belgesine göre 324 otomatik test başarılı; 70 kabul maddesi 48 PASS, 18 PARTIAL, 2 NOT_IMPLEMENTED, 2 NOT_RUN.
- Önemli açıklar: PR-09 ortak kara/deniz taşıma, PR-10 model/prototip, PR-11 kalıcı siyasetçiler, PR-12 ajan ağı, PR-14 kalıcı plan, PR-17 gerçek cihaz.
- Testleri bu rapor oluşturulurken **yeniden çalıştırmadım**: GitHub dosyaları connector üzerinden okunabildi, fakat bütün repository kaynaklarını bu çalışmanın kod çalıştırma ortamına klonlamak mümkün olmadı.
- Kaynak kodunda görülen potansiyel sorun **runtime hata kanıtı** değildir; her biri regresyon testiyle doğrulanmalı.

## E. Uygulamayı bloke eden iki karar

1. **Doğru temel dal:** v1.6.1 kodu `ccr-949a01d1-3lmfyg`; `main` sürüm 1.4.0. Kod değiştirme çalışmasından önce v1.7 çalışma dalı bu commit'ten çıkarılmalı.
2. **Ortak şema/faz sözleşmesi:** R03/R08/R10, R11, R07 ve R01 aynı `world.ts`, emir ve kayıt alanlarını değiştirdiğinden, PR'ler arasında anlaşılmış kimlik, seri hale getirme, göç ve faz sırası olmadan paralel geliştirme yapılmamalı.

## F. Önerdiğim ilk uygulama paketi: hızlı kazanım, düşük kırılma

**İlk teknik uygulama sınırı:** v1.7.0 için (1) hızlı hareket/ETA tutarlılığı, (2) komutan atamasının birlik kartından erişilebilirliği, (3) sabotaj açıklama/etki uyumunun düzeltilmesi, (4) şehir çekmecesi bilgi mimarisi. Bunlar büyük kaynak ve kabine şeması açılmadan mevcut oyuncu deneyimini iyileştirir. Ardından üretim ve rezerv muhasebesi bir sonraki büyük PR olarak yapılmalıdır.

**Tamamlanma tanımı:** Görünür UI + geçerli emir + kanonik simülasyon etkisi + AI kullanımı + `Neden?` açıklaması + kayıt/yükleme + test. Sadece butonun görünmesi veya yeni bir dosya eklenmesi tamamlandı kabul edilmez.

---

### İncelenen kaynakların sabit commit bağlantıları

- [Repo v1.6.1 dalı / `9f369...`](https://github.com/ERK-netizen/tarih-strateji1/tree/9f3694c9af1afae86aa16771bcc5ed458058ee05)
- [Mekanikler / `systems/kara.ts`](https://github.com/ERK-netizen/tarih-strateji1/blob/9f3694c9af1afae86aa16771bcc5ed458058ee05/packages/engine/src/systems/kara.ts)
- [Ekonomi / `systems/ekonomi.ts`](https://github.com/ERK-netizen/tarih-strateji1/blob/9f3694c9af1afae86aa16771bcc5ed458058ee05/packages/engine/src/systems/ekonomi.ts)
- [İstihbarat / `emirEk.ts`](https://github.com/ERK-netizen/tarih-strateji1/blob/9f3694c9af1afae86aa16771bcc5ed458058ee05/packages/engine/src/emirEk.ts)
- [Durum tabloları / `state/world.ts`](https://github.com/ERK-netizen/tarih-strateji1/blob/9f3694c9af1afae86aa16771bcc5ed458058ee05/packages/engine/src/state/world.ts)
- [Komutanlar / `systems/komutan.ts`](https://github.com/ERK-netizen/tarih-strateji1/blob/9f3694c9af1afae86aa16771bcc5ed458058ee05/packages/engine/src/systems/komutan.ts)
- [Donanma/hava / `systems/kuvvet.ts`](https://github.com/ERK-netizen/tarih-strateji1/blob/9f3694c9af1afae86aa16771bcc5ed458058ee05/packages/engine/src/systems/kuvvet.ts)
- [1914 olayları / `s1914.ts`](https://github.com/ERK-netizen/tarih-strateji1/blob/9f3694c9af1afae86aa16771bcc5ed458058ee05/packages/data-compiler/src/senaryolar/s1914.ts)
- [v1.6 kabul raporu](https://github.com/ERK-netizen/tarih-strateji1/blob/9f3694c9af1afae86aa16771bcc5ed458058ee05/docs/v16/README.md)
