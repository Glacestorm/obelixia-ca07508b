/**
 * ExpedientFormacionTab — Training, certifications, skills
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Award, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  employeeId: string;
  companyId: string;
  onNavigate?: (module: string) => void;
}

export function ExpedientFormacionTab({ employeeId, companyId, onNavigate }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => onNavigate?.('training')}>
          <CardContent className="p-4 text-center">
            <GraduationCap className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium text-sm">Formación</p>
            <p className="text-xs text-muted-foreground mt-1">Cursos y planes formativos</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => onNavigate?.('skills-matrix')}>
          <CardContent className="p-4 text-center">
            <Star className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="font-medium text-sm">Competencias</p>
            <p className="text-xs text-muted-foreground mt-1">Matriz de habilidades</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="font-medium text-sm">Certificaciones</p>
            <p className="text-xs text-muted-foreground mt-1">Pendiente de implementar</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
