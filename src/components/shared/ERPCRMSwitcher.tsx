/**
 * Navegador 3D entre ERP y CRM
 * Botones modernos con efecto 3D para cambiar entre módulos
 */

import { Link, useLocation } from 'react-router-dom';
import { Calculator, Users, Headphones, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ERPCRMSwitcherProps {
  className?: string;
}

export function ERPCRMSwitcher({ className }: ERPCRMSwitcherProps) {
  const location = useLocation();
  const isERP = location.pathname.includes('/erp');
  const isCRM = location.pathname.includes('/crm');

  // Si no estamos en ninguno, no mostrar
  if (!isERP && !isCRM) return null;

  // Si estamos en ERP, mostrar dos botones para ir a CRM Omnicanal y CRM Modular
  if (isERP) {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        <Link to="/obelixia-admin/crm-omnicanal">
          <button 
            className={cn(
              "relative inline-flex items-center gap-2 h-9 px-4",
              "font-semibold text-sm rounded-xl",
              "text-white",
              "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400",
              "border border-white/20",
              "shadow-[0_6px_20px_-4px_rgba(0,0,0,0.4),0_4px_8px_-2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.2)]",
              "hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3),0_2px_4px_-1px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]",
              "hover:translate-y-[1px]",
              "active:translate-y-[3px]",
              "active:shadow-[0_1px_2px_0_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(0,0,0,0.2)]",
              "transition-all duration-150 ease-out",
              "hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
            )}
          >
            <span className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <span className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent" />
              <span className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </span>
            <span className="relative flex items-center gap-2">
              <Headphones className="h-4 w-4 drop-shadow-sm" />
              <span className="drop-shadow-sm">Ir a CRM Omnicanal</span>
              <ArrowRight className="h-3.5 w-3.5 drop-shadow-sm transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        </Link>
        
        <Link to="/obelixia-admin/crm">
          <button 
            className={cn(
              "relative inline-flex items-center gap-2 h-9 px-4",
              "font-semibold text-sm rounded-xl",
              "text-white",
              "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-400 hover:via-indigo-400 hover:to-purple-400",
              "border border-white/20",
              "shadow-[0_6px_20px_-4px_rgba(0,0,0,0.4),0_4px_8px_-2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.2)]",
              "hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3),0_2px_4px_-1px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]",
              "hover:translate-y-[1px]",
              "active:translate-y-[3px]",
              "active:shadow-[0_1px_2px_0_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(0,0,0,0.2)]",
              "transition-all duration-150 ease-out",
              "hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
            )}
          >
            <span className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <span className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent" />
              <span className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </span>
            <span className="relative flex items-center gap-2">
              <Users className="h-4 w-4 drop-shadow-sm" />
              <span className="drop-shadow-sm">Ir a CRM Modular</span>
              <ArrowRight className="h-3.5 w-3.5 drop-shadow-sm transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        </Link>
      </div>
    );
  }

  // Si estamos en CRM, mostrar botón para ir a ERP
  return (
    <Link to="/obelixia-admin/erp" className={className}>
      <button 
        className={cn(
          "relative inline-flex items-center gap-2 h-9 px-4",
          "font-semibold text-sm rounded-xl",
          "text-white",
          "bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 hover:from-violet-400 hover:via-purple-400 hover:to-indigo-400",
          "border border-white/20",
          "shadow-[0_6px_20px_-4px_rgba(0,0,0,0.4),0_4px_8px_-2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.2)]",
          "hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3),0_2px_4px_-1px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]",
          "hover:translate-y-[1px]",
          "active:translate-y-[3px]",
          "active:shadow-[0_1px_2px_0_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(0,0,0,0.2)]",
          "transition-all duration-150 ease-out",
          "hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
        )}
      >
        <span className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <span className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent" />
          <span className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </span>
        <span className="relative flex items-center gap-2">
          <Calculator className="h-4 w-4 drop-shadow-sm" />
          <span className="drop-shadow-sm">Ir a ERP</span>
          <ArrowRight className="h-3.5 w-3.5 drop-shadow-sm transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>
    </Link>
  );
}

export default ERPCRMSwitcher;
