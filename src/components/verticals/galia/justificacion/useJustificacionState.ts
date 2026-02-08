/**
 * GALIA - Hook de estado para Justificación
 */

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  GastoJustificacion, 
  ResumenPartida, 
  JustificacionTotales,
  JustificacionValidaciones,
  PARTIDAS_PRESUPUESTARIAS 
} from './types';

interface UseJustificacionStateProps {
  presupuestoAprobado: number;
  porcentajeAyuda: number;
  codigoExpediente: string;
}

export function useJustificacionState({ 
  presupuestoAprobado, 
  porcentajeAyuda,
  codigoExpediente 
}: UseJustificacionStateProps) {
  const [gastos, setGastos] = useState<GastoJustificacion[]>([]);
  const [activeTab, setActiveTab] = useState('formulario');
  const [nuevoGasto, setNuevoGasto] = useState<Partial<GastoJustificacion>>({
    partida: '',
    medioPago: 'transferencia',
  });

  const totales = useMemo((): JustificacionTotales => {
    const totalJustificado = gastos.reduce((sum, g) => sum + g.total, 0);
    const baseTotal = gastos.reduce((sum, g) => sum + g.baseImponible, 0);
    const ivaTotal = gastos.reduce((sum, g) => sum + g.iva, 0);
    const elegibleTotal = gastos
      .filter(g => {
        const partida = PARTIDAS_PRESUPUESTARIAS.find(p => p.id === g.partida);
        return partida?.elegible;
      })
      .reduce((sum, g) => sum + g.total, 0);
    
    const ayudaCalculada = Math.min(
      elegibleTotal * (porcentajeAyuda / 100), 
      presupuestoAprobado * (porcentajeAyuda / 100)
    );
    
    return {
      totalJustificado,
      baseTotal,
      ivaTotal,
      elegibleTotal,
      ayudaCalculada,
      diferencia: presupuestoAprobado - totalJustificado,
      porcentajeEjecucion: (totalJustificado / presupuestoAprobado) * 100,
    };
  }, [gastos, presupuestoAprobado, porcentajeAyuda]);

  const resumenPartidas = useMemo((): ResumenPartida[] => {
    return PARTIDAS_PRESUPUESTARIAS.map(partida => {
      const gastosPartida = gastos.filter(g => g.partida === partida.id);
      const justificado = gastosPartida.reduce((sum, g) => sum + g.total, 0);
      const presupuestado = presupuestoAprobado * 0.1;
      
      return {
        partida: partida.id,
        nombre: partida.nombre,
        presupuestado,
        justificado,
        diferencia: presupuestado - justificado,
        porcentaje: presupuestado > 0 ? (justificado / presupuestado) * 100 : 0,
        elegible: partida.elegible,
      };
    }).filter(r => r.justificado > 0 || r.presupuestado > 0);
  }, [gastos, presupuestoAprobado]);

  const validaciones = useMemo((): JustificacionValidaciones => {
    const errores: string[] = [];
    const avisos: string[] = [];

    const efectivoTotal = gastos
      .filter(g => g.medioPago === 'efectivo')
      .reduce((sum, g) => sum + g.total, 0);
    if (efectivoTotal > 1000) {
      errores.push(`Pagos en efectivo (${efectivoTotal.toFixed(2)}€) superan el límite de 1.000€`);
    }

    const gastosGrandes = gastos.filter(g => g.baseImponible > 18000);
    if (gastosGrandes.length > 0) {
      avisos.push(`${gastosGrandes.length} gasto(s) superan 18.000€ - requieren 3 ofertas comparables`);
    }

    gastos.forEach(g => {
      if (g.fechaPago && g.fechaFactura && new Date(g.fechaPago) < new Date(g.fechaFactura)) {
        errores.push(`Factura ${g.numeroFactura}: fecha de pago anterior a fecha de factura`);
      }
    });

    if (totales.porcentajeEjecucion < 70) {
      avisos.push(`Ejecución al ${totales.porcentajeEjecucion.toFixed(1)}% - podría reducirse la ayuda`);
    }

    return { errores, avisos };
  }, [gastos, totales]);

  const handleAddGasto = useCallback(() => {
    if (!nuevoGasto.numeroFactura || !nuevoGasto.proveedor || !nuevoGasto.partida) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    const base = nuevoGasto.baseImponible || 0;
    const iva = nuevoGasto.iva || 0;

    const gasto: GastoJustificacion = {
      id: crypto.randomUUID(),
      numeroFactura: nuevoGasto.numeroFactura || '',
      fechaFactura: nuevoGasto.fechaFactura || new Date().toISOString().split('T')[0],
      proveedor: nuevoGasto.proveedor || '',
      nifProveedor: nuevoGasto.nifProveedor || '',
      concepto: nuevoGasto.concepto || '',
      partida: nuevoGasto.partida,
      baseImponible: base,
      iva: iva,
      total: base + iva,
      fechaPago: nuevoGasto.fechaPago || '',
      medioPago: nuevoGasto.medioPago || 'transferencia',
      observaciones: nuevoGasto.observaciones,
    };

    setGastos(prev => [...prev, gasto]);
    setNuevoGasto({ partida: '', medioPago: 'transferencia' });
    toast.success('Gasto añadido correctamente');
  }, [nuevoGasto]);

  const handleRemoveGasto = useCallback((id: string) => {
    setGastos(prev => prev.filter(g => g.id !== id));
    toast.success('Gasto eliminado');
  }, []);

  const handleExportExcel = useCallback(() => {
    toast.success('Exportando a Excel...');
    
    const headers = ['Nº Factura', 'Fecha', 'Proveedor', 'NIF', 'Concepto', 'Partida', 'Base', 'IVA', 'Total', 'Fecha Pago', 'Medio Pago'];
    const rows = gastos.map(g => [
      g.numeroFactura, g.fechaFactura, g.proveedor, g.nifProveedor,
      g.concepto, g.partida, g.baseImponible, g.iva, g.total, g.fechaPago, g.medioPago,
    ]);
    
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `justificacion_${codigoExpediente}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [gastos, codigoExpediente]);

  return {
    gastos,
    activeTab,
    setActiveTab,
    nuevoGasto,
    setNuevoGasto,
    totales,
    resumenPartidas,
    validaciones,
    handleAddGasto,
    handleRemoveGasto,
    handleExportExcel,
  };
}
