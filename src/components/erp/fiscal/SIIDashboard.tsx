/**
 * SII Dashboard - Vista principal del módulo SII
 * Cola de registros, estados, incidencias, workflow
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Send,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Settings,
  ListTodo,
  ArrowUpDown,
  FileCheck,
  Info,
} from 'lucide-react';
import { useERPSII, SIIBookType, SIIRecordStatus } from '@/hooks/erp/useERPSII';
import { SIIRecordsTable } from './SIIRecordsTable';
import { SIITasksPanel } from './SIITasksPanel';
import { SIIConfigPanel } from './SIIConfigPanel';
import { cn } from '@/lib/utils';

const BOOKS: { key: SIIBookType; label: string; icon: React.ReactNode }[] = [
  { key: 'emitted', label: 'Facturas Emitidas', icon: <FileText className="h-4 w-4" /> },
  { key: 'received', label: 'Facturas Recibidas', icon: <FileCheck className="h-4 w-4" /> },
  { key: 'intra', label: 'Operaciones Intracomunitarias', icon: <ArrowUpDown className="h-4 w-4" /> },
  { key: 'recc_cobros', label: 'Cobros RECC', icon: <CheckCircle className="h-4 w-4" /> },
  { key: 'recc_pagos', label: 'Pagos RECC', icon: <Send className="h-4 w-4" /> },
];

const STATUS_CONFIG: Record<SIIRecordStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: <Clock className="h-4 w-4" /> },
  generated: { label: 'Generado', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: <FileText className="h-4 w-4" /> },
  sent: { label: 'Enviado', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: <Send className="h-4 w-4" /> },
  accepted: { label: 'Aceptado', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: <CheckCircle className="h-4 w-4" /> },
  accepted_with_errors: { label: 'Con errores', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: <AlertTriangle className="h-4 w-4" /> },
  rejected: { label: 'Rechazado', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: <XCircle className="h-4 w-4" /> },
};

export function SIIDashboard() {
  const {
    records,
    tasks,
    stats,
    loading,
    filters,
    useDemoData,
    setFilters,
    fetchRecords,
    generateRecord,
    markAsSent,
    simulateResponse,
    createTask,
    updateTaskStatus,
    generateBatch,
    sendBatch,
  } = useERPSII();

  const [activeTab, setActiveTab] = useState('records');
  const [activeBook, setActiveBook] = useState<SIIBookType>('emitted');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);

  // Filtrar registros por libro
  const filteredRecords = records.filter(r => r.book === activeBook);

  // Stats por libro
  const bookStats = {
    pending: filteredRecords.filter(r => r.status === 'pending').length,
    generated: filteredRecords.filter(r => r.status === 'generated').length,
    sent: filteredRecords.filter(r => r.status === 'sent').length,
    accepted: filteredRecords.filter(r => r.status === 'accepted').length,
    accepted_with_errors: filteredRecords.filter(r => r.status === 'accepted_with_errors').length,
    rejected: filteredRecords.filter(r => r.status === 'rejected').length,
  };

  const handleBulkGenerate = () => {
    const pendingIds = filteredRecords.filter(r => r.status === 'pending').map(r => r.id);
    if (pendingIds.length > 0) {
      generateBatch(pendingIds);
    }
  };

  const handleBulkSend = () => {
    const generatedIds = filteredRecords.filter(r => r.status === 'generated').map(r => r.id);
    if (generatedIds.length > 0) {
      sendBatch(generatedIds);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            SII - Suministro Inmediato de Información
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestión de registros, estados e incidencias del SII
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchRecords()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Demo Data Alert */}
      {useDemoData && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Datos de ejemplo:</strong> Se muestran registros SII de demostración. 
            Cuando contabilices facturas reales, aparecerán aquí automáticamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <Card 
            key={status} 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              filters.status === status && "ring-2 ring-primary"
            )}
            onClick={() => setFilters(prev => ({ 
              ...prev, 
              status: prev.status === status ? undefined : status as SIIRecordStatus 
            }))}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={cn("p-2 rounded-lg", config.color)}>
                  {config.icon}
                </div>
                <span className="text-2xl font-bold">
                  {stats[status as keyof typeof stats] || 0}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{config.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="records" className="gap-2">
            <FileText className="h-4 w-4" />
            Registros ({records.length})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Tareas
            {stats.openTasks > 0 && (
              <Badge variant="destructive" className="ml-1">{stats.openTasks}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4">
          {/* Book Tabs */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Libros de Registro</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleBulkGenerate}
                    disabled={bookStats.pending === 0}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generar todos ({bookStats.pending})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleBulkSend}
                    disabled={bookStats.generated === 0}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar todos ({bookStats.generated})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeBook} onValueChange={(v) => setActiveBook(v as SIIBookType)}>
                <TabsList className="mb-4">
                  {BOOKS.map(book => (
                    <TabsTrigger key={book.key} value={book.key} className="gap-2">
                      {book.icon}
                      {book.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {BOOKS.map(book => (
                  <TabsContent key={book.key} value={book.key}>
                    <SIIRecordsTable
                      records={filteredRecords}
                      selectedRecords={selectedRecords}
                      onSelectRecords={setSelectedRecords}
                      onGenerate={generateRecord}
                      onMarkSent={markAsSent}
                      onSimulateResponse={simulateResponse}
                      onCreateTask={createTask}
                      statusConfig={STATUS_CONFIG}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <SIITasksPanel
            tasks={tasks}
            onUpdateStatus={updateTaskStatus}
          />
        </TabsContent>

        <TabsContent value="config">
          <SIIConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SIIDashboard;
