/**
 * GALIA - Panel de Herramientas para Técnicos
 * Apartado específico que muestra las capacidades de la plataforma para el trabajo diario
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calculator, Search, Shield, FileText, CheckCircle, FileBarChart, Receipt,
  ArrowRight, Sparkles, AlertTriangle, Building2, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolkitItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  status: 'activo' | 'nuevo' | 'mejorado';
  features: string[];
  tabId: string;
}

const toolkitItems: ToolkitItem[] = [
  {
    id: 'moderacion-costes',
    title: 'Moderación de Costes',
    description: 'Verificación automática de presupuestos contra catálogos de referencia LEADER',
    icon: Calculator,
    color: 'text-blue-500 bg-blue-500/10',
    status: 'activo',
    features: [
      'Detección de desviaciones >15% con alerta automática',
      'Comparación con precios de mercado actualizados',
      'Exigencia automática de 3 ofertas para importes >18.000€',
      'Informe de moderación pre-generado',
    ],
    tabId: 'costes',
  },
  {
    id: 'empresas-vinculadas',
    title: 'Análisis de Empresas Vinculadas',
    description: 'Cruce automático de NIF/CIF para detectar conflictos de interés y concentración de ayudas',
    icon: Building2,
    color: 'text-purple-500 bg-purple-500/10',
    status: 'nuevo',
    features: [
      'Detección de administradores comunes entre beneficiarios',
      'Alerta por coincidencia de dirección fiscal o cuentas bancarias',
      'Verificación de límites de minimis acumulados',
      'Cruce con Registro Mercantil vía integraciones AAPP',
    ],
    tabId: 'integraciones',
  },
  {
    id: 'deteccion-fraude',
    title: 'Detección de Indicios de Fraude',
    description: 'Análisis inteligente de patrones sospechosos en expedientes y justificaciones',
    icon: Shield,
    color: 'text-red-500 bg-red-500/10',
    status: 'mejorado',
    features: [
      'Detección de facturas entre empresas vinculadas',
      'Identificación de proveedores ficticios (NIF inactivos)',
      'Patrones de splitting para evitar umbrales de contratación',
      'Facturas duplicadas entre convocatorias',
      'Desproporción presupuesto vs. capacidad del solicitante',
    ],
    tabId: 'compliance',
  },
  {
    id: 'clasificacion-docs',
    title: 'Reconocimiento y Clasificación de Documentación',
    description: 'OCR + IA para clasificar automáticamente la documentación presentada',
    icon: FileText,
    color: 'text-amber-500 bg-amber-500/10',
    status: 'mejorado',
    features: [
      'Clasificación automática: DNI, escrituras, licencias, facturas, memorias',
      'Checklist automático de documentos requeridos vs. presentados',
      'Extracción de datos clave por tipo de documento',
      'Detección de documentos caducados o incompletos',
    ],
    tabId: 'documentos',
  },
  {
    id: 'cumplimiento-requisitos',
    title: 'Análisis de Cumplimiento de Requisitos',
    description: 'Semáforo inteligente que verifica el cumplimiento de cada requisito de la convocatoria',
    icon: CheckCircle,
    color: 'text-green-500 bg-green-500/10',
    status: 'nuevo',
    features: [
      'Semáforo verde/amarillo/rojo por requisito',
      'Sugerencias automáticas de subsanación',
      'Verificación cruzada con bases de datos públicas',
      'Informe de cumplimiento exportable',
    ],
    tabId: 'compliance',
  },
  {
    id: 'informes-requerimientos',
    title: 'Elaboración de Requerimientos e Informes',
    description: 'Generación automática de documentos administrativos del circuito de tramitación',
    icon: FileBarChart,
    color: 'text-cyan-500 bg-cyan-500/10',
    status: 'mejorado',
    features: [
      'Requerimiento de subsanación con campos auto-rellenados',
      'Informe técnico-económico',
      'Propuesta de resolución',
      'Informe de certificación y acta de verificación in situ',
      'Propuesta de ordenación de pago',
    ],
    tabId: 'docgen',
  },
  {
    id: 'gastos-automaticos',
    title: 'Reconocimiento Automático de Gastos Justificados',
    description: 'OCR + IA para extraer y clasificar automáticamente facturas en partidas presupuestarias',
    icon: Receipt,
    color: 'text-indigo-500 bg-indigo-500/10',
    status: 'nuevo',
    features: [
      'Extracción automática: proveedor, NIF, fecha, concepto, base, IVA, total',
      'Clasificación en partidas presupuestarias LEADER',
      'Detección de gastos no elegibles (efectivo >1.000€, falta ofertas)',
      'Tabla de justificación pre-rellenada',
    ],
    tabId: 'documentos',
  },
];

const statusBadge = (status: ToolkitItem['status']) => {
  switch (status) {
    case 'nuevo': return <Badge className="bg-green-500/20 text-green-600 text-[10px]">Nuevo</Badge>;
    case 'mejorado': return <Badge className="bg-blue-500/20 text-blue-600 text-[10px]">Mejorado</Badge>;
    default: return <Badge variant="secondary" className="text-[10px]">Activo</Badge>;
  }
};

interface GaliaTecnicoToolkitProps {
  onNavigate?: (tabId: string) => void;
}

export function GaliaTecnicoToolkit({ onNavigate }: GaliaTecnicoToolkitProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Toolkit del Técnico
          </h2>
          <p className="text-sm text-muted-foreground">
            7 herramientas IA para la gestión diaria de ayudas LEADER
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Proyecto piloto · Escalable a otras subvenciones
        </Badge>
      </div>

      {/* Grid de herramientas */}
      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
          {toolkitItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('p-2 rounded-lg', item.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{item.title}</CardTitle>
                      </div>
                    </div>
                    {statusBadge(item.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1 mb-3">
                    {item.features.map((feat, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => onNavigate?.(item.tabId)}
                  >
                    Abrir herramienta <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export default GaliaTecnicoToolkit;
