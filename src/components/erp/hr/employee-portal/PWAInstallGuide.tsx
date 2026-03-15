/**
 * PWAInstallGuide — Explicit install instructions for iOS/Android
 * RRHH-PORTAL.2 Block E: PWA install experience
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Download, Smartphone, Share, MoreVertical, Plus, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function useDetectPlatform() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;
  return { isIOS, isAndroid, isStandalone };
}

interface Props {
  /** Inline card mode vs trigger mode */
  variant?: 'card' | 'button' | 'banner';
  className?: string;
}

export function PWAInstallGuide({ variant = 'card', className }: Props) {
  const { isIOS, isAndroid, isStandalone } = useDetectPlatform();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleNativeInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDismissed(true);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  // Already installed as PWA
  if (isStandalone || dismissed) return null;

  const guideContent = (
    <div className="space-y-6">
      {/* Native install available */}
      {deferredPrompt && (
        <div className="space-y-3">
          <Button
            onClick={handleNativeInstall}
            className="w-full h-12 text-base font-semibold gap-2 rounded-xl"
          >
            <Download className="h-5 w-5" />
            Instalar Mi Portal
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Se añadirá a tu pantalla de inicio como una app
          </p>
        </div>
      )}

      {/* iOS instructions */}
      {isIOS && !deferredPrompt && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 mb-3">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold">Instalar en iPhone / iPad</h3>
            <p className="text-sm text-muted-foreground mt-1">3 pasos sencillos</p>
          </div>
          <div className="space-y-3">
            <StepItem step={1} icon={<Share className="h-4 w-4" />}>
              Toca el botón <strong>Compartir</strong> <Share className="h-3.5 w-3.5 inline text-primary" /> en la barra inferior de Safari
            </StepItem>
            <StepItem step={2} icon={<Plus className="h-4 w-4" />}>
              Desplázate y selecciona <strong>"Añadir a pantalla de inicio"</strong>
            </StepItem>
            <StepItem step={3} icon={<CheckCircle2 className="h-4 w-4" />}>
              Toca <strong>"Añadir"</strong> y listo — ábrela desde tu pantalla de inicio
            </StepItem>
          </div>
        </div>
      )}

      {/* Android instructions */}
      {isAndroid && !deferredPrompt && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 mb-3">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold">Instalar en Android</h3>
            <p className="text-sm text-muted-foreground mt-1">2 pasos sencillos</p>
          </div>
          <div className="space-y-3">
            <StepItem step={1} icon={<MoreVertical className="h-4 w-4" />}>
              Toca el menú <strong>⋮</strong> en la esquina superior de Chrome
            </StepItem>
            <StepItem step={2} icon={<Download className="h-4 w-4" />}>
              Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>
            </StepItem>
          </div>
        </div>
      )}

      {/* Generic instructions */}
      {!isIOS && !isAndroid && !deferredPrompt && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 mb-3">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold">Usar como app</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Abre esta página en tu móvil y sigue las instrucciones para instalarla
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-muted/50 p-3 text-center">
        <p className="text-xs text-muted-foreground">
          ✨ Una vez instalada, Mi Portal funcionará como una app nativa con acceso rápido, notificaciones y modo sin conexión.
        </p>
      </div>
    </div>
  );

  if (variant === 'banner') {
    return (
      <Card className={cn('border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 overflow-hidden', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Usa Mi Portal como app</p>
              <p className="text-xs text-muted-foreground">Accede más rápido desde tu pantalla de inicio</p>
            </div>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="sm" className="h-8 rounded-lg text-xs flex-shrink-0">
                  {deferredPrompt ? 'Instalar' : 'Cómo'}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh]">
                <SheetHeader className="pb-4">
                  <SheetTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-primary" />
                    Instalar Mi Portal
                  </SheetTitle>
                </SheetHeader>
                {guideContent}
              </SheetContent>
            </Sheet>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'button') {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className={cn('gap-2', className)}>
            <Smartphone className="h-4 w-4" />
            Instalar app
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Instalar Mi Portal
            </SheetTitle>
          </SheetHeader>
          {guideContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Card variant (for Profile/Help sections)
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-5">
        {guideContent}
      </CardContent>
    </Card>
  );
}

function StepItem({ step, icon, children }: { step: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
        {step}
      </div>
      <div className="flex-1 pt-1">
        <p className="text-sm leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
