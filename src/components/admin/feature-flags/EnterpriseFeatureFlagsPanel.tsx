/**
 * Enterprise Feature Flags Panel
 * Panel de administración avanzada de Feature Flags por tenant y licencia
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Flag, Plus, Save, Trash2, Calendar, Users, Loader2,
  Search, Filter, Building2, Key, History, BarChart3,
  Settings, Zap, Target, Shield, Eye, RefreshCw,
  Copy, AlertTriangle, CheckCircle, XCircle, Clock,
  Sparkles, FlaskConical, Layers, ChevronRight
} from 'lucide-react';
import { useEnterpriseFeatureFlags, type EnterpriseFeatureFlag, type CreateFeatureFlagParams } from '@/hooks/admin/useEnterpriseFeatureFlags';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

const CATEGORIES = [
  { value: 'general', label: 'General', icon: Flag, color: 'bg-gray-500' },
  { value: 'ui', label: 'Interfaz', icon: Eye, color: 'bg-blue-500' },
  { value: 'ai', label: 'IA & ML', icon: Sparkles, color: 'bg-purple-500' },
  { value: 'analytics', label: 'Analytics', icon: BarChart3, color: 'bg-emerald-500' },
  { value: 'core', label: 'Core', icon: Shield, color: 'bg-red-500' },
  { value: 'collaboration', label: 'Colaboración', icon: Users, color: 'bg-cyan-500' },
  { value: 'accessibility', label: 'Accesibilidad', icon: Target, color: 'bg-amber-500' },
  { value: 'export', label: 'Exportación', icon: Copy, color: 'bg-indigo-500' },
  { value: 'integration', label: 'Integraciones', icon: Zap, color: 'bg-pink-500' },
];

const LICENSE_TIERS = ['free', 'starter', 'professional', 'enterprise', 'unlimited'];
const ROLES = ['user', 'admin', 'superadmin', 'gestor', 'director_oficina', 'director_comercial'];

interface CreateFlagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (params: CreateFeatureFlagParams) => Promise<any>;
}

function CreateFlagDialog({ open, onOpenChange, onSubmit }: CreateFlagDialogProps) {
  const [form, setForm] = useState<CreateFeatureFlagParams>({
    flag_key: '',
    flag_name: '',
    description: '',
    category: 'general',
    is_enabled: false,
    rollout_percentage: 0,
    target_license_tiers: [],
    target_roles: [],
    is_experiment: false
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.flag_key || !form.flag_name) return;
    setSubmitting(true);
    const result = await onSubmit(form);
    setSubmitting(false);
    if (result) {
      onOpenChange(false);
      setForm({
        flag_key: '',
        flag_name: '',
        description: '',
        category: 'general',
        is_enabled: false,
        rollout_percentage: 0,
        target_license_tiers: [],
        target_roles: [],
        is_experiment: false
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Nuevo Feature Flag
          </DialogTitle>
          <DialogDescription>
            Crea un nuevo feature flag con targeting por tenant y licencia
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Key (único)</Label>
              <Input
                placeholder="mi_feature_flag"
                value={form.flag_key}
                onChange={e => setForm(f => ({ ...f, flag_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                placeholder="Mi Feature Flag"
                value={form.flag_name}
                onChange={e => setForm(f => ({ ...f, flag_name: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              placeholder="Descripción del feature flag..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select 
                value={form.category} 
                onValueChange={v => setForm(f => ({ ...f, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", cat.color)} />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rollout %</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[form.rollout_percentage || 0]}
                  onValueChange={([v]) => setForm(f => ({ ...f, rollout_percentage: v }))}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-10">{form.rollout_percentage}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label>Es Experimento A/B</Label>
              <p className="text-xs text-muted-foreground">Habilitar métricas de experimento</p>
            </div>
            <Switch
              checked={form.is_experiment}
              onCheckedChange={is_experiment => setForm(f => ({ ...f, is_experiment }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !form.flag_key || !form.flag_name}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Crear Flag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EnterpriseFeatureFlagsPanel() {
  const {
    flags,
    loading,
    auditLogs,
    fetchFlags,
    createFlag,
    updateFlag,
    deleteFlag,
    toggleFlag,
    fetchAuditLogs,
    getFlagsByCategory,
    getStatistics
  } = useEnterpriseFeatureFlags();

  const [activeTab, setActiveTab] = useState('flags');
  const [selectedFlag, setSelectedFlag] = useState<EnterpriseFeatureFlag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Stats
  const stats = useMemo(() => getStatistics(), [getStatistics]);
  const flagsByCategory = useMemo(() => getFlagsByCategory(), [getFlagsByCategory]);

  // Filtered flags
  const filteredFlags = useMemo(() => {
    return flags.filter(f => {
      const matchesSearch = !searchQuery || 
        f.flag_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.flag_key.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [flags, searchQuery, categoryFilter]);

  // Load audit logs when tab changes
  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  // Save flag changes
  const handleSaveFlag = async () => {
    if (!selectedFlag) return;
    setSaving(true);
    await updateFlag(selectedFlag.id, {
      flag_name: selectedFlag.flag_name,
      description: selectedFlag.description,
      category: selectedFlag.category,
      rollout_percentage: selectedFlag.rollout_percentage,
      target_license_tiers: selectedFlag.target_license_tiers,
      target_roles: selectedFlag.target_roles,
      is_experiment: selectedFlag.is_experiment,
      start_date: selectedFlag.start_date,
      end_date: selectedFlag.end_date
    });
    setSaving(false);
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-6 w-6 text-primary" />
            Feature Flags Enterprise
          </h2>
          <p className="text-muted-foreground">
            Sistema avanzado de feature flags con targeting por tenant y licencia
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchFlags}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Flag
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Flag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Flags</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.enabled}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <XCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.disabled}</p>
                <p className="text-xs text-muted-foreground">Inactivos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <FlaskConical className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.experiments}</p>
                <p className="text-xs text-muted-foreground">Experimentos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Building2 className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withTenantTargeting}</p>
                <p className="text-xs text-muted-foreground">Con Tenant</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <Key className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withLicenseTargeting}</p>
                <p className="text-xs text-muted-foreground">Con Licencia</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="flags" className="gap-2">
            <Flag className="h-4 w-4" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Layers className="h-4 w-4" />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <History className="h-4 w-4" />
            Auditoría
          </TabsTrigger>
        </TabsList>

        {/* Flags Tab */}
        <TabsContent value="flags" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Flags List */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar flags..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-8"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8">
                    <Filter className="h-3 w-3 mr-2" />
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {filteredFlags.map(flag => {
                      const catInfo = getCategoryInfo(flag.category);
                      return (
                        <div
                          key={flag.id}
                          onClick={() => setSelectedFlag(flag)}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                            selectedFlag?.id === flag.id && "border-primary bg-primary/5"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full shrink-0", flag.is_enabled ? "bg-emerald-500" : "bg-gray-400")} />
                                <span className="font-medium text-sm truncate">{flag.flag_name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground font-mono mt-1">{flag.flag_key}</p>
                              <div className="flex items-center gap-1 mt-2">
                                <Badge variant="outline" className="text-[10px] h-5">
                                  <div className={cn("w-1.5 h-1.5 rounded-full mr-1", catInfo.color)} />
                                  {catInfo.label}
                                </Badge>
                                {flag.is_experiment && (
                                  <Badge variant="secondary" className="text-[10px] h-5">
                                    <FlaskConical className="h-2.5 w-2.5 mr-1" />
                                    A/B
                                  </Badge>
                                )}
                                {flag.rollout_percentage < 100 && flag.rollout_percentage > 0 && (
                                  <Badge variant="outline" className="text-[10px] h-5">
                                    {flag.rollout_percentage}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Switch
                              checked={flag.is_enabled}
                              onCheckedChange={() => toggleFlag(flag.id)}
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {filteredFlags.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Flag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay flags que coincidan</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Flag Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {selectedFlag ? (
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Configuración: {selectedFlag.flag_name}
                    </div>
                  ) : 'Selecciona un flag'}
                </CardTitle>
                {selectedFlag && (
                  <CardDescription className="font-mono">{selectedFlag.flag_key}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {selectedFlag ? (
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input
                          value={selectedFlag.flag_name}
                          onChange={e => setSelectedFlag(f => f ? { ...f, flag_name: e.target.value } : null)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Select
                          value={selectedFlag.category}
                          onValueChange={v => setSelectedFlag(f => f ? { ...f, category: v } : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Textarea
                        value={selectedFlag.description || ''}
                        onChange={e => setSelectedFlag(f => f ? { ...f, description: e.target.value } : null)}
                        rows={2}
                      />
                    </div>

                    <Separator />

                    {/* Rollout */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Rollout Progresivo</Label>
                        <span className="text-sm font-mono font-bold">{selectedFlag.rollout_percentage}%</span>
                      </div>
                      <Slider
                        value={[selectedFlag.rollout_percentage]}
                        onValueChange={([v]) => setSelectedFlag(f => f ? { ...f, rollout_percentage: v } : null)}
                        max={100}
                        step={5}
                      />
                      <Progress value={selectedFlag.rollout_percentage} className="h-2" />
                    </div>

                    <Separator />

                    {/* License Targeting */}
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Targeting por Licencia
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {LICENSE_TIERS.map(tier => (
                          <Button
                            key={tier}
                            variant={selectedFlag.target_license_tiers.includes(tier) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const tiers = selectedFlag.target_license_tiers.includes(tier)
                                ? selectedFlag.target_license_tiers.filter(t => t !== tier)
                                : [...selectedFlag.target_license_tiers, tier];
                              setSelectedFlag(f => f ? { ...f, target_license_tiers: tiers } : null);
                            }}
                          >
                            {tier}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedFlag.target_license_tiers.length === 0 
                          ? 'Disponible para todas las licencias'
                          : `Solo para: ${selectedFlag.target_license_tiers.join(', ')}`}
                      </p>
                    </div>

                    {/* Role Targeting */}
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Targeting por Rol
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {ROLES.map(role => (
                          <Button
                            key={role}
                            variant={selectedFlag.target_roles.includes(role) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const roles = selectedFlag.target_roles.includes(role)
                                ? selectedFlag.target_roles.filter(r => r !== role)
                                : [...selectedFlag.target_roles, role];
                              setSelectedFlag(f => f ? { ...f, target_roles: roles } : null);
                            }}
                          >
                            {role.replace('_', ' ')}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Fecha inicio
                        </Label>
                        <Input
                          type="datetime-local"
                          value={selectedFlag.start_date || ''}
                          onChange={e => setSelectedFlag(f => f ? { ...f, start_date: e.target.value || null } : null)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Fecha fin
                        </Label>
                        <Input
                          type="datetime-local"
                          value={selectedFlag.end_date || ''}
                          onChange={e => setSelectedFlag(f => f ? { ...f, end_date: e.target.value || null } : null)}
                        />
                      </div>
                    </div>

                    {/* Experiment Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="flex items-center gap-2">
                          <FlaskConical className="h-4 w-4" />
                          Experimento A/B
                        </Label>
                        <p className="text-xs text-muted-foreground">Habilitar métricas y variantes</p>
                      </div>
                      <Switch
                        checked={selectedFlag.is_experiment}
                        onCheckedChange={is_experiment => setSelectedFlag(f => f ? { ...f, is_experiment } : null)}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar este flag?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. El flag "{selectedFlag.flag_name}" será eliminado permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => {
                                deleteFlag(selectedFlag.id);
                                setSelectedFlag(null);
                              }}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Button onClick={handleSaveFlag} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Guardar cambios
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Flag className="h-12 w-12 mb-4 opacity-50" />
                    <p>Selecciona un flag de la lista para configurarlo</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map(cat => {
              const categoryFlags = flagsByCategory[cat.value] || [];
              const enabledCount = categoryFlags.filter(f => f.is_enabled).length;
              
              return (
                <Card key={cat.value} className="hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", cat.color, "text-white")}>
                          <cat.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{cat.label}</CardTitle>
                          <CardDescription>{categoryFlags.length} flags</CardDescription>
                        </div>
                      </div>
                      <Badge variant={enabledCount > 0 ? 'default' : 'secondary'}>
                        {enabledCount} activos
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {categoryFlags.slice(0, 5).map(flag => (
                        <div key={flag.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", flag.is_enabled ? "bg-emerald-500" : "bg-gray-400")} />
                            <span className="truncate">{flag.flag_name}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      ))}
                      {categoryFlags.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          +{categoryFlags.length - 5} más
                        </p>
                      )}
                      {categoryFlags.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Sin flags en esta categoría
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial de cambios
              </CardTitle>
              <CardDescription>
                Registro de todas las modificaciones a los feature flags
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {auditLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg border">
                      <div className={cn(
                        "p-2 rounded-full shrink-0",
                        log.action === 'created' && "bg-emerald-500/10",
                        log.action === 'enabled' && "bg-green-500/10",
                        log.action === 'disabled' && "bg-amber-500/10",
                        log.action === 'updated' && "bg-blue-500/10",
                        log.action === 'deleted' && "bg-red-500/10"
                      )}>
                        {log.action === 'created' && <Plus className="h-4 w-4 text-emerald-500" />}
                        {log.action === 'enabled' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {log.action === 'disabled' && <XCircle className="h-4 w-4 text-amber-500" />}
                        {log.action === 'updated' && <Settings className="h-4 w-4 text-blue-500" />}
                        {log.action === 'deleted' && <Trash2 className="h-4 w-4 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{log.action}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.changed_at), { addSuffix: true, locale: es })}
                          </span>
                        </div>
                        {log.new_value && (
                          <p className="text-sm mt-1">
                            Flag: <span className="font-mono">{(log.new_value as any).flag_key || (log.old_value as any)?.flag_key}</span>
                          </p>
                        )}
                        {log.reason && (
                          <p className="text-xs text-muted-foreground mt-1">Razón: {log.reason}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(log.changed_at), 'dd/MM/yy HH:mm')}
                      </span>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay registros de auditoría</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <CreateFlagDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={createFlag}
      />
    </div>
  );
}

export default EnterpriseFeatureFlagsPanel;
