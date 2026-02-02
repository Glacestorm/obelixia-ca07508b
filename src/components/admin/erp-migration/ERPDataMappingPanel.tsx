/**
 * ERPDataMappingPanel - Panel de mapeo de plan de cuentas
 * Mapeo visual entre sistema origen y destino con árbol PGC 2007
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowRight,
  ArrowRightLeft,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Search,
  Save,
  RefreshCw,
  Loader2,
  TreeDeciduous,
  FileSpreadsheet,
  Wand2,
  Info,
  Check,
  X
} from 'lucide-react';
import { useERPMigration, ERPChartMapping } from '@/hooks/admin/integrations/useERPMigration';
import { PGCAccountTree } from './PGCAccountTree';
import { cn } from '@/lib/utils';

interface ERPDataMappingPanelProps {
  sessionId?: string;
}

export function ERPDataMappingPanel({ sessionId }: ERPDataMappingPanelProps) {
  const [searchSource, setSearchSource] = useState('');
  const [searchTarget, setSearchTarget] = useState('');
  const [localMappings, setLocalMappings] = useState<ERPChartMapping[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'tree'>('table');
  const [selectedMappingIndex, setSelectedMappingIndex] = useState<number | null>(null);
  const [isTreeDialogOpen, setIsTreeDialogOpen] = useState(false);

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
        source_account_name: '',
        target_account_code: s.target_code,
        target_account_name: '',
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

  // Handle PGC tree selection
  const handleTreeSelect = useCallback((code: string, name: string) => {
    if (selectedMappingIndex !== null) {
      setLocalMappings(prev => {
        const updated = [...prev];
        updated[selectedMappingIndex] = { 
          ...updated[selectedMappingIndex], 
          target_account_code: code,
          target_account_name: name,
          manual_override: true 
        };
        return updated;
      });
      setHasChanges(true);
      setIsTreeDialogOpen(false);
      setSelectedMappingIndex(null);
    }
  }, [selectedMappingIndex]);

  // Toggle verification
  const toggleVerification = useCallback((index: number) => {
    setLocalMappings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], is_verified: !updated[index].is_verified };
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

  // Auto-accept high confidence mappings
  const autoAcceptHighConfidence = useCallback(() => {
    setLocalMappings(prev => prev.map(m => ({
      ...m,
      is_verified: m.ai_confidence && m.ai_confidence >= 90 ? true : m.is_verified
    })));
    setHasChanges(true);
  }, []);

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    const variant = confidence >= 90 ? 'default' : confidence >= 70 ? 'secondary' : 'destructive';
    const colors = confidence >= 90 
      ? 'bg-green-500/10 text-green-600 border-green-500/20' 
      : confidence >= 70 
        ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
        : 'bg-red-500/10 text-red-600 border-red-500/20';
    return (
      <Badge variant="outline" className={cn("text-xs", colors)}>
        <Sparkles className="h-3 w-3 mr-1" />
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
                Vincula las cuentas del sistema origen con el PGC 2007
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={autoAcceptHighConfidence}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Auto-aceptar ≥90%
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Verificar automáticamente mapeos con confianza ≥90%
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {hasChanges && (
                <Badge variant="secondary" className="animate-pulse">
                  Cambios sin guardar
                </Badge>
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

      {/* View Toggle & Filters */}
      <div className="flex items-center gap-4">
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'table' | 'tree')}>
          <TabsList>
            <TabsTrigger value="table" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Tabla
            </TabsTrigger>
            <TabsTrigger value="tree" className="gap-2">
              <TreeDeciduous className="h-4 w-4" />
              Árbol PGC
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex-1 grid grid-cols-2 gap-4">
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
      </div>

      {/* Main Content */}
      {activeView === 'table' ? (
        <Card>
          <CardContent className="pt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-[1fr,40px,1fr,100px,60px] gap-2 p-2 text-sm font-medium text-muted-foreground border-b sticky top-0 bg-background z-10">
                  <div>Cuenta Origen</div>
                  <div></div>
                  <div>Cuenta Destino (PGC 2007)</div>
                  <div className="text-center">Confianza IA</div>
                  <div className="text-center">Estado</div>
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
                        "grid grid-cols-[1fr,40px,1fr,100px,60px] gap-2 p-2 rounded-lg items-center transition-colors",
                        mapping.manual_override && "bg-blue-500/5 border border-blue-500/20",
                        mapping.is_verified && "bg-green-500/5 border border-green-500/20",
                        !mapping.target_account_code && "bg-yellow-500/5 border border-yellow-500/20"
                      )}
                    >
                      {/* Source */}
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-sm bg-muted px-2 py-1 rounded min-w-[60px] text-center">
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

                      {/* Target with Tree Picker */}
                      <div className="flex items-center gap-2">
                        <Input
                          value={mapping.target_account_code || ''}
                          onChange={(e) => handleMappingChange(index, 'target_account_code', e.target.value)}
                          placeholder="Código..."
                          className="w-20 font-mono text-sm"
                        />
                        <Dialog open={isTreeDialogOpen && selectedMappingIndex === index} onOpenChange={(open) => {
                          setIsTreeDialogOpen(open);
                          if (open) setSelectedMappingIndex(index);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <TreeDeciduous className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle>Seleccionar Cuenta PGC 2007</DialogTitle>
                            </DialogHeader>
                            <div className="h-[500px]">
                              <PGCAccountTree 
                                onSelect={handleTreeSelect}
                                selectedCode={mapping.target_account_code}
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Input
                          value={mapping.target_account_name || ''}
                          onChange={(e) => handleMappingChange(index, 'target_account_name', e.target.value)}
                          placeholder="Nombre cuenta..."
                          className="flex-1 text-sm"
                        />
                      </div>

                      {/* Confidence */}
                      <div className="flex justify-center items-center">
                        {mapping.manual_override ? (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">
                            Manual
                          </Badge>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                {getConfidenceBadge(mapping.ai_confidence)}
                              </TooltipTrigger>
                              {mapping.ai_reasoning && (
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">{mapping.ai_reasoning}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>

                      {/* Verification */}
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8",
                            mapping.is_verified && "text-green-500 hover:text-green-600"
                          )}
                          onClick={() => toggleVerification(index)}
                        >
                          {mapping.is_verified ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Check className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        /* Tree View */
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cuentas Origen (Pendientes)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1">
                  {filteredMappings.filter(m => !m.is_verified).map((mapping, idx) => (
                    <div 
                      key={mapping.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted/50",
                        selectedMappingIndex === idx && "bg-primary/10 border border-primary/30"
                      )}
                      onClick={() => {
                        setSelectedMappingIndex(localMappings.findIndex(m => m.id === mapping.id));
                        setIsTreeDialogOpen(true);
                      }}
                    >
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {mapping.source_account_code}
                      </span>
                      <span className="text-sm truncate">{mapping.source_account_name}</span>
                      {getConfidenceBadge(mapping.ai_confidence)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Plan General Contable 2007</CardTitle>
            </CardHeader>
            <CardContent>
              <PGCAccountTree 
                onSelect={handleTreeSelect}
                selectedCode={selectedMappingIndex !== null ? localMappings[selectedMappingIndex]?.target_account_code : undefined}
                className="h-[400px]"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 text-center text-sm">
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
        <div className="p-3 rounded-lg bg-purple-500/10">
          <p className="text-2xl font-bold text-purple-600">
            {localMappings.filter(m => m.ai_confidence && m.ai_confidence >= 90).length}
          </p>
          <p className="text-muted-foreground">Alta Confianza</p>
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
