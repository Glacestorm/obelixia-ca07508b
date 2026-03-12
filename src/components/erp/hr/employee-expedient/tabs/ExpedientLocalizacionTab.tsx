/**
 * ExpedientLocalizacionTab — Dynamic country-specific tab
 * Loads the appropriate localization plugin based on country_code
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flag, Globe } from 'lucide-react';

interface Props {
  employeeId: string;
  companyId: string;
  countryCode: string;
}

const COUNTRY_FLAGS: Record<string, string> = {
  ES: '🇪🇸', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪', IT: '🇮🇹', UK: '🇬🇧', US: '🇺🇸', MX: '🇲🇽', AD: '🇦🇩',
};

const COUNTRY_NAMES: Record<string, string> = {
  ES: 'España', FR: 'Francia', PT: 'Portugal', DE: 'Alemania', IT: 'Italia', UK: 'Reino Unido', US: 'Estados Unidos', MX: 'México', AD: 'Andorra',
};

export function ExpedientLocalizacionTab({ employeeId, companyId, countryCode }: Props) {
  const flag = COUNTRY_FLAGS[countryCode] || '🌐';
  const name = COUNTRY_NAMES[countryCode] || countryCode;

  // Future: dynamically load country-specific plugin component
  // e.g. if (countryCode === 'ES') return <ESLocalizationExpedientTab ... />

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Flag className="h-4 w-4 text-primary" />
          {flag} Localización {name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {countryCode === 'ES' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Datos específicos de la legislación laboral española para este empleado:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'NAF / Nº Afiliación SS', placeholder: 'Plugin ES' },
                { label: 'Grupo de cotización', placeholder: 'Plugin ES' },
                { label: 'Convenio colectivo', placeholder: 'Plugin ES' },
                { label: 'Tipo contrato RD', placeholder: 'Plugin ES' },
                { label: 'Comunidad Autónoma', placeholder: 'Plugin ES' },
                { label: 'CNO / Código ocupación', placeholder: 'Plugin ES' },
              ].map(f => (
                <div key={f.label} className="p-3 rounded-lg border border-dashed">
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="text-sm font-medium text-muted-foreground/50 mt-1">{f.placeholder}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground italic mt-2">
              Estos campos se gestionarán desde el plugin de localización España (Fase G2).
            </p>
          </div>
        ) : (
          <div className="text-center py-6">
            <Globe className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Plugin de localización para {flag} {name} pendiente de implementación.
            </p>
            <Badge variant="outline" className="mt-2">Fase G6</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
