/**
 * HRTimeTrackingPanel
 * Panel de Registro Horario Avanzado
 * Cumplimiento: Art. 34.9 ET, RD-ley 8/2019
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Coffee,
  Play,
  Pause,
  Settings,
  Calendar,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Plus,
  Moon
} from 'lucide-react';
import { useHRTimeTracking, EntryType } from '@/hooks/admin/hr/useHRTimeTracking';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRTimeTrackingPanelProps {
  companyId?: string;
  employeeId?: string;
  className?: string;
}

export function HRTimeTrackingPanel({ 
  companyId, 
  employeeId,
  className 
}: HRTimeTrackingPanelProps) {
  const [activeTab, setActiveTab] = useState('clock');
  
  const {
    entries,
    policies,
    disconnectionPolicies,
    stats,
    loading,
    fetchTimeData,
    registerEntry
  } = useHRTimeTracking(companyId, employeeId);

  const entryTypeConfig: Record<EntryType, { icon: React.ElementType; label: string; color: string }> = {
    clock_in: { icon: LogIn, label: 'Entrada', color: 'text-green-500' },
    clock_out: { icon: LogOut, label: 'Salida', color: 'text-red-500' },
    break_start: { icon: Coffee, label: 'Inicio Pausa', color: 'text-amber-500' },
    break_end: { icon: Play, label: 'Fin Pausa', color: 'text-blue-500' }
  };

  const sourceLabels: Record<string, string> = {
    web: 'Web',
    mobile: 'Móvil',
    biometric: 'Biométrico',
    manual: 'Manual',
    geolocation: 'Geolocalización'
  };

  const handleClockAction = async (type: EntryType) => {
    await registerEntry(type, 'web');
  };

  if (!companyId) {
    return (
      <Card className={cn("border-dashed opacity-50", className)}>
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Selecciona una empresa para gestionar el registro horario
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.todayEntries}</p>
                <p className="text-xs text-muted-foreground">Fichajes Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.weeklyHours}h</p>
                <p className="text-xs text-muted-foreground">Horas Semana</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.monthlyOvertime}h</p>
                <p className="text-xs text-muted-foreground">Horas Extra Mes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Pause className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingCorrections}</p>
                <p className="text-xs text-muted-foreground">Correcciones</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.complianceRate}%</p>
                <p className="text-xs text-muted-foreground">Cumplimiento</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Clock Actions */}
      {employeeId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fichar Ahora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => handleClockAction('clock_in')}
                className="gap-2"
                variant="default"
              >
                <LogIn className="h-4 w-4" />
                Entrada
              </Button>
              <Button 
                onClick={() => handleClockAction('clock_out')}
                className="gap-2"
                variant="destructive"
              >
                <LogOut className="h-4 w-4" />
                Salida
              </Button>
              <Button 
                onClick={() => handleClockAction('break_start')}
                className="gap-2"
                variant="outline"
              >
                <Coffee className="h-4 w-4" />
                Iniciar Pausa
              </Button>
              <Button 
                onClick={() => handleClockAction('break_end')}
                className="gap-2"
                variant="outline"
              >
                <Play className="h-4 w-4" />
                Fin Pausa
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Registro Horario (Art. 34.9 ET)
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchTimeData()}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="clock" className="gap-2">
                <Clock className="h-4 w-4" />
                Historial
              </TabsTrigger>
              <TabsTrigger value="policies" className="gap-2">
                <Settings className="h-4 w-4" />
                Políticas Horarias
              </TabsTrigger>
              <TabsTrigger value="disconnection" className="gap-2">
                <Moon className="h-4 w-4" />
                Desconexión Digital
              </TabsTrigger>
              <TabsTrigger value="compliance" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Cumplimiento
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clock">
              <ScrollArea className="h-[400px]">
                {entries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay registros horarios</p>
                    <p className="text-sm mt-2">
                      Los fichajes aparecerán aquí
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {entries.map((entry) => {
                      const config = entryTypeConfig[entry.entry_type as EntryType];
                      const Icon = config?.icon || Clock;
                      
                      return (
                        <div 
                          key={entry.id} 
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={cn("h-5 w-5", config?.color)} />
                            <div>
                              <p className="font-medium">
                                {config?.label || entry.entry_type}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(entry.entry_date), 'dd/MM/yyyy')} - {entry.entry_time}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {sourceLabels[entry.source] || entry.source}
                            </Badge>
                            {entry.is_manual_correction && (
                              <Badge variant="secondary" className="text-xs">
                                Corregido
                              </Badge>
                            )}
                            {entry.worked_hours !== null && (
                              <Badge variant="default" className="text-xs">
                                {entry.worked_hours.toFixed(1)}h
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="policies">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Políticas de Tiempo</h4>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Política
                  </Button>
                </div>
                
                <ScrollArea className="h-[350px]">
                  {policies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay políticas configuradas</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {policies.map((policy) => (
                        <Card key={policy.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{policy.policy_name}</h4>
                                {policy.is_active && (
                                  <Badge variant="default">Activa</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-0.5">
                                <p>Jornada: {policy.daily_hours || 8}h/día</p>
                                <p>Semana: {policy.weekly_hours || 40}h/semana</p>
                                <p>Pausa: {policy.break_duration_minutes || 30} min</p>
                                {policy.is_flexible && (
                                  <p>Horario flexible: {policy.core_hours_start} - {policy.core_hours_end}</p>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">Editar</Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="disconnection">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Derecho a la Desconexión Digital</h4>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Política
                  </Button>
                </div>
                
                <ScrollArea className="h-[350px]">
                  {disconnectionPolicies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Moon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay políticas de desconexión</p>
                      <p className="text-sm mt-2">
                        Art. 88 LOPDGDD - Derecho a la desconexión digital
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {disconnectionPolicies.map((policy) => (
                        <Card key={policy.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{policy.policy_name}</h4>
                              <Badge variant={policy.is_active ? 'default' : 'outline'}>
                                  {policy.is_active ? 'Activa' : 'Inactiva'}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <p>Desconexión: {policy.disconnection_start} - {policy.disconnection_end}</p>
                                <p>
                                  Aplica: {policy.applies_weekends ? 'Fines de semana' : ''} 
                                  {policy.applies_weekends && policy.applies_holidays ? ' y ' : ''}
                                  {policy.applies_holidays ? 'Festivos' : ''}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">Editar</Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="compliance">
              <div className="space-y-4">
                <h4 className="font-medium">Cumplimiento Legal - Registro Horario</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className={cn(
                        "h-5 w-5",
                        entries.length > 0 ? "text-green-500" : "text-muted-foreground"
                      )} />
                      <div>
                        <p className="font-medium">Registro de Jornada</p>
                        <p className="text-sm text-muted-foreground">Art. 34.9 ET - Obligatorio todas las empresas</p>
                      </div>
                    </div>
                    <Badge variant={entries.length > 0 ? 'default' : 'destructive'}>
                      {entries.length > 0 ? 'Activo' : 'Sin registros'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className={cn(
                        "h-5 w-5",
                        policies.length > 0 ? "text-green-500" : "text-muted-foreground"
                      )} />
                      <div>
                        <p className="font-medium">Política de Tiempo</p>
                        <p className="text-sm text-muted-foreground">Configuración de jornada y descansos</p>
                      </div>
                    </div>
                    <Badge variant={policies.length > 0 ? 'default' : 'secondary'}>
                      {policies.length > 0 ? 'Configurado' : 'Pendiente'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Moon className={cn(
                        "h-5 w-5",
                        disconnectionPolicies.length > 0 ? "text-green-500" : "text-muted-foreground"
                      )} />
                      <div>
                        <p className="font-medium">Desconexión Digital</p>
                        <p className="text-sm text-muted-foreground">Art. 88 LOPDGDD</p>
                      </div>
                    </div>
                    <Badge variant={disconnectionPolicies.length > 0 ? 'default' : 'secondary'}>
                      {disconnectionPolicies.length > 0 ? 'Configurado' : 'Recomendado'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="font-medium">Conservación 4 años</p>
                        <p className="text-sm text-muted-foreground">RD-ley 8/2019 - Conservar registros</p>
                      </div>
                    </div>
                    <Badge variant="default">Automático</Badge>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRTimeTrackingPanel;
