# KAYNAKLAR, KOD İNCELEME KANITI VE GÜVEN DÜZEYİ

**İnceleme tarihi:** 14.11.2026. Bu çalışma en son erişilen şu repoya göre hazırlanmıştır: https://github.com/ERK-netizen/tarih-strateji1, dal `ccr-949a01d1-3lmfyg`, commit `9f3694c9af1afae86aa16771bcc5ed458058ee05`. `main`: `3fdd26d...`, sürüm 1.4.0. Repo dalı daha sonra değişirse bulgular yeniden doğrulanır.

## Doğrulanmış kaynak kod alanları

- **Hareket:** `packages/engine/src/systems/kara.ts::hareketGunu`, `tahminiGun`; tek kenar/sıfırlanan artan ilerleme.
- **Üretim:** `packages/engine/src/systems/ekonomi.ts::sanayiGunu`; ulusal stok, HT, verim, WIP ve kaynak girdileri.
- **Kayıt:** `packages/engine/src/serialize/index.ts::SEMA_SURUM=10`; eski şema göçleri ve hash serileştirme.
- **Fazlar:** `packages/engine/src/phases/index.ts::gunIlerle`; gerçek P0…P12 sıralaması.
- **İstihbarat:** `packages/engine/src/emirEk.ts` casusluk, suikast, sabotaj, `iliskiBozma`, `isyan`; `state/world.ts::ISTIHBARAT_KOL`.
- **Kabine/komutan:** `state/world.ts::BAKAN`, `siyasiKisiler.ts`, `systems/komutan.ts`, `ui/Muharebe.tsx` (`komutanAta`).
- **Deniz/hava:** `systems/kuvvet.ts`, `systems/deniz.ts`, `ui/Kuvvetler.tsx`.
- **AI:** `decision/index.ts`, aylık plan ve gözlem aralıkları.
- **Android:** `apps/android/android/app/src/main/AndroidManifest.xml::sensorPortrait`, INTERNET/RECORD_AUDIO izinleri kaldırılmış.
- **1914:** `data-compiler/src/senaryolar/s1914.ts`; temmuz krizi, Belçika/İngiltere, Osmanlı çeşitli dalları.
- **Durum notu:** `docs/v16/README.md`: 324 test ve 70 kabul maddesi **repo beyanıdır**; bu çalışmada yeniden çalıştırılmadı.

Kalıcı kaynak bağlantısı örneği: https://github.com/ERK-netizen/tarih-strateji1/blob/9f3694c9af1afae86aa16771bcc5ed458058ee05/packages/engine/src/phases/index.ts

## Kamuya açık teknik ve tarihsel referanslar

- IMechE, *Munitions in London* — dönem/tesis ölçeği üretim kalibrasyonu; https://engineersatwar.imeche.org/features/munitions-in-london . Bu kaynağın 1917 RSAF Enfield haftalık ~10.500 tüfek verisi, tüm 1914 fabrikalarına sabit üretim olarak uygulanmaz.
- Android Developers, *WebView and memory* (2026), https://developer.android.com/topic/performance/memory/guide/webview-memory . WebView ana süreç/renderer bellek ölçümünü ayrı yapma.
- Android Developers, *Build web apps in WebView*, https://developer.android.com/develop/ui/views/layout/webapps/webview . WebView yaşam döngüsü ve performans.
- Canada War Museum, *Supplying War*, https://www.warmuseum.ca/firstworldwar/history/battles-and-fighting/tactics-and-logistics-on-land/supplying-war/ . Lojistik bağlamı; sayısal günlük yürüyüş için doğrudan kaynak kullanılmadı.
- Imperial War Museums, WWI içerikleri, https://www.iwm.org.uk/history . 1914 siyaset/tarih referans incelemesi için başlangıç.
- Mevcut v1.7 ilk taslak ve geçmiş rapor: `v17_Ilk_Taslak_Arsiv.md`, `v161_v17_Repo_Analiz_Raporu.md`.

## Belirsizlik sınıfları

`CODE_VERIFIED` = repo dosyasında kod satırı görülmüş; **çalıştığına kanıt değildir**.  `REPO_REPORTED` = README/test dökümanında beyan edilen; **yeniden test edilmedi**.  `DESIGN_DECISION` = bu pakette mühendislik için karara bağlanan fakat henüz kodda olmayan. `CALIBRATION` = gerçek oyun/historik veriye göre ayarlanması gereken varsayım. `HISTORICAL_ANCHOR` = tarih/ülke olayı gibi doğrulanmış başlangıç; gerçek sonuç zorunlu değil. `FICTIONAL_COUNTERFACTUAL` = alternatif tarih ve oyun tasarımı.

Yeni veri JSON'undaki ülke hedefleri ve olay dalları *tasarım taslağı*dır. Özellikle tarihî tam olay pencereleri, siyasi kişi adları, ekipman tarihlerine ait referanslar üretim öncesi ayrıca doğrulanacaktır.
