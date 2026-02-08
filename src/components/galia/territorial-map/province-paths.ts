/**
 * Province SVG Paths for Spanish Autonomous Communities
 * Organized by CCAA for drill-down functionality
 */

export interface ProvinceData {
  id: string;
  name: string;
  ccaaId: string;
  path: string;
  labelPosition: { x: number; y: number };
  capital: string;
}

// Provinces organized by CCAA
// ViewBox per CCAA: 0 0 400 400
export const provincesByCCAA: Record<string, ProvinceData[]> = {
  'galicia': [
    {
      id: 'a-coruna',
      name: 'A Coruña',
      ccaaId: 'galicia',
      path: 'M50,50 L150,40 L180,80 L170,140 L130,180 L80,190 L40,160 L30,100 Z',
      labelPosition: { x: 105, y: 115 },
      capital: 'A Coruña'
    },
    {
      id: 'lugo',
      name: 'Lugo',
      ccaaId: 'galicia',
      path: 'M180,50 L280,45 L310,90 L300,160 L250,200 L180,210 L130,180 L150,100 Z',
      labelPosition: { x: 220, y: 125 },
      capital: 'Lugo'
    },
    {
      id: 'ourense',
      name: 'Ourense',
      ccaaId: 'galicia',
      path: 'M130,200 L250,190 L290,240 L280,320 L220,360 L140,350 L100,290 L110,230 Z',
      labelPosition: { x: 195, y: 275 },
      capital: 'Ourense'
    },
    {
      id: 'pontevedra',
      name: 'Pontevedra',
      ccaaId: 'galicia',
      path: 'M30,180 L100,170 L120,230 L110,300 L70,340 L30,320 L20,250 Z',
      labelPosition: { x: 70, y: 255 },
      capital: 'Pontevedra'
    }
  ],
  'cataluna': [
    {
      id: 'girona',
      name: 'Girona',
      ccaaId: 'cataluna',
      path: 'M200,30 L350,25 L380,80 L370,150 L300,180 L230,160 L190,100 Z',
      labelPosition: { x: 280, y: 100 },
      capital: 'Girona'
    },
    {
      id: 'lleida',
      name: 'Lleida',
      ccaaId: 'cataluna',
      path: 'M30,60 L190,50 L220,120 L200,200 L150,260 L60,270 L25,200 L20,120 Z',
      labelPosition: { x: 115, y: 160 },
      capital: 'Lleida'
    },
    {
      id: 'barcelona',
      name: 'Barcelona',
      ccaaId: 'cataluna',
      path: 'M200,160 L310,150 L360,200 L350,280 L280,320 L200,310 L170,250 L180,200 Z',
      labelPosition: { x: 265, y: 235 },
      capital: 'Barcelona'
    },
    {
      id: 'tarragona',
      name: 'Tarragona',
      ccaaId: 'cataluna',
      path: 'M60,270 L180,260 L210,320 L200,380 L120,390 L50,370 L40,310 Z',
      labelPosition: { x: 125, y: 325 },
      capital: 'Tarragona'
    }
  ],
  'andalucia': [
    {
      id: 'huelva',
      name: 'Huelva',
      ccaaId: 'andalucia',
      path: 'M20,100 L90,80 L120,130 L100,200 L50,220 L20,180 Z',
      labelPosition: { x: 70, y: 150 },
      capital: 'Huelva'
    },
    {
      id: 'sevilla',
      name: 'Sevilla',
      ccaaId: 'andalucia',
      path: 'M100,80 L180,70 L220,120 L200,200 L140,230 L90,210 L80,150 Z',
      labelPosition: { x: 150, y: 150 },
      capital: 'Sevilla'
    },
    {
      id: 'cadiz',
      name: 'Cádiz',
      ccaaId: 'andalucia',
      path: 'M50,230 L120,220 L140,280 L120,350 L60,370 L30,320 L35,270 Z',
      labelPosition: { x: 85, y: 295 },
      capital: 'Cádiz'
    },
    {
      id: 'cordoba',
      name: 'Córdoba',
      ccaaId: 'andalucia',
      path: 'M180,50 L270,40 L310,90 L300,160 L240,190 L180,180 L160,120 Z',
      labelPosition: { x: 235, y: 115 },
      capital: 'Córdoba'
    },
    {
      id: 'malaga',
      name: 'Málaga',
      ccaaId: 'andalucia',
      path: 'M140,270 L220,250 L260,300 L250,360 L180,380 L130,360 L125,310 Z',
      labelPosition: { x: 190, y: 315 },
      capital: 'Málaga'
    },
    {
      id: 'jaen',
      name: 'Jaén',
      ccaaId: 'andalucia',
      path: 'M270,40 L350,35 L380,90 L370,160 L310,180 L260,160 L250,100 Z',
      labelPosition: { x: 315, y: 105 },
      capital: 'Jaén'
    },
    {
      id: 'granada',
      name: 'Granada',
      ccaaId: 'andalucia',
      path: 'M260,180 L350,160 L380,220 L370,300 L300,330 L240,310 L230,250 Z',
      labelPosition: { x: 305, y: 245 },
      capital: 'Granada'
    },
    {
      id: 'almeria',
      name: 'Almería',
      ccaaId: 'andalucia',
      path: 'M320,280 L390,260 L400,320 L380,380 L310,390 L280,350 L290,310 Z',
      labelPosition: { x: 345, y: 325 },
      capital: 'Almería'
    }
  ],
  'castilla-leon': [
    {
      id: 'leon',
      name: 'León',
      ccaaId: 'castilla-leon',
      path: 'M30,30 L120,25 L150,70 L140,140 L90,170 L40,160 L25,100 Z',
      labelPosition: { x: 85, y: 95 },
      capital: 'León'
    },
    {
      id: 'palencia',
      name: 'Palencia',
      ccaaId: 'castilla-leon',
      path: 'M130,35 L200,30 L230,80 L220,150 L170,175 L130,160 L120,100 Z',
      labelPosition: { x: 175, y: 105 },
      capital: 'Palencia'
    },
    {
      id: 'burgos',
      name: 'Burgos',
      ccaaId: 'castilla-leon',
      path: 'M210,30 L320,25 L360,90 L350,180 L280,210 L210,200 L190,130 Z',
      labelPosition: { x: 270, y: 120 },
      capital: 'Burgos'
    },
    {
      id: 'soria',
      name: 'Soria',
      ccaaId: 'castilla-leon',
      path: 'M320,80 L390,70 L400,130 L390,200 L340,230 L290,210 L280,150 Z',
      labelPosition: { x: 345, y: 150 },
      capital: 'Soria'
    },
    {
      id: 'zamora',
      name: 'Zamora',
      ccaaId: 'castilla-leon',
      path: 'M30,160 L100,150 L130,200 L120,270 L70,290 L30,270 L25,210 Z',
      labelPosition: { x: 75, y: 220 },
      capital: 'Zamora'
    },
    {
      id: 'valladolid',
      name: 'Valladolid',
      ccaaId: 'castilla-leon',
      path: 'M120,160 L200,150 L230,200 L220,260 L170,280 L120,265 L110,210 Z',
      labelPosition: { x: 170, y: 215 },
      capital: 'Valladolid'
    },
    {
      id: 'segovia',
      name: 'Segovia',
      ccaaId: 'castilla-leon',
      path: 'M220,200 L290,190 L320,240 L310,300 L260,320 L215,300 L205,250 Z',
      labelPosition: { x: 260, y: 255 },
      capital: 'Segovia'
    },
    {
      id: 'avila',
      name: 'Ávila',
      ccaaId: 'castilla-leon',
      path: 'M130,280 L210,265 L240,320 L230,380 L170,395 L120,375 L115,325 Z',
      labelPosition: { x: 175, y: 330 },
      capital: 'Ávila'
    },
    {
      id: 'salamanca',
      name: 'Salamanca',
      ccaaId: 'castilla-leon',
      path: 'M30,280 L110,270 L140,330 L125,390 L60,400 L25,360 L20,320 Z',
      labelPosition: { x: 80, y: 335 },
      capital: 'Salamanca'
    }
  ],
  'comunidad-valenciana': [
    {
      id: 'castellon',
      name: 'Castellón',
      ccaaId: 'comunidad-valenciana',
      path: 'M50,30 L200,25 L240,80 L230,160 L150,200 L70,190 L40,130 Z',
      labelPosition: { x: 140, y: 115 },
      capital: 'Castellón de la Plana'
    },
    {
      id: 'valencia',
      name: 'Valencia',
      ccaaId: 'comunidad-valenciana',
      path: 'M70,190 L180,175 L230,230 L220,310 L140,350 L60,330 L45,270 Z',
      labelPosition: { x: 140, y: 260 },
      capital: 'Valencia'
    },
    {
      id: 'alicante',
      name: 'Alicante',
      ccaaId: 'comunidad-valenciana',
      path: 'M80,330 L170,315 L220,370 L200,420 L120,430 L60,400 L55,360 Z',
      labelPosition: { x: 135, y: 375 },
      capital: 'Alicante'
    }
  ],
  'aragon': [
    {
      id: 'huesca',
      name: 'Huesca',
      ccaaId: 'aragon',
      path: 'M50,30 L300,25 L350,80 L340,160 L250,200 L140,210 L60,180 L40,100 Z',
      labelPosition: { x: 195, y: 115 },
      capital: 'Huesca'
    },
    {
      id: 'zaragoza',
      name: 'Zaragoza',
      ccaaId: 'aragon',
      path: 'M70,180 L250,165 L310,220 L300,310 L210,350 L100,360 L50,300 L55,230 Z',
      labelPosition: { x: 180, y: 265 },
      capital: 'Zaragoza'
    },
    {
      id: 'teruel',
      name: 'Teruel',
      ccaaId: 'aragon',
      path: 'M110,340 L230,325 L280,380 L260,430 L160,440 L90,410 L85,375 Z',
      labelPosition: { x: 180, y: 385 },
      capital: 'Teruel'
    }
  ],
  'castilla-la-mancha': [
    {
      id: 'guadalajara',
      name: 'Guadalajara',
      ccaaId: 'castilla-la-mancha',
      path: 'M180,30 L300,25 L340,80 L330,160 L260,190 L180,180 L160,120 Z',
      labelPosition: { x: 250, y: 105 },
      capital: 'Guadalajara'
    },
    {
      id: 'cuenca',
      name: 'Cuenca',
      ccaaId: 'castilla-la-mancha',
      path: 'M260,150 L360,140 L390,200 L380,290 L310,330 L240,310 L225,240 Z',
      labelPosition: { x: 310, y: 235 },
      capital: 'Cuenca'
    },
    {
      id: 'toledo',
      name: 'Toledo',
      ccaaId: 'castilla-la-mancha',
      path: 'M30,120 L150,110 L190,170 L180,260 L110,300 L40,280 L25,200 Z',
      labelPosition: { x: 110, y: 200 },
      capital: 'Toledo'
    },
    {
      id: 'ciudad-real',
      name: 'Ciudad Real',
      ccaaId: 'castilla-la-mancha',
      path: 'M50,280 L180,265 L240,330 L230,410 L140,440 L50,420 L35,350 Z',
      labelPosition: { x: 145, y: 355 },
      capital: 'Ciudad Real'
    },
    {
      id: 'albacete',
      name: 'Albacete',
      ccaaId: 'castilla-la-mancha',
      path: 'M250,290 L370,275 L400,340 L385,420 L290,445 L220,420 L210,355 Z',
      labelPosition: { x: 305, y: 360 },
      capital: 'Albacete'
    }
  ],
  'extremadura': [
    {
      id: 'caceres',
      name: 'Cáceres',
      ccaaId: 'extremadura',
      path: 'M50,40 L300,35 L340,100 L330,200 L240,250 L100,260 L50,200 L40,120 Z',
      labelPosition: { x: 190, y: 145 },
      capital: 'Cáceres'
    },
    {
      id: 'badajoz',
      name: 'Badajoz',
      ccaaId: 'extremadura',
      path: 'M50,260 L260,245 L310,320 L290,410 L180,440 L60,420 L40,340 Z',
      labelPosition: { x: 175, y: 340 },
      capital: 'Badajoz'
    }
  ],
  'pais-vasco': [
    {
      id: 'vizcaya',
      name: 'Vizcaya',
      ccaaId: 'pais-vasco',
      path: 'M30,50 L160,40 L200,100 L180,180 L100,200 L40,170 L25,110 Z',
      labelPosition: { x: 115, y: 120 },
      capital: 'Bilbao'
    },
    {
      id: 'guipuzcoa',
      name: 'Guipúzcoa',
      ccaaId: 'pais-vasco',
      path: 'M200,50 L330,45 L370,110 L350,190 L270,220 L200,200 L180,130 Z',
      labelPosition: { x: 275, y: 130 },
      capital: 'San Sebastián'
    },
    {
      id: 'alava',
      name: 'Álava',
      ccaaId: 'pais-vasco',
      path: 'M80,200 L270,185 L320,260 L300,350 L190,380 L80,360 L60,280 Z',
      labelPosition: { x: 190, y: 280 },
      capital: 'Vitoria-Gasteiz'
    }
  ],
  'region-murcia': [
    {
      id: 'murcia',
      name: 'Murcia',
      ccaaId: 'region-murcia',
      path: 'M50,50 L350,45 L380,150 L360,280 L250,350 L100,340 L50,240 L40,140 Z',
      labelPosition: { x: 210, y: 195 },
      capital: 'Murcia'
    }
  ],
  'navarra': [
    {
      id: 'navarra',
      name: 'Navarra',
      ccaaId: 'navarra',
      path: 'M50,40 L350,35 L380,120 L360,250 L260,350 L100,340 L50,220 L40,130 Z',
      labelPosition: { x: 210, y: 190 },
      capital: 'Pamplona'
    }
  ],
  'la-rioja': [
    {
      id: 'la-rioja',
      name: 'La Rioja',
      ccaaId: 'la-rioja',
      path: 'M50,60 L350,50 L380,150 L360,280 L250,350 L100,340 L50,230 L40,140 Z',
      labelPosition: { x: 210, y: 195 },
      capital: 'Logroño'
    }
  ],
  'cantabria': [
    {
      id: 'cantabria',
      name: 'Cantabria',
      ccaaId: 'cantabria',
      path: 'M40,80 L360,70 L390,160 L370,280 L260,350 L100,340 L50,240 L35,160 Z',
      labelPosition: { x: 210, y: 205 },
      capital: 'Santander'
    }
  ],
  'asturias': [
    {
      id: 'asturias',
      name: 'Asturias',
      ccaaId: 'asturias',
      path: 'M40,100 L360,90 L390,180 L370,290 L260,360 L100,350 L50,250 L35,170 Z',
      labelPosition: { x: 210, y: 220 },
      capital: 'Oviedo'
    }
  ],
  'madrid': [
    {
      id: 'madrid',
      name: 'Madrid',
      ccaaId: 'madrid',
      path: 'M50,50 L350,45 L380,150 L360,280 L250,350 L100,340 L50,230 L40,140 Z',
      labelPosition: { x: 210, y: 195 },
      capital: 'Madrid'
    }
  ],
  'islas-baleares': [
    {
      id: 'mallorca',
      name: 'Mallorca',
      ccaaId: 'islas-baleares',
      path: 'M120,100 L280,90 L320,170 L300,280 L200,330 L100,310 L80,220 L90,150 Z',
      labelPosition: { x: 200, y: 210 },
      capital: 'Palma'
    },
    {
      id: 'menorca',
      name: 'Menorca',
      ccaaId: 'islas-baleares',
      path: 'M280,50 L380,45 L400,100 L380,160 L300,180 L260,140 L265,90 Z',
      labelPosition: { x: 330, y: 110 },
      capital: 'Mahón'
    },
    {
      id: 'ibiza-formentera',
      name: 'Ibiza y Formentera',
      ccaaId: 'islas-baleares',
      path: 'M30,250 L120,240 L150,300 L130,370 L60,380 L25,330 Z',
      labelPosition: { x: 85, y: 310 },
      capital: 'Ibiza'
    }
  ],
  'islas-canarias': [
    {
      id: 'las-palmas',
      name: 'Las Palmas',
      ccaaId: 'islas-canarias',
      path: 'M220,80 L350,70 L380,150 L360,250 L280,290 L200,270 L190,180 Z',
      labelPosition: { x: 280, y: 175 },
      capital: 'Las Palmas de Gran Canaria'
    },
    {
      id: 'santa-cruz-tenerife',
      name: 'Santa Cruz de Tenerife',
      ccaaId: 'islas-canarias',
      path: 'M40,120 L170,110 L210,190 L190,290 L100,330 L40,300 L30,210 Z',
      labelPosition: { x: 120, y: 215 },
      capital: 'Santa Cruz de Tenerife'
    }
  ],
  'ceuta': [
    {
      id: 'ceuta',
      name: 'Ceuta',
      ccaaId: 'ceuta',
      path: 'M100,100 L300,95 L330,200 L310,320 L200,370 L90,350 L70,250 L80,160 Z',
      labelPosition: { x: 200, y: 230 },
      capital: 'Ceuta'
    }
  ],
  'melilla': [
    {
      id: 'melilla',
      name: 'Melilla',
      ccaaId: 'melilla',
      path: 'M100,100 L300,95 L330,200 L310,320 L200,370 L90,350 L70,250 L80,160 Z',
      labelPosition: { x: 200, y: 230 },
      capital: 'Melilla'
    }
  ]
};

// Get provinces for a specific CCAA
export const getProvincesByCCAA = (ccaaId: string): ProvinceData[] => {
  return provincesByCCAA[ccaaId] || [];
};

// Get province by ID
export const getProvinceById = (provinceId: string): ProvinceData | undefined => {
  for (const provinces of Object.values(provincesByCCAA)) {
    const found = provinces.find(p => p.id === provinceId);
    if (found) return found;
  }
  return undefined;
};
