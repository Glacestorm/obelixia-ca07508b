/**
 * HROnboardingStartDialog - Dialog para iniciar un nuevo proceso de onboarding
 * Permite seleccionar empleado, plantilla y buddy
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, Users, FileText, Calendar, Sparkles, RefreshCw, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  department_id: string | null;
  hire_date: string | null;
}

interface OnboardingTemplate {
  id: string;
  template_name: string;
  description: string | null;
  estimated_duration_days: number;
  cnae_code: string | null;
}

interface HROnboardingStartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  templates: OnboardingTemplate[];
  onOnboardingCreated?: () => void;
}

export function HROnboardingStartDialog({
  open,
  onOpenChange,
  companyId,
  templates,
  onOnboardingCreated
}: HROnboardingStartDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [buddyCandidates, setBuddyCandidates] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedBuddyId, setSelectedBuddyId] = useState<string>('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  // Fetch employees without active onboarding
  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open, companyId]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Fetch all active employees
      const { data: allEmployees, error: empError } = await supabase
        .from('erp_hr_employees')
        .select('id, first_name, last_name, job_title, department_id, hire_date')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('first_name');

      if (empError) throw empError;

      // Fetch employees already in onboarding
      const { data: onboardingEmployees, error: onbError } = await supabase
        .from('erp_hr_employee_onboarding')
        .select('employee_id')
        .eq('company_id', companyId)
        .in('status', ['not_started', 'in_progress']);

      if (onbError) throw onbError;

      const onboardingIds = new Set((onboardingEmployees || []).map(o => o.employee_id));
      
      // Filter employees not in active onboarding (new hires)
      const availableEmployees = (allEmployees || []).filter(
        emp => !onboardingIds.has(emp.id)
      ) as Employee[];

      setEmployees(availableEmployees);

      // Buddy candidates are employees with more seniority (has hire_date older than 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const buddies = (allEmployees || []).filter(emp => {
        if (!emp.hire_date) return true; // Assume senior if no hire date
        return new Date(emp.hire_date) < sixMonthsAgo;
      }) as Employee[];

      setBuddyCandidates(buddies);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmployeeId) {
      toast.error('Selecciona un empleado');
      return;
    }

    setSubmitting(true);
    try {
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
      const targetDate = selectedTemplate 
        ? format(addDays(new Date(startDate), selectedTemplate.estimated_duration_days), 'yyyy-MM-dd')
        : format(addDays(new Date(startDate), 30), 'yyyy-MM-dd');

      const { error } = await supabase
        .from('erp_hr_employee_onboarding')
        .insert([{
          company_id: companyId,
          employee_id: selectedEmployeeId,
          template_id: selectedTemplateId || null,
          assigned_buddy_id: selectedBuddyId || null,
          status: 'not_started',
          started_at: startDate,
          target_completion_date: targetDate,
          progress_percentage: 0,
          notes: notes || null
        }]);

      if (error) throw error;

      toast.success('Proceso de onboarding iniciado');
      onOpenChange(false);
      onOnboardingCreated?.();

      // Reset form
      setSelectedEmployeeId('');
      setSelectedTemplateId('');
      setSelectedBuddyId('');
      setNotes('');
    } catch (error) {
      console.error('Error creating onboarding:', error);
      toast.error('Error al crear onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Iniciar Proceso de Onboarding
          </DialogTitle>
          <DialogDescription>
            Configura el proceso de incorporación para un nuevo empleado
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-4 py-2">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Empleado *
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empleado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 mb-2"
                />
              </div>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1" />
                      Cargando...
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      No hay empleados disponibles
                    </div>
                  ) : (
                    filteredEmployees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div className="flex items-center gap-2">
                          <span>{emp.first_name} {emp.last_name}</span>
                          {emp.job_title && (
                            <Badge variant="outline" className="text-xs">
                              {emp.job_title}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedEmployee && (
                <p className="text-xs text-muted-foreground">
                  Puesto: {selectedEmployee.job_title || 'Sin asignar'}
                </p>
              )}
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Plantilla de Onboarding
              </Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una plantilla (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin plantilla</SelectItem>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        {template.template_name}
                        {template.cnae_code && (
                          <Badge variant="secondary" className="text-xs">
                            CNAE: {template.cnae_code}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <p className="text-xs text-muted-foreground">
                  Duración estimada: {selectedTemplate.estimated_duration_days} días
                </p>
              )}
            </div>

            {/* Buddy Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Buddy/Mentor (opcional)
              </Label>
              <Select value={selectedBuddyId} onValueChange={setSelectedBuddyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Asignar un mentor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin buddy asignado</SelectItem>
                  {buddyCandidates
                    .filter(b => b.id !== selectedEmployeeId)
                    .map(buddy => (
                      <SelectItem key={buddy.id} value={buddy.id}>
                        {buddy.first_name} {buddy.last_name}
                        {buddy.job_title && ` - ${buddy.job_title}`}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de Inicio
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notas adicionales</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones o instrucciones especiales..."
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !selectedEmployeeId}>
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Iniciar Onboarding
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HROnboardingStartDialog;
