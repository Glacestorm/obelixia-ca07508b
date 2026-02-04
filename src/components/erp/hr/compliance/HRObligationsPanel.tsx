/**
 * HRObligationsPanel
 * Panel de Obligaciones con Administraciones Públicas
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
  Search, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Euro,
  FileText,
  Plus
} from 'lucide-react';
import { useHRLegalCompliance, ObligationDeadline } from '@/hooks/admin/useHRLegalCompliance';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface HRObligationsPanelProps {
  companyId: string;
}

const ORGANISMS = [
  { value: 'TGSS', label: 'Tesorería General SS', color: 'bg-blue-500' },
  { value: 'AEAT', label: 'Agencia Tributaria', color: 'bg-green-500' },
  { value: 'SEPE', label: 'Servicio de Empleo', color: 'bg-purple-500' },
  { value: 'ITSS', label: 'Inspección de Trabajo', color: 'bg-red-500' },
  { value: 'CASS', label: 'CASS Andorra', color: 'bg-orange-500' },
  { value: 'Govern', label: 'Govern Andorra', color: 'bg-yellow-500' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'En Proceso', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completada', color: 'bg-green-100 text-green-800' },
  overdue: { label: 'Vencida', color: 'bg-red-100 text-red-800' },
};

export function HRObligationsPanel({ companyId }: HRObligationsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>('all');
  const [organismFilter, setOrganismFilter] = useState<string>('all');

  const {
    obligations,
    deadlines,
    upcomingDeadlines,
    isLoading,
    updateDeadline,
    createDeadline
  } = useHRLegalCompliance(companyId);

  const filteredObligations = obligations.filter(obl => {
    const matchesSearch = obl.obligation_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         obl.organism.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJurisdiction = jurisdictionFilter === 'all' || obl.jurisdiction === jurisdictionFilter;
    const matchesOrganism = organismFilter === 'all' || obl.organism === organismFilter;
    return matchesSearch && matchesJurisdiction && matchesOrganism;
  });

  const handleMarkComplete = async (deadline: ObligationDeadline) => {
    await updateDeadline(deadline.id, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  };

  const getOrganismConfig = (organism: string) => {
    return ORGANISMS.find(o => o.value === organism) || { value: organism, label: organism, color: 'bg-gray-500' };
  };

  const getDaysRemaining = (dateStr: string) => {
    return differenceInDays(new Date(dateStr), new Date());
  };

  return (
    <div className="space-y-4">
      {/* Header Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar obligaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Jurisdicción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="ES">España</SelectItem>
            <SelectItem value="AD">Andorra</SelectItem>
          </SelectContent>
        </Select>
        <Select value={organismFilter} onValueChange={setOrganismFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Organismo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ORGANISMS.map(org => (
              <SelectItem key={org.value} value={org.value}>{org.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="deadlines">
        <TabsList>
          <TabsTrigger value="deadlines" className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Vencimientos
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Catálogo
          </TabsTrigger>
        </TabsList>

        {/* Deadlines Tab */}
        <TabsContent value="deadlines" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  Próximos Vencimientos
                </CardTitle>
                <CardDescription>Obligaciones con fecha límite próxima</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {upcomingDeadlines.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                      <p className="text-muted-foreground">Sin vencimientos próximos</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingDeadlines.map(deadline => {
                        const orgConfig = getOrganismConfig(deadline.organism);
                        const daysLeft = deadline.days_remaining;
                        
                        return (
                          <div 
                            key={deadline.deadline_id} 
                            className={cn(
                              "p-4 border rounded-lg transition-colors",
                              daysLeft <= 3 ? "border-red-300 bg-red-50 dark:bg-red-950/20" :
                              daysLeft <= 7 ? "border-orange-300 bg-orange-50 dark:bg-orange-950/20" :
                              "hover:bg-muted/50"
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={cn("w-2 h-2 rounded-full", orgConfig.color)} />
                                  <Badge variant="outline">{deadline.organism}</Badge>
                                  {deadline.sanction_type && (
                                    <Badge variant="secondary" className="text-xs">
                                      {deadline.sanction_type}
                                    </Badge>
                                  )}
                                </div>
                                <p className="font-medium">{deadline.obligation_name}</p>
                                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(deadline.deadline_date), 'dd/MM/yyyy')}
                                  </span>
                                  {deadline.sanction_max && (
                                    <span className="flex items-center gap-1 text-red-600">
                                      <Euro className="h-3 w-3" />
                                      Hasta {deadline.sanction_max.toLocaleString()}€
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className={cn(
                                  daysLeft <= 0 ? 'bg-red-600' :
                                  daysLeft <= 3 ? 'bg-red-500' :
                                  daysLeft <= 7 ? 'bg-orange-500' :
                                  daysLeft <= 15 ? 'bg-yellow-500' :
                                  'bg-blue-500'
                                )}>
                                  {daysLeft <= 0 ? 'VENCIDO' : `${daysLeft} días`}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Company Deadlines Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  Gestión de Obligaciones
                </CardTitle>
                <CardDescription>Estado de las obligaciones de la empresa</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {deadlines.length === 0 ? (
                    <div className="text-center py-8">
                      <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No hay obligaciones registradas</p>
                      <Button variant="outline" className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Añadir Obligación
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deadlines.map(deadline => {
                        const statusConfig = STATUS_CONFIG[deadline.status] || STATUS_CONFIG.pending;
                        const daysLeft = getDaysRemaining(deadline.deadline_date);
                        
                        return (
                          <div key={deadline.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                                  {deadline.obligation?.organism && (
                                    <Badge variant="outline">{deadline.obligation.organism}</Badge>
                                  )}
                                </div>
                                <p className="font-medium">
                                  {deadline.obligation?.obligation_name || 'Obligación'}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                                  <span>
                                    {format(new Date(deadline.deadline_date), 'dd/MM/yyyy')}
                                  </span>
                                  {deadline.period_start && deadline.period_end && (
                                    <span>
                                      Período: {format(new Date(deadline.period_start), 'MM/yyyy')} - 
                                      {format(new Date(deadline.period_end), 'MM/yyyy')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {deadline.status !== 'completed' && (
                                  <>
                                    <Badge className={cn(
                                      daysLeft <= 0 ? 'bg-red-600' :
                                      daysLeft <= 7 ? 'bg-orange-500' :
                                      'bg-blue-500'
                                    )}>
                                      {daysLeft <= 0 ? 'VENCIDO' : `${daysLeft}d`}
                                    </Badge>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleMarkComplete(deadline)}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Completar
                                    </Button>
                                  </>
                                )}
                                {deadline.status === 'completed' && deadline.completed_at && (
                                  <span className="text-xs text-green-600">
                                    Completada: {format(new Date(deadline.completed_at), 'dd/MM/yyyy')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Catalog Tab */}
        <TabsContent value="catalog" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Catálogo de Obligaciones</CardTitle>
              <CardDescription>
                Lista de obligaciones por organismo y jurisdicción
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredObligations.map(obligation => {
                    const orgConfig = getOrganismConfig(obligation.organism);
                    
                    return (
                      <div key={obligation.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={cn("w-3 h-3 rounded-full", orgConfig.color)} />
                              <Badge variant="outline">{obligation.organism}</Badge>
                              {obligation.model_code && (
                                <Badge variant="secondary">Modelo {obligation.model_code}</Badge>
                              )}
                              <Badge variant="outline">{obligation.jurisdiction}</Badge>
                            </div>
                            <p className="font-medium">{obligation.obligation_name}</p>
                            <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">Tipo:</span>
                                <span className="ml-1 capitalize">{obligation.obligation_type}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Periodicidad:</span>
                                <span className="ml-1 capitalize">{obligation.periodicity}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Plazo:</span>
                                <span className="ml-1">{obligation.deadline_description}</span>
                              </div>
                            </div>
                            {obligation.legal_reference && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Ref. Legal: {obligation.legal_reference}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {obligation.sanction_type && (
                              <Badge className={cn(
                                obligation.sanction_type === 'muy_grave' ? 'bg-red-500' :
                                obligation.sanction_type === 'grave' ? 'bg-orange-500' :
                                'bg-yellow-500'
                              )}>
                                {obligation.sanction_type.replace('_', ' ')}
                              </Badge>
                            )}
                            {obligation.sanction_max && (
                              <p className="text-sm text-red-600 mt-1">
                                Hasta €{obligation.sanction_max.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRObligationsPanel;
