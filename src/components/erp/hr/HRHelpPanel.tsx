/**
 * HRHelpPanel - Panel de ayuda contextual RRHH
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpCircle, BookOpen, MessageCircle, FileText } from 'lucide-react';

interface HRHelpPanelProps {
  companyId: string;
}

export function HRHelpPanel({ companyId }: HRHelpPanelProps) {
  const helpTopics = [
    { icon: FileText, title: 'Contratos laborales', desc: 'Tipos, requisitos y extinción' },
    { icon: BookOpen, title: 'Nóminas e IRPF', desc: 'Cálculo de retenciones y deducciones' },
    { icon: MessageCircle, title: 'Vacaciones', desc: 'Gestión según ET y convenio' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Ayuda RRHH
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {helpTopics.map((topic, i) => (
              <div key={i} className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <div className="flex items-center gap-2">
                  <topic.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{topic.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{topic.desc}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default HRHelpPanel;
