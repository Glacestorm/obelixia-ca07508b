/**
 * GALIA Territorial Map Edge Function
 * Provides aggregated data for the territorial drill-down map
 * Actions: get_ccaa_summary, get_region_detail, get_province_grants, get_municipality_detail
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TerritorialRequest {
  action: 'get_ccaa_summary' | 'get_region_detail' | 'get_province_grants' | 'get_municipality_detail';
  ccaaId?: string;
  provinceId?: string;
  municipalityId?: string;
}

interface CCAAMapData {
  id: string;
  name: string;
  shortName: string;
  totalGrants: number;
  totalBudget: number;
  executionRate: number;
  pendingGrants: number;
  approvedGrants: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface ProvinceMapData {
  id: string;
  name: string;
  ccaaId: string;
  totalGrants: number;
  totalBudget: number;
  executionRate: number;
  gals: number;
}

interface LocalidadMapData {
  id: string;
  nombre: string;
  tipo: 'municipio' | 'pedania' | 'pueblo' | 'aldea';
  poblacion: number;
  expedientesCount: number;
  presupuestoTotal: number;
  ejecucion: number;
}

interface ExpedienteMapData {
  id: string;
  numero_expediente: string;
  titulo_proyecto: string;
  beneficiario_nombre: string;
  importe_solicitado: number;
  importe_concedido: number | null;
  estado: string;
  localidad: string;
  sector: string;
}

// CCAA data for Spain
const ccaaList = [
  { id: 'andalucia', name: 'Andalucía', shortName: 'AND', provinces: ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla'] },
  { id: 'aragon', name: 'Aragón', shortName: 'ARA', provinces: ['Huesca', 'Teruel', 'Zaragoza'] },
  { id: 'asturias', name: 'Asturias', shortName: 'AST', provinces: ['Asturias'] },
  { id: 'baleares', name: 'Islas Baleares', shortName: 'BAL', provinces: ['Islas Baleares'] },
  { id: 'canarias', name: 'Canarias', shortName: 'CAN', provinces: ['Las Palmas', 'Santa Cruz de Tenerife'] },
  { id: 'cantabria', name: 'Cantabria', shortName: 'CTB', provinces: ['Cantabria'] },
  { id: 'castilla-la-mancha', name: 'Castilla-La Mancha', shortName: 'CLM', provinces: ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo'] },
  { id: 'castilla-y-leon', name: 'Castilla y León', shortName: 'CYL', provinces: ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora'] },
  { id: 'cataluna', name: 'Cataluña', shortName: 'CAT', provinces: ['Barcelona', 'Girona', 'Lleida', 'Tarragona'] },
  { id: 'extremadura', name: 'Extremadura', shortName: 'EXT', provinces: ['Badajoz', 'Cáceres'] },
  { id: 'galicia', name: 'Galicia', shortName: 'GAL', provinces: ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra'] },
  { id: 'madrid', name: 'Madrid', shortName: 'MAD', provinces: ['Madrid'] },
  { id: 'murcia', name: 'Murcia', shortName: 'MUR', provinces: ['Murcia'] },
  { id: 'navarra', name: 'Navarra', shortName: 'NAV', provinces: ['Navarra'] },
  { id: 'pais-vasco', name: 'País Vasco', shortName: 'PVA', provinces: ['Álava', 'Guipúzcoa', 'Vizcaya'] },
  { id: 'rioja', name: 'La Rioja', shortName: 'RIO', provinces: ['La Rioja'] },
  { id: 'valencia', name: 'Comunidad Valenciana', shortName: 'VAL', provinces: ['Alicante', 'Castellón', 'Valencia'] },
];

// Generate mock CCAA summary data (will be replaced with real DB queries)
function generateCCAASummary(): CCAAMapData[] {
  return ccaaList.map(ccaa => {
    const totalGrants = Math.floor(Math.random() * 500) + 50;
    const totalBudget = (Math.random() * 50 + 5) * 1000000;
    const executionRate = Math.random() * 100;
    const pendingGrants = Math.floor(totalGrants * 0.3);
    const approvedGrants = totalGrants - pendingGrants;
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (executionRate < 50) status = 'critical';
    else if (executionRate < 75) status = 'warning';
    
    return {
      id: ccaa.id,
      name: ccaa.name,
      shortName: ccaa.shortName,
      totalGrants,
      totalBudget,
      executionRate,
      pendingGrants,
      approvedGrants,
      status
    };
  });
}

// Generate province data for a CCAA
function generateProvinceData(ccaaId: string): ProvinceMapData[] {
  const ccaa = ccaaList.find(c => c.id === ccaaId);
  if (!ccaa) return [];
  
  return ccaa.provinces.map((province, idx) => ({
    id: `${ccaaId}-${idx}`,
    name: province,
    ccaaId,
    totalGrants: Math.floor(Math.random() * 100) + 10,
    totalBudget: (Math.random() * 10 + 1) * 1000000,
    executionRate: Math.random() * 100,
    gals: Math.floor(Math.random() * 5) + 1
  }));
}

// Generate locality data for a province
function generateLocalidadData(provinceId: string): LocalidadMapData[] {
  const tipos: LocalidadMapData['tipo'][] = ['municipio', 'pedania', 'pueblo', 'aldea'];
  const nombres = [
    'San Miguel', 'Villarroya', 'Peñalba', 'Valdepeñas', 'Aldeanueva',
    'Fuente del Olmo', 'Villanueva', 'Torrecilla', 'Moraleja', 'Hontoria'
  ];

  return nombres.map((nombre, idx) => ({
    id: `${provinceId}-loc-${idx}`,
    nombre: `${nombre} del Valle`,
    tipo: tipos[Math.floor(Math.random() * tipos.length)],
    poblacion: Math.floor(Math.random() * 5000) + 100,
    expedientesCount: Math.floor(Math.random() * 20) + 1,
    presupuestoTotal: (Math.random() * 2 + 0.1) * 1000000,
    ejecucion: Math.random() * 100
  }));
}

// Generate expediente data for a locality
function generateExpedienteData(localidadId: string, localidadNombre: string): ExpedienteMapData[] {
  const estados = ['instruccion', 'evaluacion', 'propuesta', 'resolucion', 'concedido', 'justificacion'];
  const sectores = ['Agroalimentario', 'Turismo Rural', 'Artesanía', 'Servicios', 'Comercio Local'];
  const proyectos = [
    'Modernización de bodega tradicional',
    'Casa rural con encanto',
    'Tienda de productos locales',
    'Taller de cerámica artesanal',
    'Granja ecológica'
  ];

  const count = Math.floor(Math.random() * 8) + 2;
  return Array.from({ length: count }, (_, idx) => {
    const estado = estados[Math.floor(Math.random() * estados.length)];
    const solicitado = (Math.random() * 100 + 10) * 1000;
    
    return {
      id: `${localidadId}-exp-${idx}`,
      numero_expediente: `GAL-2024-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
      titulo_proyecto: proyectos[Math.floor(Math.random() * proyectos.length)],
      beneficiario_nombre: `Empresa ${idx + 1} S.L.`,
      importe_solicitado: solicitado,
      importe_concedido: estado === 'concedido' || estado === 'justificacion' ? solicitado * 0.7 : null,
      estado,
      localidad: localidadNombre,
      sector: sectores[Math.floor(Math.random() * sectores.length)]
    };
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ccaaId, provinceId, municipalityId } = await req.json() as TerritorialRequest;

    console.log(`[galia-territorial-map] Processing action: ${action}`);

    let responseData: unknown;

    switch (action) {
      case 'get_ccaa_summary':
        responseData = generateCCAASummary();
        break;

      case 'get_region_detail':
        if (!ccaaId) {
          throw new Error('ccaaId is required for get_region_detail');
        }
        responseData = generateProvinceData(ccaaId);
        break;

      case 'get_province_grants':
        if (!provinceId) {
          throw new Error('provinceId is required for get_province_grants');
        }
        responseData = generateLocalidadData(provinceId);
        break;

      case 'get_municipality_detail':
        if (!municipalityId) {
          throw new Error('municipalityId is required for get_municipality_detail');
        }
        // Generate expedientes for the municipality
        responseData = generateExpedienteData(municipalityId, 'Localidad');
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[galia-territorial-map] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: responseData,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-territorial-map] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
