/**
 * HRCalendarsPanel - Gestión de calendarios laborales
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { useHREnterprise } from '@/hooks/admin/hr/useHREnterprise';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Props { companyId: string; }

export function HRCalendarsPanel({ companyId }: Props) {
  const { calendars, fetchCalendars, loading } = useHREnterprise();
  const [expandedCalendars, setExpandedCalendars] = useState<Set<string>>(new Set());

  useEffect(() => { fetchCalendars(companyId); }, [companyId]);

  const toggleCalendar = (id: string) => {
    setExpandedCalendars(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Calendar className="h-5 w-5" /> Calendarios Laborales</h3>
          <p className="text-sm text-muted-foreground">Festivos, jornadas y días especiales por jurisdicción/centro</p>
        </div>
      </div>

      {calendars.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Sin calendarios. Genera datos demo para crear calendarios con festivos.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {calendars.map((cal) => {
            const isExpanded = expandedCalendars.has(cal.id);
            const entries = cal.erp_hr_calendar_entries || [];
            const nationalCount = entries.filter(e => e.is_national).length;
            const localCount = entries.filter(e => e.is_local).length;

            return (
              <Card key={cal.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleCalendar(cal.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          {cal.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{cal.year}</Badge>
                          <Badge variant="secondary">{cal.jurisdiction}</Badge>
                          <Badge variant="outline">{cal.weekly_hours}h/semana</Badge>
                          <Badge>{entries.length} festivos</Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="mb-3 flex gap-4 text-sm text-muted-foreground">
                        <span>📅 Jornada: {cal.daily_hours}h/día</span>
                        <span>🏛️ Nacionales: {nationalCount}</span>
                        <span>📍 Locales: {localCount}</span>
                        {cal.is_default && <Badge variant="default" className="text-xs">Por defecto</Badge>}
                      </div>
                      {entries.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {entries.sort((a, b) => a.entry_date.localeCompare(b.entry_date)).map((entry) => (
                            <div key={entry.id} className="flex items-center gap-2 p-2 rounded border bg-muted/30 text-sm">
                              <span className="text-muted-foreground font-mono text-xs">
                                {new Date(entry.entry_date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                              </span>
                              <span className="flex-1">{entry.name}</span>
                              {entry.is_national && <Badge variant="outline" className="text-xs">Nacional</Badge>}
                              {entry.is_local && <Badge variant="secondary" className="text-xs">Local</Badge>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin festivos configurados</p>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
