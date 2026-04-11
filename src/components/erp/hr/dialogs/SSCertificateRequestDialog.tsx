/**
 * SSCertificateRequestDialog - Solicitud de certificados de Seguridad Social
 * H1.2: Workers loaded from erp_hr_employees with demo fallback
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, Loader2, User, Building2, Calendar, 
  Download, CheckCircle, Clock, Euro, Shield, FileCheck, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SSCertificateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
}

interface CertificateType {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  scope: 'worker' | 'company' | 'both';
  estimatedTime: string;
  category: 'laboral' | 'cotizacion' | 'deuda' | 'otros';
}

const CERTIFICATE_TYPES: CertificateType[] = [
  { id: 'vida_laboral', name: 'Informe de Vida Laboral', description: 'Historial completo de cotizaciones del trabajador', icon: User, scope: 'worker', estimatedTime: 'Inmediato', category: 'laboral' },
  { id: 'bases_cotizacion', name: 'Certificado de Bases de Cotización', description: 'Bases por las que ha cotizado el trabajador', icon: Euro, scope: 'worker', estimatedTime: '24-48h', category: 'cotizacion' },
  { id: 'estar_corriente', name: 'Certificado de Estar al Corriente', description: 'Acredita que la empresa está al corriente con la SS', icon: CheckCircle, scope: 'company', estimatedTime: 'Inmediato', category: 'deuda' },
  { id: 'deuda', name: 'Certificado de Deuda', description: 'Detalle de deudas pendientes con la Seguridad Social', icon: FileCheck, scope: 'company', estimatedTime: 'Inmediato', category: 'deuda' },
  { id: 'situacion_alta', name: 'Informe de Situación de Alta', description: 'Situación actual del trabajador en la empresa', icon: Shield, scope: 'worker', estimatedTime: 'Inmediato', category: 'laboral' },
  { id: 'trabajadores_alta', name: 'Relación de Trabajadores en Alta', description: 'Listado de todos los trabajadores dados de alta', icon: Building2, scope: 'company', estimatedTime: 'Inmediato', category: 'laboral' },
  { id: 'tc2_mensual', name: 'TC2 Mensual (Relación Nominal)', description: 'Relación nominal de trabajadores del mes', icon: FileText, scope: 'company', estimatedTime: 'Inmediato', category: 'cotizacion' },
  { id: 'rnt', name: 'RNT (Relación Nominal de Trabajadores)', description: 'Recibo de liquidación de cotizaciones con detalle', icon: FileText, scope: 'company', estimatedTime: 'Inmediato', category: 'cotizacion' },
  { id: 'rlc', name: 'RLC (Recibo de Liquidación)', description: 'Recibo de liquidación de cotizaciones', icon: Euro, scope: 'company', estimatedTime: 'Inmediato', category: 'cotizacion' },
  { id: 'ccc_empresa', name: 'Códigos de Cuenta de Cotización', description: 'Listado de CCCs de la empresa', icon: Building2, scope: 'company', estimatedTime: 'Inmediato', category: 'otros' },
];

interface Worker {
  id: string;
  name: string;
  dni: string;
}

const DEMO_WORKERS: Worker[] = [
  { id: 'demo-1', name: 'Ana Fernández García', dni: '12345678A' },
  { id: 'demo-2', name: 'Juan Martínez López', dni: '23456789B' },
  { id: 'demo-3', name: 'María López Sánchez', dni: '34567890C' },
];

export function SSCertificateRequestDialog({ 
  open, onOpenChange, companyId, onSuccess 
}: SSCertificateRequestDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedCert, setSelectedCert] = useState<string>('');
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7));
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [workers, setWorkers] = useState<Worker[]>(DEMO_WORKERS);
  const [hasRealWorkers, setHasRealWorkers] = useState(false);

  // Load real workers
  useEffect(() => {
    if (!open || !companyId) return;

    const loadWorkers = async () => {
      try {
        const { data, error } = await supabase
          .from('erp_hr_employees')
          .select('id, first_name, last_name, national_id')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .order('last_name');

        if (error) throw error;

        if (data && data.length > 0) {
          setWorkers(data.map(e => ({
            id: e.id,
            name: `${e.first_name} ${e.last_name}`,
            dni: e.national_id || 'N/A',
          })));
          setHasRealWorkers(true);
        } else {
          setWorkers(DEMO_WORKERS);
          setHasRealWorkers(false);
        }
      } catch {
        setWorkers(DEMO_WORKERS);
        setHasRealWorkers(false);
      }
    };

    loadWorkers();
  }, [open, companyId]);

  const selectedCertType = CERTIFICATE_TYPES.find(c => c.id === selectedCert);
  const needsWorker = selectedCertType?.scope === 'worker' || selectedCertType?.scope === 'both';

  const filteredCerts = filterCategory === 'all' 
    ? CERTIFICATE_TYPES 
    : CERTIFICATE_TYPES.filter(c => c.category === filterCategory);

  const handleRequest = async () => {
    if (!selectedCert) {
      toast.error('Selecciona un tipo de certificado');
      return;
    }
    if (needsWorker && !selectedWorker) {
      toast.error('Selecciona un trabajador');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const refNumber = `CERT-${Date.now().toString(36).toUpperCase()}`;
      
      toast.success(
        <div>
          <p className="font-medium">Solicitud enviada</p>
          <p className="text-sm text-muted-foreground">
            {selectedCertType?.name} - Ref: {refNumber}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Tiempo estimado: {selectedCertType?.estimatedTime}
          </p>
        </div>
      );
      
      onSuccess?.();
      onOpenChange(false);
      setSelectedCert('');
      setSelectedWorker('');
    } catch (error) {
      toast.error('Error al solicitar el certificado');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'laboral': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'cotizacion': return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      case 'deuda': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Solicitar Certificado
          </DialogTitle>
          <DialogDescription>
            Solicita certificados oficiales de la Seguridad Social
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['all', 'laboral', 'cotizacion', 'deuda'].map(cat => (
              <Button key={cat} variant={filterCategory === cat ? 'default' : 'outline'} size="sm" onClick={() => setFilterCategory(cat)}>
                {cat === 'all' ? 'Todos' : cat === 'laboral' ? 'Laborales' : cat === 'cotizacion' ? 'Cotización' : 'Deuda'}
              </Button>
            ))}
          </div>

          <ScrollArea className="h-[280px] pr-4">
            <RadioGroup value={selectedCert} onValueChange={setSelectedCert} className="space-y-2">
              {filteredCerts.map((cert) => {
                const Icon = cert.icon;
                return (
                  <div key={cert.id}>
                    <RadioGroupItem value={cert.id} id={cert.id} className="peer sr-only" />
                    <Label
                      htmlFor={cert.id}
                      className="flex items-start gap-3 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent/50 peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{cert.name}</span>
                          <Badge variant="outline" className={`text-xs ${getCategoryColor(cert.category)}`}>
                            {cert.scope === 'worker' ? 'Trabajador' : 'Empresa'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{cert.description}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {cert.estimatedTime}
                        </div>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </ScrollArea>

          {selectedCert && needsWorker && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Seleccionar Trabajador *</Label>
                  {!hasRealWorkers && (
                    <Badge variant="outline" className="text-[10px] border-warning/30 text-warning gap-1">
                      <Info className="h-3 w-3" />
                      Datos de ejemplo
                    </Badge>
                  )}
                </div>
                <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                  <SelectTrigger>
                    <SelectValue placeholder="Buscar trabajador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>{worker.name}</span>
                          <span className="text-muted-foreground text-xs">({worker.dni})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {selectedCert && (selectedCert.includes('tc2') || selectedCert.includes('rnt') || selectedCert.includes('rlc') || selectedCert.includes('bases')) && (
            <div className="flex items-center gap-3">
              <Label htmlFor="period" className="whitespace-nowrap">Período:</Label>
              <Input id="period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-[180px]" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleRequest} disabled={loading || !selectedCert}>
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Solicitando...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" />Solicitar Certificado</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SSCertificateRequestDialog;
