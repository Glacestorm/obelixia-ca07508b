/**
 * CaseSolarTab - Premium Solar/Self-consumption management
 * Full CRUD, analytics, charts, recommendations, audit
 */
import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Sun, Plus, Trash2, Battery, Zap, TrendingDown, Edit, Save, X, Loader2,
  Sparkles, AlertTriangle, CheckCircle, Info, ArrowUpRight, Wrench,
  Calendar, DollarSign, BarChart3, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useEnergySolarInstallations, SolarInstallation } from '@/hooks/erp/useEnergySolarInstallations';
import { useEnergySolarRecommendations } from '@/hooks/erp/useEnergySolarRecommendations';
import { useEnergyAuditLog } from '@/hooks/erp/useEnergyAuditLog';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend,
  AreaChart, Area, LineChart, Line,
} from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  caseId: string;
  companyId: string;
}

const COLORS = {
  solar: 'hsl(45, 93%, 47%)',
  green: 'hsl(142, 71%, 45%)',
  blue: 'hsl(217, 91%, 60%)',
  red: 'hsl(0, 84%, 60%)',
  orange: 'hsl(25, 95%, 53%)',
  purple: 'hsl(271, 91%, 65%)',
  amber: 'hsl(38, 92%, 50%)',
  teal: 'hsl(172, 66%, 50%)',
};

const MODALITY_LABELS: Record<string, string> = {
  with_surplus: 'Con excedentes',
  without_surplus: 'Sin excedentes',
  collective: 'Colectivo',
};

const FINANCING_LABELS: Record<string, string> = {
  purchase: 'Compra',
  renting: 'Renting',
  leasing: 'Leasing',
  ppa: 'PPA',
};

const emptyForm = {
  installed_power_kwp: '',
  installation_date: '',
  modality: 'with_surplus',
  has_battery: false,
  battery_capacity_kwh: '',
  inverter_brand: '',
  inverter_power_kw: '',
  installer_company: '',
  financing_type: 'purchase',
  monthly_estimated_savings: '',
  monthly_real_savings: '',
  annual_self_consumption_kwh: '',
  annual_surplus_kwh: '',
  annual_compensation_eur: '',
  grid_dependency_pct: '100',
  maintenance_contract: false,
  maintenance_cost_annual: '',
  notes: '',
};

export function CaseSolarTab({ caseId, companyId }: Props) {
  const { installations, loading, analytics, createInstallation, updateInstallation, deleteInstallation, fetchInstallations } = useEnergySolarInstallations(caseId, companyId);
  const { result: aiResult, loading: aiLoading, fetchRecommendations } = useEnergySolarRecommendations();
  const { log } = useEnergyAuditLog(companyId, caseId);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // === FORM HELPERS ===
  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }, []);

  const startEdit = useCallback((inst: SolarInstallation) => {
    setForm({
      installed_power_kwp: String(inst.installed_power_kwp || ''),
      installation_date: inst.installation_date || '',
      modality: inst.modality || 'with_surplus',
      has_battery: inst.has_battery || false,
      battery_capacity_kwh: inst.battery_capacity_kwh ? String(inst.battery_capacity_kwh) : '',
      inverter_brand: inst.inverter_brand || '',
      inverter_power_kw: inst.inverter_power_kw ? String(inst.inverter_power_kw) : '',
      installer_company: inst.installer_company || '',
      financing_type: inst.financing_type || 'purchase',
      monthly_estimated_savings: String(inst.monthly_estimated_savings || ''),
      monthly_real_savings: String(inst.monthly_real_savings || ''),
      annual_self_consumption_kwh: String(inst.annual_self_consumption_kwh || ''),
      annual_surplus_kwh: String(inst.annual_surplus_kwh || ''),
      annual_compensation_eur: String(inst.annual_compensation_eur || ''),
      grid_dependency_pct: String(inst.grid_dependency_pct ?? '100'),
      maintenance_contract: inst.maintenance_contract || false,
      maintenance_cost_annual: inst.maintenance_cost_annual ? String(inst.maintenance_cost_annual) : '',
      notes: inst.notes || '',
    });
    setEditingId(inst.id);
    setShowForm(true);
  }, []);

  const buildPayload = useCallback(() => ({
    installed_power_kwp: parseFloat(form.installed_power_kwp) || 0,
    installation_date: form.installation_date || null,
    modality: form.modality,
    has_battery: form.has_battery,
    battery_capacity_kwh: form.battery_capacity_kwh ? parseFloat(form.battery_capacity_kwh) : null,
    inverter_brand: form.inverter_brand || null,
    inverter_power_kw: form.inverter_power_kw ? parseFloat(form.inverter_power_kw) : null,
    installer_company: form.installer_company || null,
    financing_type: form.financing_type,
    monthly_estimated_savings: parseFloat(form.monthly_estimated_savings) || 0,
    monthly_real_savings: parseFloat(form.monthly_real_savings) || 0,
    annual_self_consumption_kwh: parseFloat(form.annual_self_consumption_kwh) || 0,
    annual_surplus_kwh: parseFloat(form.annual_surplus_kwh) || 0,
    annual_compensation_eur: parseFloat(form.annual_compensation_eur) || 0,
    grid_dependency_pct: parseFloat(form.grid_dependency_pct) || 100,
    maintenance_contract: form.maintenance_contract,
    maintenance_cost_annual: parseFloat(form.maintenance_cost_annual) || 0,
    notes: form.notes || null,
  }), [form]);

  const handleSave = useCallback(async () => {
    const payload = buildPayload();
    if (editingId) {
      const result = await updateInstallation(editingId, payload);
      if (result) {
        await log('solar_installation_updated', 'energy_solar_installations', editingId, { power: payload.installed_power_kwp });
      }
    } else {
      const result = await createInstallation(payload);
      if (result) {
        await log('solar_installation_created', 'energy_solar_installations', result.id, { power: payload.installed_power_kwp });
      }
    }
    resetForm();
  }, [buildPayload, editingId, updateInstallation, createInstallation, resetForm, log]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteInstallation(id);
    await log('solar_installation_deleted', 'energy_solar_installations', id);
  }, [deleteInstallation, log]);

  const handleGetRecommendations = useCallback(() => {
    fetchRecommendations(installations, analytics);
  }, [fetchRecommendations, installations, analytics]);

  // === CHART DATA ===
  const chartData = useMemo(() => {
    const energyMix = [
      { name: 'Autoconsumo', value: analytics.totalSelfConsumptionKwh, color: COLORS.solar },
      { name: 'Excedentes', value: analytics.totalSurplusKwh, color: COLORS.blue },
    ].filter(d => d.value > 0);

    const savingsComparison = installations.map(i => ({
      name: `${i.installed_power_kwp} kWp`,
      estimado: i.monthly_estimated_savings || 0,
      real: i.monthly_real_savings || 0,
    }));

    const gridVsSolar = [
      { name: 'Autoconsumo', value: 100 - analytics.avgGridDependency, fill: COLORS.solar },
      { name: 'Red', value: analytics.avgGridDependency, fill: COLORS.red },
    ];

    // Monthly projection (simulate 12 months from current data)
    const monthlyProjection = Array.from({ length: 12 }, (_, i) => {
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      // Solar irradiation factor by month (Spain avg)
      const irradiationFactor = [0.55, 0.65, 0.80, 0.90, 1.0, 1.10, 1.15, 1.10, 0.95, 0.75, 0.60, 0.50];
      const factor = irradiationFactor[i];
      const estSavings = analytics.totalEstSavingsMonth * factor;
      const realSavings = analytics.totalRealSavingsMonth > 0
        ? analytics.totalRealSavingsMonth * factor
        : estSavings * 0.85;
      const selfConsumption = (analytics.totalSelfConsumptionKwh / 12) * factor;
      const surplus = (analytics.totalSurplusKwh / 12) * factor;
      const compensation = (analytics.totalCompensationEur / 12) * factor;
      return {
        month: monthNames[i],
        ahorroEstimado: Math.round(estSavings),
        ahorroReal: Math.round(realSavings),
        autoconsumo: Math.round(selfConsumption),
        excedentes: Math.round(surplus),
        compensacion: Math.round(compensation * 100) / 100,
      };
    });

    const financingBreakdown = installations.reduce((acc, inst) => {
      const key = FINANCING_LABELS[inst.financing_type] || inst.financing_type;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const financingData = Object.entries(financingBreakdown).map(([name, value], i) => ({
      name, value, color: Object.values(COLORS)[i % Object.values(COLORS).length],
    }));

    return { energyMix, savingsComparison, gridVsSolar, monthlyProjection, financingData };
  }, [installations, analytics]);

  // === LOADING STATE ===
  if (loading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Cargando instalaciones solares…</p>
      </div>
    );
  }

  // === EMPTY STATE ===
  if (installations.length === 0 && !showForm) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center">
              <Sun className="h-8 w-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Sin instalaciones solares</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Registra instalaciones de autoconsumo para analizar producción, excedentes, ahorro y obtener recomendaciones IA.
            </p>
            <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
              <Plus className="h-4 w-4 mr-2" /> Añadir instalación solar
            </Button>
            <div className="mt-6 grid grid-cols-3 gap-4 max-w-lg mx-auto text-xs text-muted-foreground">
              <div className="flex flex-col items-center gap-1"><Zap className="h-4 w-4" /><span>Autoconsumo</span></div>
              <div className="flex flex-col items-center gap-1"><Battery className="h-4 w-4" /><span>Baterías</span></div>
              <div className="flex flex-col items-center gap-1"><Sparkles className="h-4 w-4" /><span>Recomendaciones IA</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { label: 'Potencia', value: `${analytics.totalPowerKwp} kWp`, icon: Sun, gradient: 'from-amber-500/10 to-orange-500/10', iconColor: 'text-amber-500' },
          { label: 'Ahorro est./mes', value: `${analytics.totalEstSavingsMonth.toFixed(0)} €`, icon: TrendingDown, gradient: 'from-emerald-500/10 to-green-500/10', iconColor: 'text-emerald-500' },
          { label: 'Ahorro real/mes', value: `${analytics.totalRealSavingsMonth.toFixed(0)} €`, icon: DollarSign, gradient: 'from-green-600/10 to-emerald-600/10', iconColor: 'text-green-600' },
          { label: 'Autoconsumo', value: `${(analytics.totalSelfConsumptionKwh / 1000).toFixed(1)} MWh/a`, icon: Zap, gradient: 'from-amber-400/10 to-yellow-500/10', iconColor: 'text-amber-500' },
          { label: 'Excedentes', value: `${(analytics.totalSurplusKwh / 1000).toFixed(1)} MWh/a`, icon: ArrowUpRight, gradient: 'from-blue-500/10 to-cyan-500/10', iconColor: 'text-blue-500' },
          { label: 'Compensación', value: `${analytics.totalCompensationEur.toFixed(0)} €/a`, icon: DollarSign, gradient: 'from-purple-500/10 to-violet-500/10', iconColor: 'text-purple-500' },
          { label: 'Dep. Red', value: `${analytics.avgGridDependency.toFixed(0)}%`, icon: Zap, gradient: analytics.avgGridDependency > 70 ? 'from-red-500/10 to-orange-500/10' : 'from-green-500/10 to-teal-500/10', iconColor: analytics.avgGridDependency > 70 ? 'text-red-500' : 'text-green-500' },
          { label: 'Eficiencia', value: `${analytics.savingsEfficiency.toFixed(0)}%`, icon: BarChart3, gradient: analytics.savingsEfficiency >= 80 ? 'from-green-500/10 to-emerald-500/10' : 'from-amber-500/10 to-orange-500/10', iconColor: analytics.savingsEfficiency >= 80 ? 'text-green-500' : 'text-amber-500' },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className={cn('bg-gradient-to-br', kpi.gradient, 'border-0 shadow-sm')}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4 shrink-0', kpi.iconColor)} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase truncate">{kpi.label}</p>
                    <p className="text-sm font-bold truncate">{kpi.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList className="h-9">
            <TabsTrigger value="overview" className="text-xs">📊 Resumen</TabsTrigger>
            <TabsTrigger value="installations" className="text-xs">☀️ Instalaciones</TabsTrigger>
            <TabsTrigger value="savings" className="text-xs">💰 Ahorro</TabsTrigger>
            <TabsTrigger value="energy" className="text-xs">⚡ Energía</TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs">🤖 IA</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchInstallations}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Actualizar
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
              <Plus className="h-3.5 w-3.5 mr-1" /> Nueva instalación
            </Button>
          </div>
        </div>

        {/* === OVERVIEW TAB === */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Energy Mix */}
            {chartData.energyMix.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Mix energético solar</CardTitle>
                  <CardDescription className="text-xs">Autoconsumo vs excedentes vertidos</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={chartData.energyMix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {chartData.energyMix.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toFixed(0)} kWh/año`}
                        contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="text-center mt-1">
                    <Badge variant="outline" className="text-xs">
                      Ratio autoconsumo: {analytics.selfConsumptionRatio.toFixed(0)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Grid dependency radial */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dependencia de red</CardTitle>
                <CardDescription className="text-xs">% energía consumida de la red vs autoconsumo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={chartData.gridVsSolar} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={8} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`}
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Financing */}
            {chartData.financingData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tipo de financiación</CardTitle>
                  <CardDescription className="text-xs">Distribución por modelo de financiación</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={chartData.financingData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                        label={({ name, value }) => `${name}: ${value}`}>
                        {chartData.financingData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-amber-500/5 to-orange-500/5">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{installations.length}</p>
                <p className="text-xs text-muted-foreground">Instalaciones</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/5">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{analytics.annualEstSavings.toFixed(0)} €</p>
                <p className="text-xs text-muted-foreground">Ahorro anual estimado</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{analytics.installationsWithBattery}</p>
                <p className="text-xs text-muted-foreground">Con batería ({analytics.totalBatteryCapacity.toFixed(0)} kWh)</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/5 to-violet-500/5">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{analytics.totalMaintenanceCost.toFixed(0)} €</p>
                <p className="text-xs text-muted-foreground">Mantenimiento anual</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* === INSTALLATIONS TAB === */}
        <TabsContent value="installations" className="mt-4 space-y-3">
          {/* Form */}
          {showForm && (
            <Card className="border-primary/30 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{editingId ? 'Editar instalación' : 'Nueva instalación solar'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Row 1: Core info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-xs">Potencia (kWp) *</Label>
                    <Input type="number" value={form.installed_power_kwp} onChange={e => setForm(f => ({ ...f, installed_power_kwp: e.target.value }))} className="h-8 text-sm" placeholder="ej: 5.5" /></div>
                  <div><Label className="text-xs">Fecha instalación</Label>
                    <Input type="date" value={form.installation_date} onChange={e => setForm(f => ({ ...f, installation_date: e.target.value }))} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Modalidad</Label>
                    <Select value={form.modality} onValueChange={v => setForm(f => ({ ...f, modality: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="with_surplus">Con excedentes</SelectItem>
                        <SelectItem value="without_surplus">Sin excedentes</SelectItem>
                        <SelectItem value="collective">Colectivo</SelectItem>
                      </SelectContent>
                    </Select></div>
                  <div><Label className="text-xs">Financiación</Label>
                    <Select value={form.financing_type} onValueChange={v => setForm(f => ({ ...f, financing_type: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchase">Compra</SelectItem>
                        <SelectItem value="renting">Renting</SelectItem>
                        <SelectItem value="leasing">Leasing</SelectItem>
                        <SelectItem value="ppa">PPA</SelectItem>
                      </SelectContent>
                    </Select></div>
                </div>
                {/* Row 2: Equipment */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-xs">Instaladora</Label>
                    <Input value={form.installer_company} onChange={e => setForm(f => ({ ...f, installer_company: e.target.value }))} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Marca inversor</Label>
                    <Input value={form.inverter_brand} onChange={e => setForm(f => ({ ...f, inverter_brand: e.target.value }))} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Potencia inversor (kW)</Label>
                    <Input type="number" value={form.inverter_power_kw} onChange={e => setForm(f => ({ ...f, inverter_power_kw: e.target.value }))} className="h-8 text-sm" /></div>
                  <div className="flex items-end gap-3">
                    <div className="flex items-center gap-2"><Switch checked={form.has_battery} onCheckedChange={v => setForm(f => ({ ...f, has_battery: v }))} /><Label className="text-xs">Batería</Label></div>
                    {form.has_battery && (
                      <div className="flex-1"><Label className="text-xs">Cap. (kWh)</Label>
                        <Input type="number" value={form.battery_capacity_kwh} onChange={e => setForm(f => ({ ...f, battery_capacity_kwh: e.target.value }))} className="h-8 text-sm" /></div>
                    )}
                  </div>
                </div>
                {/* Row 3: Savings & Energy */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-xs">Ahorro estimado €/mes</Label>
                    <Input type="number" value={form.monthly_estimated_savings} onChange={e => setForm(f => ({ ...f, monthly_estimated_savings: e.target.value }))} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Ahorro real €/mes</Label>
                    <Input type="number" value={form.monthly_real_savings} onChange={e => setForm(f => ({ ...f, monthly_real_savings: e.target.value }))} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Autoconsumo kWh/año</Label>
                    <Input type="number" value={form.annual_self_consumption_kwh} onChange={e => setForm(f => ({ ...f, annual_self_consumption_kwh: e.target.value }))} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Excedentes kWh/año</Label>
                    <Input type="number" value={form.annual_surplus_kwh} onChange={e => setForm(f => ({ ...f, annual_surplus_kwh: e.target.value }))} className="h-8 text-sm" /></div>
                </div>
                {/* Row 4: Compensation & Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-xs">Compensación €/año</Label>
                    <Input type="number" value={form.annual_compensation_eur} onChange={e => setForm(f => ({ ...f, annual_compensation_eur: e.target.value }))} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Dep. red %</Label>
                    <Input type="number" value={form.grid_dependency_pct} onChange={e => setForm(f => ({ ...f, grid_dependency_pct: e.target.value }))} className="h-8 text-sm" min="0" max="100" /></div>
                  <div className="flex items-end gap-3">
                    <div className="flex items-center gap-2"><Switch checked={form.maintenance_contract} onCheckedChange={v => setForm(f => ({ ...f, maintenance_contract: v }))} /><Label className="text-xs">Mantenimiento</Label></div>
                    {form.maintenance_contract && (
                      <div className="flex-1"><Label className="text-xs">Coste €/año</Label>
                        <Input type="number" value={form.maintenance_cost_annual} onChange={e => setForm(f => ({ ...f, maintenance_cost_annual: e.target.value }))} className="h-8 text-sm" /></div>
                    )}
                  </div>
                </div>
                {/* Notes */}
                <div><Label className="text-xs">Observaciones técnicas</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-sm h-16" placeholder="Notas sobre orientación, inclinación, sombras, etc." /></div>
                {/* Actions */}
                <div className="flex gap-2 justify-end border-t pt-3">
                  <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-3.5 w-3.5 mr-1" /> Cancelar</Button>
                  <Button size="sm" onClick={handleSave} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                    <Save className="h-3.5 w-3.5 mr-1" /> {editingId ? 'Actualizar' : 'Guardar'}
                  </Button>
                </div>
                {/* Data source note */}
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" /> Todos los datos son de entrada manual. La integración con inversores y monitores solares está preparada para fases futuras.
                </p>
              </CardContent>
            </Card>
          )}

          {/* List */}
          <ScrollArea className={installations.length > 4 ? 'h-[500px]' : ''}>
            <div className="space-y-2">
              {installations.map(inst => {
                const isExpanded = expandedId === inst.id;
                const effPct = inst.monthly_estimated_savings > 0
                  ? (inst.monthly_real_savings / inst.monthly_estimated_savings) * 100 : 0;
                return (
                  <Card key={inst.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Sun className="h-4 w-4 text-amber-500" />
                            <span className="font-semibold text-sm">{inst.installed_power_kwp} kWp</span>
                            <Badge variant="outline" className="text-[10px]">{MODALITY_LABELS[inst.modality] || inst.modality}</Badge>
                            {inst.has_battery && <Badge variant="secondary" className="text-[10px]"><Battery className="h-3 w-3 mr-0.5" />{inst.battery_capacity_kwh} kWh</Badge>}
                            <Badge variant="outline" className="text-[10px] capitalize">{FINANCING_LABELS[inst.financing_type] || inst.financing_type}</Badge>
                            {inst.maintenance_contract && <Badge variant="outline" className="text-[10px] border-green-300 text-green-600"><Wrench className="h-3 w-3 mr-0.5" />Mant.</Badge>}
                            {!inst.maintenance_contract && <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600">Sin mant.</Badge>}
                            {inst.installation_date && <Badge variant="outline" className="text-[10px]"><Calendar className="h-3 w-3 mr-0.5" />{inst.installation_date}</Badge>}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span>Ahorro: <strong className="text-foreground">{inst.monthly_estimated_savings}€</strong> est. / <strong className={inst.monthly_real_savings >= inst.monthly_estimated_savings ? 'text-green-600' : 'text-amber-600'}>{inst.monthly_real_savings}€</strong> real</span>
                            <span>Autoconsumo: {inst.annual_self_consumption_kwh.toFixed(0)} kWh</span>
                            <span>Excedentes: {inst.annual_surplus_kwh.toFixed(0)} kWh</span>
                            <span>Red: {inst.grid_dependency_pct}%</span>
                          </div>
                          {/* Efficiency bar */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-16">Eficiencia</span>
                            <Progress value={Math.min(effPct, 100)} className="h-1.5 flex-1" />
                            <span className={cn('text-[10px] font-medium', effPct >= 80 ? 'text-green-600' : effPct >= 50 ? 'text-amber-600' : 'text-red-500')}>
                              {effPct.toFixed(0)}%
                            </span>
                          </div>
                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="mt-2 p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                              {inst.inverter_brand && <p>Inversor: {inst.inverter_brand} {inst.inverter_power_kw ? `(${inst.inverter_power_kw} kW)` : ''}</p>}
                              {inst.installer_company && <p>Instaladora: {inst.installer_company}</p>}
                              <p>Compensación: {inst.annual_compensation_eur.toFixed(2)} €/año</p>
                              {inst.maintenance_contract && <p>Coste mantenimiento: {inst.maintenance_cost_annual} €/año</p>}
                              {inst.notes && <p className="italic text-muted-foreground">{inst.notes}</p>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedId(isExpanded ? null : inst.id)}>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(inst)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(inst.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* === SAVINGS TAB === */}
        <TabsContent value="savings" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Savings comparison bar */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ahorro estimado vs real por instalación</CardTitle>
                <CardDescription className="text-xs">Comparativa mensual de cada instalación</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData.savingsComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(0)} €/mes`}
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="estimado" fill={COLORS.solar} name="Estimado" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="real" fill={COLORS.green} name="Real" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly savings projection */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Proyección de ahorro mensual</CardTitle>
                <CardDescription className="text-xs">Estimación basada en irradiación solar media España</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData.monthlyProjection}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip formatter={(v: number) => `${v} €`}
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="ahorroEstimado" stroke={COLORS.solar} fill={COLORS.solar} fillOpacity={0.15} name="Estimado" strokeWidth={2} />
                    <Area type="monotone" dataKey="ahorroReal" stroke={COLORS.green} fill={COLORS.green} fillOpacity={0.15} name="Real" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Monthly compensation chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Compensación económica mensual proyectada</CardTitle>
              <CardDescription className="text-xs">Ingresos por vertido de excedentes a red</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData.monthlyProjection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)} €`}
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="compensacion" fill={COLORS.purple} name="Compensación €" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Data source note */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" />
            <span>Los datos de ahorro y compensación son de <strong>entrada manual</strong>. La proyección mensual se calcula con factores de irradiación solar estándar para España.</span>
          </div>
        </TabsContent>

        {/* === ENERGY TAB === */}
        <TabsContent value="energy" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Self-consumption vs surplus monthly */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Autoconsumo vs excedentes mensual</CardTitle>
                <CardDescription className="text-xs">Distribución energética proyectada</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData.monthlyProjection}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip formatter={(v: number) => `${v} kWh`}
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="autoconsumo" stackId="a" fill={COLORS.solar} name="Autoconsumo" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="excedentes" stackId="a" fill={COLORS.blue} name="Excedentes" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Production curve (simulated daily) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Curva de producción diaria típica</CardTitle>
                <CardDescription className="text-xs">Simulada para {analytics.totalPowerKwp} kWp</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={Array.from({ length: 24 }, (_, h) => {
                    // Bell curve centered at 13h
                    const factor = Math.max(0, Math.exp(-Math.pow(h - 13, 2) / 18));
                    const production = analytics.totalPowerKwp * factor * 0.85;
                    const consumption = analytics.totalPowerKwp * 0.15 * (0.3 + 0.7 * Math.sin((h - 6) * Math.PI / 18));
                    return {
                      hour: `${h}:00`,
                      produccion: Math.round(production * 100) / 100,
                      consumo: Math.round(Math.max(0, consumption) * 100) / 100,
                    };
                  })}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" fontSize={9} tick={{ fill: 'hsl(var(--muted-foreground))' }} interval={2} />
                    <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} unit=" kW" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="produccion" stroke={COLORS.solar} fill={COLORS.solar} fillOpacity={0.2} name="Producción kW" strokeWidth={2} />
                    <Area type="monotone" dataKey="consumo" stroke={COLORS.teal} fill={COLORS.teal} fillOpacity={0.1} name="Consumo est. kW" strokeWidth={1.5} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Reduction factor line chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reducción estimada de factura eléctrica</CardTitle>
              <CardDescription className="text-xs">% de reducción mensual por autoconsumo solar</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData.monthlyProjection.map(m => ({
                  month: m.month,
                  reduccion: analytics.avgGridDependency < 100
                    ? Math.round((1 - analytics.avgGridDependency / 100) * (m.ahorroEstimado / (analytics.totalEstSavingsMonth || 1)) * 100)
                    : 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                  <Tooltip formatter={(v: number) => `${v}%`}
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="reduccion" stroke={COLORS.green} strokeWidth={2.5} dot={{ fill: COLORS.green, r: 3 }} name="Reducción %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" />
            <span>La curva de producción es <strong>simulada</strong> usando una gaussiana estándar. Integración con monitores de inversores (Huawei, Fronius, SMA) preparada para fases futuras.</span>
          </div>
        </TabsContent>

        {/* === RECOMMENDATIONS TAB === */}
        <TabsContent value="recommendations" className="mt-4 space-y-4">
          <Card className="bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-yellow-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Recomendaciones IA Solar</CardTitle>
                    <CardDescription className="text-xs">Análisis inteligente de tus instalaciones</CardDescription>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={handleGetRecommendations} disabled={aiLoading || installations.length === 0}>
                  {aiLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  {aiLoading ? 'Analizando…' : 'Analizar'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!aiResult && !aiLoading && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  Pulsa "Analizar" para obtener recomendaciones personalizadas basadas en tus instalaciones solares.
                </div>
              )}

              {aiResult && (
                <div className="space-y-4">
                  {/* Score + Summary */}
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-background border">
                    <div className="text-center">
                      <div className={cn(
                        'text-3xl font-bold',
                        aiResult.overallScore >= 80 ? 'text-green-600' :
                        aiResult.overallScore >= 50 ? 'text-amber-600' : 'text-red-500'
                      )}>
                        {aiResult.overallScore}
                      </div>
                      <p className="text-[10px] text-muted-foreground">Puntuación</p>
                    </div>
                    <p className="text-sm flex-1">{aiResult.summary}</p>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-2">
                    {aiResult.recommendations.map((rec, i) => {
                      const iconMap = { optimization: CheckCircle, warning: AlertTriangle, opportunity: ArrowUpRight, info: Info };
                      const colorMap = { optimization: 'text-green-600 bg-green-500/10', warning: 'text-amber-600 bg-amber-500/10', opportunity: 'text-blue-600 bg-blue-500/10', info: 'text-muted-foreground bg-muted' };
                      const priorityMap = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-green-100 text-green-700' };
                      const Icon = iconMap[rec.type] || Info;
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-background hover:shadow-sm transition-shadow">
                          <div className={cn('p-1.5 rounded-md', colorMap[rec.type])}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium">{rec.title}</span>
                              <Badge className={cn('text-[10px] px-1.5', priorityMap[rec.priority])}>{rec.priority}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{rec.description}</p>
                          </div>
                          {rec.impact && (
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-green-600">+{rec.impact} €</p>
                              <p className="text-[10px] text-muted-foreground">/año</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CaseSolarTab;
