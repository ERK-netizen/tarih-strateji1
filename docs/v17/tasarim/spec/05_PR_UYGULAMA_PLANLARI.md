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
