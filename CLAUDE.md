# AI geliştirici çalışma kuralları (şartname 29.6 özeti)

1. Tek belge `docs/sartname-v1.4.md`. ZORUNLU kurallar değişmez; VARSAYILAN değer değişince aynı commit'te `docs/kararlar/` ve test güncellenir.
2. Motor (`packages/engine`) saftır: `Date`, `Intl`, `Math.random`, `Math.round/sqrt/pow/log/exp`, `toLocaleString`, `for…in` yasak (ESLint). Kanonik durumda yalnız güvenli tamsayı.
3. Oran işlemleri `mulRatio`, `divRatio`, `mulDiv`; kalan korunan miktarlarda artık kanalına yazılır. Yuvarlama `roundHalfEven`.
4. Rastlantı yalnız `rng(tohum, gün, sistem, varlık, kuşak, amaç, örnek, sayaç)`. Global sayaç yok.
5. Yeni sütun/tablo: `state/world.ts` şemasına eklenir → serileştirme ve hash'e kendiliğinden girer; şema sürümü (`SEMA_SURUM`) artırılır.
6. Karar modülü oyuncuyla aynı yoldan emir verir (`orders.uygula`); yabancı birlik gücünü yalnız `observe` aralığından okur.
7. Her emir türü: `onizle` (dünyayı değiştirmez), `uygula`, `emirMetni` eşdeğer komutu ve ayrıştırıcıda geri çözülme (T123).
8. Tamamlanma tanımı: `npm run tip && npm run lint && npm test` yeşil; ilgili T testi eklendi; `npm run lab -- 365` hash'i iki koşuda aynı.
