/**
 * Wizard de Configuración Inicial del CRM
 * Se muestra cuando no hay workspaces ni asignaciones configuradas
 */

import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Briefcase, 
  Loader2, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Shield,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CRMInitialSetupProps {
  onComplete: () => void;
}

interface WorkspaceForm {
  name: string;
  description: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  country: string;
  currency: string;
  timezone: string;
}

const initialForm: WorkspaceForm = {
  name: '',
  description: '',
  industry: '',
  website: '',
  phone: '',
  email: '',
  country: 'ES',
  currency: 'EUR',
  timezone: 'Europe/Madrid',
};

export function CRMInitialSetup({ onComplete }: CRMInitialSetupProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WorkspaceForm>(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const workspaceNameRef = useRef<HTMLInputElement | null>(null);

  const handleCreateWorkspace = async () => {
    setAttemptedSubmit(true);

    if (!form.name.trim()) {
      toast.error('El nombre del workspace es obligatorio');
      workspaceNameRef.current?.focus();
      return;
    }

    setIsLoading(true);
    try {
      const workspaceId = crypto.randomUUID();

      const { error: workspaceError } = await supabase
        .from('crm_workspaces')
        .insert([
          {
            id: workspaceId,
            name: form.name,
            description: form.description || null,
            industry: form.industry || null,
            website: form.website || null,
            phone: form.phone || null,
            email: form.email || null,
            country: form.country,
            currency: form.currency,
            timezone: form.timezone,
            is_active: true,
          },
        ]);

      if (workspaceError) throw workspaceError;

      setCreatedWorkspaceId(workspaceId);
      toast.success('Workspace creado correctamente');
      setStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear el workspace';
      console.error('[CRMInitialSetup] Error creating workspace:', err);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoleAndAssign = async () => {
    if (!createdWorkspaceId || !user?.id) {
      toast.error('Faltan datos necesarios');
      return;
    }

    setIsLoading(true);
    try {
      // Crear rol de Administrador
      const roleId = crypto.randomUUID();

      const { error: roleError } = await supabase
        .from('crm_roles')
        .insert([
          {
            id: roleId,
            workspace_id: createdWorkspaceId,
            name: 'Administrador',
            description: 'Acceso completo al CRM',
            is_system: true,
          },
        ]);

      if (roleError) throw roleError;

      // Obtener todos los permisos y asignarlos al rol
      const { data: permissions, error: permError } = await supabase
        .from('crm_permissions')
        .select('id');

      if (permError) throw permError;

      // Asignar todos los permisos al rol admin
      if (permissions && permissions.length > 0) {
        const rolePermissions = permissions.map((p) => ({
          role_id: roleId,
          permission_id: p.id,
        }));

        const { error: rpError } = await supabase
          .from('crm_role_permissions')
          .insert(rolePermissions);

        if (rpError) throw rpError;
      }

      // Asignar usuario al workspace con rol admin
      const { error: uwError } = await supabase
        .from('crm_user_workspaces')
        .insert([
          {
            user_id: user.id,
            workspace_id: createdWorkspaceId,
            role_id: roleId,
            is_default: true,
            is_active: true,
          },
        ]);

      if (uwError) throw uwError;

      toast.success('Configuración completada');
      setStep(3);

      // Esperar un momento y completar
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al configurar rol y permisos';
      console.error('[CRMInitialSetup] Error setting up role:', err);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Crear Workspace', icon: Briefcase },
    { number: 2, title: 'Configurar Acceso', icon: Shield },
    { number: 3, title: 'Completado', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-[500px] flex flex-col">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">Configuración Inicial</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Bienvenido al CRM Omnicanal</h2>
        <p className="text-muted-foreground">
          Configura tu primer workspace para comenzar a gestionar clientes
        </p>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isActive = s.number === step;
          const isCompleted = s.number < step;
          
          return (
            <React.Fragment key={s.number}>
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                isActive && "bg-primary text-primary-foreground",
                isCompleted && "bg-green-500 text-white",
                !isActive && !isCompleted && "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">{s.title}</span>
              </div>
              {idx < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="flex-1">
        <CardContent className="pt-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold">Datos del Workspace</h3>
                <p className="text-sm text-muted-foreground">
                  Introduce los datos básicos de tu equipo de ventas
                </p>
              </div>

              <div className="grid gap-4 max-w-2xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nombre del Workspace <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      ref={workspaceNameRef}
                      id="name"
                      required
                      aria-required="true"
                      aria-invalid={attemptedSubmit && !form.name.trim()}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Equipo Ventas España"
                      className={cn(
                        attemptedSubmit && !form.name.trim() && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {attemptedSubmit && !form.name.trim() && (
                      <p className="text-xs text-destructive">Este campo es obligatorio</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industria</Label>
                    <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Tecnología</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="services">Servicios</SelectItem>
                        <SelectItem value="manufacturing">Manufactura</SelectItem>
                        <SelectItem value="healthcare">Salud</SelectItem>
                        <SelectItem value="finance">Finanzas</SelectItem>
                        <SelectItem value="education">Educación</SelectItem>
                        <SelectItem value="other">Otra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Equipo de ventas para el mercado español"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">País</Label>
                    <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ES">España</SelectItem>
                        <SelectItem value="PT">Portugal</SelectItem>
                        <SelectItem value="FR">Francia</SelectItem>
                        <SelectItem value="DE">Alemania</SelectItem>
                        <SelectItem value="IT">Italia</SelectItem>
                        <SelectItem value="MX">México</SelectItem>
                        <SelectItem value="CO">Colombia</SelectItem>
                        <SelectItem value="AR">Argentina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moneda</Label>
                    <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="USD">USD - Dólar</SelectItem>
                        <SelectItem value="GBP">GBP - Libra</SelectItem>
                        <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+34 912 345 678"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email del equipo</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="ventas@empresa.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      placeholder="https://empresa.com"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleCreateWorkspace} disabled={isLoading} className="gap-2">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Crear Workspace
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 text-center">
              <Shield className="h-16 w-16 mx-auto text-primary" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Configurar Acceso</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Se creará automáticamente un rol de <strong>Administrador</strong> con todos los permisos 
                  y se te asignará al workspace que acabas de crear.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">Tu configuración:</span>
                </div>
                <ul className="text-sm text-left space-y-2 ml-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Rol: Administrador CRM
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Permisos: Acceso completo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Workspace por defecto: Sí
                  </li>
                </ul>
              </div>

              <div className="flex justify-center pt-4">
                <Button onClick={handleCreateRoleAndAssign} disabled={isLoading} size="lg" className="gap-2">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Completar Configuración
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center py-8">
              <div className="relative inline-block">
                <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
                <CheckCircle2 className="h-20 w-20 mx-auto text-green-500 relative" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">¡Configuración Completada!</h3>
                <p className="text-muted-foreground">
                  El CRM está listo. Serás redirigido al dashboard...
                </p>
              </div>
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CRMInitialSetup;
