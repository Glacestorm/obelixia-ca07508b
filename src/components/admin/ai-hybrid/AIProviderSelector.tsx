/**
 * AIProviderSelector - Selector reutilizable de proveedor de IA
 * Con indicadores de estado, créditos y clasificación
 */

import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Cloud, 
  Server, 
  Zap, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useAIProviders, type AIProvider, type ProviderCredential } from '@/hooks/admin/ai-hybrid';
import { cn } from '@/lib/utils';

interface AIProviderSelectorProps {
  value?: string;
  onChange: (providerId: string) => void;
  companyId?: string;
  workspaceId?: string;
  showCredits?: boolean;
  showStatus?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function AIProviderSelector({
  value,
  onChange,
  companyId,
  workspaceId,
  showCredits = true,
  showStatus = true,
  disabled = false,
  placeholder = 'Seleccionar proveedor',
  className,
}: AIProviderSelectorProps) {
  const { providers, credentials, fetchCredentials, testConnection, isLoading } = useAIProviders();
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'checking' | 'connected' | 'disconnected'>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);

  useEffect(() => {
    if (companyId || workspaceId) {
      fetchCredentials(companyId, workspaceId);
    }
  }, [companyId, workspaceId, fetchCredentials]);

  const getProviderCredential = (providerId: string): ProviderCredential | undefined => {
    return credentials.find(c => c.provider_id === providerId);
  };

  const getProviderIcon = (type: AIProvider['provider_type']) => {
    switch (type) {
      case 'local':
        return <Server className="h-4 w-4 text-green-500" />;
      case 'external':
        return <Cloud className="h-4 w-4 text-blue-500" />;
      case 'hybrid':
        return <Zap className="h-4 w-4 text-purple-500" />;
    }
  };

  const getStatusIcon = (status?: 'checking' | 'connected' | 'disconnected') => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
      case 'connected':
        return <Wifi className="h-3 w-3 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  const getCreditsBadge = (credential?: ProviderCredential) => {
    if (!credential || !showCredits) return null;

    const balance = credential.credits_balance;
    const threshold = credential.credits_alert_threshold;
    const percentage = threshold > 0 ? (balance / threshold) * 100 : 100;

    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
    if (balance <= 0) variant = 'destructive';
    else if (percentage <= 20) variant = 'destructive';
    else if (percentage <= 50) variant = 'secondary';

    return (
      <Badge variant={variant} className="ml-2 text-xs">
        ${balance.toFixed(2)}
      </Badge>
    );
  };

  const handleTestAll = async () => {
    setIsTestingAll(true);
    const newStatus: Record<string, 'checking' | 'connected' | 'disconnected'> = {};
    
    for (const provider of providers) {
      newStatus[provider.id] = 'checking';
    }
    setConnectionStatus(newStatus);

    for (const provider of providers) {
      try {
        const result = await testConnection(provider.id);
        setConnectionStatus(prev => ({
          ...prev,
          [provider.id]: result.success ? 'connected' : 'disconnected',
        }));
      } catch {
        setConnectionStatus(prev => ({
          ...prev,
          [provider.id]: 'disconnected',
        }));
      }
    }
    
    setIsTestingAll(false);
  };

  const selectedProvider = providers.find(p => p.id === value);
  const selectedCredential = value ? getProviderCredential(value) : undefined;

  // Group providers by type
  const localProviders = providers.filter(p => p.provider_type === 'local');
  const externalProviders = providers.filter(p => p.provider_type === 'external');
  const hybridProviders = providers.filter(p => p.provider_type === 'hybrid');

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder={placeholder}>
            {selectedProvider && (
              <div className="flex items-center gap-2">
                {getProviderIcon(selectedProvider.provider_type)}
                <span>{selectedProvider.name}</span>
                {showStatus && getStatusIcon(connectionStatus[selectedProvider.id])}
                {getCreditsBadge(selectedCredential)}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {localProviders.length > 0 && (
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2">
                <Server className="h-3 w-3" />
                IA Local
              </SelectLabel>
              {localProviders.map(provider => (
                <SelectItem key={provider.id} value={provider.id}>
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2">
                      {getProviderIcon(provider.provider_type)}
                      <span>{provider.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {showStatus && getStatusIcon(connectionStatus[provider.id])}
                      {getCreditsBadge(getProviderCredential(provider.id))}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {externalProviders.length > 0 && (
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2">
                <Cloud className="h-3 w-3" />
                IA Externa
              </SelectLabel>
              {externalProviders.map(provider => (
                <SelectItem key={provider.id} value={provider.id}>
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2">
                      {getProviderIcon(provider.provider_type)}
                      <span>{provider.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {showStatus && getStatusIcon(connectionStatus[provider.id])}
                      {getCreditsBadge(getProviderCredential(provider.id))}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {hybridProviders.length > 0 && (
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2">
                <Zap className="h-3 w-3" />
                Híbrido
              </SelectLabel>
              {hybridProviders.map(provider => (
                <SelectItem key={provider.id} value={provider.id}>
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2">
                      {getProviderIcon(provider.provider_type)}
                      <span>{provider.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {showStatus && getStatusIcon(connectionStatus[provider.id])}
                      {getCreditsBadge(getProviderCredential(provider.id))}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>

      {showStatus && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleTestAll}
                disabled={isTestingAll || providers.length === 0}
                className="h-9 w-9"
              >
                <RefreshCw className={cn("h-4 w-4", isTestingAll && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Verificar conexiones</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export default AIProviderSelector;
