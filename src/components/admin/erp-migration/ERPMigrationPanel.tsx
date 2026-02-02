/**
 * ERPMigrationPanel - Panel principal de migración
 * Selección de conector, carga de archivos e inicio de migración
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload,
  FileSpreadsheet,
  Building2,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Search
} from 'lucide-react';
import { useERPMigration, ERPConnector } from '@/hooks/admin/integrations/useERPMigration';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ERPMigrationPanelProps {
  companyId?: string;
  showNewDialog?: boolean;
  onCloseDialog?: () => void;
}

export function ERPMigrationPanel({ companyId, showNewDialog, onCloseDialog }: ERPMigrationPanelProps) {
  const [step, setStep] = useState(1);
  const [selectedConnector, setSelectedConnector] = useState<ERPConnector | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const {
    connectors,
    isLoading,
    isAnalyzing,
    analysis,
    analyzeFile,
    createSession
  } = useERPMigration();

  // Filter connectors
  const filteredConnectors = connectors.filter(c =>
    c.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle file selection
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Read file content
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setFileContent(content);

      // Detect file type and analyze
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      const fileType = ext === 'csv' ? 'csv' : ext === 'json' ? 'json' : ext === 'xml' ? 'xml' : 'csv';
      
      await analyzeFile(content, fileType, selectedConnector?.id);
    };
    reader.readAsText(selectedFile);
  }, [selectedConnector, analyzeFile]);

  // Handle create session
  const handleCreateSession = useCallback(async () => {
    if (!companyId || !selectedConnector || !sessionName || !fileContent) {
      toast.error('Completa todos los campos');
      return;
    }

    const ext = file?.name.split('.').pop()?.toLowerCase() || 'csv';
    const fileType = ext === 'csv' ? 'csv' : ext === 'json' ? 'json' : ext === 'xml' ? 'xml' : 'csv';

    const session = await createSession(
      companyId,
      selectedConnector.id,
      sessionName,
      fileContent,
      fileType as 'csv' | 'json' | 'xml' | 'xlsx'
    );

    if (session) {
      onCloseDialog?.();
      setStep(1);
      setSelectedConnector(null);
      setSessionName('');
      setFile(null);
      setFileContent('');
    }
  }, [companyId, selectedConnector, sessionName, file, fileContent, createSession, onCloseDialog]);

  // Reset dialog
  const handleClose = () => {
    setStep(1);
    setSelectedConnector(null);
    setSessionName('');
    setFile(null);
    setFileContent('');
    onCloseDialog?.();
  };

  return (
    <>
      {/* New Migration Dialog */}
      <Dialog open={showNewDialog} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Migración ERP</DialogTitle>
            <DialogDescription>
              Paso {step} de 3: {step === 1 ? 'Selecciona sistema origen' : step === 2 ? 'Carga archivo' : 'Confirmar'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step 1: Select Connector */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar sistema..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-[300px]">
                  <div className="grid grid-cols-2 gap-2">
                    {filteredConnectors.map((connector) => (
                      <div
                        key={connector.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedConnector?.id === connector.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => setSelectedConnector(connector)}
                      >
                        {connector.logo_url ? (
                          <img 
                            src={connector.logo_url} 
                            alt={connector.label}
                            className="h-8 w-8 object-contain"
                          />
                        ) : (
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{connector.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{connector.vendor}</p>
                        </div>
                        {selectedConnector?.id === connector.id && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                  <Button 
                    onClick={() => setStep(2)} 
                    disabled={!selectedConnector}
                  >
                    Siguiente
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Upload File */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre de la migración</Label>
                  <Input
                    placeholder="Migración ContaPlus 2024..."
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Archivo de datos</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".csv,.json,.xml,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                      id="migration-file"
                    />
                    <label 
                      htmlFor="migration-file" 
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      {file ? (
                        <>
                          <FileSpreadsheet className="h-10 w-10 text-primary" />
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Arrastra o haz clic para subir
                          </p>
                          <p className="text-xs text-muted-foreground">
                            CSV, JSON, XML, Excel
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Analysis Results */}
                {isAnalyzing && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analizando archivo con IA...</span>
                  </div>
                )}

                {analysis && (
                  <Card className="border-primary/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Análisis IA
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sistema detectado:</span>
                        <span className="font-medium">{analysis.detected_system || 'Genérico'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan de cuentas:</span>
                        <span className="font-medium">{analysis.detected_chart_type || 'PGC 2007'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Registros:</span>
                        <span className="font-medium">{analysis.total_records.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Calidad datos:</span>
                        <Badge variant={analysis.data_quality_score > 80 ? 'default' : 'secondary'}>
                          {analysis.data_quality_score}%
                        </Badge>
                      </div>
                      {analysis.warnings.length > 0 && (
                        <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span className="text-xs">{analysis.warnings[0]}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>Anterior</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                    <Button 
                      onClick={() => setStep(3)} 
                      disabled={!file || !sessionName || isAnalyzing}
                    >
                      Siguiente
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resumen de Migración</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sistema origen:</span>
                      <span className="font-medium">{selectedConnector?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nombre:</span>
                      <span className="font-medium">{sessionName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Archivo:</span>
                      <span className="font-medium">{file?.name}</span>
                    </div>
                    {analysis && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Registros:</span>
                          <span className="font-medium">{analysis.total_records.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cuentas detectadas:</span>
                          <span className="font-medium">{analysis.detected_accounts.length}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => setStep(2)}>Anterior</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                    <Button onClick={handleCreateSession} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Crear Migración
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Panel Content */}
      <Card>
        <CardHeader>
          <CardTitle>Migraciones Activas</CardTitle>
          <CardDescription>
            Gestiona tus migraciones en curso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Selecciona una sesión de migración para continuar</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default ERPMigrationPanel;
