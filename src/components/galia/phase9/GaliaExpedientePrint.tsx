/**
 * GaliaExpedientePrint - Vista de impresión optimizada para expedientes
 * Fase 7: Sistema de Impresión Universal
 */

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Printer,
  FileText,
  Download,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  Building2,
  User,
  FileCheck,
  Euro,
  Calendar,
  MapPin,
  Hash,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExpedienteData {
  id: string;
  numero: string;
  estado: string;
  fechaSolicitud: string;
  fechaResolucion?: string;
  beneficiario: {
    nombre: string;
    nif: string;
    direccion?: string;
    municipio?: string;
    telefono?: string;
    email?: string;
  };
  proyecto: {
    titulo: string;
    descripcion?: string;
    sector?: string;
    ubicacion?: string;
  };
  presupuesto: {
    total: number;
    elegible: number;
    ayudaSolicitada: number;
    ayudaConcedida?: number;
    porcentajeAyuda: number;
  };
  convocatoria: {
    titulo: string;
    programa: string;
    anio: number;
  };
  evaluacion?: {
    puntuacion?: number;
    criterios?: Array<{ nombre: string; puntos: number; maximo: number }>;
    observaciones?: string;
  };
  documentos?: Array<{
    tipo: string;
    nombre: string;
    fecha: string;
    validado: boolean;
  }>;
}

interface GaliaExpedientePrintProps {
  expediente: ExpedienteData;
  className?: string;
}

const PRINT_SECTIONS = [
  { id: 'cabecera', label: 'Cabecera Oficial', icon: Building2, required: true },
  { id: 'beneficiario', label: 'Datos del Beneficiario', icon: User, required: true },
  { id: 'proyecto', label: 'Descripción del Proyecto', icon: FileText, required: true },
  { id: 'presupuesto', label: 'Datos Económicos', icon: Euro, required: true },
  { id: 'evaluacion', label: 'Evaluación y Puntuación', icon: FileCheck, required: false },
  { id: 'documentos', label: 'Documentación Aportada', icon: FileCheck, required: false },
  { id: 'historial', label: 'Historial de Estados', icon: Calendar, required: false },
  { id: 'pie', label: 'Pie y Verificación', icon: Shield, required: true },
];

export function GaliaExpedientePrint({ expediente, className }: GaliaExpedientePrintProps) {
  const [selectedSections, setSelectedSections] = useState<string[]>(
    PRINT_SECTIONS.filter(s => s.required).map(s => s.id)
  );
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleSectionToggle = useCallback((sectionId: string) => {
    const section = PRINT_SECTIONS.find(s => s.id === sectionId);
    if (section?.required) return; // Can't deselect required sections

    setSelectedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  }, []);

  const handlePrint = useCallback(() => {
    setIsGenerating(true);
    
    // Create print content
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      setIsGenerating(false);
      return;
    }

    const styles = `
      <style>
        @page { margin: 2cm; size: A4; }
        body { font-family: 'Times New Roman', serif; line-height: 1.6; color: #333; }
        .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
        .header h2 { margin: 5px 0 0; font-size: 14px; font-weight: normal; }
        .programa-badge { display: inline-block; background: #1e40af; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; margin-top: 10px; }
        .section { margin-bottom: 25px; page-break-inside: avoid; }
        .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #1e40af; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
        .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .data-item { padding: 8px; background: #f8f9fa; border-radius: 4px; }
        .data-label { font-size: 11px; color: #666; text-transform: uppercase; }
        .data-value { font-size: 13px; font-weight: 500; }
        .proyecto-desc { text-align: justify; padding: 15px; background: #f8f9fa; border-left: 4px solid #1e40af; }
        .presupuesto-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .presupuesto-table th, .presupuesto-table td { padding: 10px; text-align: left; border: 1px solid #ddd; }
        .presupuesto-table th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; }
        .presupuesto-table .amount { text-align: right; font-weight: bold; }
        .presupuesto-table .total { background: #e0f2fe; }
        .evaluacion-table { width: 100%; border-collapse: collapse; }
        .evaluacion-table th, .evaluacion-table td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
        .evaluacion-table th { background: #f1f5f9; }
        .evaluacion-total { font-weight: bold; background: #dcfce7; }
        .documentos-list { list-style: none; padding: 0; }
        .documentos-list li { padding: 8px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
        .doc-validado { color: #16a34a; }
        .doc-pendiente { color: #ca8a04; }
        .footer { margin-top: 40px; border-top: 2px solid #333; padding-top: 15px; font-size: 11px; }
        .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .csv-code { font-family: monospace; font-size: 10px; background: #f1f5f9; padding: 5px 10px; border-radius: 4px; }
        .firma-block { text-align: right; margin-top: 60px; }
        .firma-line { border-top: 1px solid #333; width: 200px; margin-left: auto; padding-top: 5px; font-size: 11px; }
        @media print { .no-print { display: none !important; } }
      </style>
    `;

    const content = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Expediente ${expediente.numero}</title>
  ${styles}
</head>
<body>
  ${selectedSections.includes('cabecera') ? `
  <div class="header">
    <h1>Grupo de Acción Local</h1>
    <h2>Programa ${expediente.convocatoria.programa} - ${expediente.convocatoria.anio}</h2>
    <div class="programa-badge">${expediente.convocatoria.titulo}</div>
    <p style="margin-top: 15px; font-size: 14px;"><strong>EXPEDIENTE Nº ${expediente.numero}</strong></p>
  </div>
  ` : ''}

  ${selectedSections.includes('beneficiario') ? `
  <div class="section">
    <div class="section-title">Datos del Beneficiario</div>
    <div class="data-grid">
      <div class="data-item">
        <div class="data-label">Nombre/Razón Social</div>
        <div class="data-value">${expediente.beneficiario.nombre}</div>
      </div>
      <div class="data-item">
        <div class="data-label">NIF/CIF</div>
        <div class="data-value">${expediente.beneficiario.nif}</div>
      </div>
      ${expediente.beneficiario.direccion ? `
      <div class="data-item">
        <div class="data-label">Dirección</div>
        <div class="data-value">${expediente.beneficiario.direccion}</div>
      </div>
      ` : ''}
      ${expediente.beneficiario.municipio ? `
      <div class="data-item">
        <div class="data-label">Municipio</div>
        <div class="data-value">${expediente.beneficiario.municipio}</div>
      </div>
      ` : ''}
      ${expediente.beneficiario.email ? `
      <div class="data-item">
        <div class="data-label">Email</div>
        <div class="data-value">${expediente.beneficiario.email}</div>
      </div>
      ` : ''}
      ${expediente.beneficiario.telefono ? `
      <div class="data-item">
        <div class="data-label">Teléfono</div>
        <div class="data-value">${expediente.beneficiario.telefono}</div>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  ${selectedSections.includes('proyecto') ? `
  <div class="section">
    <div class="section-title">Descripción del Proyecto</div>
    <div class="data-grid" style="margin-bottom: 15px;">
      <div class="data-item">
        <div class="data-label">Título del Proyecto</div>
        <div class="data-value">${expediente.proyecto.titulo}</div>
      </div>
      ${expediente.proyecto.sector ? `
      <div class="data-item">
        <div class="data-label">Sector</div>
        <div class="data-value">${expediente.proyecto.sector}</div>
      </div>
      ` : ''}
      ${expediente.proyecto.ubicacion ? `
      <div class="data-item">
        <div class="data-label">Ubicación</div>
        <div class="data-value">${expediente.proyecto.ubicacion}</div>
      </div>
      ` : ''}
    </div>
    ${expediente.proyecto.descripcion ? `
    <div class="proyecto-desc">
      ${expediente.proyecto.descripcion}
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${selectedSections.includes('presupuesto') ? `
  <div class="section">
    <div class="section-title">Datos Económicos</div>
    <table class="presupuesto-table">
      <thead>
        <tr>
          <th>Concepto</th>
          <th style="text-align: right;">Importe (€)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Presupuesto Total del Proyecto</td>
          <td class="amount">${expediente.presupuesto.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
        </tr>
        <tr>
          <td>Inversión Elegible</td>
          <td class="amount">${expediente.presupuesto.elegible.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
        </tr>
        <tr>
          <td>Ayuda Solicitada</td>
          <td class="amount">${expediente.presupuesto.ayudaSolicitada.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
        </tr>
        <tr>
          <td>Porcentaje de Ayuda</td>
          <td class="amount">${expediente.presupuesto.porcentajeAyuda}%</td>
        </tr>
        ${expediente.presupuesto.ayudaConcedida !== undefined ? `
        <tr class="total">
          <td><strong>AYUDA CONCEDIDA</strong></td>
          <td class="amount"><strong>${expediente.presupuesto.ayudaConcedida.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong></td>
        </tr>
        ` : ''}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${selectedSections.includes('evaluacion') && expediente.evaluacion ? `
  <div class="section">
    <div class="section-title">Evaluación y Puntuación</div>
    ${expediente.evaluacion.criterios && expediente.evaluacion.criterios.length > 0 ? `
    <table class="evaluacion-table">
      <thead>
        <tr>
          <th>Criterio</th>
          <th style="text-align: center;">Puntos</th>
          <th style="text-align: center;">Máximo</th>
        </tr>
      </thead>
      <tbody>
        ${expediente.evaluacion.criterios.map(c => `
        <tr>
          <td>${c.nombre}</td>
          <td style="text-align: center;">${c.puntos}</td>
          <td style="text-align: center;">${c.maximo}</td>
        </tr>
        `).join('')}
        <tr class="evaluacion-total">
          <td><strong>PUNTUACIÓN TOTAL</strong></td>
          <td style="text-align: center;"><strong>${expediente.evaluacion.puntuacion || '-'}</strong></td>
          <td style="text-align: center;"><strong>${expediente.evaluacion.criterios.reduce((acc, c) => acc + c.maximo, 0)}</strong></td>
        </tr>
      </tbody>
    </table>
    ` : ''}
    ${expediente.evaluacion.observaciones ? `
    <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
      <strong>Observaciones:</strong> ${expediente.evaluacion.observaciones}
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${selectedSections.includes('documentos') && expediente.documentos && expediente.documentos.length > 0 ? `
  <div class="section">
    <div class="section-title">Documentación Aportada</div>
    <ul class="documentos-list">
      ${expediente.documentos.map(doc => `
      <li>
        <span>${doc.tipo}: ${doc.nombre}</span>
        <span class="${doc.validado ? 'doc-validado' : 'doc-pendiente'}">
          ${doc.validado ? '✓ Validado' : '○ Pendiente'}
        </span>
      </li>
      `).join('')}
    </ul>
  </div>
  ` : ''}

  ${selectedSections.includes('pie') ? `
  <div class="footer">
    <div class="footer-grid">
      <div>
        <p><strong>Código Seguro de Verificación (CSV):</strong></p>
        <div class="csv-code">CSV-${expediente.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}</div>
        <p style="margin-top: 10px; font-size: 10px;">
          Puede verificar la autenticidad de este documento en:<br>
          https://galia.verificacion.es
        </p>
      </div>
      <div>
        <p><strong>Fecha de generación:</strong></p>
        <p>${format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}</p>
        <p style="font-size: 10px; margin-top: 10px;">
          Este documento ha sido generado electrónicamente por el sistema GALIA.
        </p>
      </div>
    </div>
    <div class="firma-block">
      <div class="firma-line">Firma Electrónica</div>
    </div>
  </div>
  ` : ''}

  <div class="no-print" style="margin-top: 20px; text-align: center; padding: 20px; border-top: 1px solid #ddd;">
    <button onclick="window.print()" style="padding: 12px 30px; background: #1e40af; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
      Imprimir Documento
    </button>
  </div>
</body>
</html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    setIsGenerating(false);
  }, [expediente, selectedSections]);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
              <Printer className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Imprimir Expediente</CardTitle>
              <p className="text-xs text-muted-foreground">
                {expediente.numero} - {expediente.beneficiario.nombre}
              </p>
            </div>
          </div>
          <Badge variant={expediente.estado === 'concedido' ? 'default' : 'secondary'}>
            {expediente.estado}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Section selector */}
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Secciones a incluir
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {PRINT_SECTIONS.map(section => (
              <div
                key={section.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                  selectedSections.includes(section.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50",
                  section.required && "opacity-80"
                )}
              >
                <Checkbox
                  id={section.id}
                  checked={selectedSections.includes(section.id)}
                  onCheckedChange={() => handleSectionToggle(section.id)}
                  disabled={section.required}
                />
                <section.icon className="h-4 w-4 text-muted-foreground" />
                <label
                  htmlFor={section.id}
                  className={cn(
                    "text-sm cursor-pointer flex-1",
                    section.required && "text-muted-foreground"
                  )}
                >
                  {section.label}
                  {section.required && <span className="text-xs ml-1">(requerido)</span>}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Preview toggle */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsPreviewMode(!isPreviewMode)}
        >
          {isPreviewMode ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Ocultar Vista Previa
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Ver Vista Previa
            </>
          )}
        </Button>

        {/* Mini preview */}
        {isPreviewMode && (
          <ScrollArea className="h-[200px] border rounded-lg p-3 bg-muted/30">
            <div className="text-xs space-y-2">
              {selectedSections.includes('cabecera') && (
                <div className="text-center border-b pb-2">
                  <p className="font-bold">GRUPO DE ACCIÓN LOCAL</p>
                  <p>{expediente.convocatoria.programa}</p>
                  <p className="font-mono">Exp: {expediente.numero}</p>
                </div>
              )}
              {selectedSections.includes('beneficiario') && (
                <div className="border-b pb-2">
                  <p className="font-semibold">Beneficiario</p>
                  <p>{expediente.beneficiario.nombre} ({expediente.beneficiario.nif})</p>
                </div>
              )}
              {selectedSections.includes('proyecto') && (
                <div className="border-b pb-2">
                  <p className="font-semibold">Proyecto</p>
                  <p>{expediente.proyecto.titulo}</p>
                </div>
              )}
              {selectedSections.includes('presupuesto') && (
                <div className="border-b pb-2">
                  <p className="font-semibold">Presupuesto</p>
                  <p>Total: {expediente.presupuesto.total.toLocaleString('es-ES')} €</p>
                  <p>Ayuda: {expediente.presupuesto.ayudaSolicitada.toLocaleString('es-ES')} €</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handlePrint}
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Imprimir
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          El documento incluirá código de verificación electrónica
        </p>
      </CardContent>
    </Card>
  );
}

export default GaliaExpedientePrint;
