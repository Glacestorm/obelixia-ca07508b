/**
 * ModuleNavigationButton - Botón 3D moderno para navegación entre ERP y CRM
 * Tendencias 2025-2027: Diseño neumórfico con efectos 3D avanzados
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModuleType = 'erp' | 'crm';

interface ModuleNavigationButtonProps {
  targetModule: ModuleType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const moduleConfig: Record<ModuleType, {
  label: string;
  icon: React.ElementType;
  path: string;
  gradient: string;
  shadowColor: string;
  hoverGlow: string;
}> = {
  erp: {
    label: 'ERP',
    icon: Building2,
    path: '/obelixia-admin/erp',
    gradient: 'from-blue-600 via-indigo-600 to-violet-600',
    shadowColor: 'shadow-blue-500/40',
    hoverGlow: 'hover:shadow-blue-400/60'
  },
  crm: {
    label: 'CRM',
    icon: Users,
    path: '/obelixia-admin/crm',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    shadowColor: 'shadow-emerald-500/40',
    hoverGlow: 'hover:shadow-emerald-400/60'
  }
};

const sizeConfig = {
  sm: {
    padding: 'px-3 py-1.5',
    iconSize: 'h-4 w-4',
    textSize: 'text-xs',
    gap: 'gap-1.5'
  },
  md: {
    padding: 'px-4 py-2',
    iconSize: 'h-5 w-5',
    textSize: 'text-sm',
    gap: 'gap-2'
  },
  lg: {
    padding: 'px-5 py-2.5',
    iconSize: 'h-6 w-6',
    textSize: 'text-base',
    gap: 'gap-2.5'
  }
};

export function ModuleNavigationButton({ 
  targetModule, 
  className,
  size = 'md' 
}: ModuleNavigationButtonProps) {
  const config = moduleConfig[targetModule];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <Link to={config.path}>
      <motion.button
        className={cn(
          // Base styles
          "relative inline-flex items-center font-semibold text-white rounded-xl",
          "transition-all duration-300 ease-out",
          // 3D Effect layers
          "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/20 before:to-transparent before:opacity-100",
          "after:absolute after:inset-[2px] after:rounded-[10px] after:bg-gradient-to-t after:from-black/20 after:to-transparent after:opacity-50",
          // Gradient background
          `bg-gradient-to-br ${config.gradient}`,
          // 3D Shadow effect
          "shadow-lg",
          config.shadowColor,
          config.hoverGlow,
          // Border effect for depth
          "border border-white/20",
          // Size
          sizeStyles.padding,
          sizeStyles.gap,
          // Transform for 3D push effect
          "transform-gpu",
          "hover:-translate-y-0.5 hover:scale-105",
          "active:translate-y-0.5 active:scale-95",
          // Focus styles
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
          targetModule === 'erp' ? 'focus:ring-blue-400' : 'focus:ring-emerald-400',
          className
        )}
        whileHover={{ 
          boxShadow: targetModule === 'erp' 
            ? '0 20px 40px -12px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)' 
            : '0 20px 40px -12px rgba(16, 185, 129, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)'
        }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {/* Inner glow effect */}
        <motion.div
          className="absolute inset-0 rounded-xl opacity-0"
          style={{
            background: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.4), transparent 60%)`
          }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
        
        {/* Content */}
        <span className="relative z-10 flex items-center" style={{ gap: 'inherit' }}>
          <Icon className={cn(sizeStyles.iconSize, "drop-shadow-md")} />
          <span className={cn(sizeStyles.textSize, "font-bold tracking-wide drop-shadow-sm")}>
            {config.label}
          </span>
        </span>
        
        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 rounded-xl overflow-hidden"
          initial={false}
        >
          <motion.div
            className="absolute inset-0 -translate-x-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              width: '100%'
            }}
            whileHover={{
              translateX: ['100%'],
              transition: { duration: 0.6, ease: 'easeInOut' }
            }}
          />
        </motion.div>
      </motion.button>
    </Link>
  );
}

// Componente con ambos botones
export function ModuleNavigationPair({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ModuleNavigationButton targetModule="erp" size="sm" />
      <ModuleNavigationButton targetModule="crm" size="sm" />
    </div>
  );
}

export default ModuleNavigationButton;
