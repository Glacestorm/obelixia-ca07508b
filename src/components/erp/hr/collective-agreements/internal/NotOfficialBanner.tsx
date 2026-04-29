import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function NotOfficialBanner() {
  return (
    <Alert className="border-warning/40 bg-warning/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertDescription className="text-sm font-medium">
        Validación interna — no oficial. No activa el uso en nómina.
      </AlertDescription>
    </Alert>
  );
}

export default NotOfficialBanner;