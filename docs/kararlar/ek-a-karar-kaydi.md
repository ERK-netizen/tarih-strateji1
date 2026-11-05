# Ek A — Karar kaydı (Aşama 1A uygulaması)

Tarih: 4 Kasım 2026 · Şartname: v1.4.0 · Kapsam: Aşama 1A (kurgusal 4 devlet, 48 bölge)

| Kod | Karar | Gerekçe | Şartnameyle ilişkisi | Geri dönüş yolu |
|---|---|---|---|---|
| K-01 | Harita çizimi tek Canvas 2D çizicisiyle yapıldı; MapLibre + PMTiles kullanılmadı | 48 bölgede karo üretimi gereksiz; çevrimdışı yazı tipi/stil yükü yok; sahiplik değişimi yalnız dolgu yeniden çizimi | 5.7 VARSAYILAN seçimden sapma; 8.5 Aşama 0 spike kararı bu kayıttır | 1B'de 250+ bölgede MapLibre spike'ı yeniden ölçülür |
| K-02 | Protokol şemaları el yazımı doğrulayıcıyla denetlenir (Zod yok) | Paket boyutu; tek tip zarf ve tür listesi yeterli | 5.7 VARSAYILAN | Zod eklenmesi davranışı değiştirmez |
| K-03 | SoA kolonları Float64Array (kimlik/sayaç kolonları Int32Array); serileştirme bütün kolonları f64 yazar | Güvenli tamsayı aralığı tek yol; hash sırası şema sırası | 5.6, 6.1 ile uyumlu | — |
| K-04 | Gıda: eyalet havuzu; eyalet içi dağıtım taşıma gerektirmez; işgal altındaki bölge yerel stokla yaşar, işgalci erişim payını el koyar (3 gün transit) | 8.1 “eyalet gıda havuzu”; 1A ölçeğinde bölge-bölge sevkiyat gereksiz | 11.2 sadeleştirmesi | 1B'de bölge depoları |
| K-05 | Çelik ve kömür için en çok 30 günlük akış kadar tampon tutulur | Haftalık pazar teslimi akışa yayılmadan kullanılabilsin | 13.5 “yalnız akış” kuralından bilinçli sapma | Günlük teslim sözleşmeleri gelince kaldırılır |
| K-06 | Karar modülü `systems/ortak` kamu yardımcılarını (savaş, anlaşma, kendi birlikleri) okur; yabancı birlik gücünü yalnız `observe` aralığından alır | 1A'da dar gözlem arayüzü yerine kamu yardımcıları | 5.5'ten kısmi sapma; ESLint kuralı tablo/serileştirici/faz importunu yasaklar | 1B'de gözlem görünümü nesnesi |
| K-07 | A, W, P statüleri askerlik çağı bandında tutulur; yaş etiketi 1A'da izlenmez | Basitlik; kohort çıkışı yalnız S, Y, E, R'ye uygulanır | 10.3–10.4 sadeleştirmesi | 1B'de A/W/P yaş etiketi |
| K-08 | Terhiste ekipman başkent deposuna anında döner | 1A'da terhis seyrek; transit sadeliği | 10.9 “ışınlanmaz” kuralından sapma | Terhis transit kaydıyla değiştirilir |
| K-09 | Pazar teslimi sabit 7 gün; deniz kenarı soyut | 1A'da deniz bölgesi taşıma kenarı yok | 14.4 ile uyumlu sadeleştirme | Dünya sistemleri aşaması |
| K-10 | Para birimi “altın”, 1 birim = 1 altın; en büyük ülkenin yıllık geliri ≈ 4 × 10⁷ | Para birimi kuralı (6.1) payı fazlasıyla korur | 6.1 | — |
| K-11 | Ekteki şartname metni bölüm 19.5'te kesiliyordu; bölüm 20–30 ve Ekler okunamadı. Komut sistemi C01–C04, 4.2 ve 19 kurallarından türetildi; T numaraları bölüm 1 tablosundan eşlendi | Eksik metin | — | Tam metinle karşılaştırma ve test adlarının güncellenmesi |
| K-12 | 1A özellik bayrakları şartname 5.8'deki gibi kapalı; yalnız `istihbarat` açık | 5.8 | Uyumlu | Senaryo paketinde bayrak açılır |
| K-13 | “Sonraki olay” kipi en çok 3 takvim ayı ilerler | Tur temposu (4.1: oturum 15–30 dk) | 4.1 VARSAYILAN yorumu | Ayarlar paneline taşınabilir |
| K-14 | Depolama: OPFS → IndexedDB → bellek sırası; depolama 2,5 sn'de açılmazsa bellek | Tarayıcı/çerçeve kısıtları (ör. file://) | 24.1 VARSAYILAN + yedek adaptör | — |
| K-15 | Kaybeden taraf, barışla yitirdiği bölgelerde intikam iddiası kazanır (kanonik `iddia` kolonu) | Tek savaştan sonra dünyanın durağanlaşmasını önler | 18 ile uyumlu ek | Veri ağırlıkları |
| K-16 | Barış önerilerinde karar modülü taviz bütçesinin %60'ını ve en çok 3 bölgeyi (teslimde 5) ister | Kartopu büyümesini sınırlar; 18.3 koalisyonu 1B-2'de | Denge değeri | Koalisyon açılınca gevşetilir |
