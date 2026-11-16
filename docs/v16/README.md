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
| PR-03 Kayıt ve kimlik | kısmen | Şema 10 (komutan, istihbarat raporu, filo, kanat); şema 5–9 ve harita v1 kayıtları göç eder. Genel etki defteri ve kaynak defteri yok |
| PR-04 Şehir ve inşa | tamamlandı | Düzey × 4 yapı yuvası, bedelsiz fabrika yok (K-45) |
| PR-05 Harita %70 | tamamlandı | 813 bölge, senaryo mirası, 1914/1939 inceltmesi, kayıt göçü (K-47) |
| PR-06 Demografi | kısmen | Ülke geneli halk dökümü, iskân kuralı (K-52). Seyrek kohort tablosu (dil, meslek, eğitim) yok; bölge başına 7 kimlik hücresi sürüyor |
| PR-07 Komutan/ordu | kısmen | Komutanlar, atama, kapasite, daimî emir (K-49). Kolordu/ordu grubu hiyerarşisi ve çizilen cephe hatları yok |
| PR-08 Deniz/hava | tamamlandı | Bağımsız filolar ve hava kanatları (şema 10): tek konum/üs, tek görev, menzil, seyir süresi, yakıt, üs kapasitesi, aktarım, ana liman/üs değişimi; karar modülü birim birim emir verir (K-54, K-55). Deniz bölgeleri ayrı harita katmanı değildir: filolar kıyı bölgelerinde konumlanır |
| PR-09 Lojistik | yapılmadı | Mevcut ortak kenar kapasitesi sürüyor; kara/deniz ortak taşıma bütçesi yok |
| PR-10 Teknoloji/ekipman | yapılmadı | Araştırma → prototip → üretim aşamaları ve adlı ekipman modelleri yok |
| PR-11 Kişiler/siyaset | kısmen | Komutanlar kalıcı kişidir; siyasetçiler hâlâ takvimden türetilir, beş parti şablonu sürüyor |
| PR-12 İstihbarat | kısmen | Gözlem günlü, aralıklı, eskiyen raporlar (K-52). Ajan ağı ve karşı istihbarat yok |
| PR-13 Diplomasi/barış | kısmen | Çok maddeli atomik antlaşma (K-51). Barış konferansı ve silahsızlanma maddesi yok |
| PR-14 Alternatif tarih/YZ | kısmen | Kesin sonuç cephesi (K-48), 1939 yıldırım etkisi. Plan hafızası yok |
| PR-15 Muharebe ekranı | tamamlandı | Kayıt + dikey Canvas görüntüleyici (K-50). Görüntüleyiciden taktik emir verilmez |
| PR-16 Arayüz/rapor | kısmen | 3 ve 6 aylık adım, Devletim / Dünya Olayları raporu, komutan ve antlaşma formları. Etkileşimli teknoloji grafiği ve kalıcı plan dili yok |
| PR-17 Son kabul ve APK | kısmen | 324 otomatik test, beş senaryoda 365 gün koşu, web derlemesi, CI'da APK. Gerçek cihaz denemesi ve 5/10/25 yıllık koşular yapılmadı |

## Kabul testleri (V16-T01…T70)

`kabul-matrisi-v16.csv`: **48 PASS, 18 PARTIAL, 2 NOT_IMPLEMENTED, 2 NOT_RUN.** PARTIAL: davranış var ama kapsayıcı otomatik test ya da tam model yok; ayrıntı satırlarda.

## Bulgular (F-01…F-20)

Kapanan: F-01–F-08, F-12, F-13, F-14, F-18. Kısmen: F-09 (komutanlar için), F-11 (ülke geneli döküm). Açık: F-10, F-15, F-16, F-17, F-20.
F-19 (1914 Brezilya başkenti) hata değildir: haritada ayrı “Rio de Janeiro” bölgesi yoktur; Brasília bölgesi 1914 ve 1939'da bu adla gösterilir.

## Doğrulama

- `npm run tip`, `npm run lint`, `npm test` (18 dosya, 324 test) yeşil.
- `npm run lab -- 365` iki koşuda aynı hash (`79059ecd7468544d`).
- Gözlemci koşuları, 365 gün, bütünlük denetimi açık (filo/kanat ayna denetimi dahil), kayıt-yükleme hash'i eşit (tek koşu süreleri: 1914 ≈ 33 ms/gün, 2026 ≈ 47 ms/gün, masaüstü):

| Senaryo | Hash | Not |
|---|---|---|
| s750 | `93c37691cc58782d` | |
| s1600 | `bbed3bcc5049aa69` | |
| s1914 | `be666c2daef1960f` | Belçika 20 Kasım 1914'te teslim |
| s1939 | `d187a2c6990b774b` | Polonya 10 Ekim 1939'da teslim |
| s2026 | `70f06eadeb8c914b` | |

- Tohum duyarlılığı (paket tohumu +0…+5, gözlemci): 1939'da Polonya, K-55 kuralıyla denenen altı koşunun altısında 25 Eylül–10 Ekim 1939 arasında teslim oldu (PR-08 öncesi sürümde üçünde). 1914'te Almanya'nın Haziran 1915'teki bölge sayısı 13–49 arasında dağılır (öncesi 23–49); Belçika altı koşunun dördünde 1914–15 kışına dek teslim olur. İki cepheli savaşta Almanya'nın 1915 baharında gerilemesi PR-08'den bağımsız, süren bir denge konusudur.
- Tarayıcı denemesi (360×800, Playwright): senaryo seçimi, olay kararı (gün ilerlemeden), komutan paneli, kuvvet paneli (filo ve kanat listeleri, görev emri), bir günlük ilerleme, muharebe görüntüleyicisi; konsol hatası yok.
- Savaş sonuçları tohuma ve komutan kadrosuna duyarlıdır; yukarıdaki tarihler kabul eşiği değil, sabit tohumlu gözlemdir.
