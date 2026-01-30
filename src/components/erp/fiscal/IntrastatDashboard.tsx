/**
 * Intrastat Dashboard - Vista principal del módulo Intrastat
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Globe,
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  FileText,
  Download,
  CheckCircle,
  Clock,
  Send,
  RefreshCw,
  Info,
  Settings,
  FileJson,
} from 'lucide-react';
import { useERPIntrastat, IntrastatDirection, IntrastatDeclaration } from '@/hooks/erp/useERPIntrastat';
import { IntrastatDeclarationEditor } from './IntrastatDeclarationEditor';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: <Clock className="h-4 w-4" /> },
  validated: { label: 'Validada', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: <CheckCircle className="h-4 w-4" /> },
  submitted: { label: 'Presentada', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: <Send className="h-4 w-4" /> },
  corrected: { label: 'Corregida', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: <FileText className="h-4 w-4" /> },
};

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function IntrastatDashboard() {
  const {
    declarations,
    currentDeclaration,
    stats,
    loading,
    useDemoData,
    setCurrentDeclaration,
    fetchDeclarations,
    createDeclaration,
    validateDeclaration,
    submitDeclaration,
    exportToCSV,
    exportToJSON,
  } = useERPIntrastat();

  const [activeTab, setActiveTab] = useState('declarations');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newDeclaration, setNewDeclaration] = useState({
    period_year: new Date().getFullYear(),
    period_month: new Date().getMonth() + 1,
    direction: 'dispatches' as IntrastatDirection,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleCreate = async () => {
    const result = await createDeclaration(newDeclaration);
    if (result) {
      setShowCreateDialog(false);
      setCurrentDeclaration(result);
    }
  };

  const arrivalsDeclarations = declarations.filter(d => d.direction === 'arrivals');
  const dispatchesDeclarations = declarations.filter(d => d.direction === 'dispatches');

  const renderDeclarationCard = (declaration: IntrastatDeclaration) => {
    const statusConf = STATUS_CONFIG[declaration.status];
    
    return (
      <Card 
        key={declaration.id} 
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          currentDeclaration?.id === declaration.id && "ring-2 ring-primary"
        )}
        onClick={() => setCurrentDeclaration(declaration)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {declaration.direction === 'arrivals' ? (
                  <ArrowDownToLine className="h-4 w-4 text-blue-600" />
                ) : (
                  <ArrowUpFromLine className="h-4 w-4 text-green-600" />
                )}
                <span className="font-medium">
                  {MONTHS[declaration.period_month - 1]} {declaration.period_year}
                </span>
              </div>
              <Badge className={cn("text-xs", statusConf.color)}>
                {statusConf.icon}
                <span className="ml-1">{statusConf.label}</span>
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(declaration.total_value)}</p>
              <p className="text-xs text-muted-foreground">
                {declaration.total_lines} líneas · {declaration.total_net_mass?.toFixed(1)} kg
              </p>
            </div>
          </div>
          
          {declaration.submission_reference && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                Ref: {declaration.submission_reference}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Intrastat
          </h2>
          <p className="text-muted-foreground mt-1">
            Declaración estadística de comercio intracomunitario
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchDeclarations()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Actualizar
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva declaración
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear declaración Intrastat</DialogTitle>
                <DialogDescription>
                  Selecciona el período y tipo de declaración
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Año</Label>
                    <Select
                      value={String(newDeclaration.period_year)}
                      onValueChange={(v) => setNewDeclaration(prev => ({ ...prev, period_year: parseInt(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mes</Label>
                    <Select
                      value={String(newDeclaration.period_month)}
                      onValueChange={(v) => setNewDeclaration(prev => ({ ...prev, period_month: parseInt(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, idx) => (
                          <SelectItem key={idx} value={String(idx + 1)}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de declaración</Label>
                  <Select
                    value={newDeclaration.direction}
                    onValueChange={(v) => setNewDeclaration(prev => ({ ...prev, direction: v as IntrastatDirection }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dispatches">
                        <div className="flex items-center gap-2">
                          <ArrowUpFromLine className="h-4 w-4 text-green-600" />
                          Expediciones (ventas UE)
                        </div>
                      </SelectItem>
                      <SelectItem value="arrivals">
                        <div className="flex items-center gap-2">
                          <ArrowDownToLine className="h-4 w-4 text-blue-600" />
                          Introducciones (compras UE)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate}>
                  Crear declaración
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Demo Data Alert */}
      {useDemoData && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Datos de ejemplo:</strong> Se muestran declaraciones Intrastat de demostración. 
            Cuando generes declaraciones reales, aparecerán aquí.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ArrowUpFromLine className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expediciones (mes)</p>
                <p className="text-xl font-bold">{formatCurrency(stats.dispatchesThisMonth)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ArrowDownToLine className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Introducciones (mes)</p>
                <p className="text-xl font-bold">{formatCurrency(stats.arrivalsThisMonth)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-xl font-bold">{stats.pendingDeclarations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Volumen total</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Declarations List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Declaraciones</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="dispatches">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="dispatches" className="flex-1 gap-1">
                  <ArrowUpFromLine className="h-3 w-3" />
                  Expediciones
                </TabsTrigger>
                <TabsTrigger value="arrivals" className="flex-1 gap-1">
                  <ArrowDownToLine className="h-3 w-3" />
                  Introducciones
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dispatches">
                <ScrollArea className="h-[500px] pr-2">
                  <div className="space-y-3">
                    {dispatchesDeclarations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ArrowUpFromLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay expediciones</p>
                      </div>
                    ) : (
                      dispatchesDeclarations.map(renderDeclarationCard)
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="arrivals">
                <ScrollArea className="h-[500px] pr-2">
                  <div className="space-y-3">
                    {arrivalsDeclarations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ArrowDownToLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay introducciones</p>
                      </div>
                    ) : (
                      arrivalsDeclarations.map(renderDeclarationCard)
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Declaration Editor */}
        <Card className="lg:col-span-2">
          {currentDeclaration ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {currentDeclaration.direction === 'arrivals' ? (
                        <ArrowDownToLine className="h-5 w-5 text-blue-600" />
                      ) : (
                        <ArrowUpFromLine className="h-5 w-5 text-green-600" />
                      )}
                      {MONTHS[currentDeclaration.period_month - 1]} {currentDeclaration.period_year}
                    </CardTitle>
                    <CardDescription>
                      {currentDeclaration.direction === 'arrivals' ? 'Introducciones' : 'Expediciones'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportToCSV(currentDeclaration.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportToJSON(currentDeclaration.id)}
                    >
                      <FileJson className="h-4 w-4 mr-2" />
                      JSON
                    </Button>
                    {currentDeclaration.status === 'draft' && (
                      <Button 
                        size="sm"
                        onClick={() => validateDeclaration(currentDeclaration.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Validar
                      </Button>
                    )}
                    {currentDeclaration.status === 'validated' && (
                      <Button 
                        size="sm"
                        onClick={() => submitDeclaration(currentDeclaration.id)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Presentar
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <IntrastatDeclarationEditor declaration={currentDeclaration} />
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[600px]">
              <div className="text-center text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecciona una declaración para editarla</p>
                <p className="text-sm mt-1">o crea una nueva con el botón superior</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

export default IntrastatDashboard;
