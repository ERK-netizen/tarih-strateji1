# TARİH STRATEJİ — v1.7 1914 ENTEGRE GELİŞTİRME PAKETİ

**Sürüm:** Tasarım paketi v1.7.0-draft · **Tarih:** 13 Kasım 2026  
**Kapsam:** Kullanıcının 13 yeni talebi + v1.6.1 mevcut mimari + daha önce belirlenen dinamik 1914 ulusal hedefler, diplomatik olay zincirleri, stratejik planlayıcı ve ülke yapay zekâsı.  
**Statü:** Uygulanabilir şartname / değişiklik paketi. **Kaynak kodu değiştirilmiş veya testler çalıştırılmış değildir.** Mevcut depo yalnız kullanıcının paylaştığı v1.6.1 analiz özeti üzerinden bilinmektedir.

## 0. Nasıl kullanılacak?

Bu belge, `docs/sartname-v1.4.md` ve `docs/kararlar/` ile birlikte değerlendirilecek **bütünleşik değişiklik şartnamesidir**. Eski oyun sistemlerini silmez; v1.6.1 kararlılık ilkelerini koruyarak v1.7 için kapsam, veri modeli, arayüz, algoritma, kabul testi ve geçiş yolunu tanımlar. Kodlamadan önce gerçek depoda var olan sınıfların / paketlerin / şema sürümlerinin doğrulanması ve ilgili karar kaydına yeni kararların eklenmesi zorunludur. Bir uyuşmazlık varsa kayıt altına alınmalı; sırf bu taslakta adı geçtiği için mevcut davranış sessizce değiştirilmemelidir.

### Değiştirilemeyecek sözleşmeler

1. Android'de **dikey ekran öncelikli**, çevrimdışı Türkçe kullanıcı deneyimi; Windows için aynı motoru kullanan, geniş ekran uyumlu ayrı arayüz mümkündür.
2. Simülasyon tek yazıcılı Worker üzerinden işler; oyuncu ve yapay zekâ aynı emir doğrulama yolunu kullanır.
3. İdari komutların verilmesi ve plan onayı **gün atlatmaz**; beklenen dış cevap/işin tamamlanması ancak zaman ilerlediğinde işlenir.
4. Deterministik RNG, güvenli tamsayı, sabit nokta `S=1_000_000`, sürüm kilidi, idempotency anahtarı ve kanonik dünya hash'i korunur. Yasak matematik API'lerini engine'e ekleme.
5. Yeni kaynak, bina, kişi, görev, emir, operasyon ve planlar kayıt/yükleme ile göçten sağ çıkmalı; oynanışa etkili veriler hash kapsamına girmelidir.
6. Geliştirme özelliği ancak **arayüz + emir/uygulama + simülasyon etkisi + AI kullanımı + açıklama + test** birlikte çalıştığında tamamlanmış sayılır.
7. Tarihî gerçeklik başlangıç şartlarını ve olasılıkları belirler; tarihsel sonuçlar asla zorunlu olarak dayatılmaz.

## 1. 13 talebin takip matrisi

| ID | Kullanıcı talebi | Entegre teslim bileşeni | Öncelik | Bağımlılık |
|---|---|---|---|---|
| R01 | Diplomasi menüsünü genişlet | 8 diplomasi grubu, çok maddeli teklifler, kriz/sözleşme ve gizli protokol | P0 | Devlet hedefleri, teklif yaşam döngüsü |
| R02 | Geniş ve geliştirilebilir istihbarat; suikast, bilgi, anlaşma, ilişki bozma, sabotaj | Teşkilat + ağ + istihbarat raporu + örtülü operasyon + karşı istihbarat | P0/P1 | Kişi, güvenlik, ilişki, şehir, AI |
| R03 | Maden/üretim çeşitliliği; petrol daha belirgin | Bölgesel cevher rezervi, çıkartma, işleme, taşıma, enerji ve yakıt defteri | P0 | Ekonomi, şehir, lojistik |
| R04 | Araştırmada isimli ekipman | Döneme ve ülkeye özgü ekipman modelleri, teknoloji → prototip → üretim | P0 | Teknoloji, üretim ve stok |
| R05 | Cephe savaşlarında stabil oynanış | Cephe durum makinesi, plan/lojistik/organizasyon, stabil muharebe görünümü | P0 | Cephe, emir ve hash |
| R06 | Birliğe doğrudan komutan | UnitCommanderAssignment + komuta hiyerarşisi + doğrudan atama UI/komut | P0 | Kalıcı kişi kimliği |
| R07 | Bakanlık/bakan, atamalar sistem etkili | Bakanlık katalogu + kabine + kişiler + politika etkileri ve bütçe | P1 | Siyaset, ekonomi, diplomasi |
| R08 | Askerî/sivil sanayi tür ve adları | Tesis sınıfları, kurumsal/fabrika adları, hatlar, bölgesel işletme kayıtları | P0 | Şehir + üretim |
| R09 | Şehre tıklayınca bütün işlemler | Şehir komuta merkezi: proje, sanayi, maden, vergi, garnizon, altyapı, depo | P0 | Ortak emir motoru |
| R10 | Seri üretim ile tutarlı üretim miktarı | Kapasite–hammadde–işgücü–teknoloji–verim–darboğaz hesabı | P0 | R03/R04/R08 |
| R11 | Birliklerin şehirler arası yavaşlığı | Mesafe/rota tabanlı hareket, demiryolu tahsisi, hız hesabı, ETA ve açıklama | P0 | Harita veri derleyici, lojistik |
| R12 | Taarruz, savunma, sükûnet, iç isyan bastırma, yarma vb. | Görev/niyet ayrımı, bölge emniyeti, cephe planları, harekât emirleri | P0 | R05/R06/R11 |
| R13 | Hava/deniz kontrolü/oynanışı | Filo/kanat hiyerarşisi, görev planları, üs/liman, yakıt, bakım, deniz ticareti | P1 | R03/R04/R05/R06 |

### Önceden kararlaştırılmış 1914 sistemlerinin aynı paketteki yeri

**G01** ulusal hedefler, **G02** dinamik diplomatik olay zincirleri, **G03** stratejik plan ve danışman, **G04** devlet yapay zekâsı, **G05** hedef/zafer/kronik. Bunlar bütün 13 değişikliğin üzerinde çalışan ortak karar katmanıdır; ayrı bir oyun modu değildir.

## 2. Oynanış hedefi ve temel döngü

Oyuncu devlete özgü **hedef** seçer → bakan, genelkurmay veya istihbarat danışmanından seçenek görür → şehir, cephe, diplomasi ya da araştırma ekranından **plan** hazırlar → önizlemede maliyet/ETA/risk/alternatif okur → anında onaylayıp kaydeder → zamanı ilerlettiğinde motor işlerini yürütür → olay, savaş, başarı veya kriz anında durur → sonuç için “Neden?” incelemesi yapar.

Bir ekran yalnız değer göstermemeli: **Ne var? → Neden? → Ne yapabilirim? → Ne kadara olur? → Ne zaman etkiler?** sorularını yanıtlamalı. Her yeni işlemde bir eşdeğer Türkçe komut üretilecek; Türkçe komuttan da aynı emir nesnesine dönülebilecek.

## 3. Diplomasi 2.0 (R01)

### 3.1. Menü ağacı ve eylemler

**A. İlişkiler:** Elçi gönder, ilişkileri iyileştir, protesto notası, geri çağırma, tanıma/tanımama, gerilimi azaltma, resmî ziyaret.  
**B. İttifak ve güvenlik:** Savunma paktı, saldırmazlık, garanti, askerî geçiş, deniz/liman geçiş izni, sınırlı askerî iş birliği, ittifaka davet/çıkarma, müşterek komuta, tarafsızlık garantisi.  
**C. Ekonomi:** Ticaret anlaşması, alım garantisi, kredi, borç, yatırım, kaynak tedariki, ambargo, ihracat kısıtı, transit geçiş, konvoy güvencesi.  
**D. Savaş öncesi kriz:** Talepler, ültimatom, karşı teklif, arabuluculuk, konferans çağrısı, kısmi taviz, seferberliğin sınırlandırılması, savaş gerekçesi.  
**E. Savaş ve barış:** Ateşkes, esir değişimi (soyut), bölgesel çekilme, savaş tazminatı, silahsızlanma, bağımsızlık, himaye, çok taraflı barış, garanti.  
**F. Toprak ve nüfuz:** Bölge devri/değişimi, kira, nüfuz alanı, üs kullanım anlaşması, geçici idare, referandum önerisi (uygun senaryolarda).  
**G. Gizli diplomasi:** Gizli protokol, gizli toprak vaadi, gizli ittifak, savaşta katılım şartı, gizli ekonomik destek.  
**H. Uluslararası gündem:** Savaşın meşruiyeti, bölgesel krizler, başka devlete arabuluculuk, konferans kararları, büyük güç baskısı.

### 3.2. Teklif yaşam döngüsü

`DRAFT → PREVIEW → SENT → (COUNTERED | ACCEPTED | REJECTED | EXPIRED | WITHDRAWN) → RATIFIED → ACTIVE → (FULFILLED | BREACHED | TERMINATED)`.

- Teklif gönderimi **anlık idari komuttur**; mektubun/kararın karşı devlete ulaşması ve yanıtı günlük simülasyona bağlı olabilir. Mevcut anlık işlem kuralı çiğnenmez.
- Çok maddeli antlaşmalarda tüm maddeler aynı `treatyId` ve `proposalRevision` ile takip edilir; kısmi kabul bir **yeni karşı teklif** üretir.
- Gizli madde ilgili taraflar dışında görünmez; keşif operasyonu ile sızabilir. Sır saklama garantili değildir.
- Devletler tutamayacağı taahhütleri verirse meşruiyet ve güvenilirlik maliyeti yaşar; ani diplomasi puanı azalışı yerine açıklanabilir olay yaratılır.
- Tarihî hak iddiası ve sınır anlaşmazlığı bir ülke hedefiyle bağlanır; serbest toprak talebi sebepsiz otomatik kabul edilmez.

**1914 örneği:** İtalya'ya tarafsız kalması karşılığında maddi taviz teklif etme; Avusturya-Macaristan ile toprak maddesi konusunda gizli görüşme; İngiltere'ye Belçika'nın tarafsızlığı hakkında garanti. Her biri farklı devletlerin risk değerlendirmesini değiştirir.

### 3.3. AI ve arayüz

Diplomatik kabul puanı; teklif faydası + ittifak uyumu + güven + savaş tehdidi + ekonomik ihtiyaç − egemenlik maliyeti − üçüncü devlet tepkisi − gerçekleştirilemez taahhütler. İlgili hükümet ve lider etkileri eklenir. Kullanıcıya kesin kabul olasılığı yerine `yüksek/orta/düşük` veya güven aralığı (bilgi kalitesine bağlı) gösterilir. Karşı teklif alındığında ana oyunda günü otomatik ilerletmeden kayıt yapılır.

## 4. İstihbarat ve karşı istihbarat 2.0 (R02)

### 4.1. Yapı

- **Teşkilat:** Dış istihbarat, askerî istihbarat, karşı istihbarat, diplomatik istihbarat. Tek devlet merkezi bütçesini paylaşır.
- **Ağ:** Hedef devlet/bölge, erişim seviyesi, güvenilirlik, gizlilik, maruz kalma riski, bekleme süresi, temas sürekliliği. Ajan/birim kimliği mevcut kalıcı kişi sistemine bağlanır veya soyut ağ olarak temsil edilir.
- **İstihbarat bilgisi:** Kaynak, gözlem günü, tahmin alt/üst değeri, güvenilirlik, son geçerlilik tarihi, yanlış bilgi riski. 180 günlük mevcut eskime davranışıyla uyumlu.
- **Operasyon:** Aşama `hazırlık → yürütme → sonuç/başarısızlık → diplomatik/yerel tepki → ağın toparlanması`.
- **Karşı istihbarat:** Ağ tespit, faaliyet sınırlama, gizlilik kapasitesi, yanlış rapor/yanlış atıf (soyut mekanik).

### 4.2. Operasyon kataloğu

| Tür | Oynanış hedefi | Temel maliyet/sonuç |
|---|---|---|
| Ülke bilgisi toplama | Hazine, stok, ordu, teknoloji, diplomasi hakkında belirsizliği düşürmek | Zaman, ajan bütçesi, açığa çıkma riski |
| Cephe keşfi | Düşman birlikleri ve tahkimatı hakkında rapor | Keşif maliyeti, rapor eskimesi |
| Diplomatik yazışma sızdırma | Gizli anlaşma veya niyet bilgisi | Güvenilirlik sorunu, diplomatik kriz |
| Gizli anlaşmayı destekleme | Diplomatik görüşmeye gizli kanal | Bağlantı kurulması, ifşa riski |
| İlişkileri zayıflatma | İki ülke arasında güven kaybı | Yüksek diplomatik risk; garanti değil |
| Siyasi etki operasyonu | Siyasal etki veya gerilim yaratma | Toplumsal/siyasi tepki, karşı tedbir |
| Ekonomik sabotaj | Hedef bir tesis/altyapı için geçici işlev kaybı | Ekonomik kayıp, onarım, uluslararası kriz |
| Ulaştırma sabotajı | Demiryolu/ikmal kapasitesine geçici zarar | İkmal riski, onarım, karşı istihbarat |
| Askerî tesis sabotajı | Fabrika/üretim hattı/üs verimi üzerinde sınırlı etki | Maddi kayıp, güvenlik artışı |
| Suikast girişimi | Tarihî/senaryo karakterine yönelik **soyut** siyasi olay | Çok yüksek başarısızlık/ifşa/istikrarsızlık riski; yöntem ayrıntısı yok |
| Darbe girişimi | Yönetim değişikliği için soyut siyasi risk olayı | İç istikrar, siyasi güç, dış tepki |
| İsyana dış destek | Başka ülkedeki siyasi/yerel çatışmaya etki | Meşruiyet, uzun süreli istikrarsızlık ve karşı tepki |
| Karşı istihbarat operasyonu | Ülkedeki gizli ağların faaliyetini sınırlandırmak | Güvenlik bütçesi, sivil güven ilişkisi |

Bu içerikler **kurgu/strateji seviyesi** ile sınırlıdır: hedef sınıfları, risk ve sonuçlar hesaplanır; gerçek dünyada suikast, sabotaj veya başka yasa dışı şiddet eylemleri gerçekleştirmeye yarayan taktik/yöntem adımları üretilmez. Siyasi ve toplumsal sonuçlar tek taraflı olumlu bonusla temsil edilmez.

### 4.3. Operasyon sonuç dağılımı

Her emir aynı sabit tohumla şu sonuç kümesine bağlanır: `başarı / kısmi başarı / sonuçsuz / başarısız / ifşa / yanlış atıf`. Başarı, `yetenek`, `yerel ağ`, `karşı istihbarat`, `bütçe`, `hükümet istikrarı`, `hedef güvenliği`, `zaman` ve `belirsizlik`ten türetilir. Tek bir küresel başarı yüzdesi kullanılmaz. Bir işlem ağ ölçeğini sonsuza kadar arttıramaz; bakım ve karşı denetim dengesi vardır.

### 4.4. İstihbarat araştırmaları

1914: şifreleme, saha keşif örgütü, diplomatik ağ, haberleşme dinleme (oyun soyutlaması), karşı istihbarat, hava keşfi; dönem ilerledikçe yeni yöntemler açılır. Teknoloji araştırması daire ve personele fiilen uygulanmadıkça bonus vermez.

## 5. Kaynak, maden, petrol, enerji ve üretim ekonomisi (R03)

### 5.1. Katmanlı kaynak modeli

**Ham kaynaklar:** gıda girdileri/tarım ürünü, odun, demir cevheri, kömür, bakır cevheri, ham petrol, nitrat/kimyasal hammaddeler; gerekli dönem ve bölgelerde kauçuk ve diğer stratejik girdiler.  
**İşlenmiş:** çelik, rafine yakıt, metal alaşım/bakır, kimyasallar/patlayıcı girdileri, kereste, işlenmiş gıda, makina parçası (soyut).  
**Nihai:** tüfek, makineli tüfek, top, top mermisi, hafif mühimmat, araç, uçak, gemi, haberleşme ekipmanı, tüketim malı.

1914'te **kömür**, sanayi/demiryolu/çok sayıdaki deniz platformu için merkezi kaynak; **petrol/rafine yakıt**, motorlu araç, uçak, bazı deniz platformları ve sonradan tanklar için kritik ama bütün sektörleri otomatik besleyen bir kaynak **değil**. Araştırma ve teknoloji ilerledikçe enerji tercihi değişir. Tarihî başlangıç kaynakları jeolojik ve üretim verisiyle koşullandırılmalı; bilinmeyen rezerve keyfî sayı verilmemeli.

**Maden sahası** (`resourceDeposit`) tükenebilir rezerv, erişilebilirlik, işletme derinliği, cevher oranı, çalışan, ulaşım bağlantısı, bakım ve çevresel/yerel etki taşır. Bölge bir kaynak için boş olabilir, küçük bir potansiyele sahip olabilir veya sanayi ölçeğinde işletilebilir olabilir. Sanayi üretimi rezervi yoktan yaratamaz.

### 5.2. Zorunlu zincir

`rezerv → maden/çıkarma → taşıma → şehir deposu → işleme tesisi → ülke/şehir depoları → üretim tesisi → ikmal/ithalat/ihracat → ordu/sivil tüketim`.

Depodan aktarım anlık idari kayıtta rezerve edilir; gerçek teslimat süresi günlük lojistikte gerçekleşir. Bir kaynağın **aynı gün iki farklı üretim hattı tarafından iki defa tüketilmesi yasaktır**. Yük/boşaltma, nakliye kapasitesi ve stok üst sınırı hesaplanır. Fiyatlar arz-talep/kriz nedeniyle değişir; kaynak bulunmaması `neden üretilemiyor?` açıklamasına yansır.

### 5.3. Petrolde görünürlük

Petrol panosunda ham petrol üretimi, rafineri kapasitesi, rafine yakıt stokları, günlük tüketim, petrol ithalatı, yakıt güvenliği (kaç gün), en büyük tüketiciler ve olası kesinti görünür. Petrol kıtlığı motorlu birlik, hava kanadı ve yakıt gerektiren filolarda harekât süresini/etkinliği kısıtlar; tarihsel olarak kömürle çalışan bir gemiye otomatik petrol tüketimi yazılmaz.

## 6. Araştırma → isimli ekipman → üretim → birlik (R04)

### 6.1. Teknoloji ve ekipman ayrımı

`Technology` bir yöntem/yetkinliktir (ör. standart parça değiştirilebilirliği, makineli tüfek mühendisliği, demiryolu seferberlik yönetimi). `EquipmentModel` ise ülke ve dönemle ilişkili, adı ve üretim reçetesi olan gerçek somut üründür. **Teknoloji araştırıldı ≠ ürün anında üretildi ≠ birlik envanterine girdi.**

Hat: `bilimsel/kurumsal araştırma → teknoloji açıldı → ekipman tasarımı/lisansı → prototip/kalifikasyon → fabrika hattı dönüştürme → seri üretim → depo → ulaştırma → birliğe tahsis → bakım/yenileme`.

### 6.2. Örnek 1914 ekipman kataloğu (ülke ve tarih koşullu)

| Sınıf | Örnek modeller | Koşul |
|---|---|---|
| Piyade tüfeği | Gewehr 98; SMLE Mk III; Mosin–Nagant M1891; Lebel M1886/93; Mauser M1903 | Tarihe/ülkeye göre başlangıç, lisans veya ele geçirme |
| Makineli tüfek | MG 08; Vickers Mk I; Maxim M1910 | Fabrika ve mühimmat gerektirir |
| Hafif/alan topçusu | 7,7 cm FK 96 n.A.; Canon de 75 modèle 1897; QF 18-pounder | Top + mühimmat ayrı stok |
| Ağır topçu | 15 cm sFH 13; ağır kuşatma sistemleri | Ulaştırma ve ağır mühimmat darboğazı |
| Keşif/uçak | B.E.2; Etrich Taube; Morane-Saulnier çeşitleri | Model tarihine ve tasarım yetkinliğine göre |
| Gelişen avcı uçakları | Fokker E.I (1915); Nieuport 11 (1916) | 1914 başlangıcında otomatik mevcut değil |
| Zırhlı araç/tank | Savaş dönemi zırhlı otomobil; Mark I (1916); Renault FT (1917) | Araştırma, üretim, doktrin ve zaman |
| Deniz platformu | Dretnot, muhrip, denizaltı, mayın gemisi | Tersane, tersane kızağı, yakıt türü, personel |

Tarihsel adlar `displayNameTr` ve yerel/uluslararası model kimliğiyle ayrı tutulur. Farklı yıllardaki modeller 1914'e otomatik yüklenmez; alışılmadık erken teknolojiler yüksek araştırma ve sanayi maliyetiyle alternatif tarihte erişilebilir olabilir.

### 6.3. Model varyantları

Üretici/lisans, kalibre, güvenilirlik, birim maliyet, menzil, ağırlık, bakım ihtiyacı, cephane uyumu ve üretim karmaşıklığı. Tek kademede 12 teknoloji kazanınca bütün silahlar kendiliğinden güçlenmeyecek; `standardId`, `modelId`, `variantId` ayrımı gerekir.

## 7. Sivil ve askerî sanayinin türlendirilmesi (R08)

### 7.1. Sivil sanayi türleri

Tarım işleme ve gıda; tekstil ve giyim; kömür madenciliği; demir madenciliği; petrol çıkarma; rafineri; demir-çelik; bakır/metal işleme; kimya; makine-takım; demiryolu araçları; yapı malzemeleri; elektrik/enerji; tersane sivil hattı; bakım/onarım. Ülke/dönem verisi, her tesisi kendi sanayi sınıfına bağlar.

### 7.2. Askerî sanayi türleri

Hafif silah fabrikası; makineli tüfek fabrikası; hafif/ağır mühimmat; topçu döküm ve montaj; askerî araç/zırhlı araç; uçak gövde/motor; askerî tersane ve havuz; denizaltı üretim hattı; askerî makine/teçhizat; bakım-onarım deposu; askerî lojistik atölyesi. Silah ve cephane aynı miktar defterinden çıkmamalıdır.

### 7.3. Tesis nesnesi

`facilityId`, `cityId`, `ownerCountryId`, `facilityType`, `name`, `level`, `sizeClass`, `workforce`, `machineCapacity`, `powerSource`, `maintenance`, `railAccess`, `storage`, `productionLineIds`, `damagedRatio`, `capacitySlotsUsed`. Şehirdeki eski `sivilFabrika`/`askeriFabrika` değerleri göçte tesis sınıfına **dönüştürülmeden asla kaybedilmez**. Mevcut **şehir seviyesi × 4 yapı yuvası** kuralı korunur; demiryolu/altyapı gibi istisnaların yuva kullanımı mevcut şartnameyle doğrulanır.

**Adlandırma:** Tarihî tesis ismi kaynağı güvenilir olduğunda kullanılır, yoksa ülke/şehir/tür temelli ad deterministik üretilir: `Essen Makine ve Silah İşletmesi`, `Manchester Tekstil Fabrikası 2`; uydurulmuş ad tarihî gerçek olarak etiketlenmez. Gerçek tarihî şirket adları ancak dönem/tarih doğrulaması sonrası atanır.

## 8. Seri üretim ve fiziksel miktar kalibrasyonu (R10)

### 8.1. Problem

Tek bir büyük, donanımlı tüfek fabrikasının “ayda 1.000 tüfek” üretmesi birim ölçeği belirsizse yapay bir sınırlama olur. Tarihî bir kontrol noktası olarak Royal Small Arms Factory Enfield'ın üretimi savaş yıllarında ciddi biçimde yükselmiştir; mühendislik tarihi kaynağı 1917'de haftalık yaklaşık 10.500 tüfek üretimi ve ayrıca dış bileşenlerden yapılan montajı anlatır. Bu tek üretim örneği tüm ülkelerdeki her fabrikanın üretimini belirlemek için **kullanılamaz**. Kaynak: Institution of Mechanical Engineers, *Munitions in London* (https://engineersatwar.imeche.org/features/munitions-in-london).

### 8.2. Yeni hesap

Bir model için **brüt dönem kapasitesi**, fabrika hatlarının kullanılabilir makine süresi ile gerekli makine süresinin; kullanılabilir işçi süresi ile gerekli işçi süresinin; enerji ve girdi sınırlarının **en küçüğü** tarafından belirlenir. Sonuç üstünde üretim hattı verimi, kalite kaybı, hasar, bakım ve lojistik darboğazı uygulanır. Tüm kesirler mevcut tamsayı sabit nokta yardımcılarıyla hesaplanır.

```
makineSınırı = floor(kullanılabilirMakineDakikası / ürünMakineDakikası)
iscilikSınırı = floor(kullanılabilirİşçilikDakikası / ürünİşçilikDakikası)
girdiSınırı = min_k floor(depodakiGirdiKg[k] / reçeteKg[k])
enerjiSınırı = floor(kullanılabilirEnerjiBirimi / ürünEnerjiBirimi)
brütAdet = min(makineSınırı, iscilikSınırı, girdiSınırı, enerjiSınırı)
netAdet = mulRatio(brütAdet, verimÇarpanıFixed)
```

Bu yalın formülün günlük çalışma süresi, vardiya, kapasite ve kalite parçaları alt tablolarda ayrı tutulur; *tahmini üretim* önizlemesinde kullanılan rezervasyonlar gerçek emir işlendiğinde tek işlemde doğrulanır. Kesirli üretim için `workInProgressFixed` tutulabilir; yalnız tamamlanmış ürün envantere yazılır.

**Seri üretim araştırması** makine/dakika, setup/kalıp değişim süresi veya verim tavanını iyileştirir; tek başına çalışan işçi, tesis, enerji, çelik veya mermi oluşturmaz. Hattın yeni modele geçişi eğitim/yeniden takım maliyeti getirir. Kaynak veya işgücü darboğazı varsa üretim artışı azalır ya da sıfır olur.

### 8.3. Görünür birimler ve ölçek

- Tüfek, makineli tüfek, top, kamyon, uçak, gemi: **adet**.
- Hafif mühimmat: fişek/adet veya oyuncuya anlaşılır `bin fişek` paketi (kanonik adet korunur).
- Top mermisi: **adet**, tür/kalibreye bağlı.
- Demir cevheri, kömür, çelik, petrol: **kg/t** dönüşümü; iç hesapta tek kesin birim, arayüzde ton.
- Fabrika **tesisi** ve **üretim hattı** ayrı: bir şehirde tek büyük fabrika çok sayıda hat barındırabilir; tek bina = ayda 1.000 ürün gibi kör sabit kullanılmaz.

**Örnek (yalnız dengeleme senaryosu):** 1.000 tüfek/ay gösteren mevcut hattın yeniden kalibrasyonunda üretim; fabrikaya, ülkeye ve döneme göre binlerden on binlere çıkabilir. Ancak her satır için işgücü, makine, parça, kaynak ve sipariş ihtiyacı kontrol edilir. Sayılar başlangıç tarihsel gerçek kabul edilmeden kalibrasyon testine sokulur.

### 8.4. Her ürün için kesin muhasebe

`girdi stokları − tüketilen kaynaklar = kalan`; `üretim tamamlandı → teslim depoya`; `depo → konvoy/demiryolu → birlik`; `sarf + zayiat + bakım + ele geçirme` birbirinden ayrı. Negatif stok, çoğaltma, eş zamanlı çift rezervasyon, yoktan üretim yasaktır. Bir üretim verimi değişikliği mevcut stokları geriye dönük değiştirmez.

## 9. Şehir komuta merkezi (R09)

### 9.1. Tek tıklama / tek dokunma hedefi

Şehir/yerleşim seçilince alt çekmece açılır. **Üst kart:** şehir adı, ülke/bağlı bölge, nüfus, kamu düzeni, üretim, stok, garnizon, liman/demiryolu, risk ve kısa `Neden?` özeti.

**Sekmeler (dikey Android'de kaydırılabilir, Windows'ta yan yana):**
1. Genel durum ve şehrin hedefleri.
2. İnşa ve projeler (yuva durumu, sırala, durdur, iptal, hızlandırma maliyeti).
3. Sanayi ve üretim hatları (tesis adı/türü, reçete, vardiya, çalışan, darboğaz).
4. Maden ve enerji (potansiyel, üretim, rezerv, yakıt, ulaşım).
5. Ticaret, lojistik ve depolar (teslimatlar, hat kapasitesi, nakliye süresi).
6. Nüfus, gıda ve kamu düzeni (huzur, hizmetler, yerel şikâyetler).
7. Askerî (garnizon, birlik, komutan, kale, cephe/liman/üs).
8. Yerel yönetim ve maliye (vergi, idari proje, valilik, yerel politika).
9. Diplomasi/istihbarat etkileri (yalnız yetkili ve görünür bilgiler).
10. Olaylar ve geçmiş (yerel kronik, son değişiklikler ve nedenleri).

Her sekme emir önizlemesine bağlanır; ekrandaki işlevin tamamen ayrı, komut satırından ulaşılmaz bir davranışı olamaz. Şehir arayüzünden `Ankara'da ... inşa et` gibi Türkçe eşdeğer emir görülebilmeli.

### 9.2. Şehir tipi ve dönem

1914 sanayi şehri, başkent, maden kenti, liman, demiryolu kavşağı ve tarım kenti farklı bilgi öncelikleriyle açılır. Şehir ve bölge kimliği karıştırılmaz: şehir bir bölgeye bağlıdır, ancak aynı bölgede birden fazla şehir olabilir; mevcut harita/senaryo paketi bunu desteklemiyorsa aşamalı `cityId` eşlemesi gerekir.

## 10. Cephe kararlılığı ve muharebe 2.0 (R05)

### 10.1. İşlemsel kurallar

- Cephe kimliği, cephe sınırı, komuta eden ordu, hedef bölge, saldırı/savunma duruşu, ikmal düğümü, ihtiyat, hazırlık, tahkimat ve muharebe durumları tekil olarak tutulur.
- `PLANNED → ASSEMBLING → PREPARING → ENGAGED → (ADVANCING | HALTED | WITHDRAWING) → REORGANIZING → COMPLETE/CANCELLED` durum geçişleri açık olmalı; aynı birlik iki cephede eşzamanlı savaşamaz.
- Cephe genişliği ve arazi birlik yığılmasının faydasını sınırlar; savaş karşılaşması yalnız komşu/erişilebilir bölge üzerinden yapılır.
- Sonuç; örgütlenme, moral, komutan, ekipman, ikmal, keşif, hava desteği, tahkimat, hava/iklim ve harekât emirlerinden etkilenir.
- Yüksek hasarlı birlik yeniden organizasyon tamamlanmadan sürekli anlık taarruz başlatamaz. Kaybedilen teçhizat, yaralı, mühimmat tüketimi muhasebeye yazılır.
- Savaş durumu değişince Canvas görünümü **durumu gösterir**; görsel animasyon, motorun kararını yeniden hesaplamaz.

### 10.2. Denge ve hata korumaları

Cephede birliğin kaybolması, sonsuz çarpışma, aynı muharebenin iki kez sonuç vermesi, yanlış tarafın tahkimat bonusu alması, anahtarsız hareket talebi, negatif insan gücü, sıfır lojistikle sınırsız saldırı, savaş ve barış eşzamanlılığı gibi hatalar için deterministik regresyon senaryoları gerekir. Oyun bir ordunun geri çekilmesine sebep olan 3–5 başlıca nedeni `Neden?` ekranında göstermeli.

## 11. Doğrudan komutan atama ve komuta hiyerarşisi (R06)

Her kara birliği doğrudan `commanderPersonId` alabilir; ayrıca aynı komutan bir **kolordu/ordu/cephe karargâhına** atanabilir. Birlik üzerinde doğrudan komutan ve üst kademe komutanının etkileri ayrı ölçülür, toplam etki sınırlanır (`commandCap`). Deniz filosu için amiral, hava kanadı/grubu için görevli komutan aynı kalıcı kişi sistemi içinde farklı rol ile çalışır.

**Atama kuralları:** Kişi aktif mi, bağlı devleti uygun mu, doğru rütbe/branş yetkisi var mı, aynı zaman diliminde çelişen görevde mi, iletişim/yer değiştirme süresi gerektiriyor mu, kapasite sınırında mı? Atama emri ve kayıt **anlık**, görevin fiilen devralınması gerekirse planlı tarihe bağlı. Bir komutanın ölümü/istifası/atanması birlik ID'sini silmez; vekil komuta ve görev devri süreci oluşturur. Gerçek tarihî komutanlar, kaynak doğruluğuna göre ilgili dönemde açılır; erken ortaya çıkan kurgu komutanlar işaretlenir.

**UI:** Ordu/birlik kartı → `Komutan ata` → uygun adaylar (rütbe, uzmanlık, mevcut görev, komuta sınırı, beklenen etki) → önizleme → onay. `III. Kolordu'ya [komutan] ata` Türkçe emir karşılığı.

## 12. Harekât ve bölgesel emir kataloğu (R12)

| Emir | Hedef katmanı | Şart ve sonucu |
|---|---|---|
| Taarruz | birlik/cephe | Düşman komşuluğu, hazırlık, ikmal, tahminî kayıp |
| Savunma | birlik/cephe/bölge | Hat savunması, mevzi, reaksiyon sınırı |
| Cepheyi tut | cephe | Kaybı azaltma, ilerleme hedefinden vazgeçme |
| Yarma harekâtı | cephe bölümü | Yığınak, topçu ve ihtiyat hazırlığı; yüksek maliyet |
| Kuşat / kanadı çevir | cephe hedefi | Geçiş/ikmal yolları, açık kanat ve karşı taarruz riski |
| Karşı taarruz | birlik/cephe | Yerel avantaj ve ihtiyat gerektirir |
| Geri çekil | birlik/cephe | Güvenli rota, örgütlenme, geride bırakılan teçhizat |
| İhtiyata al / dinlendir | birlik/ordu | Moral/organizasyon ve ekipman takviyesi |
| Seferber et / yeniden konuşlandır | ülke/ordu | Personel, stok, tren/liman kapasitesi |
| Garnizon oluştur | şehir/bölge | Askerî emniyet, sivil insan gücü fırsat maliyeti |
| Bölgeyi sükûnete kavuştur | şehir/bölge | Kamu düzeni, müzakere, sivil hizmet ve garnizon seçenekleri |
| İsyan bastır | bölge | Soyut askerî/kamu düzeni müdahalesi, yüksek siyasi/hukukî ve sivil maliyet riski |
| Demiryolu/ikmal hattını koru | ulaşım hattı | Garnizon yükü; ikmal sürekliliği |
| Limanı koru / konvoyu koru | liman/deniz | Deniz birimi ve ikmal koordinasyonu |
| Keşif yap | cephe/bölge | Belirsizlik azalır; olay/istihbarat zamanı gerekir |

**Kamusal düzen kararı** sivil nüfusu düşman birlik gibi otomatik hedeflememeli. “Sükûnete kavuştur” çoğu durumda askerî harekât dışında kamu hizmeti, yönetim, yerel uzlaşı ve güvenlik önlemleri içeren geniş bir devlet planıdır. Orantısız güç kullanımı, sivil zarar, meşruiyet ve uluslararası tepki gibi olumsuz sonuçlar mekanikte görünür olmalıdır.

**Emir ayrımı:** `IssueOrder` anında kaydedilir; `OrderExecution` günlük fazlarda değerlendirir. Bir komutanın aldığı kalıcı emir, konum/ikmal değişince yeniden planlanabilir. İstifleme/tekrar emir istismarını engellemek için çelişen emirler atomik olarak iptal veya sıraya alınır.

## 13. Şehirler arası hareket ve gerçek lojistik (R11)

### 13.1. Harita-ulaşım grafiği

813 bölgenin sınır komşuluğu **tek başına hareket süresi değildir**. Veri derleyicide `road/rail/port/sea` kenarları, kara yolculuk mesafesi (metre), taşıma kapasitesi, arazi, sınır geçişi, ikmal kesintileri ve dönem sınırlamaları oluşturulur. Runtime engine içinde karmaşık coğrafi `sqrt`, `pow`, `trigonometri` gerekmez; gerekli mesafe geometri hesapları derleme zamanında yapılır, motor **güvenli tamsayı kenar ağırlıkları** kullanır.

### 13.2. ETA ve hareket hızı

- Yaya birlikler için **20–30 km/gün** iyi yol/normal koşulda ilk oyun kalibrasyonu; gerçek hız yük, hava, arazi ve organizasyona göre düşer. Bu aralık kesin her durumda uygulanacak tarihî sabit değil, test edilecek başlangıç varsayımıdır.
- Süvari, motorlu birlik, ağır topçu, kuşatma topçusu, ikmal katarı farklı temel hız ve taşıma kısıtlarına sahiptir.
- Demiryolu uzun mesafede çok daha hızlıdır; **yüklenecek tren, istasyon, hat, uygun kapasite ve boşaltma** maliyeti vardır. Her birlik kendi iradesiyle otomatik tren kullanamaz.
- Sınır/ittifak erişimi, muharebe, düşman kontrolü, sabotaj, mevsim ve köprü hasarı rotayı kapatabilir. Alternatif rota bulunursa ETA güncellenir.

```
edgeTravelDaysFixed = edgeDistanceMeters * S / effectiveMetersPerDay
routeETA = sum(edgeTravelDaysFixed) + loadingDays + unloadingDays + waitingForCapacityDays
```

Gerçekte edge bazında yük/boşaltma, hat doluluğu ve kısmi günlük ilerleme dikkate alınır; yukarıdaki denklem yalnız anlatım içindir. Aynı güne bölünmüş birden fazla kenardan geçmek mümkündür; basit `her bölge = en az 1 gün` kuralı **yasak**. Konumun `currentEdge`, `progressFixed` alanları kayıtta tutulur.

**Doğrulama örneği:** İyi yollardaki 240 km yürüyüş, 24 km/gün ile yaklaşık 10 gün; uygun ve müsait demiryolunda yükleme/boşaltma dahil daha kısa olabilir. Bu sayı tarihsel tüm coğrafyalar için garanti değildir. `Neden 10 gün?` açıklaması mesafe, hava, yol, hız, ikmal ve bekleme paylarını gösterir.

### 13.3. Patika ve performans

A* / Dijkstra veya uygun ağırlıklı ağ araması: eşit maliyette kimlik sıralı deterministik bağlayıcı; önbellek anahtarında harita sürümü ve ulaşım koşulu sürümü; ray kapasitesi tahsisi günlük tek işlem; çifte işgal ve sonsuz döngü önlemleri. Yol doğrulanmadan ordu bir şehirden diğerine ışınlanamaz.

## 14. Bakanlık, kabine ve devlet kurumları (R07)

### 14.1. Bakanlık katalogu (1914 temel)

Dışişleri, Harbiye/Savaş, Donanma (devlete göre müstakil), Maliye/Hazine, İçişleri, Ticaret/Sanayi, Tarım/Gıda, Ulaştırma/Demiryolları, Eğitim/Araştırma, Adalet, İstihbarat birimi (bağımsız ajans veya ilgili bakanlık bünyesi). Yapı **ülkeye ve rejime göre değişir**; her devlete modern tipte aynı 11 bakanlığın 1914'te otomatik kurulması tarihsel olarak doğru değildir.

Her `Ministry` için kurulma koşulu, bütçe, kadro, kurum kapasitesi, politikalar, ilgili göstergeler ve bakan koltuğu. Kuruluş anlık emir, kurumsal kapasitenin etkisi zamanla oluşur. Bir bakanlığın kurulması doğrudan parasız/kadro gerektirmeyen sınırsız bonus veremez.

### 14.2. Bakan/personel veri modeli

`personId`, `officeId`, `cabinetId`, `countryId`, `startDay`, `endDay`, `appointmentLegitimacy`, `competence`, `ideology`, `loyalty`, `corruptionRisk`, `policyPreference`, `influence`, `availability`. Siyasi kişiler komutanların kalıcı kişi ID yapısını kullanır, fakat askerî/siyasi rol durumu açık olmalıdır. Aynı kişiyle birden fazla görev ancak dönemin hukuku/senaryo tanımı izin veriyorsa mümkün.

### 14.3. Gerçek sistem etkisi (örnek)

| Bakanlık | Etkilediği sistem | Etkisi için zorunlu koşul |
|---|---|---|
| Harbiye | Seferberlik, komutan eğitimi, ordu ikmali | Bütçe, kurumsal kapasite, emir |
| Maliye | Vergi tahsilatı, tahvil, borçlanma | İdari kapasite, mevzuat/politika |
| Dışişleri | Müzakere hazırlığı, ittifak güveni | Diplomat ağı, ülke ilişkileri |
| Sanayi | Tesis kurulumu, üretim verimi, dönüşüm | Hammadde, işgücü, makine |
| Ulaştırma | Tren tahsisi, demiryolu yatırımı | Altyapı/hat kapasitesi |
| İçişleri | Yerel huzur, kamu düzeni, kriz yönetimi | İdari personel ve yerel koşullar |

Bakan etkileri birikimli çarpanlarla sonsuza çıkmamalı; bonus tavanları ve karşı maliyetleri konmalı. Görevden alınma, istifa, kabine krizi ve atama aynı olay sisteminde izlenir.

## 15. Hava ve deniz kuvvetleri 2.0 (R13)

### 15.1. Deniz

**Yönetim hiyerarşisi:** gemi → filo/müfreze → donanma görevi → deniz bölgesi/deniz güzergâhı. Liman, havuz, tersane, personel, mühimmat, yakıt türü, kömür bunkeri, bakım ve görev süresi gerektirir. Her gemi bir anda iki görevde olamaz.

**Görevler:** devriye, keşif, abluka, abluka kırma, konvoy koruma, ticaret akını (soyut), mayınlama/temizleme (soyut görev türü), kıyı bombardımanı, deniz üstünlüğü, çıkarma eskortu, liman savunması, geri çekilme/onarım. Geminin yer değiştirmesi, görev bölgesi, hedef bilgisi ve açıklanabilir deniz karşılaşması görünür. Denizaltı savaşı, ticaret kaybı, diplomatik olay ve yabancı devletin savaşa katılım riskini etkiler.

### 15.2. Hava

**Hiyerarşi:** uçak modeli → uçak envanteri → hava kanadı → hava üssü → görev bölgesi. 1914'te temel roller **keşif ve gözlem**; avcı/stratejik bombardıman ve yakın hava desteği etkisi teknolojik ve doktrinsel gelişime göre kademeli açılır. 1914 başlangıcında 1939 görev ve performans değerleri kopyalanmaz.

**Görevler:** keşif, topçu gözetleme, hava üstünlüğü, önleme, kara destek, taktik/stratejik bombardıman (döneme göre), deniz keşfi, üs savunması, eğitim, bakım. Menzil, havadan gözlem süresi, hava durumu, pilot eğitimi, görev uçuşu, yakıt ve uçak yıpranması hesaplanır. Görev sonuçları hem savaş etkinliğine hem istihbarat raporunun güvenine bağlanır.

### 15.3. UI ve AI

Haritadan deniz bölgesi/cephe/hava sahası seç → ilgili filo/kanatları göster → komutan ve görev seç → uçuş/seyir menzili ile yakıt/cephane/onarım/tahmini süre önizle → onay. AI tek tek uçak ve gemi yerine **görev paketi** planlar; deterministik günlük atamalar aynı kuyruktan geçer. Daha önce bulunan filo/kanat ayna toplamı invariantları korunur.

## 16. Dinamik ulusal hedef, olay zinciri ve AI ile entegrasyon (G01–G05)

### 16.1. 1914 ülke hedef kayıtları

- **Almanya:** Batı savaşında hızlı sonuç; doğuda savunma; İngiliz müdahalesini sınırlama; uzun savaşta ablukayı kırma; ayrı barış.
- **Avusturya-Macaristan:** Sırbistan'ı baskılama; Rus müdahalesi riskini yönetme; çok uluslu devlet istikrarı; federal reform alternatifi.
- **Rusya:** Sırbistan'a destek; Galiçya/Doğu Prusya; seferberlik–demiryolu; toplumsal/siyasal reform alternatifi.
- **Fransa:** Alman saldırısını önleme; Alsace-Lorraine; Rus ittifakı; savunma/taarruz doktrini.
- **İngiltere:** Deniz hakimiyeti; Belçika'nın tarafsızlığı; Avrupa güç dengesi; abluka veya arabuluculuk.
- **Osmanlı:** Devlet bütünlüğü, boğaz güvenliği, askerî reform, hazine ve dış baskı; İttifak/İtilaf/tarafsızlık alternatifleri.
- **İtalya:** Toprak talepleri, tarafsızlık pazarlığı, ordu hazırlığı ve ittifak seçimi.
- **Sırbistan:** Bağımsızlık, ültimatom, savunma, Rus garantisi ve bölgesel siyaset.
- **Belçika:** Tarafsızlığı ve bağımsızlığı sürdürme; tahkimat; uluslararası garanti.
- **Bulgaristan/Romanya/Yunanistan:** Balkan talepleri, ittifak pazarlığı, güvenlik ve iç politika.
- **ABD:** Tarafsızlık, ticaret güvenliği, denizaltı savaşına tepki, diplomatik müdahale.
- **Japonya:** Pasifik ve Doğu Asya nüfuzu, deniz operasyonu ve müzakere.

### 16.2. Tarihî olaylar için koşul örnekleri

`Saraybosna → ültimatom → kriz görüşmeleri → seferberlik → savaş veya uzlaşma`; `Belçika tarafsızlığı → İngiliz müdahalesi riski`; `İtalyan talepleri → ittifak yeniden değerlendirme`; `Osmanlı boğazları ve dış baskı → tarafsızlık/savaş`; `denizaltı krizi → ABD kamuoyu ve diplomasi`; `Rus iaşe ve savaş yorgunluğu → siyasi dönüşüm ihtimali`. Her tetikleyici olayın `dateWindow`, `conditions`, `choices`, `effects`, `cooldown`, `mutualExclusionGroup` alanları bulunur. Tarihsel olay, ön koşul gerçekleşmediyse sırf takvim günü geldi diye çıkmaz.

### 16.3. Devlet AI karar bütçesi

Bütün ülkeler aynı gün bütün seçenekleri baştan taramaz. Planlayıcı `tehdit değişti`, `yeni teklif`, `savaş başladı`, `bakan değişti`, `hazine tehlikede`, `ikmal tıkandı`, `teknoloji açıldı`, `hedef tamamlandı` olaylarında kirli hedefleri yeniden puanlar; diğer günler mevcut planı uygular. Oyuncuya sunulan danışman da aynı analiz motorunu kullanır. Yapay zekâ **hileli kesin rakip bilgisi** değil, gözlem erişiminin izin verdiği raporları kullanır.

## 17. Yeni veri tipleri ve paket ilişkileri

Kaynak kod birebir incelenmediği için aşağıdaki adlar **önerilen arabirimlerdir**, mevcut sınıf adı olarak varsayılmamalıdır.

```ts
interface StrategicGoal {
  id: number; countryId: number; kind: string; priority: number;
  prerequisites: readonly string[]; progressFixed: number;
  status: 'locked'|'available'|'active'|'achieved'|'failed'|'abandoned';
  deadlineDay?: number; relatedEntityIds: readonly number[];
}
interface DiplomaticProposal {
  id: number; revision: number; senderId: number; recipientIds: readonly number[];
  clauseIds: readonly number[]; secretClauseIds: readonly number[];
  state: 'draft'|'sent'|'countered'|'accepted'|'rejected'|'expired'|'active'|'terminated';
  issueDay: number; responseDeadlineDay: number;
}
interface IntelligenceOperation {
  id: number; sourceCountryId: number; targetCountryId: number;
  operationKind: string; networkId: number; targetEntityId?: number;
  state: 'planned'|'active'|'completed'|'failed'|'exposed';
  startDay: number; resolutionDay: number; rngNonce: number;
}
interface IndustrialFacility {
  id: number; cityId: number; countryId: number; facilityType: string;
  nameKey: string; level: number; workforce: number;
  productionLineIds: readonly number[]; conditionFixed: number;
}
interface ProductionLine {
  id: number; facilityId: number; equipmentModelId: number;
  assignedWorkforce: number; assignedMachineMinutesPerDay: number;
  efficiencyFixed: number; workInProgressFixed: number;
}
interface EquipmentModel {
  id: number; eraKey: string; nameKey: string; techId: number;
  availabilityDay: number; billOfMaterials: readonly {resourceId:number; kilograms:number}[];
  machineMinutesPerUnit: number; workerMinutesPerUnit: number;
}
interface UnitAssignment {
  unitId: number; commanderPersonId?: number; parentFormationId?: number;
  permanentOrderId?: number; transitEdgeId?: number; transitProgressFixed?: number;
}
interface CabinetAppointment {
  ministryId: number; personId: number; officeStartDay: number;
  countryId: number; legalState: string;
}
interface ForceMission {
  id: number; forceId: number; branch: 'land'|'air'|'naval'; kind: string;
  targetRegionId: number; status: string; commanderPersonId?: number;
}
```

**Kimlik ilkesi:** `countryId`, `cityId`, `regionId`, `personId`, `unitId`, `facilityId`, `equipmentModelId`, `proposalId`, `networkId`, `operationId`, `missionId`, `goalId` benzersiz, nesilli ve geçersizleşebilir kimlik yapısına uyumlu olmalı. String isimleri ID yerine anahtar yapma. `conditionFixed` ve `progressFixed` mevcut `S` ölçeğiyle sınırlı; tüm mutasyonlarda güvenli tamsayı denetimi.

### Kaynak kod paketlerine önerilen dağılım

- `packages/engine`: kaynak, sanayi, bakanlık, hedef, emir, AI sonuçları, savaş ve hareketin **saf hesaplanması**.
- `packages/command`: Türkçe ayrıştırıcı, öneri çipleri, komut → emir ve emir → Türkçe eşdeğer testleri.
- `packages/worker`: tek yazıcı, sürüm kilidi, idempotency, anlık idari eylemler, olay kuyruğu, kayıt.
- `packages/ui`: dikey şehir paneli, üretim hattı, bakan atama, istihbarat ve diplomasi arayüzleri, cephe emirleri.
- `packages/data-compiler`: dönem ekipman kataloğu, tesis türleri, kaynak sahaları, ulaşım kenarları, ülke hedefleri, tarihî olay tanımları.
- `packages/storage`: şema göçü, eski veriye varsayılan alanlar, hash/snapshot.
- `packages/lab`: 1914 çoklu tohum, üretim/mobilizasyon/ağ/uzun zaman analizi.

## 18. Günlük simülasyon fazlarına bağlama

Mevcut motorun P0–P12 fazlarının tam adları özet düzeyinde bilindiği için **P numaralarını tahmin ederek değiştirme**. Gerçek kodda şu mantıksal bağımlılık sırası doğrulanıp uygun mevcut fazlara kanca eklenmeli:

1. Oyuncu/AI emirlerini doğrula ve kaynak/tahsis çakışmalarını çöz.
2. Gün başlangıcında tamamlanmış diplomatik cevapları, yönetim kararlarını ve olayları işle.
3. Bakanlık politikalarının/yönetim durumlarının o güne geçerli etkilerini çıkar.
4. Maden çıkartma, işleme, sanayi üretimi, gıda ve kaynak muhasebesini yürüt.
5. Lojistik tahsisi, konvoy/istasyon kapasitesi, hareket ve birliğe teslimleri yürüt.
6. İstihbarat keşif sonuçlarını ve yürürlükteki gizli operasyonları çöz; bilgi güncelle.
7. Muharebe ön koşulları ve hava/deniz/kara görevleri için tekil kesinleşmiş durum kullan.
8. Siyaset, moral, nüfus ve iç düzenin sonuçlarını uygula.
9. Hedef ilerlemelerini/olay tetikleyicilerini bir sonraki günün planlamasına hazırla.
10. Bütünlük, hash, kayıt, rapor ve kroniği oluştur.

**Çok önemli:** Aynı gün üretildiği varsayılan tüfeğin aynı gün cepheye teslim edilip tüketilmesi ancak gerçek sevkiyat modelinin izin verdiği zamanla mümkündür. Olayların sonradan önceki fazın sonucunu geriye dönük değiştirmesi yasak; bunun yerine sonraki faz/gün için durum planlanmalı.

## 19. Kayıt göçü ve geriye dönük uyum

1. Mevcut şema sürümü özetle `10`; gerçek koddan doğrula, artış gerekiyorsa **tek yeni sürüm** belirle. Yeni oyun kaydı ve eski v1.6.1 kaydı aynı test matrisiyle denenir.
2. Eski `sivil fabrika`, `askerî fabrika`, `mühimmat` ve `petrol` toplulaştırmaları kayıp yaşatmadan yeni tesis/kaynak defterine dağıtılır; dağıtım için makul fakat gerçek tarih sayılmayan kontrollü göç reçetesi kullanılır.
3. Eski birlik konumları yeni rota sistemine taşınır; yolda olan birlikler kaybolmaz ve iki farklı bölgeye kopyalanmaz.
4. Eski komutanlar yeni atama tablolarına bağlanır; kimlik değişmeden geçiş yapılır.
5. Eski gemi/kanat güç toplamları detaylı envanter toplamlarıyla eşleşir. Silinmiş veya çelişen dış anahtarlar göç hatası verir ve uyarı kaydı bırakır.
6. Göç bir kez uygulanır; aynı kayda ikinci kez uygulandığında idempotent veya açıkça reddedilir. Geri dönülemez şema değişikliğinden önce kullanıcıya yedek dışa aktarma önerilir.

## 20. Birbirine bağlı oynanış senaryoları

### T01 — Almanya'nın 1914 silahlanması

Oyuncu teknoloji panelinden **standartlaştırılmış silah üretimi** araştırır → Essen'deki silah fabrikasını seçer → yeni Gewehr 98 hattına kapasite ve işgücü ayırır → çelik ve makine parçası stoklarını görür → Maliye/Sanayi bakanlığının bütçesi üretim koşullarını etkiler → üretim stok depoya girer → uygun demiryolu hattıyla cepheye sevk edilir → birlik takviye alır → yeni tüfeklerin etkisi savaş hesabında görünür. **Araştırmadan hemen sonra birliklerin envanteri artmaz.**

### T02 — İngiltere'yi savaştan uzak tutma girişimi

Almanya Belçika'nın tarafsızlığını korumaya yönelik diplomatik taahhüt teklif eder → askeri planını alternatif güzergahta revize eder → İngiltere'nin risk hesabı değişir → Alman komuta planı daha uzun/masraflı olabilir → savaş ve diplomasi farklı yol izler. Devlet hedefleri gerçek kaynak ve rota maliyetlerini gizleyemez.

### T03 — İtalya'nın ittifak pazarlığı

Avusturya/İtilaf devletleri İtalya'ya farklı çok maddeli teklif sunar → gizli protokoller saklanır veya sızabilir → İtalya askeri hazırlık ve iç siyasi desteği değerlendirir → savaş katılımı veya tarafsızlık seçer → antlaşma vaatleri savaş sonuna kadar takip edilir.

### T04 — Rus askerî demiryolu seferberliği

Rusya birliklerine batı yönünde intikal emri verir → yol ve demiryolu kapasiteleri doğrulanır → istasyonlarda bekleme süreleri görünür → saldırı zamanlaması buna göre değişir → Almanya bu hareketi ancak istihbarat kalitesi oranında bilir.

### T05 — Osmanlı'nın petrol ve deniz kararı

Osmanlı'nın boğazlar ve deniz güvenliği hedefi → liman, kömür/yakıt ve donanma bakım durumu → Harbiye/Donanma bütçesi ve atanan bakan → diplomatik ittifak tercihi → deniz görevlerinin sürdürülebilirliği. 1914'te her Osmanlı gemisi için petrol varsayılmaz.

### T06 — Bir şehirde sabotaj ve toparlanma

Rakip devletin soyut istihbarat operasyonu bir demiryolu tesisini geçici olarak devre dışı bırakır → şehir arayüzünde hasar, sevkiyat gecikmesi ve onarım projesi görünür → İçişleri/Ulaştırma birimleri müdahale eder → bölgedeki cephe ikmali etkilenir → operasyon açığa çıkarsa diplomasi ve halk desteği değişir. Oyunda operasyon için gerçek dünyaya aktarılabilir teknik yöntem ayrıntısı bulunmaz.

## 21. Performans, denge ve ölçülebilir kalite kapıları

| Kalite kapısı | Ölçüt |
|---|---|
| Determinizm | Aynı derleme/veri/tohum/karar geçmişi = aynı kanonik hash |
| Kayıt | Yeni/eskiden göçmüş kayıt round-trip sonrası eşit temel durum |
| Kaynak muhasebesi | Negatif stok, çift tüketim, kayıpsız olmayan dönüşüm sıfır |
| Komut-parite | UI'de bulunan her işlemin eşdeğer Türkçe komutu doğrulanır |
| Cephe | Çift görev, sonsuz muharebe, yanlış komutan/ülke ataması yok |
| Hareket | ETA nedeni görünür; aynı rotada maliyet determinizmi; demiryolu doluluğu gerçek |
| İstihbarat | İfşa/başarı/rapor eskimesi deterministik; AI gizli oyuncu verisine erişemez |
| Üretim | Fabrika kapasite değişimi ve seri üretim teknolojisi beklenen sınırlar içinde |
| 1914 denge | Almanya, Rusya, Fransa, Osmanlı vb. çoklu tohum: tek zorunlu tarih sonucu yok |
| Çapraz dönem | 750/1600/1939/2026 kırılmıyor; tarih dışı ekipman yanlış zamanda çıkmıyor |
| Android dikey | Alt çekmece/komut/harita/şehir paneli klavyeyle kullanılabilir |
| Performans | Önce gerçek orta-alt-üst Android ölçümü; ardından başlangıç tabanına göre regresyon eşiği koy |

**Tekli performans sabiti ekleme:** 1914 ~33 ms/gün, 2026 ~47 ms/gün değerleri eski masaüstü tek koşu referansları; farklı cihazlarla kıyaslanamaz. Aynı cihaz/senaryo/tohum/profilde yeni sürümde hedef `≤%10` medyan gün maliyeti regresyonu olarak başlayabilir; aşılırsa darboğaz profili ve optimizasyon gereklidir. Telefon için gerçek ölçüm olmadan yıllık ilerleme süreleri kesin vaat edilmez.

**Denge testleri:** 6 tohumla smoke, 24+ tohumla değişiklik doğrulama, gece koşusunda 100+ tohum varyansı; ayrıca 365 günlük ve 5/10/25 yıllık koşular. Tarihî kalibrasyonda belirli teslim tarihini garantileme değil, mantıklı muharebe süreleri ve anlaşılır değişkenlik hedeflenir.

## 22. Sıralı gerçekleştirme planı

**Faz 0 — Depo keşfi ve korunma:** dosya/sınıf envanteri, mevcut 70 v1.6 kabul testinin yeniden çalıştırılması, şema/kimlik/P fazlarının doğrulanması, Android dikey ekran hedefinin teyidi.  
**Faz 1 — Tek ekonomik defter:** R03/R08/R10; sanayi tesisi, kaynak, üretim hattı, named equipment ve göç hazırlığı.  
**Faz 2 — Kara ordusu ve lojistik:** R05/R06/R11/R12; komutan, hareket grafiği, harekât durumu, cephe stabilitesi.  
**Faz 3 — Diplomasi ve istihbarat:** R01/R02; gizli anlaşma, çok maddeli teklif, rapor/operasyon/karşı tedbir.  
**Faz 4 — Bakanlık, şehir ve ülke stratejisi:** R07/R09/G01–G04; bütün yeni işlemleri şehir ve bakanlık ekranına bağlama.  
**Faz 5 — Hava/deniz ve 1914 olay zincirleri:** R13/G02; dönem bazlı görevler ve askerî-diplomatik sonuçlar.  
**Faz 6 — Oynanış/dağıtım:** G05, öğretici, hedef/puan/oyun sonu, telefon performansı, eski kayıt, ekran testi, imzalı APK planı.

**Teslim birleştirme kuralı:** Fazlar birbirinden veri sözleşmesi ile bağımsız PR'lara bölünebilir; ancak bir özelliğin göstermelik UI'si çalışıyormuş gibi işaretlenemez. Her fazda mevcut testler + o fazın kabul testleri yeşil olmalıdır.

## 23. 1914 tarih ve ölçek ilkeleri

1. Tarihî devlet, lider, ekipman ve tesisler için tarih penceresi doğrula; tarihsel olarak doğrulanmamış isimleri kurgu olarak işaretle.
2. 1914 kömür ve demiryolu ağı temel; petrol artan stratejik kaynak. Hava ve denizin 1914 kapasiteleri 1939'dan farklı.
3. Üretim ölçekleri gerçek tarih örnekleriyle, ülke büyüklüğü ve tesis tanımıyla kalibre edilmeli; `bir fabrika` ile `bir üretim hattı` karıştırılmamalı.
4. Tarihsel sonuçlar sabitlenmemeli: Osmanlı tarafsız kalabilir, İtalya farklı karar verebilir, savaş 1918'den önce veya sonra bitebilir. Ancak her değişiklik gerçek bir ekonomik/diplomatik/askerî maliyet taşır.
5. Ayrım gözetmeyen şiddet, sivil hedeflere yönelik baskı ve kitlesel hak ihlalleri ödülsüz, ciddi insani/siyasi sonuçları olan tarihî riskler olarak ele alınmalı; gerçek yöntem talimatları yer almamalı.

## 24. Referanslar ve güven düzeyi

Kaynaklar örnek alınan oyun mekaniği/historik ölçeği doğrular; **bu belgedeki sayısal parametre ve şemalar tasarım önerisidir**, kaynaklarda aynen belirtilmiş veriler değildir.

- Strategic Command: World War I — Steam oyun açıklaması; diplomasi, karar olayları, hava keşfi, cephe ve teknoloji: https://store.steampowered.com/app/1096930/Strategic_Command_World_War_I/
- Canada War Museum — *Supplying War*: https://www.warmuseum.ca/firstworldwar/history/battles-and-fighting/tactics-and-logistics-on-land/supplying-war/
- Cambridge University Press — *Mobilizing Nature for the First World War*: https://www.cambridge.org/core/books/environmental-histories-of-the-first-world-war/mobilizing-nature-for-the-first-world-war/EE7B04AF67F241D0D19A34FF445ECCAC
- Institution of Mechanical Engineers — *Munitions in London*: https://engineersatwar.imeche.org/features/munitions-in-london
- University of London Press — *Civilian Specialists at War* (ulaşım/lojistik): https://read.uolpress.co.uk/read/civilian-specialists-at-war/section/56f67677-3652-44d1-a565-1f68c3271965

---

**Bitiş koşulu:** v1.7, kullanıcının 13 isteğinin her birinin simülasyon, şehir/cephe/panel arayüzü, Türkçe komut, AI davranışı, kayıt bütünlüğü, 1914 senaryo etkisi ve kabul testiyle çalıştığı bir sürüm olduğunda tamamlanmış sayılır. Bu belge kodun kendisi veya mevcut deponun doğrulanmış yaması değildir.
