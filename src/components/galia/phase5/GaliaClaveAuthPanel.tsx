/**
 * GaliaClaveAuthPanel - Panel de autenticación Cl@ve
 * Permite autenticación ciudadana con el sistema del gobierno español
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  KeyRound, 
  Smartphone, 
  CreditCard, 
  FileKey, 
  Shield, 
  CheckCircle,
  Loader2,
  LogOut,
  User
} from 'lucide-react';
import { useGaliaClaveAuth } from '@/hooks/galia/useGaliaClaveAuth';
import { cn } from '@/lib/utils';

interface GaliaClaveAuthPanelProps {
  onAuthSuccess?: (beneficiarioId: string) => void;
  className?: string;
}

export function GaliaClaveAuthPanel({ onAuthSuccess, className }: GaliaClaveAuthPanelProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  
  const {
    isLoading,
    isAuthenticated,
    user,
    authLevel,
    initiateAuth,
    logout,
    getAuthMethods
  } = useGaliaClaveAuth();

  const authMethods = getAuthMethods();

  const handleAuth = async (methodId: string) => {
    setSelectedMethod(methodId);
    
    const level = methodId === 'dnie' || methodId === 'certificado' 
      ? 'high' 
      : methodId === 'clave_permanente' 
        ? 'advanced' 
        : 'basic';

    const result = await initiateAuth(window.location.origin + '/galia/callback', level);
    
    if (result?.auth_url) {
      // Redirigir a Cl@ve
      window.location.href = result.auth_url;
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const getLevelBadge = (level: string) => {
    const colors = {
      high: 'bg-green-500/10 text-green-600 border-green-500/20',
      advanced: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      basic: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    };
    
    const labels = {
      high: 'Alto',
      advanced: 'Sustancial',
      basic: 'Básico'
    };

    return (
      <Badge variant="outline" className={colors[level as keyof typeof colors] || colors.basic}>
        <Shield className="h-3 w-3 mr-1" />
        Nivel {labels[level as keyof typeof labels] || 'Básico'}
      </Badge>
    );
  };

  // === USUARIO AUTENTICADO ===
  if (isAuthenticated && user) {
    return (
      <Card className={cn("border-green-500/30 bg-green-500/5", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Sesión Cl@ve Activa</CardTitle>
                <CardDescription>Autenticación verificada</CardDescription>
              </div>
            </div>
            {authLevel && getLevelBadge(authLevel)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {user.nombre} {user.apellido1} {user.apellido2 || ''}
                  </p>
                  <p className="text-sm text-muted-foreground">NIF: {user.nif}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                {user.email && (
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{user.email}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Método:</span>
                  <p className="font-medium capitalize">
                    {user.metodo_autenticacion.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión Cl@ve
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // === SELECCIÓN DE MÉTODO ===
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-yellow-500">
            <KeyRound className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>Acceso con Cl@ve</CardTitle>
            <CardDescription>
              Sistema de identificación electrónica del gobierno español
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {authMethods.map((method) => {
            const icons = {
              dnie: CreditCard,
              clave_pin: Smartphone,
              clave_permanente: KeyRound,
              certificado: FileKey
            };
            const Icon = icons[method.id as keyof typeof icons] || KeyRound;

            return (
              <button
                key={method.id}
                onClick={() => handleAuth(method.id)}
                disabled={isLoading}
                className={cn(
                  "w-full p-4 rounded-lg border text-left transition-all",
                  "hover:border-primary hover:bg-primary/5",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  selectedMethod === method.id && isLoading && "border-primary bg-primary/5",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    {selectedMethod === method.id && isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{method.name}</span>
                      {getLevelBadge(method.level)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {method.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Separator className="my-4" />

        <p className="text-xs text-center text-muted-foreground">
          Al acceder, acepta las condiciones de uso del sistema Cl@ve.
          <br />
          Sus datos serán tratados conforme al RGPD.
        </p>
      </CardContent>
    </Card>
  );
}

export default GaliaClaveAuthPanel;
