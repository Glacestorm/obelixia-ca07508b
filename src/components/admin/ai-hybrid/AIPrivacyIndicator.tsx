/**
 * AIPrivacyIndicator - Badge visual de clasificación de privacidad
 * Muestra nivel de clasificación, si datos salen al exterior y alertas
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  ShieldOff,
  Lock,
  Unlock,
  Cloud,
  Server,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataClassification, ClassificationResult } from '@/hooks/admin/ai-hybrid';

interface AIPrivacyIndicatorProps {
  classification?: ClassificationResult | null;
  level?: DataClassification;
  canSendExternal?: boolean;
  isLocal?: boolean;
  compact?: boolean;
  showTooltip?: boolean;
  className?: string;
}

const CLASSIFICATION_CONFIG: Record<DataClassification, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  description: string;
}> = {
  public: {
    label: 'Público',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    description: 'Datos públicos sin restricciones',
  },
  internal: {
    label: 'Interno',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
    icon: <Shield className="h-3.5 w-3.5" />,
    description: 'Datos internos, precaución al compartir',
  },
  confidential: {
    label: 'Confidencial',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
    description: 'Datos confidenciales, requiere anonimización',
  },
  restricted: {
    label: 'Restringido',
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
    icon: <ShieldOff className="h-3.5 w-3.5" />,
    description: 'Datos restringidos, solo IA local permitida',
  },
};

export function AIPrivacyIndicator({
  classification,
  level,
  canSendExternal,
  isLocal,
  compact = false,
  showTooltip = true,
  className,
}: AIPrivacyIndicatorProps) {
  const effectiveLevel = classification?.level || level || 'public';
  const effectiveCanSend = classification?.canSendExternal ?? canSendExternal ?? true;
  const config = CLASSIFICATION_CONFIG[effectiveLevel];

  const sensitiveCount = classification?.sensitiveFields?.length || 0;
  const blockedCount = classification?.blockedFields?.length || 0;

  const content = (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-md border px-2 py-1",
      config.bgColor,
      className
    )}>
      {/* Classification Icon & Label */}
      <span className={cn("flex items-center gap-1", config.color)}>
        {config.icon}
        {!compact && <span className="text-xs font-medium">{config.label}</span>}
      </span>

      {/* Separator */}
      {!compact && (effectiveLevel !== 'public' || isLocal !== undefined) && (
        <span className="text-muted-foreground/50">|</span>
      )}

      {/* External/Local indicator */}
      {!compact && (
        <span className={cn(
          "flex items-center gap-1 text-xs",
          effectiveCanSend ? "text-blue-600" : "text-amber-600"
        )}>
          {isLocal ? (
            <>
              <Server className="h-3 w-3" />
              <span>Local</span>
            </>
          ) : effectiveCanSend ? (
            <>
              <Cloud className="h-3 w-3" />
              <span>Externa OK</span>
            </>
          ) : (
            <>
              <Lock className="h-3 w-3" />
              <span>Solo Local</span>
            </>
          )}
        </span>
      )}

      {/* Alerts */}
      {blockedCount > 0 && (
        <Badge variant="destructive" className="h-5 px-1 text-[10px]">
          {blockedCount} bloqueados
        </Badge>
      )}
      
      {sensitiveCount > 0 && blockedCount === 0 && !compact && (
        <Badge variant="secondary" className="h-5 px-1 text-[10px]">
          {sensitiveCount} sensibles
        </Badge>
      )}
    </div>
  );

  if (!showTooltip) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {config.icon}
              <span className="font-medium">{config.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            
            {classification && (
              <div className="space-y-1 pt-1 border-t">
                {classification.matchedRules.length > 0 && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Reglas aplicadas: </span>
                    <span>{classification.matchedRules.join(', ')}</span>
                  </div>
                )}
                
                {sensitiveCount > 0 && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Campos sensibles: </span>
                    <span className="text-amber-600">{sensitiveCount}</span>
                  </div>
                )}
                
                {blockedCount > 0 && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Campos bloqueados: </span>
                    <span className="text-red-600">{blockedCount}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs pt-1">
                  {effectiveCanSend ? (
                    <>
                      <Unlock className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">Puede enviarse a IA externa</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">Solo procesamiento local</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact version for inline use
export function AIPrivacyBadge({ level, className }: { level: DataClassification; className?: string }) {
  const config = CLASSIFICATION_CONFIG[level];
  
  return (
    <Badge 
      variant="outline" 
      className={cn("gap-1", config.color, config.bgColor, className)}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}

export default AIPrivacyIndicator;
