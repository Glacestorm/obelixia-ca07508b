/**
 * AICreditsBadge - Widget compacto de créditos de IA
 * Muestra saldo, estado y enlace a recarga
 */

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Coins, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Loader2,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CreditBalance } from '@/hooks/admin/ai-hybrid';

interface AICreditsBadgeProps {
  balance?: CreditBalance;
  balances?: CreditBalance[];
  showDetails?: boolean;
  compact?: boolean;
  onRefresh?: () => Promise<void>;
  onNavigateToCredits?: () => void;
  className?: string;
}

const STATUS_CONFIG = {
  healthy: {
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    progressColor: 'bg-green-500',
  },
  low: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
    icon: <TrendingDown className="h-3.5 w-3.5" />,
    progressColor: 'bg-amber-500',
  },
  critical: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    progressColor: 'bg-orange-500',
  },
  empty: {
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    progressColor: 'bg-red-500',
  },
};

// Provider billing URLs
const BILLING_URLS: Record<string, string> = {
  openai: 'https://platform.openai.com/account/billing',
  anthropic: 'https://console.anthropic.com/settings/billing',
  google: 'https://console.cloud.google.com/billing',
  cohere: 'https://dashboard.cohere.com/billing',
  mistral: 'https://console.mistral.ai/billing',
  groq: 'https://console.groq.com/settings/billing',
};

export function AICreditsBadge({
  balance,
  balances = [],
  showDetails = true,
  compact = false,
  onRefresh,
  onNavigateToCredits,
  className,
}: AICreditsBadgeProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Calculate totals if multiple balances
  const allBalances = balance ? [balance] : balances;
  const totalBalance = allBalances.reduce((sum, b) => sum + b.balance, 0);
  const totalThreshold = allBalances.reduce((sum, b) => sum + b.alertThreshold, 0);
  const overallPercentage = totalThreshold > 0 ? (totalBalance / totalThreshold) * 100 : 100;

  // Determine overall status
  let overallStatus: CreditBalance['status'] = 'healthy';
  if (totalBalance <= 0) overallStatus = 'empty';
  else if (overallPercentage <= 5) overallStatus = 'critical';
  else if (overallPercentage <= 20) overallStatus = 'low';

  const config = STATUS_CONFIG[overallStatus];

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const getBillingUrl = (providerName: string): string | null => {
    const key = providerName.toLowerCase();
    for (const [provider, url] of Object.entries(BILLING_URLS)) {
      if (key.includes(provider)) {
        return url;
      }
    }
    return null;
  };

  const badgeContent = (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 cursor-pointer transition-colors hover:bg-muted/50",
      config.bgColor,
      className
    )}>
      <Coins className={cn("h-3.5 w-3.5", config.color)} />
      <span className={cn("text-xs font-medium", config.color)}>
        ${totalBalance.toFixed(2)}
      </span>
      {!compact && config.icon}
    </div>
  );

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>Créditos de IA: ${totalBalance.toFixed(2)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {badgeContent}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <h4 className="font-medium">Créditos de IA</h4>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {/* Total Balance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">${totalBalance.toFixed(2)}</span>
              <Badge variant={overallStatus === 'healthy' ? 'default' : 'destructive'}>
                {overallStatus === 'healthy' ? 'Saludable' :
                 overallStatus === 'low' ? 'Bajo' :
                 overallStatus === 'critical' ? 'Crítico' : 'Agotado'}
              </Badge>
            </div>
            <Progress 
              value={Math.min(overallPercentage, 100)} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              {overallPercentage.toFixed(1)}% del umbral de alerta
            </p>
          </div>

          {/* Provider Breakdown */}
          {allBalances.length > 1 && (
            <div className="space-y-2 pt-2 border-t">
              <h5 className="text-xs font-medium text-muted-foreground">Por proveedor</h5>
              {allBalances.map((b) => {
                const statusConfig = STATUS_CONFIG[b.status];
                const billingUrl = getBillingUrl(b.providerName);
                
                return (
                  <div 
                    key={b.credentialId} 
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className={statusConfig.color}>{statusConfig.icon}</span>
                      <span className="text-sm">{b.providerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-medium", statusConfig.color)}>
                        ${b.balance.toFixed(2)}
                      </span>
                      {billingUrl && (
                        <a 
                          href={billingUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Single Provider Details */}
          {allBalances.length === 1 && allBalances[0] && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Proveedor</span>
                <span>{allBalances[0].providerName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Última actualización</span>
                <span>
                  {formatDistanceToNow(new Date(allBalances[0].lastUpdated), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </div>
              {getBillingUrl(allBalances[0].providerName) && (
                <a
                  href={getBillingUrl(allBalances[0].providerName)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Gestionar facturación
                </a>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => {
                setIsOpen(false);
                onNavigateToCredits?.();
              }}
            >
              Ver detalles
            </Button>
            {overallStatus !== 'healthy' && (
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => {
                  const firstBalance = allBalances[0];
                  if (firstBalance) {
                    const url = getBillingUrl(firstBalance.providerName);
                    if (url) window.open(url, '_blank');
                  }
                }}
              >
                <TrendingUp className="h-3.5 w-3.5 mr-1" />
                Recargar
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default AICreditsBadge;
