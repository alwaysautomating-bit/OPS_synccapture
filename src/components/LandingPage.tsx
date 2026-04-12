import React from 'react';
import { 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  Mic, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Smartphone,
  Database,
  Calculator,
  LayoutDashboard
} from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage = ({ onStart }: LandingPageProps) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-stone-200 font-sans selection:bg-orange-500 selection:text-zinc-900">
      {/* Hero Section */}
      <header className="relative overflow-hidden pt-16 pb-24 lg:pt-32 lg:pb-40 border-b-8 border-zinc-900">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-10" 
             style={{ backgroundImage: 'radial-gradient(#18181b 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div variants={itemVariants} className="flex items-center justify-center gap-3 mb-8">
              <div className="w-12 h-12 bg-orange-500 border-4 border-zinc-900 flex items-center justify-center transform -skew-x-12">
                <div className="w-3 h-3 bg-zinc-900"></div>
              </div>
              <span className="font-oswald font-bold text-3xl tracking-widest text-zinc-900 uppercase">SYNC<span className="text-orange-600">-</span>CAPTURE</span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-6xl lg:text-8xl font-oswald font-bold text-zinc-900 tracking-tighter uppercase leading-[0.9] mb-8">
              Speak. Snap. <span className="text-orange-600">Done.</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-xl text-zinc-700 leading-relaxed mb-12 max-w-2xl mx-auto font-mono">
              <span className="font-bold text-zinc-900 block mb-4 text-2xl uppercase tracking-tight">Tactical field capture.</span>
              Techs speak and snap on the job. SyncCapture turns that into structured data. Clean export to QuickBooks. Accurate job costing in real time.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button 
                onClick={onStart}
                className="btn-primary text-xl px-10 py-6 flex items-center justify-center gap-3"
              >
                Deploy SyncCapture
                <ArrowRight className="w-6 h-6" />
              </button>
              <div className="text-left hidden sm:block">
                <p className="text-xs text-zinc-500 font-mono font-bold uppercase tracking-widest">Status: Ready</p>
                <p className="text-xs text-zinc-500 font-mono font-bold uppercase tracking-widest">System: Online</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </header>

      {/* Value Props Section */}
      <section className="py-24 bg-stone-300 border-b-4 border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <motion.div 
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 20 }}
              viewport={{ once: true }}
              className="space-y-4 p-6 border-2 border-zinc-900 bg-stone-200 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)]"
            >
              <div className="w-14 h-14 bg-orange-500 border-2 border-zinc-900 flex items-center justify-center text-zinc-900 mb-6">
                <Mic className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-oswald font-bold text-zinc-900 uppercase tracking-wide">Speak & Snap</h3>
              <p className="text-zinc-700 font-mono text-sm leading-relaxed">
                Techs capture job details in seconds. You don’t have to prove anything later — it’s already tied to where and when you were.
              </p>
            </motion.div>

            <motion.div 
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 20 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="space-y-4 p-6 border-2 border-zinc-900 bg-stone-200 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)]"
            >
              <div className="w-14 h-14 bg-orange-500 border-2 border-zinc-900 flex items-center justify-center text-zinc-900 mb-6">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-oswald font-bold text-zinc-900 uppercase tracking-wide">Proof of Presence</h3>
              <p className="text-zinc-700 font-mono text-sm leading-relaxed">
                Every number has proof behind it. See exactly where and when the job was captured — no guessing, no backfilling.
              </p>
            </motion.div>

            <motion.div 
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 20 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="space-y-4 p-6 border-2 border-zinc-900 bg-stone-200 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)]"
            >
              <div className="w-14 h-14 bg-orange-500 border-2 border-zinc-900 flex items-center justify-center text-zinc-900 mb-6">
                <LayoutDashboard className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-oswald font-bold text-zinc-900 uppercase tracking-wide">Operations Hub</h3>
              <p className="text-zinc-700 font-mono text-sm leading-relaxed">
                A separate view for the office. Formalize proposals, track work orders, and auto-generate invoices from field data.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The "Bridge" Section */}
      <section className="py-24 overflow-hidden bg-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative overflow-hidden border-4 border-orange-500 p-12 lg:p-24">
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                 style={{ backgroundImage: 'linear-gradient(#f97316 1px, transparent 1px), linear-gradient(90deg, #f97316 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-5xl lg:text-7xl font-oswald font-bold text-stone-100 tracking-tighter uppercase leading-none mb-8">
                  The wrong story <span className="text-orange-500">can't exist.</span>
                </h2>
                <div className="space-y-6 font-mono">
                  {[
                    "Data is anchored to time + place + action.",
                    "Turn informal field notes into verifiable evidence.",
                    "Eliminate disputes with real-time capture proof.",
                    "Every number in your books has proof behind it."
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="mt-1 w-6 h-6 bg-orange-500 border-2 border-stone-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-zinc-900" />
                      </div>
                      <p className="text-stone-300 text-sm uppercase tracking-wide">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-zinc-800 border-2 border-stone-500 p-8 shadow-[16px_16px_0px_0px_rgba(249,115,22,1)]">
                <div className="flex items-center gap-3 mb-8 border-b-2 border-stone-600 pb-4">
                  <div className="w-4 h-4 bg-stone-500 rounded-sm"></div>
                  <div className="w-4 h-4 bg-stone-500 rounded-sm"></div>
                  <div className="w-4 h-4 bg-stone-500 rounded-sm"></div>
                  <span className="ml-auto font-mono text-xs text-orange-500 uppercase tracking-widest">System Preview</span>
                </div>
                <div className="space-y-4">
                  <div className="h-6 bg-zinc-700 w-3/4 border border-zinc-600"></div>
                  <div className="h-6 bg-zinc-700 w-1/2 border border-zinc-600"></div>
                  <div className="h-32 bg-zinc-900 w-full border-2 border-orange-500 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f97316 0, #f97316 2px, transparent 2px, transparent 8px)' }}></div>
                    <Mic className="w-12 h-12 text-orange-500 relative z-10" />
                  </div>
                  <div className="h-6 bg-zinc-700 w-2/3 border border-zinc-600"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-zinc-950 border-t-8 border-orange-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 border-2 border-stone-200 flex items-center justify-center transform -skew-x-12">
              <div className="w-2 h-2 bg-zinc-900"></div>
            </div>
            <span className="font-oswald font-bold text-xl tracking-widest text-stone-200 uppercase">SYNC<span className="text-orange-500">-</span>CAPTURE</span>
          </div>
          <p className="text-stone-500 font-mono text-xs uppercase tracking-widest">
            © 2026 SYNCd. Tactical systems for field operations.
          </p>
          <div className="flex gap-6 font-mono text-xs uppercase tracking-widest">
            <a href="#" className="text-stone-500 hover:text-orange-500 transition-colors">Privacy</a>
            <a href="#" className="text-stone-500 hover:text-orange-500 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
