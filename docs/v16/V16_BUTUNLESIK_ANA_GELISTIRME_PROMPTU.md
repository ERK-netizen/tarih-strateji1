# TARİH STRATEJİ — v1.6 BÜTÜNLEŞİK GELİŞTİRME, KODLAMA VE DOĞRULAMA ANA PROMPTU

**Proje:** Tarih Strateji — çevrimdışı Android büyük strateji / alternatif tarih oyunu  
**Kaynak depo:** https://github.com/ERK-netizen/tarih-strateji1  
**Kontrol edilen referans commit:** `3fdd26d53912c894f34a175469b4d13ac6edb407`  
**Esas platform:** Android, **DİKEY** ekran; geliştirme: masaüstü tarayıcı  
**Hedef:** v1.6; kod, veri, test, Android ve belgeler birlikte olgunlaşacak.

> **BU METNİ GELİŞTİRİCİ AJANA TEK PARÇA VER.** Görev, sadece rapor ya da tasarım hazırlamak değil, kaynak kodu inceleyip gereksinimleri entegre etmek, test etmek, çalışır sürüm üretmek ve gerçekleşmeyen her hedefi açıkça işaretlemektir. Bütün çıktılar gerçek repodan izlenebilir olmalıdır. Teknik gerçeklerle çelişen bir istek için çözümsüz sessiz değişiklik yapılmaz.

## 0. Çalışma ve doğruluk kuralları

1. Önce repo dallarını, commit'i, `package.json`, README, `docs/sartname-v1.4.md`, testleri ve veri derleyicisini oku. Başlangıç için `main` referansı kullan; doğrulanmayan eski 1.5 belgesini kod gerçeği sanma.
2. Belirlenimci TypeScript motorunu, P0–P12 günlük hattı, `World` SoA tablolarını, kanonik save/hash, Preact, Canvas, Worker, Capacitor ve çevrimdışı özelliği **koru**. Mimariyi baştan yazma. Çekirdek modüllerin sözleşmelerini genişlet, geriye dönük kayıt göçü oluştur.
3. **İlk iş teknik hataları gider:** Worker'ın bekleyen istekleri, yarışlar, güncel sürüm denetimi, otomatik kaydetme, açıklanamayan negatif stok, teknoloji maliyeti, nüfus korunumları. Değişikliği aynı commit'te ilgili test ve belgeyle gönder.
4. **İstekler korunacak:** Burada sayılan her özelliği `GEREKSİNİM_ID`, kod dosyası, veri, arayüz, test ve kabul kanıtıyla eşleştir. Bir özellik yalnız tip olarak tanımlandığında tamamlanmış sayılmaz; kullanıcı arayüzünden oynanabilir olmalı.
5. İş ve gecikmeli etkiyi ayır: oyuncunun onayladığı ayar, proje başlatma, hedef işaretleme, araştırma seçimi, olay kararı, gelen teklife cevap **aynı simülasyon gününde** işlenip kaydedilir; nüfus/üretim/tüketim gibi günlük akışlar sonraki gün hesaplanır. Gün ilerletme zorunlu kullanıcı arayüzü tıklaması olmasın.
6. Bilgi güvenliği: rakip YZ oyuncunun görmediği gizli dünya durumunu kullanmaz; casusluk ve danışman bilgileri güven aralığıyla sunulur. Suikast, darbe, ayaklanma ve tarihsel kitlesel suçlar yalnız soyut oyun olayları ve sonuçları şeklinde modellenir; gerçek dünyada zarar verme yöntemleri bulunmaz.
7. Çalışmadan geçmemiş test için 'başarılı', üretilmemiş APK için 'hazır', bağlanmamış modül için 'entegre' ifadesini kullanma. Eksik kalan işi görev listesine açıkça yaz.

## 1. Referans tasarımın oyuna dönüştürülmesi — HOI4, EU5, komut odaklı oynanış

**HOI4'ten soyutla:** ordu-komutan hiyerarşisi, tümen şablonları, planlama hazırlığı, savunma/taarruz çizgileri, cephe kapasitesi, organizasyon, gerçek ekipman ikmali, hava kanatları, deniz görev grupları, araştırma–üretim, muharebe raporu, kuvvetlere tekil konum ve görev. Kopyalanmış metin, varlık, görüntü, sayı dizileri ya da kod alma. Her mekaniği dönemlere ve dokunmatik mobil ekrana göre yeniden yorumla.

**EU5 türü ülke simülasyonundan soyutla:** nüfus grupları, yerel ekonomi, ticari bağlantılar, yönetim kapasitesi, ülke kurumları, siyasi aktörler, diplomatik hafıza, kültür ve dinin gerçekçi siyasi etkileri. Tek değişkenli sadakat modeli yerine tarihsel ve çok değişkenli yapı kur.

**Türkçe komut yaklaşımı:** emir yazma + haritada seçme + panelde eylem aynı kanonik `Emir` nesnesine dönüşsün; karar kartı, maliyet ve sonuç birbirinin aynısı olsun. Anlamsız metin otomatik eyleme dönüşmesin, en fazla üç olasılık sunulsun. Çok adımlı komutlar alt emirlere ayrılarak kullanıcıya plan olarak gösterilsin.

## 2. Kapsam ve dönemler

Korunacak senaryolar: **1.1.750**, **1.1.1600**, **28.6.1914**, **1.9.1939**, **1.1.2026**. 1914 ve 1939 için askerî ve siyasi ayrıntı en yüksek öncelik; 2026 için modern Ar-Ge, elektronik harp, insansız sistemler; 750/1600 için çağ dışı teknoloji, uçak ve modern parti bulunmamalı. Döneme özgü terim, lider, kültür, filo, teknoloji ve ordu modelleri `Donem` kataloglarından gelsin.

### Harita

Mevcut **463 bölgeyi yaklaşık %70 artır:** hedef **en az 787 kara bölgesi** (463×1,70≈787,1; 788 de kabul). 1914/1939 cephelerin kritik coğrafyalarında yoğunlaştır: Belçika, Ren, Alsas-Loren, Polonya, Karpatlar, Balkanlar, Kafkaslar, Çanakkale/Boğazlar, Süveyş, Kuzey Afrika, Britanya kıyıları, Baltık, Pasifik stratejik adaları. Çakışma, boşluk, komşuluk simetrisi, ada deniz geçişi, yol mesafesi, başkent eşlemesi, nüfus ve bina stoklarının bölünmesi zorunlu doğrulansın. Harita bölündüğünde önceki save bölge kimlikleri otomatik kaymaz; **eski->yeni eşleme ve göç**, nüfus/tesis/ordu dağıtım politikası tasarlansın. 787+ bölgeye çıkmak salt sayıyı artırmak değil, coğrafi doğruluk ve Android performansı birlikte korumaktır. Şartnamede geçen 1.500–2.000 bölge daha uzun vadeli hedef olarak saklanabilir; v1.6 kabulü +%70'tir.

## 3. Tekil dünya varlıkları ve veri modelinin genişletilmesi

`country`, `province`, `city`, `cohort`, `person`, `appointment`, `party`, `ideology`, `government`, `unit`, `command_group`, `commander_plan`, `fleet`, `ship_group`, `air_wing`, `airbase`, `shipyard`, `sea_zone`, `front`, `mission`, `equipment_model`, `equipment_stock`, `factory_line`, `research_stage`, `treaty`, `treaty_clause`, `spy_network`, `intel_report`, `historic_event`, `effect`, `long_order`, `strategy_plan` için kalıcı/generation'lı kimlik sistemi oluştur.

Aynı lider hem bakan hem komutan olabiliyorsa `personId` tek kalır ve `appointment` değişir. Ölüm/görev bitişi/ülke değişimi rol kayıtlarını tutarlı yeniler. 1 ila 10 arası şehir düzeyi bölgeye/şehre ayrı bağlanır; devlet sahipliği işgal, kontrol, hukuki ilhak üç farklı kayıt olarak ele alınır. Ekonominin kaynak defterleri, ekipman ve yakıt stoğu bütün fazlarca tek sahipli güncellenir. Kayıt şeması 7'den 8'e (ve gerekirse 9'a) yükseltilirken göç dosyası, `hash` vektörü ve eski save örnekleri test edilir.

## 4. İşlem/faz akışı ve aynı gün emir

**Ayrı idari işlem sınırı:** `COMMAND_RECEIVED -> VALIDATE -> PREVIEW -> CONFIRM -> APPLY_ADMIN -> COMMIT_VERSION -> SAVE -> REFRESH_VIEW`. Onaylanan idari emir onayı döndüğü anda görünür. **Dünya gününü artırma.** Çok emrin olduğu bir batch atomik koşullara göre ya tümü uygulanır ya her eylem açıkça farklı statü alır; karışık kısmi uygulama belirsiz kalmaz. Aynı sürüm iki kez kullanılacaksa optimistic locking ve yeniden önizleme zorunludur. Worker, istemciye `error` gönderdiğinde Promise reddedilir; çalışan zaman atlaması tek yazar kuralını ihlal etmez. Yeni günün sırası: P0 kesinleşmiş dünya -> P1 ay/yıl -> P2 strateji/bakan/komutan/oyuncu planları -> P3 diplomasi/istihbarat -> P4-7 seyahat/üretim/lojistik/ekonomi -> P8 hava/deniz -> P9 kara -> P10 zafer/kayıp/işgal -> P11 olay -> P12 korunum/hash/kayıt/rapor. Alt fazlar eklenebilir ama deterministik sıra ve tekil tüketim korunur.

**Anlık:** gelen teklifin kabul/ret kararı, politika/araştırma/inşa emirlerinin oluşturulması, şehir geliştirme seçimi, komutan atama ve plan, hava/deniz görev atama, dış politika teklifi, olay seçimi, ordunun hedef işaretlemesi, tahkimat emri ve sandbox yapılandırması. **Zaman gerektiren:** günde yapılacak çalışma, yol/seyahat, eğitim, fiziksel üretim, hasat, göç, savaş yıpranması ve istihbarat raporunun olgunlaşması. Kullanıcı onayı geldikten sonra anında uygulanan işlem kayıt dosyasına da anında yazılır; yazma başarısızsa açık uyarı gösterilir.

## 5. Şehirler ve altyapı

- **Şehir seviyesi 1–10**; yeni şehir başlangıçta seviye 1 veya tarihsel seviyeye uygun başlar. **Her seviye 4 yapı yuvası sağlar**: `slotCapacity=4*level`; seviye 10 = 40 yuva. Bu, yapı kapasitesidir; aynı anda yürüyen inşaat projesi limiti idari kapasite/teknolojiyle ayrı belirlenir. İki farklı 'yuva' kavramını karıştırma.
- **Demiryolu, sulama, genel altyapı, şehir imarı** yapı yuvası *tüketmez*, ancak proje süresi/maliyet, inşaat iş gücü ve bütçe tüketir.
- Sivil/askerî fabrika, hava üssü, tersane, liman, konut, hastane, okul, üniversite, araştırma merkezi, depo, savunma yapıları, enerji tesisi, idari yapılar dönem uygunluğu ve yuva gereksinimiyle inşa edilebilir.
- Şehir geliştirme yatırımı ücretli/zamanlıdır; yükseliş yalnız kapasiteyi artırır, **bedelsiz fabrika oluşturmaz**. Fabrika/şehir altyapısı gerçek iş gücü, girdiler, bakım, elektrik/enerji, ulaştırma ve vergileri etkiler. Şehir daha gelişmişse göç çekiciliği artabilir; otomatik nüfus yaratılmaz.
- İşgal edilen yerde bina ve şehir politikaları için kontrol, güvenlik ve yerel idare koşulları; ilhakta hukukî sahiplik ayrı işlem. Savaş hasarı, onarım ve barış sonrası yeniden yapılanma verileri güncellenir.
- Demiryolu/karayolu/denizyolu yönlendirme ağlarında bağlantı başına km, kapasite, bakım, tahrip, sivil/askerî talep; tek kapasite defteri ve alternatif güzergâhlar. Liman trafiği ile deniz ablukası gerçek taşıma kapasitesini etkiler.
- **Ordu büyüklük sınırı** ülke sınırı, kontrol edilen şehir seviyesi, nüfus, sanayi, yönetim, komuta kapasitesi, askerlik hukuku, bütçe ve lojistikle artar; sabit 400 gibi sert tavan normal oynanışı anlamsız biçimde kesmesin. Limit aşımında doğrudan birlik silme değil, artan bakım/organizasyon/ikmal cezası ve açık uyarı uygula.

## 6. Ordu, komutanlar ve cephe

- HOI4'ten alınan ilkelerle birimler `tabur -> tümen -> kolordu -> ordu -> ordu grubu -> cephe karargâhı`; her birimin benzersiz kimliği, yeri, sahibi, deneyimi, komutanı, planı, ikmali, ekipman stoğu, moral, insan gücü, organizasyon, taarruz, savunma, dayanıklılık, zırh/delme, hız, ateş gücü ve mühimmatı olsun.
- **Komutan** gerçek tarihî veya kurgusal; doğum/ölüm, görev dönemi, rütbe, seviye, eğitim, sadakat, lojistik, organizasyon, savunma, taarruz, manevra, moral ve tecrübe. Aynı gerçek kişi iki kopya olmayacak. Komutan savaş, eğitim ve akademiyle gelişir; görev/sorumluluk sınırı ve yıpranma vardır. Aynı bonus komuta zincirinde iki kez uygulanmaz.
- Haritada ordu seç -> komutan ata -> **genel emir**: savunma hattı çiz, hedefe ilerle, ihtiyat oluştur, tahkimat yap, kuşat, geri çekil, hazırlık tamamlanmadan saldırma, ikmal yetersizse dur, belli kayıp oranını aşınca geri çekil. Komutan planı günler boyunca uygular; oyuncu istediğinde iptal/değişiklik yapar.
- Cepheler bağımsız `frontId`'yle tutulur; kara birlikleriyle beraber hava kanadı, donanma görev grubu, lojistik, bombardıman ve deniz çıkarması aynı `operationId` altında yönetilebilir. Bir kaynak bir operasyon ve zaman aralığında yalnız bir kez tahsis edilir.
- Ekipman yönetimi bölümü: model adı, menşei, üretim yılı, gerçek/alternatif etiket, envanter sayısı, hasar, yedek parça, üretim hattı, bakım, ikmal önceliği, saha dağıtımı. Teknoloji ilerledikçe eski model kendiliğinden yeni modele dönüşmez; üret, dönüştür veya değiştir.
- Muharebede sonucu etkileyen değişkenler: asker sayısı, tabur dizilimi, ateş gücü, birim canı/HP, organizasyon, moral, mühimmat, ikmal, arazi, mevsim, tahkimat, deneyim, komutan, teknoloji, hava/deniz desteği, cephe genişliği, taktik, geri çekilme. Aynı çatışmada kayıp iki kez kaydedilmez.
- **1914:** hareket/yıpratma, topçu hazırlığı, siper, tahkimat, seferberlik, kış; **1939:** manevra, mekanizasyon, hava-kara iş birliği, derin harekât, lojistik; **2026:** ISR, hassas sistemler, İHA, elektronik tehdit, enerji/tamir, maliyet ve karşı önlem.
- **Muharebe ekranı:** oyuncu şehre saldırı planını onayladıktan sonra ayrı portre uyumlu ekran/modal; Canvas/JavaScript ile kendi ve rakip birlikleri göster, seçilebilir birlik/hedef, durum çubukları (can, organizasyon, moral, mühimmat, ikmal, tecrübe), saldırı/ateş/geri çekilme efektleri, karşılıklı kayıp, zafer, komutan emri, hava/deniz katılımı. Bu ekran P9 motorunun aynı kanonik sonuçlarını okumalı, ikinci/sahte oyun dünyası yaratmamalı. Görselleştirme isteğe bağlı hızlandırılabilir; günlük deterministik simülasyon aynen korunmalı.

## 7. Deniz ve hava kuvvetleri soyut toplam olmaktan çıkacak

- `fleetId`, `wingId` ile her filo/hava birliği ayrı konum, komutan, model, sayı, yakıt, menzil, yedek, personel, onarım, üs, hedef, bakım, görev ve seyahat süresine sahip olur. Sadece ülke `gs0...gs4` ve `h0...h2` toplamı yeterli sayılmaz; eski toplamlar migration ile gruplara dağıtılır.
- **Filo:** deniz bölgeleri boyunca hareket; liman, tersane, deniz üstünlüğü, abluka, konvoy savunması, ticaret akını, keşif, çıkarma, kıyı desteği, devriye. Filo gerçek konuma bağlıdır, aynı anda iki yerde olamaz, refakat/deniz geçişi kapasitesi ayrı kaydedilir.
- **Hava kanadı:** hava üssünden kalkar; menzil, hazır uçak, petrol, mühimmat, uçak modeli, pilot eğitimi ve hasarı sınırlıdır. Önleme, hava üstünlüğü, yakın destek, keşif, stratejik bombardıman, deniz hava desteği, çağ uygun elektronik harp.
- Üs/tersane/liman şehir altyapısına gerçek bir bina/proje olarak eklenir. Üs seviyesi ve personel sınırı aşılırsa operasyon tam verimle yürüyemez.
- Harita üzerinde filoları ve kanatları seç/gönder; aktif cephenin üstüne sürükleyip görev ver. Aynı filo, uçak ya da konvoy envanteri iki farklı operasyonun hesabına yazılmasın.

## 8. Teknoloji, bilim, sanayi ve alternatif ilerleme

- Mevcut **36 hat × 12 kademe** korunur, üzerine dallanma, teknoloji/alt model/ön koşul ve dönem özel ağacı eklenir. Etkileşimli Canvas/SVG teknoloji ağacı: düğümler, kilit, maliyet, bilim insanı, laboratuvar, takip zinciri, ekipman ve sistem etkileri, vazgeçilen diğer yatırımın fırsat maliyeti.
- Kesin yıl kilidi yok: **1914'te başlayan yoğun uzmanlaşmış ülke 1930'a geldiğinde seçilmiş bir teknik hatta yaklaşık 1950 düzeyine** teorik olarak ulaşabilsin; bunun para, araştırmacı, laboratuvar, eğitim, sanayi ve üretim maliyeti ağır olsun. Diğer tüm alanlarda eşzamanlı üstünlük mümkün olmasın.
- İlerleme aşamaları: **araştırma -> prototip -> endüstrileştirme -> seri üretim -> saha eğitimi/kullanım**. İcat ile orduya ekipman teslimi aynı gün değildir. Yeni araç, fabrika ürünü, lojistik, yakıt, bakım, pilot/asker eğitimi ve doktrin kaynaklarının tamamını etkiler.
- Araştırma bütçesi ve önceliği, araştırmacı kapasitesi, laboratuvar inşası, ortak Ar-Ge, bilimsel istihbarat, tarihsel fırsat/erken keşif, teknolojinin yayılması ve karşı tedbir; tümü sabit nokta ve deterministik puan sistemiyle.
- 2026 sonrasında İHA/insansız kara-deniz, yeni nesil hava, sensör, elektronik harp, otonom platformlar ve kurgusal gelecek teknolojileri açıkça "alternatif" etiketli olsun.
- Ekipman katalogları, hizmet yılı, ülke/üretici, maliyet, parçalar, üretim teknolojisi ve tarihsel kaynaklarla doğrulansın. Gerçek modelin **tarihsel ilk kullanımı** ile oyuncunun önceki tarihte ürettiği alternatif model karıştırılmasın.

## 9. Siyaset, gerçek kişiler, partiler, ideolojiler

- Mevcut 5-parti durumu genişlet: ülke/döneme göre dinamik 6–20+ **parti veya siyasi güç odağı** ve çok sayıda ideoloji. İdeoloji eksenleri: devletçi/serbest, otoriter/özgürlükçü, gelenekçi/reformcu, milliyetçi/uluslararasıcı vb. Etiket tarih dışı zorla uygulanmasın (750'de modern kitle partisi yok).
- Gerçek isim havuzu doğum, ölüm, görev yılı, parti/ideoloji, askerî ve sivil roller, kabiliyet ve tarihsel kaynaklarla. 1914'te başlayıp 1920–50'ye devam eden oyun için döneme uygun kişiler kariyer şartlarına göre çıkabilir; 1914'te olmayan kişi erken ortaya çıkmaz, ölü kişi geri gelmez. Rol değişince ülke başlığı ve tüm paneller aynı gün güncellenir.
- Bakan, danışman, ideolog, diplomat, istihbarat yöneticisi, komutan ve lider seçimleri savaş, bilim, dış ilişkiler, maliye, halk memnuniyeti ve propaganda üzerinde farklı neden-sonuç üretir. Gerektiğinde kurgusal kişi üret; kaynak verilmemiş kurgusal isim tarihsel kişi gibi etiketlenmez.
- Partiye/ideolojiye destek, karşı propaganda, kısıtlama, yasaklama, seçim, koalisyon kurma, hükümet anlaşması, kabine değişimi, olağanüstü hâl, sivil/asker ilişkisi, darbe teşebbüsü ve devrim riskleri; her eylem siyasi güç, meşruiyet, toplum, ekonomi, dış ilişkiler ve hak sonuçlarını etkiler. Dönem ve rejim bu eylemlere koşul koyar. Partinin tek gücü `pay` olmaz: örgütlenme, kurumlar, medya, lider, bölgesel destek, karşıt hareketler ve koalisyon gerekir.

## 10. Demografi, etnik azınlıklar, iskân ve nüfus politikaları

- Mevcut 4 yaş bandı / 8 statü / 7 kimlik kayıtlarının üstüne seyrek kohort tablosu: etnik unsur, kültür, dil, inanç/mezhep, cinsiyet, yaş, eğitim, meslek, ekonomik sınıf, şehir-kır, askerlik, göç. Küçük azınlıklar ayrıntılı görüntülenebilsin (%0,01 / %0,001 görüntü hassasiyeti); bu ölçü tarihsel verinin **doğruluğunu** kanıtlamaz.
- Muhasebe değişmez: `yeni_nufus = eski + dogum - olum + gelen_goc - giden_goc`. Asker alma, statü değişimi, terhis, yaralı/esir geri dönüşü, asker kökeni defterleri toplamı korur. Aynı grup iki kez sayılmaz.
- Bir bölgeye **iskân** için o bölgede önceden aynı kültür veya etnik unsurun bulunması **aranmaz**; ancak kaynak nüfus, nakliye, konut, gıda, maliyet, meşru idare ve zaman zorunludur. Yoktan nüfus oluşturulmaz.
- Eğitim, sağlık, bölgesel yatırım, doğum ve göç teşviki, gönüllü yer değiştirme, kültürel haklar, asimilasyon baskısı, sürgün, zorunlu yer değiştirme, soykırım gibi tarihsel olaylar/oyun kararları; ağır insani maliyet, toplumsal travma, nüfus kaybı, uluslararası tepki/yaptırımlar ve diplomatik hafıza ile temsil edilir. **Soykırım verimlilik/puan bonusu olarak ödüllendirilmez**; bireylere zarar verme tekniği içermez. Etnisite bir grubun tek başına sadakat veya verimliliğini belirlemez.
- Ülke/bölge ekranlarında kırılım ve 10–25 yıllık değişim; göç nüfus tabloları, ordu insan gücü, iş gücü, tedarik, seçim tabanı ve şehir gelişimini etkilesin.

## 11. İstihbarat

- Bilgi edinme, casus ağları, karşı istihbarat, askerî keşif, diplomatik nüfuz, ekonomi ve teknoloji takibi, siber ve elektronik tehdit (dönem uygun), rejim algısı, propaganda, kamuoyu değişimi, ilişki bozma, gizli saldırı/sabotaj, darbe ve ayaklanma desteği, siyasi suikast girişimi soyut işlemler olarak geliştirilsin.
- Her ajan/operasyon: hedef, bütçe, siyasi güç, süre, risk, ortaya çıkma ihtimali, diplomatik sonuç, istihbarat yetkinliği, karşı ajan tedbiri, güvenilirlik ve algı. **Yetersiz hazine/siyasi güç** ise işlem reddedilir; stok negatife düşmez.
- `IntelReport` güncellik, tahmin aralığı ve kaynak tutar; düşman gerçek değerleri otomatik açılmaz. YZ bu raporlardan davranır; danışman belirsizliği söyler. Savaş ilanı/ambargo/istihbarat ifşası gibi eylemler dünyanın yeni olay ve siyasi tepkilerini tetikler.

## 12. Diplomasi, savaş, koşullu barış

- Güven, prestij, ticaret bağı, ittifak ağı, stratejik tehdit, ideolojik yakınlık, savaş anıları, anlaşma ihlalleri, lider ve hükümet karakteri ilişkiyi belirler.
- Eylemler: ittifak, saldırmazlık, askerî geçiş, üs hakkı, garanti, ticaret, yatırım, ekipman alımı/satımı, kredi, yardım, ambargo, araştırma işbirliği, gümrük, ortak tatbikat, himaye, arabuluculuk, ültimatom, diplomatik kriz, barış konferansı, savaşta taraf değiştirme/ayrı barış, savaş tazminatı, ilhak, bölge devri, bağımsız devlet bırakma, askerî kısıt, tam/şartlı teslim.
- **Barış şartları** tek tip başlık değil, çoklu madde: ilhak edilecek spesifik şehir/bölgeler, devredilecek bölge, tam ilhak, kukla/özerklik, tazminat miktarı ve vadesi, haklar, silahsızlanma, sınır düzenlemesi, ateşkes süresi, tazminat aksaması ve uluslararası garanti. Barış görüşmeleri tüm koalisyon üyelerinin savaş payını, savaş skoru, yorgunluk, güç dengesi ve kendi rejimini gözetir. YZ aynı doğrulama yolunu kullanır.
- Barış **atomik** işlem: mülkiyet, işgal, ordu, sivil nüfus, fabrika, sınırlar, ikmal, savaşlar, borç, tazminat ve anlaşma ilişkileri birlikte güncellenir. Maddeler çelişirse antlaşma hiç uygulanmaz. Ele geçirilen bölgenin muharebe sırasında kontrolü ile kalıcı ilhak arasındaki fark korunur.

## 13. Tarihsel gelişim ve alternatif tarih

- Olaylar tek tarih satırına bağlı zorunlu sonuçlar değil, koşul ve zaman pencereleriyle çalışan dallanmış olay grafıdır. Örnek: 1914 Osmanlı tarafsızlığı seçilirse 'tarih gereği Karadeniz baskını' zorlanmaz; ittifaklar ve olaylar gerekçeli biçimde farklılaşır.
- Olay koşulları: yönetim biçimi, lider, parti, mevcut savaş, gıda, ticaret, bölgesel kontrol, etnik/siyasi hoşnutsuzluk, teknoloji, yeni devlet doğuşu, dış müdahale, ideolojik fikirler ve dünya gerilimi.
- 750/1600'de dönem mantığı korunur. 1939'da savaş zinciri seçenekli sürer. 2026'da modern dünya aktörlerinin **başlangıç tarihindeki** durumları doğrulanır ve ileride kurguya göre değişir.
- Dinamik olaylar tek seferlik veya sınırlı tekrar ve soğuma süresiyle; zamanlı olaylar olay bayrağı ve gerekçe sistemiyle entegre.

## 14. Yapay zekâ, danışman ve komutlar

- Kural tabanlı **stratejik plan**, operasyonel plan ve günlük icra ayrımı. YZ gözlenen veriyle savaş/güç tahmini, bütçe, teknoloji uzmanlaşması, savunma/taarruz, liman ve hava üsleri, parti ve hükümet tepkisi, ittifak, ticaret, ikmal kararlarını verir. Sonuçları değerlendirir, başarısız planı değiştirir, maliyet/risk dengesini korur.
- Oyuncuya bakan ve komutan devirleri üç mod: elle / danışman önerisi / otomatik; otomatik yetki sınırları açık; büyük ilhak ve savaş ilanı oyuncu devretmediyse otomatik olmaz.
- Komutlar bir tek emir, çok adım, politika, koşullu ve kalıcı hedefi destekler. Örnekler: `Ankara'yı 5. şehir seviyesine çıkar`, `İstanbul'a 2 hava üssü kur`, `Kafkasya'ya General X'i ata`, `İkmal %70 olmadan saldırma`, `Fransa'ya Alsas-Loren için barış öner, 500.000 tazminat iste`, `3. filoyu Ege'ye gönder, çıkarma birliklerini koru`, `İstanbul'un azınlık dağılımını göster`, `Bilim bütçesini artır, motorlu araçlara öncelik ver`, `Gelen barış teklifini reddet`.
- Danışman `neden -> kanıt -> belirsizlik -> eylem önerisi -> önizleme` döngüsüyle çalışır. Gizli bilgi vermez; gözlenebilir veri, karşı-olgu ve simülasyon çıkarımı yapar.

## 15. Dikey Android arayüzü

- Android **portre** (`sensorPortrait` veya daha katı `portrait` kararı; README ve gerçek manifest aynı). Harita ana yüzey; üstte özet/KPI, solda açılır yönetim menüsü, altta zaman/aksiyon, menü içinde **Komut** ve **Danışman**. Sağ çekmece mobilde tek alt panel veya tam ekran sekme olarak açılır, harita bölgesi kapanmaz.
- Harita pan/zoom, bölge seçimi, birlik/filo/kanat işaretleme, cephe çizme, komutan atama, projelerin yer seçimi, barış için çoklu toprak seçimi. Dokunma hedefleri yeterince büyük; font/panel ve klavye görünümü portre cihazlarda test edilir.
- Muharebe ayrı ekran: birlik kartları, renk ve ikonlar, güvenli alan, HP/organizasyon/ammo, saldırı animasyonu; harita verisinden bağımsız savaş hesaplaması yapılmaz.
- Bütçe/araştırma/şehir/ordular/deniz-hava/politika/diplomasi/demografi panelleri ve iki ayrı rapor (`Dünya Olayları`, `Devletim`) filtrelenebilir, tarih/neden/sonuç gösterir.

## 16. Zaman atlama, kayıt, sandbox

- 1 gün, 7 gün, 1 takvim ayı, 3 takvim ayı, 6 takvim ayı, sonraki önemli olay. İlerlemenin her adımı günlük motordan; aynı tohum, aynı emir, aynı sonuç hash. Kritik savaş/teklif/ölüm/barış/stratejik olaylarda otomatik durma, kullanıcı tercihiyle sessiz bildirimler.
- Dünya raporu dünya olaylarını; Devletim raporu oyuncu ülkesinin ekonomi, nüfus, siyaset, şehir, bilim, ordu, hava/deniz, istihbarat ve diplomasi değişimini kapsar. Zaman atlamasında önemli olaylar kesilmeden kalıcı kronikte saklanır; UI sayfalama kullanabilir.
- Kayıt, ileri-geri sürüm/şema uyumluğu, kriz sonrası kurtarma, anlık seçim sonrası otomatik kayıt, dünya hash, neden-sonuç izleri. Kayıt bozulursa son sağlıklı nesle döndür.
- Sandbox hızlı/2×/5×/10×/anında araştırma, hızlı inşa, kaynak ekleme/çıkarma ve sınırsız bütçe **sentinel moda** sahip; gerçek hazineye `Infinity`/NaN yazılmaz. Sandbox etkileri ayrı, kayıtlı ve normal oyunlara sızmaz.

## 17. Tekil etki motoru — kural

Her eylem `source -> canonical mutation -> derived system dependency -> delayed event -> report` zincirinde çalışır. Etki kaydı: kimlik, kaynak, etkilenen varlık, ön koşul, doğrudan/bağıl etkiler, gecikme, süre, bitiş, maliyet, risk, görünürlük, tekrar anahtarı. Kanonik güncellemeyi **bir modül** yapar. Etkiler çift uygulanamaz; büyük değişiklikler `Neden?` ekranında açıklanır.

**Örnek 1 (demiryolu):** bağlantı açıldı -> transit kapasitesi/rota değişti -> ticaret sevk süreleri düştü -> fabrikada girdi erişimi iyileşti -> üretim ve gelir koşullu arttı -> iş gücü/kent göçü zaman içinde değişebilir -> saldırı birliklerinin ikmali hızlandı -> rakip ülkeler yalnız bilgi edinirse tepki verdi.

**Örnek 2 (komutan):** tecrübeli komutan atandı -> komuta etkinliği ve karar hızı arttı -> uygun hava desteği/ikmal varsa taarruz katsayısı yükseldi -> çatışma sonuçları değişti -> deneyim/siyasi popülerlik güncellendi -> hükümet ve diplomasi etkilenebilir.

**Örnek 3 (Ar-Ge):** bilim bütçesi arttı -> diğer bütçe kalemlerinden fırsat maliyeti -> uzmanlaşmış araştırma hızlandı -> prototip geliştirildi -> fabrika yeniden donatıldı -> ekipman teslim edildi -> eğitim/ikmal sağlandı -> ordunun pratik gücü ve savaş sonucu değişti.

## 18. Otomatik kabul koşulları ve test kapsamı

Mevcut tüm testleri koru. Yeni test kimlikleri ve senaryolar oluştur. Temel **35** zorunlu test:

T01 göç/nüfus korunum; T02 ayrıntılı kimlik toplamı; T03 askerlik/iş gücü; T04 yaralı/esir/terhis; T05 kitlesel trajedilerin uzun dönem insani/diplomatik maliyeti; T06 ölüm tarihi; T07 tekil kişi; T08 komutan atama; T09 komutan gelişimi; T10 filo konum teklik; T11 hava menzili; T12 hava cephesi; T13 ortak harekâtta çifte kaynak yok; T14 abluka/ithalat/ikmal; T15 istihbarat gizliliği; T16 Ar-Ge yatırımı; T17 1914->1930 seçili 1950 teknoloji atılım olasılığı; T18 araştırma/prototip/üretim/saha ayrımı; T19 tarihsel ekipman; T20 üretim girdisi; T21 bedelsiz fabrika yok; T22 demiryolu/ikmal; T23 antlaşma etkileri; T24 alternatif tarih çatallanması; T25 YZ sis; T26 danışman gerekçe; T27 komut/önizleme/uygulama eşitliği; T28 zaman adım eşdeğerliği; T29 dünya raporu; T30 devlet raporu; T31 sandbox izolasyonu; T32 kayıt geçişi; T33 hash determinism; T34 Android portre ergonomisi; T35 uzun dönem nüfus/kaynak korunum.

**Ek v1.6 kabul testleri:**
- T36 Worker hata yanıtında akışlı Promise kesin reddedilir, bekleyen map temizlenir.
- T37 Eski dünya sürümüyle gönderilen emir reddedilir; başarılı aynı-gün emir hash/sürümü yeniler.
- T38 Olay kararı veya teklif kabul/retinden sonra gün **değişmez**; yeni durum kaydedilir ve UI yenilenir.
- T39 İnşa/araştırma emri gün geçmeden görev listesine girer; üretim ilerlemesi yalnız zaman ilerleyince değişir.
- T40 Şehir seviye 1=>4, 10=>40 slot; demiryolu/sulama/altyapı/imar slot tüketmez; bina maliyetsiz oluşmaz.
- T41 Kontrol edilen toprak ve şehir büyüdükçe komuta kapasitesi artabilir; nüfus/bütçe/ikmal sınırları korunur.
- T42 Gerçek kişi kimliği/rol değişimi tüm paneller ve krizde güncellenir.
- T43 463->787+ harita dönüşümü: kara bağlantıları, nüfus/şehir/ordu/tesis toplamları ve save göçü bozulmaz.
- T44 Deniz/hava rezervasyonları çakışamaz; bağımsız filo/kanat görev/konum/ikmal testleri.
- T45 Şehir savaşı Canvas görünümü kanonik P9 sonuçlarına eşit; görsel devre dışı kalsa hash değişmez.
- T46 Diplomatik bir antlaşmada cession+tazminat atomiktir; bir koşul bozulursa tüm paket geri alınır.
- T47 İstihbarat giderleri negatif hazine oluşturamaz; yakalanma YZ'ye sihirli bilgi vermez.
- T48 A4 benzeri ekran yerine 360×800 ve 412×915 portre Android yerleşimi çalışır.

**Simülasyon süreleri:** 365 gün, 5, 10 ve 25 yıl; ayrı tohumlarla 1914/1939/2026, ortalama ve p95 günlük işlem süresi, Android bellek, deterministik hash, ülke sayısı, savaş yoğunluğu, ekonomi/nüfus sapması ve sahte ücretsiz stok değişimleri. Testler kurulmamışsa 'eksik' yaz.

## 19. Aşamalar, dosya yolları ve teslim ölçütleri

**P0 — Stabilizasyon:** `packages/worker/src/sunucu.ts`, `packages/ui/src/istemci.ts`, `packages/ui/src/eylem.ts`, `packages/worker/src/index.ts`, ilgili testler. Promise, sürüm, anlık uygulama, kayıt, Worker yarış; şema göçü risk değerlendirmesi. Test koşusu olmadan tamamlandı denmez.

**P1 — Harita ve şehir:** `packages/data-compiler/src/harita.ts`, `senaryo.ts`, `packages/engine/src/systems/gelisim.ts`, yeni `city` tabloları; 787+ bölge, şehir seviyesi ve 4 slot, yapı katalogları, altyapı; eski kayıt göçü.

**P2 — Komutan/cephe:** kişi/komutan/karargâh/stratejik emir tabloları; `kara.ts`, `decision/index.ts` ve `ui` plan görünümleri; komutan AI ve muharebe izleri.

**P3 — Hava-deniz:** `deniz.ts`, `us.ts`, filo/kanat SoA tabloları ve deniz bölgesi grafı; çoklu görev, yakıt, cepheye atanma, üs ve tersane.

**P4 — Teknoloji/ekipman:** `donem.ts`, `catalog.ts`, `katalogEk.ts`, `ekonomi.ts`, araştırma/üretim/birim tabloları, teknoloji grafiği, 1914/1939/2026 ekipman doğrulaması.

**P5 — Nüfus/siyaset:** `nufus.ts`, `toplum.ts`, `siyasiKisiler.ts`, gerçek/kurgusal kişi veri tabanı, 5+ partiden dönem/ülke kataloglarına göç, kentleşme/etnik kohortlar.

**P6 — Diplomasi/istihbarat/alternatif olaylar:** `diplomasi.ts`, `emirEk.ts`, `olaylar.ts`, `observe`, `worker/danisman`, dinamik çok maddeli barış ve belirsizlik.

**P7 — UI/Android/komut:** portre ana menü/harita, ayrı muharebe ekranı, 3/6 aylık zaman atlama, iki rapor, yeni emir ayrıştırıcı, danışman.

**P8 — Test/teslim:** 48+ kabul testi, 365g/5y/10y/25y gözlemci, performans, APK workflow, `README.md` ve tek geçerli güncellenmiş şartname.

Her aşama için **geliştirilen dosya listesi, diff, şema göçü, test kimliği, sonuç hash, çalışma süresi, Android doğrulama, açık risk** raporu üret. Orijinal branch'de başarısız denemeyi gizleme; temiz geliştirme dalı ve PR oluştur. Kaynağa erişim/yazma izni yoksa `git apply`/ayrı dosya olarak kaynak üret ve açıkça söyle.

## 20. Nihai teslimler

1. v1.6 tek gerçek şartname; kullanıcının hiçbir isteği sessizce silinmeyecek.
2. Kod dosyaları veya şeffaf uygulanabilir patch/PR.
3. Geriye dönük kayıt göçü ve test/benchmark raporu.
4. 1914, 1939, 2026 tarihsel veri ve oynanış raporları; 750/1600 regresyonları.
5. 787+ yeni bölge haritası ve topoloji veri doğrulama.
6. Aktif hava/deniz, komutan, savaş ekranı, teknoloji ağacı, şehir ve diplomasi oynanabilir gösterimleri.
7. Android portre APK (başarılı workflow ve cihaz testine dayanarak), web debug yapısı ve kurulum talimatı.
8. Kabul matrisi: HER gereksinim `tamamlandı/testlendi/eksik/engelli` ve kanıt bağlantısı.

**Son kontrol:** Yeni özelliklerin hiçbiri bağımsız menü süsü olmasın: teknoloji üretim ve orduya; demografi şehir, iş gücü ve siyasete; komutan cephe/lojistiğe; hava/deniz cephe ve ekonomiye; diplomasi mülkiyet, savaş, toplum ve tarihe; tarihsel aktörler hükümet ve alternatif tarih dallarına bağlansın. Denge, doğruluk, tekil kayıt ve Android hız bütçesi birlikte korunsun.

## 21. v1.5 belge/doğruluk denetimi özel talimatı

`Tarih-Strateji-Oyun-Dosyasi-v1.5.pdf` 7 Kasım 2026, `f7a24b0`, kayıt şeması 7 ve 192 kabul testli bir anlık durumu anlatır; güncel `main` commit'i farklı olabilir. Belgeyi gerçek kodla dosya/fonksiyon bazında yeniden eşleştir. Örneğin v1.5'teki şema 7 donanma, seçim, istihbarat, şehir, kömür/çelik/petrol ticareti ve kültür komutlarını 'yok' diye tekrar yazma; var olanları yeni tablolarla uyumlu olacak şekilde genişlet. Aynı kaynak kod işinin iki kez uygulanmasına engel ol.
