/**
 * AI Credits Panel
 * Gestión de créditos y consumo de IA
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Coins,
  AlertTriangle,
  RefreshCw,
  Clock,
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Server,
  Cloud,
} from 'lucide-react';
import { useAICredits, CreditBalance, CreditTransaction } from '@/hooks/admin/ai-hybrid';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AICreditsPanelProps {
  className?: string;
}

export function AICreditsPanel({ className }: AICreditsPanelProps) {
  const {
    balances,
    transactions,
    usageStats,
    alerts,
    isLoading,
    fetchBalances,
    fetchTransactions,
    getUsageStats,
  } = useAICredits();

  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);

  useEffect(() => {
    fetchBalances();
  }, []);

  useEffect(() => {
    if (balances.length > 0 && !selectedCredentialId) {
      setSelectedCredentialId(balances[0].credentialId);
    }
  }, [balances, selectedCredentialId]);

  useEffect(() => {
    if (selectedCredentialId) {
      fetchTransactions(selectedCredentialId, 50);
      getUsageStats(selectedCredentialId);
    }
  }, [selectedCredentialId]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'usage':
        return <Zap className="h-4 w-4 text-amber-500" />;
      case 'purchase':
        return <ArrowUpRight className="h-4 w-4 text-emerald-500" />;
      case 'refund':
        return <ArrowDownRight className="h-4 w-4 text-blue-500" />;
      case 'adjustment':
        return <RefreshCw className="h-4 w-4 text-violet-500" />;
      default:
        return <Coins className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatCredits = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const currentBalance = balances.find(b => b.credentialId === selectedCredentialId);
  const usagePercentage = currentBalance 
    ? Math.min(((currentBalance.alertThreshold - currentBalance.balance) / currentBalance.alertThreshold) * 100, 100)
    : 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Balance Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Main Balance Card */}
        <Card className="md:col-span-2 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-500" />
                Balance de Créditos
              </CardTitle>
              {balances.length > 1 && (
                <Select value={selectedCredentialId || ''} onValueChange={setSelectedCredentialId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {balances.map(b => (
                      <SelectItem key={b.credentialId} value={b.credentialId}>
                        {b.providerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">
                {currentBalance ? formatCredits(currentBalance.balance) : '0.00'}
              </span>
              <span className="text-muted-foreground">créditos disponibles</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estado</span>
                <Badge 
                  variant={currentBalance?.status === 'healthy' ? 'default' : 'destructive'}
                  className={cn(
                    'text-xs',
                    currentBalance?.status === 'healthy' && 'bg-emerald-500',
                    currentBalance?.status === 'low' && 'bg-amber-500',
                    currentBalance?.status === 'critical' && 'bg-destructive'
                  )}
                >
                  {currentBalance?.status || 'Sin datos'}
                </Badge>
              </div>
              <Progress value={100 - usagePercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Umbral de alerta: {currentBalance ? formatCredits(currentBalance.alertThreshold) : '0'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin alertas activas
              </p>
            ) : (
              <ScrollArea className="h-[120px]">
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        'p-2 rounded-lg text-xs',
                        alert.severity === 'critical' && 'bg-destructive/10 text-destructive',
                        alert.severity === 'warning' && 'bg-amber-500/10 text-amber-600',
                        alert.severity === 'info' && 'bg-blue-500/10 text-blue-600'
                      )}
                    >
                      {alert.message}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Estadísticas de Uso
              </CardTitle>
              <CardDescription>Análisis de consumo por proveedor</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => selectedCredentialId && getUsageStats(selectedCredentialId)}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!usageStats ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Cargando estadísticas...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Zap className="h-4 w-4" />
                  Total Requests
                </div>
                <p className="text-2xl font-bold">{usageStats.totalRequests.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <BarChart3 className="h-4 w-4" />
                  Tokens Usados
                </div>
                <p className="text-2xl font-bold">{usageStats.totalTokens.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Coins className="h-4 w-4" />
                  Costo Total
                </div>
                <p className="text-2xl font-bold">${formatCredits(usageStats.totalCost)}</p>
              </div>
            </div>
          )}

          {/* Provider Breakdown */}
          {usageStats?.byProvider && Object.keys(usageStats.byProvider).length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Uso por Proveedor</h4>
              <div className="space-y-3">
                {Object.entries(usageStats.byProvider).map(([provider, data]) => (
                  <div key={provider} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {provider.toLowerCase().includes('ollama') ? (
                          <Server className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Cloud className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-medium">{provider}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {data.requests} requests • ${formatCredits(data.cost)}
                      </span>
                    </div>
                    <Progress 
                      value={(data.requests / usageStats.totalRequests) * 100} 
                      className="h-1.5" 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de Transacciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay transacciones registradas
              </p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {getTransactionIcon(tx.transaction_type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {tx.description || tx.transaction_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(tx.created_at), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'text-sm font-semibold',
                        tx.amount > 0 ? 'text-emerald-600' : 'text-destructive'
                      )}>
                        {tx.amount > 0 ? '+' : ''}{formatCredits(tx.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Saldo: {formatCredits(tx.balance_after)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default AICreditsPanel;
