/**
 * EmployeePortalGuard — Protege el acceso al portal del empleado
 * Solo permite acceso si el usuario autenticado tiene un registro de empleado vinculado
 */
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEmployeePortal } from '@/hooks/erp/hr/useEmployeePortal';
import { Shield, UserX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

export function EmployeePortalGuard({ children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { isLinked, isLoading, error } = useEmployeePortal();

  // Auth loading
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando portal del empleado...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // No linked employee record
  if (!isLinked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <UserX className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Acceso no disponible</h2>
          <p className="text-muted-foreground text-sm">
            Tu cuenta no está vinculada a un registro de empleado. 
            Contacta con el departamento de RRHH para solicitar acceso al portal.
          </p>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <Button variant="outline" onClick={() => window.history.back()}>
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
