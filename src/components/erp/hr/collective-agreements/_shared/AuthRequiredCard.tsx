import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

interface AuthRequiredCardProps {
  title?: string;
  message?: string;
}

export function AuthRequiredCard({
  title = 'Sesión requerida',
  message = 'Esta sección usa funciones protegidas del Registry. Inicia sesión con un usuario autorizado para cargar datos o ejecutar acciones.',
}: AuthRequiredCardProps) {
  return (
    <Card className="border-dashed" data-testid="registry-auth-required">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

export default AuthRequiredCard;