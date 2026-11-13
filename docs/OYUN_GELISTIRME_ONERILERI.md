# Tarih Strateji — Rakip Analizi ve Geliştirme Önerileri

13 Kasım 2026 · Sürüm 1.6.1 · Kıdemli oyun tasarımcısı / ürün yöneticisi bakışı

> **Kaynak dürüstlüğü.** Web aramaları (Android strateji listeleri, Age of History 3, Supremacy 1914) ince ve çoğunlukla düşük kaliteli listeler döndürdü; savaş görselleştirmesi gibi ayrıntılar bulunamadı. Bu yüzden rakip bölümü, aşağıda "web" diye işaretlenen birkaç doğrulanmış noktanın dışında **genel tür bilgisine** dayanır; fiyat, sürüm ve güncel özellik iddiaları doğrulanmamıştır. Öneriler, bu depodaki gerçek koda (`packages/*`, `apps/android`) bakılarak yazılmıştır.

---

## 1. Rakip ve referans oyun analizi

### 1.1 Karşılaştırma tablosu

| Oyun / tür | Güçlü olduğu yer (bizim için ders) | Zayıf olduğu yer (bizim için fırsat) | Kaynak |
|---|---|---|---|
| **Age of History 2/3** (tek oyunculu harita stratejisi, tarihsel dönemler) | Çok sayıda bölge/ülke, **senaryo ve harita editörü**, topluluk içeriği, düşük donanım isteği | Diplomasi basit/eksik, **öğretici yok**, savaş sadeleştirilmiş; bir kullanıcı senaryo yüklerken çökme bildirmiş | web (düşük güven) |
| **Supremacy 1914 / Call of War / Conflict of Nations** (çok oyunculu, gerçek zamanlı) | Diplomasi ve uzun vadeli planlama, kısa "bak–karar ver–çık" oturumlar | Yavaş tempo, ücretli avantaj (premium para birimi) şikâyeti; savaş görseli "işlevsel, gösterişsiz" | web |
| **Civilization VI mobil** (4X, sıra tabanlı) | Cilalı arayüz, hex haritada **net birim/şehir görselleri**, öğretici, danışman | Tarihî derinlik/gerçekçi ekonomi yok | web + genel |
| **Rise of Kingdoms / Rise of Nations tarzı** | Dünya haritasında **canlı cephe**, büyük ordu animasyonları, sosyal bağ | Pay-to-win, çevrimiçi zorunluluğu | genel |
| **Hearts of Iron / Europa Universalis** (PC; mobilde resmî karşılığı yok) | Derinlik: komutan, lojistik, ekipman, harita modları, olay zincirleri | Karmaşıklık, öğrenme eğrisi | genel |
| **Pax Historia** (yapay zekâ destekli alternatif tarih) | Serbest metinle senaryo, esneklik | Dil modeline/çevrimiçine bağımlı, tutarlılık sorunu | genel |
| **Polytopia / Bad North / Into the Breach** (minimal görsel dil) | **Az sanatla çok okunaklı** savaş: renk, sembol, animasyon | Kapsam küçük | genel |

### 1.2 Çıkarımlar

1. **Rakip boşluğu:** çevrimdışı + Türkçe + komut öncelikli + bu derinlik. Rakipler ya basit (Age of History) ya çevrimiçi/ücretli (Bytro) ya da PC’de (Paradox).
2. **Tekrarlanan şikâyetler** (rakiplerin zayıf noktaları): öğretici yokluğu, basit diplomasi, ücretli avantaj, savaşın "okunamaması". Bizim güçlü yanımız diplomasi + açıklanabilirlik; **zayıf yanımız hâlâ öğretici ve savaş görselliği**.
3. **Başarılı mobil stratejiler görsel geri bildirimi** (hareket, çarpışma, yıkım) yapar; biz sonucu iyi *açıklıyoruz* ama savaşı iyi *göstermiyoruz*.

---

## 2. Bizim durumumuz (kod gerçekleri)

| Konu | Mevcut durum |
|---|---|
| Çizim | Harita ve muharebe görüntüleyici **Canvas 2D** (`packages/map`, `packages/ui/src/Muharebe.tsx`, 220 satır). WebGL yok |
| Android | Capacitor 8 kabuğu; **tek Java dosyası**: `MainActivity.java`. Yerel eklenti (plugin) yok. `minSdk 24`, `targetSdk 36` |
| Eklentiler | Yalnız `@capacitor/filesystem` ve `@capacitor/share` |
| Motor | Saf TypeScript, Web Worker içinde; Java’ya taşınamaz (bilinçli: deterministik tek kod tabanı) |
| Ses / titreşim | Yok |
| Savaş verisi | Hash dışı **`muharebeler` kaydı** (güç, savunma, organizasyon, personel, hava üstünlüğü) — görselleştirme için hazır ham madde |

**Önemli mimari gerçek:** Oyun mantığı Worker’da kalmalı. "Java kullanan eklemeler" en iyi şekilde **Capacitor yerel eklentileri** olarak gelir: motor/oyun durumu TS’de, yalnız *sunum* ve *cihaz hizmetleri* Java’da. Aksi hâlde iki ayrı simülasyon ve hash uyuşmazlığı riski doğar.

---

## 3. Savaş ve görselleştirme önerileri (öncelikli bölüm)

### 3.1 Harita üzerinde canlı savaş katmanı (TS, Canvas) — **P0**

| Öneri | Detay | Değer | Maliyet |
|---|---|---|---|
| **Cephe hattı ve yön okları** | Taarruz/geri çekilme okları, kontrol sınırı kalın çizgi, "baskı" ısı haritası (muharebe yoğunluğu) | Savaşın nerede olduğunu tek bakışta gösterir | Düşük–orta |
| **Birim pulları + durum halkası** | Pulun etrafında halka: organizasyon (yeşil→kırmızı), ikmal (mavi), komutan rozeti; muharebede titreme | Plan kartı olmadan durum okunur | Düşük |
| **Gün sonu "olay sinematiği"** | Önemli olaylar (başkent düştü, teslim, çıkarma) için 2–3 sn’lik kamera yaklaşması + metin | Duygusal ödül; "oyun hissi" | Orta |
| **Hareket izi** | Birliğin son 7 gündeki yolu soluk çizgi | Lojistik/ilerleme anlaşılır | Düşük |
| **Isı haritası harita modları** | Mevcut 6 moda ekle: *muharebe yoğunluğu*, *ikmal kıtlığı*, *hava üstünlüğü*, *savaş yorgunluğu* | Karar desteği | Orta |

**Not:** Bunların hepsi `muharebeler` kaydı ve mevcut tablolardan beslenir; motoru değiştirmez, hash’i etkilemez.

### 3.2 Muharebe görüntüleyicisinin zenginleştirilmesi — **P0/P1**

Bugünkü görüntüleyici dikey Canvas’ta kartlar ve çubuklarla "neden" özetini oynatıyor. Öneriler:

1. **Katmanlı yeniden oynatma:** kara birliği, topçu baskısı, hava desteği, kıyı bombardımanı, tahkimat için ayrı şerit; her şerit açılıp kapanır (filo/kanat artık ayrı varlık olduğundan yapılabilir).
2. **Kayıp sayaçları ve "dönüm noktası" vurgusu:** hangi etkenin (hava üstünlüğü, komutan, tahkimat) sonucu çevirdiğini işaretle. Kayıtta bu çarpanlar zaten var.
3. **Zaman çubuğu ve hız:** 1×/2×/4×, durdur, günü atla.
4. **Karşılaştırma modu:** iki gün veya "bu savaş / aynı savaşın yapay zekâ yürütmesi".
5. **Paylaşılabilir savaş kartı:** PNG olarak dışa aktarma (Capacitor Filesystem/Share zaten var).

### 3.3 Deniz ve hava görselleştirme — **P1**

- **Filo rotası çizimi:** yoldaki filo için hedefe kesikli çizgi, kalan gün etiketi (veri hazır: `hedef`, `varis`).
- **Hava menzil halkaları:** seçili kanadın üssünden menzil çemberi; hedef bölgeler vurgulanır (menzil dışı gri). Oyuncunun en sık yaptığı hata (menzil dışı görev) önlenir.
- **Üs doluluk göstergesi:** hava üssü kapasite çubuğu (uçak / kapasite).

### 3.4 Java / yerel Android eklemeleri — **P1–P2**

Önce dürüst değerlendirme: **Savaş sahnesini Java’da (yerel OpenGL/Canvas) yazmak şimdilik önerilmez.** Canvas 2D + WebView bu oyunun çizim ihtiyacına (2D harita, kartlar, oklar) yeter; yerel sahne yazmak iki çizim yolunu (web + yerel) bakım yükü yapar. Java, **cihaz hizmetlerinde** gerçek değer üretir:

| Capacitor yerel eklentisi (Java) | Ne sağlar | Öncelik |
|---|---|---|
| **`HapticsPlugin`** (`Vibrator`/`VibrationEffect`) | Savaş ilanı, başkent düşüşü, olay kartı için titreşim kalıpları | P1 — çok düşük maliyet |
| **`SoundPlugin`** (`SoundPool` + `MediaPlayer`) | Düşük gecikmeli efekt (top sesi, zafer/yenilgi, UI), arka plan müzik; sessiz mod | P1 — ses şu an hiç yok |
| **`LocalNotificationPlugin`** | Çevrimdışı çalışır (INTERNET izni gerekmez): "Önemli olay bekliyor", araştırma/inşa bitti | P2 — geri dönüş sebebi |
| **`PerformanceHintPlugin`** (`PerformanceHintManager`, `Thermal API`) | Isınan telefonda otomatik "ilerleme hızı/ayrıntı" düşürme; **telefon başarım ölçümü** için ham veri | P1 — en büyük teknik risk |
| **`SafFilePlugin`** (Storage Access Framework) | Kayıt dosyası (.tsk) yedekleme/geri yükleme, savaş kartı PNG kaydı | P2 |
| **`ImmersivePlugin`** (WindowInsets) | Tam ekran, kesinti (notch) güvenli alan, yatay/dikey sorunsuzluk (T69 gerçek cihaz testi) | P2 |
| **`NativeBattleSurfaceView`** (isteğe bağlı) | Yoğun parçacık/animasyon gerektiren sinematikler için yerel `SurfaceView` | P3 — yalnız Canvas yetmezse |

**Kural:** Eklentiler motoru çağırmaz; TS tarafı olayları (`muharebe bitti`, `başkent düştü`) eklentiye *bildirir*. Böylece motor deterministik kalır; ses/titreşim yalnız sunum katmanıdır.

### 3.5 Savaş mekaniği önerileri — **P1–P2**

| Öneri | Gerekçe |
|---|---|
| **Çıkarma harekâtı + ortak taşıma bütçesi** (PR-09) | Deniz/hava artık ayrı birim; kara-deniz bağı eksik. İkinci Dünya Savaşı ve Büyük Savaş’ın en tanınan operasyonları (Gelibolu, Normandiya) oynanamıyor |
| **Kolordu / ordu grubu hiyerarşisi** (PR-07 kalanı) | Komutan kapasitesi 6+ birim; 30+ birimlik ordularda mikro yönetim yükü. Üst komuta "bir emir, çok birim" |
| **Taktik emir zinciri (Plan DSL)** | "Kars’ı al, sonra Erzurum’a yönel; ikmal %60’ın altına inerse dur" — kalıcı plan dili (T55 NOT_IMPLEMENTED) |
| **Hat ve cephe çizimi** | Oyuncu cephe hattı çizer, birlikler otomatik dağılır (oyuncu elle birlik seçmek zorunda kalmaz) |
| **Savaş ayrıntı düzeyi ayarı** | "Hızlı / Standart / Ayrıntılı": çok birimli savaşta ayrıntıyı gizler; telefonda başarım ve karmaşıklık kontrolü |
| **Yaralı/esir/moral görünürlüğü** | Mevcut nüfus muhasebesi var; savaş raporunda "kayıp nereye gitti" bilgisini göster |

### 3.6 Mekanik, tasarım ve oynanış önerileri (savaş dışı)

| Alan | Öneri | Öncelik |
|---|---|---|
| **Hedef sistemi** | Senaryo hedefleri (tarihî + serbest), puan, oyun sonu özeti, "Kronik" paylaşım kartı | **P0** |
| **Öğretici** | Küçük ülkeyle (örn. Belçika 1914) yönlendirmeli ilk 15 dakika; ipucu balonları; "önerilen 3 hareket" hedefe bağlı | **P0** |
| **Komut çubuğu mobil uyumu** | En sık 20 emir için tek dokunuş kısa yol; "son komutlar" ve eşdeğer komut öğretici rolü | **P0** |
| **Ses/titreşim** | 3.4’teki eklentiler | **P1** |
| **Gelişmiş teknoloji** | Araştırma → prototip → üretim (PR-10) | P1 |
| **Siyasetçi kişiler** | Komutan modeli siyasette tekrar kullanılır (PR-11) | P2 |
| **Barış konferansı** | Çok maddeli antlaşmanın çok taraflı sürümü | P2 |
| **Günlük meydan okuma** | Sabit tohum + sonuç kodu; sunucusuz paylaşım (deterministik motor sayesinde) | P2 |
| **Senaryo/mod paketleri** | Veri derleyici zaten var; kullanıcı senaryo paketi içe aktarma | P3 |

---

## 4. Mimari önerileri

| Öneri | Gerekçe | Öncelik |
|---|---|---|
| **Gerçek telefon başarım hattı** | Masaüstünde 2026 ≈ 47 ms/gün; telefonda ölçülmedi. CI’da emülatör/Firebase Test Lab veya cihaz çiftliğiyle "1 yıl ilerle" süresi izlenmeli; bütçe eşiği (ör. ≤ 5 sn/ay) test edilmeli | **P0** |
| **Başarım iyileştirmeleri** | Profilde `rows`/tablo taramaları baskın; bölge başına indeksler, haftalık önbellek, artımlı hesap | P1 |
| **Uzun koşu regresyon seti** | 5/10/25 yıllık koşular ve çoklu tohum (≥6) CI’da gece koşusu; denge kuralı değişince 1914/1939’un birbirini bozmadığı görülsün | **P0** |
| **Denge ayarı veri-yönelimli** | Yapay zekâ eşiklerini sabitlerden `ayar.json`a taşı; senaryo başına geçersiz kılma | P1 |
| **Telemetri-sız tanılama** | Çevrimdışı "tanılama dosyası" (reddedilen komutlar, panel kullanımı); kullanıcı isterse paylaşır | P2 |
| **Eklenti sınırı** | Yerel eklentiler için tek arayüz (`Sunum.sesCal`, `Sunum.titret`, `Sunum.bildir`); web’de no-op | P1 |
| **İmzalı sürüm ve mağaza hazırlığı** | Release keystore, AAB, gizlilik metni, yaş sınıflaması (sürgün/soykırım emirleri) | P2 |
| **Erişilebilirlik** | Renk körlüğü paleti, yazı ölçeği, büyük dokunma hedefleri; harita modlarında desen | P2 |

---

## 5. Senaryolar daha fazla ayrıştırılmalı mı?

### 5.1 Kısa cevap

**Evet — ama "daha çok senaryo" değil, "daha ayrışmış senaryo" yönünde; ve motoru çatallamadan.**

### 5.2 Gerekçe (veriye dayalı)

| Gözlem | Veri |
|---|---|
| Aynı harita, aynı motor | Beş senaryo da 813 bölge kullanıyor; farkı başlangıç sahipliği, birimler, olaylar ve katalog adları yaratıyor |
| İçerik dengesiz | Olay sayısı: 750 → 11, 1600 → 10, 1914 → **30**, 1939 → 20, 2026 → **5** |
| Dönem mekaniği zayıf farklı | Deniz/hava 1914+’da; 750/1600’de kara ağırlıklı; "dönem kimliği" daha çok *isimlerde* |
| Tek zaman dilimi | 1914 ve 1939 yalnız tek başlangıç tarihi: oyuncu 1914’te Temmuz Krizi’nden başlıyor, 1916/1918 dönüm noktaları yok |
| Denge tek senaryoya bağlı | 1914’te Almanya, 1939’da Polonya hassas; bir kuralı değiştirmek diğerini bozuyor (bu oturumda yaşandı) |

### 5.3 Üç ayrışma ekseni

**A. Zaman ekseni (düşük maliyet, yüksek değer):** her dönemi 3–4 *başlangıç noktasına* böl.

| Dönem | Önerilen başlangıçlar |
|---|---|
| Büyük Savaş | 28 Haziran 1914 (Temmuz Krizi) · Ağustos 1914 (savaş başı) · 1916 (siper savaşı, Verdun) · 1918 (son yıl) |
| İkinci Dünya Savaşı | 1936 (savaş öncesi) · 1 Eylül 1939 · 1941 (Barbarossa) · 1944 (Normandiya sonrası) |
| Modern Dünya | 2026 ve (kurgusal) gerilim senaryoları |
| 1600 / 750 | Başlangıç tarihi çeşitlemesi daha düşük öncelik |

Bu, aynı paket yapısıyla (başlangıç tarihi + sahiplik + birim + olaylar) ve mevcut göç mimarisiyle yapılabilir; motor değişmez.

**B. Mekanik ekseni (orta maliyet, yüksek kimlik):** her dönemin kendi *kural modülü* olsun, ortak çekirdeği paylaşsın.

| Dönem | Dönem mekaniği fikri |
|---|---|
| 750 | Hilafet/feodal meşruiyet, mevsimsel sefer, fetih-ganimet, dinî/kültürel bütünleşme ağırlığı |
| 1600 | Kolonileşme, ticaret yolları ve kervan/deniz ticareti, barut ve ateşli silah geçişi, tahta geçiş krizleri |
| 1914 | Siper savaşı, topçu hazırlığı, seferberlik takvimi, ittifak tetikleme zinciri (zaten var) |
| 1939 | Zırh/hava, müttefik yardımı (Lend-Lease), kaynak harpleri (petrol), direniş hareketleri |
| 2026 | Yaptırım/ambargo ağları, siber ve SİHA, nükleer caydırıcılık, enerji bağımlılığı, medya/kamuoyu |

Uygulama yolu: `donem.ts` ve katalogda zaten dönem anahtarı var; özelliği "bayrakla aç" şablonuyla ekle (şartnamedeki özellik bayrakları). **Motoru çatallama; senaryo paketinde `kurallar: ['yaptirim', 'siber']` gibi liste.**

**C. İçerik ekseni (yüksek maliyet, sürekli değer):** her senaryoya ayrı olay zinciri, ülke başına benzersiz hedefler, tarihî kişiler (komutanlar 1914/1939’da var; 750/1600/2026’da kurgu).

### 5.4 Önerilen sıra

1. **2026’yı doldur:** 5 → 20+ olay; en az 5 ülke için özel hedef zinciri (en geniş senaryo en az hikâyeli).
2. **1914 ve 1939’u zamana böl:** 1936 ve 1941 başlangıçları (savaş dışı/ortası), 1916 ve 1918.
3. **750/1600’e dönem mekaniği:** önce 1600’e ticaret/kolonileşme (en çok oynanışı değiştirir).
4. **Senaryo başına denge raporu:** her senaryo için "tarihî sapma tablosu" (hangi ülke hangi yılda ne kadar toprak); CI’da.
5. **Kullanıcı senaryo paketleri** (Age of History 3’ün editörü gibi; P3).

### 5.5 Riskler

- **Katalog patlaması:** senaryo sayısı arttıkça yapay zekâ ve denge sınaması katlanır → çoklu tohum CI’sı şart (bkz. §4).
- **Bakım yükü:** her mekanik bayrağı test matrisini büyütür; "ortak çekirdek + sınırlı modül" kuralı korunmalı.
- **Tarihî doğruluk ve hassasiyet:** 2026 gibi güncel senaryolarda yaşayan kişiler ve devam eden savaşlar içerik politikası gerektirir.

---

## 6. Önerilen öncelik sırası (özet yol haritası)

| Sıra | İş | Etki | Çaba |
|---|---|---|---|
| 1 | Öğretici + hedef/oyun sonu ekranı | Retention | Orta |
| 2 | Telefon başarım hattı + uzun koşu CI | Güven | Orta |
| 3 | Cephe hattı/ok/ısı haritası + halka göstergeleri (Canvas) | Savaşın okunması | Orta |
| 4 | Muharebe görüntüleyicisi katmanları + savaş kartı paylaşımı | Savaş görselliği | Orta |
| 5 | Java eklentileri: titreşim, ses, performans ipucu | Duyu + başarım ölçümü | Düşük–orta |
| 6 | 2026 olay içeriği + 1936/1941 başlangıçları | Senaryo ayrışması | Orta–yüksek |
| 7 | Çıkarma + ortak taşıma (PR-09) | Savaş derinliği | Yüksek |
| 8 | Kolordu hiyerarşisi + Plan DSL | Mikro yönetim azaltma | Yüksek |
| 9 | Dönem mekanik modülleri (1600 ticaret/kolonileşme) | Dönem kimliği | Yüksek |
| 10 | Yerel bildirimler, SAF yedekleme, imzalı sürüm | Yayın hazırlığı | Orta |

**Önerim:** 1–5’i tek "oynanabilirlik ve his" sürümünde (1.7) birleştirin; 6–9 sonraki içerik sürümü (1.8) olsun. Yeni sistem eklemeden önce başarım ve denge güvencesi (2) gelmeli.

---

## 7. Kaynaklar

- [The 19 best Android strategy games in the Google Play Store](https://geekchamp.com/?p=245207)
- [50 Best Android Strategy Games to Dominate in 2026](https://drfone.wondershare.com/android-games/best-android-strategy-games.html)
- [Age of History 3 — GameBrain](https://gamebrain.co/game/age-of-history-3)
- [Age of History III — VGChartz değerlendirmesi](https://www.vgchartz.com/game/235024/age-of-history-iii/reviews/1488/)
- [Supremacy 1914 — GameBrain](https://gamebrain.co/game/supremacy-1914)
- [Supremacy 1914 Review — MMO Reviews](https://www.mmoreviews.com/?p=55413)

Kaynaklar yalnız "web" işaretli satırları destekler; geri kalanı genel tür bilgisi ve depo analizidir.
