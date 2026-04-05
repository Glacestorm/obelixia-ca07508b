import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

const DYNAMIC_IMPORT_ERROR_PATTERN = /Failed to fetch dynamically imported module|ChunkLoadError|Importing a module script failed|Loading chunk [\d]+ failed/i;

async function clearRuntimeStateAndReload() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    }
  } catch (error) {
    console.warn('[ERPModuleErrorBoundary] No se pudo limpiar el runtime:', error);
  } finally {
    window.location.reload();
  }
}

interface Props {
  children: ReactNode;
  module?: string;
}
interface State {
  hasError: boolean;
  error?: Error;
}

export class ERPModuleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ERPModuleErrorBoundary] Módulo: ${this.props.module}`, error, info);
  }

  render() {
    if (this.state.hasError) {
      const isDynamicImportError = DYNAMIC_IMPORT_ERROR_PATTERN.test(this.state.error?.message ?? '');

      return (
        <Card className="border-destructive">
          <CardContent className="py-8 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <div>
              <p className="font-semibold text-destructive">
                Error en el módulo {this.props.module ?? ''}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {this.state.error?.message ?? 'Error inesperado'}
              </p>
              {isDynamicImportError && (
                <p className="text-sm text-muted-foreground mt-2">
                  Se ha detectado un fallo de carga del módulo. Puedes limpiar caché y recargar sin perder la sesión.
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button variant="outline" onClick={() => this.setState({ hasError: false, error: undefined })}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
              {isDynamicImportError && (
                <Button variant="destructive" onClick={() => void clearRuntimeStateAndReload()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Limpiar caché y recargar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
