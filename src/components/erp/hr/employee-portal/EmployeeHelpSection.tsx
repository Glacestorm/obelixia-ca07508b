/**
 * EmployeeHelpSection — Ayuda RRHH + Centro de acciones pendientes
 * V2-ES.9.8: Capa final de soporte y seguimiento del Portal del Empleado
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  HelpCircle, AlertTriangle, Upload, FileText, User,
  Euro, Send, CheckCircle2, Clock, ArrowRight,
  MessageSquare, Search, Loader2, FolderOpen,
  ChevronRight, Bell, Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile, DashboardSummary } from '@/hooks/erp/hr/useEmployeePortal';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { type PortalSection } from './EmployeePortalNav';

interface Props {
  employee: EmployeeProfile;
  dashboard: DashboardSummary | null;
  onNavigate: (section: PortalSection) => void;
}

// ─── Pending Actions Engine ─────────────────────────────────────────────

interface PendingAction {
  id: string;
  type: 'upload_document' | 'review_payslip' | 'complete_profile' | 'attend_request';
  title: string;
  description: string;
  icon: React.ElementType;
  priority: 'high' | 'medium' | 'low';
  targetSection: PortalSection;
  color: string;
}

function computePendingActions(
  employee: EmployeeProfile,
  dashboard: DashboardSummary | null,
  pendingDocs: number,
  profileComplete: boolean
): PendingAction[] {
  const actions: PendingAction[] = [];

  // Documents with alerts
  if (dashboard && dashboard.documentsWithAlerts > 0) {
    actions.push({
      id: 'doc-alerts',
      type: 'upload_document',
      title: 'Documentos pendientes',
      description: `Tienes ${dashboard.documentsWithAlerts} documento(s) que requieren tu atención`,
      icon: Upload,
      priority: 'high',
      targetSection: 'documents',
      color: 'text-amber-600',
    });
  }

  // Pending documents to upload
  if (pendingDocs > 0) {
    actions.push({
      id: 'pending-upload',
      type: 'upload_document',
      title: 'Subir documentos requeridos',
      description: `${pendingDocs} documento(s) pendiente(s) de aportar`,
      icon: FolderOpen,
      priority: 'medium',
      targetSection: 'documents',
      color: 'text-blue-600',
    });
  }

  // Requests needing info
  if (dashboard) {
    const needsInfo = dashboard.activeRequests.filter(r => r.status === 'pending_info').length;
    if (needsInfo > 0) {
      actions.push({
        id: 'request-info',
        type: 'attend_request',
        title: 'Solicitudes que requieren información',
        description: `${needsInfo} solicitud(es) esperan datos adicionales por tu parte`,
        icon: MessageSquare,
        priority: 'high',
        targetSection: 'requests',
        color: 'text-orange-600',
      });
    }
  }

  // Profile completeness
  if (!profileComplete) {
    actions.push({
      id: 'complete-profile',
      type: 'complete_profile',
      title: 'Completar perfil',
      description: 'Algunos datos personales están pendientes de completar',
      icon: User,
      priority: 'low',
      targetSection: 'profile',
      color: 'text-primary',
    });
  }

  // Sort by priority
  const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  actions.sort((a, b) => pOrder[a.priority] - pOrder[b.priority]);

  return actions;
}

// ─── FAQ Data ───────────────────────────────────────────────────────────

const FAQ_CATEGORIES = [
  {
    id: 'nominas',
    label: 'Nóminas',
    icon: Euro,
    questions: [
      { q: '¿Cuándo se publican las nóminas?', a: 'Las nóminas se generan mensualmente y están disponibles una vez aprobadas por RRHH. Normalmente antes de la fecha de pago indicada en tu contrato.' },
      { q: '¿Por qué mi nómina tiene un importe diferente al mes anterior?', a: 'Las variaciones pueden deberse a cambios en retenciones IRPF, horas extra, complementos variables, ausencias o actualización de bases de cotización. Puedes ver la comparativa en el detalle de cada nómina.' },
      { q: '¿Cómo descargo mi nómina en PDF?', a: 'Accede a "Mis nóminas", selecciona el periodo deseado y pulsa el icono de descarga si el documento está disponible.' },
      { q: '¿Puedo solicitar un anticipo?', a: 'Crea una solicitud de tipo "Consulta de nómina" desde "Mis solicitudes" indicando los detalles.' },
    ],
  },
  {
    id: 'documentos',
    label: 'Documentos',
    icon: FolderOpen,
    questions: [
      { q: '¿Qué documentos debo aportar?', a: 'En la sección "Mis documentos" verás los documentos marcados como pendientes. Los documentos requeridos dependen de tu tipo de contrato y situación laboral.' },
      { q: '¿Cómo subo un documento?', a: 'Ve a "Mis documentos", localiza el documento pendiente y utiliza la opción de subir archivo. Se aceptan formatos PDF, JPG y PNG.' },
      { q: '¿Los documentos caducados se renuevan automáticamente?', a: 'No, debes aportar la versión renovada. El sistema te alertará cuando un documento esté próximo a caducar.' },
    ],
  },
  {
    id: 'solicitudes',
    label: 'Solicitudes',
    icon: Send,
    questions: [
      { q: '¿Cuánto tarda en resolverse una solicitud?', a: 'El plazo depende del tipo de solicitud. Solicitudes simples (certificados) suelen resolverse en 2-3 días hábiles. Cambios contractuales pueden requerir más tiempo.' },
      { q: '¿Puedo cancelar una solicitud?', a: 'Mientras la solicitud esté en estado "Enviada", puedes contactar con RRHH para solicitar su cancelación.' },
      { q: '¿Cómo solicito vacaciones?', a: 'Crea una nueva solicitud de tipo "Vacaciones" indicando las fechas deseadas. Tu responsable la validará y RRHH la procesará.' },
    ],
  },
  {
    id: 'tiempo',
    label: 'Fichaje y tiempo',
    icon: Clock,
    questions: [
      { q: '¿Qué hago si olvidé fichar?', a: 'Crea una solicitud de tipo "Incidencia personal" explicando la situación. RRHH corregirá el registro tras verificación.' },
      { q: '¿Las horas extra se reflejan en la nómina?', a: 'Las horas extra registradas se incluyen en el cálculo de nómina según lo establecido en tu convenio o acuerdo individual.' },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────────────

export function EmployeeHelpSection({ employee, dashboard, onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<'actions' | 'faq' | 'contact'>('actions');
  const [faqSearch, setFaqSearch] = useState('');
  const [pendingDocCount, setPendingDocCount] = useState(0);
  const [profileComplete, setProfileComplete] = useState(true);
  const [loadingContext, setLoadingContext] = useState(true);
  const [queryHistory, setQueryHistory] = useState<Array<{ id: string; subject: string; status: string; created_at: string }>>([]);

  // Fetch contextual data for pending actions
  useEffect(() => {
    const fetchContext = async () => {
      setLoadingContext(true);
      try {
        const [docsRes, profileRes, queriesRes] = await Promise.all([
          // Count pending documents
          supabase
            .from('erp_hr_employee_documents')
            .select('id', { count: 'exact', head: true })
            .eq('employee_id', employee.id)
            .in('document_status', ['draft', 'pending_submission']),
          // Check profile completeness
          supabase
            .from('erp_hr_employees')
            .select('phone, email, address, bank_account')
            .eq('id', employee.id)
            .single(),
          // Recent support queries
          supabase
            .from('hr_admin_requests')
            .select('id, subject, status, created_at')
            .eq('employee_id', employee.id)
            .in('request_type', ['consulta_nomina', 'incidencia', 'certificado'])
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        setPendingDocCount(docsRes.count || 0);

        if (profileRes.data) {
          const p = profileRes.data as any;
          setProfileComplete(!!(p.phone && p.email && p.bank_account));
        }

        setQueryHistory((queriesRes.data || []) as any[]);
      } catch (err) {
        console.error('[EmployeeHelpSection] context error:', err);
      } finally {
        setLoadingContext(false);
      }
    };
    fetchContext();
  }, [employee.id]);

  const pendingActions = useMemo(
    () => computePendingActions(employee, dashboard, pendingDocCount, profileComplete),
    [employee, dashboard, pendingDocCount, profileComplete]
  );

  // FAQ search filter
  const filteredFAQ = useMemo(() => {
    if (!faqSearch.trim()) return FAQ_CATEGORIES;
    const s = faqSearch.toLowerCase();
    return FAQ_CATEGORIES.map(cat => ({
      ...cat,
      questions: cat.questions.filter(
        q => q.q.toLowerCase().includes(s) || q.a.toLowerCase().includes(s)
      ),
    })).filter(cat => cat.questions.length > 0);
  }, [faqSearch]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" /> Ayuda y acciones pendientes
        </h2>
        <p className="text-sm text-muted-foreground">
          Resuelve tus dudas y gestiona tareas pendientes
        </p>
      </div>

      {/* Quick summary banner */}
      {!loadingContext && pendingActions.length > 0 && (
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 flex items-center gap-3">
          <Bell className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">
              Tienes {pendingActions.length} acción(es) pendiente(s)
            </p>
            <p className="text-xs text-amber-700/70">
              Revisa las tareas que requieren tu atención
            </p>
          </div>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 shrink-0">
            {pendingActions.length}
          </Badge>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
        <TabsList className="h-auto">
          <TabsTrigger value="actions" className="text-xs gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Acciones pendientes
            {pendingActions.length > 0 && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 bg-amber-500/10 text-amber-700 border-amber-500/30">
                {pendingActions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="faq" className="text-xs gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" /> Preguntas frecuentes
          </TabsTrigger>
          <TabsTrigger value="contact" className="text-xs gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Contactar RRHH
          </TabsTrigger>
        </TabsList>

        {/* ─── Pending Actions ───────────────────────────────────── */}
        <TabsContent value="actions" className="mt-4">
          {loadingContext ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingActions.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500/50" />
                <p className="text-sm font-medium text-emerald-700">¡Todo al día!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No tienes acciones pendientes en este momento
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {pendingActions.map(action => {
                const Icon = action.icon;
                return (
                  <Card
                    key={action.id}
                    className="cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => onNavigate(action.targetSection)}
                  >
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                            <Icon className={`h-4 w-4 ${action.color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{action.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              action.priority === 'high'
                                ? 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                                : action.priority === 'medium'
                                  ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {action.priority === 'high' ? 'Urgente' : action.priority === 'medium' ? 'Pendiente' : 'Opcional'}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── FAQ ───────────────────────────────────────────────── */}
        <TabsContent value="faq" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en preguntas frecuentes..."
              value={faqSearch}
              onChange={e => setFaqSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {filteredFAQ.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No se encontraron resultados</p>
                <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setActiveTab('contact')}>
                  <MessageSquare className="h-4 w-4" /> Contactar RRHH
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredFAQ.map(cat => {
              const CatIcon = cat.icon;
              return (
                <Card key={cat.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CatIcon className="h-4 w-4 text-primary" /> {cat.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Accordion type="single" collapsible className="w-full">
                      {cat.questions.map((faq, i) => (
                        <AccordionItem key={i} value={`${cat.id}-${i}`} className="border-b-0">
                          <AccordionTrigger className="text-sm text-left py-2.5 hover:no-underline">
                            {faq.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-sm text-muted-foreground pb-3">
                            {faq.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ─── Contact / Support ─────────────────────────────────── */}
        <TabsContent value="contact" className="mt-4 space-y-4">
          {/* New query CTA */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Abrir nueva consulta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                ¿No encuentras la respuesta que buscas? Envía una consulta al equipo de RRHH.
              </p>
              <div className="flex flex-wrap gap-2">
                <ContextualCTA
                  icon={Euro}
                  label="Duda sobre nómina"
                  onClick={() => onNavigate('requests')}
                />
                <ContextualCTA
                  icon={FolderOpen}
                  label="Problema con documentos"
                  onClick={() => onNavigate('requests')}
                />
                <ContextualCTA
                  icon={User}
                  label="Actualizar datos"
                  onClick={() => onNavigate('requests')}
                />
                <ContextualCTA
                  icon={Clock}
                  label="Incidencia de fichaje"
                  onClick={() => onNavigate('requests')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Query history */}
          {queryHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Mis consultas recientes
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => onNavigate('requests')}>
                    Ver todas <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {queryHistory.map(q => {
                    const statusStyle: Record<string, { label: string; color: string }> = {
                      submitted: { label: 'Enviada', color: 'text-blue-600' },
                      in_progress: { label: 'En curso', color: 'text-amber-600' },
                      completed: { label: 'Resuelta', color: 'text-emerald-600' },
                      rejected: { label: 'Rechazada', color: 'text-rose-600' },
                    };
                    const st = statusStyle[q.status] || { label: q.status, color: 'text-muted-foreground' };

                    return (
                      <div
                        key={q.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => onNavigate('requests')}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{q.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(q.created_at), { locale: es, addSuffix: true })}
                          </p>
                        </div>
                        <span className={`text-xs font-medium shrink-0 ${st.color}`}>{st.label}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact info */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Departamento de Recursos Humanos</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Para consultas urgentes, utiliza el botón de "Nueva solicitud" con prioridad alta.
                    Las solicitudes se atienden por orden de recepción y prioridad durante el horario laboral.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function ContextualCTA({ icon: Icon, label, onClick }: {
  icon: React.ElementType; label: string; onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 text-xs"
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </Button>
  );
}
