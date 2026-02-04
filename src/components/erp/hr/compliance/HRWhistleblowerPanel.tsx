/**
 * HRWhistleblowerPanel - Canal de Denuncias EU 2019/1937
 * Portal completo para gestión de denuncias con protección del denunciante
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Eye,
  EyeOff,
  Send,
  FileText,
  Brain,
  RefreshCw,
  Calendar,
  User,
  Lock,
  Search
} from 'lucide-react';
import { useHRWhistleblower, WhistleblowerCategory, ReportSubmission } from '@/hooks/admin/hr/useHRWhistleblower';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRWhistleblowerPanelProps {
  companyId: string | null;
}

export function HRWhistleblowerPanel({ companyId }: HRWhistleblowerPanelProps) {
  const [activeTab, setActiveTab] = useState('reports');
  const [showNewReportDialog, setShowNewReportDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newReport, setNewReport] = useState<Partial<ReportSubmission>>({
    is_anonymous: true,
    category: 'other',
  });

  const {
    reports,
    stats,
    isLoading,
    fetchReports,
    submitReport,
    acknowledgeReport,
    analyzeReport,
    getStatusColor,
    getPriorityColor,
    getCategoryLabel,
    isDeadlineExpired,
  } = useHRWhistleblower(companyId);

  const handleSubmitReport = async () => {
    if (!newReport.title || !newReport.description || !newReport.category) return;

    const reportCode = await submitReport(newReport as ReportSubmission);
    if (reportCode) {
      setShowNewReportDialog(false);
      setNewReport({ is_anonymous: true, category: 'other' });
    }
  };

  const filteredReports = reports.filter(report =>
    report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.report_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories: { value: WhistleblowerCategory; label: string }[] = [
    { value: 'fraud', label: 'Fraude' },
    { value: 'corruption', label: 'Corrupción' },
    { value: 'harassment', label: 'Acoso' },
    { value: 'discrimination', label: 'Discriminación' },
    { value: 'safety_violation', label: 'Seguridad Laboral' },
    { value: 'environmental', label: 'Medio Ambiente' },
    { value: 'data_breach', label: 'Protección de Datos' },
    { value: 'financial_irregularity', label: 'Irregularidad Financiera' },
    { value: 'other', label: 'Otros' },
  ];

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Denuncias</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Urgentes</p>
                <p className="text-2xl font-bold">{stats.urgent}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cumplimiento EU</p>
                <p className="text-2xl font-bold">100%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Canal de Denuncias
              </CardTitle>
              <CardDescription>
                Directiva EU 2019/1937 - Protección del Denunciante
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchReports()} disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
                Actualizar
              </Button>
              <Dialog open={showNewReportDialog} onOpenChange={setShowNewReportDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Send className="h-4 w-4 mr-1" />
                    Nueva Denuncia
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      Enviar Denuncia Confidencial
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {newReport.is_anonymous ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="text-sm">Denuncia Anónima</span>
                      </div>
                      <Switch
                        checked={newReport.is_anonymous}
                        onCheckedChange={(checked) => setNewReport(prev => ({ ...prev, is_anonymous: checked }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Categoría *</Label>
                      <Select
                        value={newReport.category}
                        onValueChange={(value) => setNewReport(prev => ({ ...prev, category: value as WhistleblowerCategory }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Título *</Label>
                      <Input
                        value={newReport.title || ''}
                        onChange={(e) => setNewReport(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Breve descripción del hecho"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Descripción Detallada *</Label>
                      <Textarea
                        value={newReport.description || ''}
                        onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describa los hechos con el mayor detalle posible: fechas, personas involucradas, evidencias..."
                        rows={5}
                      />
                    </div>

                    {!newReport.is_anonymous && (
                      <div className="space-y-2">
                        <Label>Método de Contacto</Label>
                        <Input
                          value={newReport.contact_details || ''}
                          onChange={(e) => setNewReport(prev => ({ ...prev, contact_details: e.target.value }))}
                          placeholder="Email o teléfono (opcional)"
                        />
                      </div>
                    )}

                    <div className="p-3 bg-blue-500/10 rounded-lg text-sm">
                      <p className="font-medium text-blue-700 dark:text-blue-300">🔒 Protección Garantizada</p>
                      <p className="text-muted-foreground mt-1">
                        Su identidad está protegida por la Directiva EU 2019/1937. 
                        Recibirá acuse de recibo en 7 días y resolución en 3 meses.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewReportDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmitReport} disabled={isLoading || !newReport.title || !newReport.description}>
                      <Send className="h-4 w-4 mr-1" />
                      Enviar Denuncia
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="reports">Denuncias</TabsTrigger>
                <TabsTrigger value="deadlines">Plazos Legales</TabsTrigger>
                <TabsTrigger value="compliance">Compliance EU</TabsTrigger>
              </TabsList>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código o título..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>

            <TabsContent value="reports" className="mt-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredReports.length === 0 ? (
                    <div className="text-center py-12">
                      <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No hay denuncias registradas</p>
                    </div>
                  ) : (
                    filteredReports.map((report) => (
                      <div 
                        key={report.id} 
                        className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                {report.report_code}
                              </code>
                              <Badge variant="outline" className={cn("text-xs", getPriorityColor(report.priority_level))}>
                                {report.priority_level}
                              </Badge>
                              {report.is_anonymous && (
                                <Badge variant="secondary" className="text-xs">
                                  <EyeOff className="h-3 w-3 mr-1" />
                                  Anónima
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-medium truncate">{report.title}</h4>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {getCategoryLabel(report.category)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(report.created_at), 'dd/MM/yyyy', { locale: es })}
                              </span>
                              {report.acknowledgment_deadline && !report.acknowledged_at && (
                                <span className={cn(
                                  "flex items-center gap-1",
                                  isDeadlineExpired(report.acknowledgment_deadline) ? "text-red-500" : "text-yellow-500"
                                )}>
                                  <Clock className="h-3 w-3" />
                                  Acuse: {differenceInDays(new Date(report.acknowledgment_deadline), new Date())}d
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-xs", getStatusColor(report.status))}>
                              {report.status}
                            </Badge>
                            <div className="flex gap-1">
                              {report.status === 'received' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => acknowledgeReport(report.id)}
                                  disabled={isLoading}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Acusar
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => analyzeReport(report.id)}
                                disabled={isLoading}
                              >
                                <Brain className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="deadlines" className="mt-0">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-yellow-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        Plazo de Acuse de Recibo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">7 días</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Art. 9.1 Directiva EU 2019/1937
                      </p>
                      <Progress value={100} className="mt-3 h-2" />
                    </CardContent>
                  </Card>

                  <Card className="border-blue-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        Plazo de Resolución
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">3 meses</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Art. 9.1(f) Directiva EU 2019/1937
                      </p>
                      <Progress value={100} className="mt-3 h-2" />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Denuncias con Plazos Próximos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {reports
                        .filter(r => r.acknowledgment_deadline && !r.acknowledged_at)
                        .slice(0, 5)
                        .map(report => (
                          <div key={report.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                              <code className="text-xs">{report.report_code}</code>
                              <span className="text-sm truncate max-w-[200px]">{report.title}</span>
                            </div>
                            <Badge variant={isDeadlineExpired(report.acknowledgment_deadline) ? 'destructive' : 'secondary'}>
                              {differenceInDays(new Date(report.acknowledgment_deadline!), new Date())} días
                            </Badge>
                          </div>
                        ))}
                      {reports.filter(r => r.acknowledgment_deadline && !r.acknowledged_at).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No hay plazos pendientes
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="compliance" className="mt-0">
              <div className="space-y-4">
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      Cumplimiento Directiva EU 2019/1937
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { label: 'Canal de recepción de denuncias', done: true },
                        { label: 'Anonimato del denunciante garantizado', done: true },
                        { label: 'Cifrado de datos sensibles', done: true },
                        { label: 'Plazos de respuesta configurados', done: true },
                        { label: 'Registro de investigaciones', done: true },
                        { label: 'Protección anti-represalias', done: true },
                        { label: 'Notificaciones automáticas', done: true },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Marco Legal Aplicable</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p><strong>• Directiva (UE) 2019/1937</strong> - Protección del denunciante</p>
                    <p><strong>• Ley 2/2023</strong> - Transposición en España</p>
                    <p><strong>• Obligatorio:</strong> Empresas +50 empleados</p>
                    <p><strong>• Sanciones:</strong> Hasta 1.000.000€ por incumplimiento</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRWhistleblowerPanel;
