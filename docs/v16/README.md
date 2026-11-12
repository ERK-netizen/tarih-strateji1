# v1.6 geliştirme durumu

Bu dizin iki kaynak paketi ve bunların oyuna işlenme durumunu içerir.

- `KARSILASTIRMALI_ANALIZ_VE_BUTUNCUL_GELISTIRME.md` — altı referans oyunla karşılaştırma, hedef mimari, 17 iş paketi (PR-01…PR-17) ve 70 kabul testi (bütüncül geliştirme paketi, 12 Kasım 2026).
- `KOD_BULGULARI_VE_COZUMLER.csv`, `IS_PAKETLERI_VE_BAGIMLILIKLAR.csv`, `SISTEMLER_ARASI_ETKI_MATRISI.csv` — paketin izleme tabloları.
- `V16_BUTUNLESIK_ANA_GELISTIRME_PROMPTU.md`, `V16_MIMARI_VE_KABUL_PLANI.md` — ilk v1.6 kitinin belgeleri.
- `kabul-matrisi-v16.csv` — **70 kabul testinin bu depodaki gerçek durumu ve kanıtı.**
- `referans/` — ilk kitin oyuna bağlı olmayan örnek kodu ve prototipi (derlemeye girmez).

## İş paketleri: durum

| Paket | Durum | Depodaki karşılığı |
|---|---|---|
| PR-01 Worker kararlılığı | tamamlandı | Promise reddi, sürüm kilidi, tek sıra, meşgul, idempotency, çökme sonrası kurtarma (K-46, K-53) |
| PR-02 Anlık emirler | tamamlandı | İdari emirler gün ilerletmeden uygulanır ve kaydedilir; olay kararı anında |
| PR-03 Kayıt ve kimlik | kısmen | Şema 9 (komutan, istihbarat raporu); şema 5–8 ve harita v1 kayıtları göç eder. Genel etki defteri ve kaynak defteri yok |
| PR-04 Şehir ve inşa | tamamlandı | Düzey × 4 yapı yuvası, bedelsiz fabrika yok (K-45) |
| PR-05 Harita %70 | tamamlandı | 813 bölge, senaryo mirası, 1914/1939 inceltmesi, kayıt göçü (K-47) |
| PR-06 Demografi | kısmen | Ülke geneli halk dökümü, iskân kuralı (K-52). Seyrek kohort tablosu (dil, meslek, eğitim) yok; bölge başına 7 kimlik hücresi sürüyor |
| PR-07 Komutan/ordu | kısmen | Komutanlar, atama, kapasite, daimî emir (K-49). Kolordu/ordu grubu hiyerarşisi ve çizilen cephe hatları yok |
| PR-08 Deniz/hava | yapılmadı | Donanma ve hava hâlâ ülke düzeyinde sınıf sayıları ve tek görev |
| PR-09 Lojistik | yapılmadı | Mevcut ortak kenar kapasitesi sürüyor; kara/deniz ortak taşıma bütçesi yok |
| PR-10 Teknoloji/ekipman | yapılmadı | Araştırma → prototip → üretim aşamaları ve adlı ekipman modelleri yok |
| PR-11 Kişiler/siyaset | kısmen | Komutanlar kalıcı kişidir; siyasetçiler hâlâ takvimden türetilir, beş parti şablonu sürüyor |
| PR-12 İstihbarat | kısmen | Gözlem günlü, aralıklı, eskiyen raporlar (K-52). Ajan ağı ve karşı istihbarat yok |
| PR-13 Diplomasi/barış | kısmen | Çok maddeli atomik antlaşma (K-51). Barış konferansı ve silahsızlanma maddesi yok |
| PR-14 Alternatif tarih/YZ | kısmen | Kesin sonuç cephesi (K-48), 1939 yıldırım etkisi. Plan hafızası yok |
| PR-15 Muharebe ekranı | tamamlandı | Kayıt + dikey Canvas görüntüleyici (K-50). Görüntüleyiciden taktik emir verilmez |
| PR-16 Arayüz/rapor | kısmen | 3 ve 6 aylık adım, Devletim / Dünya Olayları raporu, komutan ve antlaşma formları. Etkileşimli teknoloji grafiği ve kalıcı plan dili yok |
| PR-17 Son kabul ve APK | kısmen | 284 otomatik test, beş senaryoda 365 gün koşu, web derlemesi, CI'da APK. Gerçek cihaz denemesi ve 5/10/25 yıllık koşular yapılmadı |

## Kabul testleri (V16-T01…T70)

`kabul-matrisi-v16.csv`: **44 PASS, 18 PARTIAL, 6 NOT_IMPLEMENTED, 2 NOT_RUN.** PARTIAL: davranış var ama kapsayıcı otomatik test ya da tam model yok; ayrıntı satırlarda.

## Bulgular (F-01…F-20)

Kapanan: F-01–F-06, F-08, F-12, F-13, F-14, F-18. Kısmen: F-09 (komutanlar için), F-11 (ülke geneli döküm). Açık: F-07, F-10, F-15, F-16, F-17, F-20.
F-19 (1914 Brezilya başkenti) hata değildir: haritada ayrı “Rio de Janeiro” bölgesi yoktur; Brasília bölgesi 1914 ve 1939'da bu adla gösterilir.

## Doğrulama

- `npm run tip`, `npm run lint`, `npm test` (17 dosya, 284 test) yeşil.
- `npm run lab -- 365` iki koşuda aynı hash.
- Gözlemci koşuları, 365 gün, bütünlük denetimi açık, kayıt-yükleme hash'i eşit (tek koşu süreleri: 1914 ≈ 27 ms/gün, 2026 ≈ 49 ms/gün, masaüstü):

| Senaryo | Hash | Not |
|---|---|---|
| s750 | `51f2d9348e749da9` | |
| s1600 | `28ced586f7aa1028` | |
| s1914 | `e7eacd059f08ed81` | Belçika 20 Aralık 1914'te teslim; Almanya 1915 ortasında 37 bölge |
| s1939 | `4cc903635cdd8c08` | Polonya 25 Ekim 1939'da teslim |
| s2026 | `2181e2f7221ec20f` | |

- Tarayıcı denemesi (360×800, Playwright): senaryo seçimi, olay kararı (gün ilerlemeden), komutan paneli, bir günlük ilerleme, muharebe görüntüleyicisi; konsol hatası yok.
- Savaş sonuçları tohuma ve komutan kadrosuna duyarlıdır; yukarıdaki tarihler kabul eşiği değil, sabit tohumlu gözlemdir.
