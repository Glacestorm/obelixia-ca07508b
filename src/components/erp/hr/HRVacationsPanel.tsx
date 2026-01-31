/**
 * HRVacationsPanel - Gestión de vacaciones y ausencias
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Calendar as CalendarIcon, Clock, CheckCircle, XCircle, 
  AlertTriangle, Users, Plus, Search, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRVacationsPanelProps {
  companyId: string;
}

export function HRVacationsPanel({ companyId }: HRVacationsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Demo data
  const vacationRequests = [
    { 
      id: '1', 
      employee: 'María García López', 
      department: 'Administración',
      startDate: '2026-02-01',
      endDate: '2026-02-07',
      days: 5,
      type: 'vacation',
      status: 'approved',
      approvedBy: 'Carlos Rodríguez'
    },
    { 
      id: '2', 
      employee: 'Juan Martínez Ruiz', 
      department: 'Producción',
      startDate: '2026-02-10',
      endDate: '2026-02-14',
      days: 5,
      type: 'vacation',
      status: 'pending',
      approvedBy: null
    },
    { 
      id: '3', 
      employee: 'Ana Fernández Castro', 
      department: 'Comercial',
      startDate: '2026-02-03',
      endDate: '2026-02-03',
      days: 1,
      type: 'personal',
      status: 'pending',
      approvedBy: null
    },
    { 
      id: '4', 
      employee: 'Pedro Sánchez Gil', 
      department: 'IT',
      startDate: '2026-01-20',
      endDate: '2026-01-24',
      days: 5,
      type: 'vacation',
      status: 'rejected',
      approvedBy: 'Carlos Rodríguez'
    },
  ];

  const balances = [
    { employee: 'María García López', total: 22, used: 10, pending: 5, remaining: 7 },
    { employee: 'Juan Martínez Ruiz', total: 22, used: 5, pending: 5, remaining: 12 },
    { employee: 'Ana Fernández Castro', total: 22, used: 15, pending: 1, remaining: 6 },
    { employee: 'Pedro Sánchez Gil', total: 22, used: 0, pending: 0, remaining: 22 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Aprobada</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pendiente</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Rechazada</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'vacation':
        return <Badge variant="outline" className="text-blue-600">Vacaciones</Badge>;
      case 'personal':
        return <Badge variant="outline" className="text-purple-600">Personal</Badge>;
      case 'sick':
        return <Badge variant="outline" className="text-red-600">Enfermedad</Badge>;
      default:
        return <Badge variant="outline">Otro</Badge>;
    }
  };

  const filteredRequests = vacationRequests.filter(v =>
    v.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-lg font-bold">
                  {vacationRequests.filter(v => v.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Aprobadas</p>
                <p className="text-lg font-bold">
                  {vacationRequests.filter(v => v.status === 'approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Días este mes</p>
                <p className="text-lg font-bold">23</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Empleados ausentes hoy</p>
                <p className="text-lg font-bold">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Solicitudes */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Solicitudes de Vacaciones</CardTitle>
                <CardDescription>Gestión de solicitudes pendientes y aprobadas</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nueva Solicitud
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empleado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filtros
              </Button>
            </div>

            <ScrollArea className="h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fechas</TableHead>
                    <TableHead className="text-center">Días</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.employee}</p>
                          <p className="text-xs text-muted-foreground">{request.department}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(request.type)}</TableCell>
                      <TableCell className="text-sm">
                        {request.startDate} - {request.endDate}
                      </TableCell>
                      <TableCell className="text-center font-medium">{request.days}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {request.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="text-green-600 h-7 px-2">
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 h-7 px-2">
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Calendario */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Calendario</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={es}
              className="rounded-md border"
            />
            
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Saldos de vacaciones</p>
              <ScrollArea className="h-[150px]">
                {balances.map((balance, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm truncate max-w-[120px]">{balance.employee}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-600">{balance.remaining}d</span>
                      <span className="text-muted-foreground">/ {balance.total}d</span>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default HRVacationsPanel;
