/**
 * ERPDataMappingPanel - Panel de mapeo de plan de cuentas
 * Mapeo visual entre sistema origen y destino
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowRight,
  ArrowRightLeft,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Search,
  Save,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useERPMigration, ERPChartMapping } from '@/hooks/admin/integrations/useERPMigration';
import { cn } from '@/lib/utils';

interface ERPDataMappingPanelProps {
  sessionId?: string;
}

export function ERPDataMappingPanel({ sessionId }: ERPDataMappingPanelProps) {
  const [searchSource, setSearchSource] = useState('');
  const [searchTarget, setSearchTarget] = useState('');
  const [localMappings, setLocalMappings] = useState<ERPChartMapping[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const {
    chartMappings,
    analysis,
    updateChartMappings,
    isLoading
  } = useERPMigration();

  // Load mappings
  useEffect(() => {
    if (chartMappings.length > 0) {
      setLocalMappings(chartMappings);
    } else if (analysis?.suggested_mappings) {
      // Convert AI suggestions to mappings
      const suggested = analysis.suggested_mappings.map((s, idx) => ({
        id: `temp-${idx}`,
        session_id: sessionId || '',
        source_account_code: s.source_code,
        target_account_code: s.target_code,
        transform_type: 'direct' as const,
        ai_confidence: s.confidence,
        ai_reasoning: s.reasoning,
        manual_override: false,
        is_verified: false
      }));
      setLocalMappings(suggested);
    }
  }, [chartMappings, analysis, sessionId]);

  // Filter mappings
  const filteredMappings = localMappings.filter(m => {
    const matchSource = !searchSource || 
      m.source_account_code.toLowerCase().includes(searchSource.toLowerCase()) ||
      m.source_account_name?.toLowerCase().includes(searchSource.toLowerCase());
    const matchTarget = !searchTarget ||
      m.target_account_code?.toLowerCase().includes(searchTarget.toLowerCase()) ||
      m.target_account_name?.toLowerCase().includes(searchTarget.toLowerCase());
    return matchSource && matchTarget;
  });

  // Handle mapping change
  const handleMappingChange = useCallback((index: number, field: keyof ERPChartMapping, value: string) => {
    setLocalMappings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value, manual_override: true };
      return updated;
    });
    setHasChanges(true);
  }, []);

  // Save mappings
  const handleSave = useCallback(async () => {
    if (!sessionId) return;
    const success = await updateChartMappings(sessionId, localMappings);
    if (success) {
      setHasChanges(false);
    }
  }, [sessionId, localMappings, updateChartMappings]);

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    const variant = confidence >= 90 ? 'default' : confidence >= 70 ? 'secondary' : 'destructive';
    return (
      <Badge variant={variant} className="text-xs">
        {confidence}%
      </Badge>
    );
  };

  if (!sessionId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Selecciona una sesión de migración para mapear cuentas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                Mapeo de Plan de Cuentas
              </CardTitle>
              <CardDescription>
                Vincula las cuentas del sistema origen con el plan de cuentas destino
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="secondary">Cambios sin guardar</Badge>
              )}
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar Mapeo
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cuenta origen..."
            value={searchSource}
            onChange={(e) => setSearchSource(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cuenta destino..."
            value={searchTarget}
            onChange={(e) => setSearchTarget(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Mappings Table */}
      <Card>
        <CardContent className="pt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-[1fr,40px,1fr,80px] gap-2 p-2 text-sm font-medium text-muted-foreground border-b">
                <div>Cuenta Origen</div>
                <div></div>
                <div>Cuenta Destino</div>
                <div className="text-center">IA</div>
              </div>

              {/* Rows */}
              {filteredMappings.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay mapeos disponibles</p>
                  <p className="text-xs">Carga un archivo para generar mapeos automáticos</p>
                </div>
              ) : (
                filteredMappings.map((mapping, index) => (
                  <div 
                    key={mapping.id}
                    className={cn(
                      "grid grid-cols-[1fr,40px,1fr,80px] gap-2 p-2 rounded-lg items-center",
                      mapping.manual_override ? "bg-blue-500/5 border border-blue-500/20" : "bg-muted/30",
                      mapping.is_verified && "bg-green-500/5 border border-green-500/20"
                    )}
                  >
                    {/* Source */}
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        {mapping.source_account_code}
                      </div>
                      <span className="text-sm text-muted-foreground truncate">
                        {mapping.source_account_name || ''}
                      </span>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Target */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={mapping.target_account_code || ''}
                        onChange={(e) => handleMappingChange(index, 'target_account_code', e.target.value)}
                        placeholder="Código..."
                        className="w-24 font-mono text-sm"
                      />
                      <Input
                        value={mapping.target_account_name || ''}
                        onChange={(e) => handleMappingChange(index, 'target_account_name', e.target.value)}
                        placeholder="Nombre cuenta..."
                        className="flex-1 text-sm"
                      />
                    </div>

                    {/* Confidence */}
                    <div className="flex justify-center items-center gap-1">
                      {mapping.manual_override ? (
                        <Badge variant="outline" className="text-xs">Manual</Badge>
                      ) : mapping.is_verified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        getConfidenceBadge(mapping.ai_confidence)
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 text-center text-sm">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-2xl font-bold">{localMappings.length}</p>
          <p className="text-muted-foreground">Total</p>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10">
          <p className="text-2xl font-bold text-green-600">
            {localMappings.filter(m => m.is_verified).length}
          </p>
          <p className="text-muted-foreground">Verificados</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-500/10">
          <p className="text-2xl font-bold text-blue-600">
            {localMappings.filter(m => m.manual_override).length}
          </p>
          <p className="text-muted-foreground">Manuales</p>
        </div>
        <div className="p-3 rounded-lg bg-yellow-500/10">
          <p className="text-2xl font-bold text-yellow-600">
            {localMappings.filter(m => !m.target_account_code).length}
          </p>
          <p className="text-muted-foreground">Pendientes</p>
        </div>
      </div>
    </div>
  );
}

export default ERPDataMappingPanel;
