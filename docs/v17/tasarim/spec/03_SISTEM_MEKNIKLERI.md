# 03 — R01–R13 SİSTEM MEKANİKLERİ VE BÜTÜNLEŞİK OYNANIŞ

Bu bölüm tüm isteklerde ortak **oyuncu eylemi → emir → motor etkisi → AI → arayüz → kabul** biçimini kullanır. Sayısal katsayılar denge başlangıç varsayımıdır; tarihsel kesin veri olarak tanıtılmaz. Oyun içi tüm kararlar çevrimdışı ve Türkçedir.

## R01. Diplomasi 2.0 — Teklif değil, karşılıklı söz ve maliyet

**Menü:** İlişkiler / İttifak ve Savunma / Ticaret ve Finans / Kriz ve Ültimatom / Savaş ve Barış / Toprak ve Nüfuz / Gizli Diplomasi / Konferanslar. Ülke kartı bir bakışta ilişki, güvenilirlik, savaş tutumu, aktif antlaşma, ikili tehdit, görünür hedefler, teklif yapabilme gerekçesini gösterir.

**Eylemler:** Elçi gönder, protesto, sınır güvence teklifi, müşterek tatbikat, askerî geçiş, tarafsızlık, borç/kredi, ticaret kotası, ekipman yardım anlaşması, transit garantisi, ittifak, ültimatom, toprak devri, çok maddeli barış, savaş tazminatı, silahsızlandırma şartı, gizli tarafsızlık ve gizli toprak vaadi. Şart koşullu taahhüt: `ifWarWith`, `deliverEquipmentBy`, `transferRegionOnVictory`; süre/ceza açıkça kaydedilir.

**İşlem:** Hazırlanan teklif `draftId`; maddeler `clauseId`; revizyon `revisionNo`. Önizleme toplam bedeli, hukuki/oyun içi uygulanabilirliği, üçüncü ülke tepkisini ve belirsiz kabul değerlendirmesini gösterir. Send -> P3 AI karşı teklif/yanıt; oyuncuya gelen cevap aynı gün anında onaylanabilir. Gizli protokol yalnız taraflarca görülür, ağ sızmasıyla keşfedilebilir; bilinmeyen gizli madde üçüncü taraf AI skoruna giremez.

**Denge:** Ültimatomu sürekli tekrarlamak bedelsiz baskı üretmez: diplomat kapasitesi, güvenilirlik, tekrar cezası, diplomatik yorgunluk. Başarısız gizli söz üçüncü devletlerle uzun vadeli güven kaybı oluşturur. İşgal edilen toprak için barış antlaşması gereksinimleri mevcut savaş skoru kurallarıyla uyumlu. Çoklu barış taslağının bir maddesi geçersizse atomik ret.

**1914 örneği:** Almanya Belçika'nın tarafsızlığını tanıyabilir; buna karşılık batı harekât rotası ve zaman maliyeti değişebilir. İtalya tarafsızlık karşılığında ekonomik teklif veya toprak vaadi müzakere edebilir; vaat yerine getirilmezse yeni siyasi kriz oluşur.

**Done:** UI ve Türkçe komut ikisi de aynı `OfferIntent` üretir; sürüm geri gönderme, onay, ihlal ve gizli görünürlük testleri PASS. Ana dosyalar `systems/diplomasi.ts`, `emirEk.ts`, `decision/index.ts`, `worker/gorunum.ts`.

## R02. İstihbarat 2.0 — Ajans, ağ, keşif, karşı istihbarat

**Yapı:** Ülke `Agency` (dış, askerî, diplomatik, iç/karşı), `Network` (hedef ülke/şehir, güven, erişim, gizlilik, bakım, risk), `Mission` (görev türü ve çözülme günü), `IntelReport` (gözlem günü, aralık, güven ve rapor kaynağı). Ağın yeteneği personel, bütçe, kurum ve araştırmalarla kademeli gelişir; tek komuttan sonsuz bonus elde edilmez.

**Gelişmeler:** Şifreleme/çözümleme, diplomatik ağ, sınırlı hava keşfi, harita analiz personeli, karşı istihbarat ve saha güvenliği. 750/1600/1914/1939/2026 için yetenek adları ve etkileri değişir; modern siber yetenek 1914'e otomatik aktarılmaz.

**Görev menüsü:** Hazine/ordu/teknoloji/ekonomi bilgisi; cephe keşfi; gizli anlaşma hakkında şüphe; karşı istihbarat; soyut siyasi etki; iki ülke arasında görüş zayıflatma; üretim/ulaştırma aksaması; suikast girişimi; hükümet krizini destekleme; iç isyan/direniş üzerinde dolaylı etki. Olası sonuçlar `SUCCESS/PARTIAL/FAIL/EXPOSED/MISATTRIBUTED`. Süre, maliyet, güven ve siyasi/diplomatik tepki olasılıkları ayrı. UI işlemi geri dönülmez diye gösterirse bunu gerçek hazırlık aşamasıyla tutarlı yapmalı.

**Gerçekleşme:** Bir sabotaj bir yerel `Damage` kaydı (tesise/ulaşım kenarına) üretir; onarım süresi, tamir kaynağı, geçici ekonomik kayıp ve olay kaydı hesaplanır. Sonuç yalnız `tahkimat=0` ile sınırlanmaz. Başarılı suikast varsa gerçek `Person` halefiyeti tetikler; kalıcı siyasi kişi henüz oluşturulmamışsa yalnız istikrar olayı yaratılır ve *lider öldü* yazılmaz. İlişki bozma iki devletin görüşünü doğrudan ve garanti olarak `-30` yapmaktan çıkar; kaynak güvenliği ve uluslararası ifşa sonucu çoğunlukla belirsizdir.

**Güvenlik:** Operasyonlar oyuncuya stratejik soyutlukta sunulur; gerçek sabotaj ve suikast teknikleri, hedef listeleri ve yöntemleri hiçbir metne, örnek koda veya olay verisine yazılmaz. Sivil sonuçlar, meşruiyet ve diplomatik bedel görünürdür.

**Done:** Oyuncu/AI gizli bilgiyi yalnız yetkili raporla okur; kalıcı ağlar save/load ile kaybolmaz; sonuç metni gerçek hasar/kayıp ile eşleşir. Ana dosyalar `observe/index.ts`, `emirEk.ts`, `world.ts`.

## R03. Maden, kaynak, kömür, petrol, yakıt ve enerji

**Kaynak zinciri:** yer altı rezervi → çıkarım (cevher) → demiryolu/nehir/deniz taşınması → döküm/rafineri/kimya → üretim hattı → şehir deposu → ticaret veya askerî ikmal. Kaynaklar fiziksel birimle saklanır. Cevher/işlenmiş çelik aynı stok değildir; ham petrol/rafine yakıt da ayrı. Kükürt/nitrat ve kimyasal üretim mühimmat reçetesine, bakır elektrik ve cephane girdilerine bağlanabilir. 1914 için aşırı detaylı 100 ürün yerine 10–15 temel akışla başlanabilir, izleme ve birim tutarlılığı korunur.

**1914 özel:** Kömür özellikle sanayi, demiryolu, buharlı gemiler için temel; ham petrol giderek motorlu araçlar, uçaklar, belirli deniz sınıfları ve kimya için önem kazanır. Motorun `gemiTipi.yakitTuru` katalogu zorunlu: kömürlü gemide petrol yokluğu aynı etkide uygulanmaz. İngiliz deniz lojistiği, Rus demiryolu, Osmanlı sanayi ve petrol erişimi ülke özelinde başlangıç verisine dayanır.

**Kaynak mekaniği:** `ReserveKg` sıfıra indikçe üretim azalır; çıkarım hızı makine/işçi/ulaşım/cevher kalitesinden etkilenir. Jeolojik veri bilinmiyorsa `unverified` kalite etiketi; uydurulmuş sonsuz kömür yok. `daysOfSupply = availableFuel / dailyConsumption` UI'de görünür. Import ve blokaj yalnız fiyatı değil gelen sevkiyatın fiilî varışını etkiler.

**Done:** Rezerv sıfırda maden üretimi sıfır; kömür eksiği uygun gemi ve trenleri; rafine yakıt eksiği uygun araçları etkiler; stok ve WIP negatifleşmez.

## R04. Araştırma, isimli ekipman ve gerçek kullanım

**Aşamalar:** araştırma yuvası / teknoloji yeteneği → model veya lisans açılır → tasarım/prototip (bir örnek veya küçük parti) → üretim hazırlığı (hat dönüşümü) → seri üretim → depo → sevkiyat → birliğin envanteri. Modelin ülkeye ait adı ve alternatif isimleri UI/komut kataloğunda tanınır.

**Örnek (tarih kapılı):** Gewehr 98, SMLE Mk III, MG 08, 7.7 cm FK 96 n.A., 75 mm mle 1897, B.E.2, Etrich Taube; 1915 Fokker E.I, 1916 Mark I, 1917 Renault FT gibi modeller 1914 başlangıç stoku değildir. Alternatif tarihte erken açma için bütçe, teknik ön şart, başarısız prototip, üretim yetkinliği maliyeti gerekir.

**Etkiler:** Silah modeli güvenilirlik, atış gücü, ağırlık, bakım/mühimmat türü ve üretim zorluğuna bağlıdır. Araştırma tamamlandığında ekipman stoku otomatik yükselmez; mevcut ekipmanın modelden gelmeyen eski aile toplamları migration sırasında akıllıca dağıtılır, yeni modele iki kez yazılmaz.

**Done:** Adlı silah üretilebilir, sayılır, taşınır ve birlik savaş değerini etkiler. 750/1600/1939/2026 dönem kapıları test edilir.

## R05. Cephe savaş kararlılığı

**Savaş birimleri:** `Unit`, `Front`, `Operation`, `BattleEvent`; operasyon `PLANNED/ASSEMBLING/PREPARING/ENGAGED/ADVANCING/HALTED/WITHDRAWING/REORGANIZING/COMPLETE/CANCELLED`. Her evrede ön koşul, kaynak tüketimi, otomatik durdurma nedeni ve oyuncuya dönük rapor vardır.

**Hesap:** Cephe genişliği, savunma doktrini, tahkimat, arazi, ikmal, yorgunluk, moral, komutan deneyimi, topçu/mühimmat, keşif, hava desteği. Önce `battleContext` yalnız bir defa oluşturulur, muharebe motoru bir kesin sonuç verir. Canvas replay bunu görselleştirir; yeniden RNG çekmez. Savaş esnasında emir değişirse etki takvim ve yeniden organizasyon süresiyle olur.

**1914 denge:** Almanya'nın 1915 erken gerilemesi keyfî bonusla düzeltilmez. Rus seferberlik takvimi, Almanya'nın iki cephe kuvvet tahsisi, Belçika ikmal rotaları, Fransız birlikleri ve Avusturya-Macaristan savaş yükü ayrı duyarlılık testlerinden geçer. Sonuç çeşitliliği korunur; her tohumda aynı tarihsel teslim şart değildir.

**Done:** Sıfır ikmalle sınırsız saldırı yok; çift muharebe yok; birlik yoktan doğup silinmez; `Neden?` ana beş sebebi gösterir.

## R06. Komutan atama ve karargâh

**Mevcut:** `komutanAta`, kalıcı KM, kapasite, saldırı/savunma ve ikmal bonusu, komutan emirleri. **Yeniden yazmak yasak.** Birlik kartından `Komutan ata/değiştir/ayır` kısa yolu; uygun aday listesi. Kolordu/ordu/cephe karargâhı opsiyonel üst seviye; doğrudan birlik komutanının etkisiyle üst karargâh bonusu aynı özellikte iki kez eklenmemeli. `commandCap` ve komuta menzili.

**Atama:** aktif kişi, ülke, tarih, rütbe/branş, komuta yükü, görev çatışması; atama anlık kaydedilir, fiziksel devir gerekli ise bekleme etkisi. Komutan ölür/ayrılırsa birliğin ID'si korunur ve vekil komuta sonucu üretilir. Donanma amirali/hava komutanı ile kara hiyerarşisi aynı rol katalogunda ama ayrı uygunluk koşulları.

**Done:** `komutanAta` ve doğrudan birlik kartı aynı emir nesnesi; aşırı yükte etkisi seyrelir; kayıt ve replay korunur.

## R07. Bakanlık, siyasi kişi ve kararın gerçek devlet etkisi

**Yapı:** Ülkeye/döneme uygun kurum kataloğu; Bakanlık kurma/kaldırma, Bakan ata/görevden al, bütçe belirle, hedef politika seç, yetki devret, müsteşar/vekâlet ataması. Her 1914 ülkesinde aynı modern bakanlıklar otomatik açılmaz. Ekonomi/araştırma/üretim/ordu/inşa `BAKAN` bit maskesi mevcut delege otomasyonuna bağlanır. Yeni `Ministry` ve `Appointment` aktif kişi kaydı eklenir.

**Personel:** Ad, doğum/görev dönemi, uzmanlık (1–10), ideoloji, sadakat, itibarı, geçmiş makam, reform eğilimi, yetkinlik; tarihî olmayan alternatif kişi `fictional` etiketi. Bakan başarı bonusları üstten sınırlı, görevden almanın siyasi maliyeti var. Siyasi kişiler komutanlarla aynı genel kişi sözleşmesine sahip olabilir; bir kişi gereksizce iki kez oluşmaz.

**Örnek:** Harbiye bütçesi kurmay yetiştirmeyi ve seferberliği; Ulaştırma bütçesi tren/onarımı; Maliye bütçesi vergi tahsilini etkiler. Bakanın etkisi kurum kapasitesine bağımlıdır, maaş/kurumsal işgücü yoksa mükemmel kişi bile anında mucize yaratmaz.

**Done:** `bakanAta` kadro değişikliği ülke karar sistemini ve maliyetleri gerçekten etkiler; hükümet düşerse kabine değişir; UI ve `Neden?` sonuçları doğru.

## R08. Türlü ve isimli sivil/askerî sanayi

**Sivil:** tarım/gıda işleme, tekstil, kömür, demir cevheri, petrol, rafineri, çelik, bakır/metal, kimya, makine, elektrik, demiryolu atölyesi, inşaat, sivil tersane. **Askerî:** hafif silah, makineli tüfek, küçük/büyük mühimmat, top döküm, askerî araç, uçak gövde/motor, gemi yapımı, denizaltı, bakım/onarım. Her tesisin `type`, `capacity`, `workforce`, `machineTime`, `energyType`, `lines`, `damage`, `slotCost`, `cityId`, `displayName`, `confidence` alanları vardır.

**Göç:** mevcut şehir sivil/askerî sayıları ve ulusal HT hatları kaybolmaz. Tesis ve hat dağıtımı deterministic kural ve ülke/bölge indeksine göre yapılır. 1 eski fabrika bir tesis seviyesine çevrilebilir; ancak *tarihsel fabrika adı veya kapasitesi doğrulanmadan* gerçek tesis sayısına eşitlenmez. Sivil/askerî dönüşüm zamanı ve yeniden takım maliyeti taşır.

**Done:** Oyuncu şehir panelinde gerçek tür ve isim görür, hattını yönetir; tek tesis aynı anda kapasitesini aşamaz.

## R09. Şehir komuta merkezi

**Dikey ekran düzeni:** Haritada şehre/bölgeye dokun → özet kart (nüfus, huzur, kaynak açığı, tesis, depo, garnizon, ulaşım, olay). İlk satır dört sekme: **Genel / Ekonomi / Askerî / Yönetim**; alt sekmeler bağlamsal. Genel: krizler, hedefler, tarihçe; Ekonomi: fabrika-maden-üretim, inşaat, depo/ticaret; Askerî: garnizon, birlik, komutan, istihkâm, ikmal, üs/liman; Yönetim: vergi, kamu düzeni, valilik, bakanlık etkileri, diplomasi/istihbarat raporu (izinli).

**Komut paritesi:** Her kartta eylem `onizle()` ile önce maliyet/sonuç/ETA gösterir; eşdeğer Türkçe komut vardır. Seçili şehir ve bölgenin ayrımı açıkça yazılır. `cityId` ile `regionId` farklı ID kategorisi; mevcut `R.kent` bölge düzeyine ait olabilir, ilk aşamada her bölge bir ana şehir alır.

**UI sınırı:** 360×800 hedefinde klavye açıkken eylemler gizlenmez; alt çekmece kayar, erişilebilir buton alanı/odak ve Android geri tuşu çalışır. UI hiçbir zaman doğrudan `World` değiştirmez.

## R10. Üretim miktarı ve seri üretim

**Fiziksel kapasite:**

```
machineLimit = floor(availableMachineMinutes / unitMachineMinutes)
laborLimit = floor(availableLaborMinutes / unitLaborMinutes)
energyLimit = floor(availableEnergy / energyPerUnit)
inputLimit = min(each floor(availableInput / recipeInputPerUnit))
grossUnits = min(machineLimit,laborLimit,energyLimit,inputLimit)
completed = floor((grossUnits × productivityFixed)/S + carryWorkInProgress)
```

`completed` yalnız doğru miktarda girdi gerçekten tüketildikten sonra depoya girer. Üretim için kesirli iş/kalite varsa `WIP` fiziksel tamamlanmamış iş ve kalıntıyı saklar. Ürün başına iş/zaman birimleri tek ve açık. Verimlilik 0–100% için hangi aşamada uygulandığı sabitlenir (iki kez bonus yasak). Bir tesis yüksek kapasiteyle aylık 1.000 tüfekten çok üretebilir; ama **her fabrika için tek evrensel sayı belirlenmez**. Tarihsel örnekler fabrika büyüklüğü/işgücü/tarih koşuluyla kalibre edilir.

**Üretim ekranı:** Günde/ayda tahmini gerçek adet, hat verimi, işçi, makine, çelik, enerji, stok günleri, üretimi kısıtlayan ilk üç neden; karşılaştırmalı `önce/sonra` seri üretim araştırması.

**Done:** Seri üretim bonusu işçi/çelik sıfırken çıktı yaratmaz; stok ve tüketim ledger toplamları eşleşir; sıfır makineli hat üretmez.

## R11. Gerçekçi şehirler arası hareket ve lojistik

**Eylem:** Birliği veya orduyu seç → hareket/taarruz hedefi → rota önizlemesi (km, ikmal, yükleme, tahmini gün, risk). Oyuncu `yaya`, `demiryolu` (uygunsa), `deniz taşıması` kiplerini seçebilir; AI aynı maliyet hesabını kullanır.

**Mekanizma:** Rota katmanları var olan bölge komşuluğunu korur; yeni `TransportEdge` topolojisi ayrı katmandır. Birden çok kenar aynı oyun gününde kat edilebilir ve kalan gün bir sonraki kenara taşınır; muharebe ve geçiş hakkı her kenarda denetlenir. Demiryolu kapasitesi işgal, köprü, istasyon, askerî/sivil talep ve aktarmalardan etkilenir. `tahminiGun()` ile `hareketGunu()` aynı saf kenar geçiş/mesafe hesabını kullanmalı.

**Done:** 50 + 50 km iki komşu kenarda 150 km/gün barış dönemi birlik bir gün içinde tamamlayabilir; düşman savunması var ise bunu atlayamaz; ray doluysa bekler veya alternatife geçer.

## R12. Orduya taktik değil, büyük strateji emirleri

**Emir menüsü:** Taarruz; Savunma; Cepheyi tut; Yarma; Kuşatma/kanat çevir; Karşı taarruz; İhtiyat; Yeniden organize ol; Geri çekil; Garnizon; Bölgeyi sükûnete kavuştur; İsyanı bastır; Demiryolu koru; Liman/konvoyu koru; Keşif; Seferberlik.

Her emir tek `Operation` planı açar ve alt emirleri varlığa bağlar; operasyona gerekli koşullar (`front`, `minAmmo`, `minSupply`, `reserve`, `target`, `commander`, `cooldown`) girer. Oyuncu planı iptal edince kaynak rezervleri çözülür, fiziksel harcanmış malzeme geri gelmez. Sivil güvenlik eylemleri sivil nüfusu otomatik askerî hedef yapmaz; hukuk/meşruiyet/direniş ve ekonomik maliyetler gösterilir.

**AI:** stratejik hedef → operasyon düzeyi karar → birliklere dağıtım. Her birliğe her gün rastgele yeni hedef verme yok; yeni olay ve seferberlik/cephe koşulu sonrası plan güncellenir.

**Done:** Çakışan emir üst üste binmez, kalıcı emir ve komutan duruşu tutarlı; önizleme ETA ve risk; AI aynı doğrulayıcıdan geçer.

## R13. Deniz ve hava kuvvetleri 2.0

**Mevcut:** ülke toplamından bağımsız `FL` filo ve `KN` hava kanadı, görevler, menzil/üs/seyir, bakım/hava desteği. **Silinmeyecek.**

**Yeni katman:** adlandırılmış deniz alanları ve limanlar; filo grubu (amiral, görev, geçerli liman, yakıt tipi, seyir rotası, onarım); hava kanadı grubu (üs, kapasite, sortiler, yorgunluk, menzil, hava durumu, personel); ticaret konvoyu/askerî nakliye ortak taşıma bütçesi; çıkarma operasyonu; kıyı topçu desteği. Gemi siparişi tersane kızak/bileşen/ekipman üretimiyle gerçekleşir.

**Dönem:** 1914'te kıyı ve deniz keşif/erken avcı görevleri sınırlı; 1939 hava üstünlüğü ve bombalama belirgin, 2026 radar/füze farklı. Kömürlü filo yakıt tüketimi petrol talebine bağlanmaz; sınıf başına yakıt tüketimi.

**Done:** Aynı gemi iki filoda yok, aynı kanat iki görevde yok; kısmi üs yakıtında operasyon kapasitesi azalır; limandaki filo denizde muharebeye yazılmaz; amfibi harekât nakliye kapasitesi olmadan çalışmaz.

---

## G01–G05. Bütün mekanikleri birleştiren 1914 stratejik oynanış

**G01 Ulusal hedef:** her devlet 3–5 aday; `historical`, `revisionist`, `economic`, `survival`, `neutrality` kategorileri. Hedefler tek tarih sonucuna kilitlenmez; görünür ilerleme ve risk/maliyet taşır; hedef iptal ve değiştirme bedeli vardır.

**G02 Olaylar:** tarih penceresi + bayrak/savaş/egemenlik/ilişki/yorgunluk/ekonomi ön koşulu. Tarih geldi diye devlet savaşa sokulmaz; alternatif cevap dalları vardır. Olayın seçeneği `emitCommand`/`applyModifier`/`scheduleNextEvent` olarak tasarlanır ve mevcut emir doğrulamasından kaçmaz.

**G03 Stratejik plan:** kullanıcı `Fransa'yı sınırda tut; Belçika'ya girme` gibi amaç söyler → danışman plan taslağı ve bağımlılıkları verir → aynı anda karşılıklı çelişen operasyonları uyarır → onaylanan plan alt emirleri P2'ye taşır. Planın geri planlaması gerekir.

**G04 Devlet AI:** ülkeye özgü çıkar/fırsat/risk/karar yeteneği; rakip hakkında yalnız bilinen bilgi; tarihsel karakter tercihlerini *eğilim* olarak görür, zorunlu tarih yolu değildir. AI hedef değişiminde 7–30 gün histerezis; acil seferberlik ayrı.

**G05 Hedef/oyun sonu:** serbest sandbox dışında ülke hedefleri, puan (güvenlik/refah/diplomasi/teknoloji/toprak); zafer, stratejik kayıp, rejim değişikliği ve savaş sonrası devam seçenekleri. `Kronik` oyuncunun seçimlerini olay metni + veri olarak anlatır, gerçek tarih diye sunmaz. İlk 15 dakika 1914 seçilebilir küçük ülke, önerilen üç hareket ve varsayılan eğitim modu.

**Entegrasyon testi:** Aynı ülke diplomatik tarafsızlık hedefi seçince AI seferberlik/doğrudan saldırı planını gözden geçirebilmeli, yeni sözleşmeler ve askerî lojistik hesapları değişmeli, AI aynı anda tarafsızlık anlaşmasını imzalayıp saldırı başlatmamalı.
