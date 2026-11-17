# CLAUDE.md — Deterministik Büyük Strateji Motoru ve Geliştirme Anayasası

## 1. TEK GERÇEKLİK KAYNAĞI VE ŞARTNAME HİYERARŞİSİ
* **Referans Belge:** Projenin tek bağlayıcı şartnamesi `docs/sartname-v1.4.md` dosyasıdır.
* **Kural Değişmezliği:** Şartnamedeki **ZORUNLU** kurallar kesinlikle değiştirilemez veya esnetilemez.
* **Varsayılan Değer Güncellemesi:** Bir **VARSAYILAN** denge/sabit değeri değiştirildiğinde, **aynı commit içinde** mutlaka `docs/kararlar/` altına gerekçeli karar kaydı eklenmeli ve ilgili birim/simülasyon testleri güncellenmelidir.

---

## 2. SAF VE DETERMİNİSTİK MOTOR KURALLARI (`packages/engine`)
`packages/engine` paketi tamamen saf (pure) ve platformdan bağımsızdır. İki farklı cihazda veya iki ayrı koşuda aynı başlangıç durumu ve aynı emirlerle **birebir aynı dünya hash'ini** üretmek zorundadır.

1. **Yasaklı API ve Yapılar (ESLint Zorunlu):**
   * `Date`, `Intl`, `toLocaleString` kullanımı kesinlikle yasaktır.
   * `Math.random`, `Math.round`, `Math.sqrt`, `Math.pow`, `Math.log`, `Math.exp` ve kayan noktalı (floating-point) belirsizlik yaratacak standart matematik fonksiyonları yasaktır.
   * Nesne özelliklerinde sıra garantisi olmadığı için `for...in` döngüsü yasaktır (`Object.keys` / `Object.entries` veya deterministik sıralı diziler kullanılmalıdır).
2. **Kanonik Durum Tipi:**
   * Kanonik oyun durumunda (`state`) yalnızca **güvenli tamsayılar (`Number.isSafeInteger`)** kullanılabilir.
3. **Özel Matematik ve Yuvarlama:**
   * Tüm oran ve bölme işlemlerinde yalnızca motorun yerleşik `mulRatio`, `divRatio` ve `mulDiv` fonksiyonları kullanılmalıdır.
   * Korunan kaynak/miktar dağıtımlarında bölünmeden arta kalan değerler kaybolmamalı, mutlaka ilgili **artık kanalına** yazılmalıdır.
   * Tüm yuvarlama işlemleri yalnızca `roundHalfEven` (bankacı yuvarlaması) ile yapılmalıdır.
4. **Deterministik Rastlantısallık (`rng`):**
   * Global sayaç veya durumsuz rastgele sayı üretimi yasaktır.
   * Tüm rastgele seçimler yalnızca şu imzaya sahip fonksiyonla yapılır:
     `rng(tohum, gün, sistem, varlık, kuşak, amaç, örnek, sayaç)`

---

## 3. ŞEMA, DURUM YÖNETİMİ VE EMİR MİMARİSİ
1. **Şema Evrimi (`state/world.ts`):**
   * Oyuna eklenen her yeni sütun, alan veya tablo mutlaka `state/world.ts` şemasına tanımlanmalıdır (bu sayede serileştirme ve dünya hash hesaplamasına otomatik dahil olur).
   * Şemada yapılan her yapısal değişiklikte `SEMA_SURUM` sabiti mutlaka artırılmalıdır.
2. **Karar Modülü ve Yapay Zeka (AI) Sınırları:**
   * Yapay zeka karar modülleri dünya durumunu doğrudan değiştiremez; oyuncuyla tamamen aynı yoldan, yani `orders.uygula` arayüzü üzerinden emir vermek zorundadır.
   * Karar modülleri düşman veya yabancı birliklerin gücünü doğrudan `state` üzerinden okuyamaz; yalnızca sis/gözlem sınırları içindeki `observe` aralığından okuyabilir.
3. **Emir Yaşam Döngüsü (Zorunlu 4 Bileşen):**
   * Sisteme eklenen her yeni emir türü (örneğin ekipman üretimi, ikmal hattı, birlik hareketi) şu dört parçayı eksiksiz içermelidir:
     1. `onizle`: Dünyayı (`state`) kesinlikle değiştirmeden emrin geçerliliğini ve tahmini sonucunu döner.
     2. `uygula`: Doğrulanmış emri kanonik duruma uygular.
     3. `emirMetni`: Emri deterministik metin komutuna dönüştürür.
     4. **Ayrıştırıcı (Parser) Çözümü:** `emirMetni` çıktısını tekrar aynı emir nesnesine geri çözebilmelidir (bkz. `T123` testi).

---

## 4. KODLAMA DİSİPLİNİ VE TAMAMLANMA TANIMI (DEFINITION OF DONE)
Claude hiçbir özelliği yarım bırakamaz (`// TODO`, boş gövde veya ayrıştırıcısı eksik emir yasaktır). Bir görevin "tamamlandı" sayılması için aşağıdaki **4 şartın tamamı** sağlanmalıdır:

1. **Tip, Lint ve Birim Testleri:** `npm run tip && npm run lint && npm test` komutları sıfır hata ve sıfır uyarı ile yeşil dönmelidir.
2. **Regresyon Testi (`T` Testleri):** Eklenen her yeni mekanik veya emir türü için ilgili `T` testi (`T123` standardında geri çözülme, sınır değerleri ve hata durumları dahil) test paketine eklenmiş olmalıdır.
3. **365 Gün Determinizm Hash Kontrolü:** `npm run lab -- 365` komutu art arda iki kez çalıştırıldığında üretilen nihai simülasyon hash değeri **birebir aynı** çıkmalıdır.
4. **Uçtan Uca Entegrasyon:** Yeni eklenen sistem (örneğin Ekipman/Lojistik); `state/world.ts` şemasına, günlük simülasyon döngüsüne, `orders` emir hattına ve Android arayüz (UI) katmanına tam bağlı olarak teslim edilmelidir.
