# v1.7 R3 — Mimari, Entegrasyon ve Kayıt Sözleşmesi

## Değiştirilen gerçek depodaki dosyalar

1. `packages/engine/src/systems/kara.ts` — çok-kenarlı hareket, ortak ETA ve cephe emniyeti.
2. `packages/engine/src/emirEk.ts` — sabotajın fiziksel hasar etkisi, yeni v17 emirlerinin mevcut önizleme/doğrulama yoluna kaydı.
3. `packages/ui/src/Cekmece.tsx` — birlik seçiliyken komutana geçiş.
4. `packages/engine/src/state/world.ts` — kanonik `v17:V17State` alanı ve varsayılan boş durum.
5. `packages/engine/src/serialize/index.ts` — şema 11, yeni canonical `v17` JSON, şema 5–10 göçte miras düzeni.
6. `packages/engine/src/phases/index.ts` — P2 plan, P3 diplomasi/istihbarat, P11 hedef/tesis senkronizasyonu.
7. `packages/engine/src/systems/ekonomi.ts` — özel şehir sanayi politikası ve bakan için en çok +%15 sınırlı fabrika çarpanı.
8. `packages/engine/src/index.ts` — v17 dışa aktarım fonksiyonları.
9. `packages/worker/src/sunucu.ts` — v17 anlık emirleri, sadece oyuncunun hak sahibi olduğu verileri döndüren yeni görünüm.
10. `packages/ui/src/Paneller.tsx` — mevcut Devlet paneline V17Panel eklenmesi.

Bunlar ayrıca 8+1 yeni kaynak/test dosyasıyla tamamlanır. `apply_v17_integration.py` **yalnız incelenmiş 1.6.1 kaynak biçimindeki kesin metinleri değiştirir**. Bir paragraf dahi değişmişse hata ve manuel inceleme gerekir.

## Simülasyon korumaları

- Değişken kanonik veri `w.v17` altındadır, `onbellek` altında değildir. `version=1` JSON taşır. Bütün ana varlıklar `id` ile oluşturulur, tekrar kullanımı yasaktır.
- `P2`: kalıcı emrin önizlemeyle doğrulanan uygulanması (oyuncu elle verdiğinde sonraki AI kararından üstün).
- `P3`: istihbarat operasyonu, diplomasi teklif yanıtı, zaman aşımı. Başarı `rng(seed,day,...)` ile hesaplanır, `Math.random` kullanılmaz.
- `P5`: **eski fiziksel üretim hesabı hâlen kanoniktir**. Yeni `produceV17` yalnız ayrı çekirdektir, aynı kaynak ikinci kez düşmez.
- `P11`: ulusal hedef ilerlemesi, tesis sayısı değişimleri, v17 bütünlük kontrolü.
- `P12`: tüm yeni durum kanonik serileştirilir. Görünüm `v17View` sadece oyuncunun kendi ajan, tesis, bakan, teklif ve hedeflerini içerir.
- Eski 5–10 şema yüklenirse v17 yerel tesis/ilk stok yansıları var olan dünyadan oluşturulur. 11 şema doğrudan JSON alanını okur.
- 813 bölgeden eski harita göçünde önce eski bölge→yeni bölge evreleri tamamlanır, sonra v17 sahaları yeniden kurulur.

## Uygulama durumu ve sistem etkileşimi

| İşlem | Etkilenen kanonik veri | Kaynağın yönü |
|---|---|---|
| Bakan ata | `v17.ministers`, `C.pg`, `C.hazine`, `fabrikaCarpan` | Siyasi kişi → sınırlı sanayi verimi |
| Şehir sanayi teşviği | `v17.sites.policy`, `C.pg`, fabrika çarpanı | Bölge → ülke üretimi |
| Ajan ağı | `v17.networks`, `C.pg`, `C.hazine` | Ülke → rakip ülke |
| Gizli operasyon | `v17.operations`, `IR`/`R.hasar`/`C.huzur` | Hazırlık → gözlem/hasar/toplumsal etki |
| Diplomatik müzakere | `v17.proposals`, `AN`, `C.pg` | Teklif/karşı teklif → tek sefer antlaşma |
| Harekât | `v17.orders`, `U.hedef`, `U.durus`, `U.elle` | Komuta planı → P8 hareket/muharebe |
| Ulusal hedef | `v17.goals` | Mevcut devlet göstergelerinden çıkarım; otomatik savaş tetiklemez |

## Bitmemiş büyük dönüşümler için ayrıştırılmış arayüzler

Yeni `v17/industry.ts` fiziksel üretim kernelini, `V17ProductionInput`, `V17ProductionResult`, `produceV17`, `reserveSequential` ile sunar. Tam üretim dönüşümü için `HT`, `C.celik/komur`, ülke ekipman stokları ve askerî birlik depolarının **tek merkezli ledger** altında birleştirilmesi şarttır. Bu bağ kurulmadan `detailedProduction` true yapılmaz. Aynı biçimde kömür/petrol platform bazlı deniz tüketimi, şehir alt tesisleri ve 1914 için ülke özel 64 hedef/36 olay tasarımındaki DSL koşulları sonradan adapte edilmelidir.

## Geri dönüş / geri alma

Patcher her değiştirdiği `.ts/.tsx` dosyası için `.v161.bak` oluşturur. Tam commit'e geri dönüş için kod deposunun Git geçmişi tercih edilir. Şema 11 ile kaydedilen kullanıcı dosyaları eski şema 10 ile açılamayabilir; eski kayıtları aynen saklayın, yeni kaydı farklı yuvada üretin. Bu paket, kullanıcının eski kayıt dosyalarını otomatik silmez veya overwrite etmez.
