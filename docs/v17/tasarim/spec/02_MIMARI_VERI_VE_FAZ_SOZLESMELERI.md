# 02 — MİMARİ, VERİ, FAZ VE EMİR SÖZLEŞMELERİ

**Çerçeve:** v1.6.1 `ccr-949a01d1-3lmfyg` SHA `9f3694c9af1afae86aa16771bcc5ed458058ee05`. Aşağıdakiler uygulama sözleşmesi ve önerilen veri tipi adlarıdır; mevcut tip adlarıyla eşleştirilmesi kodlama aşamasında yapılır. SoA `Table` yapısı, `S=1_000_000`, güvenli tamsayı, nesil kimliği (gen × 2²⁰ + slot), tek yazıcı Worker, kanonik hash ve `P0–P12` korunur.

## A. Çekirdek tasarım ve kimlikler

1. **Kimlik alanı:** Tüm yeni tablolara `id` nesil-yuva üzerinden verilir, silinmiş kimlik yeniden kullanıldığında yeni nesil alır; içindeki dış anahtarlar `Table.resolve(id)` ile doğrulanır. Ülke/bölge başlangıç statik indeksleri ayrı kategoridir; `0` gerçek kimlik olabileceği için yokluğu `-1` veya açık `nullable` ile kodlanır.
2. **Tek doğru veri:** Canlı stok için tek `StockAccount`, birliğin teçhizat/stokunda tek `EquipmentInventory`, antlaşmanın sürümünde tek `TreatyRevision`, siyasi koltukta tek `Appointment` kanonik olmalı. Ülke toplamları yalnız ayna/türetilmiş; bütünlükte hesapla.
3. **Seyrek:** Her şehir her ürünü, her ülke her ajanı ve her maden tüm türleri taşımaz. Varlığı olmayan tablo satırı oluşturulmaz. Katalog referansları salt okunur ve versiyonludur.
4. **Kaynak türü/birim:** `ITEM_COUNT` tam adet; `MASS_KG` kilogram; `ENERGY_MJ` ölçekli enerji birimi; `MONEY_MILLI` mevcut altın/hazine ölçeğiyle uyumlu; `LABOR_MIN` işçi-dakika; `MACHINE_MIN` makine-dakika; `FUEL_KG` kilogram. İç hesap SI tam tamsayı ve sabit noktadır. Eski mal/sanayi puanları göçte referans tablolarıyla dönüşür; oyunun nüfus/altın değişimi için tek bir dönüşüm sözleşmesi gerekir.
5. **Birim türü–model:** `equipmentFamilyId` mevcut 8 ekipman ailesine geriye dönük uyumludur; `equipmentModelId` yeni somut üründür. Model kapısı (ülke, yıl, lisans, AR-GE, sanayi hazırlığı), aile istatistik etkileri ve mühimmat/kalibre ayrımı korunur.
6. **Durum/davranış ayrımı:** `world.ts` tablosu durum tutar; `systems/*` saf/yarı-saf kurallar içerir; `orders.ts` niyet doğrular; `decision/index.ts` önizlemeye/uygulamaya emir geçirir; `worker/gorunum.ts` yetkili görünür veri üretir; UI yalnız emir ve görünüm kullanır. `command/index.ts` için geri çözülen Türkçe eşdeğer metin zorunlu.

## B. Yeni tablolar ve kritik sütunlar

| Tablo | Kritik sütunlar | Eski ilişki | Zorunlu invariant |
|---|---|---|---|
| `City` | `regionId, ownerId, nameIndex, kind, cityLevel, populationShareFixed, railNodeId, portNodeId` | `R.kent` ile aşamalı göç | şehir bir bölgede, yaşamayan bölgeye bağlı değil |
| `Deposit` | `cityId/regionId, resourceId, originalReserveKg, remainingKg, gradeFixed, accessibleFixed, mineLevel` | `R.maden`, `pkg.bolgeler[].celik/komur/petrol` | `0≤remaining≤original`, çıkarım rezervden düşer |
| `Facility` | `cityId, ownerId, industryClassId, capacityMachineMin, workforce, powerTypeId, healthFixed, active, slotCost` | `R.sivilF/askeriF` | kurulu kapasite ve slot toplamı uyumlu |
| `ProductionLine` | `facilityId, equipmentModelId, allocationFixed, efficiencyFixed, wipFixed, toolChangeUntilDay, queuePriority` | `HT` | hat yalnız var olan tesis/ürüne bağlı, ayrılan kapasite ≤ tesis |
| `StockAccount` | `locationType, locationId, resourceOrEquipmentId, quantityInteger, reservedInteger, maxCapacityInteger` | ülke `C.celik/komur/petrol/muhimmat`, `w.ekip` | fiziksel stok `≥0`; rezerv `≤stok`; tüketim tek yerde |
| `LedgerTx` | `day, phase, sequenceId, sourceAccountId, targetAccountId, assetId, amount, kind` | yeni işlemler | taşıma/üretim/sarf kaydı eksik çift giriş üretmez; kanonik journal sınırlı |
| `EquipmentModel` | `familyId, nameIndex, eraMinYear, countryMask, techIds, license, recipeId, ammoTypeId, statsFixed` | katalog `EKIPMAN` | bir model bir aileye bağlı; tarihten önce başlangıç envanterine girmez |
| `TransportEdge` | `fromNode, toNode, edgeType, lengthMeter, sharedCapacityKgDay, accessTag, epoch` | `komsuluk`, `kenarKm`, `demiryolu` | mesafe pozitif, erişim dinamik, aşırı rezerv yok |
| `MoveState` | `unitId, routeId, edgeIndex, progressMeter, transportMode, capacityBookingId, haltedReason, lastProcessedDay` | `U.bolge/hedef/sonraki/ilerleme` | iki konum/iki ilerleme yok, aynı gün çift işlem yok |
| `Front/Operation` | `ownerId, goalId, targetRegionId, stance, stage, commanderId, reserveIds, startDay, lastReviewDay` | `U.durus`, `U.hedef` | birlik bir aktif harekâta bağlı, seçili savaş hedefi geçerli |
| `Person` | `countryId, historicIdOrGenerated, roleMask, birthYear, endYear, ideology, attributes, active` | `KM`, `siyasiKisiler` | aynı tarihî kişinin ikilisi yok, görev tarihi ve kişi kimliği tutarlı |
| `Ministry/Appointment` | `countryId, typeId, establishedDay, budgetFixed, ministerPersonId, actingPersonId, policyId, startDay, endDay` | `C.bakan` | koltuk aynı tarih aralığında yetkisiz iki aktif atama taşımaz |
| `Agency/Network/OperationIntel` | `countryId, targetId, capability, secrecy, exposure, phase, expectedResolveDay, reportId` | `IR`, `observe`, eski operasyon emirleri | hiç ağ yoksa ağ etkisi yok; ifşa gizlilikten ayrı olay |
| `TreatyDraft/Revision/Clause/Commitment` | `parties, draftId, revisionNo, status, clauseType, visibilityMask, dueDay, breached` | `TK/AN`, `teklifBolge` | tek revizyon ACTIVE; gizli madde yetkisiz görünmez |
| `NationalGoal/StrategicPlan` | `ownerId, goalType, stage, status, progressFixed, priority, deadlineDay, guardData, targetIds, parentId` | `C.hedefUlke`, olay bayrakları | hedefin ilerlemesi gerçek durumdan türetilir; sonuç zorunlu değil |

**Tasarım kararı:** İleri düzey ürün ve kaynak modelleri bir anda 179 ülkenin bütün kayıtlarını çoğaltmamalı. Ülke toplamları geçiş boyunca eski arayüzde gösterilebilir ama önce yeni ledgere **türetilmiş ayna** olarak hesaplanır; hem eski toplam hem yeni alt hesap aynı gün ayrı ayrı tüketilmez.

## C. Mevcut motorun doğrulanmış gerçek günlük fazları

`packages/engine/src/phases/index.ts` kaynak kodundan:

| Faz | Mevcut sıralama | Yeni mantığın bağlanması |
|---|---|---|
| P0 | Dünya günü artar; bildirim temizlenir | Açık operasyon/taahhütlerin yalnız durum damgası |
| P1 | Ayın 1'inde nüfus/iş/ekonomi/kontrol/siyaset/diplomasi/olay/komutan/istihbarat; yıllık kent | Kabine aylık maliyet, kurum eğitimi, uzun dönem hedef gözden geçirme; önceki ay bütçe kapanışı |
| P2 | Kuyruktaki emirler → AI kararları → komutan daimî emir → filo/kanat hareket | Aktif plan emirleri ve AI; idempotency/manuel öncelik koruması |
| P3 | Diplomatik cevaplar/gerekçe, mod temizliği, deniz üstünlüğü, haftalık deniz/hava/çöküş/demografi | Sürümlü teklif/karşı teklif yanıtları, hazır operasyon çözümü (etki tarihi açık), gizlilik; askeri görevlerin durum kontrolü |
| P4 | Varışlar | Hedef konuma fiziksel stok teslim; sevkiyat muhasebesi ve iki kez varış engeli |
| P5–P6 | İş ölçümü, gıda, sanayi, araştırma, lojistik | Depozit/çıkartma → yerel işleme → üretim/hat → korumalı depo → talep tahsis/transit |
| P7 | Maliye, birlik tüketimi, pazar, yaralı | Yakıt/bakım, fiilî harcama, zararı ve stok çıkışı tek muhasebe |
| P8–P10 | Hareket → muharebe → sonuç/geri çekilme | Çok kenarlı hareket, operasyon durumu, karşılaşma/tekil muharebe kaydı; AI emirleriyle durum kilidi |
| P11 | Olaylar ve durdurma koşulları | Hedef başarı/kriz olayları, söz ihlali, istihbarat sonrası diplomatik geri tepme; *önceki fazlarda gerçekleşmiş üretimi geriye dönük değiştirmez* |
| P12 | Bütünlük → sürüm artışı → kanonik serileştirme/hash → rapor | Ek tablolar için invariant, sayısal kontrol ve yeni şema hash'i |

**Faz geçiş kuralı:** P3'te verilen sabotaj/onarım etkisi aynı gün henüz P5 yapılmadığı için yapılabilir; P11'de sonuçlanan etkiler ertesi gün uygulanmak üzere `PendingEffect` üretmelidir. Olay kararı Worker üzerinden anlık kabul edilebilir ama fiziksel ürün bir önceki faza ışınlanamaz.

## D. Kanonik stok ve çift tüketimden koruma

Her gün `Mining` / `Production` / `Transport` / `Upkeep` farklı işlevlerdir fakat **aynı stok hesabı** üzerinden düşer. İşlem sırası deterministiktir: `phaseOrder → priority → countryId → sourceId → requestId`. Kaynak miktarını düşmeden önce rezerv ve kullanılabilir miktar kontrol edilir. Bütünlük:

```
available = quantity - reserved
0 <= reserved <= quantity <= maxCapacity   (maxCapacity=0 ise sınırsız değil; kapasite yok)
minedKg <= remainingDepositKg
inputConsumedKg >= 0
outputCompletedUnits <= min(machineLimit, laborLimit, energyLimit, eachIngredientLimit) × qualityEff
closing = opening + mined + imports + captured + refunds - consumed - exports - destroyed - deliveredOut
```

Üretim yeni fiziksel çıktı yarattığı için girdiler/çıktılar farklı mal türüdür: aynı **mal türünde** kaynak bilançoları tutmalı; stok sıfırdan silah üretirken toplam adet korunumu değil, reçeteyle **dönüşüm korunumunu** denetlemeli. Depozit çıkartması da stok yaratımıdır ama yer altı rezervinden eşit düşülür. Nakit için üretim maliyeti ve nakliye gideri ayrıca yazılır.

`LedgerTx` bütün gün geçmişini ebediyen saklamak zorunda değildir. Son N gün açıklama kayıtları ayrı halka tamponda tutulur; kanonik `StockAccount` ve özet sayaçlar deterministik muhasebe kanıtıdır. Aynı olay gün içinde iki defa işlenemez. İşlem anahtarı `{day,phase,source,actionId,ordinal}` ve ön koşul `expectedWorldVersion` ile denetlenir.

## E. Hareket ve ETA: tek zaman-mikrobütçesi modeli

**Bulgu:** Mevcut `kara.ts::hareketGunu` tek günde `y.yol[1]` düğümüne geçip artanı sıfırlar. Yeni sözleşme her gün *1.000.000 mikrogün* hareket bütçesi kullanır. Her kenarda hız değişebilir; kullanılabilir hız = tür × mevsim × arazi × ikmal × hasar × ulaşım kipine göre. Fiziksel geçiş için `ceil(mesafeKalanMeter * S / hızMeterPerDay)` mikrogün gerekir. Kalan süre varsa bir sonraki kenara aktarılır. Ancak her kenarda `warAccess`, `transportBooking`, `bridgeDamage`, `battle` kontrolü yapılır.

- Aynı kenar üzerinde kısmi ilerleme kanonik `MoveState.progressMeter` olarak saklanır.
- Günde birden fazla kenar geçilebilir; düşman savunucusunu atlayıp savaşsız geçilemez.
- Normal barış rotası için `eta` aynı kenar ilerletme kuralının yan etkisiz simülasyonunu kullanır. Sonradan değişen savaş, kar, ikmal ve kapasite belirsizlikleri `tahmin` etiketiyle gösterilir.
- Yol algoritmasının eşit maliyetli seçiminde sabit ID sırası vardır. Rota epoch'u (erişim/demiryolu/savaş) değişince önbellek geçersiz.
- Taşıma türü kararı oyun mekaniğiyle zorunlu: kendi kontrollü demiryolunda **ücretsiz otomatik üç kat hız** yerine yükleme/kapasite/yakıt ve tren takviyesi gerekir.
- `moveDay` aynı gün iki defa çalışırsa `lastProcessedDay` kontrolü ikinci etkiyi yasaklar.

## F. Diplomasi/istihbarat ve gizli bilgi

**Teklif durum makinesi:** `DRAFT → PREVIEWED → SENT → (COUNTERED | ACCEPTED | REJECTED | EXPIRED | WITHDRAWN)`; yalnız kabul sonrası `RATIFIED → ACTIVE → (FULFILLED | BREACHED | TERMINATED)`. Özgün taslağın içeriği değişmez; karşı teklif yeni `revisionNo` üretir. Aynı teklif 2 kez uygulanamaz; `seenRevisionIds` ve idempotency korunur.

**Gizlilik:** `Clause.visibilityMask` taraf ve yetkilendirilmiş rapor sahibi bazlıdır. AI yalnız kendi bilgisi/raporunun ihtimal aralığıyla karar verir. Gizli bir protokol `observe` tarafından rapor olarak açığa çıkmadıkça farklı devletin UI/AI/olay listesine düşmez. Zamanlı yanlış bilgi raporlanabilir ancak `true` kanonik dünya değil `belief` üzerinden risk değerlendirilir; kontrollü gizli verinin AI'ya sızması otomatik test hatasıdır.

**Operasyon:** `PLANNED → PREPARING → ACTIVE → RESOLVING → (SUCCESS | PARTIAL | FAILED | EXPOSED) → COOLDOWN`. Aynı ajan ağı sınırsız başarılı operasyon üretmez. Suikast başarısı kalıcı kişi varsa `Person` halefiyete ve kabine etkisine, yoksa yalnız soyut huzur/meşruiyet olayına dönüştürülür; anlatı gerçeğe aykırı olmayacak. İşletme hasarı yazan sabotaj açıklaması gerçekten üretim hasarı/onarım kuyruğu yaratmalıdır. Gerçek dünyaya uygulanabilir operasyon yöntemi ayrıntıları **yasaktır**.

## G. Bakan, ordu ve AI kontrol kilitleri

`OrderIntent` en az `actorCountryId`, `controllerType` (`PLAYER`, `MINISTER`, `COMMANDER`, `AI`), `entityId`, `targetId`, `orderType`, `createdDay`, `lastAppliedDay`, `expiryDay`, `priority`, `overridesOrderId`, `idempotencyKey` taşır. Manuel emir aynı varlığın aynı alandaki otomasyonunu **iptal ederek ya da geçici süreyle bastırarak** tekil kontrol verir. Bakanın atanması/istifası mevcut emri kendiliğinden kopyalamaz.

AI için karar kuralı `GoalScore = strategicValue + regimeInterest + allianceTrust + expectedResource - risk - cost` yalnız **gözlemlenebilir** girdilerle normalize edilir; yasak eylem skorla değil ön koşulla elenir. Devlet 1 ayda bir genel plan yapabilir, olay sonucu erken yeniden planlayabilir; düşman cephesi yalnız gerektiğinde gözlemlenir. Aynı durumdan her gün aynı emir tekrarı için `cooldown`, `hysteresis` ve `lastAppliedDay` gerekir. Komutan kapasite bonusu alt-üst kademede iki kez uygulanmaz.

## H. Kayıt şeması, migration ve hash

Mevcut `serialize/index.ts` **SEMA_SURUM=10**. v1.7 için tek yeni sürüm **11 önerilir**; mühendislik uygulamasında mevcut depo sürümü önce yeniden doğrulanır. Eski şema 5–10 ve eski harita göçü adımları `10` aşamasını geçip **bir kez** `11` dönüşümü uygular. Kaynak/dünya toplamları yeni tablolara dağıtılırken her eski stok yalnız **bir kere** aktarılır: önce yeni nesneler oluşturulur, sonra eski özet alanlar ayna haline getirilir. Çifte sayım için assert vardır.

**Başarı ölçütü:** v1.6.1 snapshot'undan v1.7'ye göçün deterministik tek çıktısı; para/nüfus, hat WIP, gemi/uçak, birlik/komutan varlıkları korunsun; yeni şemada serialize→deserialize→serialize baytları/hash'i eşit; aynı yeni senaryonun seed/emir listesi replay ile eşit. **Şema veya kural değişirken eski ham hash'in yeni hash'e eşit olması aranmaz.**

Göç hata verirse orijinal kayıt dokunulmamış yedekte tutulur ve hata raporu çıkar. Yedek yoksa göç başlatılmaz. Göçte bilinmeyen 1914 petrol/maden rezervi, doğrulanmış tarih verisi yerine `unknown` bırakılabilir; fonksiyon bilinmeyeni kendiliğinden sonsuz stok yapmaz.

## I. Fonksiyon/API sözleşmeleri (önerilen TypeScript şekilleri)

```ts
type StableId = number;
type Micro = number;             // 0..1_000_000, safe integer
type Quantity = number;          // adet veya kanonik kg, birim kataloğa bağlı

type Intent = {
  type: string; countryId: number; actor: 'PLAYER'|'MINISTER'|'COMMANDER'|'AI';
  entityId: StableId; targetId?: StableId;
  expectedWorldVersion: number; idempotencyKey: string;
  issuedDay: number; phaseEarliest: number;
};

type ProductionQuote = {
  facilityId: StableId; lineId: StableId; equipmentModelId: string;
  completionPerDay: number; inputCosts: Record<string, Quantity>;
  limitingFactor: 'machine'|'labor'|'energy'|'input'|'damage'|'licence';
  confidence: 'CERTAIN'|'ESTIMATED';
};

type IntelObservation = {
  observerCountryId: number; targetCountryId: number; observedDay: number;
  signalType: string; lower: number; upper: number;
  reliabilityFixed: Micro; expiresDay: number;
};

type MoveQuote = {
  unitId: StableId; routeEdgeIds: StableId[];
  etaDaysMin: number; etaDaysMax: number; uncertainReasons: string[];
};
```

Bu şekiller doğrudan `World`'e rastgele obje dizisi yapıştırılacağı anlamına gelmez; kullanılacak iç temsil `Table`/SoA olmalı. `idempotencyKey` işleme istek sınırında yaratılır; dünya hash'ine girmesi yalnız kalıcı emrin çifte işlenmesini engelleyen durum gerektiğinde mümkündür.

## J. Anti-bozulma testleri

- Aynı oyuncu emri UI/komut satırından aynı dünya değişikliğini üretir.
- Aynı anda iki üretim hattı 1 kg çeliği ikişer kez tüketemez.
- Deneyimli komutan aynı anda iki uyumsuz komuta kademesinde tam bonus veremez.
- İstihbarat başarısızsa gizli gerçek bilgi UI/AI görünümüne taşınmaz.
- Anlık teklifi kabul etme 1 gün atlatmaz.
- Aynı günü tekrar kesinleştirme aynı stok/sevkiyat/üretim olaylarını ikinci kez işlemez.
- Altı savaş başlatma tohumunda aynı tek tarih sonucu zorunlu değildir; koşullu 1914 olay zinciri kritik koşul bozulursa durur.
- İstasyon kapasitesi 0 iken birlik kâğıt üzerindeki demiryoluyla ışınlanmaz.
- İhlal edilmiş anlaşma ve gizli sızıntı v1.7 kaydından sonra da korunur.
- Android renderer memory ve main-process memory birlikte ölçülür; yalnız Java heap yeterli değildir.
