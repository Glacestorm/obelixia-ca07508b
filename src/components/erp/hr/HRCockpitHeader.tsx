/**
 * HRCockpitHeader — Cabecera contextual tipo ERP clásico
 * Inspirada en los layouts de nómina profesional (Meta4/A3Equipo/Sage)
 * Muestra: Entidad, Período, Empleado activo, toolbar de acciones
 * S9.11-H5++: menú contextual del empleado con acceso a copiloto IA
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2, CalendarDays, UserCircle, Eraser,
  Search, History, HelpCircle, RefreshCw,
  Brain, FolderOpen, ChevronDown,
  FileText, AlertCircle, ScrollText, Banknote
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
  onViewRecents?: () => void;
  onAskAI?: () => void;
  onViewExpedient?: () => void;
  onViewDocuments?: () => void;
  onViewIncidents?: () => void;
  onViewContract?: () => void;
  onViewPayroll?: () => void;
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
  onViewRecents,
  onAskAI,
  onViewExpedient,
  onViewDocuments,
  onViewIncidents,
  onViewContract,
  onViewPayroll,
  className,
}: HRCockpitHeaderProps) {
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const employeeBlock = (
    <div className="flex items-center gap-2 min-w-0">
      <UserCircle className="h-4 w-4 text-primary shrink-0" />
      <span className="text-xs text-muted-foreground">Empleado</span>
      <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
        {employeeName || '— Sin seleccionar —'}
      </span>
      {employeeId && <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />}
    </div>
  );

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

        {/* Empleado — con menú contextual si hay empleado seleccionado */}
        {employeeId ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 min-w-0 rounded-md px-1.5 py-1 -mx-1.5 -my-1 hover:bg-accent/50 transition-colors cursor-pointer">
                {employeeBlock}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem onClick={onAskAI} className="gap-2">
                <Brain className="h-4 w-4" />
                Preguntar a IA sobre este empleado
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewExpedient} className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Ver expediente
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onViewDocuments} className="gap-2">
                <FileText className="h-4 w-4" />
                Ver documentos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewIncidents} className="gap-2">
                <AlertCircle className="h-4 w-4" />
                Ver incidencias
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewContract} className="gap-2">
                <ScrollText className="h-4 w-4" />
                Ver contrato
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewPayroll} className="gap-2">
                <Banknote className="h-4 w-4" />
                Ver nómina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          employeeBlock
        )}

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
            onClick={onViewRecents}
            className="h-7 px-2 text-xs gap-1"
            title="Recientes"
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
