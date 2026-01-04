/**
 * Panel de importación inteligente para Maestros ERP
 * Usa IA para analizar y mapear datos de cualquier formato
 */

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Download,
  RefreshCw,
  Users,
  Truck,
  Package,
  Receipt,
  Wallet,
  Warehouse,
  CreditCard,
  FileSpreadsheet
} from 'lucide-react';
import { useMaestrosImport, ImportEntityType, ImportResult } from '@/hooks/erp/useMaestrosImport';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const ENTITY_OPTIONS: { value: ImportEntityType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'customers', label: 'Clientes', icon: Users, color: 'text-blue-600' },
  { value: 'suppliers', label: 'Proveedores', icon: Truck, color: 'text-green-600' },
  { value: 'items', label: 'Artículos', icon: Package, color: 'text-purple-600' },
  { value: 'taxes', label: 'Impuestos', icon: Receipt, color: 'text-orange-600' },
  { value: 'payment_terms', label: 'Condiciones de Pago', icon: Wallet, color: 'text-cyan-600' },
  { value: 'warehouses', label: 'Almacenes', icon: Warehouse, color: 'text-amber-600' },
  { value: 'bank_accounts', label: 'Cuentas Bancarias', icon: CreditCard, color: 'text-indigo-600' },
];

const ACCEPTED_FORMATS = '.csv,.xlsx,.xls,.json,.txt,.xml';

interface MaestrosImportPanelProps {
  onClose?: () => void;
}

export const MaestrosImportPanel: React.FC<MaestrosImportPanelProps> = ({ onClose }) => {
  const { currentCompany } = useERPContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedEntity, setSelectedEntity] = useState<ImportEntityType>('customers');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const {
    isImporting,
    progress,
    result,
    previewData,
    analyzeFile,
    confirmImport,
    resetState,
    entityLabels
  } = useMaestrosImport(currentCompany?.id);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowConfirmation(false);
      resetState();
    }
  }, [resetState]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setShowConfirmation(false);
      resetState();
    }
  }, [resetState]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;
    const analysisResult = await analyzeFile(selectedFile, selectedEntity);
    if (analysisResult?.success && analysisResult.mappedData.length > 0) {
      setShowConfirmation(true);
    }
  }, [selectedFile, selectedEntity, analyzeFile]);

  const handleConfirmImport = useCallback(async () => {
    const success = await confirmImport(selectedEntity);
    if (success) {
      setShowConfirmation(false);
      // Optionally close after success
    }
  }, [selectedEntity, confirmImport]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setShowConfirmation(false);
    resetState();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [resetState]);

  const getStageIcon = () => {
    switch (progress.stage) {
      case 'reading':
        return <FileText className="h-5 w-5 animate-pulse" />;
      case 'analyzing':
        return <Sparkles className="h-5 w-5 animate-pulse text-primary" />;
      case 'mapping':
        return <FileSpreadsheet className="h-5 w-5 animate-pulse" />;
      case 'importing':
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Upload className="h-5 w-5" />;
    }
  };

  const selectedEntityOption = ENTITY_OPTIONS.find(e => e.value === selectedEntity);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              Importación Inteligente
              <Badge variant="secondary" className="text-xs">IA</Badge>
            </CardTitle>
            <CardDescription>
              Importa datos desde cualquier formato usando inteligencia artificial
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Entity Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de datos a importar</label>
          <Select value={selectedEntity} onValueChange={(v) => setSelectedEntity(v as ImportEntityType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className={cn("h-4 w-4", option.color)} />
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* File Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
            "hover:border-primary/50 hover:bg-muted/50",
            selectedFile ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            isImporting && "pointer-events-none opacity-50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FORMATS}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <AnimatePresence mode="wait">
            {selectedFile ? (
              <motion.div
                key="file-selected"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                <FileText className="h-12 w-12 mx-auto text-primary" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="no-file"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <Upload className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="font-medium">Arrastra un archivo o haz clic para seleccionar</p>
                <p className="text-sm text-muted-foreground">
                  Formatos soportados: CSV, Excel, JSON, TXT, XML
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress */}
        {progress.stage !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3">
              {getStageIcon()}
              <span className="text-sm font-medium">{progress.message}</span>
            </div>
            <Progress value={progress.percent} className="h-2" />
          </motion.div>
        )}

        {/* Results Summary */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert variant={result.success && result.failedRows === 0 ? "default" : "destructive"}>
              {result.success && result.failedRows === 0 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertTitle>
                {progress.stage === 'complete' && showConfirmation
                  ? 'Análisis completado'
                  : result.success
                  ? 'Importación completada'
                  : 'Importación con errores'}
              </AlertTitle>
              <AlertDescription>
                <div className="flex gap-4 mt-2">
                  <Badge variant="outline">
                    Total: {result.totalRows}
                  </Badge>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                    Válidos: {result.importedRows}
                  </Badge>
                  {result.failedRows > 0 && (
                    <Badge variant="destructive">
                      Errores: {result.failedRows}
                    </Badge>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Preview Table */}
        {previewData && previewData.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Vista previa de datos</h4>
              <Badge variant="outline">
                Mostrando {Math.min(previewData.length, 10)} de {result?.totalRows || previewData.length}
              </Badge>
            </div>
            
            <ScrollArea className="h-[200px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(previewData[0]).slice(0, 6).map((key) => (
                      <TableHead key={key} className="text-xs whitespace-nowrap">
                        {key}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 10).map((row, idx) => (
                    <TableRow key={idx}>
                      {Object.values(row).slice(0, 6).map((val, i) => (
                        <TableCell key={i} className="text-xs">
                          {String(val ?? '-').substring(0, 30)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </motion.div>
        )}

        {/* Errors List */}
        {result?.errors && result.errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <h4 className="font-medium text-destructive">Errores encontrados</h4>
            <ScrollArea className="h-[150px] rounded-md border border-destructive/20 p-3">
              <div className="space-y-2">
                {result.errors.slice(0, 20).map((err, idx) => (
                  <div key={idx} className="text-sm flex gap-2">
                    <Badge variant="destructive" className="shrink-0">
                      Fila {err.row}
                    </Badge>
                    <span className="text-muted-foreground">
                      {err.field}: {err.message}
                    </span>
                  </div>
                ))}
                {result.errors.length > 20 && (
                  <p className="text-sm text-muted-foreground">
                    ... y {result.errors.length - 20} errores más
                  </p>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isImporting}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reiniciar
          </Button>

          {!showConfirmation ? (
            <Button
              onClick={handleAnalyze}
              disabled={!selectedFile || isImporting}
              className="gap-2"
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Analizar con IA
            </Button>
          ) : (
            <Button
              onClick={handleConfirmImport}
              disabled={isImporting || !result?.mappedData?.length}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Confirmar Importación ({result?.importedRows || 0} registros)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MaestrosImportPanel;
