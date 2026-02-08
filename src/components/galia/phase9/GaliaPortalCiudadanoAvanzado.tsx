/**
 * GaliaPortalCiudadanoAvanzado - Portal Ciudadano con Cl@ve
 * Integración completa de autenticación y wizard de solicitudes
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  KeyRound, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  User,
  LogOut,
  Plus,
  Search,
  Bell,
  Sparkles,
  Shield,
  FileCheck,
  Euro,
  Calendar
} from 'lucide-react';
import { useGaliaClaveAuth, ClaveSession } from '@/hooks/galia/useGaliaClaveAuth';
import { GaliaClaveAuthPanel } from '@/components/galia/phase5/GaliaClaveAuthPanel';
import { GaliaSolicitudWizard } from './GaliaSolicitudWizard';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface MiSolicitud {
  id: string;
  numero_registro: string | null;
  titulo_proyecto: string;
  estado: string;
  importe_solicitado: number | null;
  created_at: string;
  convocatoria?: {
    nombre: string;
  } | null;
}

interface GaliaPortalCiudadanoAvanzadoProps {
  className?: string;
}

export function GaliaPortalCiudadanoAvanzado({ className }: GaliaPortalCiudadanoAvanzadoProps) {
  const [activeTab, setActiveTab] = useState('inicio');
  const [showWizard, setShowWizard] = useState(false);
  const [showSimulatedLogin, setShowSimulatedLogin] = useState(false);
  const [misSolicitudes, setMisSolicitudes] = useState<MiSolicitud[]>([]);
  const [isLoadingSolicitudes, setIsLoadingSolicitudes] = useState(false);
  const [simulatedNif, setSimulatedNif] = useState('');
  const [simulatedNombre, setSimulatedNombre] = useState('');

  const {
    isLoading: isAuthLoading,
    isAuthenticated,
    user,
    beneficiarioId,
    authLevel,
    logout,
    session
  } = useGaliaClaveAuth();

  // Fetch solicitudes del beneficiario
  const fetchMisSolicitudes = useCallback(async () => {
    if (!beneficiarioId) return;

    setIsLoadingSolicitudes(true);
    try {
      const { data, error } = await supabase
        .from('galia_solicitudes')
        .select(`
          id,
          numero_registro,
          titulo_proyecto,
          estado,
          importe_solicitado,
          created_at,
          convocatoria:galia_convocatorias(nombre)
        `)
        .eq('beneficiario_id', beneficiarioId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setMisSolicitudes(data as MiSolicitud[] || []);
    } catch (error) {
      console.error('Error fetching solicitudes:', error);
    } finally {
      setIsLoadingSolicitudes(false);
    }
  }, [beneficiarioId]);

  useEffect(() => {
    if (isAuthenticated && beneficiarioId) {
      fetchMisSolicitudes();
    }
  }, [isAuthenticated, beneficiarioId, fetchMisSolicitudes]);

  // Handle simulated login
  const handleSimulatedLogin = async () => {
    if (!simulatedNif || !simulatedNombre) {
      toast.error('Introduce NIF y nombre para continuar');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('galia-clave-auth', {
        body: {
          action: 'simulate_login',
          simulation_data: {
            nif: simulatedNif.toUpperCase(),
            nombre: simulatedNombre.split(' ')[0] || simulatedNombre,
            apellido1: simulatedNombre.split(' ').slice(1).join(' ') || 'Usuario'
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        // Store session locally
        localStorage.setItem('galia_clave_session', JSON.stringify(data.data));
        toast.success('¡Acceso simulado correctamente!');
        setShowSimulatedLogin(false);
        window.location.reload(); // Refresh to update auth state
      }
    } catch (error) {
      console.error('Error in simulated login:', error);
      toast.error('Error al acceder');
    }
  };

  const handleLogout = async () => {
    await logout();
    setMisSolicitudes([]);
    localStorage.removeItem('galia_clave_session');
    toast.info('Sesión cerrada');
  };

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: React.ElementType }> = {
      'borrador': { variant: 'outline', icon: FileText },
      'presentada': { variant: 'secondary', icon: Clock },
      'en_instruccion': { variant: 'default', icon: Search },
      'subsanacion': { variant: 'destructive', icon: AlertCircle },
      'aprobada': { variant: 'default', icon: CheckCircle },
      'denegada': { variant: 'destructive', icon: AlertCircle },
    };
    const { variant, icon: Icon } = config[estado] || { variant: 'outline', icon: FileText };
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {estado.replace('_', ' ')}
      </Badge>
    );
  };

  // Not authenticated view
  if (!isAuthenticated) {
    return (
      <div className={cn("space-y-6", className)}>
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-8 text-white">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 opacity-20" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Portal Ciudadano GALIA</h1>
                <p className="text-white/80">Gestión de Ayudas LEADER con Inteligencia Artificial</p>
              </div>
            </div>
            <p className="text-lg text-white/90 max-w-2xl">
              Accede con tu identificación electrónica para gestionar tus solicitudes de ayudas LEADER,
              consultar el estado de tus expedientes y recibir asistencia personalizada.
            </p>
          </div>
        </div>

        {/* Auth Options */}
        <div className="grid md:grid-cols-2 gap-6">
          <GaliaClaveAuthPanel
            onAuthSuccess={(id) => {
              toast.success('¡Autenticación exitosa!');
              fetchMisSolicitudes();
            }}
          />

          {/* Demo Access */}
          <Card className="border-dashed">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Shield className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Acceso Demo</CardTitle>
                  <CardDescription>
                    Para pruebas y demostraciones
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Utiliza este acceso simulado para explorar el portal sin necesidad de 
                disponer de certificado digital o Cl@ve.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowSimulatedLogin(true)}
              >
                <User className="h-4 w-4 mr-2" />
                Acceso de demostración
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: FileCheck, title: 'Solicitudes Online', desc: 'Presenta tus solicitudes de forma telemática' },
            { icon: Search, title: 'Seguimiento', desc: 'Consulta el estado de tus expedientes en tiempo real' },
            { icon: Sparkles, title: 'Asistente IA', desc: 'Recibe ayuda personalizada en cada paso' },
          ].map((feature, i) => (
            <Card key={i} className="text-center p-4">
              <feature.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </Card>
          ))}
        </div>

        {/* Simulated Login Dialog */}
        <Dialog open={showSimulatedLogin} onOpenChange={setShowSimulatedLogin}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Acceso de Demostración</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Este acceso es solo para demostración. Los datos introducidos crearán 
                  un perfil de prueba en el sistema.
                </p>
              </div>

              <div className="space-y-2">
                <Label>NIF/DNI</Label>
                <Input
                  value={simulatedNif}
                  onChange={(e) => setSimulatedNif(e.target.value.toUpperCase())}
                  placeholder="12345678A"
                />
              </div>

              <div className="space-y-2">
                <Label>Nombre completo</Label>
                <Input
                  value={simulatedNombre}
                  onChange={(e) => setSimulatedNombre(e.target.value)}
                  placeholder="Juan García López"
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleSimulatedLogin}
                disabled={isAuthLoading}
              >
                {isAuthLoading ? 'Accediendo...' : 'Acceder al Portal'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Authenticated view
  return (
    <div className={cn("space-y-6", className)}>
      {/* User Header */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-900">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <User className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {user?.nombre} {user?.apellido1} {user?.apellido2 || ''}
                </h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>NIF: {user?.nif}</span>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Nivel {authLevel}
                  </Badge>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inicio">
            <Sparkles className="h-4 w-4 mr-2" />
            Inicio
          </TabsTrigger>
          <TabsTrigger value="solicitudes">
            <FileText className="h-4 w-4 mr-2" />
            Mis Solicitudes
          </TabsTrigger>
          <TabsTrigger value="notificaciones">
            <Bell className="h-4 w-4 mr-2" />
            Avisos
          </TabsTrigger>
          <TabsTrigger value="perfil">
            <User className="h-4 w-4 mr-2" />
            Mi Perfil
          </TabsTrigger>
        </TabsList>

        {/* Inicio Tab */}
        <TabsContent value="inicio" className="space-y-4">
          {/* Quick Actions */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setShowWizard(true)}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-green-600">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Nueva Solicitud</h3>
                  <p className="text-sm text-muted-foreground">
                    Inicia una solicitud de ayuda LEADER
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Consultar Expediente</h3>
                  <p className="text-sm text-muted-foreground">
                    Ver estado de tu solicitud
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Solicitudes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSolicitudes ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando solicitudes...
                </div>
              ) : misSolicitudes.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No tienes solicitudes todavía</p>
                  <Button className="mt-4" onClick={() => setShowWizard(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primera solicitud
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {misSolicitudes.slice(0, 5).map((sol) => (
                      <div 
                        key={sol.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{sol.titulo_proyecto}</h4>
                            <p className="text-sm text-muted-foreground">
                              {sol.numero_registro || 'Sin número'}
                            </p>
                          </div>
                          {getEstadoBadge(sol.estado)}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            {sol.importe_solicitado?.toLocaleString('es-ES')} €
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(sol.created_at), { locale: es, addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Solicitudes Tab */}
        <TabsContent value="solicitudes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Mis Solicitudes</h3>
            <Button onClick={() => setShowWizard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Solicitud
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {misSolicitudes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No tienes solicitudes</p>
                </div>
              ) : (
                <div className="divide-y">
                  {misSolicitudes.map((sol) => (
                    <div 
                      key={sol.id}
                      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{sol.titulo_proyecto}</h4>
                            {getEstadoBadge(sol.estado)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Nº {sol.numero_registro || 'Pendiente'}
                            {sol.convocatoria?.nombre && ` • ${sol.convocatoria.nombre}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            {sol.importe_solicitado?.toLocaleString('es-ES')} €
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(sol.created_at), { locale: es, addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notificaciones Tab */}
        <TabsContent value="notificaciones">
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No tienes notificaciones pendientes</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Perfil Tab */}
        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle>Mi Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">NIF</Label>
                  <p className="font-medium">{user?.nif}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nombre completo</Label>
                  <p className="font-medium">{user?.nombre} {user?.apellido1} {user?.apellido2}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{user?.email || 'No especificado'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nivel de autenticación</Label>
                  <Badge variant="outline">{authLevel}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Wizard Dialog */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <GaliaSolicitudWizard
            beneficiarioId={beneficiarioId || undefined}
            userData={user ? {
              nif: user.nif,
              nombre: `${user.nombre} ${user.apellido1}`,
              email: user.email
            } : undefined}
            onComplete={(id) => {
              setShowWizard(false);
              fetchMisSolicitudes();
              toast.success('Solicitud creada correctamente');
            }}
            onCancel={() => setShowWizard(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GaliaPortalCiudadanoAvanzado;
