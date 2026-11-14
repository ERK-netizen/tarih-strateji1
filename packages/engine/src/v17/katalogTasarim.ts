// v1.7 R2 tasarım kataloğu (docs/v17/tasarim/veri/*.json'dan üretilmiştir; elle düzenlemeyin).
// Ekipman adı/tarihi tarihî doğrulanmamış tasarım verisidir, reçete miktarları denge ayarı değil kalibrasyon örneğidir.
export interface V17Model {id:string;ad:string;aile:string;ulkeler:readonly string[];yil:number;girdi:Readonly<Record<string,number>>;makineDk:number;iscilikDk:number;enerjiMJ:number}
export const MODELLER_TASARIM:readonly V17Model[]=[
 {"id": "gew98", "ad": "Gewehr 98", "aile": "Tüfek", "ulkeler": ["GER"], "yil": 1898, "girdi": {"steel": 4, "machine_parts": 1}, "makineDk": 600, "iscilikDk": 480, "enerjiMJ": 4},
 {"id": "smle_mk3", "ad": "SMLE Mk III", "aile": "Tüfek", "ulkeler": ["GBR"], "yil": 1907, "girdi": {"steel": 4, "machine_parts": 1}, "makineDk": 600, "iscilikDk": 480, "enerjiMJ": 4},
 {"id": "mosin_m1891", "ad": "Mosin–Nagant M1891", "aile": "Tüfek", "ulkeler": ["RUS"], "yil": 1891, "girdi": {"steel": 4, "machine_parts": 1}, "makineDk": 600, "iscilikDk": 480, "enerjiMJ": 4},
 {"id": "lebel_m1886", "ad": "Lebel M1886/93", "aile": "Tüfek", "ulkeler": ["FRA"], "yil": 1886, "girdi": {"steel": 4, "machine_parts": 1}, "makineDk": 600, "iscilikDk": 480, "enerjiMJ": 4},
 {"id": "mauser_m1903", "ad": "Mauser M1903", "aile": "Tüfek", "ulkeler": ["OSM"], "yil": 1903, "girdi": {"steel": 4, "machine_parts": 1}, "makineDk": 600, "iscilikDk": 480, "enerjiMJ": 4},
 {"id": "mg08", "ad": "MG 08", "aile": "Makineli tüfek", "ulkeler": ["GER"], "yil": 1908, "girdi": {"steel": 35, "machine_parts": 10}, "makineDk": 2400, "iscilikDk": 3500, "enerjiMJ": 12},
 {"id": "vickers_mk1", "ad": "Vickers Mk I", "aile": "Makineli tüfek", "ulkeler": ["GBR"], "yil": 1912, "girdi": {"steel": 32, "machine_parts": 10}, "makineDk": 2400, "iscilikDk": 3500, "enerjiMJ": 12},
 {"id": "fk96", "ad": "7,7 cm FK 96 n.A.", "aile": "Sahra topu", "ulkeler": ["GER"], "yil": 1905, "girdi": {"steel": 170, "machine_parts": 80}, "makineDk": 2400, "iscilikDk": 3500, "enerjiMJ": 12},
 {"id": "mle1897", "ad": "Canon de 75 modèle 1897", "aile": "Sahra topu", "ulkeler": ["FRA"], "yil": 1897, "girdi": {"steel": 160, "machine_parts": 70}, "makineDk": 2400, "iscilikDk": 3500, "enerjiMJ": 12},
 {"id": "qf18", "ad": "QF 18-pounder", "aile": "Sahra topu", "ulkeler": ["GBR"], "yil": 1904, "girdi": {"steel": 170, "machine_parts": 80}, "makineDk": 2400, "iscilikDk": 3500, "enerjiMJ": 12},
 {"id": "sfh13", "ad": "15 cm sFH 13", "aile": "Ağır top", "ulkeler": ["GER"], "yil": 1913, "girdi": {"steel": 330, "machine_parts": 130}, "makineDk": 2400, "iscilikDk": 3500, "enerjiMJ": 12},
 {"id": "be2", "ad": "Royal Aircraft Factory B.E.2", "aile": "Keşif uçağı", "ulkeler": ["GBR"], "yil": 1912, "girdi": {"timber": 230, "machine_parts": 60}, "makineDk": 2400, "iscilikDk": 3500, "enerjiMJ": 12},
 {"id": "etrich_taube", "ad": "Etrich Taube", "aile": "Keşif uçağı", "ulkeler": ["GER", "AUH"], "yil": 1910, "girdi": {"timber": 230, "machine_parts": 65}, "makineDk": 2400, "iscilikDk": 3500, "enerjiMJ": 12},
 {"id": "fokker_e1", "ad": "Fokker E.I", "aile": "Avcı uçağı", "ulkeler": ["GER"], "yil": 1915, "girdi": {"timber": 260, "machine_parts": 90}, "makineDk": 2400, "iscilikDk": 3500, "enerjiMJ": 12},
 {"id": "mark1_tank", "ad": "Mark I tank", "aile": "Tank", "ulkeler": ["GBR"], "yil": 1916, "girdi": {"steel": 480, "machine_parts": 210}, "makineDk": 2400, "iscilikDk": 3500, "enerjiMJ": 12},
 {"id": "renault_ft", "ad": "Renault FT", "aile": "Tank", "ulkeler": ["FRA"], "yil": 1917, "girdi": {"steel": 380, "machine_parts": 160}, "makineDk": 2400, "iscilikDk": 3500, "enerjiMJ": 12},
] as const;
export interface V17Kaynak {id:string;ad:string;kademe:string;birim:string}
export const KAYNAKLAR_TASARIM:readonly V17Kaynak[]=[
 {"id": "iron_ore", "ad": "Demir cevheri", "kademe": "raw", "birim": "kg"},
 {"id": "coal", "ad": "Kömür", "kademe": "raw", "birim": "kg"},
 {"id": "copper_ore", "ad": "Bakır cevheri", "kademe": "raw", "birim": "kg"},
 {"id": "crude_oil", "ad": "Ham petrol", "kademe": "raw", "birim": "kg"},
 {"id": "timber", "ad": "Kereste girdisi", "kademe": "raw", "birim": "kg"},
 {"id": "nitrate", "ad": "Nitrat/kimyasal girdi", "kademe": "raw", "birim": "kg"},
 {"id": "steel", "ad": "Çelik", "kademe": "processed", "birim": "kg"},
 {"id": "copper", "ad": "Bakır", "kademe": "processed", "birim": "kg"},
 {"id": "refined_fuel", "ad": "Rafine yakıt", "kademe": "processed", "birim": "kg"},
 {"id": "steam_energy", "ad": "Buhar enerjisi", "kademe": "processed", "birim": "mj"},
 {"id": "chemicals", "ad": "Kimyasallar", "kademe": "processed", "birim": "kg"},
 {"id": "machine_parts", "ad": "Makine parçaları", "kademe": "processed", "birim": "count"},
] as const;
export interface V17TesisTuru {id:string;ad:string;sektor:string;cikti:readonly string[];yuva:number}
export const TESISLER_TASARIM:readonly V17TesisTuru[]=[
 {"id": "coal_mine", "ad": "Kömür madeni", "sektor": "civil", "cikti": ["coal"], "yuva": 1},
 {"id": "iron_mine", "ad": "Demir cevheri madeni", "sektor": "civil", "cikti": ["iron_ore"], "yuva": 1},
 {"id": "copper_mine", "ad": "Bakır madeni", "sektor": "civil", "cikti": ["copper_ore"], "yuva": 1},
 {"id": "oil_field", "ad": "Petrol sahası", "sektor": "civil", "cikti": ["crude_oil"], "yuva": 1},
 {"id": "steelworks", "ad": "Demir çelik tesisi", "sektor": "civil", "cikti": ["steel"], "yuva": 2},
 {"id": "refinery", "ad": "Rafineri", "sektor": "civil", "cikti": ["refined_fuel"], "yuva": 2},
 {"id": "chemical_plant", "ad": "Kimya fabrikası", "sektor": "civil", "cikti": ["chemicals"], "yuva": 2},
 {"id": "machine_shop", "ad": "Makine ve takım tezgahı", "sektor": "civil", "cikti": ["machine_parts"], "yuva": 2},
 {"id": "textile_mill", "ad": "Tekstil fabrikası", "sektor": "civil", "cikti": ["clothing"], "yuva": 1},
 {"id": "food_plant", "ad": "Gıda işleme", "sektor": "civil", "cikti": ["processed_food"], "yuva": 1},
 {"id": "rail_works", "ad": "Demiryolu atölyesi", "sektor": "civil", "cikti": ["rail_equipment"], "yuva": 2},
 {"id": "power_station", "ad": "Enerji tesisi", "sektor": "civil", "cikti": ["steam_energy"], "yuva": 1},
 {"id": "shipyard_civil", "ad": "Sivil tersane", "sektor": "civil", "cikti": ["cargo_vessel"], "yuva": 3},
 {"id": "warehouse", "ad": "Depo", "sektor": "civil", "cikti": [], "yuva": 1},
 {"id": "rifle_factory", "ad": "Hafif silah fabrikası", "sektor": "military", "cikti": ["rifle"], "yuva": 2},
 {"id": "mg_factory", "ad": "Makineli tüfek atölyesi", "sektor": "military", "cikti": ["machine_gun"], "yuva": 2},
 {"id": "small_ammo", "ad": "Fişek fabrikası", "sektor": "military", "cikti": ["small_ammo"], "yuva": 2},
 {"id": "shell_plant", "ad": "Top mermisi fabrikası", "sektor": "military", "cikti": ["artillery_shell"], "yuva": 2},
 {"id": "field_artillery", "ad": "Saha topu fabrikası", "sektor": "military", "cikti": ["field_gun"], "yuva": 3},
 {"id": "heavy_artillery", "ad": "Ağır topçu dökümhanesi", "sektor": "military", "cikti": ["heavy_gun"], "yuva": 3},
 {"id": "airframe_factory", "ad": "Uçak gövde atölyesi", "sektor": "military", "cikti": ["airframe"], "yuva": 3},
 {"id": "engine_factory", "ad": "Motor fabrikası", "sektor": "military", "cikti": ["engine"], "yuva": 2},
 {"id": "military_shipyard", "ad": "Askerî tersane", "sektor": "military", "cikti": ["warship"], "yuva": 4},
 {"id": "submarine_yard", "ad": "Denizaltı üretim kızağı", "sektor": "military", "cikti": ["submarine"], "yuva": 4},
 {"id": "maintenance_depot", "ad": "Askerî onarım deposu", "sektor": "military", "cikti": ["repair"], "yuva": 1},
 {"id": "signals_works", "ad": "Haberleşme teçhizatı", "sektor": "military", "cikti": ["radio_wire"], "yuva": 1},
] as const;
/** Model bu ülke ve yılda kullanılabilir mi? (ülke kapısı + ilk yıl; lisans/ele geçirme sonraki sürümdür) */
export const modelKullanilabilir=(m:V17Model,ulkeKod:string,yil:number):boolean=>m.ulkeler.includes(ulkeKod)&&yil>=m.yil;
/**
 * Tasarım ailesi → mevcut oyun ürünü. Adlı model, eski üretim hattının çıktısına ad verir; yeni bir üretim hattı kurmaz (çifte üretim yok).
 * 'ekip': EKIPMAN kodu; 'ucak': HAVA tür dizini. Tank ailesinin 1914 oyun karşılığı yoktur.
 */
export const AILE_URUN:Readonly<Record<string,{tur:'ekip'|'ucak';kod:string|number}|undefined>>={
  'Tüfek':{tur:'ekip',kod:'psil1'},'Makineli tüfek':{tur:'ekip',kod:'mt'},'Sahra topu':{tur:'ekip',kod:'sahra'},'Ağır top':{tur:'ekip',kod:'agir1'},
  'Keşif uçağı':{tur:'ucak',kod:2},'Avcı uçağı':{tur:'ucak',kod:0},
};
