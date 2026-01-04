/**
 * Navegador 3D entre ERP y CRM
 * Botones modernos con efecto 3D para cambiar entre módulos
 */

import { Link, useLocation } from 'react-router-dom';
import { Calculator, Users, ArrowRight } from 'lucide-react';
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

  const targetPath = isERP ? '/obelixia-admin/crm' : '/obelixia-admin/erp';
  const targetLabel = isERP ? 'CRM' : 'ERP';
  const TargetIcon = isERP ? Users : Calculator;
  
  // Colores según el destino
  const gradientClasses = isERP 
    ? 'from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400'
    : 'from-violet-500 via-purple-500 to-indigo-500 hover:from-violet-400 hover:via-purple-400 hover:to-indigo-400';

  return (
    <Link to={targetPath} className={className}>
      <button 
        className={cn(
          // Base layout
          "relative inline-flex items-center gap-2 h-9 px-4",
          "font-semibold text-sm rounded-xl",
          "text-white",
          
          // 3D Gradient background
          "bg-gradient-to-r",
          gradientClasses,
          
          // 3D Border effect
          "border border-white/20",
          
          // 3D Shadow layers
          "shadow-[0_6px_20px_-4px_rgba(0,0,0,0.4),0_4px_8px_-2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.2)]",
          
          // Hover 3D pressed effect
          "hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3),0_2px_4px_-1px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]",
          "hover:translate-y-[1px]",
          
          // Active pressed state
          "active:translate-y-[3px]",
          "active:shadow-[0_1px_2px_0_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(0,0,0,0.2)]",
          
          // Smooth transition
          "transition-all duration-150 ease-out",
          
          // Glow effect on hover
          "hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
        )}
      >
        {/* Shine effect overlay */}
        <span className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <span className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent" />
          <span className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </span>
        
        {/* Content */}
        <span className="relative flex items-center gap-2">
          <TargetIcon className="h-4 w-4 drop-shadow-sm" />
          <span className="drop-shadow-sm">Ir a {targetLabel}</span>
          <ArrowRight className="h-3.5 w-3.5 drop-shadow-sm transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>
    </Link>
  );
}

export default ERPCRMSwitcher;
