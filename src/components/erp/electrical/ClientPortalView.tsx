/**
 * ClientPortalView - Read-only portal for end clients
 * Accessed via secure token, shows proposal, report, case status, savings
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Zap, FileText, TrendingDown, CheckCircle2, Clock, Shield, AlertTriangle, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PortalData {
  case: {
    title: string;
    status: string;
    cups: string | null;
    address: string | null;
    current_supplier: string | null;
    estimated_annual_savings: number | null;
    contract_end_date: string | null;
  } | null;
  proposals: any[];
  workflowStatus: string | null;
  expired: boolean;
  clientName: string | null;
}

export function ClientPortalView() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPortalData = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('portal_token');
    if (!token) {
      setError('Token de acceso no proporcionado');
      setLoading(false);
      return;
    }

    try {
      // Validate token
      const { data: tokenData, error: tokenErr } = await supabase
        .from('energy_client_portal_tokens')
        .select('*')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (tokenErr || !tokenData) {
        setError('Enlace inválido o revocado');
        setLoading(false);
        return;
      }

      if (new Date(tokenData.expires_at) < new Date()) {
        setData({ case: null, proposals: [], workflowStatus: null, expired: true, clientName: tokenData.client_name });
        setLoading(false);
        return;
      }

      // Update last_accessed_at
      await supabase.from('energy_client_portal_tokens')
        .update({ last_accessed_at: new Date().toISOString() } as any)
        .eq('id', tokenData.id);

      // Fetch case data
      const { data: caseData } = await supabase
        .from('energy_cases')
        .select('title, status, cups, address, current_supplier, estimated_annual_savings, contract_end_date')
        .eq('id', tokenData.case_id)
        .single();

      // Fetch proposals
      const { data: proposals } = await supabase
        .from('energy_proposals')
        .select('*')
        .eq('case_id', tokenData.case_id)
        .in('status', ['issued', 'sent', 'accepted'])
        .order('version', { ascending: false });

      // Latest workflow status
      const { data: wfStates } = await supabase
        .from('energy_workflow_states')
        .select('status')
        .eq('case_id', tokenData.case_id)
        .order('changed_at', { ascending: false })
        .limit(1);

      setData({
        case: caseData || null,
        proposals: proposals || [],
        workflowStatus: wfStates?.[0]?.status || null,
        expired: false,
        clientName: tokenData.client_name,
      });
    } catch (err) {
      setError('Error al cargar datos del portal');
      console.error('[ClientPortalView] error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPortalData(); }, [loadPortalData]);

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: es }); } catch { return '—'; }
  };
  const fmtCurrency = (v: number | null) => v != null ? `${v.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando portal del cliente...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md border-destructive/50">
          <CardContent className="py-8 text-center">
            <Shield className="h-12 w-12 mx-auto mb-3 text-destructive" />
            <h2 className="text-lg font-semibold mb-1">Acceso no disponible</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data?.expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <Clock className="h-12 w-12 mx-auto mb-3 text-amber-500" />
            <h2 className="text-lg font-semibold mb-1">Enlace caducado</h2>
            <p className="text-sm text-muted-foreground">
              {data.clientName ? `Hola ${data.clientName}, e` : 'E'}ste enlace ha expirado. Contacta con tu consultor para obtener un nuevo acceso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.case) return null;

  const WORKFLOW_LABELS: Record<string, string> = {
    pendiente_propuesta: 'Pendiente de propuesta',
    propuesta_enviada: 'Propuesta enviada',
    propuesta_aceptada: 'Propuesta aceptada',
    documentacion_completa: 'Documentación completa',
    enviada_comercializadora: 'Enviada a comercializadora',
    en_validacion: 'En validación',
    subsanacion_requerida: 'Subsanación requerida',
    cambio_confirmado: 'Cambio confirmado',
    primera_factura_recibida: 'Primera factura recibida',
    cerrado: 'Cerrado',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Portal del cliente</h1>
            {data.clientName && <p className="text-muted-foreground">Hola, {data.clientName}</p>}
          </div>
        </div>

        {/* Case summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{data.case.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground text-xs">CUPS</span><p className="font-mono">{data.case.cups || '—'}</p></div>
              <div><span className="text-muted-foreground text-xs">Dirección</span><p>{data.case.address || '—'}</p></div>
              <div><span className="text-muted-foreground text-xs">Comercializadora</span><p>{data.case.current_supplier || '—'}</p></div>
              <div><span className="text-muted-foreground text-xs">Fin contrato</span><p>{fmtDate(data.case.contract_end_date)}</p></div>
              <div>
                <span className="text-muted-foreground text-xs">Estado del trámite</span>
                <p><Badge variant="secondary">{data.workflowStatus ? WORKFLOW_LABELS[data.workflowStatus] || data.workflowStatus : 'Pendiente'}</Badge></p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Ahorro estimado anual</span>
                <p className="text-lg font-bold text-emerald-600">{fmtCurrency(data.case.estimated_annual_savings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proposals */}
        {data.proposals.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Propuestas
            </h2>
            {data.proposals.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Propuesta v{p.version}</span>
                    <Badge variant={p.status === 'accepted' ? 'default' : 'secondary'}>
                      {p.status === 'accepted' ? 'Aceptada' : p.status === 'issued' ? 'Emitida' : 'Enviada'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-xs text-muted-foreground">Tarifa recomendada</span><p className="font-medium">{p.recommended_tariff || '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">Comercializadora</span><p className="font-medium">{p.recommended_supplier || '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">Coste estimado</span><p>{fmtCurrency(p.estimated_annual_cost)}</p></div>
                    <div>
                      <span className="text-xs text-muted-foreground">Ahorro estimado</span>
                      <p className="font-semibold text-emerald-600">{fmtCurrency(p.estimated_annual_savings)}</p>
                    </div>
                  </div>
                  {p.conditions && <div><span className="text-xs text-muted-foreground">Condiciones:</span><p className="text-sm">{p.conditions}</p></div>}
                  {p.status === 'accepted' && (
                    <div className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm text-emerald-700">Aceptada el {fmtDate(p.accepted_at)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            Acceso seguro · Los datos mostrados son de solo lectura
          </p>
        </div>
      </div>
    </div>
  );
}

export default ClientPortalView;
