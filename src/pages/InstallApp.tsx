/**
 * PWA Install Page
 * Allows users to install ObelixIA as a Progressive Web App
 * Optimized for rural areas with limited connectivity (GALIA)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Smartphone,
  Download,
  Wifi,
  WifiOff,
  CheckCircle,
  Cloud,
  Database,
  Share2,
  Plus,
  RefreshCw,
  HardDrive,
  Shield
} from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallApp() {
  const { user } = useAuth();
  const {
    isOnline,
    isSyncing,
    pendingCount,
    cacheAllData,
    clearOfflineCache,
  } = useOfflineSync();

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const [cacheProgress, setCacheProgress] = useState(0);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Detect platform and installation status
  useEffect(() => {
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success('ObelixIA instal·lada correctament!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Install the PWA
  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        toast.success('App instal·lada!');
      }
    } catch (error) {
      console.error('Installation failed:', error);
      toast.error('Error en la instal·lació');
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  // Cache data for offline use
  const handleCacheData = async () => {
    if (!user?.id) {
      toast.error('Has d\'iniciar sessió primer');
      return;
    }

    setIsCaching(true);
    setCacheProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setCacheProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await cacheAllData(user.id);

      clearInterval(progressInterval);
      setCacheProgress(100);
      
      toast.success('Dades descarregades per mode offline');
    } catch (error) {
      console.error('Cache failed:', error);
      toast.error('Error descarregant dades');
    } finally {
      setTimeout(() => {
        setIsCaching(false);
        setCacheProgress(0);
      }, 1000);
    }
  };

  // Clear offline cache
  const handleClearCache = async () => {
    try {
      await clearOfflineCache();
      toast.success('Cache esborrada');
    } catch (error) {
      console.error('Clear cache failed:', error);
      toast.error('Error esborrant cache');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent mb-4">
            <Smartphone className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Instal·la ObelixIA</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Accedeix a ObelixIA sense connexió, perfecte per zones rurals amb connectivitat limitada
          </p>
        </div>

        {/* Connection Status */}
        <Card className={cn(
          "border-2",
          isOnline ? "border-green-500/30 bg-green-500/5" : "border-orange-500/30 bg-orange-500/5"
        )}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <Wifi className="h-6 w-6 text-green-500" />
                ) : (
                  <WifiOff className="h-6 w-6 text-orange-500" />
                )}
                <div>
                  <p className="font-medium">
                    {isOnline ? 'Connectat' : 'Mode Offline'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isOnline 
                      ? 'Connexió a internet disponible' 
                      : 'Treballant amb dades locals'}
                  </p>
                </div>
              </div>
              {pendingCount > 0 && (
                <Badge variant="secondary">
                  {pendingCount} pendents
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Installation Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Instal·lació de l'App
            </CardTitle>
            <CardDescription>
              Afegeix ObelixIA a la pantalla d'inici del teu dispositiu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInstalled || isStandalone ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    App instal·lada
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ObelixIA ja està a la teva pantalla d'inici
                  </p>
                </div>
              </div>
            ) : isIOS ? (
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="font-medium mb-3">Per instal·lar en iOS:</p>
                  <ol className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                      <span>Toca el botó <Share2 className="inline h-4 w-4 mx-1" /> Compartir a Safari</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                      <span>Desplaça't i toca <Plus className="inline h-4 w-4 mx-1" /> Afegir a pantalla d'inici</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                      <span>Confirma tocant "Afegir"</span>
                    </li>
                  </ol>
                </div>
            ) : deferredPrompt ? (
              <Button 
                onClick={handleInstall} 
                disabled={isInstalling}
                className="w-full"
                size="lg"
              >
                {isInstalling ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Instal·lant...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Instal·lar ObelixIA
                  </>
                )}
              </Button>
            ) : (
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">
                  L'opció d'instal·lació apareixerà automàticament quan el navegador ho permeti.
                  Prova de recarregar la pàgina o visita-la des d'un navegador compatible (Chrome, Edge, Safari).
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offline Data Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Dades Offline
            </CardTitle>
            <CardDescription>
              Descarrega les dades per treballar sense connexió (ideal per GALIA en zones rurals)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCaching && (
              <div className="space-y-2">
                <Progress value={cacheProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  Descarregant dades... {cacheProgress}%
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={handleCacheData}
                disabled={!isOnline || isCaching || !user}
                variant="default"
              >
                <Cloud className="h-4 w-4 mr-2" />
                Descarregar Dades
              </Button>
              <Button
                onClick={handleClearCache}
                variant="outline"
              >
                <HardDrive className="h-4 w-4 mr-2" />
                Esborrar Cache
              </Button>
            </div>

            {!user && (
              <p className="text-sm text-muted-foreground text-center">
                Has d'iniciar sessió per descarregar dades offline
              </p>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Avantatges del Mode Offline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: 'Zones Rurals',
                  description: 'Treballa amb expedients GALIA sense necessitat de connexió constant',
                  icon: WifiOff
                },
                {
                  title: 'Sincronització Automàtica',
                  description: 'Els canvis es sincronitzen quan tornis a tenir connexió',
                  icon: RefreshCw
                },
                {
                  title: 'Accés Ràpid',
                  description: 'Obre l\'app directament des de la pantalla d\'inici',
                  icon: Smartphone
                },
                {
                  title: 'Dades Segures',
                  description: 'Les dades es guarden de forma segura al teu dispositiu',
                  icon: Shield
                }
              ].map((feature) => (
                <div key={feature.title} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                  <feature.icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{feature.title}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
