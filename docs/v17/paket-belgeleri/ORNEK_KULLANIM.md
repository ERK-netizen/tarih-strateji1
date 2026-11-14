# Entegrasyon sonrası oynanış ve oyun motoru komut örnekleri

Bunlar mevcut `Emir` önizleme API'sine gönderilen veri nesneleridir; kullanıcıya gösterilen JavaScript kodu veya Türkçe NLP komut ayrıştırıcısı değildir. UI bu emirlerin bir kısmını otomatik oluşturur.

```ts
// Almanya = 0, Britanya = 1 varsayımı YANLIŞ olabilir; ülke ID'lerini senaryo kataloğundan al.
// Buradaki sayılar yalnız şemayı göstermek için semboliktir.
const ornekler = [
  { tur:'v17BakanAta', ulke:0, alan:'uretim', kisi:'Theobald von Bethmann Hollweg' },
  { tur:'v17AgKur', ulke:0, hedef:1 },
  { tur:'v17Operasyon', ulke:0, ag:123, operasyon:'sabotaj', bolge:11 },
  { tur:'v17Teklif', ulke:0, hedef:1, madde:'ticaret' },
  { tur:'v17TeklifYanit', ulke:1, teklif:123, yanit:'counter' },
  { tur:'v17SehirPolitika', ulke:0, tesis:123, politika:'verim' },
  { tur:'v17Harekat', ulke:0, birlikler:[101], emir:'savun', hedef:10 },
];
```

1. Oyun ekranı önizleme kartını ve maliyetini gösterir.
2. Oyuncunun onayı `Sunucu.submit` ile tek yazıcı Worker'a gelir.
3. Motor yeni komutu `EK_EMIRLER` üzerinden uygular; malî ve siyasi bedel düşülür.
4. Hazırlık süresi olan gizli operasyonlar P3'te, kalıcı harekât emirleri P2'de işlenir.
5. Sonuçlar P11'e kadar dünya durumunda tutulur; şema 11 ile kalıcı kayda yazılır.

**Gelişmiş üretim uyarısı:** `produceV17()` henüz gerçek `C.celik`, `HT`, birlik ve şehir stoğuna bağlanmadı. Sadece fiziksel stok hesaplama alt motoru ve testidir; normal oyunda üretim hala v1.6.1 mekanizmasına bağlıdır.
