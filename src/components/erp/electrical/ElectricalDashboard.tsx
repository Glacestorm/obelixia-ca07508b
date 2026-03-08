import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Zap, FolderOpen, TrendingDown, TrendingUp, CheckCircle2, 
  Users, FileText, FileSignature, BarChart3, GitCompareArrows,
  FileBarChart, Eye, ArrowRight
} from 'lucide-react';

interface Props { companyId: string; }

const quickAccessItems = [
  { id: 'expedientes', label: 'Expedientes', icon: FolderOpen, color: 'text-yellow-500', bg: 'bg-yellow-500/10', desc: 'Alta y gestión' },
  { id: 'clientes', label: 'Clientes Energéticos', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Particulares y empresas' },
  { id: 'facturas', label: 'Facturas', icon: FileText, color: 'text-green-500', bg: 'bg-green-500/10', desc: 'Subida y análisis' },
  { id: 'contratos', label: 'Contratos', icon: FileSignature, color: 'text-indigo-500', bg: 'bg-indigo-500/10', desc: 'Gestión contractual' },
  { id: 'consumo', label: 'Consumo', icon: BarChart3, color: 'text-orange-500', bg: 'bg-orange-500/10', desc: 'Por periodos P1-P6' },
  { id: 'comparador', label: 'Comparador', icon: GitCompareArrows, color: 'text-purple-500', bg: 'bg-purple-500/10', desc: 'Tarifas y ofertas' },
  { id: 'informes', label: 'Informes', icon: FileBarChart, color: 'text-rose-500', bg: 'bg-rose-500/10', desc: 'Generación PDF' },
  { id: 'seguimiento', label: 'Seguimiento', icon: Eye, color: 'text-cyan-500', bg: 'bg-cyan-500/10', desc: 'Post-optimización' },
];

export function ElectricalDashboard({ companyId }: Props) {
  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="rounded-xl border bg-gradient-to-br from-yellow-500/5 via-background to-amber-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 shadow-lg">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Consultoría Eléctrica</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Gestión integral de expedientes de optimización de factura eléctrica. Analiza consumo, potencia contratada
              y tarifas para recomendar la configuración óptima a particulares y empresas.
            </p>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expedientes activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <FolderOpen className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">3 nuevos esta semana</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ahorro estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingDown className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">€15.420</p>
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +12% vs mes anterior
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Informes completados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">27</p>
                <p className="text-xs text-muted-foreground">5 pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes gestionados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <Users className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">45</p>
                <p className="text-xs text-muted-foreground">8 empresas, 37 particulares</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick access grid */}
      <div>
        <h3 className="text-base font-semibold mb-3">Accesos rápidos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.id} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg ${item.bg}`}>
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
                  </div>
                  <p className="text-sm font-medium mt-3">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent expedientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expedientes recientes</CardTitle>
          <CardDescription>Últimos expedientes creados o actualizados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { ref: 'EXP-2026-001', cliente: 'Empresa ABC S.L.', cups: 3, estado: 'En análisis', ahorro: '€2.340' },
              { ref: 'EXP-2026-002', cliente: 'García Martínez, Juan', cups: 1, estado: 'Informe generado', ahorro: '€180' },
              { ref: 'EXP-2026-003', cliente: 'Industrial Norte S.A.', cups: 8, estado: 'Pendiente docs', ahorro: '-' },
              { ref: 'EXP-2026-004', cliente: 'Hotel Costa Brava', cups: 2, estado: 'Seguimiento', ahorro: '€4.100' },
            ].map((exp) => (
              <div key={exp.ref} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded bg-yellow-500/10">
                    <FolderOpen className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{exp.ref}</p>
                    <p className="text-xs text-muted-foreground">{exp.cliente}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">{exp.cups} CUPS</Badge>
                  <Badge 
                    variant={exp.estado === 'Pendiente docs' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {exp.estado}
                  </Badge>
                  <span className="text-sm font-medium text-emerald-600 min-w-[60px] text-right">{exp.ahorro}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalDashboard;
