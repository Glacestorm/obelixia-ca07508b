/**
 * Global Tax Dashboard - Vista multi-jurisdiccional
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Globe,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Flag,
  TrendingUp,
  FileText,
  MapPin,
} from 'lucide-react';
import { useERPTaxJurisdictions } from '@/hooks/erp/useERPTaxJurisdictions';
import { JurisdictionSelector } from './JurisdictionSelector';
import { TaxCalendarPanel } from './TaxCalendarPanel';
import { TaxComplianceMatrix } from './TaxComplianceMatrix';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

export function GlobalTaxDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showJurisdictionSelector, setShowJurisdictionSelector] = useState(false);

  const {
    jurisdictions,
    companyJurisdictions,
    calendarEvents,
    stats,
    loading,
  } = useERPTaxJurisdictions();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Activo</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Suspendido</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/30">Cerrado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'eu_vat': 'IVA UE',
      'us_llc': 'LLC USA',
      'us_state': 'Estado USA',
      'uae_vat': 'VAT UAE',
      'uae_freezone': 'Zona Franca UAE',
      'uk_vat': 'VAT UK',
      'swiss_vat': 'MWST Suiza',
      'singapore_gst': 'GST Singapur',
      'andorra_igi': 'IGI Andorra',
      'offshore': 'Offshore',
      'other': 'Otro',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'eu_vat': 'bg-blue-500',
      'us_llc': 'bg-red-500',
      'us_state': 'bg-red-400',
      'uae_vat': 'bg-amber-500',
      'uae_freezone': 'bg-amber-600',
      'uk_vat': 'bg-indigo-500',
      'swiss_vat': 'bg-red-600',
      'singapore_gst': 'bg-pink-500',
      'andorra_igi': 'bg-yellow-500',
      'offshore': 'bg-gray-500',
      'other': 'bg-gray-400',
    };
    return colors[type] || 'bg-gray-500';
  };

  const pendingEvents = calendarEvents.filter(e => e.status === 'pending');
  const overdueEvents = calendarEvents.filter(e => 
    e.status === 'pending' && new Date(e.due_date) < new Date()
  );

  return (
    <div className="space-y-6">
      {/* Header KPIs */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jurisdicciones</p>
                <p className="text-2xl font-bold">{stats.activeRegistrations}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  de {stats.totalJurisdictions} disponibles
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Próximas Obligaciones</p>
                <p className="text-2xl font-bold">{stats.upcomingFilings}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  pendientes de presentar
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencidas</p>
                <p className="text-2xl font-bold">{stats.overdueFilings}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  requieren atención
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cumplimiento</p>
                <p className="text-2xl font-bold">
                  {pendingEvents.length > 0 
                    ? Math.round(((pendingEvents.length - overdueEvents.length) / pendingEvents.length) * 100)
                    : 100}%
                </p>
                <Progress 
                  value={pendingEvents.length > 0 
                    ? ((pendingEvents.length - overdueEvents.length) / pendingEvents.length) * 100
                    : 100} 
                  className="h-1.5 mt-2"
                />
              </div>
              <div className="p-3 rounded-full bg-purple-500/10">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Globe className="h-4 w-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-2">
              <FileText className="h-4 w-4" />
              Matriz
            </TabsTrigger>
          </TabsList>

          <Button onClick={() => setShowJurisdictionSelector(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Añadir Jurisdicción
          </Button>
        </div>

        <TabsContent value="overview" className="space-y-4">
          {/* Active Registrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Registros Fiscales Activos
              </CardTitle>
              <CardDescription>
                Jurisdicciones donde la empresa está registrada
              </CardDescription>
            </CardHeader>
            <CardContent>
              {companyJurisdictions.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No hay jurisdicciones registradas</p>
                  <Button 
                    variant="outline" 
                    className="mt-4 gap-2"
                    onClick={() => setShowJurisdictionSelector(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Añadir primera jurisdicción
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {companyJurisdictions.map((cj) => (
                    <Card key={cj.id} className="border-l-4" style={{ borderLeftColor: 'hsl(var(--primary))' }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getTypeColor(cj.jurisdiction?.jurisdiction_type || '')}`}>
                              <Flag className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium">{cj.jurisdiction?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {cj.jurisdiction?.code}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(cj.status)}
                        </div>

                        <div className="mt-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{cj.jurisdiction?.tax_id_label}:</span>
                            <span className="font-mono">{cj.tax_registration_number || '-'}</span>
                          </div>
                          {cj.jurisdiction?.standard_tax_rate !== null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tipo estándar:</span>
                              <span>{cj.jurisdiction?.standard_tax_rate}%</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Frecuencia:</span>
                            <Badge variant="outline" className="text-xs">
                              {cj.jurisdiction?.filing_frequency}
                            </Badge>
                          </div>
                          {cj.next_filing_date && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Próxima presentación:</span>
                              <span className="text-xs">
                                {format(new Date(cj.next_filing_date), 'dd MMM yyyy', { locale: es })}
                              </span>
                            </div>
                          )}
                        </div>

                        {cj.jurisdiction?.reporting_requirements && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-2">Obligaciones:</p>
                            <div className="flex flex-wrap gap-1">
                              {(cj.jurisdiction.reporting_requirements as string[]).slice(0, 3).map((req, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {req}
                                </Badge>
                              ))}
                              {(cj.jurisdiction.reporting_requirements as string[]).length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{(cj.jurisdiction.reporting_requirements as string[]).length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          {pendingEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Próximos Vencimientos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {pendingEvents.slice(0, 10).map((event) => {
                      const isOverdue = new Date(event.due_date) < new Date();
                      return (
                        <div 
                          key={event.id} 
                          className={`p-3 rounded-lg border ${isOverdue ? 'border-red-500/30 bg-red-500/5' : 'bg-muted/30'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isOverdue ? (
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                              ) : (
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div>
                                <p className="font-medium">{event.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {event.jurisdiction?.name || 'Sin jurisdicción'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-medium ${isOverdue ? 'text-red-500' : ''}`}>
                                {format(new Date(event.due_date), 'dd MMM yyyy', { locale: es })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(event.due_date), { 
                                  addSuffix: true, 
                                  locale: es 
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Jurisdiction Types Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Tipos de Jurisdicción Disponibles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} className="p-3 rounded-lg bg-muted/30 text-center">
                    <div className={`w-8 h-8 mx-auto rounded-full ${getTypeColor(type)} flex items-center justify-center mb-2`}>
                      <Globe className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-sm font-medium">{getTypeLabel(type)}</p>
                    <p className="text-xs text-muted-foreground">{count} opciones</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <TaxCalendarPanel />
        </TabsContent>

        <TabsContent value="compliance">
          <TaxComplianceMatrix />
        </TabsContent>
      </Tabs>

      {/* Jurisdiction Selector Dialog */}
      {showJurisdictionSelector && (
        <JurisdictionSelector 
          open={showJurisdictionSelector}
          onOpenChange={setShowJurisdictionSelector}
        />
      )}
    </div>
  );
}

export default GlobalTaxDashboard;
