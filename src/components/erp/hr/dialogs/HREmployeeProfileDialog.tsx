/**
 * HREmployeeProfileDialog - Vista completa del perfil del empleado
 * Ficha detallada con información personal, laboral y accesos
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  CreditCard,
  Shield,
  FileText,
  Clock,
  Award,
  TrendingUp,
  DollarSign,
  Key,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface EmployeeInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  position?: string | null;
  department_id?: string | null;
  department_name?: string;
  hire_date?: string | null;
  contract_type?: string | null;
  contract_end_date?: string | null;
  status: string;
  employee_number?: string | null;
  social_security_number?: string | null;
  gross_salary?: number | null;
  avatar_url?: string | null;
  jurisdiction?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  birth_date?: string | null;
  nationality?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

interface HREmployeeProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeInfo | null;
  onEdit?: () => void;
  onManageAccess?: () => void;
}

export function HREmployeeProfileDialog({
  open,
  onOpenChange,
  employee,
  onEdit,
  onManageAccess
}: HREmployeeProfileDialogProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [documents, setDocuments] = useState<Array<{ id: string; name: string; type: string; date: string }>>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    if (open && employee?.id) {
      fetchEmployeeDocuments();
    }
  }, [open, employee?.id]);

  const fetchEmployeeDocuments = async () => {
    if (!employee?.id) return;
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_employee_documents')
        .select('id, document_name, document_type, created_at')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setDocuments(data.map(d => ({
          id: d.id,
          name: d.document_name,
          type: d.document_type,
          date: d.created_at
        })));
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  if (!employee) return null;

  const getInitials = () => {
    return `${employee.first_name.charAt(0)}${employee.last_name.charAt(0)}`.toUpperCase();
  };

  const getStatusBadge = () => {
    switch (employee.status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Activo</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500/20 text-gray-700 border-gray-500/30">Inactivo</Badge>;
      case 'on_leave':
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">Baja</Badge>;
      default:
        return <Badge variant="outline">{employee.status}</Badge>;
    }
  };

  const getContractTypeBadge = () => {
    switch (employee.contract_type) {
      case 'indefinido':
        return <Badge variant="outline">Indefinido</Badge>;
      case 'temporal':
        return <Badge variant="outline" className="text-amber-600">Temporal</Badge>;
      case 'practicas':
        return <Badge variant="outline" className="text-blue-600">Prácticas</Badge>;
      case 'formacion':
        return <Badge variant="outline" className="text-purple-600">Formación</Badge>;
      default:
        return <Badge variant="outline">{employee.contract_type || 'Sin especificar'}</Badge>;
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'No especificado';
    try {
      return format(new Date(dateStr), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'No especificado';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const InfoRow = ({ icon: Icon, label, value, className }: { 
    icon: React.ElementType; 
    label: string; 
    value: React.ReactNode;
    className?: string;
  }) => (
    <div className={cn("flex items-start gap-3 py-2", className)}>
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value || 'No especificado'}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.avatar_url || undefined} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl">
                  {employee.first_name} {employee.last_name}
                </DialogTitle>
                {getStatusBadge()}
              </div>
              <DialogDescription className="mt-1">
                {employee.position || 'Sin puesto asignado'}
                {employee.department_name && ` • ${employee.department_name}`}
              </DialogDescription>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                {employee.employee_number && (
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    Nº {employee.employee_number}
                  </span>
                )}
                {employee.hire_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Desde {format(new Date(employee.hire_date), 'MMM yyyy', { locale: es })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 shrink-0">
            <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
            <TabsTrigger value="laboral" className="text-xs">Laboral</TabsTrigger>
            <TabsTrigger value="documentos" className="text-xs">Documentos</TabsTrigger>
            <TabsTrigger value="accesos" className="text-xs">Accesos</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="general" className="mt-0 space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Datos Personales
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-6">
                  <InfoRow icon={Mail} label="Email" value={employee.email} />
                  <InfoRow icon={Phone} label="Teléfono" value={employee.phone} />
                  <InfoRow icon={Calendar} label="Fecha de nacimiento" value={formatDate(employee.birth_date)} />
                  <InfoRow icon={Users} label="Nacionalidad" value={employee.nationality} />
                  <InfoRow 
                    icon={MapPin} 
                    label="Dirección" 
                    value={[employee.address, employee.city, employee.postal_code].filter(Boolean).join(', ') || 'No especificada'}
                    className="col-span-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Contacto de Emergencia
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-6">
                  <InfoRow icon={User} label="Nombre" value={employee.emergency_contact_name} />
                  <InfoRow icon={Phone} label="Teléfono" value={employee.emergency_contact_phone} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="laboral" className="mt-0 space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Información Contractual
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-6">
                  <InfoRow icon={Building2} label="Departamento" value={employee.department_name} />
                  <InfoRow icon={Briefcase} label="Puesto" value={employee.position} />
                  <div className="flex items-start gap-3 py-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tipo de contrato</p>
                      <div className="mt-1">{getContractTypeBadge()}</div>
                    </div>
                  </div>
                  <InfoRow icon={Calendar} label="Fecha de alta" value={formatDate(employee.hire_date)} />
                  {(employee as any).termination_date && (
                    <InfoRow icon={Clock} label="Fecha de baja" value={formatDate((employee as any).termination_date)} />
                  )}
                  {employee.contract_end_date && (
                    <InfoRow icon={Clock} label="Fin de contrato" value={formatDate(employee.contract_end_date)} />
                  )}
                  <InfoRow icon={MapPin} label="Jurisdicción" value={employee.jurisdiction?.toUpperCase()} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Información Salarial
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-6">
                  <InfoRow icon={CreditCard} label="NSS" value={employee.social_security_number} />
                  <InfoRow icon={DollarSign} label="Salario bruto anual" value={formatCurrency(employee.gross_salary)} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documentos" className="mt-0">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documentos del Empleado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingDocs ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Cargando documentos...
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No hay documentos registrados
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">{doc.type}</p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(doc.date), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="accesos" className="mt-0">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Permisos y Accesos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Key className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Gestiona los permisos de acceso a los módulos del sistema
                    </p>
                    <Button variant="outline" onClick={onManageAccess}>
                      <Key className="h-4 w-4 mr-2" />
                      Gestionar Accesos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="shrink-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {onEdit && (
            <Button onClick={onEdit}>
              Editar Empleado
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HREmployeeProfileDialog;
