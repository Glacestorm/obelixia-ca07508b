/**
 * HRFileGeneratorPanel — Lanza generación de ficheros via edge function
 */
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FILE_TYPES = [
  { value: 'FAN', label: 'FAN — Afiliación Nóminas', description: 'Fichero de bases de cotización para SILTRA' },
  { value: 'FDI', label: 'FDI — Datos Identificación', description: 'Identificación de trabajadores' },
  { value: 'AFI', label: 'AFI — Afiliación', description: 'Altas, bajas y variaciones' },
  { value: 'MODELO_111', label: 'Modelo 111 — Retenciones IRPF', description: 'Declaración trimestral de retenciones' },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2026, i).toLocaleString('es-ES', { month: 'long' }),
}));

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1].map((y) => ({
  value: String(y),
  label: String(y),
}));

interface HRFileGeneratorPanelProps {
  companyId?: string;
  onGenerated?: () => void;
  className?: string;
}

export function HRFileGeneratorPanel({ companyId, onGenerated, className }: HRFileGeneratorPanelProps) {
  const [fileType, setFileType] = useState<string>('');
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [year, setYear] = useState<string>(String(currentYear));
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedType = FILE_TYPES.find((t) => t.value === fileType);

  const handleGenerate = useCallback(async () => {
    if (!companyId || !fileType) {
      toast.error('Selecciona un tipo de fichero');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('payroll-file-generator', {
        body: {
          action: 'generate',
          company_id: companyId,
          file_type: fileType,
          period_month: parseInt(month),
          period_year: parseInt(year),
          employees: [], // In production, fetched from payroll run
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Fichero ${fileType} generado correctamente`, {
          description: data.file?.file_name,
        });

        // Auto-download content if available
        if (data.file?.content) {
          const blob = new Blob([data.file.content], { type: data.file.mime_type || 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.file.file_name;
          a.click();
          URL.revokeObjectURL(url);
        }

        onGenerated?.();
      } else {
        throw new Error(data?.error || 'Error desconocido');
      }
    } catch (err) {
      console.error('[HRFileGeneratorPanel] generate error:', err);
      toast.error('Error generando fichero', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, fileType, month, year, onGenerated]);

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-accent/50">
            <Zap className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="text-base">Generador de Ficheros</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              TGSS · AEAT · SILTRA · RED
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Documento preparatorio interno — no constituye presentación oficial.
            Requiere validación antes de envío a organismos.
          </p>
        </div>

        {/* File type */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Tipo de fichero</label>
          <Select value={fileType} onValueChange={setFileType}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Seleccionar tipo..." />
            </SelectTrigger>
            <SelectContent>
              {FILE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div>
                    <span>{t.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedType && (
            <p className="text-[11px] text-muted-foreground">{selectedType.description}</p>
          )}
        </div>

        {/* Period */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Mes</label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="capitalize">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Año</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={!fileType || !companyId || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Generar fichero
            </>
          )}
        </Button>

        {/* Supported formats */}
        <div className="flex flex-wrap gap-1 pt-1">
          {['SILTRA', 'RED', 'AEAT'].map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default HRFileGeneratorPanel;
