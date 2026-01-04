/**
 * Panel de Importación Inteligente con IA para Maestros
 */

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Upload, 
  Sparkles, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Download,
  Users,
  Truck,
  Package,
  Receipt,
  Wallet,
  Warehouse,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
  Eye
} from 'lucide-react';
import { useMaestrosImport, EntityType, DetectedEntity, ImportExecution } from '@/hooks/erp/useMaestrosImport';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const entityIcons: Record<EntityType, React.ReactNode> = {
  customers: <Users className="h-4 w-4" />,
  suppliers: <Truck className="h-4 w-4" />,
  items: <Package className="h-4 w-4" />,
  taxes: <Receipt className="h-4 w-4" />,
  payment_terms: <Wallet className="h-4 w-4" />,
  warehouses: <Warehouse className="h-4 w-4" />
};

const entityLabels: Record<EntityType, string> = {
  customers: 'Clientes',
  suppliers: 'Proveedores',
  items: 'Artículos',
  taxes: 'Impuestos',
  payment_terms: 'Cond. Pago',
  warehouses: 'Almacenes'
};

const entityColors: Record<EntityType, string> = {
  customers: 'bg-blue-500/10 text-blue-600 border-blue-200',
  suppliers: 'bg-green-500/10 text-green-600 border-green-200',
  items: 'bg-purple-500/10 text-purple-600 border-purple-200',
  taxes: 'bg-orange-500/10 text-orange-600 border-orange-200',
  payment_terms: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  warehouses: 'bg-amber-500/10 text-amber-600 border-amber-200'
};

interface MaestrosImportPanelProps {
  onImportComplete?: () => void;
  className?: string;
}

export function MaestrosImportPanel({ onImportComplete, className }: MaestrosImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEntities, setSelectedEntities] = useState<Set<EntityType>>(new Set());
  const [activeTab, setActiveTab] = useState<'upload' | 'analysis' | 'results'>('upload');
  const [dragOver, setDragOver] = useState(false);

  const {
    isAnalyzing,
    isImporting,
    analysisResult,
    importResults,
    currentFile,
    analyzeFile,
    importEntity,
    importAll,
    reset
  } = useMaestrosImport();

  // Manejar selección de archivo
  const handleFileSelect = useCallback(async (file: File) => {
    const result = await analyzeFile(file);
    if (result) {
      // Seleccionar automáticamente entidades con alta confianza
      const autoSelect = new Set<EntityType>();
      result.detected_entities
        .filter(e => e.ready_to_import && e.confidence >= 70)
        .forEach(e => autoSelect.add(e.entity_type));
      setSelectedEntities(autoSelect);
      setActiveTab('analysis');
    }
  }, [analyzeFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // Importar entidades seleccionadas
  const handleImport = useCallback(async () => {
    if (selectedEntities.size === 0) return;

    for (const entityType of selectedEntities) {
      await importEntity(entityType);
    }
    
    setActiveTab('results');
    onImportComplete?.();
  }, [selectedEntities, importEntity, onImportComplete]);

  // Toggle selección de entidad
  const toggleEntity = useCallback((entityType: EntityType) => {
    setSelectedEntities(prev => {
      const next = new Set(prev);
      if (next.has(entityType)) {
        next.delete(entityType);
      } else {
        next.add(entityType);
      }
      return next;
    });
  }, []);

  // Reiniciar proceso
  const handleReset = useCallback(() => {
    reset();
    setSelectedEntities(new Set());
    setActiveTab('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [reset]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Importación Inteligente con IA</CardTitle>
              <CardDescription>
                Importa datos desde cualquier formato: CSV, Excel, JSON, PDF, texto...
              </CardDescription>
            </div>
          </div>
          {(analysisResult || importResults.length > 0) && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Nueva importación
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 px-4">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Subir archivo
            </TabsTrigger>
            <TabsTrigger value="analysis" disabled={!analysisResult} className="gap-2">
              <Eye className="h-4 w-4" />
              Análisis
              {analysisResult && (
                <Badge variant="secondary" className="ml-1">
                  {analysisResult.detected_entities.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="results" disabled={importResults.length === 0} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Resultados
              {importResults.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {importResults.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Upload */}
          <TabsContent value="upload" className="p-6 m-0">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-all",
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                isAnalyzing && "opacity-50 pointer-events-none"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {isAnalyzing ? (
                <div className="space-y-4">
                  <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                  <div>
                    <p className="font-medium">Analizando archivo con IA...</p>
                    <p className="text-sm text-muted-foreground">
                      Detectando tipos de datos y mapeando campos
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-center gap-4 mb-4">
                    <FileSpreadsheet className="h-10 w-10 text-green-600" />
                    <FileJson className="h-10 w-10 text-amber-600" />
                    <FileText className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Arrastra tu archivo aquí
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Soporta CSV, Excel, JSON, XML, PDF, TXT y más
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls,.json,.xml,.txt,.pdf"
                    onChange={handleFileInputChange}
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar archivo
                  </Button>
                </>
              )}
            </div>

            {/* Formatos soportados */}
            <div className="mt-6 grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
              {['CSV', 'Excel', 'JSON', 'XML', 'PDF', 'TXT'].map((format) => (
                <div key={format} className="p-2 rounded-lg bg-muted/50 text-xs font-medium">
                  {format}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tab: Analysis */}
          <TabsContent value="analysis" className="p-6 m-0">
            {analysisResult && (
              <div className="space-y-6">
                {/* Resumen */}
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle>Análisis completado</AlertTitle>
                  <AlertDescription>
                    {analysisResult.summary}
                  </AlertDescription>
                </Alert>

                {/* Archivo actual */}
                {currentFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{currentFile.name}</span>
                    <Badge variant="outline">{analysisResult.file_format}</Badge>
                    <Badge variant="secondary">{analysisResult.total_records} registros</Badge>
                  </div>
                )}

                {/* Entidades detectadas */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    Entidades detectadas
                    <Badge>{analysisResult.detected_entities.length}</Badge>
                  </h4>
                  
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3 pr-4">
                      <AnimatePresence>
                        {analysisResult.detected_entities.map((entity, idx) => (
                          <motion.div
                            key={entity.entity_type}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                          >
                            <EntityCard 
                              entity={entity}
                              selected={selectedEntities.has(entity.entity_type)}
                              onToggle={() => toggleEntity(entity.entity_type)}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {selectedEntities.size} entidades seleccionadas
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (selectedEntities.size === analysisResult.detected_entities.length) {
                          setSelectedEntities(new Set());
                        } else {
                          setSelectedEntities(new Set(
                            analysisResult.detected_entities.map(e => e.entity_type)
                          ));
                        }
                      }}
                    >
                      {selectedEntities.size === analysisResult.detected_entities.length 
                        ? 'Deseleccionar todo' 
                        : 'Seleccionar todo'}
                    </Button>
                    <Button 
                      onClick={handleImport}
                      disabled={selectedEntities.size === 0 || isImporting}
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Importar seleccionados
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab: Results */}
          <TabsContent value="results" className="p-6 m-0">
            <div className="space-y-4">
              <h4 className="font-medium">Resultados de importación</h4>
              
              <ScrollArea className="h-[350px]">
                <div className="space-y-3 pr-4">
                  {importResults.map((result, idx) => (
                    <ResultCard key={result.id} result={result} index={idx} />
                  ))}
                </div>
              </ScrollArea>

              {/* Resumen final */}
              {importResults.length > 0 && (
                <div className="pt-4 border-t">
                  <ImportSummary results={importResults} />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Componente para mostrar entidad detectada
function EntityCard({ 
  entity, 
  selected, 
  onToggle 
}: { 
  entity: DetectedEntity; 
  selected: boolean; 
  onToggle: () => void;
}) {
  const [showSample, setShowSample] = useState(false);

  return (
    <div className={cn(
      "border rounded-lg p-4 transition-all",
      selected ? "border-primary bg-primary/5" : "border-muted",
      entity.ready_to_import ? "opacity-100" : "opacity-60"
    )}>
      <div className="flex items-start gap-3">
        <Checkbox 
          checked={selected}
          onCheckedChange={onToggle}
          disabled={!entity.ready_to_import}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("p-1.5 rounded", entityColors[entity.entity_type])}>
              {entityIcons[entity.entity_type]}
            </span>
            <span className="font-medium">{entityLabels[entity.entity_type]}</span>
            <Badge variant="secondary">{entity.records_count} registros</Badge>
            <Badge 
              variant={entity.confidence >= 80 ? "default" : entity.confidence >= 60 ? "secondary" : "destructive"}
              className="ml-auto"
            >
              {entity.confidence}% confianza
            </Badge>
          </div>

          {/* Warnings */}
          {entity.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {entity.warnings.map((warning, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* Muestra de datos */}
          {entity.sample_data.length > 0 && (
            <div className="mt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={() => setShowSample(!showSample)}
              >
                <Eye className="h-3 w-3 mr-1" />
                {showSample ? 'Ocultar muestra' : 'Ver muestra'}
              </Button>
              
              {showSample && (
                <div className="mt-2 p-2 rounded bg-muted/50 text-xs overflow-auto max-h-32">
                  <pre>{JSON.stringify(entity.sample_data[0], null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente para mostrar resultado de importación
function ResultCard({ result, index }: { result: ImportExecution; index: number }) {
  const [showErrors, setShowErrors] = useState(false);

  const statusConfig = {
    pending: { icon: Loader2, color: 'text-muted-foreground', label: 'Pendiente' },
    processing: { icon: Loader2, color: 'text-blue-600', label: 'Procesando...' },
    success: { icon: CheckCircle, color: 'text-green-600', label: 'Completado' },
    partial: { icon: AlertTriangle, color: 'text-amber-600', label: 'Parcial' },
    error: { icon: XCircle, color: 'text-destructive', label: 'Error' }
  };

  const config = statusConfig[result.status];
  const Icon = config.icon;
  const isProcessing = result.status === 'processing' || result.status === 'pending';
  const progress = result.total_records > 0 
    ? Math.round((result.inserted_count / result.total_records) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="border rounded-lg p-4"
    >
      <div className="flex items-center gap-3">
        <span className={cn("p-2 rounded-lg", entityColors[result.entity_type])}>
          {entityIcons[result.entity_type]}
        </span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">{entityLabels[result.entity_type]}</span>
            <div className={cn("flex items-center gap-1 text-sm", config.color)}>
              <Icon className={cn("h-4 w-4", isProcessing && "animate-spin")} />
              {config.label}
            </div>
          </div>
          
          <Progress value={progress} className="h-2 mb-2" />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{result.inserted_count} de {result.total_records} insertados</span>
            {result.error_count > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 text-xs text-destructive"
                onClick={() => setShowErrors(!showErrors)}
              >
                {result.error_count} errores
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Errores */}
      {showErrors && result.errors.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <ScrollArea className="h-24">
            <div className="space-y-1 text-xs">
              {result.errors.slice(0, 10).map((error, i) => (
                <div key={i} className="flex items-start gap-2 text-destructive">
                  <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    {error.field ? `[${error.field}] ` : ''}{error.error}
                  </span>
                </div>
              ))}
              {result.errors.length > 10 && (
                <div className="text-muted-foreground">
                  ... y {result.errors.length - 10} errores más
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </motion.div>
  );
}

// Componente de resumen
function ImportSummary({ results }: { results: ImportExecution[] }) {
  const totalRecords = results.reduce((sum, r) => sum + r.total_records, 0);
  const totalInserted = results.reduce((sum, r) => sum + r.inserted_count, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.error_count, 0);
  const successCount = results.filter(r => r.status === 'success').length;

  return (
    <div className="grid grid-cols-4 gap-4 text-center">
      <div className="p-3 rounded-lg bg-muted/50">
        <div className="text-2xl font-bold">{results.length}</div>
        <div className="text-xs text-muted-foreground">Entidades</div>
      </div>
      <div className="p-3 rounded-lg bg-green-500/10">
        <div className="text-2xl font-bold text-green-600">{totalInserted}</div>
        <div className="text-xs text-muted-foreground">Insertados</div>
      </div>
      <div className="p-3 rounded-lg bg-destructive/10">
        <div className="text-2xl font-bold text-destructive">{totalErrors}</div>
        <div className="text-xs text-muted-foreground">Errores</div>
      </div>
      <div className="p-3 rounded-lg bg-blue-500/10">
        <div className="text-2xl font-bold text-blue-600">
          {totalRecords > 0 ? Math.round((totalInserted / totalRecords) * 100) : 0}%
        </div>
        <div className="text-xs text-muted-foreground">Éxito</div>
      </div>
    </div>
  );
}

export default MaestrosImportPanel;
