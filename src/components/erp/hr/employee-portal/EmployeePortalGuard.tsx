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

  // Error during employee lookup (network, RLS, etc.)
  if (error && !isLinked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold">No se pudo verificar tu acceso</h2>
          <p className="text-muted-foreground text-sm">
            Hubo un problema al comprobar tu vinculación con el expediente de empleado. 
            Esto puede deberse a un error temporal de conexión.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => window.location.reload()}>
              Reintentar
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Volver
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No linked employee record
  if (!isLinked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <UserX className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Acceso no disponible</h2>
          <p className="text-muted-foreground text-sm">
            Tu usuario todavía no está vinculado a un expediente de empleado. 
            Contacta con el departamento de RRHH para solicitar el acceso al portal.
          </p>
          <p className="text-xs text-muted-foreground">
            Si ya eres empleado y ves este mensaje, solicita a tu responsable de RRHH que vincule tu cuenta.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
