# Tarih Strateji Oyunu — Aşama 1A

Android için çevrimdışı, yapay zekâsız, komut öncelikli büyük strateji oyunu. Bu depo, **Üretim Şartnamesi v1.4**'ün (docs/sartname-v1.4.md) Aşama 1A kapsamını uygular: kurgusal 4 devletli, 48 bölgeli dünyada çalışan tam oyun döngüsü, deterministik motor, Türkçe komut çubuğu ve Android (Capacitor) kabuğu.

## Oyunda ne var

| Sistem | Durum (1A) |
|---|---|
| Senaryo | “Dört Taht Krizi”, 28 Haziran 1914; Akdağ, Mavikıyı, Demirhan, Kızılova. Açılış: Tunçkale suikastı → ültimatom zinciri |
| Harita | 48 bölge, 8 eyalet, gürültülü Voronoi sınırları; 6 harita modu (siyasi, kontrol, gıda, nüfus, ilişki, altyapı); işgal taraması, cephe hattı, birlik sembolleri |
| Komut çubuğu | Türkçe cümleyle emir: kip × olumsuzluk × hal eki çözümleme, soru → danışman, güven < 0,80 → yorum çipleri, ret → en yakın 3 öneri, tanınmayan komut günlüğü |
| Plan kartı | Her emir için “Bugün · kesin” / “30 gün · tahmin” ayrımı, başarısızlık nedeni, iptal bedeli, **eşdeğer komut metni** |
| Nüfus | Bölge başına 4 yaş × 8 statü (O, S, Y, E, A, W, P, R), kimlik dağılımı (≤ 7 hücre), kohort giriş/çıkış, askerlik yasaları, yaralı/esir, köken eyalet muhasebesi |
| Tarım ve gıda | Alan × verim × işçi × sulama × hasat (normalleştirilmiş beklenti 1,000000) × savaş; eyalet havuzları, kıtlık ek ölümü, karne |
| Ekonomi | Katma değer, vergi (idari verim × huzur × kontrol erişimi × kapasite), ödeme sırası, borç/temerrüt, bütçe kalemleri, dünya pazarı (haftalık, √ fiyat kuralı) |
| Sanayi | Sivil/askerî fabrika, tüketim malı, proje inşası, üretim hatları (verim eğrisi, WIP, çelik/kömür girdisi), fiziksel mühimmat |
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
npm test            # 100 kabul testi (tip denetimi: npm run tip, lint: npm run lint)
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

APK yatay kilitlidir, **INTERNET ve RECORD_AUDIO izni yoktur** (manifestte `tools:node="remove"` ile kütüphane birleştirmelerinden de çıkarılır). Kayıt dosyası dışa aktarımı Android paylaşım sayfasını kullanır; ek depolama izni gerekmez.

## Nasıl oynanır

- **Ülke seçin**, başlayın. İlk gün Demirhan'ın suikast kararı gelir; zinciri izleyin.
- **Zaman**: 1 gün · 1 hafta · 1 ay · *Sonraki olay ▸* (önemli olayda veya en çok 3 ayda durur). Uzun atlamalar her gün kesinleşir; *Durdur* bir sonraki gün sınırında işler.
- **Komut çubuğu** (birincil giriş). Örnekler:
  - `Tunçkale'ye saldır` · `1. Piyade Tümeni Sarıova'ya gitsin` · `Akyurt'taki birlikler Kuzgunkaya'ya ilerlesin`
  - `2 piyade tümeni kur` · `Mühimmat üretimine 4 fabrika ayır` · `Seri üretimi araştır`
  - `Vergiyi %18 yap` · `Bilime %40 ayır` · `Savaş ekonomisine geç` · `Askerlik yasasını kapsamlı yap`
  - `Kızılova ile ticaret anlaşması öner` · `Mavikıyı için gerekçe hazırla` · `Demirhan'a beyaz barış öner`
  - `Kızılova'dan her hafta 200 gıda al` · `1 milyon borç al` · `Cepheyi otomatik yönet`
  - Sorular danışmana gider: `Huzur neden düşüyor?` · `Ne yapmalıyım?` · `Savaş nasıl gidiyor?` · `Rakipler ne planlıyor?`
  - Olumsuz emir mevcut emri iptal eder: `Tunçkale'ye saldırmayın`
  - Sandbox: `Hazineye 1 milyon ekle` · `Demirhan'ın hazinesine 2 milyon ekle`
- **Harita**: bölgeye dokunun → bölge kartı (inşa, savun, saldır). Birliğe dokunun → seçin (uzun bas/ctrl: çoklu), sonra hedef bölgeye dokunun → plan kartı.
- **Göstergeler**: üst çubuktaki her değere dokunmak “Neden?” ekranını açar.
- Her menü eyleminin plan kartında **“Bu eylemin komutu: …”** satırı vardır; dokunulduğunda komut çubuğuna yazılır.

## Depo yapısı (şartname 5.4)

```
packages/engine        saf motor (tamsayı sabit nokta, rng.v1, hash.v1, SoA tablolar, P0–P12 faz hattı, sistemler, karar modülü)
packages/command       Türkçe ayrıştırıcı, eşdeğer komut üretici
packages/protocol      Worker mesaj sözleşmesi
packages/storage       OPFS / IndexedDB / bellek depoları, nesil + A/B başlık
packages/worker        tek yazar Worker: görünümler, danışman, ilerletme döngüsü
packages/map           Canvas harita çizicisi
packages/ui            Preact arayüz
packages/data-compiler 1A fixture üreticisi (deterministik)
packages/lab           başsız koşucu
tests/acceptance       kabul testleri (T-kimlikleri test adlarında)
tests/corpus           Türkçe komut kabul kümesi
apps/android           Capacitor kabuğu ve Android projesi
docs/                  şartname, karar kaydı (Ek A), test raporu
```

## Sonraki aşamalar (şartname 27)

1B-1: bayrakların açılması (seferberlik, tahkimat, büyük taarruz, üç rota adayı, zırh), Balkan–Anadolu–Kafkasya kesiti (250–350 bölge). 1B-2: seçim, para basma, çok taraflı konferans, tam istihbarat. Dünya sistemleri: deniz/hava soyut modları, 1914 dünyası. Ardından 1936/1939, 2026, 1600, 750 senaryoları.
