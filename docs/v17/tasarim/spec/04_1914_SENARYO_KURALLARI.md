# 04 — 1914 KAMPANYASI: DİNAMİK DEVLET HEDEFLERİ, KRİZLER, ALTERNATİF TARİH

**Başlangıç:** 28 Haziran 1914. Mevcut `packages/data-compiler/src/senaryolar/s1914.ts` esas alınır; olaylar silinmez, doğrulanmış mevcut zincir yeni ulusal hedef ve diplomasi kurallarına uyarlanır. Katalog JSON dosyaları başlangıç tasarımıdır, oyunun halihazırdaki derleyicisine doğrudan yapıştırılamaz. Adaptör gereklidir.

## 1. Oynanışta amaçlanan farklılık

Bir devlet **sadece tarihî düşmanına savaş açmayı** istemez. Aynı anda güvenlik, itibar, toprak ve nüfuz, sanayileşme, ittifak güveni, siyasi istikrar, diplomatik serbestlik hedeflerine sahip olabilir. Oyun bir amaca ulaşmanın çoklu yolunu sağlamalı: savaşa girmek, tehdit altında kalmak, kısmi taviz, ekonomik yatırım, ittifakı yeniden kurmak, barış konferansı, tarafsızlık ve anayasal/siyasi reform.

**Ülke hedefi beş alan içerir:** (1) gerekçeli amaç, (2) etkinleşme koşulları, (3) ölçülebilir başarı ve aşamalar, (4) karşıt hedef/oyuncu tercihleri, (5) maliyet ve kayıp halinde yeniden plan. Dinamik skor aynı bilgi seviyesiyle oyuncu/AI için uygulanır, ancak AI rakip gizli devrelerini doğrudan bilmez.

## 2. Ülkelere özel stratejik hedef örnekleri

| Ülke | Güvenlik ve diplomasi | Ekonomi/ordu | Alternatif tarih amacı |
|---|---|---|---|
| Almanya (`GER`) | Fransa–Rusya iki cephe baskısını yönet, Britanya'yla savaşı sınırlama | Ren sanayi/Prusya demiryolu, cephe ikmali, deniz/abluka | Belçika tarafsızlığını koruyarak farklı batı stratejisi; Rusya'yla ayrı barış |
| Fransa (`FRA`) | sınır güvenliği, Rus ittifak güveni | topçu ve demiryolu seferberliği | Alsas-Loren iddiasında diplomatik çözüm veya ihtilafı yönetme |
| Britanya (`GBR`) | Belçika garantisi ve kıta dengesi, donanma güvenliği | abluka/konvoy/asker gönderme bütçesi | silahlı tarafsızlık veya arabuluculuk, maliyetli alternatif |
| Rusya (`RUS`) | Sırbistan'ı destekleme riski, sınır güvenliği | seferberlik/demiryolu, gıda ve siyasal istikrar | diplomatik yatıştırma ve iç reform ya da erken savaş |
| Avusturya-Macaristan (`AUH`) | Sırbistan krizi ve çok uluslu monarşi | iki cephe kuvvet ve kamu düzeni | taleplerde geri adım/reform, savaş dışı anlaşma |
| Osmanlı (`OSM`) | Boğazların güvenliği, Avrupa bloklarıyla ilişkiler | borç, demiryolu, ordu modernizasyonu, donanma | uzun tarafsızlık, İtilaf'la anlaşma, Almanya'yla koşullu ittifak |
| Sırbistan (`SRB`) | bağımsızlığı ve bölgesel güvenlik | lojistik ve seferberlik | Avusturya taleplerinin bir bölümünü kabul edip krizi sınırlama |
| Belçika (`BEL`) | egemenlik/garanti | savunma, tahkimat | güvence ve geçiş müzakeresi, savaş dışı çözüm |
| İtalya (`ITA`) | ittifak sözleşmeleri, tarafsızlık pazarlığı | kuzey sanayi, seferberlik | farklı blok, koşullu tarafsızlık, toprak/ekonomi pazarlığı |
| Bulgaristan (`BUL`) | Balkan sınırları, bölgesel denge | askeri ikmal | tarafsızlık, karşılıklı bölgesel anlaşma veya savaşa katılım |
| Romanya (`ROM`) | Transilvanya/Besarabya çıkarlarının dengesi | petrol ihracatı, seferberlik | savaş dışı ekonomi/güvenlik garantisi veya blok tercihi |
| Japonya (`JAP`) | Pasifik çıkarları, Britanya bağı | donanma ve ticaret | savaş dışı garanti, sınırlı müdahale, bölgesel pazarlık |
| ABD (`USA`) | tarafsız ticaret/deniz güvenliği | sanayi, ihracat, siyasi destek | savaş dışı kalma, arabuluculuk veya koşullu müdahale |
| Yunanistan (`GRE`) | bölgesel denge, tarafsızlık | donanma/limanlar | farklı yönetim ve blok tercihi |
| Hollanda (`NLD`) | tarafsızlık/liman ticareti | ticaret ve deniz güzergâhı | iki blokla ilişkileri dengede tutma |
| İsveç (`SWE`) | tarafsızlık ve Baltık güvenliği | demir cevheri/taşıma | tarafsız sanayi gücü, farklı ticaret dengesi |

**Dikkat:** Hedefler *oyun stratejisi önerileri*dir; örnek JSON'daki statü `design_proposal`. Her ülkenin tarihî lider, devlet ideolojisi, bölge/teklif tutarlılığı ayrıca kontrol edilir. Çıktı mutlak sınır kazanımı/teslim tarihi hedeflemez.

## 3. Teknik hedef şeması

```
NationalGoal {
 id: string; country: CountryCode; category: GoalCategory; titleTr: string;
 priorityWeight: int; earliestDay: date; expirationDay?: date;
 activation: Predicate[]; success: Predicate[]; fail?: Predicate[];
 alternatePaths: {id: string; titleTr: string; actionTags: string[]; costs: string[]}[];
 aiHints: {aggressiveness?: int; diplomaticRisk?: int; preferNeutrality?: int};
 stages: {id: string; progressMetric: string; completionThreshold: int}[];
 rewardTags: string[]; tradeoffTags: string[]; sourceStatus: 'historical_anchor'|'calibration'|'fictional';
}
```

Hedef `progress` gerçek dünya durumundan türetilmeli; saklanan ilerleme sadece olay gibi yeniden türetilemeyen güvenli işaret taşıyabilir. Örneğin “Belçika tarafsızlığı” yalnız ülke görüş puanı değil, `warWithGER` ve `militaryAccess`, ihlal ve garantör tepkileri gibi somut olaylarla ölçülür.

**Hedef seçim kuralı:** İlk gün devlet 2–4 hedef önerir; AI aynı anda bütçe/ordu kapasitesini aşan üç büyük savaşı hedefleyemez. Ana hedef kilitlenmez; değişikliğin kaynak ve itibar bedeli olur. Her 30 günde / acil olay sonrası hedef skoru yeniden hesaplanır. Tekrarlı karar oscillation için 15 gün asgari histerezis önerisi.

## 4. Olay ağı türleri

- **Kriz:** diplomatik teklif, ültimatom, cevap, garanti, seferberlik veya savaş.
- **Topyekûn savaş/sanayi:** mühimmat talebi, devlet kredisi, işgücü ve demiryolu kıtlığı.
- **Siyasi:** hükümet istifası, kabine değişimi, savaş yorgunluğu, diplomatik krizin iç siyasi bedeli.
- **Askerî:** Belçika rotası, Marne benzeri cephe kırılması *yalnız koşul ve savaş konumları sağlanırsa*, Rus seferberlik/ikmal zorlanması, Çanakkale girişimi, İtalya/Balkan katılımı.
- **Barış ve alternatif:** ayrı barış, garantili tarafsızlık, koalisyon konferansı, savaş sonrası nüfuz pazarlığı.

`veri/1914_olay_aglari.json` 1914 kriz/1915–1917 koşullu tetikleme adayları içerir. `preconditions` dizisi `ALL` semantiğine sahiptir; alternatifler `ANY` mantığı için alt yüklem grubu gerektirir. Tarih penceresi tek başına olayı açmaz. Ülkenin hayatta olması, egemenlik, savaş tarafları, mevcut teklif/ittifak, hatta cephe varlığı kontrol edilir. **Tarihsel bir olayın karşıtı başarılı olduysa aynı olay sonra tekrar zorlanmaz.**

## 5. Çelişki ve bilgi düzeyi kontrolü

- Osmanlı kesin tarafsızlık anlaşması imzaladıysa Karadeniz baskını *koşulu sağlanmadıkça* tetiklenmez.
- Belçika hiç işgal edilmediyse İngiliz savaş ilanı yalnız Belçika tetikleyicisine bağlanmaz; başka meşru/oyun içi nedenlerle savaş kararı mümkün olabilir.
- Almanya/Fransa arasında barış varsa “Marne cephesi” adlı savaş olayı gerçek cephe/kuvvet olmadan çıkmaz.
- Rus hükümeti tamamen başka rejime dönüşmüşse 1917 devrim şablonu zorunlu çalışmaz; iç siyasi krize uygun alternatif olay olabilir.
- İtalya bir ittifakla savaşa girdiyse karşı bloktan gizli teklif otomatik kabul edilmez; mevcut taahhüt ve ihlal maliyeti devreye girer.
- Osmanlı tarafsızsa Çanakkale çıkarma harekâtı otomatik başlamaz.
- Sanayi ve teknoloji gelişimi tarihsel ekipmanı mecburen aynı yılda üretmez; erken/alternatif teknolojinin maliyeti gösterilir.

## 6. Kurgusal veri güvenlik ve kaynak etiketleri

Her hedef ve olay için `provenance` alanı zorunlu: `sourceStatus`, `notes`, `lastVerifiedDate`, `sourceIds`. Tarihî adı/metni kaynaksız yeni bir gerçek olarak sunma. Tarihsel olayın **başlangıç/karar penceresi** doğrulanabilir; oyuncunun alternatif seçeneği `fictional_counterfactual` olarak kaydedilir.

Çelişkili veri kuralı: `historicDefault` oyun içinde ağırlık olabilir, **kesin karar** olamaz. AI tek tarihî yolu zorunlu izlememeli. Olayların oyuncuya baskı maliyeti gösterebilmesi için kaynağı `countryGoal`, `regime`, `economy`, `military` veya `international` alanları olmalıdır.

## 7. Kabul senaryoları

**SC-01 Belçika:** Alman AI 12 tohumda Belçika'ya girme ve girmeme stratejisi ön koşullara göre seçebilmeli; birinin mutlaka çıkması gerekmiyor, ama karşıt yollar veriyle temsil edilmeli ve manuel seçim sonucu farklı olmalı.

**SC-02 Osmanlı:** Savaşa katılma/uzun tarafsızlık/diğer blokla yakınlaşma yolları mümkün, birini seçince çatışan tarihsel olaylar durmalı.

**SC-03 İtalya:** Karşılıklı gizli vaatler, ifşa, tarafsızlık, savaşa giriş kararı; karar öncesinde başka devlet AI'sı gizli içeriği bilemez.

**SC-04 Rusya:** Demiryolu/seferberlik kapasitesi stratejik savaş planını etkiler; tarihi kalıp ile fiili süre farklıysa görünür `Neden?` açıklaması verilir.

**SC-05 Sırbistan/AUH:** Ültimatom ve kısmi kabul farklı sonuçlara açık; otomatik savaş komutu yalnız koşullu.

**SC-06 İngiltere:** Donanma/abluka ve kara ordusu gönderme kararı liman/konvoy/ikmal ve kabine desteği ile bağlantılı.

**SC-07 Genel:** 62 devletin hepsi oynanabilir kalır; kataloğu bulunmayan devletler dönem/diplomasi konumuna göre düşük riskli nötr hedef önerileri alır (korunma, sanayi, ticaret). Hiçbiri zorunlu 1914 savaşına çekilmez.
