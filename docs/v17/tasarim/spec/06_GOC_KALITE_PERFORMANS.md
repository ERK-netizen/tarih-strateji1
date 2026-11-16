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
