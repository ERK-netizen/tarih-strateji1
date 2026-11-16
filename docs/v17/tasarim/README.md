# TARİH STRATEJİ — v1.7 R2 BÜTÜNLEŞİK GELİŞTİRME PAKETİ

**Tarih:** 14 Kasım 2026  
**Statü:** Tek kanonik tasarım + geliştirici uygulama sözleşmesi + örnek veri + bağımsız referans mantık testleri. **Oyunun kaynak koduna uygulanmış bir yama veya çalışan v1.7 APK değildir.**

**Temel alınan depo:** [ERK-netizen/tarih-strateji1](https://github.com/ERK-netizen/tarih-strateji1), `ccr-949a01d1-3lmfyg` dalı, SHA `9f3694c9af1afae86aa16771bcc5ed458058ee05` (v1.6.1). `main` farklı ve daha eski 1.4.0 sürümüdür; yanlış dala otomatik uygulama yapılmamalı.

## Neyi tamamlıyor?

Bu paket kullanıcı tarafından istenen 13 geliştirmeyi ve G01–G05 (1914 ulusal hedefler, krizler, plan, AI, zafer/sonuç) bileşenlerini, gerçek kod tabanı ve birbirleriyle uyumlu olacak şekilde tarif eder. Önceki ilk v1.7 şartnamesinin *göç, zaman/faz, kapasite, gizlilik, üretim, hareket, komutan/bakan, 1914 alternatif akış, performans ve test* boşluklarını kapatan kararlar ekler. Bu kararların yazılmış olması, kodda uygulanmış oldukları anlamına gelmez.

## Kullanım sırası

1. `spec/00_ANA_SARTNAME.md` — tek geçerli v1.7 R2 tasarım, kapsam, hedefler, önerilen kararlar.
2. `spec/01_KOD_UYUM_EKSIKLERI.csv` — 13 talep dahil kaynak dosyasıyla kanıtlı eksikler.
3. `spec/02_MIMARI_VERI_VE_FAZ_SOZLESMELERI.md` — teknik tipler, kimlik, muhasebe, fazlar, kayıt/göç.
4. `spec/03_SISTEM_MEKNIKLERI.md` — tüm mekaniklerin oyuncu/AI/UI/emir davranışları.
5. `spec/04_1914_SENARYO_KURALLARI.md` ve `veri/1914_ulusal_hedefler.json`, `veri/1914_olay_aglari.json` — koşullu alternatif tarih içerikleri (oyun veri derleyicisine doğrudan verilmez; uyarlama şart).
6. `spec/05_PR_UYGULAMA_PLANLARI.md`, `spec/06_GOC_KALITE_PERFORMANS.md` — mühendislik bağımlılıkları, kabul kapıları ve geri alma.
7. `testler/kabul_matrisi_v17_R2.csv` — önceki 77 kabul maddesi + yeni doğrulama ve çapraz sistem maddeleri; **tüm yeni maddelerin durumu NOT_RUN**.
8. `referans_kod/` — deterministik hareket ve üretim örnek mantığı, bağımsız testler. Gerçek motor yaması değildir.
9. `kaynaklar/` — ilk taslak arşivi, kaynak kod inceleme raporu, kaynak/kanıt listesi.

## Çalıştırılabilir bağımsız referans testleri

```bash
node --test referans_kod/*.test.mjs
```

Testlerin geçmesi yalnız `referans_kod` örneklerinin tutarlılığını gösterir. Oyunun `npm test` / Android APK kabulü yerine geçmez.

## Yüksek öncelikli kurallar

- **Mevcut çalışan sistem yeniden yazılmaz:** `komutanAta`, `FL/KN`, `HT`, `IR`, `TK`, tek-yazıcılı Worker ve P0–P12 korunur ve genişletilir.
- **Anlık idari emir güne mal olmaz:** onay/kayıt anında olur; fiziksel icra günlük fazlarda gerçekleşir.
- **Tüm görünen sonuçların gerçek mekanik karşılığı vardır:** UI açıklaması ile durum değişikliği uyuşmalıdır.
- **Eski kayıt göçü aynı hash demek değildir:** eski içeriğin korunması, yeni şema hash eşitliği ve deterministik replay istenir.
- **Tarihsel sonuç zorunlu değildir:** ulusal hedefler ve olayların şartları olmalı, alternatif tarih seçenekleri belirli ve maliyetli olmalı.
- **Gerçek dünya operasyon yöntemleri yoktur:** sabotaj/suikast, soyut oyun sonuçlarıdır; pratik yasa dışı yöntem içeriği içermez.

## Teslim eşiği

Bir özellik ancak *veri, motor, emir/önizleme, Türkçe komut, AI, UI, Neden?, kayıt ve test* birlikte PASS olduğunda BİTTİ kabul edilir. Mevcut 324 otomatik test ve v1.6'nın 70 kabul maddesi raporlanan tarihsel test durumudur; bu paket kapsamında yeniden çalıştırılmış sayılmaz.
