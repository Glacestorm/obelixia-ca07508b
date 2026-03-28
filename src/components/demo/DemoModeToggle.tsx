
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Beaker, Power, Database, RefreshCw } from "lucide-react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { cn } from "@/lib/utils";

export function DemoModeToggle() {
  const { isDemoActive, isLoading, toggleDemoMode } = useDemoMode();

  return (
    <div className="fixed bottom-20 left-6 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={isDemoActive ? "destructive" : "default"}
            className={cn(
              "shadow-lg gap-2 transition-all duration-300",
              isDemoActive 
                ? "bg-amber-600 hover:bg-amber-700 animate-pulse text-white" 
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Beaker className="h-4 w-4" />
                {isDemoActive ? "MODO DEMO ACTIVO" : "Activar Demo"}
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover text-popover-foreground border-border">
          <DropdownMenuLabel>Configuración Demo</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {!isDemoActive ? (
            <>
              <DropdownMenuItem onClick={() => toggleDemoMode('all')} className="cursor-pointer">
                <Database className="mr-2 h-4 w-4" />
                <span>Demo Completa (Todo)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleDemoMode('galia')} className="cursor-pointer">
                <span>Solo GALIA (Subvenciones)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleDemoMode('crm')} className="cursor-pointer">
                <span>Solo CRM & Ventas</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleDemoMode('erp')} className="cursor-pointer">
                <span>Solo ERP & Finanzas</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleDemoMode('banking')} className="cursor-pointer">
                <span>Solo Sector Bancario</span>
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={() => toggleDemoMode()} className="text-destructive focus:text-destructive cursor-pointer">
              <Power className="mr-2 h-4 w-4" />
              <span>Desactivar Modo Demo</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {isDemoActive && (
        <div className="absolute -top-12 right-0 bg-amber-100 text-amber-800 px-3 py-1 rounded-md text-xs font-medium border border-amber-200 shadow-sm whitespace-nowrap dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800">
          Datos ficticios visibles
        </div>
      )}
    </div>
  );
}
