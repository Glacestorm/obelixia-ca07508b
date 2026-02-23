/**
 * AcademiaPaymentSuccess - Página de pago exitoso para cursos
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAcademiaEnrollment } from '@/hooks/academia/useAcademiaEnrollment';
import StoreNavbar from '@/components/store/StoreNavbar';

const AcademiaPaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const courseId = searchParams.get('course_id');
  const { verifyPayment, loading } = useAcademiaEnrollment();
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (sessionId && courseId) {
      verifyPayment(sessionId, courseId).then(ok => {
        setVerified(ok);
        if (!ok) setError(true);
      });
    }
  }, [sessionId, courseId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <StoreNavbar />
      <div className="flex items-center justify-center pt-32 px-6">
        <Card className="bg-slate-800/80 border-slate-700 max-w-md w-full">
          <CardContent className="p-8 text-center">
            {loading ? (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Verificando pago...</h2>
                <p className="text-slate-400">Estamos activando tu matrícula</p>
              </>
            ) : verified ? (
              <>
                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">¡Pago completado!</h2>
                <p className="text-slate-400 mb-6">Tu matrícula ha sido activada. Ya puedes acceder al curso completo.</p>
                <Button asChild size="lg" className="w-full bg-gradient-to-r from-primary to-accent">
                  <Link to={`/academia/aprender/${courseId}`}>
                    <BookOpen className="w-4 h-4 mr-2" /> Comenzar a aprender
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-2">Error al verificar el pago</h2>
                <p className="text-slate-400 mb-6">Si ya realizaste el pago, intenta refrescar la página.</p>
                <Button onClick={() => window.location.reload()} variant="outline" className="border-slate-600 text-white">Reintentar</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AcademiaPaymentSuccess;
