import ErrorBoundary from '@/components/ErrorBoundary';
import { ReactNode } from 'react';

interface HRErrorBoundaryProps {
  children: ReactNode;
  section?: string;
}

export function HRErrorBoundary({ children, section = 'RRHH' }: HRErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
          <h2 className="text-lg font-semibold text-destructive">
            Error en el módulo {section}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Se ha producido un error inesperado. Los datos no han sido modificados.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm"
          >
            Recargar módulo
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default HRErrorBoundary;
