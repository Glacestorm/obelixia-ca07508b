/**
 * B13.6 — Header for the Curated Agreements shell.
 */
import { BookOpen } from 'lucide-react';
import { CuratedAgreementsNoAutoApplyBanner } from './CuratedAgreementsNoAutoApplyBanner';

export function CuratedAgreementsHeader() {
  return (
    <header className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Convenios Curados
          </h1>
          <p className="text-sm text-muted-foreground">
            Biblioteca viva de convenios: detección, extracción, revisión, impacto
            y aplicación controlada.
          </p>
        </div>
      </div>
      <CuratedAgreementsNoAutoApplyBanner />
    </header>
  );
}

export default CuratedAgreementsHeader;