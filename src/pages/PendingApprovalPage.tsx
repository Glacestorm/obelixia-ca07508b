import { Clock, LogOut, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function PendingApprovalPage() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="max-w-md w-full shadow-xl border-border/50">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Compte pendent d'aprovació
            </h1>
            <p className="text-muted-foreground text-sm">
              El teu compte <span className="font-medium text-foreground">{user?.email}</span> està pendent d'aprovació per part d'un administrador.
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              Rebràs accés complet un cop l'administrador aprovi el teu registre. Mentrestant, pots explorar la nostra botiga.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="default"
              onClick={() => navigate('/store')}
              className="w-full"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Anar a la botiga
            </Button>
            <Button
              variant="outline"
              onClick={signOut}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Tancar sessió
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
