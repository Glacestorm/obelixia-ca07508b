/**
 * HRComplianceChecklistPanel
 * Panel de Checklist de Cumplimiento
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckSquare, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Printer,
  Shield
} from 'lucide-react';
import { useHRLegalCompliance } from '@/hooks/admin/useHRLegalCompliance';
import { cn } from '@/lib/utils';

interface HRComplianceChecklistPanelProps {
  companyId: string;
}

// Checklist templates by communication type
const CHECKLIST_TEMPLATES: Record<string, Array<{ text: string; mandatory: boolean; legal_ref?: string }>> = {
  despido_objetivo: [
    { text: 'Carta de despido por escrito con causa clara y detallada', mandatory: true, legal_ref: 'Art. 53.1.a ET' },
    { text: 'Preaviso de 15 días naturales', mandatory: true, legal_ref: 'Art. 53.1.c ET' },
    { text: 'Indemnización puesta a disposición (20 días/año)', mandatory: true, legal_ref: 'Art. 53.1.b ET' },
    { text: 'Comunicación a representantes legales (si >50 empleados)', mandatory: false, legal_ref: 'Art. 53.1.c ET' },
    { text: 'Acuse de recibo firmado por el trabajador', mandatory: true },
    { text: 'Baja en Seguridad Social (3 días desde cese)', mandatory: true, legal_ref: 'Art. 139 LGSS' },
    { text: 'Certificado empresa SEPE (10 días desde baja)', mandatory: true, legal_ref: 'Art. 267 LGSS' },
    { text: 'Finiquito calculado y firmado', mandatory: true },
    { text: 'Entrega de documentación al trabajador', mandatory: true },
  ],
  despido_disciplinario: [
    { text: 'Carta de despido con hechos, fechas y calificación', mandatory: true, legal_ref: 'Art. 55.1 ET' },
    { text: 'Notificación inmediata (sin preaviso)', mandatory: true, legal_ref: 'Art. 55 ET' },
    { text: 'Comunicación por escrito fehaciente', mandatory: true },
    { text: 'Audiencia previa al trabajador (si convenio lo exige)', mandatory: false },
    { text: 'Expediente contradictorio (representantes sindicales)', mandatory: false, legal_ref: 'Art. 68 ET' },
    { text: 'Baja en Seguridad Social', mandatory: true },
    { text: 'Certificado empresa SEPE', mandatory: true },
    { text: 'Finiquito sin indemnización por despido', mandatory: true },
  ],
  modificacion_sustancial: [
    { text: 'Comunicación escrita con causas justificativas', mandatory: true, legal_ref: 'Art. 41 ET' },
    { text: 'Preaviso de 15 días', mandatory: true, legal_ref: 'Art. 41.3 ET' },
    { text: 'Detalle de la modificación y efectos', mandatory: true },
    { text: 'Período de consultas (si es colectiva)', mandatory: false, legal_ref: 'Art. 41.4 ET' },
    { text: 'Comunicación a representantes de trabajadores', mandatory: true },
    { text: 'Acuse de recibo', mandatory: true },
    { text: 'Oferta de formación si procede', mandatory: false },
  ],
  erte: [
    { text: 'Comunicación de apertura procedimiento', mandatory: true, legal_ref: 'Art. 47 ET' },
    { text: 'Constitución comisión negociadora', mandatory: true },
    { text: 'Período de consultas (15 días máximo)', mandatory: true },
    { text: 'Memoria explicativa de causas', mandatory: true },
    { text: 'Documentación económica justificativa', mandatory: true },
    { text: 'Comunicación a autoridad laboral', mandatory: true },
    { text: 'Notificación individual a trabajadores afectados', mandatory: true },
    { text: 'Solicitud prestación desempleo', mandatory: true },
  ],
  movilidad_geografica: [
    { text: 'Comunicación escrita con causas', mandatory: true, legal_ref: 'Art. 40 ET' },
    { text: 'Preaviso de 30 días', mandatory: true, legal_ref: 'Art. 40.1 ET' },
    { text: 'Compensación de gastos', mandatory: true },
    { text: 'Período de consultas (si es colectivo)', mandatory: false },
    { text: 'Comunicación a representantes', mandatory: true },
    { text: 'Oferta alternativas si existen', mandatory: false },
  ],
  fin_contrato: [
    { text: 'Comunicación de fin de contrato', mandatory: true, legal_ref: 'Art. 49.1.c ET' },
    { text: 'Preaviso 15 días (si contrato >1 año)', mandatory: false, legal_ref: 'Art. 49.1.c ET' },
    { text: 'Cálculo indemnización fin contrato', mandatory: true },
    { text: 'Baja en Seguridad Social', mandatory: true },
    { text: 'Certificado empresa SEPE', mandatory: true },
    { text: 'Finiquito completo', mandatory: true },
  ],
};

export function HRComplianceChecklistPanel({ companyId }: HRComplianceChecklistPanelProps) {
  const [selectedType, setSelectedType] = useState<string>('despido_objetivo');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const {
    communications,
    templates,
    isLoading
  } = useHRLegalCompliance(companyId);

  const currentChecklist = CHECKLIST_TEMPLATES[selectedType] || [];
  const mandatoryCount = currentChecklist.filter(item => item.mandatory).length;
  const completedMandatory = currentChecklist.filter(item => item.mandatory && checkedItems[item.text]).length;
  const completionPercentage = mandatoryCount > 0 ? (completedMandatory / mandatoryCount) * 100 : 0;

  const handleToggleItem = (itemText: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemText]: !prev[itemText]
    }));
  };

  const handleExportChecklist = () => {
    // Simple export to console for now - could be PDF/Excel
    const exportData = currentChecklist.map(item => ({
      item: item.text,
      mandatory: item.mandatory ? 'Sí' : 'No',
      completed: checkedItems[item.text] ? 'Sí' : 'No',
      legal_ref: item.legal_ref || '-'
    }));
    console.log('Checklist Export:', exportData);
  };

  const COMMUNICATION_LABELS: Record<string, string> = {
    despido_objetivo: 'Despido Objetivo',
    despido_disciplinario: 'Despido Disciplinario',
    modificacion_sustancial: 'Modificación Sustancial',
    erte: 'ERTE',
    movilidad_geografica: 'Movilidad Geográfica',
    fin_contrato: 'Fin de Contrato',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checklist Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Tipo de Comunicación
            </CardTitle>
            <CardDescription>
              Seleccione el tipo para ver su checklist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {Object.entries(COMMUNICATION_LABELS).map(([key, label]) => {
                  const template = CHECKLIST_TEMPLATES[key] || [];
                  const mandatoryItems = template.filter(i => i.mandatory).length;
                  
                  return (
                    <div
                      key={key}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedType === key 
                          ? "border-primary bg-primary/5" 
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => {
                        setSelectedType(key);
                        setCheckedItems({});
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{label}</span>
                        <Badge variant="secondary">{mandatoryItems} items</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Checklist Items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-green-500" />
                  Checklist: {COMMUNICATION_LABELS[selectedType]}
                </CardTitle>
                <CardDescription>
                  Items obligatorios y recomendados para cumplimiento legal
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportChecklist}>
                  <Download className="h-4 w-4 mr-1" />
                  Exportar
                </Button>
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-1" />
                  Imprimir
                </Button>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Progreso obligatorios: {completedMandatory}/{mandatoryCount}
                </span>
                <span className={cn(
                  "text-sm font-medium",
                  completionPercentage === 100 ? "text-green-600" : 
                  completionPercentage >= 50 ? "text-yellow-600" : "text-red-600"
                )}>
                  {completionPercentage.toFixed(0)}%
                </span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {currentChecklist.map((item, index) => {
                  const isChecked = checkedItems[item.text] || false;
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "p-4 rounded-lg border transition-colors",
                        isChecked ? "bg-green-50 dark:bg-green-950/20 border-green-200" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`item-${index}`}
                          checked={isChecked}
                          onCheckedChange={() => handleToggleItem(item.text)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <label 
                            htmlFor={`item-${index}`}
                            className={cn(
                              "font-medium cursor-pointer",
                              isChecked && "line-through text-muted-foreground"
                            )}
                          >
                            {item.text}
                          </label>
                          <div className="flex items-center gap-2 mt-1">
                            {item.mandatory ? (
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Obligatorio
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Recomendado
                              </Badge>
                            )}
                            {item.legal_ref && (
                              <Badge variant="outline" className="text-xs">
                                {item.legal_ref}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isChecked && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Completion Status */}
            {completionPercentage === 100 && (
              <div className="mt-4 p-4 bg-green-100 dark:bg-green-950/30 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-green-600" />
                  <div>
                    <h4 className="font-medium text-green-700">¡Checklist Completado!</h4>
                    <p className="text-sm text-green-600">
                      Todos los items obligatorios han sido verificados
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Communications with Checklist Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Comunicaciones Recientes con Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          {communications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay comunicaciones registradas
            </p>
          ) : (
            <div className="space-y-3">
              {communications.slice(0, 5).map(comm => {
                const checklistStatus = comm.checklist_status as Record<string, boolean> || {};
                const checkedCount = Object.values(checklistStatus).filter(Boolean).length;
                const template = CHECKLIST_TEMPLATES[comm.communication_type] || [];
                const totalMandatory = template.filter(i => i.mandatory).length;
                const progress = totalMandatory > 0 ? (checkedCount / totalMandatory) * 100 : 0;

                return (
                  <div key={comm.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{comm.title}</p>
                        <Badge variant="outline" className="mt-1">
                          {COMMUNICATION_LABELS[comm.communication_type] || comm.communication_type}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <Progress value={progress} className="w-24 h-2" />
                        <span className="text-xs text-muted-foreground">
                          {checkedCount}/{totalMandatory} items
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default HRComplianceChecklistPanel;
