# Tarih Strateji — v1.7 R3 Kaynak Kod Entegrasyon Paketi

**14 Kasım 2026 | Hedef: v1.6.1 TypeScript deposu | Çalışma türü: koşullu, yerel kaynak kod entegrasyonu**

## Teslim edilen gerçek kodlar

- `integration/packages/engine/src/v17/`: kalıcı durum, katalog, fiziksel üretim çekirdeği, istihbarat ağı, diplomasi, harekât planlama ve **mevcut oyun motoruyla köprü** (7 TS dosyası).
- `integration/packages/ui/src/V17Panel.tsx`: Devlet paneli için kabine, şehir, istihbarat, diplomasi ve harekât kontrolleri.
- `integration/tests/acceptance/v17.integration.test.ts`: gerçek oyun deposunda koşulacak Vitest entegrasyon testleri (8 senaryo).
- `tools/apply_v17_integration.py`: 1.6.1 kaynak yapısını denetler, 10 mevcut dosyayı değiştirir, 9 yeni dosya ekler, yedek alır, başarısız olursa kaynakları geri alır.
- `tools/apply_v170.py`: daha önce hazırlanan hareket/ETA, sabotaj ve komutan kısayolu yamasının güvenli çekirdeği.
- `tests/v17-core.test.ts`: mevcut depodan bağımsız 25 üretim/istihbarat/diplomasi/harekât hesap testi.
- `design/`: R2 kapsamlı tasarım, 154 maddelik kabul matrisi ve 1914 64 hedef / 36 olay taslağı. **Bu tasarım verisinin tamamı oyun motoruna yüklenmiş değildir.**

## Sürüm güvenliği

Gerçek kaynak dalı `ERK-netizen/tarih-strateji1`, `ccr-949a01d1-3lmfyg` (incelenen HEAD `9f3694c9af1afae86aa16771bcc5ed458058ee05`). `main` dalı 1.4.0 olduğundan bu entegrasyon ona uygulanmaz.

**Çalışma deposu dosyalarını bu teslim sırasında GitHub üzerinde değiştirmedim.** Paket, mevcut 1.6.1 kaynak ağacına yerel olarak uygulanabilen ve gerçek repo testlerinden geçmesi gereken bir koddur. Henüz çalışan v1.7 APK değildir.

## Windows'ta entegrasyon

1. GitHub'dan belirtilen v1.6.1 geliştirme dalını ayrı klasöre alın; ayrıca yedek oluşturun.
2. Bu ZIP'i ayrı bir klasöre çıkarın.
3. PowerShell / komut isteminde:

```bat
python tools\apply_v17_integration.py C:\oyun\tarih-strateji --check
python tools\apply_v17_integration.py C:\oyun\tarih-strateji
cd C:\oyun\tarih-strateji
npm ci
npm run tip
npm run lint
npm test
npm run build
```

**Android APK:** `npm run android:apk` (Android SDK/Java gerektirir). Önce `npm test` geçmelidir.

## Linux / macOS entegrasyonu

```bash
python3 tools/apply_v17_integration.py /path/to/tarih-strateji --check
python3 tools/apply_v17_integration.py /path/to/tarih-strateji
cd /path/to/tarih-strateji
npm ci && npm run tip && npm run lint && npm test && npm run build
```

## Gerçekleşmiş işlevler / etkinlik düzeyleri

| Alan | Hazırlanan kod | Çalışma durumu |
|---|---|---|
| Çok bölgeli hareket + ETA | `apply_v170.py` | **Yama hazır; ana repo testleri çalışmadı** |
| Muharebe güvenliği | `apply_v170.py` | Yama hazır |
| Sabotaj tesis hasarı | `apply_v170.py`, `v17P3` | Yama hazır |
| Komutan atama kısayolu | `apply_v170.py` | Yama hazır; mevcut komutan motoru kullanılır |
| Diplomatik karşı teklif / AI cevap | `v17/diplomacy.ts`, `bridge.ts` | Yeni emir, kalıcı kayıt, 3. gün basit AI yanıtı |
| Casus ağı / operasyon | `v17/intelligence.ts`, `bridge.ts` | Ajan ağı, 21 gün hazırlık, basit başarı/ifşa, stok/hasar/huzur veya gözlem raporu |
| Kalıcı bakan seçimi | `v17/state.ts`, `bridge.ts` | Tarihî kişi ataması, üretim bakanında sınırlı verim katkısı; diğer portföylerin etkileri **tam değil** |
| Şehir sanayi politikası | `v17/industry.ts`, `bridge.ts` | Gerçek fabrika çarpanına kontrollü etki; ülke/şehir sahası senkronizasyonu |
| Harekât planları | `v17/strategy.ts`, `bridge.ts` | Savun/taarruz/intikal/garnizon planı, emir çakışma ve günlük tekrar engeli; kuşatma/yarma ayrı model değil |
| 1914 ulusal hedef | `v17/catalog.ts`, `bridge.ts`, `design/veri/*` | 16 ülke için 3 temel hedef; **64 tasarım hedefinin tüm koşulları henüz adapte edilmedi** |
| Maden ve petrol | `v17/state.ts` kaynak aynaları | Başlangıç saha ve yatak kaydı; gerçek rezerv/rafineri/ulaşım modeli **etkin değil** |
| Üretim / isimli ekipman | `v17/industry.ts`, `catalog.ts` | 5 örnek model + test edilmiş fiziksel reçete hesabı; `detailedProduction:false`, **eski canlı üretimin yerine henüz geçmedi** |
| Ayrıntılı filo/hava | Mevcut `kuvvet.ts`/`deniz.ts` korunur | Yeni bölgesel deniz haritası/ortak deniz-kara kapasitesi **eklenmedi** |
| Genel AI stratejik plan hafızası | sözleşmeler / `flags.enableAiPlans:false` | **Tamamlanmadı**; mevcut AI motoru çalışmayı sürdürür |
| Veri göçü/kanonik serileştirme | `apply_v17_integration.py` | Şema 10→11; eski kayıtlar yüklenirken ek durum deterministik başlatılır; **gerçek repo testleri bekliyor** |
| Android dikey UI | `V17Panel.tsx`, mevcut `sensorPortrait` | Panel kodu hazır; gerçek cihaz testi bekliyor |

## Korunan eski motor

`P0–P12` günlük sıra, tek yazıcı Worker, emir önizleme-onaylama, sayısal güvenlik, eski teknoloji, fabrika, stok, komutan, donanma/hava, nüfus ve beş senaryo kaldırılmadı. Fiziksel üretimin yeni modeli **bilerek ayrı tutuldu**, böylece iki motor aynı hammaddeden çift silah üretmez.

## Kesin sınırlar

1. **Bu paket “13 sistemin tamamen bitmiş APK'sı” değildir.** Tasarımın tamamını içermesi ile tüm mekaniklerin test edilmiş olması farklıdır.
2. Tam oyun deposu bu çalışma ortamında klonlanamadı (ağ erişimi kısıtlı). Kaynaklar GitHub bağlantısından incelendi; gerçek `npm run tip/lint/test/build` henüz çalıştırılamadı. Oyunla birlikte çalışıp çalışmadığına dair kesin iddia kurulmaz.
3. 2026 kişilerinin tarihsel güncelliği ve tüm 1914 model verileri ayrıca teyit edilmelidir; tasarım kataloğundaki sayılar dengelenmemiş varsayımdır.
4. Yeniden yüklemede eski ham v1.6 hash'inin şema 11 hash'ine eşit olması beklenmez; yeni şemada `serialize→coz→serialize` eşitliği aranır.
5. GitHub CI, Android cihaz ve uzun dönem senaryo sonuçları geçmeden **v1.7 R3 RELEASE** etiketlenmemeli.

Detaylar: `docs/KOD_ENTEGRASYON_DURUMU.md`, `docs/MIMARI_VE_VERI_GOCU.md`, `docs/TEST_SONUCLARI.md`.
