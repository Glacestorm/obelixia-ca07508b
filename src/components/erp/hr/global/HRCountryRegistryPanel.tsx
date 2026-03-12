/**
 * HRCountryRegistryPanel - Fase G1
 * Country Registry + Policy Engine + Employee Extensions
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Globe, Plus, RefreshCw, Shield, FileText, Users, Sparkles,
  CheckCircle, AlertTriangle, Settings, Flag, Scale, Loader2, Database
} from 'lucide-react';
import { useCountryRegistry, type CountryRegistryEntry, type CountryPolicy, type ComplianceAnalysis } from '@/hooks/erp/hr/useCountryRegistry';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface HRCountryRegistryPanelProps {
  companyId: string;
}

const AVAILABLE_COUNTRIES = [
  { code: 'ES', name: 'España', flag: '🇪🇸', currency: 'EUR', tz: 'Europe/Madrid', lang: 'es' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR', tz: 'Europe/Lisbon', lang: 'pt' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷', currency: 'EUR', tz: 'Europe/Paris', lang: 'fr' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪', currency: 'EUR', tz: 'Europe/Berlin', lang: 'de' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹', currency: 'EUR', tz: 'Europe/Rome', lang: 'it' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', currency: 'GBP', tz: 'Europe/London', lang: 'en' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', currency: 'USD', tz: 'America/New_York', lang: 'en' },
  { code: 'MX', name: 'México', flag: '🇲🇽', currency: 'MXN', tz: 'America/Mexico_City', lang: 'es' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', currency: 'COP', tz: 'America/Bogota', lang: 'es' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', currency: 'CLP', tz: 'America/Santiago', lang: 'es' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'ARS', tz: 'America/Argentina/Buenos_Aires', lang: 'es' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', currency: 'BRL', tz: 'America/Sao_Paulo', lang: 'pt' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩', currency: 'EUR', tz: 'Europe/Andorra', lang: 'ca' },
];

const FLAG_MAP: Record<string, string> = Object.fromEntries(AVAILABLE_COUNTRIES.map(c => [c.code, c.flag]));

const POLICY_TYPES = [
  { value: 'tax', label: 'Fiscal', icon: Scale },
  { value: 'social_security', label: 'Seguridad Social', icon: Shield },
  { value: 'leave', label: 'Ausencias', icon: FileText },
  { value: 'contract', label: 'Contratos', icon: FileText },
  { value: 'working_time', label: 'Jornada', icon: Settings },
  { value: 'compensation', label: 'Compensación', icon: Scale },
];

export function HRCountryRegistryPanel({ companyId }: HRCountryRegistryPanelProps) {
  const {
    countries, policies, stats, isLoading,
    fetchCountries, upsertCountry, toggleCountry,
    fetchPolicies, upsertPolicy,
    fetchStats, analyzeCompliance, seedDefaults
  } = useCountryRegistry(companyId);

  const [activeTab, setActiveTab] = useState('countries');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addCountryCode, setAddCountryCode] = useState('');
  const [complianceResult, setComplianceResult] = useState<ComplianceAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Policy form state
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    country_code: '', policy_type: '', policy_key: '',
    description: '', legal_reference: '', policy_value_json: '{}'
  });

  useEffect(() => {
    if (selectedCountry) {
      fetchPolicies(selectedCountry);
    }
  }, [selectedCountry, fetchPolicies]);

  const handleAddCountry = useCallback(async () => {
    const template = AVAILABLE_COUNTRIES.find(c => c.code === addCountryCode);
    if (!template) return;
    await upsertCountry({
      country_code: template.code,
      country_name: template.name,
      currency_code: template.currency,
      timezone: template.tz,
      language_code: template.lang,
      is_enabled: true,
    });
    setShowAddDialog(false);
    setAddCountryCode('');
  }, [addCountryCode, upsertCountry]);

  const handleSavePolicy = useCallback(async () => {
    try {
      const policyValue = JSON.parse(policyForm.policy_value_json);
      await upsertPolicy({
        country_code: policyForm.country_code || selectedCountry || 'ES',
        policy_type: policyForm.policy_type,
        policy_key: policyForm.policy_key,
        policy_value: policyValue,
        scope_level: 'country' as const,
        description: policyForm.description,
        legal_reference: policyForm.legal_reference,
      });
      setShowPolicyDialog(false);
      if (selectedCountry) fetchPolicies(selectedCountry);
    } catch {
      toast.error('JSON inválido en valor de política');
    }
  }, [policyForm, selectedCountry, upsertPolicy, fetchPolicies]);

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    const result = await analyzeCompliance();
    setComplianceResult(result);
    setIsAnalyzing(false);
  }, [analyzeCompliance]);

  const handleSeed = useCallback(async () => {
    setIsSeeding(true);
    await seedDefaults();
    setIsSeeding(false);
  }, [seedDefaults]);

  const existingCodes = new Set(countries.map(c => c.country_code));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/70">
            <Globe className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Country Registry & Policy Engine</h2>
            <p className="text-sm text-muted-foreground">
              Gestión multi-país · {stats?.enabled_countries || 0} países activos · {stats?.total_policies || 0} políticas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={isSeeding}>
            {isSeeding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Database className="h-4 w-4 mr-1" />}
            Seed España
          </Button>
          <Button variant="outline" size="sm" onClick={() => { fetchCountries(); fetchStats(); }} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
            Refrescar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Países', value: stats?.total_countries || 0, icon: Globe, color: 'text-blue-500' },
          { label: 'Habilitados', value: stats?.enabled_countries || 0, icon: CheckCircle, color: 'text-emerald-500' },
          { label: 'Políticas', value: stats?.total_policies || 0, icon: Shield, color: 'text-amber-500' },
          { label: 'Extensiones', value: stats?.total_extensions || 0, icon: Users, color: 'text-violet-500' },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className={cn("h-5 w-5", s.color)} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="countries">Países</TabsTrigger>
          <TabsTrigger value="policies">Políticas</TabsTrigger>
          <TabsTrigger value="compliance">Compliance IA</TabsTrigger>
        </TabsList>

        {/* COUNTRIES TAB */}
        <TabsContent value="countries">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Países Habilitados</CardTitle>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Añadir País</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Añadir País</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select value={addCountryCode} onValueChange={setAddCountryCode}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar país" /></SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_COUNTRIES.filter(c => !existingCodes.has(c.code)).map(c => (
                            <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleAddCountry} disabled={!addCountryCode} className="w-full">
                        Añadir
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {countries.length === 0 && !isLoading && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Globe className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay países configurados</p>
                      <p className="text-xs mt-1">Pulsa "Seed España" para cargar la configuración por defecto</p>
                    </div>
                  )}
                  {countries.map(country => (
                    <div
                      key={country.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer",
                        selectedCountry === country.country_code
                          ? "bg-primary/5 border-primary/30"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedCountry(country.country_code)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{FLAG_MAP[country.country_code] || '🏳️'}</span>
                        <div>
                          <p className="font-medium text-sm">{country.country_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {country.currency_code} · {country.timezone} · {country.language_code.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {country.social_security_system && (
                          <Badge variant="outline" className="text-[10px]">{country.social_security_system}</Badge>
                        )}
                        <Switch
                          checked={country.is_enabled}
                          onCheckedChange={(checked) => toggleCountry(country.id, checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Selected country detail */}
          {selectedCountry && (() => {
            const c = countries.find(x => x.country_code === selectedCountry);
            if (!c) return null;
            return (
              <Card className="mt-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="text-lg">{FLAG_MAP[c.country_code]}</span>
                    Detalle: {c.country_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Moneda:</span> {c.currency_code}</div>
                    <div><span className="text-muted-foreground">SMI Anual:</span> {c.min_wage_annual ? `${c.min_wage_annual.toLocaleString('es-ES')} €` : 'N/D'}</div>
                    <div><span className="text-muted-foreground">Jornada max:</span> {c.max_working_hours_week}h/semana</div>
                    <div><span className="text-muted-foreground">Vacaciones min:</span> {c.min_vacation_days} días</div>
                    <div><span className="text-muted-foreground">Prueba max:</span> {c.probation_max_days || 'N/D'} días</div>
                    <div><span className="text-muted-foreground">Preaviso:</span> {c.notice_period_default_days || 'N/D'} días</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Marco legal:</span> {c.labor_law_framework || 'No configurado'}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        {/* POLICIES TAB */}
        <TabsContent value="policies">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  Políticas {selectedCountry ? `— ${FLAG_MAP[selectedCountry] || ''} ${selectedCountry}` : '(selecciona un país)'}
                </CardTitle>
                <Button size="sm" onClick={() => setShowPolicyDialog(true)} disabled={!selectedCountry}>
                  <Plus className="h-4 w-4 mr-1" /> Nueva Política
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedCountry ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Selecciona un país en la pestaña Países para ver sus políticas
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {policies.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No hay políticas para {selectedCountry}
                      </p>
                    )}
                    {policies.map(p => {
                      const typeInfo = POLICY_TYPES.find(t => t.value === p.policy_type);
                      const TypeIcon = typeInfo?.icon || FileText;
                      return (
                        <div key={p.id} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TypeIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{p.policy_key}</span>
                              <Badge variant="outline" className="text-[10px]">{typeInfo?.label || p.policy_type}</Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                Prioridad: {p.priority}
                              </Badge>
                            </div>
                            <Badge variant={p.scope_level === 'country' ? 'default' : 'secondary'} className="text-[10px]">
                              {p.scope_level}
                            </Badge>
                          </div>
                          {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                          {p.legal_reference && (
                            <p className="text-xs text-primary/70 mt-0.5 flex items-center gap-1">
                              <Scale className="h-3 w-3" /> {p.legal_reference}
                            </p>
                          )}
                          <pre className="text-[11px] bg-muted/50 rounded p-2 mt-2 overflow-x-auto">
                            {JSON.stringify(p.policy_value, null, 2)}
                          </pre>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Add Policy Dialog */}
          <Dialog open={showPolicyDialog} onOpenChange={setShowPolicyDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nueva Política — {selectedCountry}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={policyForm.policy_type} onValueChange={v => setPolicyForm(p => ({ ...p, policy_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Tipo de política" /></SelectTrigger>
                    <SelectContent>
                      {POLICY_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Clave</Label>
                  <Input
                    placeholder="ej: irpf_brackets"
                    value={policyForm.policy_key}
                    onChange={e => setPolicyForm(p => ({ ...p, policy_key: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Descripción</Label>
                  <Input
                    value={policyForm.description}
                    onChange={e => setPolicyForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Referencia legal</Label>
                  <Input
                    value={policyForm.legal_reference}
                    onChange={e => setPolicyForm(p => ({ ...p, legal_reference: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor (JSON)</Label>
                  <Textarea
                    className="font-mono text-xs"
                    rows={5}
                    value={policyForm.policy_value_json}
                    onChange={e => setPolicyForm(p => ({ ...p, policy_value_json: e.target.value }))}
                  />
                </div>
                <Button onClick={handleSavePolicy} className="w-full">Guardar Política</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* COMPLIANCE TAB */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Análisis de Compliance con IA
                </CardTitle>
                <Button size="sm" onClick={handleAnalyze} disabled={isAnalyzing || countries.length === 0}>
                  {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Analizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!complianceResult ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Pulsa "Analizar" para obtener un informe de compliance multi-país con IA
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{complianceResult.overall_score}</p>
                      <p className="text-xs text-muted-foreground">Score Global</p>
                    </div>
                    <Progress value={complianceResult.overall_score} className="flex-1" />
                  </div>

                  {complianceResult.countries_analysis?.map(ca => (
                    <Card key={ca.country_code} className="border-border/50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">
                            {FLAG_MAP[ca.country_code] || '🏳️'} {ca.country_code}
                          </span>
                          <Badge variant={ca.completeness >= 80 ? 'default' : 'destructive'}>
                            {ca.completeness}%
                          </Badge>
                        </div>
                        {ca.missing_policies?.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-amber-600">Faltantes:</span>{' '}
                            {ca.missing_policies.join(', ')}
                          </div>
                        )}
                        {ca.risks?.length > 0 && (
                          <div className="text-xs text-destructive mt-1">
                            <span className="font-medium">Riesgos:</span> {ca.risks.join(', ')}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {complianceResult.recommendations?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Recomendaciones</h4>
                      <div className="space-y-1">
                        {complianceResult.recommendations.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-muted/30">
                            <Badge variant={r.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                              {r.priority}
                            </Badge>
                            <div>
                              <p>{r.action}</p>
                              {r.legal_reference && <p className="text-muted-foreground">{r.legal_reference}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
