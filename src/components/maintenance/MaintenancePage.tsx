import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, BarChart3, Shield, Workflow, Scale, Cpu, LogIn, Eye, EyeOff, Loader2 } from 'lucide-react';
import { ObelixiaLogo } from '@/components/ui/ObelixiaLogo';
import { supabase } from '@/integrations/supabase/client';

const features = [
  { icon: Brain, label: 'IA Integrada', desc: 'Asistentes inteligentes en cada módulo' },
  { icon: BarChart3, label: 'BI en Tiempo Real', desc: 'Dashboards predictivos y analíticos' },
  { icon: Cpu, label: 'ERP Modular', desc: 'CRM, Contabilidad, RRHH y más' },
  { icon: Scale, label: 'Nómina Legal ES', desc: 'IRPF, TGSS, Modelo 190 automatizado' },
  { icon: Workflow, label: 'Automatizaciones', desc: 'Workflows inteligentes sin código' },
  { icon: Shield, label: 'Seguridad Enterprise', desc: 'MFA, RLS, cifrado y auditoría' },
];

export default function MaintenancePage() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      // Check if user is admin/superadmin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id);

      const isAdmin = roles?.some(r => r.role === 'admin' || r.role === 'super_admin');

      if (!isAdmin) {
        await supabase.auth.signOut();
        setError('Acceso restringido a administradores');
        return;
      }

      // Reload to bypass maintenance
      window.location.reload();
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Credenciales incorrectas' : err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#0a0f1a' }}>

      {/* Grid sutil */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[180px] bg-blue-600/15 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[150px] bg-violet-600/15 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[120px] bg-emerald-500/10 pointer-events-none" />

      {/* Partículas */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-blue-400/20"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: Math.random() * 4 + 3,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}

      {/* Contenido */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl">

        {/* Logo pulsante */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <ObelixiaLogo size="xl" variant="full" animated dark />
        </motion.div>

        {/* Título */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10 text-3xl md:text-5xl font-bold text-white"
        >
          Estamos mejorando{' '}
          <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-violet-400 bg-clip-text text-transparent">
            ObelixIA
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-4 text-lg md:text-xl text-slate-400 max-w-xl"
        >
          Volvemos enseguida con más potencia. Estamos implementando mejoras para ti.
        </motion.p>

        {/* Barra de progreso animada */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 w-64 h-1.5 rounded-full overflow-hidden bg-slate-800"
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 to-violet-500"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '50%' }}
          />
        </motion.div>

        {/* Login section */}
        <AnimatePresence mode="wait">
          {!showLogin ? (
            <motion.div
              key="features"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 1 }}
              className="w-full"
            >
              {/* Feature cards */}
              <div className="mt-14 grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                {features.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 + i * 0.1 }}
                    className="group relative rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-5 hover:border-slate-600/60 transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 group-hover:from-blue-500/30 group-hover:to-violet-500/30 transition-colors">
                        <f.icon className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-semibold text-white">{f.label}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-10 w-full max-w-sm"
            >
              <form onSubmit={handleLogin} className="rounded-2xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-md p-6 space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 justify-center">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Acceso Administrador
                </h2>

                {error && (
                  <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-center">
                    {error}
                  </div>
                )}

                <div className="space-y-1 text-left">
                  <label className="text-xs text-slate-400 pl-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-600/50 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    placeholder="admin@obelixia.com"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-xs text-slate-400 pl-1">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-600/50 bg-slate-900/60 px-4 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white font-medium py-2.5 text-sm transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  {loading ? 'Verificando...' : 'Acceder'}
                </button>

                <button
                  type="button"
                  onClick={() => { setShowLogin(false); setError(''); }}
                  className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors pt-1"
                >
                  ← Volver
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contacto + Login toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <p className="text-sm text-slate-600">
            ¿Necesitas ayuda? Escríbenos a{' '}
            <a href="mailto:soporte@obelixia.com" className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4">
              soporte@obelixia.com
            </a>
          </p>
          {!showLogin && (
            <button
              onClick={() => setShowLogin(true)}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-400 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Acceso administrador
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
