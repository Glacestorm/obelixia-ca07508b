import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Trophy, 
  UserX, 
  Bell, 
  HandMetal,
  LayoutTemplate,
  Plus
} from 'lucide-react';
import { useCRMWorkflows } from '@/hooks/crm/workflows';

const CATEGORY_ICONS: Record<string, typeof Mail> = {
  sales: Trophy,
  marketing: Mail,
  productivity: Bell,
  onboarding: HandMetal
};

const CATEGORY_COLORS: Record<string, string> = {
  sales: 'bg-emerald-100 text-emerald-800',
  marketing: 'bg-blue-100 text-blue-800',
  productivity: 'bg-purple-100 text-purple-800',
  onboarding: 'bg-amber-100 text-amber-800'
};

export function WorkflowTemplates() {
  const { templates, createFromTemplate, isLoading } = useCRMWorkflows();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    const category = template.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, typeof templates>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
        const Icon = CATEGORY_ICONS[category] || LayoutTemplate;
        const colorClass = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800';

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <Badge className={colorClass}>
                <Icon className="h-3 w-3 mr-1" />
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {categoryTemplates.length} plantillas
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                      </div>
                      {template.is_system && (
                        <Badge variant="secondary" className="text-xs">
                          Sistema
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[40px]">
                      {template.description || 'Sin descripción'}
                    </p>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-muted-foreground">
                        Usado {template.use_count} veces
                      </span>
                    </div>

                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => createFromTemplate(template.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Usar plantilla
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {templates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No hay plantillas disponibles</p>
        </div>
      )}
    </div>
  );
}
