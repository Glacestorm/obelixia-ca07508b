/**
 * HREmployeeExportDialog - Dialog para exportar ficha completa de empleado
 * Permite seleccionar secciones y formato de exportación
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  User,
  Briefcase,
  DollarSign,
  Calendar,
  GraduationCap,
  Award,
  Shield,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_number: string | null;
  position: string | null;
  department_name?: string;
  hire_date: string | null;
  contract_type: string | null;
  gross_salary: number | null;
}

interface HREmployeeExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

const EXPORT_SECTIONS = [
  { id: 'personal', label: 'Datos personales', icon: User, description: 'Nombre, contacto, DNI, dirección' },
  { id: 'contract', label: 'Datos contractuales', icon: Briefcase, description: 'Contrato, puesto, departamento, antigüedad' },
  { id: 'salary', label: 'Información salarial', icon: DollarSign, description: 'Salario, conceptos, histórico' },
  { id: 'vacations', label: 'Vacaciones y ausencias', icon: Calendar, description: 'Saldo, historial, bajas' },
  { id: 'training', label: 'Formación', icon: GraduationCap, description: 'Cursos realizados, certificaciones' },
  { id: 'performance', label: 'Evaluaciones', icon: Award, description: 'Objetivos, desempeño, competencias' },
  { id: 'safety', label: 'PRL', icon: Shield, description: 'Reconocimientos, EPIs, formación PRL' },
];

const EXPORT_FORMATS = [
  { id: 'pdf', label: 'PDF', icon: FileText, description: 'Documento formateado para impresión' },
  { id: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Hoja de cálculo editable' },
  { id: 'json', label: 'JSON', icon: FileJson, description: 'Datos estructurados para integración' },
];

export function HREmployeeExportDialog({
  open,
  onOpenChange,
  employee
}: HREmployeeExportDialogProps) {
  const [selectedSections, setSelectedSections] = useState<string[]>(['personal', 'contract']);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSections.length === EXPORT_SECTIONS.length) {
      setSelectedSections([]);
    } else {
      setSelectedSections(EXPORT_SECTIONS.map(s => s.id));
    }
  };

  const handleExport = async () => {
    if (!employee || selectedSections.length === 0) {
      toast.error('Selecciona al menos una sección');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportComplete(false);

    try {
      // Simulate export progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Simulated export delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      clearInterval(progressInterval);
      setExportProgress(100);
      setExportComplete(true);

      // Generate mock file
      const fileName = `ficha_${employee.first_name}_${employee.last_name}_${new Date().toISOString().split('T')[0]}`;
      
      let content = '';
      let mimeType = '';
      let extension = '';

      switch (exportFormat) {
        case 'json':
          content = JSON.stringify({
            employee: {
              id: employee.id,
              name: `${employee.first_name} ${employee.last_name}`,
              email: employee.email,
              employeeNumber: employee.employee_number,
              position: employee.position,
              department: employee.department_name,
              hireDate: employee.hire_date,
              contractType: employee.contract_type,
            },
            exportedSections: selectedSections,
            exportedAt: new Date().toISOString()
          }, null, 2);
          mimeType = 'application/json';
          extension = 'json';
          break;
        case 'excel':
          // Simple CSV for demo
          content = `Ficha de Empleado\n\nNombre,${employee.first_name} ${employee.last_name}\nEmail,${employee.email}\nNº Empleado,${employee.employee_number || '-'}\nPuesto,${employee.position || '-'}\nDepartamento,${employee.department_name || '-'}\nFecha Alta,${employee.hire_date || '-'}\nTipo Contrato,${employee.contract_type || '-'}\n\nSecciones exportadas: ${selectedSections.join(', ')}`;
          mimeType = 'text/csv';
          extension = 'csv';
          break;
        case 'pdf':
        default:
          // Text file for demo (in production would be actual PDF)
          content = `
═══════════════════════════════════════════════════════════════
                     FICHA DE EMPLEADO
═══════════════════════════════════════════════════════════════

DATOS PERSONALES
────────────────────────────────────────────────────────────────
Nombre:         ${employee.first_name} ${employee.last_name}
Email:          ${employee.email}
Nº Empleado:    ${employee.employee_number || 'N/A'}

DATOS CONTRACTUALES
────────────────────────────────────────────────────────────────
Puesto:         ${employee.position || 'N/A'}
Departamento:   ${employee.department_name || 'N/A'}
Fecha Alta:     ${employee.hire_date || 'N/A'}
Tipo Contrato:  ${employee.contract_type || 'N/A'}

═══════════════════════════════════════════════════════════════
Secciones exportadas: ${selectedSections.join(', ')}
Fecha de exportación: ${new Date().toLocaleString('es-ES')}
═══════════════════════════════════════════════════════════════
          `;
          mimeType = 'text/plain';
          extension = 'txt';
          break;
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Ficha exportada como ${exportFormat.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error al exportar ficha');
    } finally {
      setIsExporting(false);
    }
  };

  const resetAndClose = () => {
    setExportComplete(false);
    setExportProgress(0);
    onOpenChange(false);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Ficha de Empleado
          </DialogTitle>
          <DialogDescription>
            {employee.first_name} {employee.last_name} ({employee.employee_number || 'Sin número'})
          </DialogDescription>
        </DialogHeader>

        {exportComplete ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">¡Exportación completada!</h3>
            <p className="text-muted-foreground mb-4">
              La ficha se ha descargado correctamente
            </p>
            <Button onClick={resetAndClose}>Cerrar</Button>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {/* Secciones a exportar */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Secciones a incluir</Label>
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    {selectedSections.length === EXPORT_SECTIONS.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {EXPORT_SECTIONS.map(section => (
                    <Card 
                      key={section.id}
                      className={cn(
                        "cursor-pointer transition-all",
                        selectedSections.includes(section.id) 
                          ? "border-primary bg-primary/5" 
                          : "hover:border-muted-foreground/50"
                      )}
                      onClick={() => handleSectionToggle(section.id)}
                    >
                      <CardContent className="p-3 flex items-start gap-3">
                        <Checkbox
                          checked={selectedSections.includes(section.id)}
                          onCheckedChange={() => handleSectionToggle(section.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <section.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{section.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Formato de exportación */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Formato de exportación</Label>
                <RadioGroup value={exportFormat} onValueChange={setExportFormat} className="grid grid-cols-3 gap-3">
                  {EXPORT_FORMATS.map(format => (
                    <Label
                      key={format.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                        exportFormat === format.id 
                          ? "border-primary bg-primary/5" 
                          : "hover:border-muted-foreground/50"
                      )}
                    >
                      <RadioGroupItem value={format.id} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <format.icon className="h-4 w-4" />
                          <span className="font-medium">{format.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{format.description}</p>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Progress bar */}
              {isExporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Generando exportación...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} className="h-2" />
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
                Cancelar
              </Button>
              <Button 
                onClick={handleExport} 
                disabled={isExporting || selectedSections.length === 0}
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar ({selectedSections.length} secciones)
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default HREmployeeExportDialog;
