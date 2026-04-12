/**
 * EmployeeCertificatesSection — C6: Certificados Automáticos para el Empleado
 * 
 * Genera certificados internos de empresa con verificación,
 * sellado temporal y descarga en PDF.
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Award, Download, FileCheck, Loader2, AlertTriangle,
  Clock, ShieldCheck, QrCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  CERTIFICATE_TYPES,
  CERTIFICATE_DISCLAIMER,
  emitCertificate,
  validateCertificateRequest,
  type CertificateType,
  type CertificateEmission,
  type EmployeeData,
} from '@/engines/erp/hr/employeeCertificateEngine';
import jsPDF from 'jspdf';

interface EmployeeCertificatesSectionProps {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    national_id?: string | null;
    hire_date: string;
    job_title?: string | null;
    department_id?: string | null;
    base_salary?: number | null;
    contract_type?: string | null;
    company_id: string;
    status?: string | null;
  };
  companyName?: string;
  companyCif?: string;
  onNavigate?: (section: string) => void;
}

export function EmployeeCertificatesSection({
  employee,
  companyName = 'Empresa',
  companyCif,
}: EmployeeCertificatesSectionProps) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<CertificateType>('seniority');
  const [isGenerating, setIsGenerating] = useState(false);
  const [emissions, setEmissions] = useState<CertificateEmission[]>([]);

  const employeeData: EmployeeData = useMemo(() => ({
    id: employee.id,
    firstName: employee.first_name,
    lastName: employee.last_name,
    nationalId: employee.national_id || 'No disponible',
    hireDate: employee.hire_date,
    jobTitle: employee.job_title || 'No especificado',
    department: employee.department_id || undefined,
    baseSalary: employee.base_salary || undefined,
    contractType: employee.contract_type || undefined,
    companyName,
    companyCif,
    status: employee.status || 'active',
  }), [employee, companyName, companyCif]);

  const handleGenerate = useCallback(async () => {
    if (!user?.id) {
      toast.error('Debes estar autenticado');
      return;
    }

    const request = {
      type: selectedType,
      employee: employeeData,
      requestedAt: new Date().toISOString(),
      requestedBy: user.id,
    };

    const validation = validateCertificateRequest(request);
    if (!validation.valid) {
      toast.error(`Datos insuficientes: ${validation.errors[0]}`);
      return;
    }

    setIsGenerating(true);
    try {
      const emission = await emitCertificate(request);
      setEmissions(prev => [emission, ...prev]);
      generatePDF(emission);
      toast.success('Certificado generado y descargado');
    } catch (err) {
      console.error('[Certificates] Generation error:', err);
      toast.error('Error al generar el certificado');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedType, employeeData, user?.id]);

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
            {CERTIFICATE_DISCLAIMER}
          </p>
        </CardContent>
      </Card>

      {/* Generator */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/70">
              <Award className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Solicitar Certificado</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Genera certificados internos de empresa de forma instantánea.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block">Tipo de certificado</label>
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as CertificateType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CERTIFICATE_TYPES.map(ct => (
                  <SelectItem key={ct.type} value={ct.type}>
                    <div>
                      <span className="font-medium">{ct.label}</span>
                      <p className="text-[10px] text-muted-foreground">{ct.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview info */}
          <div className="p-3 rounded-lg bg-muted/30 border border-dashed space-y-1.5">
            <p className="text-xs"><span className="font-medium">Empleado:</span> {employeeData.firstName} {employeeData.lastName}</p>
            <p className="text-xs"><span className="font-medium">DNI/NIE:</span> {employeeData.nationalId}</p>
            <p className="text-xs"><span className="font-medium">Alta:</span> {new Date(employeeData.hireDate).toLocaleDateString('es-ES')}</p>
            <p className="text-xs"><span className="font-medium">Puesto:</span> {employeeData.jobTitle}</p>
            {selectedType === 'annual_compensation' && (
              <p className="text-xs">
                <span className="font-medium">Salario base:</span>{' '}
                {employeeData.baseSalary
                  ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(employeeData.baseSalary)
                  : <span className="text-destructive">No disponible — requerido</span>
                }
              </p>
            )}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" />Generar y descargar PDF</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Emission history */}
      {emissions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Certificados emitidos en esta sesión ({emissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {emissions.map(em => {
                  const typeDef = CERTIFICATE_TYPES.find(t => t.type === em.type);
                  return (
                    <div key={em.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-medium">{typeDef?.label ?? em.type}</h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[9px] gap-1 font-mono">
                              <QrCode className="h-2.5 w-2.5" />
                              {em.verificationCode}
                            </Badge>
                            <Badge variant="secondary" className="text-[9px] gap-1">
                              <ShieldCheck className="h-2.5 w-2.5" />
                              Sellado
                            </Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(em.issuedAt).toLocaleString('es-ES')}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => generatePDF(em)}
                        >
                          <Download className="h-3 w-3 mr-1" />PDF
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── PDF Generation ──────────────────────────────────────────────────────────

function generatePDF(emission: CertificateEmission) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;
  let y = 40;

  // Header
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(emission.companyName, margin, y);
  y += 15;

  // Title
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.setFont('helvetica', 'bold');
  doc.text(emission.content.title, pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // Body
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50);

  for (const paragraph of emission.content.bodyParagraphs) {
    const lines = doc.splitTextToSize(paragraph, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 6 + 4;
  }

  y += 10;

  // Issued info
  doc.text(`${emission.content.issuedIn}, a ${emission.content.date}.`, margin, y);
  y += 15;

  doc.setFont('helvetica', 'bold');
  doc.text(emission.content.signerRole, margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(emission.companyName, margin, y);
  y += 20;

  // Verification block
  doc.setDrawColor(200);
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');
  y += 7;

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('DATOS DE VERIFICACIÓN', margin + 5, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(50);
  doc.text(`Código: ${emission.verificationCode}`, margin + 5, y);
  y += 4;
  doc.text(`Emisión: ${new Date(emission.issuedAt).toLocaleString('es-ES')}`, margin + 5, y);
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(130);
  doc.text(`Hash: ${emission.sealHash.substring(0, 32)}...`, margin + 5, y);

  // Disclaimer at bottom
  const disclaimerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(7);
  doc.setTextColor(150);
  const disclaimerLines = doc.splitTextToSize(emission.content.disclaimer, contentWidth);
  doc.text(disclaimerLines, margin, disclaimerY);

  // Download
  const fileName = `certificado_${emission.type}_${emission.verificationCode}.pdf`;
  doc.save(fileName);
}

export default EmployeeCertificatesSection;
