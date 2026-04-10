/**
 * HRCockpitHeader — Cabecera contextual tipo ERP clásico
 * Inspirada en los layouts de nómina profesional (Meta4/A3Equipo/Sage)
 * Muestra: Entidad, Período, Empleado activo, toolbar de acciones
 */

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Building2, CalendarDays, UserCircle, Eye, Eraser,
  Search, History, HelpCircle, RefreshCw, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HRCockpitHeaderProps {
  companyName?: string;
  companyId?: string;
  employeeName?: string;
  employeeId?: string;
  onSearch?: () => void;
  onClear?: () => void;
  onRefresh?: () => void;
  onHelp?: () => void;
  onViewHistory?: () => void;
  className?: string;
}

export function HRCockpitHeader({
  companyName,
  companyId,
  employeeName,
  employeeId,
  onSearch,
  onClear,
  onRefresh,
  onHelp,
  onViewHistory,
  className,
}: HRCockpitHeaderProps) {
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  return (
    <div className={cn(
      'rounded-lg border bg-card/80 backdrop-blur-sm',
      'shadow-sm',
      className
    )}>
      {/* Contexto activo */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        {/* Entidad */}
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-muted-foreground">Entidad</span>
          <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
            {companyName || '—'}
          </span>
        </div>

        <Separator orientation="vertical" className="h-5 hidden sm:block" />

        {/* Período */}
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-muted-foreground">Período</span>
          <Badge variant="outline" className="text-xs font-mono">
            {currentPeriod}
          </Badge>
        </div>

        <Separator orientation="vertical" className="h-5 hidden sm:block" />

        {/* Empleado */}
        <div className="flex items-center gap-2 min-w-0">
          <UserCircle className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-muted-foreground">Empleado</span>
          <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
            {employeeName || '— Sin seleccionar —'}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Toolbar */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSearch}
            className="h-7 px-2 text-xs gap-1"
            title="Búsqueda (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Buscar</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-7 px-2 text-xs gap-1"
            title="Refrescar datos"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 px-2 text-xs gap-1"
            title="Limpiar selección"
          >
            <Eraser className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewHistory}
            className="h-7 px-2 text-xs gap-1"
            title="Historial"
          >
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onHelp}
            className="h-7 px-2 text-xs gap-1"
            title="Ayuda"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default HRCockpitHeader;
