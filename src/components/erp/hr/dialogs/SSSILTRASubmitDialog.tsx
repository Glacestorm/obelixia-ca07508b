/**
 * SSSILTRASubmitDialog - Confirmación y envío de ficheros SILTRA
 * Muestra resumen antes de presentar a la TGSS
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Send, Loader2, FileText, CheckCircle, AlertTriangle,
  Euro, Users, Building2, Calendar, FileUp, Shield
} from 'lucide-react';
import { toast } from 'sonner';

interface SSSILTRASubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  period: string;
  contributionData?: {
    workers: number;
    baseCC: number;
    totalCompany: number;
    totalWorker: number;
    total: number;
  };
  onSuccess?: () => void;
}

export function SSSILTRASubmitDialog({ 
  open, 
  onOpenChange, 
  companyId,
  period,
  contributionData,
  onSuccess 
}: SSSILTRASubmitDialogProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'confirm' | 'sending' | 'complete'>('confirm');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedData, setAcceptedData] = useState(false);

  // Default demo data if not provided
  const data = contributionData || {
    workers: 47,
    baseCC: 142800,
    totalCompany: 45476.80,
    totalWorker: 7425.60,
    total: 52902.40,
  };

  const handleSubmit = async () => {
    if (!acceptedTerms || !acceptedData) {
      toast.error('Debes aceptar las condiciones para continuar');
      return;
    }

    setLoading(true);
    setStep('sending');
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      clearInterval(progressInterval);
      setProgress(100);
      setStep('complete');
      
      const refNumber = `SILTRA-${period.replace('-', '')}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      
      setTimeout(() => {
        toast.success(
          <div>
            <p className="font-medium">Presentación SILTRA completada</p>
            <p className="text-sm text-muted-foreground">Ref: {refNumber}</p>
          </div>
        );
        onSuccess?.();
        onOpenChange(false);
        resetDialog();
      }, 1500);
      
    } catch (error) {
      toast.error('Error en la presentación SILTRA');
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setStep('confirm');
    setProgress(0);
    setAcceptedTerms(false);
    setAcceptedData(false);
  };

  const formatPeriod = (p: string) => {
    const [year, month] = p.split('-');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) { onOpenChange(o); resetDialog(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Presentación SILTRA
          </DialogTitle>
          <DialogDescription>
            Envío de ficheros de cotización a la Tesorería General de la Seguridad Social
          </DialogDescription>
        </DialogHeader>

        {step === 'confirm' && (
          <div className="space-y-4">
            {/* Resumen del período */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium">Período: {formatPeriod(period)}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Trabajadores:</span>
                    <span className="font-medium">{data.workers}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Base CC:</span>
                    <span className="font-medium">€{data.baseCC.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Desglose de importes */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Resumen de Cotizaciones</h4>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cuota Empresarial</span>
                  <span className="font-medium">€{data.totalCompany.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cuota Trabajadores</span>
                  <span className="font-medium">€{data.totalWorker.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base">
                  <span className="font-medium">TOTAL A INGRESAR</span>
                  <span className="font-bold text-primary">€{data.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Ficheros que se presentarán */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Ficheros a Presentar</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span>FAN (Fichero de Afiliación Nominal)</span>
                  <Badge variant="outline" className="ml-auto text-xs">RNT</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                  <FileText className="h-4 w-4 text-green-500" />
                  <span>FLC (Fichero de Liquidación de Cuotas)</span>
                  <Badge variant="outline" className="ml-auto text-xs">RLC</Badge>
                </div>
              </div>
            </div>

            {/* Confirmaciones */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-2">
                <Checkbox 
                  id="acceptData" 
                  checked={acceptedData}
                  onCheckedChange={(c) => setAcceptedData(c === true)}
                />
                <Label htmlFor="acceptData" className="text-sm leading-relaxed cursor-pointer">
                  Confirmo que los datos de cotización son correctos y se corresponden 
                  con las nóminas del período {formatPeriod(period)}.
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox 
                  id="acceptTerms" 
                  checked={acceptedTerms}
                  onCheckedChange={(c) => setAcceptedTerms(c === true)}
                />
                <Label htmlFor="acceptTerms" className="text-sm leading-relaxed cursor-pointer">
                  Acepto el envío de estos ficheros a la TGSS a través de SILTRA 
                  y entiendo que esta acción es definitiva.
                </Label>
              </div>
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-700">Importante</p>
                <p className="text-amber-600/80">
                  Esta presentación genera obligación de pago. Asegúrate de que los datos 
                  son correctos antes de continuar.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 'sending' && (
          <div className="py-8 space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileUp className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                </div>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <p className="font-medium">Enviando a SILTRA...</p>
              <p className="text-sm text-muted-foreground">
                Conectando con la Tesorería General de la Seguridad Social
              </p>
            </div>
            
            <div className="space-y-2">
              <Progress value={Math.min(progress, 100)} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {progress < 30 && 'Validando ficheros...'}
                {progress >= 30 && progress < 60 && 'Enviando datos...'}
                {progress >= 60 && progress < 90 && 'Procesando en TGSS...'}
                {progress >= 90 && 'Finalizando...'}
              </p>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="py-8 space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <p className="font-medium text-lg text-green-600">Presentación Completada</p>
              <p className="text-sm text-muted-foreground">
                Los ficheros han sido aceptados por la TGSS
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!acceptedTerms || !acceptedData}
              >
                <Send className="h-4 w-4 mr-2" />
                Presentar SILTRA
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SSSILTRASubmitDialog;
