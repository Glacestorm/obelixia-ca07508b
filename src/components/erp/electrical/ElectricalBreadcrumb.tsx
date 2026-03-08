import { ChevronRight, Zap } from 'lucide-react';

interface ElectricalBreadcrumbProps {
  section: string;
  subsection?: string;
}

export function ElectricalBreadcrumb({ section, subsection }: ElectricalBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
      <Zap className="h-3.5 w-3.5 text-yellow-500" />
      <span className="hover:text-foreground cursor-pointer transition-colors">C. Eléctrica</span>
      <ChevronRight className="h-3 w-3" />
      <span className={subsection ? "hover:text-foreground cursor-pointer transition-colors" : "text-foreground font-medium"}>
        {section}
      </span>
      {subsection && (
        <>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{subsection}</span>
        </>
      )}
    </nav>
  );
}

export default ElectricalBreadcrumb;
