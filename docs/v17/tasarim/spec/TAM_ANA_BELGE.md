# TARİH STRATEJİ v1.7 R2 — BÜTÜNLEŞİK GELİŞTİRME DOSYASI

**Tek dosyalık, güncellenmiş tasarım ve teknik uygulama şartnamesi · 14 Kasım 2026**  
**Temel kaynak:** `ERK-netizen/tarih-strateji1`, `ccr-949a01d1-3lmfyg`, SHA `9f3694c9af1afae86aa16771bcc5ed458058ee05`.  
**Durum:** Kod deposuna uygulanmış oyun yaması değildir. Destekleyici 1914 JSON veri paketleri, kabul matrisi ve bağımsız çalışan referans mantığı ZIP içindedir.

**Kapsam:** R01–R13 + G01–G05; 36 kaynak kod/karar bulgusu, 16 ülkeye ilişkin 64 hedef, 36 koşullu 1914 olay adayı, 26 tesis türü, 16 ekipman modeli, 154 kabul testi, 22 sistem etkileşimi ve 13 bağımsız referans mantık testi.

**Öncelikli değişiklik:** Hareketin tek bölge/gün sınırının düzeltilmesi, fiziksel üretim ve kaynak defterinin ayrılması, istihbarat sonuçlarının gerçek siyasi/ekonomik etkilere bağlanması, kalıcı kabine, doğru şema göçü ve AI bilginin gizliliği.

---


---

# TARİH STRATEJİ v1.7 R2 — TEK KANONİK GELİŞTİRME ŞARTNAMESİ

**Ürün:** Türkçe, Android dikey, çevrimdışı, komut öncelikli, tek oyunculu deterministik büyük strateji. Windows geniş ekran olası ikinci istemci; **aynı motor, aynı emir, aynı kayıt**. 750, 1600, 1914, 1939, 2026 senaryoları. Birincil içerik kabul senaryosu **28 Haziran 1914**.

**Değişiklik türü:** İlk v1.7 taslağını ve 13 kullanıcı isteğini tek sözleşmeyle tamamlar. Önceki v1.7 taslağı arşivde bulunur; çelişki durumunda **bu R2 ana şartname + açık veri sözleşmeleri + son karar defteri** geçerlidir. `docs/sartname-v1.4.md` ve K-01…K-55'in korunan mimari ilkelerine aykırı değişiklik gerekirse açık ADR ve göç/test zorunludur.

## 1. Temel tasarım ilkeleri

- Devlet bir coğrafya, siyasi kadro, üretim/lojistik ağı, askerî teşkilat ve uluslararası çıkarlar sistemidir. Tüm oyuncu kararları birden çok alana ölçülebilir, açıklanabilir etki yaratabilir.
- Kolay başlanır, derinleşince açılır: ilk 15 dakika üç önerilen eylem, tek dokunuş hazır emir, devlet strateji kartı; gelişmiş ekranlarda ayrıntılar. Komut çubuğu opsiyonel fakat menülerle aynı emir sözleşmesine bağlıdır.
- **Zaman = oyuncu kararı:** UI onayı, planı iptal, kadro ve politika atamaları anında kaydedilir; yolculuk, istihbarat görevi, araştırma, üretim ve diplomatik yanıt oyun günü ilerleyince yürür. Anlık işlem aynı gün başarım üretmezse oyuncuya `kabul edildi` ve `fiilî işlem tarihi` ayrı gösterilir.
- Tarih, başlangıç koşulu ve kanıtlar sistemidir; yalnız kronolojik olay tetiklemesi değildir. Her olayda en az `precondition`, `option`, `effect`, `counterfactual`, `fallback` ve `cooldown` vardır.
- Tek yazıcı Worker, sabit nokta S=1_000_000, safe integer, anahtarlı RNG, SoA tablolar ve nesil kimlikleri korunur. UI, AI, danışman kanonik dünyaya doğrudan müdahale edemez.
- Gereksinimin tamamlanma tanımı: **kullanıcı hareketi → doğrulama → önizleme → emir → simülasyon → açıklama → AI davranışı → kayıt/göç → kabul testi**.
- Ana strateji oynanışı temel: her yeni alt sistem diğerlerinden bağımsız sonsuz pozitif bonus veremez; kaynak, fırsat, zaman, kamuoyu ve lojistik maliyeti taşır.

## 2. Mevcut doğru temel ve sert uyumluluk koşulları

| Kaynak modül | Korunacak davranış | Yükseltilecek özellik |
|---|---|---|
| `packages/engine/src/state/world.ts` | Kanonik SoA/kimlik ve tablo düzeni; mevcut R/U/C/KM/FL/KN/IR/HT | Ayrı seyrek `Facility/Deposit/LocalStock`, `City`, `Agency/Network/Operation`, `Government/Ministry/Office`, `Goal/Plan`, `TreatyDraft/Clause/Commitment` |
| `packages/engine/src/phases/index.ts` | Günlük P0–P12 sırası ve bütünlük kontrolü | Yeni sistemler için kanıtlı faz kancaları; aynı gün geçmiş fazı yeniden işletmeme |
| `orders.ts`, `emirEk.ts`, `packages/command` | Ortak önizleme/emir motoru; geri çözülen Türkçe komut | Yeni emirler, çakışma sınıfları, gerekçeli ret, otomasyon yetkileri |
| `packages/worker/src/sunucu.ts` | İdari emirler gün atlamaz, idempotency ve sürüm kilidi, otomatik kayıt | Çift onay/yanıt, dayanıklı taahhüt ve çok emir atomikliği |
| `systems/kara.ts`, `systems/lojistik.ts` | Muharebe, rota, kapasite, garnizon, yaralı ve tüketim hesapları | Artan km'yi koruyan çok kenarlı hareket, ETA eşdeğerliği, ortak asker/sivil/donanma taşıma defteri |
| `systems/ekonomi.ts`, `donem.ts` | Mevcut HT/WIP, dönem katalogları, seviye ve araştırma | Gerçekçi tesis/hat/model/girdi/enerji, kapasiteli depolar ve fiziksel üretim |
| `systems/komutan.ts`, `systems/kuvvet.ts` | Kalıcı komutan, filo ve kanat kimlikleri, kapasite ve görevler | Kademeli komuta hiyerarşisi, yakıt türleri, ortak görev ve bakım |
| `systems/diplomasi.ts`, `observe/index.ts` | Mevcut antlaşma, pazarlık, gözlem aralığı | Sürümlü teklif, gizli taahhüt, ajan ağı, bilginin kaynağı ve gizlilik |
| `packages/ui` | Dikey tek çekmece/Canvas; mevcut muharebe viewer | 4 ana sekmeli şehir yönetimi, tavsiyeli hedef ekranı, açık Neden? ve erişilebilirlik |

## 3. Kapsam kilidi ve 13 gereksinim

- **R01 Diplomasi 2.0:** ilişkiler; güvenlik/ittifak; ticaret; kriz/ültimatom; barış; toprak/nüfuz; gizli taahhüt; uluslararası konferans. Çok maddeli sürümlü teklif/karşı teklif ve söz ihlali.
- **R02 İstihbarat 2.0:** istihbarat/karşı istihbarat kurumu; kalıcı soyut ajan ağı; gizlilik, güven, yanlış bilgi, tarihlenmiş aralık raporları; siyasi/diplomatik müdahale; ekonomik/ulaştırma sabotajı; soyut suikast/darbe/isyan girişimleri; kalıcı iyileştirme araştırmaları. Etki, toparlanma ve ifşa maliyeti.
- **R03 Kaynaklar:** demir cevheri, kömür, bakır, petrol, kauçuk, kimyasal girdiler gibi dönem kaynaklarının jeolojik varlığı, çıkarma, işleme, depo, transit, ithalat ve tüketimi. Kömür ve petrol ayrı yakıt hizmetleri. 1914/2026 aynı tüketim profili değildir.
- **R04 Araştırma ve ekipman:** `Technology` ≠ `EquipmentModel`. İsimli tarih/ülke uygun modeller, tasarım/prototip/uygunluk/seri üretim, model varyantı, üretim reçetesi, mühimmat uyumu, depoya sevkiyat.
- **R05 Cephe kararlılığı:** tekil görev/cephe kimliği, muharebe durum makinesi, tutarlı ikmal/organizasyon/yorgunluk, görsel motor ayrımı, aykırı koşul testleri.
- **R06 Komutanlar:** zaten çalışan `komutanAta` korunur; birlik kartı erişimi ve uygunluk, üst karargâh, amiral/hava kadrosu ve bonus çifte sayım koruması.
- **R07 Bakanlıklar:** ülke/dönem rejim kataloğundan kabine; kalıcı siyasi kişi, atama, bakanın uzmanlık/sadakat etkisi, ayrılan bakan, bütçe ve yetki alanı. Mevcut `BAKAN` bit maskesi göçte korunur.
- **R08 Sanayi:** sektör ve ürün bazlı sivil/askerî tesis: maden, çelik, makine, hafif silah, ağır topçu, fişek, rafineri, tersane, uçak/motor vb. Her tesis şehirde ve üretim hattına/çalışanlarına bağlı.
- **R09 Şehir yönetimi:** harita/bölge seçimiyle şehir kartı; Genel, Ekonomi, Askerî, Yönetim ana başlıklarından tüm ilgili işlemler. Şehir ve bölge kimliği ayrımı kesin.
- **R10 Üretim gerçekçiliği:** makine süresi, vardiya, işçilik, enerji, hammadde ve verim darboğazına göre fiziksel adet; WIP kesir kalanı; stok/ünite tutarlılığı; gerçekçi ama oyun dengesiyle uyumlu ölçek.
- **R11 Hareket:** mesafe bazlı çok kenarlı, kesintisiz günlük ilerleme, taşıma seçimi, ray/karayolu/deniz yükleme-boşaltma ve kapasite, tek ETA fonksiyonu, saldırı durdurma kuralı.
- **R12 Ordu emirleri:** savunma, taarruz, yarma, kanat/kıskaç, karşı taarruz, ihtiyat, geri çekilme, garnizon, iç güvenlik ve isyanı yatıştırma; süreli/durum temelli plan ve kamu düzeni maliyetleri.
- **R13 Hava/deniz:** ayrı tekil filolar/kanatlar, dönemsel platform/yakıt/menzil/hasar/görev; deniz alanı ve liman; hava üssü, konvoy, eskort, kıyı/cephe desteği; ortak ulaşım bütçesi.

**G01–G05 ortak katmanlar:** (G01) dinamik ulusal hedefler, (G02) koşullu olay zincirleri, (G03) stratejik plan ve danışman, (G04) hedef odaklı ve bilgi kısıtlı AI, (G05) senaryo hedef/zafer/yenilgi/Kronik/öğretici. Bu beş bileşen R01–R13'ün üstündeki davranış sözleşmesidir; ek bir bağımsız oyun modu değildir.

## 4. En kritik bütünleşik sistem döngüleri

### 4.1. Devletin savaş hazırlığı

Ülke hedefi → kabine politikası / bütçe → teknoloji modeli → maden ve girdi çıkarımı → fabrika hattı → ürün deposu → demiryolu/konvoy kapasitesi → cephe envanteri → muharebe → savaş yorgunluğu → kabine/diplomasi hedef revizyonu.

### 4.2. Gizli diplomasi ve istihbarat

Ulusal hedef → gizli teklif taslağı → muhatap devletin güvenlik ve çıkar hesabı → imzalanan gizli madde → istihbarat ağının sızma denemesi → bilgi güven aralığı → basına/siyasi aktörlere ifşa olayı → ilişki/güven/taahhüt maliyeti → yeni müzakere.

### 4.3. Şehirde kriz ve toparlanma

Casus ağının soyut sabotajı → tesis/ulaşım hasarı → yerel depo/kargo gecikmesi → cephe açığı → belediye/valilik/garnizon ve bakanlık müdahalesi → onarım → yerel huzur, meşruiyet, hazine ve askerî kapasite değişimi.

### 4.4. Alternatif tarih 1914

Saraybosna → Avusturya-Macaristan talepleri → Sırbistan'ın cevabı → Rusya'nın değerlendirmesi → Alman/Fransız seferberliği → Belçika geçiş kararı → İngiltere'nin karar maliyeti → Osmanlı/İtalya/Balkan devletleri için alternatif ittifak seçenekleri. Her adım *koşullu* ve politik/mali/askerî bedellidir; tarih otomatik sonuç yazmaz.

## 5. Açıkça çözülen önemli eksiklikler

1. **Anlık casusluk/sabotajın tutarsızlığı:** Plan/onay anlık; operasyon etkisi P3/P11'de ve tamamlanma zamanında. Ajan ağı yoksa etkiler sınırlıdır. Metinde hasar vaadi varsa gerçek `DamageEvent` yaratılır, aksi halde metin düzeltilir.
2. **Suikast hedefinin soyut olması:** Gerçek siyasi kişi kimliği varsa halefiyet ve iktidar kayması sonucuna bağlanır; yalnız devlet huzurunu azaltan eski davranış ``lider öldü`` diye anlatılmaz.
3. **Petrolün ilk stok bonusu:** Başlangıç stratejik stok senaryo başlatmada bir kez verilir; sıfırlanıp yeniden dolma gibi sonradan tekrarlanan ödül yasaktır.
4. **Üretimde stok çoğaltma:** Rezervasyondan fiziksel tüketim ve tamamlanmış çıktı ile ayrı muhasebe; her işlem için tek `ledgerTxId` ve geriye dönük açıklama.
5. **Hareketin günlük tek düğüm sınırlaması:** Kalan mikrogün taşınır, bir günde birden fazla kenar tamamlanabilir; muharebe, siyasi sınır, kapasite ve tarihî kısıt kontrolü her kenarda yenilenir.
6. **ETA ve gerçek hareket ayrışması:** Aynı saf yol/kenar zaman kuralları kullanılır. Tahmini süre gelecek tehdit/hasar için aralık olabilir; kesin anlık rota hesabı aynı parametrelerle eşleşir.
7. **AI gizli bilgi sızıntısı:** UI ve AI rakip bilgilerinde `observe`/rapor görünümü kullanır, kanonik rakip stoklarını doğrudan hedef seçimi için kullanmaz; test konur.
8. **Bakan/komutan çifte emir:** Emir nesnesinde sorumlu aktör, kaynak kilidi, öncelik ve varsa expires bulunur. Elle emir aynı kaynağı devralır, otomasyon görevi düzgün geri çekilir.
9. **Şehir/bölge karışıklığı:** Bölge atlas geometrisi, şehir idari/üretim düğümüdür. Bir şehir yeni bölge oluşturmaz; v1 bölge göçüyle uyumlu `cityRegionId` bağı taşır.
10. **v1.6/v1.7 eski hash eşitliği yanlışlığı:** *Eski ham hash = yeni ham hash* aranmıyor; eski mantıksal varlıklar ve miktarlar korunur, yeni şemada save/load/replay eşitliği aranır.
11. **Aşırı günlük AI:** Yalnız olayla tetiklenen veya gecikmeli periyotlu plan güncellemesi; cephe AI daha sık, siyasi plan daha seyrek. İşlem bütçesi üst sınırı.
12. **Dönem dışı ekipman ve kurumlar:** `eraAvailability`, `startYear`, `countryOverride`, `doctrine`, `license` kapıları. 750'de uçak/heavy truck oluşamaz; 1914'te varsayılan zırhlı güç 1939 seviyesine çıkamaz.
13. **Tarihsel sonuç dayatma ve düşük içerik:** Her büyük ülkeye karşılıklı hedef/alternatif yükümlülük, küçük ülkelere tür tabanlı hedef jeneratörü; başarı kriterleri görünür, tek zorunlu savaş/ittifak sonucu yok.
14. **Çok fazla P0:** Mutlak blokaj (`P0-Core`), ilk oynanabilir sürüm (`P1-Play`), genişleme (`P2-Depth`) ayrı. Uygulama PR bağımlılıklarıyla sıralanır.
15. **Android ölçümsüzlüğü:** Gerçek telefon P50/P95 gün hesap süresi, yıl atlama süresi, önbellek RSS+WebView renderer PSS, cihaz RAM, GPU+Canvas ve uzun oturum ölçümleri zorunlu; tahmini telefon çarpanları teslim garantisi değildir.
16. **İlk oyuncu deneyimi:** Ulusal hedef ekranı, başlangıçta 3 öneri, emir örnekleri, 1914 kriz ilk 10 dakika akışı ve oyun sonu/yeniden deneme.

## 6. Açık sınırlar, bağımlılık ve kaynak disiplini

- Her yeni kaynak/tesis/ünite/kişi/antlaşma/plan görünür kanonik kimlik ve geçerli dönem/ülke bağlamı taşır.
- Gün içi işlem ve nakliye birimleri kesin tanımlıdır; arayüz ton/adet gösterir, iç motor yalnız güvenli tamsayı kullanır.
- Veri temsili tüm ülkelerde ölçeklenebilir olmalı; boş yerleşimde/tesiste seyrek kayıt; 179 ülkeye her gün 70 operasyon denetimi yapılmaz.
- 1914 örnek ekipman, olay ve bakanlık tarihleri ancak yetkili araştırma kaydıyla `verified` olur; belirsizler `calibration` veya `fictional` etiketli.
- Tarihî suikast, isyan, baskı, sürgün ve kitlesel ihlaller oyun içinde soyut ve insani/diplomatik maliyetlidir; gerçek dünyada yasa dışı yöntem talimatları içerilmez. Yaş derecelendirmesi ve içerik değerlendirmesi sürüm kapısıdır.
- `veri/` JSON örnekleri **normatif şema + başlangıç katalog taslağıdır**, mevcut `packages/data-compiler` veri biçimine birebir uygun olduğuna dair iddia yok. Derleyiciye aktaracak adaptör, veri doğrulama ve kapsamlı test gereklidir.
- `referans_kod/` bağımsız testleri örnek algoritmayı gösterir; gerçek oyun build'inin kanıtı değildir.

## 7. Fazlara göre teslim kapıları

| Kapı | Çıktı | Geçiş şartı |
|---|---|---|
| GATE-0 | Doğru dal ve 324 önceki testin baz ölçümü | repo/şema/hash/devices referansları kaydedilir |
| GATE-1 | Hareket/ETA ve korunum düzeltmeleri | Birlik ışınlanmaz, fazla ilerleme kaybolmaz, aynı gün çok kenar testi |
| GATE-2 | Tesis, maden, yakıt, modeller | Negatif/çift stok yok, üretim boyutu açıklanabilir, eski kayıt göçü |
| GATE-3 | Cephe/emir/komutan/deniz/hava | Tek görev/ikmal/komuta ve muharebe entegrasyonu |
| GATE-4 | Kabine/istihbarat/diplomasi | Gizlilik/halefiyet/taahhütler, AI davranışı ve Neden? |
| GATE-5 | 1914 ülke hedef/kriz akışları | 6 ana ülke uçtan uca, 12+ ülke içerik ve jenerik geri kalan |
| GATE-6 | UI/öğretici/Android/Windows web | Dikey 360×800, erişilebilirlik, kayıt, fiziksel telefon profili |
| GATE-7 | Çoklu tohum ve tüm dönemler | 365 gün + 5/10/25 yıl stres; v1.6 regresyonu; 77 + ek R2 matris PASS |

**Kritik tamamlanma şartı:** R01–R13 + G01–G05 için kanonik dünya etkisi, AI kullanım senaryosu, UI/komut paritesi, farklı dönem kontrolü, kayıt ve ilgili test kanıtı olmadan tam v1.7 yayınlanmaz. Fonksiyonlar tasarlanıp yazılmışsa ama testler geçmemişse `PARTIAL`; taslak doküman `DESIGNED`; kod çalışmıyorsa `NOT_IMPLEMENTED`.

## 8. İlgili belgeler ve kanıtlar

- Mimari/veri ve fazlar: `02_MIMARI_VERI_VE_FAZ_SOZLESMELERI.md`.
- 13 sistemin ayrıntılı mekaniği ve kullanıcı akışları: `03_SISTEM_MEKNIKLERI.md`.
- 1914 ulusal hedef, olay ve alternatif tarih veri şeması: `04_1914_SENARYO_KURALLARI.md`, `veri/`.
- Uygulama, kapı, göç, performans, test ve karar kayıtları: `05_*`, `06_*`, `07_*`.
- Kod inceleme kanıtı: `kaynaklar/v161_v17_Repo_Analiz_Raporu.md` ve `kaynaklar/KAYNAKLAR_VE_KANIT_DUZEYI.md`.



---

# 02 — MİMARİ, VERİ, FAZ VE EMİR SÖZLEŞMELERİ

**Çerçeve:** v1.6.1 `ccr-949a01d1-3lmfyg` SHA `9f3694c9af1afae86aa16771bcc5ed458058ee05`. Aşağıdakiler uygulama sözleşmesi ve önerilen veri tipi adlarıdır; mevcut tip adlarıyla eşleştirilmesi kodlama aşamasında yapılır. SoA `Table` yapısı, `S=1_000_000`, güvenli tamsayı, nesil kimliği (gen × 2²⁰ + slot), tek yazıcı Worker, kanonik hash ve `P0–P12` korunur.

## A. Çekirdek tasarım ve kimlikler

1. **Kimlik alanı:** Tüm yeni tablolara `id` nesil-yuva üzerinden verilir, silinmiş kimlik yeniden kullanıldığında yeni nesil alır; içindeki dış anahtarlar `Table.resolve(id)` ile doğrulanır. Ülke/bölge başlangıç statik indeksleri ayrı kategoridir; `0` gerçek kimlik olabileceği için yokluğu `-1` veya açık `nullable` ile kodlanır.
2. **Tek doğru veri:** Canlı stok için tek `StockAccount`, birliğin teçhizat/stokunda tek `EquipmentInventory`, antlaşmanın sürümünde tek `TreatyRevision`, siyasi koltukta tek `Appointment` kanonik olmalı. Ülke toplamları yalnız ayna/türetilmiş; bütünlükte hesapla.
3. **Seyrek:** Her şehir her ürünü, her ülke her ajanı ve her maden tüm türleri taşımaz. Varlığı olmayan tablo satırı oluşturulmaz. Katalog referansları salt okunur ve versiyonludur.
4. **Kaynak türü/birim:** `ITEM_COUNT` tam adet; `MASS_KG` kilogram; `ENERGY_MJ` ölçekli enerji birimi; `MONEY_MILLI` mevcut altın/hazine ölçeğiyle uyumlu; `LABOR_MIN` işçi-dakika; `MACHINE_MIN` makine-dakika; `FUEL_KG` kilogram. İç hesap SI tam tamsayı ve sabit noktadır. Eski mal/sanayi puanları göçte referans tablolarıyla dönüşür; oyunun nüfus/altın değişimi için tek bir dönüşüm sözleşmesi gerekir.
5. **Birim türü–model:** `equipmentFamilyId` mevcut 8 ekipman ailesine geriye dönük uyumludur; `equipmentModelId` yeni somut üründür. Model kapısı (ülke, yıl, lisans, AR-GE, sanayi hazırlığı), aile istatistik etkileri ve mühimmat/kalibre ayrımı korunur.
6. **Durum/davranış ayrımı:** `world.ts` tablosu durum tutar; `systems/*` saf/yarı-saf kurallar içerir; `orders.ts` niyet doğrular; `decision/index.ts` önizlemeye/uygulamaya emir geçirir; `worker/gorunum.ts` yetkili görünür veri üretir; UI yalnız emir ve görünüm kullanır. `command/index.ts` için geri çözülen Türkçe eşdeğer metin zorunlu.

## B. Yeni tablolar ve kritik sütunlar

| Tablo | Kritik sütunlar | Eski ilişki | Zorunlu invariant |
|---|---|---|---|
| `City` | `regionId, ownerId, nameIndex, kind, cityLevel, populationShareFixed, railNodeId, portNodeId` | `R.kent` ile aşamalı göç | şehir bir bölgede, yaşamayan bölgeye bağlı değil |
| `Deposit` | `cityId/regionId, resourceId, originalReserveKg, remainingKg, gradeFixed, accessibleFixed, mineLevel` | `R.maden`, `pkg.bolgeler[].celik/komur/petrol` | `0≤remaining≤original`, çıkarım rezervden düşer |
| `Facility` | `cityId, ownerId, industryClassId, capacityMachineMin, workforce, powerTypeId, healthFixed, active, slotCost` | `R.sivilF/askeriF` | kurulu kapasite ve slot toplamı uyumlu |
| `ProductionLine` | `facilityId, equipmentModelId, allocationFixed, efficiencyFixed, wipFixed, toolChangeUntilDay, queuePriority` | `HT` | hat yalnız var olan tesis/ürüne bağlı, ayrılan kapasite ≤ tesis |
| `StockAccount` | `locationType, locationId, resourceOrEquipmentId, quantityInteger, reservedInteger, maxCapacityInteger` | ülke `C.celik/komur/petrol/muhimmat`, `w.ekip` | fiziksel stok `≥0`; rezerv `≤stok`; tüketim tek yerde |
| `LedgerTx` | `day, phase, sequenceId, sourceAccountId, targetAccountId, assetId, amount, kind` | yeni işlemler | taşıma/üretim/sarf kaydı eksik çift giriş üretmez; kanonik journal sınırlı |
| `EquipmentModel` | `familyId, nameIndex, eraMinYear, countryMask, techIds, license, recipeId, ammoTypeId, statsFixed` | katalog `EKIPMAN` | bir model bir aileye bağlı; tarihten önce başlangıç envanterine girmez |
| `TransportEdge` | `fromNode, toNode, edgeType, lengthMeter, sharedCapacityKgDay, accessTag, epoch` | `komsuluk`, `kenarKm`, `demiryolu` | mesafe pozitif, erişim dinamik, aşırı rezerv yok |
| `MoveState` | `unitId, routeId, edgeIndex, progressMeter, transportMode, capacityBookingId, haltedReason, lastProcessedDay` | `U.bolge/hedef/sonraki/ilerleme` | iki konum/iki ilerleme yok, aynı gün çift işlem yok |
| `Front/Operation` | `ownerId, goalId, targetRegionId, stance, stage, commanderId, reserveIds, startDay, lastReviewDay` | `U.durus`, `U.hedef` | birlik bir aktif harekâta bağlı, seçili savaş hedefi geçerli |
| `Person` | `countryId, historicIdOrGenerated, roleMask, birthYear, endYear, ideology, attributes, active` | `KM`, `siyasiKisiler` | aynı tarihî kişinin ikilisi yok, görev tarihi ve kişi kimliği tutarlı |
| `Ministry/Appointment` | `countryId, typeId, establishedDay, budgetFixed, ministerPersonId, actingPersonId, policyId, startDay, endDay` | `C.bakan` | koltuk aynı tarih aralığında yetkisiz iki aktif atama taşımaz |
| `Agency/Network/OperationIntel` | `countryId, targetId, capability, secrecy, exposure, phase, expectedResolveDay, reportId` | `IR`, `observe`, eski operasyon emirleri | hiç ağ yoksa ağ etkisi yok; ifşa gizlilikten ayrı olay |
| `TreatyDraft/Revision/Clause/Commitment` | `parties, draftId, revisionNo, status, clauseType, visibilityMask, dueDay, breached` | `TK/AN`, `teklifBolge` | tek revizyon ACTIVE; gizli madde yetkisiz görünmez |
| `NationalGoal/StrategicPlan` | `ownerId, goalType, stage, status, progressFixed, priority, deadlineDay, guardData, targetIds, parentId` | `C.hedefUlke`, olay bayrakları | hedefin ilerlemesi gerçek durumdan türetilir; sonuç zorunlu değil |

**Tasarım kararı:** İleri düzey ürün ve kaynak modelleri bir anda 179 ülkenin bütün kayıtlarını çoğaltmamalı. Ülke toplamları geçiş boyunca eski arayüzde gösterilebilir ama önce yeni ledgere **türetilmiş ayna** olarak hesaplanır; hem eski toplam hem yeni alt hesap aynı gün ayrı ayrı tüketilmez.

## C. Mevcut motorun doğrulanmış gerçek günlük fazları

`packages/engine/src/phases/index.ts` kaynak kodundan:

| Faz | Mevcut sıralama | Yeni mantığın bağlanması |
|---|---|---|
| P0 | Dünya günü artar; bildirim temizlenir | Açık operasyon/taahhütlerin yalnız durum damgası |
| P1 | Ayın 1'inde nüfus/iş/ekonomi/kontrol/siyaset/diplomasi/olay/komutan/istihbarat; yıllık kent | Kabine aylık maliyet, kurum eğitimi, uzun dönem hedef gözden geçirme; önceki ay bütçe kapanışı |
| P2 | Kuyruktaki emirler → AI kararları → komutan daimî emir → filo/kanat hareket | Aktif plan emirleri ve AI; idempotency/manuel öncelik koruması |
| P3 | Diplomatik cevaplar/gerekçe, mod temizliği, deniz üstünlüğü, haftalık deniz/hava/çöküş/demografi | Sürümlü teklif/karşı teklif yanıtları, hazır operasyon çözümü (etki tarihi açık), gizlilik; askeri görevlerin durum kontrolü |
| P4 | Varışlar | Hedef konuma fiziksel stok teslim; sevkiyat muhasebesi ve iki kez varış engeli |
| P5–P6 | İş ölçümü, gıda, sanayi, araştırma, lojistik | Depozit/çıkartma → yerel işleme → üretim/hat → korumalı depo → talep tahsis/transit |
| P7 | Maliye, birlik tüketimi, pazar, yaralı | Yakıt/bakım, fiilî harcama, zararı ve stok çıkışı tek muhasebe |
| P8–P10 | Hareket → muharebe → sonuç/geri çekilme | Çok kenarlı hareket, operasyon durumu, karşılaşma/tekil muharebe kaydı; AI emirleriyle durum kilidi |
| P11 | Olaylar ve durdurma koşulları | Hedef başarı/kriz olayları, söz ihlali, istihbarat sonrası diplomatik geri tepme; *önceki fazlarda gerçekleşmiş üretimi geriye dönük değiştirmez* |
| P12 | Bütünlük → sürüm artışı → kanonik serileştirme/hash → rapor | Ek tablolar için invariant, sayısal kontrol ve yeni şema hash'i |

**Faz geçiş kuralı:** P3'te verilen sabotaj/onarım etkisi aynı gün henüz P5 yapılmadığı için yapılabilir; P11'de sonuçlanan etkiler ertesi gün uygulanmak üzere `PendingEffect` üretmelidir. Olay kararı Worker üzerinden anlık kabul edilebilir ama fiziksel ürün bir önceki faza ışınlanamaz.

## D. Kanonik stok ve çift tüketimden koruma

Her gün `Mining` / `Production` / `Transport` / `Upkeep` farklı işlevlerdir fakat **aynı stok hesabı** üzerinden düşer. İşlem sırası deterministiktir: `phaseOrder → priority → countryId → sourceId → requestId`. Kaynak miktarını düşmeden önce rezerv ve kullanılabilir miktar kontrol edilir. Bütünlük:

```
available = quantity - reserved
0 <= reserved <= quantity <= maxCapacity   (maxCapacity=0 ise sınırsız değil; kapasite yok)
minedKg <= remainingDepositKg
inputConsumedKg >= 0
outputCompletedUnits <= min(machineLimit, laborLimit, energyLimit, eachIngredientLimit) × qualityEff
closing = opening + mined + imports + captured + refunds - consumed - exports - destroyed - deliveredOut
```

Üretim yeni fiziksel çıktı yarattığı için girdiler/çıktılar farklı mal türüdür: aynı **mal türünde** kaynak bilançoları tutmalı; stok sıfırdan silah üretirken toplam adet korunumu değil, reçeteyle **dönüşüm korunumunu** denetlemeli. Depozit çıkartması da stok yaratımıdır ama yer altı rezervinden eşit düşülür. Nakit için üretim maliyeti ve nakliye gideri ayrıca yazılır.

`LedgerTx` bütün gün geçmişini ebediyen saklamak zorunda değildir. Son N gün açıklama kayıtları ayrı halka tamponda tutulur; kanonik `StockAccount` ve özet sayaçlar deterministik muhasebe kanıtıdır. Aynı olay gün içinde iki defa işlenemez. İşlem anahtarı `{day,phase,source,actionId,ordinal}` ve ön koşul `expectedWorldVersion` ile denetlenir.

## E. Hareket ve ETA: tek zaman-mikrobütçesi modeli

**Bulgu:** Mevcut `kara.ts::hareketGunu` tek günde `y.yol[1]` düğümüne geçip artanı sıfırlar. Yeni sözleşme her gün *1.000.000 mikrogün* hareket bütçesi kullanır. Her kenarda hız değişebilir; kullanılabilir hız = tür × mevsim × arazi × ikmal × hasar × ulaşım kipine göre. Fiziksel geçiş için `ceil(mesafeKalanMeter * S / hızMeterPerDay)` mikrogün gerekir. Kalan süre varsa bir sonraki kenara aktarılır. Ancak her kenarda `warAccess`, `transportBooking`, `bridgeDamage`, `battle` kontrolü yapılır.

- Aynı kenar üzerinde kısmi ilerleme kanonik `MoveState.progressMeter` olarak saklanır.
- Günde birden fazla kenar geçilebilir; düşman savunucusunu atlayıp savaşsız geçilemez.
- Normal barış rotası için `eta` aynı kenar ilerletme kuralının yan etkisiz simülasyonunu kullanır. Sonradan değişen savaş, kar, ikmal ve kapasite belirsizlikleri `tahmin` etiketiyle gösterilir.
- Yol algoritmasının eşit maliyetli seçiminde sabit ID sırası vardır. Rota epoch'u (erişim/demiryolu/savaş) değişince önbellek geçersiz.
- Taşıma türü kararı oyun mekaniğiyle zorunlu: kendi kontrollü demiryolunda **ücretsiz otomatik üç kat hız** yerine yükleme/kapasite/yakıt ve tren takviyesi gerekir.
- `moveDay` aynı gün iki defa çalışırsa `lastProcessedDay` kontrolü ikinci etkiyi yasaklar.

## F. Diplomasi/istihbarat ve gizli bilgi

**Teklif durum makinesi:** `DRAFT → PREVIEWED → SENT → (COUNTERED | ACCEPTED | REJECTED | EXPIRED | WITHDRAWN)`; yalnız kabul sonrası `RATIFIED → ACTIVE → (FULFILLED | BREACHED | TERMINATED)`. Özgün taslağın içeriği değişmez; karşı teklif yeni `revisionNo` üretir. Aynı teklif 2 kez uygulanamaz; `seenRevisionIds` ve idempotency korunur.

**Gizlilik:** `Clause.visibilityMask` taraf ve yetkilendirilmiş rapor sahibi bazlıdır. AI yalnız kendi bilgisi/raporunun ihtimal aralığıyla karar verir. Gizli bir protokol `observe` tarafından rapor olarak açığa çıkmadıkça farklı devletin UI/AI/olay listesine düşmez. Zamanlı yanlış bilgi raporlanabilir ancak `true` kanonik dünya değil `belief` üzerinden risk değerlendirilir; kontrollü gizli verinin AI'ya sızması otomatik test hatasıdır.

**Operasyon:** `PLANNED → PREPARING → ACTIVE → RESOLVING → (SUCCESS | PARTIAL | FAILED | EXPOSED) → COOLDOWN`. Aynı ajan ağı sınırsız başarılı operasyon üretmez. Suikast başarısı kalıcı kişi varsa `Person` halefiyete ve kabine etkisine, yoksa yalnız soyut huzur/meşruiyet olayına dönüştürülür; anlatı gerçeğe aykırı olmayacak. İşletme hasarı yazan sabotaj açıklaması gerçekten üretim hasarı/onarım kuyruğu yaratmalıdır. Gerçek dünyaya uygulanabilir operasyon yöntemi ayrıntıları **yasaktır**.

## G. Bakan, ordu ve AI kontrol kilitleri

`OrderIntent` en az `actorCountryId`, `controllerType` (`PLAYER`, `MINISTER`, `COMMANDER`, `AI`), `entityId`, `targetId`, `orderType`, `createdDay`, `lastAppliedDay`, `expiryDay`, `priority`, `overridesOrderId`, `idempotencyKey` taşır. Manuel emir aynı varlığın aynı alandaki otomasyonunu **iptal ederek ya da geçici süreyle bastırarak** tekil kontrol verir. Bakanın atanması/istifası mevcut emri kendiliğinden kopyalamaz.

AI için karar kuralı `GoalScore = strategicValue + regimeInterest + allianceTrust + expectedResource - risk - cost` yalnız **gözlemlenebilir** girdilerle normalize edilir; yasak eylem skorla değil ön koşulla elenir. Devlet 1 ayda bir genel plan yapabilir, olay sonucu erken yeniden planlayabilir; düşman cephesi yalnız gerektiğinde gözlemlenir. Aynı durumdan her gün aynı emir tekrarı için `cooldown`, `hysteresis` ve `lastAppliedDay` gerekir. Komutan kapasite bonusu alt-üst kademede iki kez uygulanmaz.

## H. Kayıt şeması, migration ve hash

Mevcut `serialize/index.ts` **SEMA_SURUM=10**. v1.7 için tek yeni sürüm **11 önerilir**; mühendislik uygulamasında mevcut depo sürümü önce yeniden doğrulanır. Eski şema 5–10 ve eski harita göçü adımları `10` aşamasını geçip **bir kez** `11` dönüşümü uygular. Kaynak/dünya toplamları yeni tablolara dağıtılırken her eski stok yalnız **bir kere** aktarılır: önce yeni nesneler oluşturulur, sonra eski özet alanlar ayna haline getirilir. Çifte sayım için assert vardır.

**Başarı ölçütü:** v1.6.1 snapshot'undan v1.7'ye göçün deterministik tek çıktısı; para/nüfus, hat WIP, gemi/uçak, birlik/komutan varlıkları korunsun; yeni şemada serialize→deserialize→serialize baytları/hash'i eşit; aynı yeni senaryonun seed/emir listesi replay ile eşit. **Şema veya kural değişirken eski ham hash'in yeni hash'e eşit olması aranmaz.**

Göç hata verirse orijinal kayıt dokunulmamış yedekte tutulur ve hata raporu çıkar. Yedek yoksa göç başlatılmaz. Göçte bilinmeyen 1914 petrol/maden rezervi, doğrulanmış tarih verisi yerine `unknown` bırakılabilir; fonksiyon bilinmeyeni kendiliğinden sonsuz stok yapmaz.

## I. Fonksiyon/API sözleşmeleri (önerilen TypeScript şekilleri)

```ts
type StableId = number;
type Micro = number;             // 0..1_000_000, safe integer
type Quantity = number;          // adet veya kanonik kg, birim kataloğa bağlı

type Intent = {
  type: string; countryId: number; actor: 'PLAYER'|'MINISTER'|'COMMANDER'|'AI';
  entityId: StableId; targetId?: StableId;
  expectedWorldVersion: number; idempotencyKey: string;
  issuedDay: number; phaseEarliest: number;
};

type ProductionQuote = {
  facilityId: StableId; lineId: StableId; equipmentModelId: string;
  completionPerDay: number; inputCosts: Record<string, Quantity>;
  limitingFactor: 'machine'|'labor'|'energy'|'input'|'damage'|'licence';
  confidence: 'CERTAIN'|'ESTIMATED';
};

type IntelObservation = {
  observerCountryId: number; targetCountryId: number; observedDay: number;
  signalType: string; lower: number; upper: number;
  reliabilityFixed: Micro; expiresDay: number;
};

type MoveQuote = {
  unitId: StableId; routeEdgeIds: StableId[];
  etaDaysMin: number; etaDaysMax: number; uncertainReasons: string[];
};
```

Bu şekiller doğrudan `World`'e rastgele obje dizisi yapıştırılacağı anlamına gelmez; kullanılacak iç temsil `Table`/SoA olmalı. `idempotencyKey` işleme istek sınırında yaratılır; dünya hash'ine girmesi yalnız kalıcı emrin çifte işlenmesini engelleyen durum gerektiğinde mümkündür.

## J. Anti-bozulma testleri

- Aynı oyuncu emri UI/komut satırından aynı dünya değişikliğini üretir.
- Aynı anda iki üretim hattı 1 kg çeliği ikişer kez tüketemez.
- Deneyimli komutan aynı anda iki uyumsuz komuta kademesinde tam bonus veremez.
- İstihbarat başarısızsa gizli gerçek bilgi UI/AI görünümüne taşınmaz.
- Anlık teklifi kabul etme 1 gün atlatmaz.
- Aynı günü tekrar kesinleştirme aynı stok/sevkiyat/üretim olaylarını ikinci kez işlemez.
- Altı savaş başlatma tohumunda aynı tek tarih sonucu zorunlu değildir; koşullu 1914 olay zinciri kritik koşul bozulursa durur.
- İstasyon kapasitesi 0 iken birlik kâğıt üzerindeki demiryoluyla ışınlanmaz.
- İhlal edilmiş anlaşma ve gizli sızıntı v1.7 kaydından sonra da korunur.
- Android renderer memory ve main-process memory birlikte ölçülür; yalnız Java heap yeterli değildir.



---

# 03 — R01–R13 SİSTEM MEKANİKLERİ VE BÜTÜNLEŞİK OYNANIŞ

Bu bölüm tüm isteklerde ortak **oyuncu eylemi → emir → motor etkisi → AI → arayüz → kabul** biçimini kullanır. Sayısal katsayılar denge başlangıç varsayımıdır; tarihsel kesin veri olarak tanıtılmaz. Oyun içi tüm kararlar çevrimdışı ve Türkçedir.

## R01. Diplomasi 2.0 — Teklif değil, karşılıklı söz ve maliyet

**Menü:** İlişkiler / İttifak ve Savunma / Ticaret ve Finans / Kriz ve Ültimatom / Savaş ve Barış / Toprak ve Nüfuz / Gizli Diplomasi / Konferanslar. Ülke kartı bir bakışta ilişki, güvenilirlik, savaş tutumu, aktif antlaşma, ikili tehdit, görünür hedefler, teklif yapabilme gerekçesini gösterir.

**Eylemler:** Elçi gönder, protesto, sınır güvence teklifi, müşterek tatbikat, askerî geçiş, tarafsızlık, borç/kredi, ticaret kotası, ekipman yardım anlaşması, transit garantisi, ittifak, ültimatom, toprak devri, çok maddeli barış, savaş tazminatı, silahsızlandırma şartı, gizli tarafsızlık ve gizli toprak vaadi. Şart koşullu taahhüt: `ifWarWith`, `deliverEquipmentBy`, `transferRegionOnVictory`; süre/ceza açıkça kaydedilir.

**İşlem:** Hazırlanan teklif `draftId`; maddeler `clauseId`; revizyon `revisionNo`. Önizleme toplam bedeli, hukuki/oyun içi uygulanabilirliği, üçüncü ülke tepkisini ve belirsiz kabul değerlendirmesini gösterir. Send -> P3 AI karşı teklif/yanıt; oyuncuya gelen cevap aynı gün anında onaylanabilir. Gizli protokol yalnız taraflarca görülür, ağ sızmasıyla keşfedilebilir; bilinmeyen gizli madde üçüncü taraf AI skoruna giremez.

**Denge:** Ültimatomu sürekli tekrarlamak bedelsiz baskı üretmez: diplomat kapasitesi, güvenilirlik, tekrar cezası, diplomatik yorgunluk. Başarısız gizli söz üçüncü devletlerle uzun vadeli güven kaybı oluşturur. İşgal edilen toprak için barış antlaşması gereksinimleri mevcut savaş skoru kurallarıyla uyumlu. Çoklu barış taslağının bir maddesi geçersizse atomik ret.

**1914 örneği:** Almanya Belçika'nın tarafsızlığını tanıyabilir; buna karşılık batı harekât rotası ve zaman maliyeti değişebilir. İtalya tarafsızlık karşılığında ekonomik teklif veya toprak vaadi müzakere edebilir; vaat yerine getirilmezse yeni siyasi kriz oluşur.

**Done:** UI ve Türkçe komut ikisi de aynı `OfferIntent` üretir; sürüm geri gönderme, onay, ihlal ve gizli görünürlük testleri PASS. Ana dosyalar `systems/diplomasi.ts`, `emirEk.ts`, `decision/index.ts`, `worker/gorunum.ts`.

## R02. İstihbarat 2.0 — Ajans, ağ, keşif, karşı istihbarat

**Yapı:** Ülke `Agency` (dış, askerî, diplomatik, iç/karşı), `Network` (hedef ülke/şehir, güven, erişim, gizlilik, bakım, risk), `Mission` (görev türü ve çözülme günü), `IntelReport` (gözlem günü, aralık, güven ve rapor kaynağı). Ağın yeteneği personel, bütçe, kurum ve araştırmalarla kademeli gelişir; tek komuttan sonsuz bonus elde edilmez.

**Gelişmeler:** Şifreleme/çözümleme, diplomatik ağ, sınırlı hava keşfi, harita analiz personeli, karşı istihbarat ve saha güvenliği. 750/1600/1914/1939/2026 için yetenek adları ve etkileri değişir; modern siber yetenek 1914'e otomatik aktarılmaz.

**Görev menüsü:** Hazine/ordu/teknoloji/ekonomi bilgisi; cephe keşfi; gizli anlaşma hakkında şüphe; karşı istihbarat; soyut siyasi etki; iki ülke arasında görüş zayıflatma; üretim/ulaştırma aksaması; suikast girişimi; hükümet krizini destekleme; iç isyan/direniş üzerinde dolaylı etki. Olası sonuçlar `SUCCESS/PARTIAL/FAIL/EXPOSED/MISATTRIBUTED`. Süre, maliyet, güven ve siyasi/diplomatik tepki olasılıkları ayrı. UI işlemi geri dönülmez diye gösterirse bunu gerçek hazırlık aşamasıyla tutarlı yapmalı.

**Gerçekleşme:** Bir sabotaj bir yerel `Damage` kaydı (tesise/ulaşım kenarına) üretir; onarım süresi, tamir kaynağı, geçici ekonomik kayıp ve olay kaydı hesaplanır. Sonuç yalnız `tahkimat=0` ile sınırlanmaz. Başarılı suikast varsa gerçek `Person` halefiyeti tetikler; kalıcı siyasi kişi henüz oluşturulmamışsa yalnız istikrar olayı yaratılır ve *lider öldü* yazılmaz. İlişki bozma iki devletin görüşünü doğrudan ve garanti olarak `-30` yapmaktan çıkar; kaynak güvenliği ve uluslararası ifşa sonucu çoğunlukla belirsizdir.

**Güvenlik:** Operasyonlar oyuncuya stratejik soyutlukta sunulur; gerçek sabotaj ve suikast teknikleri, hedef listeleri ve yöntemleri hiçbir metne, örnek koda veya olay verisine yazılmaz. Sivil sonuçlar, meşruiyet ve diplomatik bedel görünürdür.

**Done:** Oyuncu/AI gizli bilgiyi yalnız yetkili raporla okur; kalıcı ağlar save/load ile kaybolmaz; sonuç metni gerçek hasar/kayıp ile eşleşir. Ana dosyalar `observe/index.ts`, `emirEk.ts`, `world.ts`.

## R03. Maden, kaynak, kömür, petrol, yakıt ve enerji

**Kaynak zinciri:** yer altı rezervi → çıkarım (cevher) → demiryolu/nehir/deniz taşınması → döküm/rafineri/kimya → üretim hattı → şehir deposu → ticaret veya askerî ikmal. Kaynaklar fiziksel birimle saklanır. Cevher/işlenmiş çelik aynı stok değildir; ham petrol/rafine yakıt da ayrı. Kükürt/nitrat ve kimyasal üretim mühimmat reçetesine, bakır elektrik ve cephane girdilerine bağlanabilir. 1914 için aşırı detaylı 100 ürün yerine 10–15 temel akışla başlanabilir, izleme ve birim tutarlılığı korunur.

**1914 özel:** Kömür özellikle sanayi, demiryolu, buharlı gemiler için temel; ham petrol giderek motorlu araçlar, uçaklar, belirli deniz sınıfları ve kimya için önem kazanır. Motorun `gemiTipi.yakitTuru` katalogu zorunlu: kömürlü gemide petrol yokluğu aynı etkide uygulanmaz. İngiliz deniz lojistiği, Rus demiryolu, Osmanlı sanayi ve petrol erişimi ülke özelinde başlangıç verisine dayanır.

**Kaynak mekaniği:** `ReserveKg` sıfıra indikçe üretim azalır; çıkarım hızı makine/işçi/ulaşım/cevher kalitesinden etkilenir. Jeolojik veri bilinmiyorsa `unverified` kalite etiketi; uydurulmuş sonsuz kömür yok. `daysOfSupply = availableFuel / dailyConsumption` UI'de görünür. Import ve blokaj yalnız fiyatı değil gelen sevkiyatın fiilî varışını etkiler.

**Done:** Rezerv sıfırda maden üretimi sıfır; kömür eksiği uygun gemi ve trenleri; rafine yakıt eksiği uygun araçları etkiler; stok ve WIP negatifleşmez.

## R04. Araştırma, isimli ekipman ve gerçek kullanım

**Aşamalar:** araştırma yuvası / teknoloji yeteneği → model veya lisans açılır → tasarım/prototip (bir örnek veya küçük parti) → üretim hazırlığı (hat dönüşümü) → seri üretim → depo → sevkiyat → birliğin envanteri. Modelin ülkeye ait adı ve alternatif isimleri UI/komut kataloğunda tanınır.

**Örnek (tarih kapılı):** Gewehr 98, SMLE Mk III, MG 08, 7.7 cm FK 96 n.A., 75 mm mle 1897, B.E.2, Etrich Taube; 1915 Fokker E.I, 1916 Mark I, 1917 Renault FT gibi modeller 1914 başlangıç stoku değildir. Alternatif tarihte erken açma için bütçe, teknik ön şart, başarısız prototip, üretim yetkinliği maliyeti gerekir.

**Etkiler:** Silah modeli güvenilirlik, atış gücü, ağırlık, bakım/mühimmat türü ve üretim zorluğuna bağlıdır. Araştırma tamamlandığında ekipman stoku otomatik yükselmez; mevcut ekipmanın modelden gelmeyen eski aile toplamları migration sırasında akıllıca dağıtılır, yeni modele iki kez yazılmaz.

**Done:** Adlı silah üretilebilir, sayılır, taşınır ve birlik savaş değerini etkiler. 750/1600/1939/2026 dönem kapıları test edilir.

## R05. Cephe savaş kararlılığı

**Savaş birimleri:** `Unit`, `Front`, `Operation`, `BattleEvent`; operasyon `PLANNED/ASSEMBLING/PREPARING/ENGAGED/ADVANCING/HALTED/WITHDRAWING/REORGANIZING/COMPLETE/CANCELLED`. Her evrede ön koşul, kaynak tüketimi, otomatik durdurma nedeni ve oyuncuya dönük rapor vardır.

**Hesap:** Cephe genişliği, savunma doktrini, tahkimat, arazi, ikmal, yorgunluk, moral, komutan deneyimi, topçu/mühimmat, keşif, hava desteği. Önce `battleContext` yalnız bir defa oluşturulur, muharebe motoru bir kesin sonuç verir. Canvas replay bunu görselleştirir; yeniden RNG çekmez. Savaş esnasında emir değişirse etki takvim ve yeniden organizasyon süresiyle olur.

**1914 denge:** Almanya'nın 1915 erken gerilemesi keyfî bonusla düzeltilmez. Rus seferberlik takvimi, Almanya'nın iki cephe kuvvet tahsisi, Belçika ikmal rotaları, Fransız birlikleri ve Avusturya-Macaristan savaş yükü ayrı duyarlılık testlerinden geçer. Sonuç çeşitliliği korunur; her tohumda aynı tarihsel teslim şart değildir.

**Done:** Sıfır ikmalle sınırsız saldırı yok; çift muharebe yok; birlik yoktan doğup silinmez; `Neden?` ana beş sebebi gösterir.

## R06. Komutan atama ve karargâh

**Mevcut:** `komutanAta`, kalıcı KM, kapasite, saldırı/savunma ve ikmal bonusu, komutan emirleri. **Yeniden yazmak yasak.** Birlik kartından `Komutan ata/değiştir/ayır` kısa yolu; uygun aday listesi. Kolordu/ordu/cephe karargâhı opsiyonel üst seviye; doğrudan birlik komutanının etkisiyle üst karargâh bonusu aynı özellikte iki kez eklenmemeli. `commandCap` ve komuta menzili.

**Atama:** aktif kişi, ülke, tarih, rütbe/branş, komuta yükü, görev çatışması; atama anlık kaydedilir, fiziksel devir gerekli ise bekleme etkisi. Komutan ölür/ayrılırsa birliğin ID'si korunur ve vekil komuta sonucu üretilir. Donanma amirali/hava komutanı ile kara hiyerarşisi aynı rol katalogunda ama ayrı uygunluk koşulları.

**Done:** `komutanAta` ve doğrudan birlik kartı aynı emir nesnesi; aşırı yükte etkisi seyrelir; kayıt ve replay korunur.

## R07. Bakanlık, siyasi kişi ve kararın gerçek devlet etkisi

**Yapı:** Ülkeye/döneme uygun kurum kataloğu; Bakanlık kurma/kaldırma, Bakan ata/görevden al, bütçe belirle, hedef politika seç, yetki devret, müsteşar/vekâlet ataması. Her 1914 ülkesinde aynı modern bakanlıklar otomatik açılmaz. Ekonomi/araştırma/üretim/ordu/inşa `BAKAN` bit maskesi mevcut delege otomasyonuna bağlanır. Yeni `Ministry` ve `Appointment` aktif kişi kaydı eklenir.

**Personel:** Ad, doğum/görev dönemi, uzmanlık (1–10), ideoloji, sadakat, itibarı, geçmiş makam, reform eğilimi, yetkinlik; tarihî olmayan alternatif kişi `fictional` etiketi. Bakan başarı bonusları üstten sınırlı, görevden almanın siyasi maliyeti var. Siyasi kişiler komutanlarla aynı genel kişi sözleşmesine sahip olabilir; bir kişi gereksizce iki kez oluşmaz.

**Örnek:** Harbiye bütçesi kurmay yetiştirmeyi ve seferberliği; Ulaştırma bütçesi tren/onarımı; Maliye bütçesi vergi tahsilini etkiler. Bakanın etkisi kurum kapasitesine bağımlıdır, maaş/kurumsal işgücü yoksa mükemmel kişi bile anında mucize yaratmaz.

**Done:** `bakanAta` kadro değişikliği ülke karar sistemini ve maliyetleri gerçekten etkiler; hükümet düşerse kabine değişir; UI ve `Neden?` sonuçları doğru.

## R08. Türlü ve isimli sivil/askerî sanayi

**Sivil:** tarım/gıda işleme, tekstil, kömür, demir cevheri, petrol, rafineri, çelik, bakır/metal, kimya, makine, elektrik, demiryolu atölyesi, inşaat, sivil tersane. **Askerî:** hafif silah, makineli tüfek, küçük/büyük mühimmat, top döküm, askerî araç, uçak gövde/motor, gemi yapımı, denizaltı, bakım/onarım. Her tesisin `type`, `capacity`, `workforce`, `machineTime`, `energyType`, `lines`, `damage`, `slotCost`, `cityId`, `displayName`, `confidence` alanları vardır.

**Göç:** mevcut şehir sivil/askerî sayıları ve ulusal HT hatları kaybolmaz. Tesis ve hat dağıtımı deterministic kural ve ülke/bölge indeksine göre yapılır. 1 eski fabrika bir tesis seviyesine çevrilebilir; ancak *tarihsel fabrika adı veya kapasitesi doğrulanmadan* gerçek tesis sayısına eşitlenmez. Sivil/askerî dönüşüm zamanı ve yeniden takım maliyeti taşır.

**Done:** Oyuncu şehir panelinde gerçek tür ve isim görür, hattını yönetir; tek tesis aynı anda kapasitesini aşamaz.

## R09. Şehir komuta merkezi

**Dikey ekran düzeni:** Haritada şehre/bölgeye dokun → özet kart (nüfus, huzur, kaynak açığı, tesis, depo, garnizon, ulaşım, olay). İlk satır dört sekme: **Genel / Ekonomi / Askerî / Yönetim**; alt sekmeler bağlamsal. Genel: krizler, hedefler, tarihçe; Ekonomi: fabrika-maden-üretim, inşaat, depo/ticaret; Askerî: garnizon, birlik, komutan, istihkâm, ikmal, üs/liman; Yönetim: vergi, kamu düzeni, valilik, bakanlık etkileri, diplomasi/istihbarat raporu (izinli).

**Komut paritesi:** Her kartta eylem `onizle()` ile önce maliyet/sonuç/ETA gösterir; eşdeğer Türkçe komut vardır. Seçili şehir ve bölgenin ayrımı açıkça yazılır. `cityId` ile `regionId` farklı ID kategorisi; mevcut `R.kent` bölge düzeyine ait olabilir, ilk aşamada her bölge bir ana şehir alır.

**UI sınırı:** 360×800 hedefinde klavye açıkken eylemler gizlenmez; alt çekmece kayar, erişilebilir buton alanı/odak ve Android geri tuşu çalışır. UI hiçbir zaman doğrudan `World` değiştirmez.

## R10. Üretim miktarı ve seri üretim

**Fiziksel kapasite:**

```
machineLimit = floor(availableMachineMinutes / unitMachineMinutes)
laborLimit = floor(availableLaborMinutes / unitLaborMinutes)
energyLimit = floor(availableEnergy / energyPerUnit)
inputLimit = min(each floor(availableInput / recipeInputPerUnit))
grossUnits = min(machineLimit,laborLimit,energyLimit,inputLimit)
completed = floor((grossUnits × productivityFixed)/S + carryWorkInProgress)
```

`completed` yalnız doğru miktarda girdi gerçekten tüketildikten sonra depoya girer. Üretim için kesirli iş/kalite varsa `WIP` fiziksel tamamlanmamış iş ve kalıntıyı saklar. Ürün başına iş/zaman birimleri tek ve açık. Verimlilik 0–100% için hangi aşamada uygulandığı sabitlenir (iki kez bonus yasak). Bir tesis yüksek kapasiteyle aylık 1.000 tüfekten çok üretebilir; ama **her fabrika için tek evrensel sayı belirlenmez**. Tarihsel örnekler fabrika büyüklüğü/işgücü/tarih koşuluyla kalibre edilir.

**Üretim ekranı:** Günde/ayda tahmini gerçek adet, hat verimi, işçi, makine, çelik, enerji, stok günleri, üretimi kısıtlayan ilk üç neden; karşılaştırmalı `önce/sonra` seri üretim araştırması.

**Done:** Seri üretim bonusu işçi/çelik sıfırken çıktı yaratmaz; stok ve tüketim ledger toplamları eşleşir; sıfır makineli hat üretmez.

## R11. Gerçekçi şehirler arası hareket ve lojistik

**Eylem:** Birliği veya orduyu seç → hareket/taarruz hedefi → rota önizlemesi (km, ikmal, yükleme, tahmini gün, risk). Oyuncu `yaya`, `demiryolu` (uygunsa), `deniz taşıması` kiplerini seçebilir; AI aynı maliyet hesabını kullanır.

**Mekanizma:** Rota katmanları var olan bölge komşuluğunu korur; yeni `TransportEdge` topolojisi ayrı katmandır. Birden çok kenar aynı oyun gününde kat edilebilir ve kalan gün bir sonraki kenara taşınır; muharebe ve geçiş hakkı her kenarda denetlenir. Demiryolu kapasitesi işgal, köprü, istasyon, askerî/sivil talep ve aktarmalardan etkilenir. `tahminiGun()` ile `hareketGunu()` aynı saf kenar geçiş/mesafe hesabını kullanmalı.

**Done:** 50 + 50 km iki komşu kenarda 150 km/gün barış dönemi birlik bir gün içinde tamamlayabilir; düşman savunması var ise bunu atlayamaz; ray doluysa bekler veya alternatife geçer.

## R12. Orduya taktik değil, büyük strateji emirleri

**Emir menüsü:** Taarruz; Savunma; Cepheyi tut; Yarma; Kuşatma/kanat çevir; Karşı taarruz; İhtiyat; Yeniden organize ol; Geri çekil; Garnizon; Bölgeyi sükûnete kavuştur; İsyanı bastır; Demiryolu koru; Liman/konvoyu koru; Keşif; Seferberlik.

Her emir tek `Operation` planı açar ve alt emirleri varlığa bağlar; operasyona gerekli koşullar (`front`, `minAmmo`, `minSupply`, `reserve`, `target`, `commander`, `cooldown`) girer. Oyuncu planı iptal edince kaynak rezervleri çözülür, fiziksel harcanmış malzeme geri gelmez. Sivil güvenlik eylemleri sivil nüfusu otomatik askerî hedef yapmaz; hukuk/meşruiyet/direniş ve ekonomik maliyetler gösterilir.

**AI:** stratejik hedef → operasyon düzeyi karar → birliklere dağıtım. Her birliğe her gün rastgele yeni hedef verme yok; yeni olay ve seferberlik/cephe koşulu sonrası plan güncellenir.

**Done:** Çakışan emir üst üste binmez, kalıcı emir ve komutan duruşu tutarlı; önizleme ETA ve risk; AI aynı doğrulayıcıdan geçer.

## R13. Deniz ve hava kuvvetleri 2.0

**Mevcut:** ülke toplamından bağımsız `FL` filo ve `KN` hava kanadı, görevler, menzil/üs/seyir, bakım/hava desteği. **Silinmeyecek.**

**Yeni katman:** adlandırılmış deniz alanları ve limanlar; filo grubu (amiral, görev, geçerli liman, yakıt tipi, seyir rotası, onarım); hava kanadı grubu (üs, kapasite, sortiler, yorgunluk, menzil, hava durumu, personel); ticaret konvoyu/askerî nakliye ortak taşıma bütçesi; çıkarma operasyonu; kıyı topçu desteği. Gemi siparişi tersane kızak/bileşen/ekipman üretimiyle gerçekleşir.

**Dönem:** 1914'te kıyı ve deniz keşif/erken avcı görevleri sınırlı; 1939 hava üstünlüğü ve bombalama belirgin, 2026 radar/füze farklı. Kömürlü filo yakıt tüketimi petrol talebine bağlanmaz; sınıf başına yakıt tüketimi.

**Done:** Aynı gemi iki filoda yok, aynı kanat iki görevde yok; kısmi üs yakıtında operasyon kapasitesi azalır; limandaki filo denizde muharebeye yazılmaz; amfibi harekât nakliye kapasitesi olmadan çalışmaz.

---

## G01–G05. Bütün mekanikleri birleştiren 1914 stratejik oynanış

**G01 Ulusal hedef:** her devlet 3–5 aday; `historical`, `revisionist`, `economic`, `survival`, `neutrality` kategorileri. Hedefler tek tarih sonucuna kilitlenmez; görünür ilerleme ve risk/maliyet taşır; hedef iptal ve değiştirme bedeli vardır.

**G02 Olaylar:** tarih penceresi + bayrak/savaş/egemenlik/ilişki/yorgunluk/ekonomi ön koşulu. Tarih geldi diye devlet savaşa sokulmaz; alternatif cevap dalları vardır. Olayın seçeneği `emitCommand`/`applyModifier`/`scheduleNextEvent` olarak tasarlanır ve mevcut emir doğrulamasından kaçmaz.

**G03 Stratejik plan:** kullanıcı `Fransa'yı sınırda tut; Belçika'ya girme` gibi amaç söyler → danışman plan taslağı ve bağımlılıkları verir → aynı anda karşılıklı çelişen operasyonları uyarır → onaylanan plan alt emirleri P2'ye taşır. Planın geri planlaması gerekir.

**G04 Devlet AI:** ülkeye özgü çıkar/fırsat/risk/karar yeteneği; rakip hakkında yalnız bilinen bilgi; tarihsel karakter tercihlerini *eğilim* olarak görür, zorunlu tarih yolu değildir. AI hedef değişiminde 7–30 gün histerezis; acil seferberlik ayrı.

**G05 Hedef/oyun sonu:** serbest sandbox dışında ülke hedefleri, puan (güvenlik/refah/diplomasi/teknoloji/toprak); zafer, stratejik kayıp, rejim değişikliği ve savaş sonrası devam seçenekleri. `Kronik` oyuncunun seçimlerini olay metni + veri olarak anlatır, gerçek tarih diye sunmaz. İlk 15 dakika 1914 seçilebilir küçük ülke, önerilen üç hareket ve varsayılan eğitim modu.

**Entegrasyon testi:** Aynı ülke diplomatik tarafsızlık hedefi seçince AI seferberlik/doğrudan saldırı planını gözden geçirebilmeli, yeni sözleşmeler ve askerî lojistik hesapları değişmeli, AI aynı anda tarafsızlık anlaşmasını imzalayıp saldırı başlatmamalı.



---

# 04 — 1914 KAMPANYASI: DİNAMİK DEVLET HEDEFLERİ, KRİZLER, ALTERNATİF TARİH

**Başlangıç:** 28 Haziran 1914. Mevcut `packages/data-compiler/src/senaryolar/s1914.ts` esas alınır; olaylar silinmez, doğrulanmış mevcut zincir yeni ulusal hedef ve diplomasi kurallarına uyarlanır. Katalog JSON dosyaları başlangıç tasarımıdır, oyunun halihazırdaki derleyicisine doğrudan yapıştırılamaz. Adaptör gereklidir.

## 1. Oynanışta amaçlanan farklılık

Bir devlet **sadece tarihî düşmanına savaş açmayı** istemez. Aynı anda güvenlik, itibar, toprak ve nüfuz, sanayileşme, ittifak güveni, siyasi istikrar, diplomatik serbestlik hedeflerine sahip olabilir. Oyun bir amaca ulaşmanın çoklu yolunu sağlamalı: savaşa girmek, tehdit altında kalmak, kısmi taviz, ekonomik yatırım, ittifakı yeniden kurmak, barış konferansı, tarafsızlık ve anayasal/siyasi reform.

**Ülke hedefi beş alan içerir:** (1) gerekçeli amaç, (2) etkinleşme koşulları, (3) ölçülebilir başarı ve aşamalar, (4) karşıt hedef/oyuncu tercihleri, (5) maliyet ve kayıp halinde yeniden plan. Dinamik skor aynı bilgi seviyesiyle oyuncu/AI için uygulanır, ancak AI rakip gizli devrelerini doğrudan bilmez.

## 2. Ülkelere özel stratejik hedef örnekleri

| Ülke | Güvenlik ve diplomasi | Ekonomi/ordu | Alternatif tarih amacı |
|---|---|---|---|
| Almanya (`GER`) | Fransa–Rusya iki cephe baskısını yönet, Britanya'yla savaşı sınırlama | Ren sanayi/Prusya demiryolu, cephe ikmali, deniz/abluka | Belçika tarafsızlığını koruyarak farklı batı stratejisi; Rusya'yla ayrı barış |
| Fransa (`FRA`) | sınır güvenliği, Rus ittifak güveni | topçu ve demiryolu seferberliği | Alsas-Loren iddiasında diplomatik çözüm veya ihtilafı yönetme |
| Britanya (`GBR`) | Belçika garantisi ve kıta dengesi, donanma güvenliği | abluka/konvoy/asker gönderme bütçesi | silahlı tarafsızlık veya arabuluculuk, maliyetli alternatif |
| Rusya (`RUS`) | Sırbistan'ı destekleme riski, sınır güvenliği | seferberlik/demiryolu, gıda ve siyasal istikrar | diplomatik yatıştırma ve iç reform ya da erken savaş |
| Avusturya-Macaristan (`AUH`) | Sırbistan krizi ve çok uluslu monarşi | iki cephe kuvvet ve kamu düzeni | taleplerde geri adım/reform, savaş dışı anlaşma |
| Osmanlı (`OSM`) | Boğazların güvenliği, Avrupa bloklarıyla ilişkiler | borç, demiryolu, ordu modernizasyonu, donanma | uzun tarafsızlık, İtilaf'la anlaşma, Almanya'yla koşullu ittifak |
| Sırbistan (`SRB`) | bağımsızlığı ve bölgesel güvenlik | lojistik ve seferberlik | Avusturya taleplerinin bir bölümünü kabul edip krizi sınırlama |
| Belçika (`BEL`) | egemenlik/garanti | savunma, tahkimat | güvence ve geçiş müzakeresi, savaş dışı çözüm |
| İtalya (`ITA`) | ittifak sözleşmeleri, tarafsızlık pazarlığı | kuzey sanayi, seferberlik | farklı blok, koşullu tarafsızlık, toprak/ekonomi pazarlığı |
| Bulgaristan (`BUL`) | Balkan sınırları, bölgesel denge | askeri ikmal | tarafsızlık, karşılıklı bölgesel anlaşma veya savaşa katılım |
| Romanya (`ROM`) | Transilvanya/Besarabya çıkarlarının dengesi | petrol ihracatı, seferberlik | savaş dışı ekonomi/güvenlik garantisi veya blok tercihi |
| Japonya (`JAP`) | Pasifik çıkarları, Britanya bağı | donanma ve ticaret | savaş dışı garanti, sınırlı müdahale, bölgesel pazarlık |
| ABD (`USA`) | tarafsız ticaret/deniz güvenliği | sanayi, ihracat, siyasi destek | savaş dışı kalma, arabuluculuk veya koşullu müdahale |
| Yunanistan (`GRE`) | bölgesel denge, tarafsızlık | donanma/limanlar | farklı yönetim ve blok tercihi |
| Hollanda (`NLD`) | tarafsızlık/liman ticareti | ticaret ve deniz güzergâhı | iki blokla ilişkileri dengede tutma |
| İsveç (`SWE`) | tarafsızlık ve Baltık güvenliği | demir cevheri/taşıma | tarafsız sanayi gücü, farklı ticaret dengesi |

**Dikkat:** Hedefler *oyun stratejisi önerileri*dir; örnek JSON'daki statü `design_proposal`. Her ülkenin tarihî lider, devlet ideolojisi, bölge/teklif tutarlılığı ayrıca kontrol edilir. Çıktı mutlak sınır kazanımı/teslim tarihi hedeflemez.

## 3. Teknik hedef şeması

```
NationalGoal {
 id: string; country: CountryCode; category: GoalCategory; titleTr: string;
 priorityWeight: int; earliestDay: date; expirationDay?: date;
 activation: Predicate[]; success: Predicate[]; fail?: Predicate[];
 alternatePaths: {id: string; titleTr: string; actionTags: string[]; costs: string[]}[];
 aiHints: {aggressiveness?: int; diplomaticRisk?: int; preferNeutrality?: int};
 stages: {id: string; progressMetric: string; completionThreshold: int}[];
 rewardTags: string[]; tradeoffTags: string[]; sourceStatus: 'historical_anchor'|'calibration'|'fictional';
}
```

Hedef `progress` gerçek dünya durumundan türetilmeli; saklanan ilerleme sadece olay gibi yeniden türetilemeyen güvenli işaret taşıyabilir. Örneğin “Belçika tarafsızlığı” yalnız ülke görüş puanı değil, `warWithGER` ve `militaryAccess`, ihlal ve garantör tepkileri gibi somut olaylarla ölçülür.

**Hedef seçim kuralı:** İlk gün devlet 2–4 hedef önerir; AI aynı anda bütçe/ordu kapasitesini aşan üç büyük savaşı hedefleyemez. Ana hedef kilitlenmez; değişikliğin kaynak ve itibar bedeli olur. Her 30 günde / acil olay sonrası hedef skoru yeniden hesaplanır. Tekrarlı karar oscillation için 15 gün asgari histerezis önerisi.

## 4. Olay ağı türleri

- **Kriz:** diplomatik teklif, ültimatom, cevap, garanti, seferberlik veya savaş.
- **Topyekûn savaş/sanayi:** mühimmat talebi, devlet kredisi, işgücü ve demiryolu kıtlığı.
- **Siyasi:** hükümet istifası, kabine değişimi, savaş yorgunluğu, diplomatik krizin iç siyasi bedeli.
- **Askerî:** Belçika rotası, Marne benzeri cephe kırılması *yalnız koşul ve savaş konumları sağlanırsa*, Rus seferberlik/ikmal zorlanması, Çanakkale girişimi, İtalya/Balkan katılımı.
- **Barış ve alternatif:** ayrı barış, garantili tarafsızlık, koalisyon konferansı, savaş sonrası nüfuz pazarlığı.

`veri/1914_olay_aglari.json` 1914 kriz/1915–1917 koşullu tetikleme adayları içerir. `preconditions` dizisi `ALL` semantiğine sahiptir; alternatifler `ANY` mantığı için alt yüklem grubu gerektirir. Tarih penceresi tek başına olayı açmaz. Ülkenin hayatta olması, egemenlik, savaş tarafları, mevcut teklif/ittifak, hatta cephe varlığı kontrol edilir. **Tarihsel bir olayın karşıtı başarılı olduysa aynı olay sonra tekrar zorlanmaz.**

## 5. Çelişki ve bilgi düzeyi kontrolü

- Osmanlı kesin tarafsızlık anlaşması imzaladıysa Karadeniz baskını *koşulu sağlanmadıkça* tetiklenmez.
- Belçika hiç işgal edilmediyse İngiliz savaş ilanı yalnız Belçika tetikleyicisine bağlanmaz; başka meşru/oyun içi nedenlerle savaş kararı mümkün olabilir.
- Almanya/Fransa arasında barış varsa “Marne cephesi” adlı savaş olayı gerçek cephe/kuvvet olmadan çıkmaz.
- Rus hükümeti tamamen başka rejime dönüşmüşse 1917 devrim şablonu zorunlu çalışmaz; iç siyasi krize uygun alternatif olay olabilir.
- İtalya bir ittifakla savaşa girdiyse karşı bloktan gizli teklif otomatik kabul edilmez; mevcut taahhüt ve ihlal maliyeti devreye girer.
- Osmanlı tarafsızsa Çanakkale çıkarma harekâtı otomatik başlamaz.
- Sanayi ve teknoloji gelişimi tarihsel ekipmanı mecburen aynı yılda üretmez; erken/alternatif teknolojinin maliyeti gösterilir.

## 6. Kurgusal veri güvenlik ve kaynak etiketleri

Her hedef ve olay için `provenance` alanı zorunlu: `sourceStatus`, `notes`, `lastVerifiedDate`, `sourceIds`. Tarihî adı/metni kaynaksız yeni bir gerçek olarak sunma. Tarihsel olayın **başlangıç/karar penceresi** doğrulanabilir; oyuncunun alternatif seçeneği `fictional_counterfactual` olarak kaydedilir.

Çelişkili veri kuralı: `historicDefault` oyun içinde ağırlık olabilir, **kesin karar** olamaz. AI tek tarihî yolu zorunlu izlememeli. Olayların oyuncuya baskı maliyeti gösterebilmesi için kaynağı `countryGoal`, `regime`, `economy`, `military` veya `international` alanları olmalıdır.

## 7. Kabul senaryoları

**SC-01 Belçika:** Alman AI 12 tohumda Belçika'ya girme ve girmeme stratejisi ön koşullara göre seçebilmeli; birinin mutlaka çıkması gerekmiyor, ama karşıt yollar veriyle temsil edilmeli ve manuel seçim sonucu farklı olmalı.

**SC-02 Osmanlı:** Savaşa katılma/uzun tarafsızlık/diğer blokla yakınlaşma yolları mümkün, birini seçince çatışan tarihsel olaylar durmalı.

**SC-03 İtalya:** Karşılıklı gizli vaatler, ifşa, tarafsızlık, savaşa giriş kararı; karar öncesinde başka devlet AI'sı gizli içeriği bilemez.

**SC-04 Rusya:** Demiryolu/seferberlik kapasitesi stratejik savaş planını etkiler; tarihi kalıp ile fiili süre farklıysa görünür `Neden?` açıklaması verilir.

**SC-05 Sırbistan/AUH:** Ültimatom ve kısmi kabul farklı sonuçlara açık; otomatik savaş komutu yalnız koşullu.

**SC-06 İngiltere:** Donanma/abluka ve kara ordusu gönderme kararı liman/konvoy/ikmal ve kabine desteği ile bağlantılı.

**SC-07 Genel:** 62 devletin hepsi oynanabilir kalır; kataloğu bulunmayan devletler dönem/diplomasi konumuna göre düşük riskli nötr hedef önerileri alır (korunma, sanayi, ticaret). Hiçbiri zorunlu 1914 savaşına çekilmez.



---

# 05 — MÜHENDİSLİK UYGULAMA İŞ PAKETLERİ, BAĞIMLILIKLAR, BİRLEŞTİRME KAPILARI

**Kod tabanı:** `ccr-949a01d1-3lmfyg` SHA `9f3694c9af1afae86aa16771bcc5ed458058ee05`; `main` dalında 1.4.0 var. v1.7 R2 başlanırken `feat/v17-r2` dalı bu commit veya kullanıcı tarafından seçilen daha yeni doğrulanmış commit üzerinden açılır. Başka dalı otomatik ezme.

## Adım adım iş sırası

| PR | Bağımlılık | Kapsam | En önemli dosyalar | Kapı |
|---|---|---|---|---|
| PR00 | — | Repo/şema/faz keşif, veri/tarih kaynakları, eski 324 test ve 70 kabul baz koşu, iki kayıt örneği | docs/, phases, serialize, Android/CI | `GATE-0` |
| PR01 | PR00 | Hareket ve ETA aynı algoritma; fazla ilerleme, çok kenar, erişim, durak | `systems/kara.ts`, `systems/ortak.ts`, `systems/lojistik.ts`, `tests` | `GATE-1` |
| PR02 | PR00 | Şema11 hazırlığı, seyrek city/deposit/facility/stock/line tipleri, kayıpsız göç | `state/world.ts`, `state/table.ts`, `serialize/index.ts` | `GATE-2a` |
| PR03 | PR02 | Rezervler, maden/rafineri, kapasiteli üretim, stok rezervasyon, sivil/askerî tesis | `systems/ekonomi.ts`, `systems/lojistik.ts`, `donem.ts` | `GATE-2b` |
| PR04 | PR03 | Teknoloji-model-prototip/hat dönüşümü-birlik; çağ/dönem katalogları | `catalog.ts`, `donem.ts`, `orders.ts`, `data-compiler` | `GATE-2c` |
| PR05 | PR01+PR04 | Cephe durum makinesi, birlik emirleri, komutan hiyerarşisi, AI çatışma kilidi | `systems/kara.ts`, `systems/komutan.ts`, `emirEk.ts`, `decision` | `GATE-3a` |
| PR06 | PR03+PR05 | Hava/deniz yakıt ve ortak ulaşım bütçesi, üs/liman ve çıkarma | `systems/kuvvet.ts`, `systems/deniz.ts`, `systems/lojistik.ts` | `GATE-3b` |
| PR07 | PR02 | Siyasi kişi/kabine/bakanlık kalıcı kayıt ve dönem bazlı etki | `siyasiKisiler.ts`, `state/world.ts`, `systems/siyaset.ts`, `decision` | `GATE-4a` |
| PR08 | PR02+PR07 | İstihbarat ajans/ağ, operasyon hazırlık, sızma, gösterim, kişi sonuçları | `emirEk.ts`, `observe`, `worker/gorunum.ts` | `GATE-4b` |
| PR09 | PR07+PR08 | Diplomasi sürümlü teklif/gizli madde/taahhüt ve AI müzakere | `systems/diplomasi.ts`, `orders.ts`, `decision`, `worker/gorunum` | `GATE-4c` |
| PR10 | PR05+PR07+PR09 | 1914 hedef sistemi, plan hafızası, koşullu olay zincirleri, ülke AI | `s1914.ts`, `systems/olaylar.ts`, `decision`, `data-compiler` | `GATE-5` |
| PR11 | PR03+PR05+PR10 | Şehir 4 ana sekmesi, danışman/ilk oyun, hedef/sonuç UI, Türkçe komut, Windows web | `ui/Cekmece.tsx`, `ui/Paneller.tsx`, `command`, `worker/gorunum` | `GATE-6` |
| PR12 | Hepsi | Göç, eski/yeni test, 6/24/100 tohum, 5/10/25 yıl, gerçek Android ve dağıtım | `tests`, `lab`, `storage`, `android`, README, CI | `GATE-7` |

**PR01** ve **PR02** uygulamada paralel başlayabilir çünkü işlenen alt veri ayrışabilir; fakat `world.ts`, fazlar, save/load, UI protokolü ve birleşik tablo değişiklikleri için aynı anda birbirini ezen değişikliklere izin verme. En yüksek riskli PR03/04/05/08/09 önce test edilebilir küçük dikey dilimlerle uygulanır.

## PR geçiş standardı

Her PR açıklamasında aşağıdaki sekiz alan bulunmak zorunda:

1. Hedeflenen kullanıcı eylemi ve bağlı `R/G` kimliği.
2. Değişen dosyalar ve mevcut tip/tablo/fazlardan yararlanma.
3. Veri şeması, birim sözleşmesi, kayıt göçü ve hash etkisi.
4. P0–P12 entegrasyonu; anlık idari emir ve fiilî icra ayrımı.
5. Oyuncu ve AI için eşit koşullar; gözlem/gizlilik.
6. Türkçe komut, UI, hata mesajı ve Neden? açıklaması.
7. Testler: pozitif, negatif, özellik tabanlı, göç, deterministik, çapraz dönem, Android etkisi.
8. Örnek 1914 oynanış kaydı ve önce/sonra ölçümü.

**Rollback:** PR başarısızsa dünya şeması otomatik geri çevrilmez. Orijinal v1.6.1 kayıtlarını dokunmadan sakla; test/feature-flag ile yeni oyun kurallarını kapat, gerekirse branch/commit geri al. Sunucudan/CI'dan yeni APK gelmesi kayıt yüklemeyi geriye dönük sessizce değiştirmemeli.

## Kabul kapıları için eşikler

- `GATE-0`: repo ref/branch doğrulandı, tip/lint/test, mevcut 70 matrisi ve beş senaryo baz koşusu kaydedildi (eskiden raporlanan 324 test ≠ yeniden çalıştırılmış).
- `GATE-1`: hareket/ETA gözlem dışı sabit rotada eşit; tek gün çok kenar; savaş ve erişim engelleri aşılmaz.
- `GATE-2`: ortak stok eksi/çifte tüketim yok; fabrikanın fiziksel üretimi, depo/sevkiyat zinciri; şema göçü.
- `GATE-3`: cephe çatışmaları ve filo/kanat invariantları; gerçek destek etkisi ve ikmal.
- `GATE-4`: kabine/ajan/diplomasi sonuçları, bilgi görünürlüğü ve yeni kişi halefiyeti; AI tutarlılığı.
- `GATE-5`: en az altı ana 1914 ülkesinde üç alternatif hedef; tarih dışı olay otomatik çalışmaz.
- `GATE-6`: dikey Android erişilebilir, hedef ve sonuç ekranı, UI/komut eşitliği.
- `GATE-7`: yeni R2 matris PASS, eski regresyonlar PASS; fiziksel Android denemeleri ve kayıt güvenliği.

## Mutlak blokaj / öncelik sıralaması

- `P0-Core`: negatif/çifte kaynak, veri silen migration, deterministik sapma, Worker promise, çifte teklif/komuta, savaşta geçiş atlama.
- `P1-Play`: gerçek üretim, istihbarat ve diplomasi, bakanlar/şehir hedefleri, temel AI ve 1914 kriz zinciri.
- `P2-Depth`: ayrıntılı ulusal görevler, gelişmiş filo müşterek harekât, tarihsel daha küçük ülkeler, ileri ses/başarım ve isteğe bağlı sosyal paylaşım.

**Geliştirme durumu sözcükleri:** `DESIGNED` yalnız doküman; `IMPLEMENTED_UNVERIFIED` kod var ama test yok; `PARTIAL` bütünleşme eksik; `PASS` kanıtlı; `NOT_RUN` henüz denenmemiş; `BLOCKED` bağımlılık. Bunlar pazarlama etiketleri değil mühendislik raporlarıdır.



---

# 06 — KAYIT GÖÇÜ, DOĞRULAMA, DENGE, ANDROID VE GÜVENİLİRLİK

## 1. Sürüm ve test statüsü

Repo geliştirme dalında (14.11.2026 incelemesi) `packages/engine/src/serialize/index.ts` **SEMA_SURUM=10**. Mevcut v1.6.1 belgeleri 324 otomatik testi ve v1.6 kabul matrisinde 48 PASS / 18 PARTIAL / 2 NOT_IMPLEMENTED / 2 NOT_RUN bildirmektedir; bu pakette test çalıştırılmış sayılmaz. v1.7'nin eski 77 maddesi ve R2 ek maddelerinin durumu **NOT_RUN**. Şema **11 bir tasarım önerisidir**, güncel kodda önce gerçek şema tekrar kontrol edilir.

## 2. Eski oyun kaydını koruma algoritması

**Önce:** Kullanıcıya eski `.tsk` dosyası dışa aktarma/yedek önerilir. Orijinal byte dizisi immutable olarak tutulur; yeni kayıt ayrı `schema11` dosyasıdır. **İşlem:** `LoadLegacy10 → Normalize → AllocateNewSparseTables → TransferInventoriesOnce → ValidateCounts → Serialize11 → Reload11 → CompareCanonical11 → Activate`. Adımlardan biri başarısızsa kaydın orijinali aktif kalır, göç hatası/dönüşüm raporu verilir.

**Göç özel kuralları:**

- `R.sivilF`, `R.askeriF`, `R.kent`, `R.maden` mevcut sayılarından şehir/fabrika/tesis taslağı yarat; mevcut bina sayısını kaybetme. Model tarihsel birim değildir, `migration_estimate` etiketi taşır.
- Ulusal `HT` hatlarının `wip` ve verimliliği yeni üretim hatlarına aktarılır; birden çok yeni fabrikaya dağıtılsa bile toplam `wip` ve tahsis kapasitesi birebir korunur.
- `C.celik/komur/petrol/muhimmat`, `w.ekip` ve transit `T` miktarları yeni `StockAccount` içinde **bir kez** açılır; eski diziler salt aynaya dönüşür. Hem yeni hem eski üzerinden üretim/tüketim yasak.
- Başlangıç petrol stratejik stok bonüsü yalnız `senaryoBaslat` yapısında bir defa; göç edilen kayda yeniden ödül yok.
- Birlik `U.bolge`, `U.hedef`, `U.sonraki`, `U.ilerleme` yeni `MoveState` içine kısmi geçiş olarak dönüştürülür. İlerlemenin fiziksel km karşılığı güvenilir değilse varlık mevcut bölgede kalır, ilk hareket yeniden rota hesaplar; birlik silinmez/ışınlanmaz.
- Komutan `KM` kimliği ve atanmış `U.komutan` değişmez; siyasi kişiler yeni tabloya *benzersiz tarihî ID* ile göç eder, `KM` ile isim çakışması varsa rol eşleme kontrolü gerekir.
- `FL`/`KN` tekil kimlikli kayıt ve `gs*/h*` ayna toplamları eşit tutulur. Deniz bölgesi atanmadıysa önce mevcut kıyı bölgesi geçici anahtar olarak geçerlidir; iki konum yazılmaz.
- `IR` raporu gün/alt/üst/güven kaybetmez; eski operasyon emri kanonik olarak bitmişse yeni ağa retroaktif başarı sağlamaz.
- `TK/AN` aktif teklif ve anlaşmalar yeni sürümlü taahhüt tablolarına göç eder; eski `p1/p2` anlamı kaybolmaz, desteklenmeyen madde `legacyClause` ile korunur. Geçerli eski teklif yanlışlıkla bir daha otomatik gönderilmez.
- 1914 olay bayrakları ve iptal edilen zincirler korunur; yeni ulusal hedefler mevcut dünya durumundan önerilir, işlenmiş olaylar tekrar tetiklenmez.
- Eski şema 5–9 ve eski 463 bölge dönüşümleri kodun mevcut yolundan geçer, **iki aşamalı duplicate migration yok**.

**Doğrulama:**

```
canonicalOldEntities == mappedCanonicalNewEntities (korunan alanlar)
oldPopTotal == newPopTotal
oldEquipmentByFamily == newEquipmentByFamily
oldFleetAirTotals == newFleetAirTotals
oldTreasury == newTreasury
serialize11(load11(serialize11(migrated))) hash eşit
migrate(migrate(old)) ikinci kez çalışmaz / no-op semantiği açık
```

**Yanlış ölçüt:** `hash(schema10Old) === hash(schema11Migrated)` beklenmez: bayt düzeni/değişmiş model ve hareket algoritması farklı. Kanonik mantıksal eşdeğerlik raporu ve yeni sürüm içindeki hash denetimi ölçülür.

## 3. Fiyat, fiziksel üretim ve tarihsel kalibrasyon

Başlangıçta dönem/fabrika ölçeği **ölçülen gerçek fabrika veya sanayi bölgesi** türüne göre ayrılmalı. Ürün modeli için beş parametreye kalibrasyon kaynağı gerekir: işçi sayısı, tesis kapasitesi, gün/ay üretim, hammadde, malî/makine yenileme; ölçülemeyene `calibration` etiketi verilir. Örneğin RSAF Enfield'ın 1917 yazında haftalık yaklaşık 10.500 tüfeğe yükseldiği bilgisi başka dönem ve ülkelere tek bir `fabrika=1000 adet/ay` sabiti olarak uygulanmaz.

Üretim regresyon paketi en az şu değerleri ayrı ölçer: tüfek, ağır topçu, makineli tüfek, fişek, top mermisi, kömür, çelik, rafine yakıt, tren ve askerî sevkiyat. Ulusal toplamla tek fabrika/tek tesis ölçeği karıştırılmaz. Yeni araştırma veya endüstri yatırımı aynı anda ülkenin bütün stoklarını çoğaltamaz.

## 4. Test matrisi ve çapraz sistem doğrulamaları

`testler/kabul_matrisi_v17_R2.csv`: önceki 77 kimlik **değişmeden** taşınmıştır; yeni R2 kodlu maddeler eklenmiştir. İki farklı `Test_ID` aynı olmaz. Tüm testler `NOT_RUN` başlangıç statüsündedir. `Bileşen`, `Bağımlılık`, `Kaynak Modül`, `Kanıt`, `Otomasyon` ve `Öncelik` alanları her test için yer alır.

**Temel test kategorileri:**

- **Birim:** `addStock`, `reserve`, `consume`, `moveEdge`, `estimate`, `goalTrigger`, `treatyRevision`, `ministryPolicy`.
- **Özellik tabanlı:** stok ≥0, net çift tüketim yok; hareket sıra/mesafe/erişim; birlik tek görev; iki taslak same revision idempotency; RNG anahtarı aynıysa aynı çıktı.
- **Entegrasyon:** `Technology→Facility→Stock→Transport→Unit→Battle`, `Espionage→Damage→Repair→Diplomacy`, `Ministry→Budget→Railway→Front`, `Treaty→AI→Goal→Event`.
- **Göç:** en az 1914 ve 2026 eski kayıt örneği, `schema5–10`, harita v1→v2, yağmur/rota/cephe ortasında kayıt.
- **AI bilgi:** gizli hedef ülke gerçeği ifşa edilmedikçe AI kararını değiştirmez. Oyuncunun elde ettiği rapor bile kesin olmayan aralık taşır.
- **Oynanış:** 6 sabit tohum hızlı, 24+ denge, 100+ stres; 365 gün, 5 yıl, 10 yıl, 25 yıl; son durumlardaki tarihsel varyans ve imkânsız teknoloji kontrolleri.
- **Arayüz:** 360×800 portre, orta/üst Android, geri tuşu, klavye, uzun Türkçe komut, büyük yazı tipi, erişilebilir seçim ve Neden? açıklaması.

**Canlı doğru test:** 1×180 gün atlama ile aynı günlerin 180 kez işlenmesi aynı *oyun durumu hash'ini* üretmeli (aynı başlangıç seed ve emirler). Hash'e girmeyen Chronicle/görsel kayıt farklı olabilir; simülasyon hash sınırı korunur.

## 5. Performans bütçesi ve gerçek Android profil

Eski tek masaüstü koşular `1914≈33 ms/gün`, `2026≈47 ms/gün` bildirilmiştir; **telefon sonucu değil, baz ölçüm referansıdır**. Her kod PR'ında aynı OS, build, seed ve senaryo üzerinde ayrı `p50, p95, memoryPeak, saveSize, GC, cacheHit` alınır. Geliştirme hedefi olarak **aynı donanımda medyan gün maliyetinde ilk etapta %10'dan büyük regresyonun gerekçelendirilmesi** konur; bu gerçek cihaz kabul eşiğinin yerine geçmez.

**Android üç sınıf:** düşük/orta/yüksek RAM ve CPU; uzun 1914/2026 atlaması; ilk senaryo seçimi, ilk hareket, diplomasi menüsü, 5 dakikalık muharebe replay, 25 dakika oyun, 1 yıllık hızlı atlama. Kullanıcı panel etkileşiminin yanıtı ayrıca ölçülür. `WebView` renderer ve ana process ayrı bellek kullanır: yalnız uygulama Java heap'ini görmek yeterli değildir; `adb shell dumpsys meminfo` ve Chrome `chrome://inspect/#devices` ile JS heap, izinli debug build üzerinde. Profil ve kayıt paylaşımı kullanıcı izniyle/yerel dosya olarak; `INTERNET` izni ekleme.

**Optimizasyon yönleri:** seyrek SoA tablolar; olayla tetiklenen AI plan; haftalık/aylık politik kararlar; rota ağırlık/erişim epoch önbelleği; görünür bölge Canvas culling; UI'de liste sanallaştırma; yüklü olmayan ülke panelleri için hesap yapmama; hash dışı görsel alanların ayrılması. Bütçe/senaryo/bellek hedefleri gerçek profilden sonra final karar kaydına girer.

## 6. Denge kuralları: 1914 örnek şüphe ve test yaklaşımı

**Almanya erken gerileme sorunu:** İki cephe yönetiminde kuvvet dağılımı, Rus seferberlik süresi, Fransız cephe geri çekilmesi, Belçika üzerinden güzergâh, demiryolu/mühimmat, Avusturya-Macaristan'ın yükü ayrı izlenmeli. “Almanya 1915'te her koşulda güçlü kalsın” veya “Polonya 1939 her koşulda tarihsel tarihte düşsün” gibi şartlar eklenmez; mekanik tutarlılık ve bilgiye dayalı AI aranır.

Her kalibrasyon değişikliği aynı 6/24 tohumlu 1914, 1939 ve 2026 koşularında birim, üretim, ikmal, savaş süresi, hazine, savaş yorgunluğu, başkent tehdidi ve ülke hayatta kalma gösterge serilerini karşılaştırır. Oyun hâlâ oyuncunun alternatif kararlarına duyarlı olmalı.

## 7. Güvenli dağıtım ve dürüst test raporu

- Android Manifest portre `sensorPortrait`; internet/record audio izinleri kaldırılmış; korunur.
- `Build debug APK` = mağazaya hazır ürün değildir. İmzalı release, sürüm, gizlilik ve yaş derecelendirmesi ayrı kapılar.
- Gerçek dünyadaki suikast, sabotaj ve hak ihlalleri oyun içi soyut etkiler olarak temsil edilir; yaş sınıflandırması ve etik hassasiyet belgelenir.
- CI testleri, statik analiz, build logs, emulator ve fiziksel cihaz kanıtları PR'a eklenir. `PASS` yalnız test veya doğrulanmış kod kanıtından sonra işaretlenir.
- İsteğe bağlı yerel tanılama dışa aktarımı, komut reddi ve crash raporunu kişisel/gizli veri içermeden oluşturabilir; arka planda ağ telemetrisi yok.

## 8. R2 referans örnek kodu ve doğrulama sınırı

`referans_kod/strateji_ref.mjs`, hareket mikrogün geçişi ve kapasite temelli üretimin **bağımsız davranış örneğini** sağlar. `node --test` örneklerini koşmak repo kodunun `npm test` sonuçlarını değiştirmez. Gerçek projeye aktarılacak kod, `S=1_000_000`, num modülü, SoA tablo kimlikleri ve P8/P5 çağrı sırasıyla uyarlanmalı; tam API entegrasyonu test edilmelidir.



---

# 07 — v1.7 R2 KARAR KAYDI / ADR

Bu liste v1.6.1'deki K-01…K-55'in devamına **önerilen** yeni karar kimliklerini ekler. Mevcut repo `docs/kararlar` dosyasına işlenmeden resmi kaynak kod kararı sayılmaz.

| Karar | Sorun | Bağlayıcı çözüm | Kanıt/geri alma |
|---|---|---|---|
| K-56 | Eski main dalı | v1.7 tabanı SHA `9f3694...` geliştirme dalı; main 1.4.0 karıştırılmaz | HEAD karşılaştırma, branch koruma |
| K-57 | Önceki v1.7 dokümanı çelişkili | v1.7 R2 ana şartname ve veri sözleşmesi kanonik; ilk taslak arşiv | Doküman diff ve ADR |
| K-58 | Şema | v1.6.1 şema 10 → önerilen 11; uygulama öncesi tekrar doğrulama | göç testleri |
| K-59 | Eski hash eşitliği | Eski/yeni ham hash değil, mantıksal varlık korunumu + yeni şema replay hash | schema5–11 test |
| K-60 | Stok çoğaltma | Tek fiziksel stok defteri ve atomik rezervasyon/tüketim | korunum testi |
| K-61 | Üretim ölçeği | Tesis/hat/makine/işgücü/enerji/malzeme bazlı fiziksel adet | 1914 Enfield dahil çoklu kalibrasyon |
| K-62 | Petrol başlangıcı | Senaryo başlatmada bir kez, eksik görünce sürekli otomatik dolum yok | başlat+yükle+60 gün testi |
| K-63 | Bölge/şehir | Şehir ayrı stable ID; bölge geometrisi ayrıdır | bölge göçü, şehir UI |
| K-64 | Günlük hareket | Mikrogün bütçesi ve bir günde çok kenar; engelde dur | ETA, savaş kaçırmama testi |
| K-65 | Demiryolu | Kapasite/yükleme/boşaltma ayrı; ücretsiz sabit 3× yerine ulaşım bütçesi | dolu ray testi |
| K-66 | Zaman fazı | P0–P12 gerçek sıraya kanca; geçmiş faza geriye etki yok | faz sıra testi |
| K-67 | İstihbarat | Ajans/ağ/rapor/operasyon kalıcı, soyut ve süreli | görünürlük, kayıt |
| K-68 | Suikast/kişi | Kalıcı siyasi kişiye etkisi varsa halefiyet; yoksa olay açıklaması kişi öldü demez | anlatı durum testi |
| K-69 | Sabotaj etkisi | Hasar metni, gerçek tesis/ulaşım hasarı + onarım kaydı doğurur | UI↔world doğrulaması |
| K-70 | Gizli diplomasi | Taslak revizyonu, clause görünürlüğü, taahhüt ve ifşa | rakip bilgi testi |
| K-71 | Kabine | Bakan bit maskesi kalır; gerçek kişi/kurum ataması genişletilir | eski save göç |
| K-72 | Komuta | Mevcut KM atama yeniden yazılmaz; üst hiyerarşi eklenir | çifte bonus testi |
| K-73 | Cephe | Operation kalıcı durum makinesi ve kaynak kilidi | muharebe regresyon |
| K-74 | Deniz/hava | FL/KN kalır; alan, yakıt tipi, nakliye ve bakım derinleşir | ayna toplamı |
| K-75 | 1914 hedefleri | Başlangıç tarihî, sonuç özgür; büyük ülke hedefleri karşıt | çoklu tohum alternatifler |
| K-76 | AI bilgisi | AI gerçek rakip gizli stokunu doğrudan okumaz, observe aralığı kullanır | sızıntı test |
| K-77 | AI plan sıklığı | Aylık/olay tabanlı, cephe acil; hysteresis ve cooldown | performans ve emir tekrarı |
| K-78 | UI tek alan | 360×800 dikey dört ana şehir sekmesi; komut paritesi | mobil manuel/otomatik |
| K-79 | Kabul testi statüsü | Test çalışmadıysa NOT_RUN; referans test oyunun PASS'i değildir | CI rapor |
| K-80 | Çevrimdışılık | INTERNET/RECORD_AUDIO izni eklenmez; tanılama yerel | Android Manifest |
| K-81 | Dönem kapıları | 750/1600/1914/1939/2026 ekipman, kurum ve yakıt ayrı | çapraz dönem test |
| K-82 | Yayın | Debug APK ürün release sayılmaz; imza, cihaz, yaş, gizlilik kontrolleri | release checklist |

## Değişiklik onay matrisi

Her ADR için etkilenen `packages/*`, kabul Test_ID, göç etkisi, AI kuralı ve P fazı belirtilmeden `ACCEPTED` olmaz. Var olan K-55'ten sonra başka geliştiricilerin eklediği yeni kararlar varsa kimlik çakışmasını çözmek için bu kimlikler yeniden numaralandırılır.



---

# GELİŞTİRİCİ / KODLAMA AJANI İÇİN ANA UYGULAMA KOMUTU

## Rol ve çalışma ölçütü

Sen TypeScript, Preact, Canvas, Capacitor, deterministik sabit-nokta simülasyon, strateji oyunu sistem tasarımı, test, veri göçü ve Android performansında uzman kıdemli geliştiricisin. Görev, Tarih Strateji v1.6.1 kaynak kodunu **v1.7 R2 bütünleşik pakete** güvenli şekilde taşımaktır. Menüleri taklit eden sahte implementasyonlar yeterli değildir.

### 1. Doğru repo ve güvenli başlangıç

**Repo:** `ERK-netizen/tarih-strateji1`, başlangıç ref `ccr-949a01d1-3lmfyg`, SHA `9f3694c9af1afae86aa16771bcc5ed458058ee05`, `package.json` 1.6.1. Başlamadan önce HEAD/sürüm durumunu kontrol et; değişmişse yeni sha ve farkları raporla, yanlışlıkla `main` 1.4.0 üzerine yazma. Güncel kapsam için `README.md`, `spec/00_ANA_SARTNAME.md`, `spec/02_MIMARI_VERI_VE_FAZ_SOZLESMELERI.md`, `spec/03_SISTEM_MEKNIKLERI.md`, `spec/04_1914_SENARYO_KURALLARI.md`, `spec/05_PR_UYGULAMA_PLANLARI.md`, `spec/06_GOC_KALITE_PERFORMANS.md`, `spec/07_KARAR_KAYDI_R2.md`, veri JSON ve kabul matrisini oku.

### 2. Uygulama kısıtları

- Çalışan `komutanAta`, filo/kanat `FL/KN`, `HT`, `IR`, `TK/AN` ve P0–P12 sistemini sıfırdan yeniden yazma. Genişlet, daha önce test edilen davranışları koru.
- Her emir oyuncu ve AI için aynı doğrulama ve plan/uygulama yolundan geçer; kullanıcıya aynı gün onay/kalıcı kayıt bildirilir, fiziksel icra ilgili günlük fazda.
- Engine hesaplarında deterministik safe integer, `S=1_000_000`, anahtarlı RNG; `Math.random`, `Date`, rastgele platform özelliği, gerekçesiz float kullanma; `num` yardımcıları.
- Yeni veri modelinde tek gerçek stok defteri, şehir/tesis/ürün/model/rota/operasyon/diplomatik revizyon/person/ajan ağı ID'leri; dış anahtar denetimi.
- Yapay zekâ yabancı ülkelerin gizli gerçek değerlerini sızdırmaz; `observe`/bilgi raporu kullanır.
- 750, 1600, 1914, 1939, 2026 senaryolarını test et. Tarihsel olay zorunlu tarih sonu üretmez. 1914 kodları **SRB ve NLD**'dir.
- Android dikey yön, Türkçe komut, tam çevrimdışılık, güvenli kayıt ve kullanıcı onayı korunur. Yasa dışı gerçek dünya eylemlerinin operasyonel yöntem ayrıntılarını tasarlama.
- `veri/*.json` tasarım katalogları mevcut veri derleyiciyle **uyumlu olduğu doğrulanmadan** gerçek senaryo JSON'una kopyalanamaz; adaptör, tip ve tarihî veri kaynağı doğrula.
- `referans_kod/*.mjs` bağımsız mantık örnekleridir; oyunun kodu veya PASS testi değildir. Bunları gerektiği kadar uyarlayarak TypeScript engine tests altında yeniden uygula.

### 3. Kesin iş akışı

1. **PR00:** `npm ci`, `npm run tip`, `npm run lint`, `npm test`, 365 günlük laboratuvar koşuları. Test koşulmadıysa `NOT_RUN`, hata varsa ayrıntılı FAIL. v1.6.1 `.tsk` iki kayıt örneği oluştur ve değiştirilemez yedekle.
2. **PR01:** `kara.ts` hareket ve ETA çok kenarlı mikrogün algoritması; farklı hız/engel ve kapasite testleri. AI yeni hareketi kullanmalı.
3. **PR02–PR04:** şema 11 göç, şehir/tesis/maden/depo/ledger, fiziksel üretim ve named equipment; stok korunumu ve tarih/ülke kapıları. Önce küçük bir üretim dilimi (1 tesis, 1 ürün, 1 depo, 1 birlik) uçtan uca tamamla.
4. **PR05–PR06:** kararlı cephe emirleri, komutan hiyerarşisi, deniz/hava ve ortak nakliye.
5. **PR07–PR09:** kişi/kabine/bakanlık, ajan ağı/istihbarat ve sürümlü diplomasi, gizlilik. Eski istihbarat açıklama–etki tutarsızlığını gider.
6. **PR10:** 1914 olay ve hedef verisi adaptörü; altı ana ülke için tam akış, 16 ülke için içerik, diğerleri için jenerik hedef. Kodda 1914 olay geçmişini otomatik silme/yeniden kurma yok.
7. **PR11:** şehir dört ana sekmesi, ulusal hedef/öğretici/sonuç, Türkçe emir paritesi, Neden? ekranları.
8. **PR12:** kabul matrisini gerçek test kanıtlarına göre doldur; 324+ yeni test regresyon, 6/24/100 seed, 365 günlük ve 5/10/25 yıllık testler, gerçek Android cihaz profili, release checklist.

### 4. Her PR tamamlanmadan önce

- Test ID'lerini kod testleriyle eşleştir (name ve log). `tests/acceptance` + performans + migration + bilgi sızıntısı.
- Kod değişiklikleri, dosya konumları, niçin değiştiği, eski sürüm ilişkisi, riskler ve belirsizlikler için kısa diff özeti.
- Karşılık gelen veri şeması, `P` fazı ve kayıt sürümü/geri alma yöntemi yazılmalı.
- En az bir oyuncu eylemi ve bir AI davranışı örneği için önizleme→onay→ilerleme→sonuç→Neden?→kayıt testleri.
- Kritik kaynağı yanlış üreten veya eski kayıtları bozan değişiklikler birleştirilmez.

### 5. Son teslim formatı

| Bölüm | İstenen kanıt |
|---|---|
| Kaynak sürümü | Başlangıç, bitiş SHA, dal adı |
| Eklenen/güncellenen dosyalar | Tam diff ve PR bağlantıları |
| Emirlere bağlanma | UI/komut/AI parite kayıtları |
| 1914 oynanışı | Ülke hedef ve kriz kararlarıyla 3 farklı akış |
| Kaynak ve üretim | Fiziksel adet/girdi/ikmal kalibrasyonu |
| Hareket ve cephe | ETA ve gerçek varış kıyaslaması, savaş/ikmal farkı |
| Kayıt | Schema 10→11 ve schema 5→11 göç testleri |
| Determinizm | Tek/180 günlük hash karşılaştırması |
| Android | 3 cihaz p50/p95, PSS, bellek, 360×800, klavye |
| Kabul matrisi | `PASS/FAIL/PARTIAL/NOT_RUN` ve test log kanıtı |
| Kalanlar | Bilinen teknik borç ve geliştirme sınırlamaları |

**Bitiş:** v1.7 tamamlandı denebilmesi için R01–R13 ve G01–G05 sistemlerinin bağlantıları, tarihsel veri doğrulaması, dünya hash'i, geriye dönük kayıt, gerçek Android oynanışı ve bütün temel kabul kapıları sağlanmalıdır. Önceki bir özelliğin varlığına dayanarak yeni özellik için PASS yazma.

