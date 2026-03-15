/**
 * OfflineIndicator — Shows connection status in mobile portal
 * RRHH-MOBILE.1 Phase 3: Offline resilience UX
 */
import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      className={cn(
        'fixed top-12 left-0 right-0 z-50 flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-medium transition-all duration-300',
        isOffline
          ? 'bg-amber-500/90 text-amber-950'
          : 'bg-emerald-500/90 text-emerald-950 animate-in fade-in'
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>Sin conexión — mostrando datos guardados</span>
        </>
      ) : (
        <>
          <Wifi className="h-3.5 w-3.5" />
          <span>Conexión restaurada</span>
        </>
      )}
    </div>
  );
}
