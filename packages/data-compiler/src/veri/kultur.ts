// Modern sınırlara göre varsayılan halk ve inanç (derleme zamanı). Dönem senaryoları kendi tablosuyla üzerine yazar.
// Biçim: ISO:Kültür/inanç. İnanç kodları INANC_AD tablosundadır.

export const INANC_AD: Record<string, string> = {
  sunni: 'Sünnî İslam', sii: 'Şiî İslam', ibazi: 'İbâzî İslam', islam: 'İslam', katolik: 'Katolik Hristiyanlık', ortodoks: 'Ortodoks Hristiyanlık', protestan: 'Protestan Hristiyanlık',
  latin: 'Latin Hristiyanlığı', rum: 'Rum Hristiyanlığı', dogu: 'Doğu Hristiyanlığı', budist: 'Budizm', hindu: 'Hinduizm', cin: 'Çin halk dini ve Konfüçyüsçülük', sinto: 'Şinto ve Budizm',
  yahudi: 'Yahudilik', yerel: 'Geleneksel inançlar', zerdust: 'Zerdüştlük', tengri: 'Tengricilik', germen: 'Germen paganizmi', slav: 'Slav paganizmi', baltik: 'Baltık paganizmi',
  fin: 'Fin-Ugor paganizmi', maniheist: 'Maniheizm', bon: 'Bön ve Budizm', sih: 'Sihizm', laik: 'Dinsiz / laik',
};

const HAM = `AE:Arap/sunni AF:Peştun/sunni AL:Arnavut/sunni AM:Ermeni/dogu AO:Angolalı/katolik AR:Arjantinli/katolik AT:Avusturyalı/katolik AU:Avustralyalı/protestan
AZ:Azeri/sii BA:Boşnak/sunni BD:Bengalli/sunni BE:Belçikalı/katolik BF:Burkinalı/sunni BG:Bulgar/ortodoks BH:Arap/sii BI:Burundili/katolik BJ:Beninli/yerel BN:Malay/sunni
BO:Bolivyalı/katolik BR:Brezilyalı/katolik BS:Bahamalı/protestan BT:Bhutanlı/budist BW:Tswana/protestan BY:Belarus/ortodoks BZ:Belizeli/katolik CA:Kanadalı/protestan
CD:Kongolu/katolik CF:Orta Afrikalı/katolik CG:Kongolu/katolik CH:İsviçreli/protestan CI:Fildişili/sunni CL:Şilili/katolik CM:Kamerunlu/katolik CN:Çinli/cin CO:Kolombiyalı/katolik
CR:Kostarikalı/katolik CU:Kübalı/katolik CV:Yeşil Burunlu/katolik CY:Rum/ortodoks CZ:Çek/katolik DE:Alman/protestan DJ:Cibutili/sunni DK:Danimarkalı/protestan DO:Dominikli/katolik
DZ:Cezayirli/sunni EC:Ekvadorlu/katolik EE:Estonyalı/protestan EG:Mısırlı/sunni EH:Sahravi/sunni ER:Eritreli/dogu ES:İspanyol/katolik ET:Habeş/dogu FI:Fin/protestan
FJ:Fijili/protestan FR:Fransız/katolik GA:Gabonlu/katolik GB:İngiliz/protestan GE:Gürcü/ortodoks GH:Ganalı/protestan GL:İnuit/protestan GM:Gambiyalı/sunni GN:Gineli/sunni
GQ:Ekvator Gineli/katolik GR:Rum/ortodoks GT:Guatemalalı/katolik GW:Gine-Bissaulu/sunni GY:Guyanalı/protestan HN:Honduraslı/katolik HR:Hırvat/katolik HT:Haitili/katolik
HU:Macar/katolik ID:Endonezyalı/sunni IE:İrlandalı/katolik IL:Yahudi/yahudi IN:Hintli/hindu IQ:Iraklı/sii IR:Fars/sii IS:İzlandalı/protestan IT:İtalyan/katolik JM:Jamaikalı/protestan
JO:Ürdünlü/sunni JP:Japon/sinto KE:Kenyalı/protestan KG:Kırgız/sunni KH:Kmer/budist KK:Kıbrıslı Türk/sunni KM:Komorlu/sunni KP:Koreli/budist KR:Koreli/budist KW:Kuveytli/sunni
KZ:Kazak/sunni LA:Laolu/budist LB:Lübnanlı/sunni LK:Sinhala/budist LR:Liberyalı/protestan LS:Sotho/protestan LT:Litvan/katolik LU:Lüksemburglu/katolik LV:Leton/protestan
LY:Libyalı/sunni MA:Faslı/sunni MD:Moldovalı/ortodoks ME:Karadağlı/ortodoks MG:Malgaş/protestan MK:Makedon/ortodoks ML:Malili/sunni MM:Bamar/budist MN:Moğol/budist
MR:Moritanyalı/sunni MT:Maltalı/katolik MU:Morityuslu/hindu MW:Malavili/protestan MX:Meksikalı/katolik MY:Malay/sunni MZ:Mozambikli/katolik NA:Namibyalı/protestan NE:Nijerli/sunni
NG:Nijeryalı/sunni NI:Nikaragualı/katolik NL:Hollandalı/protestan NO:Norveçli/protestan NP:Nepalli/hindu NZ:Yeni Zelandalı/protestan OM:Ummanlı/ibazi PA:Panamalı/katolik
PE:Perulu/katolik PG:Papualı/protestan PH:Filipinli/katolik PK:Pakistanlı/sunni PL:Leh/katolik PR:Porto Rikolu/katolik PS:Filistinli/sunni PT:Portekizli/katolik PY:Paraguaylı/katolik
QA:Katarlı/sunni RO:Romen/ortodoks RS:Sırp/ortodoks RU:Rus/ortodoks RW:Ruandalı/katolik SA:Arap/sunni SB:Solomon Adalı/protestan SD:Sudanlı/sunni SE:İsveçli/protestan
SG:Singapurlu/budist SI:Sloven/katolik SK:Slovak/katolik SL:Sierra Leoneli/sunni SN:Volof/sunni SO:Somali/sunni SR:Surinamlı/protestan SS:Güney Sudanlı/protestan SV:Salvadorlu/katolik
SY:Suriyeli/sunni SZ:Svazi/protestan TD:Çadlı/sunni TG:Togolu/yerel TH:Tay/budist TJ:Tacik/sunni TL:Timorlu/katolik TM:Türkmen/sunni TN:Tunuslu/sunni TR:Türk/sunni
TT:Trinidadlı/protestan TW:Tayvanlı/cin TZ:Tanzanyalı/sunni UA:Ukraynalı/ortodoks UG:Ugandalı/protestan US:Amerikalı/protestan UY:Uruguaylı/katolik UZ:Özbek/sunni
VE:Venezuelalı/katolik VN:Vietnamlı/budist VU:Vanuatulu/protestan WS:Samoalı/protestan XK:Arnavut/sunni YE:Yemenli/sunni ZA:Güney Afrikalı/protestan ZM:Zambiyalı/protestan ZW:Şona/protestan`;

export function kulturTablosu(ham: string): Record<string, [string, string]> {
  const out: Record<string, [string, string]> = {};
  for (const t of ham.split(/\s+(?=[A-Z]{2}:)/)) {
    const m = /^([A-Z]{2}):(.+)\/([a-z]+)$/.exec(t.trim());
    if (m) out[m[1]!] = [m[2]!, m[3]!];
  }
  return out;
}
export const MODERN = kulturTablosu(HAM);

/** Kültür grubu (dil ailesi): bütünleşme ve iddia hesaplarında yakınlık. */
export function kulturGrup(ad: string): number {
  const g: [number, string[]][] = [
    [0, ['Fransız', 'İtalyan', 'İspanyol', 'Portekizli', 'Romen', 'Latin', 'Lombard', 'Kastilyalı', 'Katalan', 'Moldovalı', 'Valon', 'Gallo-Romen', 'Napolili', 'Venedikli', 'Toskanalı', 'Sicilyalı', 'Ceneviz', 'Savoyalı', 'Akitanyalı']],
    [1, ['Alman', 'Frank', 'Sakson', 'Bavyeralı', 'Avusturyalı', 'İngiliz', 'Anglo-Sakson', 'Hollandalı', 'Flaman', 'Felemenkli', 'Danimarkalı', 'Norveçli', 'İsveçli', 'İzlandalı', 'Dan', 'Svea', 'Got', 'Friz', 'İskoç', 'İsviçreli', 'Lüksemburglu', 'Amerikalı', 'Kanadalı', 'Avustralyalı', 'Yeni Zelandalı', 'Belçikalı', 'Boer']],
    [2, ['Rus', 'Ukraynalı', 'Belarus', 'Leh', 'Çek', 'Slovak', 'Sırp', 'Hırvat', 'Sloven', 'Bulgar', 'Makedon', 'Karadağlı', 'Boşnak', 'Slav', 'Doğu Slav', 'Rusen', 'Kazak Kozak']],
    [3, ['Türk', 'Türkmen', 'Azeri', 'Kazak', 'Kırgız', 'Özbek', 'Tatar', 'Uygur', 'Oğuz', 'Karluk', 'Hazar', 'Kıpçak', 'Kıbrıslı Türk', 'Göktürk', 'Bulgar Türkü', 'Başkurt', 'Yakut', 'Kırım Tatarı', 'Nogay']],
    [4, ['Arap', 'Mısırlı', 'Suriyeli', 'Iraklı', 'Lübnanlı', 'Ürdünlü', 'Filistinli', 'Yemenli', 'Kuveytli', 'Katarlı', 'Ummanlı', 'Libyalı', 'Tunuslu', 'Cezayirli', 'Faslı', 'Sudanlı', 'Yahudi', 'Süryani', 'Kıpti', 'Sahravi', 'Moritanyalı', 'Berberi', 'Habeş', 'Eritreli', 'Amhara', 'Somali', 'Cibutili', 'Maltalı']],
    [5, ['Fars', 'Peştun', 'Tacik', 'Kürt', 'Soğd', 'Horasanlı', 'Belucî', 'Afgan']],
    [6, ['Hintli', 'Bengalli', 'Pakistanlı', 'Pencaplı', 'Nepalli', 'Sinhala', 'Tamil', 'Maratha', 'Racput', 'Morityuslu', 'Hindustani', 'Gucarati', 'Kannada', 'Telugu', 'Oriya', 'Keşmirli', 'Sindhi', 'Bhutanlı']],
    [7, ['Çinli', 'Han', 'Tayvanlı', 'Singapurlu', 'Tibetli', 'Mançu', 'Moğol']],
    [8, ['Japon', 'Koreli', 'Ainu', 'Emişi']],
    [9, ['Vietnamlı', 'Tay', 'Kmer', 'Laolu', 'Bamar', 'Malay', 'Endonezyalı', 'Cava', 'Filipinli', 'Mon', 'Çam', 'Pyu', 'Timorlu', 'Malgaş']],
    [12, ['Rum', 'Yunan', 'Bizanslı']],
    [13, ['Macar', 'Fin', 'Estonyalı', 'Avar', 'Fin-Ugor', 'Sami', 'Leton', 'Litvan', 'Prusyalı', 'Balt']],
    [14, ['Ermeni', 'Gürcü', 'Arnavut', 'Çerkes', 'Kafkas', 'İrlandalı', 'Galli', 'Pikt', 'Bask', 'Kelt']],
  ];
  for (const [n, l] of g) if (l.includes(ad)) return n;
  return 10;
}
