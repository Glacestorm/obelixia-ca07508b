/**
 * Create Workspace Dialog - CRM
 * Modal para crear nuevos workspaces con AI suggestions
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sparkles, 
  Building2, 
  Users, 
  Zap, 
  Check,
  Loader2,
  Palette,
  Globe,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const WORKSPACE_TEMPLATES = [
  {
    id: 'startup',
    name: 'Startup',
    description: 'Pipeline ágil para equipos pequeños',
    icon: Zap,
    color: 'bg-gradient-to-br from-violet-500 to-purple-600',
    features: ['Pipeline simplificado', 'Auto-seguimiento', 'IA básica']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Configuración completa multi-equipo',
    icon: Building2,
    color: 'bg-gradient-to-br from-blue-500 to-cyan-600',
    features: ['Multi-equipo', 'SLAs avanzados', 'IA predictiva', 'API completa']
  },
  {
    id: 'agency',
    name: 'Agencia',
    description: 'Gestión de múltiples clientes',
    icon: Users,
    color: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    features: ['Multi-cliente', 'White-label', 'Reportes personalizados']
  }
];

const INDUSTRY_OPTIONS = [
  { value: 'technology', label: 'Tecnología' },
  { value: 'saas', label: 'SaaS' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'finance', label: 'Finanzas' },
  { value: 'healthcare', label: 'Salud' },
  { value: 'education', label: 'Educación' },
  { value: 'retail', label: 'Retail' },
  { value: 'manufacturing', label: 'Manufactura' },
  { value: 'services', label: 'Servicios' },
  { value: 'other', label: 'Otro' },
];

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateWorkspaceDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string>('');

  const resetForm = useCallback(() => {
    setStep(1);
    setName('');
    setDescription('');
    setTemplate(null);
    setIndustry('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  const handleCreate = useCallback(async () => {
    if (!user?.id || !name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setIsCreating(true);

    try {
      // 1. Create workspace
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const workspaceData = {
        name: name.trim(),
        slug,
        description: description.trim() || null,
        created_by: user.id,
        settings: {
          template,
          industry,
          features: {
            ai_enabled: true,
            voice_assistant: true,
            predictive_pipeline: true,
            realtime_collab: true
          }
        },
        is_active: true
      };
      
      const { data: workspace, error: wsError } = await supabase
        .from('crm_workspaces')
        .insert(workspaceData as any)
        .select()
        .single();

      if (wsError) throw wsError;
      
      const wsId = (workspace as any).id as string;

      // 2. Get or create owner role
      let roleId: string | undefined;
      
      // Direct query using type assertion to avoid deep instantiation
      const roleClient = supabase as any;
      const { data: existingRoles } = await roleClient
        .from('crm_roles')
        .select('id')
        .eq('workspace_id', wsId)
        .eq('role_type', 'owner');
      
      roleId = existingRoles?.[0]?.id;
      
      if (!roleId) {
        // Create owner role
        const { data: newRole, error: newRoleError } = await (supabase
          .from('crm_roles')
          .insert({
            workspace_id: wsId,
            name: 'Propietario',
            role_type: 'owner',
            description: 'Acceso completo al workspace',
            is_system: true
          })
          .select()
          .single() as any);

        if (newRoleError) throw newRoleError;
        roleId = newRole?.id;

        // Assign all permissions to owner role
        const { data: permissions } = await (supabase
          .from('crm_permissions')
          .select('id') as any);

        if (permissions?.length && roleId) {
          const rolePermissions = permissions.map((p: any) => ({
            role_id: roleId,
            permission_id: p.id
          }));

          await (supabase.from('crm_role_permissions').insert(rolePermissions) as any);
        }
      }

      // 3. Add user to workspace
      const { error: uwError } = await (supabase
        .from('crm_user_workspaces')
        .insert({
          user_id: user.id,
          workspace_id: wsId,
          role_id: roleId,
          is_default: true,
          is_active: true,
          invited_by: user.id,
          joined_at: new Date().toISOString()
        }) as any);

      if (uwError) throw uwError;

      toast.success('¡Workspace creado exitosamente!', {
        description: `${name} está listo para usar`
      });

      handleClose();
      onSuccess?.();

    } catch (error) {
      console.error('[CreateWorkspaceDialog] Error:', error);
      toast.error('Error al crear workspace');
    } finally {
      setIsCreating(false);
    }
  }, [user, name, description, template, industry, handleClose, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            Crear Workspace CRM
          </DialogTitle>
          <DialogDescription>
            Configura tu nuevo espacio de trabajo con IA integrada
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2].map((s) => (
            <div 
              key={s}
              className={cn(
                "flex-1 h-1.5 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            {/* Template selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Elige una plantilla
              </Label>
              <div className="grid gap-3">
                {WORKSPACE_TEMPLATES.map((tmpl) => {
                  const Icon = tmpl.icon;
                  const isSelected = template === tmpl.id;
                  return (
                    <Card 
                      key={tmpl.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        isSelected && "ring-2 ring-primary shadow-md"
                      )}
                      onClick={() => setTemplate(tmpl.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={cn("p-3 rounded-xl", tmpl.color)}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{tmpl.name}</h4>
                              {isSelected && (
                                <div className="p-1 rounded-full bg-primary">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {tmpl.description}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {tmpl.features.map((f) => (
                                <Badge key={f} variant="secondary" className="text-xs">
                                  {f}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Button 
              className="w-full gap-2" 
              onClick={() => setStep(2)}
              disabled={!template}
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Workspace *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mi Empresa CRM"
                className="h-11"
              />
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Industria
              </Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecciona tu industria" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe tu workspace..."
                rows={3}
              />
            </div>

            {/* AI Features preview */}
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Funciones IA incluidas</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-green-500" />
                    Asistente de voz
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-green-500" />
                    Pipeline predictivo
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-green-500" />
                    Análisis de sentimiento
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-green-500" />
                    Colaboración en tiempo real
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 2 && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setStep(1)}>
              Atrás
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={isCreating || !name.trim()}
              className="gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Crear Workspace
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CreateWorkspaceDialog;
