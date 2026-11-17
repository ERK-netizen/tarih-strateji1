# v1.7 geliştirme durumu

Bu dizin `V17_TAM_PAKET.zip` paketinin oyuna işlenme durumunu ve paketin kendi belgelerini içerir.

- `PAKET_README.md`, `paket-belgeleri/` — paketin kendi anlatımı (R3 kod entegrasyonu; test sonuçları paket ortamında koşulmamıştı).
- `tasarim/` — R2 tasarım: şartname (`spec/`), 1914 hedef/olay/katalog verisi (`veri/`), 154 maddelik kabul matrisi (`testler/`), referans kod (`referans_kod/`, derlemeye girmez).
- `kabul-matrisi-v17.csv` — **154 maddenin bu depodaki gerçek durumu** (bileşen düzeyinde; kanıt sütunu test dosyalarını gösterir).

## Ne yapıldı

| Kalem | Durum |
|---|---|
| Paket yamaları (`apply_v17_integration.py`, `apply_v170.py`) | Uygulandı: şema 11, `w.v17` kanonik durumu, hareket/ETA, sabotaj hasarı, komutan kısayolu. Yedek dosyası bırakılmadı (Git geçmişi geri dönüş yoludur) |
| Köprü düzeltmeleri | Tip hatası; günlük tesis aynası bölge başına doğrusal arama yerine dizinli; ilk hedef ölçümü yalnız ölçer |
| Türkçe komutlar | Kabine, istihbarat ağı, operasyon, müzakere teklifi/yanıtı, şehir politikası ve harekât planı için kalıp + eşdeğer metin + geri çözülme (T123, 22 test) |
| **G01 ulusal hedefler** | 1914'te 16 ülke × 4 = **64 tasarım hedefi**, 40 ölçüt gerçek devlet durumuna bağlı (0…S). İlerleme 120 günlük üstel ortalama: bir kerelik iyi durum tamamlamaz. Üç aşama, hedef puanı, Kronik kaydı, ülke yok olursa başarısızlık. Tasarımı olmayan ülke/senaryoda genel 4 hedef. Panelde ilerleme çubuğu ve "Nasıl ulaşılır?" |
| **G02 olay ağı** | 36 tasarım olayı paket olayı olarak derlenir (`v17_*`): "stratejik tutum" kararları; bedeller tasarımın `tradeoffs` etiketlerinden (bütçe→siyasi güç, itibar→meşruiyet, savaş riski→gerginlik ve karşı taraf ilişkisi), kazanımlar süreli değiştiricilerdir. Hiçbir seçenek savaş ilan etmez, toprak devretmez |
| Katalog | 16 adlı ekipman modeli (ülke ve yıl kapısıyla), 12 kaynak, 26 tesis türü panelde/görünümde |
| **Adlı model üretimi (1.7.1)** | `v17SanayiGorevi` gerçek emir: model kapısı (ülke, yıl, aile) → **mevcut** fabrika hattı (tüfek, makineli tüfek, sahra/ağır top) ya da uçak siparişi (keşif, avcı) açılır; çıktı eski üretim/teslimat kancasından adlı modele yazılır. İkinci hat ve ek hammadde tüketimi yoktur (aynı emirle eski `uretim` emri birebir aynı stok ve hat tablosunu üretir). Panel, Türkçe komut ("Gewehr 98 modelini 2 fabrikayla üret") ve testler var. Tank ailesinin 1914 oyun karşılığı yok |
| **Üretim defteri (1.7.2)** | Ortak stok defteri: her gün çelik/kömür girişi, hat başına tüketim ve darboğaz (çelik, kömür, teknoloji, fabrika) kaydedilir; panelde "Üretim nedeni". Kanonik değil (hash'e girmez), üretim hesabı eski tek yolda kalır; simülasyon hash'i değişmedi. Makine/işçi/enerji darboğazı yok |
| **Maden rezervi (1.7.3)** | Her çelik/kömür/petrol yatağı nominal çıkarmanın 45 yılı kadar rezervle başlar (`REZERV_YIL`); çıkarılan miktar rezervden düşer, kalan oran %25'in altına inince verim doğrusal düşer, tükenince çıkarma durur. Kalibrasyon: 10 yılda hiçbir yatak %25'in altına inmez (üretim rezervsiz dünyayla birebir aynı; 90 gün testle doğrulandı); 1914'te 20. yılda 70, 25. yılda 137 yatak %25'in altında ve çelik/kömür çıktısı 20→25. yılda hafifçe geriler (çelik 511→503 bin, kömür 1554→1501 bin). 1.7.0/1.7.1 kayıtlarında rezerv bilinmez (−1) ve sınırsız sayılır. Panelde "Maden rezervleri" |
| **Danışman (1.7.1)** | Panelde "Önerilen 3 hareket": en büyük açıklı (ağırlık × eksik ilerleme) üç hedef için ölçüte özel öneri metni |
| **Polonya direnci (1.7.1)** | Karar modülü: ezici üstün olunan düşmanın payı geride tutulacak güçten tamamen düşülür; 8 tohumda Polonya 8/8 sonbaharda teslim, 1914 etkilenmedi |
| **R2 doğrulama testleri (1.7.1)** | `v17dogrulama.test.ts` (17 test): şema 10→11 ve 9→11 göçü, bayt eşitliği, iki kenarlı hareket/kısmi ilerleme/savaş engeli/ETA eşitliği, sabotaj hasarı, karşı teklif revizyonu, kabine kuralları, donanma yakıt, 62 ülke hedefi, Android izinleri |

## Bilerek yapılmayanlar ve nedeni

1. **Makine/işçi/enerji darboğazlı yeni fiziksel üretim, maden rezervi, rafineri (R03, R08, R10 çekirdeği):** yeni üretim çekirdeği (`industry.ts`) eski fabrika hesabının yerine geçirilmedi; iki motor aynı çeliği iki kez tüketirdi. Adlı model bu yüzden eski hattın çıktısına ad verir. Gerçek devir için ortak stok defteri (HT, C.celik/komur, birlik depoları) gerekir.
2. **G03/G04 (plan hafızası, hedef odaklı YZ):** yapay zekâ ulusal hedeflere göre karar vermiyor; hedefler oyuncuya ölçü ve ödül sunar.
3. **Deniz alanı, ortak taşıma bütçesi, yarma/kıskaç emirleri, kolordu hiyerarşisi.**
4. **Olay etkilerinin tarihî ayrıntısı:** 36 olay generik etkilerle çalışır; 30 yerleşik olayla konu örtüşmesi vardır (yerleşik olay somut eylemi, `v17_*` olay stratejik tutumu temsil eder).
5. **Tarihî doğrulama:** model adları/yılları ve olay pencereleri tasarım verisidir, bağımsız kaynakla doğrulanmadı.

## Doğrulama

- `npm run tip`, `npm run lint`, `npm test` (25 dosya, 422 test) yeşil.
- `npm run lab -- 365` iki koşuda aynı hash (`907e9c763c58f35f`).
- Beş senaryo, 365 gün, gözlemci, kayıt-yükleme hash'i eşit:

| Senaryo | Hash |
|---|---|
| s750 | `16f54de968da7bfa` |
| s1600 | `d96592a7e5e4fd05` |
| s1914 | `4d038dc9e31e5773` |
| s1939 | `5d385fd264e26e97` |
| s2026 | `5c31898599f04acd` |

- Tek koşu hızı (masaüstü): 1914 ≈ 34 ms/gün, 2026 ≈ 46 ms/gün (v1.6.1 ile aynı).
- Tarayıcı (360×800): Devlet panelinde hedefler, kabine önizlemesi ve onay düğmesi çalışır; konsol hatası yok.
- **Denge notu:** paketin hareket yaması 1939'da Polonya'nın düşüşünü 8 tohumun 6'sına düşürmüştü (seed 0 ve 6 Haziran 1940'a dek direniyordu); 1.7.1'de karar modülü düzeltmesiyle 8/8 (25 Eylül–10 Ekim 1939). 1914'te Belçika dört tohumun dördünde Ağustos–Ekim 1914'te teslim, Almanya Haziran 1915'te 36–48 bölge. Sonuçlar tohuma duyarlıdır; bu bir kabul eşiği değil gözlemdir.
- **Uzun koşular (1.7.1):** s750, s1600, s1939, s2026 için 3650 gün; s1914 için 9125 gün; 30 günde bir bütünlük denetimi, kayıt-yükleme hash eşit (s750 `11e95c23f636b612`, s1600 `b7cb9c5c8a947252`, s1914 `3402267a000ab649`, s1939 `138dcd9ecec3edd7`, s2026 `1d72c29e1962f619`).
- **Yapılmadı:** gerçek telefon denemesi, 6/24/100 tohum taraması.

## Kabul matrisi (154 madde)

`kabul-matrisi-v17.csv` (1.7.1): **PASS/PARTIAL/NOT_IMPLEMENTED/NOT_RUN sayıları matris dosyasındadır (1.7.3: R2-PROD-01 PASS; R03 PARTIAL).** Bileşen satırları (R01–R13, G01–G05) hâlâ bileşen düzeyinde PARTIAL/NOT_IMPLEMENTED; R2 doğrulama satırları (X-*, R2-*) tek tek, test dosyasına bağlı kanıtla işaretlendi. NOT_RUN: gerçek cihaz, YZ gizli bilgi sızıntısı testi, rota yeniden hesabı ve eşit maliyette belirlenimci seçim, yakıt/başlangıç petrol, başarısız istihbarat sızıntısı, İtalya/Rusya olay yolları, cihaz katmanları ve başarım bütçesi.
