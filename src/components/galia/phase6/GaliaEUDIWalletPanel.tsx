/**
 * GaliaEUDIWalletPanel - eIDAS 2.0 / EUDI Wallet Verification UI
 * 
 * European Digital Identity Wallet integration for citizen verification.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CreditCard, 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  QrCode,
  Smartphone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  User,
  Car,
  FileCheck,
  Fingerprint,
  Globe
} from 'lucide-react';
import { useGaliaEUDIWallet, CredentialType } from '@/hooks/galia/useGaliaEUDIWallet';
import { cn } from '@/lib/utils';

interface GaliaEUDIWalletPanelProps {
  onVerificationComplete?: (verified: boolean, data: unknown) => void;
  requiredCredential?: CredentialType;
  className?: string;
}

export function GaliaEUDIWalletPanel({
  onVerificationComplete,
  requiredCredential = 'PID',
  className
}: GaliaEUDIWalletPanelProps) {
  const [activeTab, setActiveTab] = useState('verify');
  const [selectedCredential, setSelectedCredential] = useState<CredentialType>(requiredCredential);

  const {
    isLoading,
    error,
    presentationRequest,
    verificationResult,
    requestCredential,
    verifyPresentation,
    checkRevocation,
    clearState
  } = useGaliaEUDIWallet();

  const handleRequestCredential = async () => {
    const result = await requestCredential(selectedCredential);
    if (result) {
      console.log('[EUDI] Presentation request created:', result);
    }
  };

  const handleVerify = async () => {
    if (!presentationRequest) return;
    
    const result = await verifyPresentation(
      presentationRequest.id,
      'did:example:holder'
    );
    
    if (result) {
      onVerificationComplete?.(result.verified, result);
    }
  };

  const credentialTypes: { type: CredentialType; label: string; icon: React.ReactNode; description: string }[] = [
    { type: 'PID', label: 'Identidad (PID)', icon: <User className="h-5 w-5" />, description: 'Datos de identificación personal' },
    { type: 'mDL', label: 'Carnet Conducir (mDL)', icon: <Car className="h-5 w-5" />, description: 'Permiso de conducción móvil' },
    { type: 'QEAA', label: 'Atributos Cualificados', icon: <FileCheck className="h-5 w-5" />, description: 'Attestations cualificadas' },
    { type: 'EAA', label: 'Atributos Electrónicos', icon: <Fingerprint className="h-5 w-5" />, description: 'Attestations genéricas' }
  ];

  return (
    <Card className={cn("border-2 border-primary/20", className)}>
      <CardHeader className="bg-gradient-to-r from-blue-600/10 via-yellow-500/10 to-blue-600/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-yellow-500">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                EUDI Wallet
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  eIDAS 2.0
                </Badge>
              </CardTitle>
              <CardDescription>
                Verificación de identidad digital europea
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={clearState} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="verify" className="text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Verificar
            </TabsTrigger>
            <TabsTrigger value="credentials" className="text-xs">
              <CreditCard className="h-3 w-3 mr-1" />
              Credenciales
            </TabsTrigger>
            <TabsTrigger value="status" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Estado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verify" className="mt-4 space-y-4">
            {/* Credential Type Selection */}
            <div className="grid grid-cols-2 gap-2">
              {credentialTypes.map(({ type, label, icon, description }) => (
                <button
                  key={type}
                  onClick={() => setSelectedCredential(type)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all text-left",
                    selectedCredential === type
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {icon}
                    <span className="font-medium text-sm">{label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                onClick={handleRequestCredential} 
                disabled={isLoading}
                className="flex-1"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Solicitar Credencial
              </Button>
              {presentationRequest && (
                <Button 
                  onClick={handleVerify} 
                  disabled={isLoading}
                  variant="secondary"
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Verificar
                </Button>
              )}
            </div>

            {/* QR Code Display */}
            {presentationRequest && (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="w-40 h-40 mx-auto bg-white rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30 mb-3">
                  <QrCode className="h-20 w-20 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Escanea con tu EUDI Wallet
                </p>
                <div className="flex items-center justify-center gap-2 text-xs">
                  <Smartphone className="h-3 w-3" />
                  <span>O usa el deeplink en tu móvil</span>
                </div>
              </div>
            )}

            {/* Verification Result */}
            {verificationResult && (
              <Alert variant={verificationResult.verified ? "default" : "destructive"}>
                {verificationResult.verified ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {verificationResult.verified ? 'Verificación Exitosa' : 'Verificación Fallida'}
                </AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>Emisor: {verificationResult.issuer?.name}</p>
                    <p>País: {verificationResult.issuer?.country}</p>
                    <p>Nivel de confianza: 
                      <Badge variant="outline" className="ml-1">
                        {verificationResult.issuer?.trustLevel}
                      </Badge>
                    </p>
                    <p>Nivel de aseguramiento: 
                      <Badge variant="outline" className="ml-1">
                        {verificationResult.subject?.assuranceLevel}
                      </Badge>
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="credentials" className="mt-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {verificationResult?.subject?.claims && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Claims Verificados</h4>
                    {Object.entries(verificationResult.subject.claims).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="text-sm text-muted-foreground">{key}</span>
                        <span className="text-sm font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {verificationResult?.validations && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Validaciones</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={cn(
                        "p-2 rounded flex items-center gap-2",
                        verificationResult.validations.signatureValid ? "bg-green-50" : "bg-red-50"
                      )}>
                        {verificationResult.validations.signatureValid ? 
                          <CheckCircle className="h-4 w-4 text-green-600" /> : 
                          <XCircle className="h-4 w-4 text-red-600" />
                        }
                        <span className="text-xs">Firma válida</span>
                      </div>
                      <div className={cn(
                        "p-2 rounded flex items-center gap-2",
                        verificationResult.validations.chainValid ? "bg-green-50" : "bg-red-50"
                      )}>
                        {verificationResult.validations.chainValid ? 
                          <CheckCircle className="h-4 w-4 text-green-600" /> : 
                          <XCircle className="h-4 w-4 text-red-600" />
                        }
                        <span className="text-xs">Cadena válida</span>
                      </div>
                      <div className={cn(
                        "p-2 rounded flex items-center gap-2",
                        verificationResult.validations.notRevoked ? "bg-green-50" : "bg-red-50"
                      )}>
                        {verificationResult.validations.notRevoked ? 
                          <CheckCircle className="h-4 w-4 text-green-600" /> : 
                          <XCircle className="h-4 w-4 text-red-600" />
                        }
                        <span className="text-xs">No revocada</span>
                      </div>
                      <div className={cn(
                        "p-2 rounded flex items-center gap-2",
                        verificationResult.validations.notExpired ? "bg-green-50" : "bg-red-50"
                      )}>
                        {verificationResult.validations.notExpired ? 
                          <CheckCircle className="h-4 w-4 text-green-600" /> : 
                          <XCircle className="h-4 w-4 text-red-600" />
                        }
                        <span className="text-xs">No expirada</span>
                      </div>
                    </div>
                  </div>
                )}

                {!verificationResult && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay credenciales verificadas</p>
                    <p className="text-xs">Solicita y verifica una credencial primero</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="status" className="mt-4">
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-yellow-50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Estado del Sistema EUDI
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Protocolo:</span>
                    <span className="ml-2 font-medium">OpenID4VP</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Versión:</span>
                    <span className="ml-2 font-medium">Draft 20</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Conformidad:</span>
                    <span className="ml-2 font-medium">eIDAS 2.0</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">TSP:</span>
                    <span className="ml-2 font-medium">FNMT-RCM</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Credenciales Soportadas</h4>
                {credentialTypes.map(({ type, label, icon }) => (
                  <div key={type} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <div className="flex items-center gap-2">
                      {icon}
                      <span className="text-sm">{label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Activo
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GaliaEUDIWalletPanel;
