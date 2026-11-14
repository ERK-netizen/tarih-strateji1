# v1.7 R3 — Kod teslim matrisi

Sözleşme: `PATCH_READY` entegrasyon aracı kaynakları güncelleyebiliyor demektir; `TESTED_CORE` yalnız bağımsız saf modül testini gösterir; `REPO_NOT_RUN` oyunun gerçek depo testleri henüz yürütülmedi demektir.

| ID | Geliştirme | Hazır kod | Çalışma ve eksik |
|---|---|---|---|
| R01 | Diplomasi | `v17/diplomacy.ts`, `bridge.ts`, UI | Çok turlu karşı teklif, basit AI tepkisi; koalisyon konferansı yok |
| R02 | İstihbarat | `v17/intelligence.ts`, operasyon/şema/UI | Ağ, hazırlık, gizli rapor, hasar; kapsamlı karşı istihbarat yok |
| R03 | Maden/petrol | `state.ts`, kaynak yansısı | Rezerv, rafineri, yerel depo ve demiryolu taşıması yok |
| R04 | İsimli ekipman | `catalog.ts`, `industry.ts` | Beş örnek tarihsel ad; gerçek üretim envanterine bağlanmadı |
| R05 | Cephe kararlılığı | `apply_v170.py`, `strategy.ts` | Geçiş emniyeti, düzenli emir; kuşatma ve ayrı savaş motoru yok |
| R06 | Komutan | `apply_v170.py`, mevcut `komutan.ts` | Birimden komutan kısayolu; üst komuta hiyerarşisi yok |
| R07 | Bakanlıklar | `bridge.ts`, `state.ts`, `V17Panel.tsx` | Kalıcı atama; yalnız üretim portföyünde etkisi var |
| R08 | Sanayi alt türleri | `industry.ts`, `state.ts` | Site kaydı ve uzmanlaşma; tekil fabrika makinesi gerçek ekonomiye bağlanmadı |
| R09 | Şehir merkezi | `V17Panel.tsx`, mevcut çekmece | Şehir politikası işlemleri; bütün sekmeler hâlâ birleşik değil |
| R10 | Gerçekçi üretim | `industry.ts`, 25 çekirdek testinden ilgili testler | Fiziksel çekirdek çalışır, **üretime bağlanmadı**; çifte üretim önlendi |
| R11 | Birlik hareketi | `apply_v170.py` | Çok-kenarlı hareket/ETA; demiryolu yükleme ve kapasite yok |
| R12 | Gelişmiş emirler | `strategy.ts`, `bridge.ts`, UI | Savun/taarruz/intikal/garnizon, çatışma kilidi; karma PlanDSL yok |
| R13 | Hava/deniz | Mevcut v1.6 `kuvvet.ts` korunur | Yeni v1.7 deniz alanı ve ortak taşıma modeli yok |
| G01 | Ulusal hedefler | `catalog.ts` 3/ülke, R2 tasarım verisi 64 | 64 tanım henüz motor DSL olarak aktive edilmedi |
| G02 | Tarihsel koşullu olay | Mevcut `s1914.ts` korunur, R2 tasarım verisi 36 | 36 yeni taslak motor veri derleyicisine uyarlanmadı |
| G03 | AI stratejik hedef | Mevcut `decision/index.ts`, `bridge.ts` | Teklif AI 3 gün sonra yanıtlar; çok boyutlu plan hafızası yok |
| G04 | Türkçe plan | Mevcut `command/index.ts`, `v17Harekat` | Yeni komutlar UI/önizle API ile verilebilir; Türkçe PlanDSL parser yok |
| G05 | Alternatif tarih | Mevcut koşullu olaylar + hedef göstergesi | Çok yıllı denge ve 24+ tohum testleri yok |

**Değerlendirme:** Bu, bitirilmiş v1.7 R2 oyunu değil; ilk aşama ile birlikte çalışabilecek kod temelleri ve köprülerdir. GitHub deposunda gerçek tip/test/build sonuçlarına göre düzeltmeler yapılmadan sürüm yükseltilmemelidir.
