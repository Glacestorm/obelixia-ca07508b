import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  module?: string;
}
interface State {
  hasError: boolean;
  error?: Error;
}

export class CRMModuleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[CRMModuleErrorBoundary] Módulo: ${this.props.module}`, error, info);
  }

  render() {
    if (this.state.hasError) {
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
            </div>
            <Button variant="outline" onClick={() => this.setState({ hasError: false, error: undefined })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
