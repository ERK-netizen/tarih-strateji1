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
| Katalog | 16 adlı ekipman modeli (ülke ve yıl kapısıyla), 12 kaynak, 26 tesis türü panelde/görünümde. **Üretim hattına bağlı değil** |

## Bilerek yapılmayanlar ve nedeni

1. **Fiziksel üretimin devri (R10, R03, R08 tamamı):** yeni üretim çekirdeği eski fabrika hesabının yerine geçirilmedi; iki motor aynı çeliği iki kez tüketirdi. `v17SanayiGorevi` kilitli kalır. Devir için ortak stok defteri (HT, C.celik/komur, birlik depoları) gerekir.
2. **G03/G04 (plan hafızası, hedef odaklı YZ):** yapay zekâ ulusal hedeflere göre karar vermiyor; hedefler oyuncuya ölçü ve ödül sunar.
3. **Deniz alanı, ortak taşıma bütçesi, yarma/kıskaç emirleri, kolordu hiyerarşisi.**
4. **Olay etkilerinin tarihî ayrıntısı:** 36 olay generik etkilerle çalışır; 30 yerleşik olayla konu örtüşmesi vardır (yerleşik olay somut eylemi, `v17_*` olay stratejik tutumu temsil eder).
5. **Tarihî doğrulama:** model adları/yılları ve olay pencereleri tasarım verisidir, bağımsız kaynakla doğrulanmadı.

## Doğrulama

- `npm run tip`, `npm run lint`, `npm test` (22 dosya, 391 test) yeşil.
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
- **Denge notu:** paketin hareket yaması (çok kenarlı hareket) sonrası 1939 varsayılan tohumunda Polonya Haziran 1940'a dek direniyor; tohum +1…+5'te Eylül–Ekim 1939'da teslim oluyor (v1.6.1'de altı tohumun altısı Eylül–Ekim). 1914'te Belçika üç tohumun üçünde sonbaharda teslim. Savaş sonuçları tohuma duyarlıdır; bu bir kabul eşiği değil gözlemdir.
- **Yapılmadı:** gerçek telefon denemesi, 5/10/25 yıllık koşular, 6/24/100 tohum taraması.

## Kabul matrisi (154 madde)

`kabul-matrisi-v17.csv`: **60 PARTIAL, 10 NOT_IMPLEMENTED, 84 NOT_RUN**, PASS yok. Bileşen düzeyinde işaretlendi (ör. R01 beş maddesi birlikte PARTIAL); madde madde kanıt toplanmadığı için PASS vermedim. NOT_RUN satırları (R2 yeni doğrulama ve çapraz sistem maddeleri) bu çalışmada koşulmadı.
