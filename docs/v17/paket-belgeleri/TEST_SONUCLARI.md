# Tarih Strateji v1.7 R3 — Test ve Kanıt Kaydı

**14 Kasım 2026.** Bu belge yalnız mevcut çalışma ortamında gerçekleştirilen kontrolleri raporlar.

| Kontrol | Durum | Kanıt / kapsam |
|---|---|---|
| Saf TypeScript v17 üretim/diplomasi/istihbarat/plan fonksiyonları | PASS (25/25) | `node --experimental-strip-types --test tests/v17-core.test.ts` |
| Gerçek 1.6.1 metin çıpası için mock entegrasyon aracı | PASS (3/3) | `python -m unittest discover -s tests -p test_integration_patcher.py` |
| Saf TS çekirdek type-check | PASS | `tsc --noEmit --strict` 6 saf çekirdek dosyası |
| Runtime bridge + UI TypeScript sözdizimi | PASS (AST/syntax only) | TypeScript 5.8.3 `transpileModule`, 2 dosya; gerçek type-check değildir |
| 1914 veri tasarım doğrulaması | PASS | R2 `validate_design_data.py` (64 hedef, 36 olay, 154 tasarım kabul maddesi) |
| Mevcut oyun deposu `npm run tip` | **NOT_RUN** | Tam repo ortamda bulunmadı |
| Mevcut oyun deposu `npm run lint` | **NOT_RUN** | Tam repo ortamda bulunmadı |
| Mevcut oyun deposu `npm test` (324 eski + 8 yeni entegrasyon kontrolü) | **NOT_RUN** | Tam repo ortamda bulunmadı |
| Beş senaryo 365 gün ve 5/10/25 yıl | **NOT_RUN** | Gerçek repo/fixture ve çalışma zamanı gerekir |
| Kanonik save/load 10→11 ve tekrarlanabilir hash | **NOT_RUN** | Test dosyası `integration/tests/acceptance/v17.integration.test.ts` hazır |
| Android APK derlemesi ve gerçek Samsung/Android cihaz | **NOT_RUN** | Android SDK ve gerçek repo testleri gerekir |

**Yayın kapısı:** Bu rapordaki NOT_RUN satırları başarı sayılmaz. Hata bulunursa yamayı düzeltin, testler yeşile dönmeden ana dalı değiştirmeyin. Yeni fiziksel üretim `detailedProduction:false` bırakılmıştır.
