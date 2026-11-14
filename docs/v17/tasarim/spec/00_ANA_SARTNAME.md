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
