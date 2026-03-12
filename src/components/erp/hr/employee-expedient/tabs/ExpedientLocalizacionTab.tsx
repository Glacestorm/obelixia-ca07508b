/**
 * ExpedientLocalizacionTab — Dynamic country-specific tab
 * Loads the appropriate localization plugin based on country_code
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flag, Globe } from 'lucide-react';
import { ESEmployeeLaborDataForm } from '@/components/erp/hr/localization/es/ESEmployeeLaborDataForm';

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
          <ESEmployeeLaborDataForm companyId={companyId} employeeId={employeeId} />
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
