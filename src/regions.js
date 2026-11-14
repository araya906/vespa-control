export const REGIONS = {
  generic: {
    name: { en: "Generic (any country)", es: "Genérico (cualquier país)", eu: "Orokorra (edozein herrialde)" },
    center: [48, 5],
    zoom: 4,
    species: {
      velutina: {
        en: "Invasive alien species in most of Europe. Check local rules before acting.",
        es: "Especie exótica invasora en casi toda Europa. Consulta la normativa local antes de actuar.",
        eu: "Espezie exotiko inbaditzailea Europa ia osoan. Kontsultatu tokiko araudia ezer egin aurretik."
      },
      orientalis: {
        en: "Native to south-east Europe, the Middle East and North Africa; invasive elsewhere. Check local status.",
        es: "Nativa del sudeste de Europa, Oriente Medio y norte de África; invasora en otras zonas. Consulta su situación local.",
        eu: "Europa hego-ekialdeko, Ekialde Hurbileko eta Afrika iparraldeko bertakoa; beste eremu batzuetan inbaditzailea. Kontsultatu tokiko egoera."
      },
      crabro: {
        en: "Native European hornet. Do not destroy its nests; it is not the target.",
        es: "Avispón europeo nativo. No destruyas sus nidos; no es la especie objetivo.",
        eu: "Liztor europarra, bertakoa. Ez suntsitu bere habiak; ez da helburuko espeziea."
      }
    },
    report: {
      en: "Report nests to the local authority responsible for invasive species or pest control. Never try to remove a nest yourself.",
      es: "Comunica los nidos a la autoridad local de especies invasoras o control de plagas. Nunca intentes retirar un nido por tu cuenta.",
      eu: "Jakinarazi habiak espezie inbaditzaileez edo izurriteen kontrolaz arduratzen den tokiko agintariari. Ez saiatu inoiz habia bat zure kabuz kentzen."
    },
    links: [],
    sources: []
  },
  ES: {
    name: { en: "Spain", es: "España", eu: "Espainia" },
    center: [40.2, -3.7],
    zoom: 6,
    species: {
      velutina: {
        en: "Listed in the Spanish Catalogue of Invasive Alien Species (Real Decreto 630/2013) and of Union concern in the EU (Reg. 2016/1141). Possession, transport and release are banned.",
        es: "Incluida en el Catálogo Español de Especies Exóticas Invasoras (Real Decreto 630/2013) y de preocupación para la Unión Europea (Reglamento 2016/1141). Prohibida su posesión, transporte y liberación.",
        eu: "Espezie Exotiko Inbaditzaileen Espainiako Katalogoan dago (630/2013 Errege Dekretua) eta Europar Batasunarentzat kezkagarria da (2016/1141 Erregelamendua). Debekatuta dago edukitzea, garraiatzea eta askatzea."
      },
      orientalis: {
        en: "Added to the Spanish Catalogue of Invasive Alien Species by Orden TED/452/2025 (BOE 12 May 2025). Presence must be reported to the competent authority.",
        es: "Incluida en el Catálogo Español de Especies Exóticas Invasoras por la Orden TED/452/2025 (BOE de 12 de mayo de 2025). Su presencia debe comunicarse a la autoridad competente.",
        eu: "Espezie Exotiko Inbaditzaileen Espainiako Katalogoan sartu zen TED/452/2025 Aginduaren bidez (BOE, 2025eko maiatzaren 12a). Haren presentzia agintari eskudunari jakinarazi behar zaio."
      },
      crabro: {
        en: "Native European hornet. Do not destroy its nests.",
        es: "Avispón europeo, especie nativa. No destruyas sus nidos.",
        eu: "Liztor europarra, bertako espeziea. Ez suntsitu bere habiak."
      }
    },
    report: {
      en: "Report nests to your town council or your autonomous community's environment service. If a nest is an immediate danger to people, call 112. Never try to remove a nest yourself.",
      es: "Comunica los nidos a tu ayuntamiento o al servicio de medio ambiente de tu comunidad autónoma. Si un nido supone un peligro inmediato para las personas, llama al 112. Nunca intentes retirar un nido por tu cuenta.",
      eu: "Jakinarazi habiak zure udalari edo zure autonomia-erkidegoko ingurumen-zerbitzuari. Habia batek pertsonentzat berehalako arriskua badakar, deitu 112ra. Ez saiatu inoiz habia bat zure kabuz kentzen."
    },
    links: [
      {
        label: { en: "National strategy for Vespa velutina (MITECO)", es: "Estrategia nacional de Vespa velutina (MITECO)", eu: "Vespa velutina-ren estrategia nazionala (MITECO)" },
        url: "https://www.miteco.gob.es/content/dam/miteco/es/biodiversidad/publicaciones/estrategias/estrategia_vespavelutina_tcm30-69976.pdf"
      },
      {
        label: { en: "Real Decreto 630/2013 (BOE)", es: "Real Decreto 630/2013 (BOE)", eu: "630/2013 Errege Dekretua (BOE)" },
        url: "https://www.boe.es/buscar/act.php?id=BOE-A-2013-8565"
      },
      {
        label: { en: "Orden TED/452/2025 (BOE)", es: "Orden TED/452/2025 (BOE)", eu: "TED/452/2025 Agindua (BOE)" },
        url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-9192"
      }
    ],
    sources: ["BOE-A-2013-8565", "BOE-A-2025-9192", "Commission Implementing Regulation (EU) 2016/1141"]
  }
};
export function regionText(field, lang) {
  if (!field) return "";
  return field[lang] || field.es || field.en || "";
}
