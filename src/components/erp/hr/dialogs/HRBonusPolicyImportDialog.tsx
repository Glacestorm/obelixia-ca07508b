/**
 * HRBonusPolicyImportDialog - Importar política de bonus desde plantilla
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Upload, Loader2, Check, Sparkles, Building, Users, TrendingUp } from 'lucide-react';

interface HRBonusPolicyImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
}

const POLICY_TEMPLATES = [
  {
    id: 'standard',
    name: 'Política Estándar',
    description: 'Bonus anual basado en rendimiento individual y resultados empresa',
    icon: Building,
    features: ['10-20% del salario base', 'Evaluación anual', 'Umbral mínimo de beneficios'],
    params: {
      min_profit_threshold: 5,
      max_percentage: 20,
      individual_weight: 60,
      company_weight: 40,
    }
  },
  {
    id: 'performance',
    name: 'Política Meritocrática',
    description: 'Mayor peso al rendimiento individual y logro de objetivos',
    icon: TrendingUp,
    features: ['15-30% del salario base', 'KPIs individuales', 'Objetivos SMART'],
    params: {
      min_profit_threshold: 3,
      max_percentage: 30,
      individual_weight: 80,
      company_weight: 20,
    }
  },
  {
    id: 'team',
    name: 'Política de Equipo',
    description: 'Bonus compartido basado en resultados del equipo/departamento',
    icon: Users,
    features: ['Pool compartido', 'Resultados de equipo', 'Distribución equitativa'],
    params: {
      min_profit_threshold: 5,
      max_percentage: 15,
      individual_weight: 30,
      company_weight: 70,
    }
  },
];

export function HRBonusPolicyImportDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess
}: HRBonusPolicyImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('standard');
  const [policyName, setPolicyName] = useState('');

  const handleImport = async () => {
    const template = POLICY_TEMPLATES.find(t => t.id === selectedTemplate);
    if (!template) return;

    const name = policyName.trim() || `${template.name} ${new Date().getFullYear()}`;

    setLoading(true);
    try {
      // Store in local storage as the bonus_policies table may not exist yet
      // In production, this would use a real table
      const policyData = {
        id: crypto.randomUUID(),
        company_id: companyId,
        policy_name: name,
        policy_type: selectedTemplate,
        fiscal_year: new Date().getFullYear(),
        min_profit_threshold: template.params.min_profit_threshold,
        max_bonus_percentage: template.params.max_percentage,
        individual_performance_weight: template.params.individual_weight,
        company_performance_weight: template.params.company_weight,
        is_active: true,
        requires_hr_approval: true,
        created_at: new Date().toISOString(),
      };

      // Store policy locally (demo mode)
      const existingPolicies = JSON.parse(localStorage.getItem('hr_bonus_policies') || '[]');
      existingPolicies.push(policyData);
      localStorage.setItem('hr_bonus_policies', JSON.stringify(existingPolicies));

      toast.success('Política de bonus importada correctamente');
      onOpenChange(false);
      setPolicyName('');
      onSuccess?.();
    } catch (error) {
      console.error('Error importing policy:', error);
      toast.error('Error al importar la política');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Importar Política de Bonus
          </DialogTitle>
          <DialogDescription>
            Selecciona una plantilla predefinida para configurar rápidamente tu política de compensación variable
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre de la Política (opcional)</Label>
            <Input
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
              placeholder="Ej: Política Bonus 2026"
            />
          </div>

          <div className="space-y-2">
            <Label>Selecciona una Plantilla</Label>
            <ScrollArea className="h-[300px]">
              <RadioGroup value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <div className="space-y-3">
                  {POLICY_TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    const isSelected = selectedTemplate === template.id;
                    return (
                      <Card 
                        key={template.id} 
                        className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <RadioGroupItem value={template.id} id={template.id} className="mt-1" />
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{template.name}</h4>
                                {isSelected && (
                                  <Badge className="bg-primary/10 text-primary">
                                    <Check className="h-3 w-3 mr-1" />
                                    Seleccionada
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {template.description}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {template.features.map((feature, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {feature}
                                  </Badge>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                                <div>Peso Individual: {template.params.individual_weight}%</div>
                                <div>Peso Empresa: {template.params.company_weight}%</div>
                                <div>Máx. Bonus: {template.params.max_percentage}%</div>
                                <div>Umbral Beneficios: {template.params.min_profit_threshold}%</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </RadioGroup>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Importar Política
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
