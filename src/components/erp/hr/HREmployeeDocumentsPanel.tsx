/**
 * HREmployeeDocumentsPanel - Gestión de documentación por empleado
 * Subida de contratos, certificados, títulos y otros documentos
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  FileText, Upload, Download, Search, Filter, Eye,
  File, FileImage, FileSpreadsheet, FileType,
  Clock, AlertTriangle, CheckCircle, Trash2, Plus,
  User, Calendar, Lock, Unlock
} from 'lucide-react';

interface HREmployeeDocumentsPanelProps {
  companyId: string;
}

// Tipos de documento
const DOCUMENT_TYPES = [
  { value: 'contrato', label: 'Contrato de trabajo' },
  { value: 'anexo', label: 'Anexo contractual' },
  { value: 'dni', label: 'DNI/NIE' },
  { value: 'titulo', label: 'Título académico' },
  { value: 'certificado', label: 'Certificado formación' },
  { value: 'vida_laboral', label: 'Vida laboral' },
  { value: 'nomina', label: 'Nómina' },
  { value: 'ss', label: 'Documento SS' },
  { value: 'medico', label: 'Certificado médico' },
  { value: 'prl', label: 'Documento PRL' },
  { value: 'otro', label: 'Otro documento' },
];

export function HREmployeeDocumentsPanel({ companyId }: HREmployeeDocumentsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Demo data - Empleados
  const employees = [
    { id: '1', name: 'María García López' },
    { id: '2', name: 'Juan Martínez Ruiz' },
    { id: '3', name: 'Ana Fernández Castro' },
    { id: '4', name: 'Carlos Rodríguez Pérez' },
  ];

  // Demo data - Documentos
  const documents = [
    {
      id: '1',
      employeeId: '1',
      employeeName: 'María García López',
      type: 'contrato',
      typeName: 'Contrato de trabajo',
      name: 'Contrato_Indefinido_2024.pdf',
      uploadDate: '2024-03-15',
      expiryDate: null,
      size: '245 KB',
      mimeType: 'application/pdf',
      version: 1,
      isConfidential: false,
      uploadedBy: 'Admin RRHH',
    },
    {
      id: '2',
      employeeId: '1',
      employeeName: 'María García López',
      type: 'dni',
      typeName: 'DNI/NIE',
      name: 'DNI_Maria_Garcia.pdf',
      uploadDate: '2024-03-15',
      expiryDate: '2030-06-20',
      size: '1.2 MB',
      mimeType: 'application/pdf',
      version: 1,
      isConfidential: true,
      uploadedBy: 'Admin RRHH',
    },
    {
      id: '3',
      employeeId: '2',
      employeeName: 'Juan Martínez Ruiz',
      type: 'contrato',
      typeName: 'Contrato de trabajo',
      name: 'Contrato_Temporal_2025.pdf',
      uploadDate: '2025-01-10',
      expiryDate: '2025-12-31',
      size: '198 KB',
      mimeType: 'application/pdf',
      version: 1,
      isConfidential: false,
      uploadedBy: 'Admin RRHH',
    },
    {
      id: '4',
      employeeId: '2',
      employeeName: 'Juan Martínez Ruiz',
      type: 'titulo',
      typeName: 'Título académico',
      name: 'FP_Electronica.pdf',
      uploadDate: '2024-02-20',
      expiryDate: null,
      size: '3.5 MB',
      mimeType: 'application/pdf',
      version: 1,
      isConfidential: false,
      uploadedBy: 'Admin RRHH',
    },
    {
      id: '5',
      employeeId: '3',
      employeeName: 'Ana Fernández Castro',
      type: 'certificado',
      typeName: 'Certificado formación',
      name: 'Curso_PRL_2025.pdf',
      uploadDate: '2025-01-25',
      expiryDate: '2026-01-25',
      size: '520 KB',
      mimeType: 'application/pdf',
      version: 1,
      isConfidential: false,
      uploadedBy: 'Admin RRHH',
    },
    {
      id: '6',
      employeeId: '4',
      employeeName: 'Carlos Rodríguez Pérez',
      type: 'medico',
      typeName: 'Certificado médico',
      name: 'Apto_Laboral_2026.pdf',
      uploadDate: '2026-01-05',
      expiryDate: '2027-01-05',
      size: '145 KB',
      mimeType: 'application/pdf',
      version: 1,
      isConfidential: true,
      uploadedBy: 'Admin RRHH',
    },
  ];

  // Estadísticas
  const stats = {
    totalDocuments: documents.length,
    expiringDocs: documents.filter(d => {
      if (!d.expiryDate) return false;
      const expiry = new Date(d.expiryDate);
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      return expiry <= thirtyDays;
    }).length,
    confidentialDocs: documents.filter(d => d.isConfidential).length,
  };

  // Filtrar documentos
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEmployee = selectedEmployee === 'all' || doc.employeeId === selectedEmployee;
    const matchesType = selectedType === 'all' || doc.type === selectedType;
    return matchesSearch && matchesEmployee && matchesType;
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileType className="h-4 w-4 text-destructive" />;
    if (mimeType.includes('image')) return <FileImage className="h-4 w-4 text-primary" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) 
      return <FileSpreadsheet className="h-4 w-4 text-accent-foreground" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expiry <= thirtyDays;
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <div className="space-y-4">
      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total documentos</p>
                <p className="text-lg font-bold">{stats.totalDocuments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Por vencer</p>
                <p className="text-lg font-bold">{stats.expiringDocs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Confidenciales</p>
                <p className="text-lg font-bold">{stats.confidentialDocs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel principal */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentación de Empleados
              </CardTitle>
              <CardDescription>
                Gestión de contratos, certificados y documentación personal
              </CardDescription>
            </div>
            <Button size="sm">
              <Upload className="h-4 w-4 mr-1" />
              Subir documento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[200px]">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Empleado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los empleados</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo documento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabla de documentos */}
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha subida</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileIcon(doc.mimeType)}
                        <span className="font-medium text-sm">{doc.name}</span>
                        {doc.isConfidential && (
                          <Lock className="h-3 w-3 text-purple-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{doc.employeeName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {doc.typeName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{doc.uploadDate}</TableCell>
                    <TableCell>
                      {doc.expiryDate ? (
                        <div className="flex items-center gap-1">
                          {isExpired(doc.expiryDate) ? (
                            <Badge className="bg-red-500/10 text-red-600 border-red-500/30 text-xs">
                              Vencido
                            </Badge>
                          ) : isExpiringSoon(doc.expiryDate) ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                              {doc.expiryDate}
                            </Badge>
                          ) : (
                            <span className="text-sm">{doc.expiryDate}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doc.size}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" title="Ver">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Descargar">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Eliminar" className="text-red-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {filteredDocuments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No se encontraron documentos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aviso de documentos por vencer */}
      {stats.expiringDocs > 0 && (
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-700">Documentos por vencer</p>
                <p className="text-muted-foreground">
                  Hay {stats.expiringDocs} documento(s) que vencen en los próximos 30 días. 
                  Revise y actualice la documentación para mantener el expediente al día.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default HREmployeeDocumentsPanel;
