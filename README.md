# Tarih Strateji Oyunu

Android için çevrimdışı, yapay zekâsız, komut öncelikli büyük strateji oyunu. **Üretim Şartnamesi v1.4** (docs/sartname-v1.4.md) üzerine kurulu: deterministik motor, Türkçe komut çubuğu, Android (Capacitor) kabuğu ve gerçek dünya haritasında beş tarihî senaryo.

## Senaryolar

| Senaryo | Başlangıç | Devlet | Öne çıkanlar |
|---|---|---|---|
| Halifeler ve Krallar | 1 Ocak 750 | 50 etkin + 69 topluluk | Abbâsîler (Ebu'l-Abbas es-Seffah) – Emevîler (II. Mervan) savaşı, Bizans, Franklar (Kısa Pepin), Tang (Xuanzong), Tibet, Hazarlar |
| Barut ve Keşifler | 1 Ocak 1600 | 70 etkin + 73 topluluk | Osmanlı (III. Mehmed) – Habsburg Uzun Savaşı, İspanya (III. Felipe) – Felemenk, I. Elizabeth İngilteresi, Ekber Şah, I. Abbas |
| Büyük Savaş | 28 Haziran 1914 | 62 | Saraybosna suikastı → Temmuz Krizi zinciri; II. Wilhelm, V. George/Asquith, II. Nikolay, Poincaré, V. Mehmed Reşad |
| İkinci Dünya Savaşı | 1 Eylül 1939 | 68 | Almanya–Polonya ve Japonya–Çin savaşları; Hitler, Chamberlain, Stalin, Roosevelt, Mussolini, İnönü |
| Modern Dünya | 1 Ocak 2026 | 179 | Rusya–Ukrayna ve Sudan savaşları, NATO; 2026 başındaki devlet ve hükümet başkanları |

Harita Natural Earth sınırları ve GeoNames şehirleriyle derlenir (463 bölge, 179 ülke); her senaryo bölge adlarını, sahiplerini, liderleri, kültürleri, orduları ve tarihî olay zincirini kendi döneminden alır. Birlik, ekipman, teknoloji ve tesis adları dönemle değişir (ör. 750'de Piyade Ordusu ve mancınık, 2026'da mekanize tugay ve roket taburu).

## Oyunda ne var

| Sistem | Durum (1A) |
|---|---|
| Senaryo | Beş tarihî senaryo (yukarıda); test için 1A kurgusal dünyası (48 bölge) korunur |
| Harita | Gerçek dünya; 6 harita modu (siyasi, kontrol, gıda, nüfus, ilişki, altyapı); işgal taraması, cephe hattı, başkent yıldızları, yakınlaşmaya göre ülke/bölge adları; dönem görselli birlik pulları (game-icons.net) |
| Arayüz | Tek sağ çekmece (panel, bölge ya da tur raporu; pencereler üst üste binmez), sol ray, orta sütunda plan kartı ve komut; bölgede birlik türü başına −/+ seçimi; yeni birliğin konuşlanacağı şehir listeden ya da haritadan seçilir |
| Komut çubuğu | Türkçe cümleyle emir: kip × olumsuzluk × hal eki çözümleme, soru → danışman, güven < 0,80 → yorum çipleri, ret → en yakın 3 öneri, tanınmayan komut günlüğü |
| Plan kartı | Her emir için “Bugün · kesin” / “30 gün · tahmin” ayrımı, başarısızlık nedeni, iptal bedeli, **eşdeğer komut metni** |
| Nüfus | Bölge başına 4 yaş × 8 statü (O, S, Y, E, A, W, P, R), kimlik dağılımı (≤ 7 hücre), kohort giriş/çıkış, askerlik yasaları, yaralı/esir, köken eyalet muhasebesi |
| Tarım ve gıda | Alan × verim × işçi × sulama × hasat (normalleştirilmiş beklenti 1,000000) × savaş; eyalet havuzları, kıtlık ek ölümü, karne |
| Ekonomi | Katma değer, vergi (idari verim × huzur × kontrol erişimi × kapasite), ödeme sırası, borç/temerrüt, bütçe kalemleri, dünya pazarı (haftalık, √ fiyat kuralı) |
| Sanayi | Sivil/askerî fabrika, tüketim malı, proje inşası, üretim hatları (verim eğrisi, WIP, çelik/kömür girdisi), fiziksel mühimmat; şehir düzeyi × 4 yapı yuvası (demiryolu, sulama, altyapı ve imar yuva tüketmez; şehir imarı bedelsiz fabrika vermez) |
| Lojistik | Ortak kenar kapasitesi, sınıf öncelikli tek rota tahsisi, transit, varışta el koyma, tahsis önbelleği |
| Kara muharebesi | Çekirdek mod: saldırı/savunma/kırılma/organizasyon, arazi genişliği, anahtarlı r ∈ [0,85; 1,15], eşzamanlı kayıp, geri çekilme, teslim, kış yıpranması |
| Kontrol ve işgal | Yönetim mesafesinden kontrol; işgal itaati (yumuşak/dengeli/sert), taban erişim, direniş ve sabotaj, kültürel bütünleşme |
| Siyaset | Huzur, meşruiyet, savaşa destek, savaş yorgunluğu (o ayın ölü + kalıcı sakat), PG, yönetim kapasitesi, grev/isyan |
| Diplomasi | Yönlü görüş 0–100, izin eşikleri (20/40/60/80), anlaşmalar, gerekçe, savaş ilanı, müttefik çağrısı, savaş skoru, beyaz/tavizli barış/teslim, ateşkes, tazminat, kaybedilen topraklarda intikam iddiası |
| Karar modülü | Kişilikli rakipler (yayılmacı, temkinli, fırsatçı, ticari); ekonomi, ordu, ticaret, araştırma, diplomasi ve cephe yönetimi — oyuncuyla aynı emir doğrulamasından geçer |
| İstihbarat | Aralık gösterimi; gerçek değer her zaman aralığın içinde, istihbarat arttıkça daralır |
| Rakip niyet göstergesi | Yalnız kamu sinyalinden Düşük/Orta/Yüksek tehdit |
| Olaylar ve Kronik | Telgraf görünümlü karar olayları; şablonlu Kronik (simülasyon hash'inden ayrı anlatı hash'i) |
| Devlet istatistikleri | Ülke başına gruplu tablo + aylık seriler; yabancı ülkede istihbarat aralığı |
| Kayıt | OPFS (yoksa IndexedDB, o da yoksa bellek) nesil dosyaları + A/B başlık; tur sonu otomatik kayıt; dal açma; .tsk dosyasına aktarma |
| Modlar | Normal, Sandbox (kalıcı etiket; kaynak ekle/çıkar), Gözlemci |

1A şartnamesi gereği kapalı özellik bayrakları: zırh/delme/sertlik, rota alternatifleri, seferberlik, tahkimat, büyük taarruz, seçim, para basma, deniz/hava, göç. Bunlar 1B aşamalarında açılır.

## Hızlı başlangıç

```bash
npm ci
npm test            # 114 kabul testi (tip denetimi: npm run tip, lint: npm run lint)
npm run dev         # tarayıcıda geliştirme sunucusu
npm run lab -- 365  # başsız laboratuvar: 1 yıllık gözlemci koşusu, hash ve özet
npm run build:tek   # tek dosyalık oynanabilir HTML → dist-tek/index.html
```

`dist-tek/index.html` dosyası bir web sunucusundan (https veya http://localhost) açılmalıdır; `file://` altında tarayıcılar Worker'ı başlatmaz.

## APK üretimi

Bu çalışma ortamında Google Maven ve Android SDK erişimi kapalı olduğundan APK burada derlenmedi. Android projesi hazırdır (`apps/android/android`). Üç yol:

**1. GitHub Actions (önerilen, bilgisayara kurulum gerekmez).** Depoyu GitHub'a gönderin. `.github/workflows/android-apk.yml` her gönderimde testleri koşar ve APK üretir. Actions sekmesinde koşu bittiğinde **tarih-strateji-apk** paketini indirip `app-debug.apk` dosyasını telefona kurun (Ayarlar → Bilinmeyen kaynaklara izin).

**2. Android Studio.**
```bash
npm ci && npm run android:esitle
```
Ardından Android Studio'da `apps/android/android` klasörünü açın → Build → Build APK(s).

**3. Komut satırı** (JDK 21 ve Android SDK kurulu):
```bash
npm ci && npm run android:apk
# çıktı: apps/android/android/app/build/outputs/apk/debug/app-debug.apk
```

APK dikey (portre) çalışır; Android manifestindeki `sensorPortrait` ayarıyla uyumludur, **INTERNET ve RECORD_AUDIO izni yoktur** (manifestte `tools:node="remove"` ile kütüphane birleştirmelerinden de çıkarılır). Kayıt dosyası dışa aktarımı Android paylaşım sayfasını kullanır; ek depolama izni gerekmez.

## Nasıl oynanır

- **Senaryo seçin**, sonra devleti seçin (öne çıkan kartlar, arama ya da haritaya dokunarak) ve başlayın.
- **Zaman**: 1 gün · 1 hafta · 1 ay · *Olay* (önemli olayda veya en çok 3 ayda durur). *Durdur* bir sonraki gün sınırında işler.
- **Anında emirler (v1.6)**: politika, araştırma, inşa, teklif ve yanıt, olay kararı, savaş/barış, hedef ve görev emirleri onaylandığı anda uygulanır ve otomatik kaydedilir; gün ilerletmek gerekmez. Üretim, yolculuk ve günlük ekonomi zaman ilerledikçe işler. Birlik kurma, alım-satım, borç ve terhis bir sonraki günün emir fazında işler.
- **Harita**: bölgeye dokunun → sağda bölge çekmecesi açılır. Kendi birliklerimiz türlerine göre gruplanır; **− / +** ile kaç birlik göndereceğinizi seçin (en hazırlıklılar önce), sonra haritada hedef bölgeye dokunun → plan kartı → *Onayla*. Birlik puluna ikinci kez dokunmak o bölgedeki bütün birlikleri seçer.
- **Birlik kurma**: Ordu panelinde tür ve adet seçin; *Konuşlanma* listesinden şehri seçin ya da *Haritadan seç* ile haritada şehre dokunun. Bölge çekmecesindeki *Burada birlik kur* aynı işi o şehir için yapar.
- **Komut çubuğu** (birincil giriş). Örnekler:
  - `Varşova'ya saldır` · `Paris'teki birlikler Lille'e gitsin` · `Berlin'de 2 piyade tümeni kur`
  - `Vergiyi %18 yap` · `Bilime %40 ayır` · `Savaş ekonomisine geç` · `Mühimmat üretimine 4 fabrika ayır`
  - `Fransa ile ticaret anlaşması öner` · `Sırbistan için gerekçe hazırla` · `Rusya'ya beyaz barış öner`
  - Sorular danışmana gider: `Huzur neden düşüyor?` · `Ne yapmalıyım?` · `Rakipler ne planlıyor?`
  - Olumsuz emir mevcut emri iptal eder: `Varşova'ya saldırmayın`
- **Göstergeler**: üst çubuktaki her değere dokunmak “Neden?” ekranını açar.
- Her plan kartında **“Komutu: …”** satırı vardır; dokunulduğunda komut çubuğuna yazılır.

## Depo yapısı (şartname 5.4)

```
packages/engine        saf motor (tamsayı sabit nokta, rng.v1, hash.v1, SoA tablolar, P0–P12 faz hattı, sistemler, karar modülü)
packages/command       Türkçe ayrıştırıcı, eşdeğer komut üretici
packages/protocol      Worker mesaj sözleşmesi
packages/storage       OPFS / IndexedDB / bellek depoları, nesil + A/B başlık
packages/worker        tek yazar Worker: görünümler, danışman, ilerletme döngüsü
packages/map           Canvas harita çizicisi
packages/ui            Preact arayüz
packages/data-compiler harita derleyicisi (Natural Earth + GeoNames), senaryo DSL'i ve beş senaryo, simge çıkarıcı, 1A fixture
packages/lab           başsız koşucu
tests/acceptance       kabul testleri (T-kimlikleri test adlarında)
tests/corpus           Türkçe komut kabul kümesi
apps/android           Capacitor kabuğu ve Android projesi
docs/                  şartname, karar kaydı (Ek A), test raporu
```

## Lisanslar ve kaynaklar

Harita: Natural Earth (kamu malı), GeoNames şehir verisi (CC BY 4.0). Birlik ve arayüz simgeleri: [game-icons.net](https://game-icons.net) — Lorc, Delapouite ve diğerleri, CC BY 3.0.

## Sonraki aşamalar (şartname 27)

Bayrakların açılması (seferberlik, tahkimat, büyük taarruz, üç rota adayı, zırh), seçim, para basma, çok taraflı konferans, deniz/hava soyut modları.
