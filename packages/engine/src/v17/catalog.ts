import type {V17EquipmentModel} from './state.ts';
/** Historical labels are illustrative, not independently source-verified; dates need historical QA. */
export const MODELS_1914:readonly V17EquipmentModel[]=[
 {id:'GER_GEWEHR98',label:'Gewehr 98',era:'buyuk',family:0,firstYear:1898,inputSteel:4,inputCoal:3,labor:6,machine:4},
 {id:'GBR_SMLE3',label:'SMLE Mk III',era:'buyuk',family:0,firstYear:1907,inputSteel:4,inputCoal:3,labor:7,machine:5},
 {id:'GER_MG08',label:'MG 08',era:'buyuk',family:3,firstYear:1908,inputSteel:21,inputCoal:13,labor:31,machine:24},
 {id:'FRA_75MM',label:'Canon de 75 modèle 1897',era:'buyuk',family:5,firstYear:1897,inputSteel:240,inputCoal:170,labor:130,machine:120},
 {id:'GBR_BE2',label:'Royal Aircraft Factory B.E.2',era:'buyuk',family:7,firstYear:1912,inputSteel:450,inputCoal:280,labor:210,machine:230},
];
export const PORTFOLIOS=['ekonomi','arastirma','uretim','ordu','insa'] as const;
