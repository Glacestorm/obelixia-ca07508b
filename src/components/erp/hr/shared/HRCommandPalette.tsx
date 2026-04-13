/**
 * HRCommandPalette — Cmd+K quick actions & search for HR module
 */
import { useState, useEffect, useCallback } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Users, FileText, DollarSign, Calendar, Globe, AlertTriangle,
  UserPlus, ClipboardList, Send, Briefcase, Search, Gavel
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  group: string;
  module?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'search-employee', label: 'Buscar empleado', description: 'Directorio de empleados', icon: Search, group: 'Búsqueda' },
  { id: 'new-employee', label: 'Alta empleado', description: 'Registrar nuevo empleado', icon: UserPlus, group: 'Core HR', module: 'employees' },
  { id: 'new-contract', label: 'Nuevo contrato', description: 'Crear contrato de trabajo', icon: FileText, group: 'Core HR', module: 'contracts' },
  { id: 'new-payroll', label: 'Nueva nómina', description: 'Procesar nómina mensual', icon: DollarSign, group: 'Payroll' },
  { id: 'request-vacation', label: 'Solicitar vacaciones', description: 'Nueva solicitud de vacaciones', icon: Calendar, group: 'Laboral', module: 'vacations' },
  { id: 'new-incident', label: 'Registrar incidencia', description: 'Incidencia de ausencia', icon: AlertTriangle, group: 'Laboral', module: 'leave-incidents' },
  { id: 'new-task', label: 'Crear tarea RRHH', description: 'Tarea asignable', icon: ClipboardList, group: 'Laboral', module: 'hr-tasks' },
  { id: 'send-milena', label: 'Enviar Milena PA', description: 'Alta/baja/variación a TGSS', icon: Send, group: 'Integraciones', module: 'official-submissions' },
  { id: 'mobility', label: 'Movilidad internacional', description: 'Asignaciones y KPIs globales', icon: Globe, group: 'Global Mobility', module: 'mobility-international' },
  { id: 'admin-request', label: 'Solicitud administrativa', description: 'Certificados, cambios de datos', icon: Briefcase, group: 'Laboral', module: 'admin-requests' },
  { id: 'collective-agreements', label: 'Convenios colectivos', description: 'Tablas salariales, convenio colectivo y condiciones', icon: Gavel, group: 'Oficial & Compliance', module: 'collective-agreements' },
];

interface Props {
  onNavigate: (moduleId: string) => void;
  onAction?: (actionId: string) => void;
}

export function HRCommandPalette({ onNavigate, onAction }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = useCallback((action: QuickAction) => {
    setOpen(false);
    if (action.module) {
      onNavigate(action.module);
    }
    onAction?.(action.id);
  }, [onNavigate, onAction]);

  const groups = [...new Set(QUICK_ACTIONS.map(a => a.group))];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar acción o módulo..." />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
        {groups.map((group, idx) => (
          <div key={group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {QUICK_ACTIONS.filter(a => a.group === group).map(action => {
                const Icon = action.icon;
                return (
                  <CommandItem
                    key={action.id}
                    onSelect={() => handleSelect(action)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
