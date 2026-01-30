/**
 * Tax Compliance Matrix - Matriz de cumplimiento por jurisdicción
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Globe,
} from 'lucide-react';
import { useERPTaxJurisdictions } from '@/hooks/erp/useERPTaxJurisdictions';

export function TaxComplianceMatrix() {
  const { companyJurisdictions, calendarEvents } = useERPTaxJurisdictions();

  // Calculate compliance per jurisdiction
  const getJurisdictionCompliance = (jurisdictionId: string) => {
    const events = calendarEvents.filter(e => e.jurisdiction_id === jurisdictionId);
    if (events.length === 0) return { total: 0, completed: 0, pending: 0, overdue: 0, percentage: 100 };

    const completed = events.filter(e => e.status === 'completed').length;
    const pending = events.filter(e => e.status === 'pending' && new Date(e.due_date) >= new Date()).length;
    const overdue = events.filter(e => e.status === 'pending' && new Date(e.due_date) < new Date()).length;

    return {
      total: events.length,
      completed,
      pending,
      overdue,
      percentage: events.length > 0 ? Math.round((completed / events.length) * 100) : 100,
    };
  };

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getComplianceProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Global compliance
  const globalCompliance = (() => {
    if (calendarEvents.length === 0) return 100;
    const completed = calendarEvents.filter(e => e.status === 'completed').length;
    return Math.round((completed / calendarEvents.length) * 100);
  })();

  // Requirements matrix data
  const requirementsMatrix = companyJurisdictions.map(cj => {
    const requirements = (cj.jurisdiction?.reporting_requirements as string[]) || [];
    const compliance = getJurisdictionCompliance(cj.jurisdiction_id);
    
    return {
      jurisdiction: cj.jurisdiction,
      registration: cj,
      requirements,
      compliance,
    };
  });

  return (
    <div className="space-y-6">
      {/* Global Compliance Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Cumplimiento Global</h3>
              <p className="text-sm text-muted-foreground">
                Estado de todas las obligaciones fiscales
              </p>
            </div>
            <div className="text-right">
              <p className={`text-4xl font-bold ${getComplianceColor(globalCompliance)}`}>
                {globalCompliance}%
              </p>
              <p className="text-sm text-muted-foreground">
                {calendarEvents.filter(e => e.status === 'completed').length} de {calendarEvents.length} completadas
              </p>
            </div>
          </div>
          <Progress 
            value={globalCompliance} 
            className="h-2 mt-4"
          />
        </CardContent>
      </Card>

      {/* Compliance by Jurisdiction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Matriz de Cumplimiento por Jurisdicción
          </CardTitle>
          <CardDescription>
            Estado de obligaciones fiscales por cada registro
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requirementsMatrix.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay jurisdicciones registradas</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {requirementsMatrix.map(({ jurisdiction, registration, requirements, compliance }) => (
                  <div 
                    key={registration.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold">{jurisdiction?.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {jurisdiction?.code}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {registration.tax_registration_number || 'Sin número'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getComplianceColor(compliance.percentage)}`}>
                          {compliance.percentage}%
                        </p>
                        <Progress 
                          value={compliance.percentage} 
                          className="h-1.5 w-24 mt-1"
                        />
                      </div>
                    </div>

                    {/* Status Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-2 rounded bg-green-500/10 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="font-medium text-green-600">{compliance.completed}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Completadas</p>
                      </div>
                      <div className="p-2 rounded bg-yellow-500/10 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium text-yellow-600">{compliance.pending}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Pendientes</p>
                      </div>
                      <div className="p-2 rounded bg-red-500/10 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-red-600">{compliance.overdue}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Vencidas</p>
                      </div>
                    </div>

                    {/* Requirements List */}
                    {requirements.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Obligaciones requeridas:</p>
                        <div className="flex flex-wrap gap-2">
                          {requirements.map((req, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-muted/50 text-xs"
                            >
                              <FileText className="h-3 w-3" />
                              {req}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Special Rules */}
                    {jurisdiction?.special_rules && Object.keys(jurisdiction.special_rules).length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Reglas especiales:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(jurisdiction.special_rules).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-1">
                              {value === true ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : value === false ? (
                                <XCircle className="h-3 w-3 text-red-500" />
                              ) : (
                                <span className="w-3" />
                              )}
                              <span className="text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
                              <span className="font-medium">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TaxComplianceMatrix;
