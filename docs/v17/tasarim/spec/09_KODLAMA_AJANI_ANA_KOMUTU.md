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
