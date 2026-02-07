// src/components/crm/customer360/SegmentBuilder.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Users, Zap, RefreshCw, Trash2, Edit2 } from 'lucide-react';
import { useCustomer360 } from '@/hooks/crm/customer360';

export function SegmentBuilder() {
  const { segments, createSegment } = useCustomer360();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
      {/* Segment List */}
      <Card className="h-full col-span-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Segmentos</CardTitle>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="h-[calc(100%-80px)] p-0">
          <ScrollArea className="h-full px-4">
            <div className="space-y-3 pt-2">
              {segments.map((segment) => (
                <div 
                  key={segment.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group relative"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{segment.name}</h4>
                    {segment.segment_type === 'ai_generated' && (
                      <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-600 hover:bg-purple-100">
                        <Zap className="h-3 w-3 mr-1" /> AI
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {segment.member_count} miembros
                    </div>
                    <span>Actualizado hace 2h</span>
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6">
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Builder Canvas */}
      <Card className="h-full col-span-2 bg-muted/30 border-dashed">
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Selecciona un segmento</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              Configura las condiciones de segmentación o utiliza la IA para descubrir audiencias ocultas.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Nuevo Segmento
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
