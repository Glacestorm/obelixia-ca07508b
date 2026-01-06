/**
 * AdvancedFeatureFlagsManager - Sistema avanzado de Feature Flags
 * Gestión por tenant, licencia, roles y condiciones dinámicas
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flag, Plus, Save, Trash2, Calendar, Users, Loader2, Search,
  Building2, Key, Shield, Zap, BarChart3, Target, Filter,
  CheckCircle2, XCircle, Clock, Eye, Edit, Copy, Download, 
  Upload, RefreshCw, Settings, AlertTriangle, Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// === TYPES ===

interface FeatureFlag {
  id: string;
  flag_key: string;
  flag_name: string;
  description: string;
  is_enabled: boolean;
  rollout_percentage: number;
  target_roles: string[];
  target_tenants: string[];
  target_licenses: string[];
  conditions: FlagCondition[];
  start_date: string | null;
  end_date: string | null;
  metadata: Record<string, any>;
  category: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface FlagCondition {
  type: 'user_attribute' | 'tenant_attribute' | 'license_type' | 'date_range' | 'percentage' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  attribute: string;
  value: any;
}

interface FlagHistory {
  id: string;
  flag_id: string;
  action: 'created' | 'updated' | 'enabled' | 'disabled' | 'deleted';
  changes: Record<string, any>;
  performed_by: string;
  performed_at: string;
}

interface TenantOverride {
  id: string;
  flag_id: string;
  tenant_id: string;
  tenant_name: string;
  is_enabled: boolean;
  rollout_percentage?: number;
  reason?: string;
}

// === CONSTANTS ===

const FLAG_CATEGORIES = [
  { id: 'core', label: 'Core Features', icon: Zap, color: 'blue' },
  { id: 'experimental', label: 'Experimental', icon: Bot, color: 'purple' },
  { id: 'beta', label: 'Beta', icon: AlertTriangle, color: 'amber' },
  { id: 'premium', label: 'Premium', icon: Key, color: 'emerald' },
  { id: 'enterprise', label: 'Enterprise', icon: Building2, color: 'indigo' },
  { id: 'deprecated', label: 'Deprecated', icon: XCircle, color: 'red' },
];

const LICENSE_TYPES = ['free', 'starter', 'professional', 'enterprise', 'ultimate'];
const ROLES = ['user', 'admin', 'superadmin', 'developer', 'support'];

// === COMPONENT ===

export function AdvancedFeatureFlagsManager() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FeatureFlag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('flags');

  // Mock data for demo
  const mockFlags: FeatureFlag[] = [
    {
      id: '1',
      flag_key: 'ai_copilot_v2',
      flag_name: 'AI Copilot V2',
      description: 'Nueva versión del copiloto IA con capacidades avanzadas',
      is_enabled: true,
      rollout_percentage: 75,
      target_roles: ['admin', 'superadmin'],
      target_tenants: [],
      target_licenses: ['professional', 'enterprise'],
      conditions: [],
      start_date: '2024-01-01',
      end_date: null,
      metadata: { version: '2.0', author: 'AI Team' },
      category: 'beta',
      priority: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      flag_key: 'vertical_accounting',
      flag_name: 'Contabilidad Vertical',
      description: 'Módulos de contabilidad especializados por industria',
      is_enabled: true,
      rollout_percentage: 100,
      target_roles: [],
      target_tenants: [],
      target_licenses: ['enterprise', 'ultimate'],
      conditions: [],
      start_date: null,
      end_date: null,
      metadata: { modules: 12 },
      category: 'premium',
      priority: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '3',
      flag_key: 'realtime_collaboration',
      flag_name: 'Colaboración en Tiempo Real',
      description: 'Edición colaborativa y presencia en tiempo real',
      is_enabled: false,
      rollout_percentage: 25,
      target_roles: ['developer'],
      target_tenants: ['tenant-demo-001'],
      target_licenses: [],
      conditions: [],
      start_date: '2024-06-01',
      end_date: '2024-12-31',
      metadata: { experiment: 'A/B Test #42' },
      category: 'experimental',
      priority: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '4',
      flag_key: 'agent_supervisor',
      flag_name: 'Supervisor de Agentes IA',
      description: 'Dashboard y control centralizado de agentes autónomos',
      is_enabled: true,
      rollout_percentage: 100,
      target_roles: [],
      target_tenants: [],
      target_licenses: ['enterprise', 'ultimate'],
      conditions: [],
      start_date: null,
      end_date: null,
      metadata: { agents: 20 },
      category: 'enterprise',
      priority: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '5',
      flag_key: 'dark_mode_v2',
      flag_name: 'Dark Mode V2',
      description: 'Nueva implementación del modo oscuro con mejor contraste',
      is_enabled: true,
      rollout_percentage: 100,
      target_roles: [],
      target_tenants: [],
      target_licenses: [],
      conditions: [],
      start_date: null,
      end_date: null,
      metadata: {},
      category: 'core',
      priority: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    setLoading(true);
    try {
      // Try to load from DB first
      const { data, error } = await supabase
        .from('cms_feature_flags')
        .select('*')
        .order('flag_name');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setFlags(data.map(f => {
          const metadata = f.metadata as Record<string, any> | null;
          return {
            ...f,
            target_roles: (f.target_roles as string[]) || [],
            target_tenants: (f.target_offices as string[]) || [],
            target_licenses: [],
            conditions: [],
            category: metadata?.category || 'core',
            priority: metadata?.priority || 5,
            created_at: f.created_at || new Date().toISOString(),
            updated_at: f.updated_at || new Date().toISOString()
          };
        }) as FeatureFlag[]);
      } else {
        // Use mock data
        setFlags(mockFlags);
      }
    } catch (error) {
      console.error('Error loading flags:', error);
      setFlags(mockFlags);
    } finally {
      setLoading(false);
    }
  };

  const filteredFlags = flags.filter(flag => {
    const matchesSearch = 
      flag.flag_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.flag_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || flag.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const toggleFlag = async (flag: FeatureFlag) => {
    const updated = { ...flag, is_enabled: !flag.is_enabled };
    setFlags(prev => prev.map(f => f.id === flag.id ? updated : f));
    toast.success(`Flag "${flag.flag_name}" ${updated.is_enabled ? 'activado' : 'desactivado'}`);
  };

  const saveFlag = async (flag: FeatureFlag) => {
    setFlags(prev => prev.map(f => f.id === flag.id ? flag : f));
    setSelected(null);
    toast.success('Flag guardado correctamente');
  };

  const deleteFlag = async (flagId: string) => {
    setFlags(prev => prev.filter(f => f.id !== flagId));
    if (selected?.id === flagId) setSelected(null);
    toast.success('Flag eliminado');
  };

  const createFlag = async (data: Partial<FeatureFlag>) => {
    const newFlag: FeatureFlag = {
      id: `flag-${Date.now()}`,
      flag_key: data.flag_key || '',
      flag_name: data.flag_name || '',
      description: data.description || '',
      is_enabled: false,
      rollout_percentage: 0,
      target_roles: [],
      target_tenants: [],
      target_licenses: [],
      conditions: [],
      start_date: null,
      end_date: null,
      metadata: {},
      category: data.category || 'core',
      priority: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setFlags(prev => [...prev, newFlag]);
    setShowCreateDialog(false);
    toast.success('Flag creado correctamente');
  };

  const getCategoryInfo = (categoryId: string) => {
    return FLAG_CATEGORIES.find(c => c.id === categoryId) || FLAG_CATEGORIES[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
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
            Feature Flags Avanzados
          </h2>
          <p className="text-muted-foreground">
            Gestión por tenant, licencia y condiciones dinámicas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadFlags}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refrescar
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Flag
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Flags</p>
                <p className="text-2xl font-bold">{flags.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Flag className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold text-green-500">
                  {flags.filter(f => f.is_enabled).length}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Beta</p>
                <p className="text-2xl font-bold text-amber-500">
                  {flags.filter(f => f.category === 'beta' || f.category === 'experimental').length}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enterprise</p>
                <p className="text-2xl font-bold text-indigo-500">
                  {flags.filter(f => f.category === 'enterprise' || f.category === 'premium').length}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <Building2 className="h-5 w-5 text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="flags">Flags</TabsTrigger>
          <TabsTrigger value="tenants">Por Tenant</TabsTrigger>
          <TabsTrigger value="licenses">Por Licencia</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Flags Tab */}
        <TabsContent value="flags" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar flags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {FLAG_CATEGORIES.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Flags Grid */}
          <div className="grid gap-4">
            <AnimatePresence>
              {filteredFlags.map((flag, index) => {
                const category = getCategoryInfo(flag.category);
                return (
                  <motion.div
                    key={flag.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={cn(
                      "transition-all hover:shadow-md",
                      selected?.id === flag.id && "ring-2 ring-primary"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Status indicator */}
                          <div className={cn(
                            "w-2 h-12 rounded-full",
                            flag.is_enabled ? "bg-green-500" : "bg-red-500"
                          )} />

                          {/* Flag info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{flag.flag_name}</h3>
                              <Badge variant="outline" className="text-xs font-mono">
                                {flag.flag_key}
                              </Badge>
                              <Badge className={cn(
                                "text-xs",
                                category.color === 'blue' && 'bg-blue-500/20 text-blue-400',
                                category.color === 'purple' && 'bg-purple-500/20 text-purple-400',
                                category.color === 'amber' && 'bg-amber-500/20 text-amber-400',
                                category.color === 'emerald' && 'bg-emerald-500/20 text-emerald-400',
                                category.color === 'indigo' && 'bg-indigo-500/20 text-indigo-400',
                                category.color === 'red' && 'bg-red-500/20 text-red-400'
                              )}>
                                {category.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{flag.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {flag.rollout_percentage}% rollout
                              </span>
                              {flag.target_licenses.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Key className="h-3 w-3" />
                                  {flag.target_licenses.join(', ')}
                                </span>
                              )}
                              {flag.target_roles.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {flag.target_roles.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={flag.is_enabled}
                              onCheckedChange={() => toggleFlag(flag)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelected(flag)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteFlag(flag.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* Tenants Tab */}
        <TabsContent value="tenants">
          <Card>
            <CardHeader>
              <CardTitle>Overrides por Tenant</CardTitle>
              <CardDescription>
                Configuración específica de flags por tenant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay overrides configurados</p>
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Override
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Licenses Tab */}
        <TabsContent value="licenses">
          <Card>
            <CardHeader>
              <CardTitle>Features por Licencia</CardTitle>
              <CardDescription>
                Qué features están disponibles para cada tipo de licencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-5 gap-4">
                {LICENSE_TYPES.map(license => {
                  const licenseFlags = flags.filter(f => 
                    f.target_licenses.length === 0 || f.target_licenses.includes(license)
                  );
                  return (
                    <Card key={license} className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm capitalize">{license}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {licenseFlags.slice(0, 5).map(flag => (
                            <div key={flag.id} className="flex items-center gap-2 text-xs">
                              {flag.is_enabled ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )}
                              <span className="truncate">{flag.flag_name}</span>
                            </div>
                          ))}
                          {licenseFlags.length > 5 && (
                            <p className="text-xs text-muted-foreground">
                              +{licenseFlags.length - 5} más
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Cambios</CardTitle>
              <CardDescription>
                Auditoría de cambios en flags
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {flags.slice(0, 10).map((flag, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                      <div className={cn(
                        "p-2 rounded-full",
                        idx % 2 === 0 ? "bg-green-500/20" : "bg-blue-500/20"
                      )}>
                        {idx % 2 === 0 ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Edit className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {idx % 2 === 0 ? 'Flag activado' : 'Flag actualizado'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {flag.flag_name} • {new Date(flag.updated_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        admin
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Flag: {selected?.flag_name}</DialogTitle>
            <DialogDescription>
              Configura las opciones del feature flag
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input 
                    value={selected.flag_name} 
                    onChange={e => setSelected({ ...selected, flag_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Key</Label>
                  <Input value={selected.flag_key} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea 
                  value={selected.description} 
                  onChange={e => setSelected({ ...selected, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Rollout Progresivo</Label>
                  <span className="text-sm font-medium">{selected.rollout_percentage}%</span>
                </div>
                <Slider 
                  value={[selected.rollout_percentage]} 
                  onValueChange={([v]) => setSelected({ ...selected, rollout_percentage: v })}
                  max={100} 
                  step={5} 
                />
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select 
                  value={selected.category} 
                  onValueChange={v => setSelected({ ...selected, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FLAG_CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Licencias Target</Label>
                <div className="flex flex-wrap gap-2">
                  {LICENSE_TYPES.map(license => (
                    <Button
                      key={license}
                      variant={selected.target_licenses.includes(license) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const newLicenses = selected.target_licenses.includes(license)
                          ? selected.target_licenses.filter(l => l !== license)
                          : [...selected.target_licenses, license];
                        setSelected({ ...selected, target_licenses: newLicenses });
                      }}
                    >
                      {license}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha inicio</Label>
                  <Input 
                    type="datetime-local" 
                    value={selected.start_date || ''} 
                    onChange={e => setSelected({ ...selected, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha fin</Label>
                  <Input 
                    type="datetime-local" 
                    value={selected.end_date || ''} 
                    onChange={e => setSelected({ ...selected, end_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={() => selected && saveFlag(selected)}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Flag</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            createFlag({
              flag_key: formData.get('key') as string,
              flag_name: formData.get('name') as string,
              description: formData.get('description') as string,
              category: formData.get('category') as string
            });
          }}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Key (snake_case)</Label>
                <Input name="key" placeholder="new_feature" required />
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input name="name" placeholder="Nueva Feature" required />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea name="description" placeholder="Descripción de la feature..." />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select name="category" defaultValue="core">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FLAG_CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Crear Flag
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdvancedFeatureFlagsManager;
