/**
 * ExternalAuditorExportDialog — Dialog para preparar paquete de auditor externo
 * LGSS Art. 21 + LGT Art. 66 (4 años trazabilidad)
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, FileArchive, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

const EXPORT_CATEGORIES = [
  { id: 'nominas', label: 'Nóminas y recibos de salario' },
  { id: 'it', label: 'Incapacidad temporal (IT)' },
  { id: 'embargos', label: 'Embargos judiciales' },
  { id: 'contratos', label: 'Contratos y prórrogas' },
  { id: 'tgss', label: 'Ficheros TGSS (AFI, FAN, RLC, RNT)' },
  { id: 'modelos_fiscales', label: 'Modelos fiscales (111, 190)' },
] as const;

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  generating: { label: 'Generando', variant: 'secondary' },
  ready: { label: 'Listo', variant: 'default' },
  delivered: { label: 'Entregado', variant: 'outline' },
  error: { label: 'Error', variant: 'destructive' },
};

export function ExternalAuditorExportDialog() {
  const [open, setOpen] = useState(false);
  const [periodFrom, setPeriodFrom] = useState<Date>();
  const [periodTo, setPeriodTo] = useState<Date>();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: previousExports, refetch } = useQuery({
    queryKey: ['audit-exports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_audit_document_exports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const handleSubmit = async () => {
    if (!periodFrom || !periodTo || selectedCategories.length === 0) {
      toast.error('Completa período y selecciona al menos una categoría');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { error } = await supabase
        .from('erp_audit_document_exports')
        .insert({
          requested_by: user.id,
          period_start: format(periodFrom, 'yyyy-MM-dd'),
          period_end: format(periodTo, 'yyyy-MM-dd'),
          package_type: 'external_audit',
          status: 'generating',
          contents_summary: { categories: selectedCategories },
        } as any);

      if (error) throw error;

      toast.success('Paquete solicitado — se generará en breve');
      setOpen(false);
      setPeriodFrom(undefined);
      setPeriodTo(undefined);
      setSelectedCategories([]);
      refetch();
    } catch (err) {
      console.error(err);
      toast.error('Error al crear solicitud de exportación');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FileArchive className="h-4 w-4" />
            Preparar paquete para auditor externo
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Exportación para Auditor Externo</DialogTitle>
            <DialogDescription>
              Selecciona el período y las categorías de datos a incluir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Period selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Desde</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left text-xs", !periodFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {periodFrom ? format(periodFrom, 'dd/MM/yyyy') : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={periodFrom} onSelect={setPeriodFrom} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hasta</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left text-xs", !periodTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {periodTo ? format(periodTo, 'dd/MM/yyyy') : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={periodTo} onSelect={setPeriodTo} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Categorías a incluir</Label>
              <div className="space-y-2">
                {EXPORT_CATEGORIES.map(cat => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <Checkbox
                      id={cat.id}
                      checked={selectedCategories.includes(cat.id)}
                      onCheckedChange={() => toggleCategory(cat.id)}
                    />
                    <label htmlFor={cat.id} className="text-sm cursor-pointer">{cat.label}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Legal note */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                LGSS Art. 21 y LGT Art. 66: Obligación de conservación documental de 4 años.
                Los datos exportados se registran con trazabilidad completa.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Generar paquete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Previous exports list */}
      {previousExports && previousExports.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Paquetes anteriores</p>
          <div className="space-y-1.5">
            {previousExports.map((exp: any) => {
              const st = STATUS_MAP[exp.status] ?? STATUS_MAP.generating;
              return (
                <div key={exp.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-xs">
                  <div className="flex items-center gap-2">
                    <FileArchive className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {exp.period_start} → {exp.period_end}
                    </span>
                  </div>
                  <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
