/**
 * GALIA - Panel de Clasificación Automática de Documentos
 * Reconocimiento, clasificación y validación de documentación justificativa
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText, Upload, CheckCircle, AlertCircle, FileSearch,
  Sparkles, RefreshCw, FolderCheck, FileWarning, Check, X
} from 'lucide-react';
import { useGaliaDocClassification, type ChecklistItem } from '@/hooks/galia/useGaliaDocClassification';
import { cn } from '@/lib/utils';

const DEMO_DOCS = [
  { tipo: 'DNI', nombre: 'DNI_titular.pdf', fecha: '2024-06-15' },
  { tipo: 'Escrituras', nombre: 'Escritura_constitución.pdf', fecha: '2020-03-10' },
  { tipo: 'Factura', nombre: 'Factura_tractor_001.pdf', fecha: '2026-01-12' },
  { tipo: 'Licencia actividad', nombre: 'Licencia_municipal.pdf', fecha: '2023-08-20' },
  { tipo: 'Memoria técnica', nombre: 'Memoria_proyecto.pdf', fecha: '2025-12-01' },
];

const REQUIRED_DOCS = [
  'DNI/NIF del solicitante', 'Escritura de constitución', 'CIF empresa',
  'Licencia de actividad', 'Memoria técnica del proyecto', 'Memoria económica',
  'Plan de negocio', '3 ofertas comparativas (>18.000€)', 'Declaración de minimis',
  'Certificado AEAT', 'Certificado Seguridad Social', 'Último balance',
  'Facturas proforma', 'Planos de la inversión', 'Permiso de obra',
];

const statusIcons: Record<string, React.ReactNode> = {
  ok: <Check className="h-3.5 w-3.5 text-green-500" />,
  falta: <X className="h-3.5 w-3.5 text-red-500" />,
  caducado: <AlertCircle className="h-3.5 w-3.5 text-orange-500" />,
  incompleto: <FileWarning className="h-3.5 w-3.5 text-yellow-500" />,
  revision: <FileSearch className="h-3.5 w-3.5 text-blue-500" />,
};

const statusColors: Record<string, string> = {
  ok: 'text-green-600 bg-green-50 dark:bg-green-950/20',
  falta: 'text-red-600 bg-red-50 dark:bg-red-950/20',
  caducado: 'text-orange-600 bg-orange-50 dark:bg-orange-950/20',
  incompleto: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20',
  revision: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20',
};

export function GaliaDocClassificationPanel() {
  const {
    isProcessing,
    classificationResult,
    checklistResult,
    classifyDocument,
    validateChecklist,
  } = useGaliaDocClassification();

  const [activeTab, setActiveTab] = useState('checklist');
  const [docText, setDocText] = useState('');

  const handleDemoChecklist = useCallback(async () => {
    await validateChecklist(REQUIRED_DOCS, DEMO_DOCS);
  }, [validateChecklist]);

  const handleClassify = useCallback(async () => {
    if (!docText.trim()) return;
    await classifyDocument(docText);
  }, [docText, classifyDocument]);

  const renderChecklistRow = (item: ChecklistItem, i: number) => (
    <TableRow key={i} className={cn(item.estado === 'falta' && 'bg-red-50/50 dark:bg-red-950/10')}>
      <TableCell className="py-2">
        <div className="flex items-center gap-1.5">
          {statusIcons[item.estado]}
          <span className="text-xs font-medium">{item.documento}</span>
        </div>
      </TableCell>
      <TableCell className="py-2">
        <Badge variant="outline" className={cn('text-[10px]', statusColors[item.estado])}>
          {item.estado.toUpperCase()}
        </Badge>
      </TableCell>
      <TableCell className="py-2">
        <Badge variant={item.prioridad === 'critica' ? 'destructive' : item.prioridad === 'alta' ? 'default' : 'secondary'} className="text-[10px]">
          {item.prioridad}
        </Badge>
      </TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground max-w-[200px] truncate">
        {item.observacion}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <FileSearch className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Clasificación Automática de Documentos</h2>
            <p className="text-xs text-muted-foreground">OCR + IA para reconocimiento y verificación documental</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="checklist" className="text-xs">
            <FolderCheck className="h-3.5 w-3.5 mr-1" /> Checklist Documental
          </TabsTrigger>
          <TabsTrigger value="classify" className="text-xs">
            <FileText className="h-3.5 w-3.5 mr-1" /> Clasificar Documento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Verifica automáticamente la completitud documental del expediente
              </p>
              <Button size="sm" onClick={handleDemoChecklist} disabled={isProcessing}>
                {isProcessing ? (
                  <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Verificando...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-1" /> Verificar Expediente Demo</>
                )}
              </Button>
            </div>

            {checklistResult ? (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Completitud Documental</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold">{checklistResult.completitud}%</span>
                        {checklistResult.puedeContinuar ? (
                          <Badge className="bg-green-500/20 text-green-600 text-[10px]">Puede continuar</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">Documentación incompleta</Badge>
                        )}
                      </div>
                    </div>
                    <Progress value={checklistResult.completitud} className="h-2.5" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Checklist de Documentos</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Documento</TableHead>
                            <TableHead className="text-xs">Estado</TableHead>
                            <TableHead className="text-xs">Prioridad</TableHead>
                            <TableHead className="text-xs">Observación</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {checklistResult.checklist?.map((item, i) => renderChecklistRow(item, i))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {checklistResult.documentosFaltantes?.length > 0 && (
                  <Card className="border-red-200 dark:border-red-900">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Documentos Faltantes ({checklistResult.documentosFaltantes.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {checklistResult.documentosFaltantes.map((doc, i) => (
                          <li key={i} className="text-xs flex items-center gap-1.5 text-red-600">
                            <X className="h-3 w-3 shrink-0" /> {doc}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FolderCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground mb-2">Verificación documental automática</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Compara los documentos presentados con los requeridos por la convocatoria
                  </p>
                  <Button size="sm" onClick={handleDemoChecklist} disabled={isProcessing}>
                    <Sparkles className="h-4 w-4 mr-1" /> Verificar con datos de ejemplo
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="classify">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Clasificar Documento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Texto del documento (OCR o pegado)</label>
                  <Textarea
                    value={docText}
                    onChange={e => setDocText(e.target.value)}
                    placeholder="Pega aquí el contenido del documento extraído por OCR o copia el texto relevante..."
                    rows={6}
                    className="text-sm"
                  />
                </div>
                <Button className="w-full" size="sm" onClick={handleClassify} disabled={isProcessing || !docText.trim()}>
                  {isProcessing ? (
                    <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Clasificando...</>
                  ) : (
                    <><FileSearch className="h-4 w-4 mr-1" /> Clasificar y Extraer Datos</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {classificationResult && (
              <div className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      Resultado de Clasificación
                      <Badge className="text-[10px]">{classificationResult.clasificacion?.confianza}% confianza</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">Categoría</span>
                        <p className="font-semibold">{classificationResult.clasificacion?.categoria}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Subcategoría</span>
                        <p className="font-semibold">{classificationResult.clasificacion?.subcategoria}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{classificationResult.clasificacion?.descripcion}</p>
                  </CardContent>
                </Card>

                {classificationResult.datosExtraidos && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Datos Extraídos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(classificationResult.datosExtraidos)
                          .filter(([, v]) => v != null && v !== '')
                          .map(([key, value]) => (
                            <div key={key}>
                              <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                              <p className="font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {classificationResult.validacion && (
                  <Card className={cn(
                    classificationResult.validacion.esValido ? 'border-green-200' : 'border-red-200'
                  )}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-2 mb-2">
                        {classificationResult.validacion.esValido ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                          {classificationResult.validacion.esValido ? 'Documento válido' : 'Problemas detectados'}
                        </span>
                      </div>
                      {classificationResult.validacion.problemas?.length > 0 && (
                        <ul className="space-y-1 mt-1">
                          {classificationResult.validacion.problemas.map((p, i) => (
                            <li key={i} className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 shrink-0" /> {p}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GaliaDocClassificationPanel;
