// Danışman menüsündeki hazır Türkçe komutlar (ayrıştırıcıyla sınanır: tests/acceptance/hazirkomut.test.ts).
export interface KomutBaglam { komsu: string; dusman: string; bolge: string; sablon: string }
export interface KomutGrubu { ad: string; komutlar: string[] }

/** Bağlama (komşu, düşman, başkent, birlik şablonu) göre doldurulmuş hazır komutlar. */
export function hazirKomutlar(k: KomutBaglam): KomutGrubu[] {
  const yon = (ad: string, ek: 'e' | 'i') => ek === 'e' ? `${ad}'${/[aıou][^aeıioöuü]*$/i.test(ad) ? 'ya' : 'ye'}` : ad;
  void yon;
  const g = (ad: string, komutlar: string[]): KomutGrubu => ({ ad, komutlar });
  return [
    g('İstihbarat', [`${k.dusman}'a casus gönder`, `${k.dusman}'ın lideri için suikast düzenle`, `${k.dusman}'da isyan çıkar`, `${k.komsu} ile ${k.dusman} ilişkisini boz`, `${k.komsu}'da darbeyi destekle`]),
    g('Durum ve bilgi', ['Ne yapmalıyım?', 'Huzur neden düşüyor?', 'Rakipler ne planlıyor?', 'Gıda durumum nasıl?', 'Hazine neden azalıyor?', 'Savaşa destek neden düşüyor?']),
    g('Ekonomi', ['Vergiyi %15 yap', 'Vergiyi %20 yap', 'Vergiyi %25 yap', '500 gıda satın al', '200 kömür sat', '300 mühimmat satın al', 'Her hafta 300 gıda satın al', 'Savaş ekonomisine geç', 'Karne uygula', '1 milyon borç al', 'Bilime %40 ayır', 'Bilime %20 ayır']),
    g('Üretim ve inşaat', ['Mühimmat üretimini 4 fabrikaya çıkar', 'Mühimmat üretimini 8 fabrikaya çıkar', `${k.bolge}'a askerî fabrika inşa et`, `${k.bolge}'a sivil fabrika inşa et`, `${k.bolge}'a demiryolu inşa et`, `${k.bolge}'a altyapı inşa et`, `${k.bolge}'a valilik inşa et`, `${k.bolge}'a sulama inşa et`, `${k.bolge}'a hava üssü inşa et`, `${k.bolge}'a tersane inşa et`]),
    g('Ordu', [`2 ${k.sablon} kur`, `4 ${k.sablon} kur`, `${k.bolge}'da 2 ${k.sablon} kur`, 'Askerlik yasasını kapsamlı yap', 'Askerlik yasasını sınırlı yap', 'Cepheyi otomatik yönet', `${k.bolge}'ı savun`, `${k.dusman}'a karşı gerekçe hazırla`]),
    g('Araştırma', ['Seri üretimi araştır', 'Topçuyu araştır', 'Siper sistemini araştır', 'Dolaylı atışı araştır', 'Kamyon ikmalini araştır', 'Sahra sıhhiyesini araştır', 'Tarım makinelerini araştır', 'Demiryolu ağını araştır', 'Kurmay sistemini araştır']),
    g('Diplomasi', [`${k.komsu} ile ticaret anlaşması öner`, `${k.komsu} ile ittifak öner`, `${k.komsu} ile saldırmazlık paktı öner`, `${k.komsu}'a dostça tutum al`, `${k.dusman}'a düşmanca tutum al`, `${k.dusman}'a beyaz barış öner`, `${k.dusman}'a savaş ilan et`, `${k.komsu} ile askerî geçiş anlaşması öner`]),
    g('Zaman', ['1 gün ilerle', '1 hafta ilerle', '1 ay ilerle', '3 ay ilerle', '6 ay ilerle']),
  ];
}
export const hazirKomutSayisi = (k: KomutBaglam): number => hazirKomutlar(k).reduce((s, g) => s + g.komutlar.length, 0);
