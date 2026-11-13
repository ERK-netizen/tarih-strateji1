# Tarih Strateji — Oyun Analiz Özeti

Sürüm 1.6.1 · 13 Kasım 2026 · Kıdemli oyun tasarımcısı / ürün yöneticisi bakışıyla hazırlanmıştır.

> **Yöntem notu.** İstek şablonundaki köşeli parantezler boş geldiği için alanları depodaki koddan, şartnameden (`docs/sartname-v1.4.md`), karar kaydından (`docs/kararlar/`) ve kendi çalıştırdığım ölçümlerden doldurdum. Sayılar koddan ve koşulardan alınmıştır. Depoda bulunmayan bilgiler (gelir modeli, hedef kitle araştırması, gerçek cihaz ölçümü) uydurulmamış, **“bilinmiyor”** diye işaretlenmiştir.

---

## 1. Oyun kimliği

| Başlık | Değer |
|---|---|
| Ad | **Tarih Strateji Oyunu** |
| Tür / alt tür | Büyük strateji (grand strategy), **komut öncelikli**, deterministik simülasyon, tek oyunculu. Gerçek zamanlı değil: oyuncu zamanı kendisi ilerletir (1 gün, 1 hafta, 1/3/6 ay, 1 yıl, sonraki önemli olay) |
| Tema | Gerçek dünya haritasında beş tarihî dönem: **750** (Halifeler ve Krallar), **1600** (Barut ve Keşifler), **1914** (Büyük Savaş), **1939** (İkinci Dünya Savaşı), **2026** (Modern Dünya) |
| Atmosfer | Ciddi, belgesel tonlu; telgraf görünümlü olay kartları, şablonlu “Kronik” anlatısı, dönemle değişen birlik/teknoloji/ekipman adları |
| Platform | Android (Capacitor kabuğu), geliştirmede tarayıcı. **Tam çevrimdışı**: INTERNET ve RECORD_AUDIO izinleri manifestten bilerek kaldırılmış |
| Dil | Yalnız Türkçe (arayüz ve komut ayrıştırıcı) |
| Yapay zekâ | Dil modeli yok; kural tabanlı karar modülü ve şablonlu anlatı |
| Hedef kitle | Şartnameye göre hardcore strateji oyuncusu (Pax Historia / HOI tarzı derinlik, Türkçe konuşan, mobilde oynayan). Kitle araştırması ya da pazar verisi **bilinmiyor** |
| Gelir modeli | Depoda tanımlı değil (reklam/IAP kodu yok; izin kümesi çevrimdışı bir ürünü gösteriyor). **Bilinmiyor / karar bekliyor** |

### Tasarım sütunları (şartname 2.3)

1. **Açıklanabilir sonuç** — her göstergeden “Neden?” ekranına en fazla iki dokunuş.
2. **Birbirine bağlı kıtlık–savaş–siyaset** — gıda, insan, mühimmat ve meşruiyet aynı defterden beslenir.
3. **Az dokunuşla anlamlı karar** — plan kartı ve otomasyon mikro yönetimi azaltır.
4. **Yazarak yönetme** — oyuncu niyetini Türkçe cümleyle verir; oyun bunu önizlenen plana çevirir.
5. **Ülkenin özgün hikâyesi** — Kronik, olay zincirleri, tarihî eğilim.

---

## 2. Temel oynanış döngüsü (Core Loop)

**Dakikalık döngü (tur):**

1. Durum özeti: nakit ömrü, gıda açığı, cephe riski, bekleyen işler.
2. Niyet: komut çubuğuna Türkçe cümle (“Kiel tersanesinde 2 muhrip inşa et”) ya da panel/harita menüsü. İkisi aynı emri üretir.
3. **Plan kartı**: “Bugün · kesin” ve “30 gün · tahmin” ayrımı, başarısızlık nedeni, iptal bedeli, eşdeğer komut metni.
4. Onay → çoğu idari emir **aynı gün** uygulanır ve kaydedilir.
5. Zaman seçimi → günlük simülasyon; olay/savaş/teklif gibi durma koşullarında kesinleşmiş gün sonunda durur.
6. Rapor: “Devletim” ve “Dünya Olayları”.

**Oyuncunun yaptığı iş:** kaynak ve nüfus yönetir (vergi, bütçe, tarım, sanayi) → araştırır ve inşa eder → ordu, donanma ve hava kuvveti kurar, komutan atar → diplomasi yürütür (ittifak, ambargo, ültimatom, çok maddeli barış) → savaşır → iç siyaseti (huzur, meşruiyet, savaş yorgunluğu, rejim, seçim) dengeler.

| Soru | Cevap |
|---|---|
| Oturum süresi | Şartname hedefi **15–30 dk**; aylık eşdeğer ilerlemede 2–4 anlamlı karar. Gerçek oyuncu verisi **yok** |
| Modlar | **Normal**, **Sandbox** (kalıcı etiketli, kaynak ekle/çıkar), **Gözlemci** (yapay zekâ oynar, oyuncu izler). Çok oyunculu **kapsam dışı** |
| Zaman | Oyuncu denetimli ilerleme; otomatik kayıt, dal açma, `.tsk` dosyasına aktarma |
| Oyuncu hedefi | Şartnamede toprak/refah/güvenlik/diplomasi/teknoloji ağırlıklı puan tanımlı (2.4); arayüzde **belirgin bir hedef/zafer/puan ekranı tespit edemedim** — bkz. 5. bölüm |

---

## 3. İçerik ve sistemler (sayılarla)

| Alan | Durum |
|---|---|
| Harita | Natural Earth + GeoNames; **813 bölge**, 179 ülke (v1.6’da 463’ten +%76). 6 harita modu (siyasi, kontrol, gıda, nüfus, ilişki, altyapı) |
| Senaryolar | 750 (119 devlet/topluluk, 11 olay) · 1600 (143, 10 olay) · 1914 (62, 30 olay) · 1939 (68, 20 olay) · 2026 (179, **5 olay**) |
| Kaynak/mal | Gıda, çelik, kömür, mühimmat, petrol (+ altın/hazine, siyasi güç, insan gücü) |
| Birim | 4 kara şablonu (piyade, süvari, topçu, yedek), 5 tabur türü, 5 gemi sınıfı, 3 uçak türü, **bağımsız filolar ve hava kanatları** (v1.6.1), kalıcı kişiler olarak **komutanlar** (70 tarihî kayıt + üretilmiş kurgu) |
| Yapı/proje | 12 proje türü: sivil/askerî fabrika, sulama, demiryolu, altyapı, valilik, şehir imarı, maden, gemi/uçak siparişi, hava üssü, tersane. Şehir düzeyi × 4 yapı yuvası |
| Teknoloji | **36 teknoloji × 12 kademe**, 8 ekipman, döneme göre farklı adlar |
| Emirler | ~70 emir türü (32 çekirdek + 38 genişletilmiş); her biri önizleme, uygulama, eşdeğer komut metni ve ayrıştırıcıda geri çözülme ister |
| Siyaset/diplomasi | Rejim, 5 parti şablonu, seçim, görüş 0–100, anlaşma türleri, savaş gerekçesi, **çok maddeli barış antlaşması**, ültimatom, himaye/kukla, ambargo, örtülü operasyon |
| Nüfus | Bölge başına 4 yaş × 8 statü + ≤7 kimlik hücresi; asimilasyon, sürgün, iskân |
| İstihbarat | Gözlem tarihli aralık tahmini + güvenilirlik; raporlar 180 günde eskir |
| İlerleme | Ülke içi ilerleme (şehir düzeyi, teknoloji kademesi, ekonomi modeli, komutan deneyimi, kurmay eğitimi). Oyuncu seviyesi/meta ilerleme **yok** |

---

## 4. Teknik yapı ve mimari

### 4.1 Genel bakış

TypeScript monorepo (npm workspaces), ~19 bin satır kaynak, **324 kabul testi (18 dosya)**.

```
Arayüz (Preact + signals + Canvas)  ──istek/yanıt──►  Worker (tek yazıcı Sunucu)
        packages/ui                                         packages/worker
                                                                │
                              ┌─────────────────────────────────┼───────────────────┐
                              ▼                                 ▼                   ▼
                        Motor (saf, deterministik)        Komut ayrıştırıcı     Depolama
                        packages/engine (~10,3 bin sat.)  packages/command      packages/storage
                                                          (Türkçe, kalıp+hal)   OPFS → IndexedDB → bellek
   Veri derleyici: packages/data-compiler  →  data/derlenmis/*.json (harita + 5 senaryo paketi)
   Android: apps/android (Capacitor)  ·  Laboratuvar: packages/lab (başsız koşu, hash)
```

| Paket | Sorumluluk |
|---|---|
| `engine` | Saf simülasyon. `Date`, `Intl`, `Math.random`, `Math.round/sqrt/pow/log/exp`, `for…in` ESLint ile yasak. Kanonik durum yalnız **güvenli tamsayı** (sabit nokta S = 1 000 000); oranlar `mulRatio/divRatio/mulDiv`, yuvarlama `roundHalfEven` |
| `worker` | Dünyanın tek yazarı. Sürüm kilidi (`beklenenSurum`), idempotency anahtarı, tek sıra, “meşgul” durumu, anlık idari emirler, otomatik kayıt |
| `ui` | Çekmece tabanlı panel arayüzü, harita, plan kartı, komut çubuğu, muharebe görüntüleyici (Canvas) |
| `command` | Türkçe cümle → emir: kip × olumsuzluk × hal eki çözümleme, güven < 0,80 ise yorum çipleri, ret → en yakın 3 öneri. Her emirin **eşdeğer komut metni** vardır ve geri çözülür (T123) |
| `data-compiler` | Gerçek harita + senaryo kataloğu → paket JSON’ları; eski kayıtlar için bölge göç eşlemesi |

### 4.2 Simülasyon çekirdeği

- **Günlük faz hattı P0–P12**: emir, karar modülü, ekonomi, nüfus, lojistik, muharebe, siyaset, kayıt vb. Her ülke için yapay zekâ **oyuncuyla aynı emir doğrulamasından** geçer; yabancı güç yalnız gözlem (`observe`) aralığından okunur.
- **Rastlantı**: yalnızca `rng(tohum, gün, sistem, varlık, kuşak, amaç, örnek, sayaç)`; global sayaç yok → aynı tohum aynı sonuç.
- **Durum**: yapısal diziler (SoA) tablolar; kimlik = nesil × 2²⁰ + yuva; eski kimlik geçersizleşir.
- **Doğruluk güvenceleri**: durum özeti (`dunyaHash`), kayıt-yükleme hash eşitliği, bütünlük denetimi (nüfus, gıda, filo/kanat ayna toplamları), şema sürümü (**şema 10**) ve eski kayıtlar için göç (şema 5–9, harita v1).
- **Hash dışı alanlar**: muharebe kaydı ve anlatı (Kronik) simülasyon hash’inden ayrı tutulur.

### 4.3 Başarım (masaüstü, 365 gün, tek koşu)

| Senaryo | ms/gün | Not |
|---|---|---|
| 1914 | ≈ 33 | |
| 2026 | ≈ 47 | 179 devlet, 818 birlik |

**Gerçek telefon ölçümü yapılmadı.** Masaüstünde 2026’da 1 yıl ≈ 17 sn; orta sınıf bir telefonda 3–5× yavaşlık varsayılırsa “1 yıl ilerle” dakikalara çıkabilir — bu, en büyük ölçülmemiş teknik risktir.

### 4.4 Teslim hattı

GitHub Actions her gönderimde `tip + lint + test` koşar, web paketini derler, Capacitor ile hata ayıklama APK’sı üretir. Çalışma dalı için “önizleme” sürümü, ana dal için “son-sürüm” ön sürümü yayımlanır. APK **imzasız hata ayıklama** sürümüdür (Play Store’a hazır değil).

---

## 5. Oynanış durumu (bugün nerede?)

**Sağlam:** Beş senaryo 365 gün bütünlük hatasız oynanıyor; kayıt-yükleme hash’i eşit; komut çubuğu, plan kartı, “Neden?” açıklamaları, komutanlar, muharebe görüntüleyicisi, çok maddeli barış, filo/hava kanadı, harita v2 çalışıyor; v1.6 paketinin 70 kabul testinden 48’i PASS (18 PARTIAL, 2 NOT_IMPLEMENTED, 2 NOT_RUN).

**Gözlemlenen denge durumu (gözlemci koşuları):**

| Gözlem | Durum |
|---|---|
| 1939 Almanya–Polonya | Polonya 25 Eylül–10 Ekim 1939’da teslim oluyor (6 tohumda 6/6; önceki sürümde 3/6). Tarihe yakın |
| 1914 Belçika | 1914–15 kışına dek teslim (6 tohumun 4’ünde) |
| **1914 Almanya** | İki cepheli savaşta 1915 baharında **belirgin gerileme** (Haziran 1915’te bölge sayısı 13–49 arasında dağılıyor). Önceki sürümde de vardı; ayrı bir denge çalışması gerekiyor |
| Sonuç duyarlılığı | Savaş sonuçları tohuma ve komutan kadrosuna çok duyarlı — hem tekrar oynanabilirlik hem öngörülemezlik demek |

**Kodda bulamadıklarım (bilinçli kapsam dışı mı, eksik mi, doğrulanmalı):** ses/müzik, öğretici/ilk oyun yönlendirmesi, açık zafer/yenilgi ve oyun sonu ekranı, başarım (achievement) sistemi, ayarlarda dil seçeneği, bildirim.

---

## 6. SWOT

### Güçlü yönler (Strengths)

- **Rakipsiz konumlandırma:** Türkçe, komut öncelikli, çevrimdışı büyük strateji — mobilde bu üçlü neredeyse boş bir alan. Yapay zekâ maliyeti ve gizlilik riski sıfır (INTERNET izni yok).
- **Mühendislik sağlamlığı:** deterministik motor, hash ile doğrulanan kayıt, 324 test, bütünlük denetimi. Bir strateji oyununda en pahalı hatalar (kayıp kayıt, “bu savaş neden kaybedildi?”) burada yapısal olarak azaltılmış.
- **Açıklanabilirlik:** “Neden?” ekranları ve plan kartı (“bugün kesin / 30 gün tahmin”) türünün en büyük şikâyeti olan opaklığı çözüyor.
- **Derinlik ve tekrar oynanabilirlik:** 5 dönem × 62–179 oynanabilir devlet, 813 bölge, birbirine bağlı gıda–nüfus–ekonomi–siyaset–savaş; kişilikli rakipler, tohuma duyarlı sonuçlar.
- **Tarihî özgünlük:** her dönemde ayrı birlik/teknoloji adları, tarihî komutanlar, olay zincirleri (Temmuz Krizi, Weiss Harekâtı).
- **Süreç disiplini:** tek şartname, karar kaydı (K-1…K-55), “tamamlanma tanımı” kuralları.

### Zayıf yönler (Weaknesses)

- **Giriş eşiği çok yüksek:** ~70 emir türü, 36 teknoloji, nüfus/lojistik/komutan katmanları; öğretici ve hedef ekranı görünmüyor. Yeni oyuncu ilk 10 dakikada ne yapacağını bilemeyebilir.
- **Komut çubuğu iki ucu keskin:** mobil klavyede uzun Türkçe cümle yazmak yorucu; ayrıştırıcının tanımadığı bir cümle hayal kırıklığı yaratır (şu an ret + öneri var, ama kapsam sınırlı).
- **İçerik dengesiz:** 2026 senaryosunda yalnız 5 olay var (1914’te 30); 750 ve 1600’de deniz/hava kuvveti ya çok soyut ya yok. Modern Dünya en geniş senaryo olduğu hâlde en az “hikâye” içeriyor.
- **Başarım riski:** 2026’da gün başına ≈47 ms (masaüstü); telefonda ölçülmedi.
- **Denge borcu:** 1914’te Almanya’nın 1915 çöküşü; “kesin sonuç” yapay zekâ kuralları karmaşıklaştıkça kırılganlaşıyor (bir kuralı değiştirmek başka senaryoyu bozabiliyor — bu oturumda birkaç kez yaşandı).
- **Ses ve geri bildirim eksik:** ses/müzik/titreşim yok; mobil oyuncuya “oyun hissi” veren katman zayıf.
- **Dağıtım hazır değil:** imzasız debug APK, mağaza varlıkları, gizlilik metni, sürüm yönetimi yok.
- **Tek dil, tek cihaz sınıfı:** yalnız Türkçe; yatay telefon varsayımı; farklı ekran/erişilebilirlik testi sınırlı.

### Fırsatlar (Opportunities)

- **Yapay zekâsız “Pax Historia” alternatifi** olarak çevrimdışı ve ücretsiz/ücretli-bir-kez modeli; Türkçe tarih meraklısı kitlesi (öğrenci, öğretmen, tarih kanalları) için doğal bir ürün.
- **Eğitsel kullanım:** gerçek harita, tarihî komutanlar, “Neden?” açıklamaları sınıfta senaryo tartışması için güçlü; kurumsal/okul paketi mümkün.
- **Topluluk içeriği:** senaryo ve olay paketleri veri dosyası olduğu için (derleyici zaten var) modlanabilir bir platform olabilir.
- **“Gözlemci” modu** içerik üretimi için (yayıncılar, “yapay zekâ I. Dünya Savaşı’nı oynuyor” formatı); kayıt hash’i paylaşılabilir tohum/seçim kodu olabilir.
- **Günlük/haftalık meydan okuma** (sabit tohum, aynı başlangıç, farklı sonuç) deterministik motor sayesinde ücretsiz sunucusuz yapılabilir (yalnız sonuç kodu paylaşımıyla).

### Tehditler (Threats)

- **Karmaşıklıktan terk:** mobil strateji oyuncusunun büyük kısmı 5–10 dk’lık oturum bekler; 15–30 dk hedefi ve yüksek öğrenme eğrisi churn üretir.
- **Rakipler:** Pax Historia (dil modeli ile esneklik), Hearts of Iron/Europa Universalis (derinlik), Supremacy 1914 / Rise of Nations tarzı mobil çevrimiçi oyunlar (sosyal bağ, canlı rekabet).
- **Tarihî hassasiyet:** soykırım, sürgün, asimilasyon, suikast gibi emirler oyun içinde var; mağaza politikaları (yaş derecelendirmesi), itibar ve yasal risk için **içerik politikası ve yaş sınıflaması** erken planlanmalı. Gerçek yaşayan kişilerin (2026 liderleri) kullanımı ayrıca incelenmeli.
- **Kalite kırılganlığı:** tek geliştirici/yapay zekâ destekli geliştirme akışında denge ve yan etkiler (bu oturumda 1939/1914 dengesinin birbirini etkilemesi) mağaza yorumlarında “bozuk oyun” algısına dönüşebilir.
- **Cihaz çeşitliliği:** Android’de OPFS/Worker/WebView sürüm farkları; düşük RAM’li cihazlarda 813 bölge + 179 devlet.

---

## 7. Oynanış ve denge analizi

### 7.1 Core loop retention için yeterli mi?

**Kısa cevap: derinlik açısından evet, “neden devam edeyim?” açısından henüz değil.**

| Retention bileşeni | Durum | Değerlendirme |
|---|---|---|
| **Kısa vadeli döngü** (dakikalar) | Niyet → plan kartı → onay → ilerle → rapor | Güçlü. Anlık emir, açıklama ve rapor netliği tatmin edici geri bildirim veriyor |
| **Orta vadeli hedef** (saatler) | Savaş/barış, sanayi kurma, teknoloji kademeleri, komutan yetiştirme | Var ama **oyuncuya gösterilen hedef yok**. “Bu oturumun amacı” (örn. “Polonya’yı 3 ayda yen”) sunan bir görev/hedef katmanı eksik |
| **Uzun vadeli ilerleme** (günler) | 5 dönem, 179 ülke, tohum çeşitliliği | Tekrar oynanabilirlik yüksek; fakat **meta ilerleme** (açılan senaryo, başarım, kilitli içerik) ve **oyun sonu** yok |
| **Duygusal bağ** | Kronik, tarihî komutanlar, olay kartları | Güçlü potansiyel; Kronik’in “kendi hikâyen” özetini paylaşılabilir karta çevirmek eksik |
| **Geri dönüş sebebi** | Çevrimdışı, bildirim yok | Zayıf. Kaydedilmiş savaşa dönüşü teşvik eden mekanizma (örn. “Önemli olay bekliyor”) yok; çevrimdışılık kurallarına uygun yerel bildirim düşünülebilir |
| **Başarısızlık hissi** | Savaş yorgunluğu, kıtlık, isyan; “neden” açıklı | Doğru: kaybetmek öğretici. Ama kaybedince **ne yapılacağı** (yeniden dene / son güvenli kayıt / farklı ülke) net sunulmuyor |

### 7.2 Eksik mekanikler (öncelik sırasıyla)

1. **Hedef ve sonuç katmanı (P0):** senaryo hedefleri (tarihî hedef + serbest hedef), ilerleme çubuğu, oyun sonu özeti (puan, “Kronik” kartı). Şartname 2.4’teki puan sistemi arayüze bağlanmalı.
2. **İlk 15 dakika deneyimi (P0):** yönlendirmeli ilk oyun, “önerilen 3 hareket” (zaten komut çipleri var; hedefe bağlanmalı), küçük ülkeyle başlayan öğretici senaryo (1914 Belçika/Sırbistan gibi).
3. **Mobil uygun giriş (P0):** komut çubuğu için hazır şablon/“son komutlar”/sesle dikte (cihaz klavyesi) zaten var; en sık 20 emir için tek dokunuş kısa yollar önceliklendirilmeli.
4. **Ses ve dokunsal geri bildirim (P1):** olay, savaş, ilan, tamamlama; sessiz mod ayarı.
5. **Lojistik ve çıkarma (P1):** kara/deniz ortak taşıma bütçesi (PR-09) ve çıkarma harekâtı eksik; deniz savaşı filolarla güçlendi ama amfibi harekât henüz yok.
6. **Ekipman ve teknoloji derinliği (P1):** araştırma → prototip → üretim ve adlı ekipman modelleri (PR-10) yok; teknoloji “kademe bekle” döngüsüne yakın.
7. **İç siyasette kişiler (P2):** siyasetçiler takvimden türetiliyor; kalıcı kişiler komutanlarda var, siyasette yok (PR-11).
8. **Barış konferansı / silahsızlanma (P2):** çok maddeli antlaşma var, konferans yok.
9. **Hafif sosyal/rekabet (P2):** günlük meydan okuma, paylaşılabilir tohum+sonuç kodu (sunucusuz).

### 7.3 Denge değerlendirmesi

| Alan | Gözlem | Risk |
|---|---|---|
| **Savaş (kara)** | Saldırı/savunma/kırılma/organizasyon, arazi, tahkimat, komutan etkisi (≤ +%20), ikmal. Sonuçlar tohuma duyarlı | Orta: sabit tohum “bilinen sonuç” üretiyor; senaryo başına denge borcu var |
| **1914 çift cephe** | Almanya 1915’te geriliyor | **Yüksek** (tarihî uyum ve oyuncu algısı: Almanya oynayan oyuncu için sinir bozucu olabilir) |
| **Yapay zekâ “kesin sonuç”** | Ezici üstünlükte tek düşmana ağırlık verir; sessiz cepheleri inceltir | Orta: kural karmaşıklığı arttı; yan etki testleri (çoklu tohum) rutin olmalı |
| **Ekonomi** | Vergi, borç, temerrüt, dünya pazarı; şehir yuva kapasitesi bedelsiz fabrikayı kapattı | Düşük–orta: kabul testleriyle korunuyor; uzun koşu (5/10/25 yıl) yapılmadı |
| **Nüfus/gıda** | Kıtlık, karne, yaş/statü kohortları | Düşük: bütünlük denetimli |
| **Deniz/hava** | Filolar tek konumlu; hava kanatları kapasite/menzil sınırlı; yapay zekâ birim birim emir veriyor | Orta: yeni sistem, uzun koşu ve çoklu tohum ayarı eksik |
| **Başarım** | 2026: 47 ms/gün | **Yüksek** (telefon ölçümü yok) |

### 7.4 Önerilen ilk 90 günlük yol haritası

| Dönem | Odak | Çıktı |
|---|---|---|
| 0–30 gün | **Oynanabilirlik cilası** | Öğretici senaryo + hedef/puan/oyun sonu ekranı; en sık 20 emir için kısa yol; kayıp sonrası yönlendirme |
| 30–60 gün | **Güven** | Gerçek cihaz başarım testi (3 sınıf telefon) ve gerekirse hız optimizasyonu; 5/10/25 yıllık uzun koşular; 1914 Almanya dengesi; çoklu tohum regresyon seti |
| 60–90 gün | **Dağıtım** | İmzalı sürüm, mağaza varlıkları, gizlilik/yaş sınıflaması, ses/titreşim, 2026 olay içeriğinin 5’ten 20+’ya çıkarılması |

**Ölçüm önerisi (çevrimdışı ürün için):** tamamen yerel ve anonim, isteğe bağlı “tanılama dosyası” (ilk 10 dakikada hangi komut ret aldı, hangi panel kullanıldı) — INTERNET izni olmadığı için kullanıcı paylaşmak isterse dosya olarak gönderir. Ret alan komutlar komut kapsamını genişletmek için en değerli veridir.

---

## 8. Genel özet

**Tarih Strateji**, Android için tam çevrimdışı, Türkçe, komut öncelikli bir büyük strateji oyunudur: beş tarihî dönemi (750, 1600, 1914, 1939, 2026) 813 bölgeli gerçek dünya haritasında, deterministik ve her sonucunun nedeni açıklanabilen bir simülasyonla sunar. Oyuncu cümle yazarak ya da menüden ekonomiyi, nüfusu, ordusunu (komutanlar, filolar, hava kanatları), diplomasisini ve iç siyasetini yönetir; rakipler aynı kurallarla oynayan kişilikli yapay zekâlardır.

**Teknik olarak** ürün olgun: saf ve test edilmiş bir motor, tek yazıcılı Worker, hash ile doğrulanan kayıtlar, şema göçleri, CI’da otomatik test ve APK üretimi var. **Oyun olarak** derin ama henüz “paketlenmemiş”: öğretici, hedef/oyun sonu, ses ve mağaza hazırlığı eksik; en büyük riskler **ilk 15 dakikada kaybolma**, **telefonda başarım** ve **1914 gibi senaryolarda denge borcu**.

**Tek cümlelik tavsiye:** Yeni sistem eklemeyi durdurup 90 gün boyunca *“ilk oyuncuyu ilk 15 dakikada kazanma, telefonda akıcı çalışma ve senaryo dengesi”* üçlüsüne yatırım yapın; derinlik zaten yeterli.

---

### Ek: Ölçüm ve doğrulama kaynakları

- `docs/sartname-v1.4.md` — şartname; `docs/kararlar/ek-a-karar-kaydi.md` — K-1…K-55.
- `docs/v16/README.md` ve `docs/v16/kabul-matrisi-v16.csv` — v1.6 paketi durumu ve 70 kabul testi.
- Denge ölçümleri: `packages/lab` (`npm run lab -- 365`) ve bu oturumdaki 365 günlük gözlemci koşuları (tohum +0…+5). Telefon başarımı, kullanıcı davranışı ve gelir modeli için **veri yoktur**.
