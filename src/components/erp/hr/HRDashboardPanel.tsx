/**
 * HRDashboardPanel - Panel principal del dashboard de RRHH
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, Calendar, FileText, DollarSign, Building2,
  TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle,
  UserPlus, UserMinus, Briefcase, HeartHandshake
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface HRDashboardPanelProps {
  companyId: string;
}

export function HRDashboardPanel({ companyId }: HRDashboardPanelProps) {
  // Demo data
  const headcountData = [
    { month: 'Ene', empleados: 42, altas: 3, bajas: 1 },
    { month: 'Feb', empleados: 44, altas: 2, bajas: 0 },
    { month: 'Mar', empleados: 45, altas: 2, bajas: 1 },
    { month: 'Abr', empleados: 46, altas: 1, bajas: 0 },
    { month: 'May', empleados: 47, altas: 2, bajas: 1 },
    { month: 'Jun', empleados: 47, altas: 1, bajas: 1 },
  ];

  const departmentData = [
    { name: 'Producción', value: 18, color: '#3b82f6' },
    { name: 'Administración', value: 8, color: '#10b981' },
    { name: 'Comercial', value: 10, color: '#f59e0b' },
    { name: 'IT', value: 6, color: '#8b5cf6' },
    { name: 'RRHH', value: 3, color: '#ec4899' },
    { name: 'Dirección', value: 2, color: '#6366f1' },
  ];

  const contractTypes = [
    { type: 'Indefinido', count: 32, percentage: 68 },
    { type: 'Temporal', count: 10, percentage: 21 },
    { type: 'Prácticas', count: 3, percentage: 6 },
    { type: 'Formación', count: 2, percentage: 5 },
  ];

  const upcomingEvents = [
    { type: 'vacation', title: 'Vacaciones - María García', date: '2026-02-01', days: 5 },
    { type: 'contract', title: 'Fin contrato - Juan López', date: '2026-02-15', alert: true },
    { type: 'review', title: 'Evaluación - Dpto. IT', date: '2026-02-10' },
    { type: 'payroll', title: 'Cierre nóminas Enero', date: '2026-01-31', alert: true },
    { type: 'birthday', title: 'Cumpleaños - Ana Martín', date: '2026-02-05' },
  ];

  const kpis = [
    { label: 'Rotación anual', value: '8.5%', trend: 'down', target: '<10%', status: 'good' },
    { label: 'Absentismo', value: '3.2%', trend: 'up', target: '<3%', status: 'warning' },
    { label: 'Satisfacción', value: '7.8/10', trend: 'up', target: '>8', status: 'good' },
    { label: 'Formación h/emp', value: '24h', trend: 'up', target: '40h', status: 'neutral' },
  ];

  return (
    <div className="space-y-4">
      {/* KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index} className={`
            ${kpi.status === 'good' ? 'border-green-500/30 bg-green-500/5' : ''}
            ${kpi.status === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : ''}
            ${kpi.status === 'neutral' ? 'border-blue-500/30 bg-blue-500/5' : ''}
          `}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">Objetivo: {kpi.target}</p>
                </div>
                {kpi.trend === 'up' ? (
                  <TrendingUp className={`h-5 w-5 ${kpi.status === 'good' ? 'text-green-500' : 'text-amber-500'}`} />
                ) : (
                  <TrendingDown className={`h-5 w-5 ${kpi.status === 'good' ? 'text-green-500' : 'text-red-500'}`} />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolución plantilla */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Evolución de Plantilla
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={headcountData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="empleados" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.3} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución por departamento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Distribución por Departamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tipos de contrato */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Tipos de Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contractTypes.map((ct, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{ct.type}</span>
                  <span className="font-medium">{ct.count} ({ct.percentage}%)</span>
                </div>
                <Progress value={ct.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Próximos eventos */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
              <div className="space-y-2">
                {upcomingEvents.map((event, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      event.alert ? 'border-amber-500/30 bg-amber-500/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {event.type === 'vacation' && <Calendar className="h-4 w-4 text-blue-500" />}
                      {event.type === 'contract' && <FileText className="h-4 w-4 text-amber-500" />}
                      {event.type === 'review' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {event.type === 'payroll' && <DollarSign className="h-4 w-4 text-purple-500" />}
                      {event.type === 'birthday' && <HeartHandshake className="h-4 w-4 text-pink-500" />}
                      <div>
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.date}</p>
                      </div>
                    </div>
                    {event.alert && (
                      <Badge variant="outline" className="text-amber-600 border-amber-500">
                        Atención
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default HRDashboardPanel;
