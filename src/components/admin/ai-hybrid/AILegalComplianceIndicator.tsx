import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ShieldCheck, ShieldAlert, Shield, Lock } from 'lucide-react';
import { useAILegalCompliance } from '@/hooks/admin/ai-hybrid/useAILegalCompliance';
import { cn } from '@/lib/utils';

interface AILegalComplianceIndicatorProps {
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  regulations?: string[];
  className?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AILegalComplianceIndicator({
  riskLevel = 'low',
  regulations = ['GDPR', 'LOPDGDD'],
  className,
  showDetails = false,
  size = 'md',
}: AILegalComplianceIndicatorProps) {
  const { getRiskLevelBadgeVariant, getRiskLevelColor } = useAILegalCompliance();

  const getIcon = () => {
    switch (riskLevel) {
      case 'low': return <ShieldCheck className="h-3 w-3 mr-1" />;
      case 'medium': return <Shield className="h-3 w-3 mr-1" />;
      case 'high': return <ShieldAlert className="h-3 w-3 mr-1" />;
      case 'critical': return <Lock className="h-3 w-3 mr-1" />;
    }
  };

  const getLabel = () => {
    switch (riskLevel) {
      case 'low': return 'Compliant';
      case 'medium': return 'Warning';
      case 'high': return 'High Risk';
      case 'critical': return 'Blocked';
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant={getRiskLevelBadgeVariant(riskLevel)} className="cursor-help">
              {getIcon()}
              {getLabel()}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p className="font-bold mb-1">Estado de Cumplimiento</p>
              <p>Nivel de Riesgo: <span className={getRiskLevelColor(riskLevel)}>{riskLevel.toUpperCase()}</span></p>
              {regulations.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold text-[10px] text-muted-foreground">REGULACIONES:</p>
                  <ul className="list-disc pl-3">
                    {regulations.map(reg => (
                      <li key={reg}>{reg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showDetails && regulations.length > 0 && (
        <div className="flex gap-1">
          {regulations.slice(0, 2).map(reg => (
            <Badge key={reg} variant="outline" className="text-[10px] h-5 px-1.5">
              {reg}
            </Badge>
          ))}
          {regulations.length > 2 && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              +{regulations.length - 2}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
