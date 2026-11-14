# 07 — v1.7 R2 KARAR KAYDI / ADR

Bu liste v1.6.1'deki K-01…K-55'in devamına **önerilen** yeni karar kimliklerini ekler. Mevcut repo `docs/kararlar` dosyasına işlenmeden resmi kaynak kod kararı sayılmaz.

| Karar | Sorun | Bağlayıcı çözüm | Kanıt/geri alma |
|---|---|---|---|
| K-56 | Eski main dalı | v1.7 tabanı SHA `9f3694...` geliştirme dalı; main 1.4.0 karıştırılmaz | HEAD karşılaştırma, branch koruma |
| K-57 | Önceki v1.7 dokümanı çelişkili | v1.7 R2 ana şartname ve veri sözleşmesi kanonik; ilk taslak arşiv | Doküman diff ve ADR |
| K-58 | Şema | v1.6.1 şema 10 → önerilen 11; uygulama öncesi tekrar doğrulama | göç testleri |
| K-59 | Eski hash eşitliği | Eski/yeni ham hash değil, mantıksal varlık korunumu + yeni şema replay hash | schema5–11 test |
| K-60 | Stok çoğaltma | Tek fiziksel stok defteri ve atomik rezervasyon/tüketim | korunum testi |
| K-61 | Üretim ölçeği | Tesis/hat/makine/işgücü/enerji/malzeme bazlı fiziksel adet | 1914 Enfield dahil çoklu kalibrasyon |
| K-62 | Petrol başlangıcı | Senaryo başlatmada bir kez, eksik görünce sürekli otomatik dolum yok | başlat+yükle+60 gün testi |
| K-63 | Bölge/şehir | Şehir ayrı stable ID; bölge geometrisi ayrıdır | bölge göçü, şehir UI |
| K-64 | Günlük hareket | Mikrogün bütçesi ve bir günde çok kenar; engelde dur | ETA, savaş kaçırmama testi |
| K-65 | Demiryolu | Kapasite/yükleme/boşaltma ayrı; ücretsiz sabit 3× yerine ulaşım bütçesi | dolu ray testi |
| K-66 | Zaman fazı | P0–P12 gerçek sıraya kanca; geçmiş faza geriye etki yok | faz sıra testi |
| K-67 | İstihbarat | Ajans/ağ/rapor/operasyon kalıcı, soyut ve süreli | görünürlük, kayıt |
| K-68 | Suikast/kişi | Kalıcı siyasi kişiye etkisi varsa halefiyet; yoksa olay açıklaması kişi öldü demez | anlatı durum testi |
| K-69 | Sabotaj etkisi | Hasar metni, gerçek tesis/ulaşım hasarı + onarım kaydı doğurur | UI↔world doğrulaması |
| K-70 | Gizli diplomasi | Taslak revizyonu, clause görünürlüğü, taahhüt ve ifşa | rakip bilgi testi |
| K-71 | Kabine | Bakan bit maskesi kalır; gerçek kişi/kurum ataması genişletilir | eski save göç |
| K-72 | Komuta | Mevcut KM atama yeniden yazılmaz; üst hiyerarşi eklenir | çifte bonus testi |
| K-73 | Cephe | Operation kalıcı durum makinesi ve kaynak kilidi | muharebe regresyon |
| K-74 | Deniz/hava | FL/KN kalır; alan, yakıt tipi, nakliye ve bakım derinleşir | ayna toplamı |
| K-75 | 1914 hedefleri | Başlangıç tarihî, sonuç özgür; büyük ülke hedefleri karşıt | çoklu tohum alternatifler |
| K-76 | AI bilgisi | AI gerçek rakip gizli stokunu doğrudan okumaz, observe aralığı kullanır | sızıntı test |
| K-77 | AI plan sıklığı | Aylık/olay tabanlı, cephe acil; hysteresis ve cooldown | performans ve emir tekrarı |
| K-78 | UI tek alan | 360×800 dikey dört ana şehir sekmesi; komut paritesi | mobil manuel/otomatik |
| K-79 | Kabul testi statüsü | Test çalışmadıysa NOT_RUN; referans test oyunun PASS'i değildir | CI rapor |
| K-80 | Çevrimdışılık | INTERNET/RECORD_AUDIO izni eklenmez; tanılama yerel | Android Manifest |
| K-81 | Dönem kapıları | 750/1600/1914/1939/2026 ekipman, kurum ve yakıt ayrı | çapraz dönem test |
| K-82 | Yayın | Debug APK ürün release sayılmaz; imza, cihaz, yaş, gizlilik kontrolleri | release checklist |

## Değişiklik onay matrisi

Her ADR için etkilenen `packages/*`, kabul Test_ID, göç etkisi, AI kuralı ve P fazı belirtilmeden `ACCEPTED` olmaz. Var olan K-55'ten sonra başka geliştiricilerin eklediği yeni kararlar varsa kimlik çakışmasını çözmek için bu kimlikler yeniden numaralandırılır.
