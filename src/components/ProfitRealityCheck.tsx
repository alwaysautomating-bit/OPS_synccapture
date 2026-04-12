import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingDown, TrendingUp, AlertOctagon, Lightbulb, Calculator, DollarSign, Hammer, Plus } from 'lucide-react';
import { analyzeProfitReality } from '../services/geminiService';

interface ProfitRealityCheckProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfitRealityCheck({ isOpen, onClose }: ProfitRealityCheckProps) {
  const [estimate, setEstimate] = useState<number | ''>('');
  const [materials, setMaterials] = useState<number | ''>('');
  const [labor, setLabor] = useState<number | ''>('');
  const [extras, setExtras] = useState<number | ''>('');
  
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);

  const numEstimate = Number(estimate) || 0;
  const numMaterials = Number(materials) || 0;
  const numLabor = Number(labor) || 0;
  const numExtras = Number(extras) || 0;

  const totalActual = numMaterials + numLabor + numExtras;
  const netProfit = numEstimate - totalActual;
  const margin = numEstimate > 0 ? (netProfit / numEstimate) * 100 : 0;

  const handleCalculate = async () => {
    setIsLoading(true);
    setHasCalculated(true);
    const resultInsights = await analyzeProfitReality(numEstimate, numMaterials, numLabor, numExtras);
    setInsights(resultInsights);
    setIsLoading(false);
  };

  const handleReset = () => {
    setEstimate('');
    setMaterials('');
    setLabor('');
    setExtras('');
    setInsights([]);
    setHasCalculated(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-stone-200 w-full max-w-sm rounded-sm border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-zinc-900 p-4 border-b-4 border-zinc-900 flex justify-between items-center sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <div className="bg-orange-500 p-1.5 rounded-sm">
                <AlertOctagon className="w-5 h-5 text-zinc-900" />
              </div>
              <h2 className="font-oswald font-bold text-stone-100 uppercase tracking-widest text-lg">Reality Check</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-zinc-400 hover:text-stone-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto hidden-scrollbar">
            {/* Input Section */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 block mb-1">Total Estimated Revenue</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500 font-mono font-bold">$</span>
                  </div>
                  <input 
                    type="number"
                    value={estimate}
                    onChange={(e) => setEstimate(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 5000"
                    className="w-full pl-8 p-3 bg-stone-100 border-2 border-zinc-900 rounded-sm font-mono font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)]"
                  />
                </div>
              </div>

              <div className="p-4 bg-stone-300 border-2 border-zinc-900 rounded-sm shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] space-y-3">
                <h3 className="text-xs font-oswald font-bold text-zinc-900 uppercase underline decoration-2 underline-offset-4 mb-2">Actual Costs</h3>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex-shrink-0 bg-stone-100 border-2 border-zinc-900 rounded-sm flex items-center justify-center">
                    <Hammer className="w-4 h-4 text-zinc-700" />
                  </div>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <span className="text-zinc-500 font-mono font-bold text-xs">$</span>
                    </div>
                    <input 
                      type="number"
                      value={materials}
                      onChange={(e) => setMaterials(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Materials..."
                      className="w-full pl-6 p-2 bg-stone-100 border-2 border-zinc-900 rounded-sm font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex-shrink-0 bg-stone-100 border-2 border-zinc-900 rounded-sm flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-zinc-700" />
                  </div>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <span className="text-zinc-500 font-mono font-bold text-xs">$</span>
                    </div>
                    <input 
                      type="number"
                      value={labor}
                      onChange={(e) => setLabor(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Labor..."
                      className="w-full pl-6 p-2 bg-stone-100 border-2 border-zinc-900 rounded-sm font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex-shrink-0 bg-stone-100 border-2 border-zinc-900 rounded-sm flex items-center justify-center">
                    <Plus className="w-4 h-4 text-zinc-700" />
                  </div>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <span className="text-zinc-500 font-mono font-bold text-xs">$</span>
                    </div>
                    <input 
                      type="number"
                      value={extras}
                      onChange={(e) => setExtras(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Extras/Permits..."
                      className="w-full pl-6 p-2 bg-stone-100 border-2 border-zinc-900 rounded-sm font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleCalculate}
                className="w-full py-3 bg-orange-500 text-zinc-900 font-oswald font-bold text-lg uppercase tracking-wider border-2 border-zinc-900 rounded-sm shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="animate-pulse">Analyzing...</span>
                ) : (
                  <>
                    <Calculator className="w-5 h-5" /> Calculate Truth
                  </>
                )}
              </button>
            </div>

            {/* Results Section */}
            {hasCalculated && !isLoading && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 space-y-4 pt-6 border-t-4 border-zinc-900 border-dashed"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] ${netProfit >= 0 ? 'bg-lime-400' : 'bg-red-500'}`}>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-900/70 block mb-1">Net {netProfit >= 0 ? 'Profit' : 'Loss'}</span>
                    <div className="flex items-center gap-1">
                      {netProfit >= 0 ? <TrendingUp className="w-5 h-5 text-zinc-900" /> : <TrendingDown className="w-5 h-5 text-stone-100" />}
                      <span className={`text-2xl font-oswald font-black truncate ${netProfit >= 0 ? 'text-zinc-900' : 'text-stone-100'}`}>
                        ${Math.abs(netProfit).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] ${margin >= 20 ? 'bg-lime-400' : margin > 0 ? 'bg-amber-400' : 'bg-red-500'}`}>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-900/70 block mb-1">Actual Margin</span>
                    <span className={`text-2xl font-oswald font-black truncate ${margin >= 20 ? 'text-zinc-900' : margin > 0 ? 'text-zinc-900' : 'text-stone-100'}`}>
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-zinc-900 rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)]">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-zinc-700">
                    <Lightbulb className="w-5 h-5 text-orange-500" />
                    <h3 className="font-oswald font-bold text-stone-100 uppercase tracking-widest">AI Insights</h3>
                  </div>
                  <ul className="space-y-3">
                    {insights.map((insight, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-stone-300 font-mono">
                        <span className="text-orange-500 leading-tight">›</span>
                        <span className="leading-snug">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-center pt-2">
                  <button onClick={handleReset} className="text-[10px] font-mono font-bold uppercase text-zinc-500 hover:text-zinc-900 underline decoration-dashed">
                    Start Next Calculation
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
