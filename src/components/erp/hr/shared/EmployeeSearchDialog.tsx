/**
 * EmployeeSearchDialog — Lightweight dialog wrapping HREmployeeSearchSelect
 * for quick employee selection from the command palette or header.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HREmployeeSearchSelect } from './HREmployeeSearchSelect';

interface EmployeeSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  selectedEmployeeId: string;
  onSelect: (employeeId: string) => void;
}

export function EmployeeSearchDialog({
  open,
  onOpenChange,
  companyId,
  selectedEmployeeId,
  onSelect,
}: EmployeeSearchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buscar empleado</DialogTitle>
        </DialogHeader>
        <HREmployeeSearchSelect
          value={selectedEmployeeId}
          onValueChange={(empId) => {
            onSelect(empId);
          }}
          companyId={companyId}
          placeholder="Buscar por nombre, NSS, nº empleado..."
        />
      </DialogContent>
    </Dialog>
  );
}

export default EmployeeSearchDialog;
