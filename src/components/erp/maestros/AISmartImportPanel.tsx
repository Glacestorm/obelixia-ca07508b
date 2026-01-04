/**
 * Panel de Importación Inteligente con IA para Maestros
 * Importa desde cualquier formato usando IA
 */

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  FileUp,
  Sparkles,
  Bot,
  Brain,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  Users,
  Truck,
  Package,
  Receipt,
  Wallet,
  Warehouse,
  MapPin,
  CreditCard,
  FileCheck,
  Hash,
  FileText,
  Table,
  FileSpreadsheet,
  Eye,
  Download,
  Zap,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMaestrosAgents, MaestrosModuleType, ImportJob, MaestrosAgent } from '@/hooks/erp/useMaestrosAgents';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Mapa de iconos
const MODULE_ICONS: Record<MaestrosModuleType, React.ElementType> = {
  customers: Users,
  suppliers: Truck,
  items: Package,
  taxes: Receipt,
  payment_terms: Wallet,
  warehouses: Warehouse,
  locations: MapPin,
  banks: CreditCard,
  sepa: FileCheck,
  series: Hash
};

const MODULE_LABELS: Record<MaestrosModuleType, string> = {
  customers: 'Clientes',
  suppliers: 'Proveedores',
  items: 'Artículos',
  taxes: 'Impuestos',
  payment_terms: 'Cond. Pago',
  warehouses: 'Almacenes',
  locations: 'Ubicaciones',
  banks: 'Bancos',
  sepa: 'SEPA',
  series: 'Series'
};

const STATUS_CONFIG = {
  idle: { color: 'bg-muted', text: 'Inactivo', icon: Pause },
  analyzing: { color: 'bg-blue-500', text: 'Analizando', icon: Brain },
  processing: { color: 'bg-amber-500', text: 'Procesando', icon: RefreshCw },
  active: { color: 'bg-green-500', text: 'Activo', icon: Activity },
  error: { color: 'bg-red-500', text: 'Error', icon: XCircle },
  paused: { color: 'bg-gray-400', text: 'Pausado', icon: Pause }
};

const JOB_STATUS_CONFIG = {
  pending: { color: 'text-muted-foreground', bg: 'bg-muted', label: 'Pendiente' },
  processing: { color: 'text-amber-600', bg: 'bg-amber-500/10', label: 'Procesando' },
  completed: { color: 'text-green-600', bg: 'bg-green-500/10', label: 'Completado' },
  failed: { color: 'text-red-600', bg: 'bg-red-500/10', label: 'Fallido' },
  partial: { color: 'text-orange-600', bg: 'bg-orange-500/10', label: 'Parcial' }
};

export const AISmartImportPanel: React.FC = () => {
  const {
    isLoading,
    agents,
    supervisor,
    importJobs,
    executeAIImport,
    analyzeFile,
    supervisorCoordinate,
    clearImportJob
  } = useMaestrosAgents();

  const [activeTab, setActiveTab] = useState('import');
  const [selectedModule, setSelectedModule] = useState<MaestrosModuleType>('customers');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState<{
    detectedFormat: string;
    suggestedModule: MaestrosModuleType;
    columns: string[];
    sampleData: Record<string, unknown>[];
    confidence: number;
  } | null>(null);
  const [importOptions, setImportOptions] = useState({
    autoMap: true,
    validateOnly: false,
    skipDuplicates: true
  });
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // === HANDLERS ===
  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setFileAnalysis(null);
    
    // Analizar archivo con IA
    const analysis = await analyzeFile(file);
    if (analysis) {
      setFileAnalysis(analysis);
      setSelectedModule(analysis.suggestedModule);
    }
  }, [analyzeFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleImport = useCallback(async () => {
    if (!selectedFile) return;
    await executeAIImport(selectedFile, selectedModule, importOptions);
    setSelectedFile(null);
    setFileAnalysis(null);
  }, [selectedFile, selectedModule, importOptions, executeAIImport]);

  // === RENDER AGENTS GRID ===
  const renderAgentsGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {agents.map((agent) => {
        const Icon = MODULE_ICONS[agent.type];
        const statusConfig = STATUS_CONFIG[agent.status];
        
        return (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-3 rounded-lg border bg-card hover:bg-muted/50 transition-all cursor-pointer",
              agent.status === 'active' && "ring-2 ring-green-500/50"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                "p-1.5 rounded-md",
                agent.status === 'active' ? 'bg-green-500/10' : 'bg-muted'
              )}>
                <Icon className={cn(
                  "h-4 w-4",
                  agent.status === 'active' ? 'text-green-600' : 'text-muted-foreground'
                )} />
              </div>
              <div className={cn("h-2 w-2 rounded-full", statusConfig.color)} />
            </div>
            <p className="text-xs font-medium truncate">{agent.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {agent.tasksCompleted} tareas
            </p>
          </motion.div>
        );
      })}
    </div>
  );

  // === RENDER SUPERVISOR ===
  const renderSupervisor = () => (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Supervisor General</CardTitle>
              <CardDescription className="text-xs">
                Coordina y optimiza todos los agentes de Maestros
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant={supervisor?.status === 'running' ? 'default' : 'secondary'}
            className="gap-1"
          >
            <Activity className="h-3 w-3" />
            {supervisor?.status === 'running' ? 'Activo' : supervisor?.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-background/50">
            <p className="text-2xl font-bold text-primary">{supervisor?.activeAgents || 0}</p>
            <p className="text-xs text-muted-foreground">Agentes activos</p>
          </div>
          <div className="p-3 rounded-lg bg-background/50">
            <p className="text-2xl font-bold text-green-600">{importJobs.filter(j => j.status === 'completed').length}</p>
            <p className="text-xs text-muted-foreground">Importaciones</p>
          </div>
          <div className="p-3 rounded-lg bg-background/50">
            <p className="text-2xl font-bold text-amber-600">{supervisor?.insights.length || 0}</p>
            <p className="text-xs text-muted-foreground">Insights</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => supervisorCoordinate('analyze_all_modules')}
          disabled={isLoading}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Coordinar Agentes
        </Button>
      </CardContent>
    </Card>
  );

  // === RENDER UPLOAD ZONE ===
  const renderUploadZone = () => (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer",
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50",
        selectedFile && "border-green-500 bg-green-500/5"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".csv,.xlsx,.xls,.json,.xml,.txt,.ods"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
      
      <div className="flex flex-col items-center gap-4">
        {selectedFile ? (
          <>
            <div className="p-4 rounded-full bg-green-500/10">
              <FileSpreadsheet className="h-10 w-10 text-green-600" />
            </div>
            <div className="text-center">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 rounded-full bg-primary/10">
              <Upload className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">Arrastra un archivo aquí</p>
              <p className="text-sm text-muted-foreground">
                o haz clic para seleccionar
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                CSV, Excel, JSON, XML soportados
              </p>
            </div>
          </>
        )}
      </div>

      {/* IA Badge */}
      <div className="absolute top-3 right-3">
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="h-3 w-3" />
          IA
        </Badge>
      </div>
    </div>
  );

  // === RENDER ANALYSIS ===
  const renderAnalysis = () => {
    if (!fileAnalysis) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <Alert className="border-primary/30 bg-primary/5">
          <Brain className="h-4 w-4" />
          <AlertTitle>Análisis IA completado</AlertTitle>
          <AlertDescription className="text-sm">
            Formato detectado: <strong>{fileAnalysis.detectedFormat}</strong> • 
            Módulo sugerido: <strong>{MODULE_LABELS[fileAnalysis.suggestedModule]}</strong> • 
            Confianza: <strong>{Math.round(fileAnalysis.confidence * 100)}%</strong>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Módulo destino</Label>
            <Select value={selectedModule} onValueChange={(v) => setSelectedModule(v as MaestrosModuleType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MODULE_LABELS).map(([key, label]) => {
                  const Icon = MODULE_ICONS[key as MaestrosModuleType];
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Mapeo automático</Label>
              <Switch
                checked={importOptions.autoMap}
                onCheckedChange={(v) => setImportOptions(p => ({ ...p, autoMap: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Omitir duplicados</Label>
              <Switch
                checked={importOptions.skipDuplicates}
                onCheckedChange={(v) => setImportOptions(p => ({ ...p, skipDuplicates: v }))}
              />
            </div>
          </div>
        </div>

        {/* Columnas detectadas */}
        {fileAnalysis.columns.length > 0 && (
          <div>
            <Label className="text-sm mb-2 block">Columnas detectadas ({fileAnalysis.columns.length})</Label>
            <div className="flex flex-wrap gap-1.5">
              {fileAnalysis.columns.map((col, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {col}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Botón importar */}
        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={isLoading}
            className="flex-1 gap-2"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            Importar con IA
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedFile(null);
              setFileAnalysis(null);
            }}
          >
            Cancelar
          </Button>
        </div>
      </motion.div>
    );
  };

  // === RENDER JOBS ===
  const renderJobs = () => (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3">
        {importJobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay importaciones recientes</p>
          </div>
        ) : (
          importJobs.map((job) => {
            const statusConfig = JOB_STATUS_CONFIG[job.status];
            const Icon = MODULE_ICONS[job.targetModule];
            const progress = job.totalRecords > 0 
              ? (job.processedRecords / job.totalRecords) * 100 
              : 0;

            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "p-4 rounded-lg border",
                  statusConfig.bg
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium text-sm">{job.fileName}</span>
                  </div>
                  <Badge variant="outline" className={statusConfig.color}>
                    {statusConfig.label}
                  </Badge>
                </div>

                {job.status === 'processing' && (
                  <Progress value={progress} className="h-1.5 mb-2" />
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {job.processedRecords}/{job.totalRecords} registros
                    {job.failedRecords > 0 && (
                      <span className="text-red-500 ml-1">
                        ({job.failedRecords} errores)
                      </span>
                    )}
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(job.startedAt), { 
                      addSuffix: true, 
                      locale: es 
                    })}
                  </span>
                </div>

                {job.errors.length > 0 && (
                  <div className="mt-2 p-2 rounded bg-red-500/10 text-xs text-red-600">
                    {job.errors.slice(0, 2).map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                    {job.errors.length > 2 && (
                      <p className="opacity-70">... y {job.errors.length - 2} más</p>
                    )}
                  </div>
                )}

                {job.status === 'completed' && (
                  <div className="flex gap-2 mt-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                      <Eye className="h-3 w-3" />
                      Ver detalle
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs gap-1"
                      onClick={() => clearImportJob(job.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Limpiar
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );

  // === MAIN RENDER ===
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Importación Inteligente IA
          </h2>
          <p className="text-muted-foreground">
            Importa desde cualquier formato usando inteligencia artificial
          </p>
        </div>
      </motion.div>

      {/* Supervisor Card */}
      {renderSupervisor()}

      {/* Agents Grid */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Agentes Especializados
            </CardTitle>
            <Badge variant="outline" className="gap-1">
              {agents.filter(a => a.status === 'active').length} activos
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {renderAgentsGrid()}
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import" className="gap-2">
            <FileUp className="h-4 w-4" />
            Nueva Importación
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <FileText className="h-4 w-4" />
            Historial ({importJobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4 mt-4">
          {renderUploadZone()}
          {selectedFile && (
            <>
              <Separator />
              {isLoading && !fileAnalysis ? (
                <div className="flex items-center justify-center py-8 gap-3">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">Analizando archivo con IA...</span>
                </div>
              ) : (
                renderAnalysis()
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {renderJobs()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AISmartImportPanel;
