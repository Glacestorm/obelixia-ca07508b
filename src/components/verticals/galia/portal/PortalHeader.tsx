/**
 * GALIA Portal - Header con estadísticas
 */

import { Leaf } from 'lucide-react';
import { formatCurrency } from './types';

interface PortalHeaderProps {
  convocatoriasCount: number;
  presupuestoDisponible: number;
  presupuestoTotal: number;
  presupuestoEjecutado: number;
  presupuestoComprometido: number;
}

export function PortalHeader({
  convocatoriasCount,
  presupuestoDisponible,
  presupuestoTotal,
  presupuestoEjecutado,
  presupuestoComprometido,
}: PortalHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Leaf className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Portal LEADER</h1>
            <p className="text-green-100">Ayudas al desarrollo rural - Programa FEADER</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-2xl font-bold">{convocatoriasCount}</div>
            <div className="text-sm text-green-100">Convocatorias activas</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-2xl font-bold">
              {presupuestoDisponible > 0 
                ? `€${(presupuestoDisponible / 1000000).toFixed(1)}M`
                : '€0'
              }
            </div>
            <div className="text-sm text-green-100">Presupuesto disponible</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-2xl font-bold">
              {((presupuestoEjecutado / (presupuestoTotal || 1)) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-green-100">Ejecución presupuestaria</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-2xl font-bold">
              {formatCurrency(presupuestoComprometido)}
            </div>
            <div className="text-sm text-green-100">Comprometido</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PortalHeader;
