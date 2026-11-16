"""V1.7 R2 oyun içeriği TASARIM verisi için statik kontrol. Repo build testi değildir."""
from pathlib import Path
import csv, json
ROOT=Path(__file__).resolve().parents[1]
V=ROOT/'veri'
def read(n):return json.loads((V/n).read_text(encoding='utf-8'))

g=read('1914_ulusal_hedefler.json');e=read('1914_olay_aglari.json')
assert g['status']=='DESIGN_ONLY_NOT_IMPLEMENTED'
assert e['status']=='DESIGN_ONLY_NOT_IMPLEMENTED'
assert len(g['goals'])==g['goalCount']==64
assert len(e['events'])==e['eventCount']==36
assert len({i['id'] for i in g['goals']})==64
assert len({i['id'] for i in e['events']})==36
countries={'GER','FRA','GBR','RUS','AUH','OSM','SRB','BEL','ITA','BUL','ROM','JAP','USA','GRE','NLD','SWE'}
assert {x['country'] for x in g['goals']}==countries
assert all(x['country'] in countries and x['sourceStatus']=='design_proposal' for x in e['events'])
assert all(len(x['options'])>=2 and all(y['effects'][0]['requiresValidation'] for y in x['options']) for x in e['events'])
assert all(not x['historicalOutcomeMandatory'] for x in e['events'])
assert all(any('country_active'==p['type'] for p in x['conditionsAll']) for x in e['events'])
assert len({x['eventKey'] for x in e['events']})==len(e['events'])
for n in ['1914_kaynak_tesis_katalogu.json','1914_isimli_ekipman_ve_ornek_receteler.json','diplomasi_istihbarat_emir_katalogu.json']:
 d=read(n);assert d['status']=='DESIGN_ONLY'
with (ROOT/'testler/kabul_matrisi_v17_R2.csv').open('r',encoding='utf-8-sig',newline='') as f: r=list(csv.DictReader(f))
assert len(r)==154
assert len({a['Test_ID'] for a in r})==154
assert sum(x['Köken']=='V17_R1_ORIGINAL' for x in r)==77
assert sum(x['Köken']=='R2_ADDED' for x in r)==77
assert all(x['Durum']=='NOT_RUN' for x in r)
print('PASS: 64 goals / 16 countries / 36 events / 154 acceptance tests; catalogs valid; all UNIMPLEMENTED/NOT_RUN.')
