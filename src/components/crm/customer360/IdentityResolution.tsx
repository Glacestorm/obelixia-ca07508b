// src/components/crm/customer360/IdentityResolution.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitMerge, Check, AlertTriangle, ArrowRight } from 'lucide-react';

export function IdentityResolution() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Conflictos de Identidad Detectados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-card">
              <div className="flex items-start justify-between">
                <div className="flex gap-8 items-center">
                  {/* Source A */}
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-700 font-bold">
                      JP
                    </div>
                    <p className="font-medium text-sm">Juan Pérez</p>
                    <p className="text-xs text-muted-foreground">juan@empresa.com</p>
                    <Badge variant="outline" className="mt-1">CRM</Badge>
                  </div>

                  <ArrowRight className="h-6 w-6 text-muted-foreground" />

                  {/* Source B */}
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 text-green-700 font-bold">
                      JP
                    </div>
                    <p className="font-medium text-sm">Juan P.</p>
                    <p className="text-xs text-muted-foreground">juan.perez@gmail.com</p>
                    <Badge variant="outline" className="mt-1">Marketing</Badge>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button size="sm">
                    <GitMerge className="h-4 w-4 mr-2" />
                    Fusionar
                  </Button>
                  <Button size="sm" variant="ghost">Ignorar</Button>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-muted rounded text-xs">
                <p className="font-medium mb-1">Razón del Match (92% confianza):</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>Mismo número de teléfono móvil</li>
                  <li>IP coincidente en últimas 24h</li>
                  <li>Nombre similar (Jaro-Winkler distance: 0.95)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
