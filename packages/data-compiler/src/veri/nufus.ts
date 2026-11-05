// Nüfus verisi (derleme zamanı). 2025 tahminleri (milyon, BM WPP 2024 yuvarlak değerleri) ve dönem çarpanları.
// Tarihî değerler McEvedy & Jones (1978), Maddison ve ulusal sayımların yuvarlak tahminlerine dayanır;
// modern sınırlar içinde hesaplanmış yaklaşık değerlerdir.

export const POP2025: Record<string, number> = {
  AE: 11, AF: 42, AL: 2.8, AM: 3, AO: 37, AR: 46, AT: 9.1, AU: 27, AZ: 10.2, BA: 3.2, BD: 174, BE: 11.8, BF: 23.5, BG: 6.4, BH: 1.6, BI: 14, BJ: 14.5,
  BN: 0.46, BO: 12.5, BR: 213, BS: 0.4, BT: 0.79, BW: 2.6, BY: 9.1, BZ: 0.42, CA: 40, CD: 109, CF: 5.5, CG: 6.3, CH: 9, CI: 31, CL: 19.8, CM: 29,
  CN: 1409, CO: 53, CR: 5.2, CU: 10.9, CV: 0.53, CY: 0.95, CZ: 10.9, DE: 84, DJ: 1.2, DK: 6, DO: 11.4, DZ: 47, EC: 18.3, EE: 1.37, EG: 117, EH: 0.6,
  ER: 3.6, ES: 48.6, ET: 132, FI: 5.6, FJ: 0.93, FR: 68.5, GA: 2.5, GB: 69, GE: 3.7, GH: 35, GL: 0.057, GM: 2.8, GN: 14.7, GQ: 1.9, GR: 10.3, GT: 18.7,
  GW: 2.2, GY: 0.83, HN: 11, HR: 3.85, HT: 11.9, HU: 9.6, ID: 284, IE: 5.3, IL: 9.9, IN: 1450, IQ: 46, IR: 91, IS: 0.39, IT: 59, JM: 2.8, JO: 11.5,
  JP: 123.5, KE: 57, KG: 7.2, KH: 17.6, KK: 0.38, KM: 0.88, KP: 26.5, KR: 51.7, KW: 4.9, KZ: 20.6, LA: 7.8, LB: 5.8, LK: 22, LR: 5.6, LS: 2.35, LT: 2.85,
  LU: 0.67, LV: 1.85, LY: 7.4, MA: 38, MD: 2.4, ME: 0.62, MG: 32, MK: 1.8, ML: 24.5, MM: 54.5, MN: 3.5, MR: 5.2, MT: 0.54, MU: 1.27, MW: 21.7, MX: 131,
  MY: 35.5, MZ: 35, NA: 3.1, NE: 27, NG: 230, NI: 7, NL: 18, NO: 5.6, NP: 29.6, NZ: 5.3, OM: 5.3, PA: 4.5, PE: 34.5, PG: 10.5, PH: 116, PK: 251,
  PL: 36.6, PR: 3.2, PS: 5.5, PT: 10.7, PY: 6.9, QA: 3.1, RO: 19, RS: 6.6, RU: 144, RW: 14.3, SA: 34, SB: 0.82, SD: 50.5, SE: 10.6, SG: 6, SI: 2.1,
  SK: 5.4, SL: 8.6, SN: 18.5, SO: 19, SR: 0.63, SS: 11.9, SV: 6.3, SY: 24.5, SZ: 1.24, TD: 20.3, TG: 9.5, TH: 71.6, TJ: 10.6, TL: 1.4, TM: 7.5, TN: 12.3,
  TR: 86, TT: 1.5, TW: 23.4, TZ: 68.5, UA: 37, UG: 50, US: 340, UY: 3.4, UZ: 36.5, VE: 28.4, VN: 101, VU: 0.33, WS: 0.22, XK: 1.6, YE: 40.5, ZA: 64,
  ZM: 21.3, ZW: 16.6,
};

export type Donem = '750' | '1600' | '1914' | '1939' | '2026';

// Grup → tarihî nüfus (milyon, modern sınırlar içinde). Grup içinde 2025 oranıyla bölüşülür.
const TARIHI: Record<Exclude<Donem, '2026'>, [string, number][]> = {
  '750': [
    ['IT', 4], ['FR', 5.5], ['ES', 3.5], ['PT', 0.5], ['DE', 3], ['AT', 0.4], ['CH', 0.3], ['NL', 0.25], ['BE LU', 0.4], ['GB', 1.1], ['IE', 0.5], ['DK', 0.25], ['NO', 0.15],
    ['SE', 0.25], ['FI', 0.05], ['EE LV LT', 0.3], ['PL', 1], ['CZ SK', 0.6], ['HU', 0.4], ['RO MD', 1], ['BG', 0.7], ['RS BA HR SI ME MK XK', 1.2], ['AL', 0.2], ['GR', 1],
    ['TR', 7], ['CY KK', 0.15], ['MT', 0.02], ['IS', 0.0005], ['RU', 3], ['UA', 1.5], ['BY', 0.5], ['GE AM AZ', 1.5], ['UZ TM TJ KG', 3], ['KZ', 0.5], ['AF', 2], ['IR', 4.5],
    ['IQ', 2.5], ['SY LB IL PS JO', 3.5], ['SA', 1.5], ['YE', 1.2], ['OM AE QA BH KW', 0.5], ['EG', 2.7], ['LY', 0.4], ['TN', 1], ['DZ', 1.5], ['MA', 1.5], ['EH MR', 0.15],
    ['ET ER DJ SO', 3], ['SD SS', 1], ['IN PK BD', 45], ['NP BT LK', 1.5], ['CN', 52], ['TW', 0.2], ['JP', 4.5], ['KR KP', 2.5], ['MN', 0.5], ['VN', 1.5], ['KH LA TH MM', 5],
    ['MY ID PH SG BN TL', 6], ['MX', 7], ['GT BZ HN SV NI CR PA', 3], ['CU HT DO JM PR BS TT', 0.4], ['US CA GL', 2], ['PE BO EC', 4], ['CO VE GY SR BR AR CL PY UY', 2.5],
    ['AU', 0.3], ['NZ', 0.0001], ['PG SB VU FJ WS', 0.4], ['MG KM MU', 0.1],
  ],
  '1600': [
    ['IT', 13], ['FR', 19], ['ES', 8.5], ['PT', 1.1], ['DE', 12], ['AT', 1.8], ['CZ', 3], ['SK', 1], ['CH', 1], ['NL', 1.5], ['BE LU', 1.6], ['GB', 5.2], ['IE', 1.2], ['DK', 0.6],
    ['NO', 0.4], ['SE', 0.8], ['FI', 0.35], ['PL', 3.8], ['LT', 0.6], ['LV EE', 0.6], ['BY', 1.3], ['UA', 4], ['RU', 12], ['HU', 1.8], ['RO MD', 2], ['RS BA HR SI ME MK XK', 2.5],
    ['AL', 0.3], ['GR', 1.5], ['BG', 1.2], ['TR', 8], ['CY KK', 0.2], ['MT', 0.04], ['IS', 0.05], ['GE AM AZ', 1.5], ['SY LB IL PS JO', 2.3], ['IQ', 1.5], ['IR', 6], ['SA', 2], ['YE', 2],
    ['OM AE QA BH KW', 0.6], ['EG', 3], ['MA', 3], ['DZ', 2], ['TN', 1], ['LY', 0.5], ['EH MR', 0.3], ['UZ', 2.5], ['TM TJ KG', 1.7], ['KZ', 1], ['AF', 3], ['PK', 20], ['IN', 100], ['BD', 18],
    ['NP BT', 1.6], ['LK', 1], ['CN', 160], ['TW', 0.4], ['JP', 18], ['KR KP', 10], ['MN', 0.8], ['VN', 6], ['TH', 2.5], ['MM', 3], ['KH LA', 1.9], ['MY SG BN', 0.6], ['ID TL', 10],
    ['PH', 1], ['ET ER DJ SO', 5], ['SD SS', 2], ['NG', 10], ['MX', 2.5], ['GT BZ HN SV NI CR PA', 1], ['CU HT DO JM PR BS TT', 0.3], ['US CA GL', 1.5], ['PE BO EC', 2.5],
    ['CO VE GY SR', 1], ['BR', 1], ['AR CL PY UY', 1], ['AU', 0.4], ['NZ', 0.1], ['PG SB VU FJ WS', 1], ['MG KM MU', 1],
  ],
  '1914': [
    ['DE', 58], ['PL', 26], ['FR', 41.5], ['GB', 42], ['IE', 3.1], ['IT', 36], ['ES', 20.5], ['PT', 6], ['NL', 6.3], ['BE LU', 7.9], ['CH', 3.9], ['AT', 6.8], ['CZ', 10], ['SK', 3], ['HU', 7.6],
    ['RO MD', 15.5], ['BG', 4.7], ['RS BA HR SI ME MK XK', 12.5], ['AL', 0.8], ['GR', 5.5], ['TR', 15.5], ['CY KK', 0.3], ['MT', 0.22], ['IS', 0.09], ['RU', 90], ['UA', 32], ['BY', 7],
    ['LT', 2.8], ['LV', 2.5], ['EE', 1.1], ['FI', 3.1], ['SE', 5.6], ['NO', 2.4], ['DK', 2.8], ['GE AM AZ', 6], ['UZ TM TJ KG KZ', 11], ['AF', 6], ['IR', 10], ['IQ', 2.6],
    ['SY LB IL PS JO', 4], ['SA YE OM AE QA BH KW', 6], ['EG', 12.5], ['LY', 0.8], ['TN', 1.9], ['DZ', 5.5], ['MA', 5], ['IN PK BD', 315], ['NP BT', 5.8], ['LK', 4.6], ['CN', 430], ['JP', 52],
    ['KR KP', 17], ['TW', 3.5], ['MN', 0.7], ['VN', 16], ['TH', 8.5], ['MM', 12], ['KH', 2.5], ['LA', 0.8], ['MY SG BN', 3], ['ID TL', 50], ['PH', 9], ['US', 99], ['CA', 7.9],
    ['MX', 15], ['GT BZ HN SV NI CR PA', 4], ['CU HT DO JM PR BS TT', 6.5], ['BR', 24], ['AR', 7.9], ['CL', 3.5], ['PE', 4.5], ['CO', 5.5], ['VE', 2.8], ['BO EC PY UY GY SR', 6.5],
    ['AU', 4.9], ['NZ', 1.1], ['GL', 0.014],
  ],
  '1939': [
    ['DE', 62], ['PL', 30], ['FR', 41.6], ['GB', 47.5], ['IE', 3], ['IT', 44], ['ES', 25.5], ['PT', 7.6], ['NL', 8.8], ['BE LU', 8.7], ['CH', 4.2], ['AT', 6.7], ['CZ', 11], ['SK', 3.4],
    ['HU', 9.3], ['RO MD', 18], ['BG', 6.3], ['RS BA HR SI ME MK XK', 15.5], ['AL', 1.1], ['GR', 7.2], ['TR', 17.5], ['CY KK', 0.4], ['MT', 0.27], ['IS', 0.12], ['RU', 110], ['UA', 41],
    ['BY', 9], ['LT', 2.6], ['LV', 2], ['EE', 1.1], ['FI', 3.7], ['SE', 6.3], ['NO', 2.9], ['DK', 3.8], ['GE AM AZ', 8], ['UZ TM TJ KG KZ', 17], ['AF', 7], ['IR', 14], ['IQ', 4],
    ['SY LB IL PS JO', 6], ['SA YE OM AE QA BH KW', 8], ['EG', 16.5], ['LY', 0.9], ['TN', 2.6], ['DZ', 7.5], ['MA', 7.5], ['IN PK BD', 390], ['NP BT', 6.5], ['LK', 5.9], ['CN', 520],
    ['JP', 72], ['KR KP', 23], ['TW', 5.9], ['MN', 0.8], ['VN', 22], ['TH', 15], ['MM', 16], ['KH', 3], ['LA', 1], ['MY SG BN', 5], ['ID TL', 70], ['PH', 16], ['US', 131], ['CA', 11.3],
    ['MX', 19.5], ['GT BZ HN SV NI CR PA', 6.5], ['CU HT DO JM PR BS TT', 10], ['BR', 41], ['AR', 14], ['CL', 5], ['PE', 7], ['CO', 9], ['VE', 3.7], ['BO EC PY UY GY SR', 9],
    ['AU', 7], ['NZ', 1.6], ['GL', 0.018],
  ],
};
// Gruplanmamış ülkeler için kıta çarpanı (tarihî/2025)
const KITA: Record<Exclude<Donem, '2026'>, { afrika: number; amerika: number; okyanusya: number; diger: number }> = {
  '750': { afrika: 0.0167, amerika: 0.01, okyanusya: 0.03, diger: 0.03 },
  '1600': { afrika: 0.04, amerika: 0.012, okyanusya: 0.08, diger: 0.08 },
  '1914': { afrika: 0.09, amerika: 0.12, okyanusya: 0.1, diger: 0.15 },
  '1939': { afrika: 0.125, amerika: 0.2, okyanusya: 0.15, diger: 0.2 },
};

const AFRIKA = new Set('AO BF BI BJ BW CD CF CG CI CM CV DJ ER ET GA GH GM GN GQ GW KE KM LR LS MG ML MR MU MW MZ NA NE NG RW SD SL SN SO SS SZ TD TG TZ UG ZA ZM ZW EH'.split(' '));
const AMERIKA = new Set('AR BO BR BS BZ CA CL CO CR CU DO EC GT GY HN HT JM MX NI PA PE PR PY SR SV TT US UY VE GL'.split(' '));
const OKYANUSYA = new Set('AU NZ PG SB VU FJ WS'.split(' '));

/** Ülke nüfusu (kişi) — dönem için. */
export function ulkeNufus(d: Donem, iso: string): number {
  const p = POP2025[iso] ?? 0.5;
  if (d === '2026') return Math.round(p * 1e6);
  for (const [g, v] of TARIHI[d]) {
    const l = g.split(' ');
    if (!l.includes(iso)) continue;
    const top = l.reduce((s, k) => s + (POP2025[k] ?? 0.5), 0);
    return Math.round((v * 1e6 * p) / top);
  }
  const k = KITA[d];
  const c = AFRIKA.has(iso) ? k.afrika : AMERIKA.has(iso) ? k.amerika : OKYANUSYA.has(iso) ? k.okyanusya : k.diger;
  return Math.round(p * 1e6 * c);
}

/** Ülke içi dağılım üssü: modern kentleşme tarihî dönemde yumuşatılır. */
export const DAGILIM_US: Record<Donem, number> = { '750': 0.45, '1600': 0.5, '1914': 0.7, '1939': 0.8, '2026': 1 };
