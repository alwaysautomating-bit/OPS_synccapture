import React, { useState } from 'react';
import { 
  X, 
  Minimize2, 
  Maximize2, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  CheckCircle,
  Zap,
  ArrowRight,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QuickQuote } from '../types';

interface EndOfDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Partial<QuickQuote>[];
  onMarkDone: (id: string) => void;
  onFormalize: (quote: Partial<QuickQuote>) => void;
}

export const EndOfDayModal = ({ 
  isOpen, 
  onClose, 
  items, 
  onMarkDone,
  onFormalize 
}: EndOfDayModalProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const urgentItems = items.filter(item => item.is_urgent || item.is_emergency);
  const proposalItems = items.filter(item => !item.is_urgent && !item.is_emergency && item.tags?.includes('Proposal'));
  const completeItems = items.filter(item => !item.is_urgent && !item.is_emergency && item.tags?.includes('Complete'));
  const otherItems = items.filter(item => 
    !urgentItems.includes(item) && 
    !proposalItems.includes(item) && 
    !completeItems.includes(item)
  );

  const handleToggleDone = (id: string) => {
    setCompletedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
    onMarkDone(id);
  };

  const allDone = items.length > 0 && completedIds.length === items.length;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          height: isMinimized ? '60px' : 'auto',
          width: isMinimized ? '300px' : '90%',
          bottom: isMinimized ? '20px' : '5%',
          right: isMinimized ? '20px' : '5%',
          left: isMinimized ? 'auto' : '5%',
        }}
        exit={{ opacity: 0, y: 100 }}
        className={`fixed z-50 bg-stone-200 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] border-4 border-zinc-900 rounded-sm overflow-hidden flex flex-col transition-all duration-300 ease-in-out max-w-2xl mx-auto`}
      >
        {/* Header */}
        <div className="bg-zinc-900 text-stone-100 px-6 py-4 flex items-center justify-between cursor-pointer border-b-4 border-orange-500" onClick={() => isMinimized && setIsMinimized(false)}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 border-2 border-zinc-900 flex items-center justify-center transform -skew-x-12">
              <Zap className="w-4 h-4 text-zinc-900" />
            </div>
            <div>
              <h3 className="font-oswald font-bold text-lg tracking-wide uppercase">End of Day Review</h3>
              <p className="text-[10px] text-orange-500 font-mono font-bold uppercase tracking-widest">AI Structured Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
              className="p-2 hover:bg-zinc-800 rounded-sm transition-colors border-2 border-transparent hover:border-zinc-700"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            {allDone && (
              <button 
                onClick={onClose}
                className="p-2 hover:bg-red-900/30 text-red-500 rounded-sm transition-colors border-2 border-transparent hover:border-red-900"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {!isMinimized && (
          <div className="flex-1 overflow-y-auto p-6 max-h-[70vh] space-y-8 bg-stone-200">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-lime-600 mx-auto mb-4" />
                <h4 className="text-2xl font-oswald font-bold text-zinc-900 uppercase">All Caught Up!</h4>
                <p className="text-sm font-mono text-zinc-500 uppercase">No messy inputs to review today.</p>
                <button 
                  onClick={onClose}
                  className="mt-6 px-6 py-2 bg-zinc-900 text-stone-100 text-xs font-mono font-bold rounded-sm uppercase tracking-widest border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  Close Review
                </button>
              </div>
            ) : (
              <>
                {/* Urgent Section */}
                {urgentItems.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4 border-b-2 border-zinc-900 pb-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <h4 className="text-lg font-oswald font-bold text-zinc-900 uppercase tracking-wide">Urgent / Emergency Items</h4>
                    </div>
                    <div className="space-y-3">
                      {urgentItems.map(item => (
                        <ReviewItem 
                          key={item.id} 
                          item={item} 
                          isDone={completedIds.includes(item.id!)}
                          onToggle={() => handleToggleDone(item.id!)}
                          onFormalize={() => onFormalize(item)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Proposals Section */}
                {proposalItems.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4 border-b-2 border-zinc-900 pb-2">
                      <FileText className="w-5 h-5 text-orange-500" />
                      <h4 className="text-lg font-oswald font-bold text-zinc-900 uppercase tracking-wide">Proposals to Formalize</h4>
                    </div>
                    <div className="space-y-3">
                      {proposalItems.map(item => (
                        <ReviewItem 
                          key={item.id} 
                          item={item} 
                          isDone={completedIds.includes(item.id!)}
                          onToggle={() => handleToggleDone(item.id!)}
                          onFormalize={() => onFormalize(item)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Complete Section */}
                {completeItems.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4 border-b-2 border-zinc-900 pb-2">
                      <CheckCircle className="w-5 h-5 text-lime-600" />
                      <h4 className="text-lg font-oswald font-bold text-zinc-900 uppercase tracking-wide">Completed Jobs (Ready for Invoice)</h4>
                    </div>
                    <div className="space-y-3">
                      {completeItems.map(item => (
                        <ReviewItem 
                          key={item.id} 
                          item={item} 
                          isDone={completedIds.includes(item.id!)}
                          onToggle={() => handleToggleDone(item.id!)}
                          onFormalize={() => onFormalize(item)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Other Section */}
                {otherItems.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4 border-b-2 border-zinc-900 pb-2">
                      <Clock className="w-5 h-5 text-zinc-500" />
                      <h4 className="text-lg font-oswald font-bold text-zinc-900 uppercase tracking-wide">Other Messy Inputs</h4>
                    </div>
                    <div className="space-y-3">
                      {otherItems.map(item => (
                        <ReviewItem 
                          key={item.id} 
                          item={item} 
                          isDone={completedIds.includes(item.id!)}
                          onToggle={() => handleToggleDone(item.id!)}
                          onFormalize={() => onFormalize(item)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {!isMinimized && items.length > 0 && (
          <div className="p-6 bg-stone-300 border-t-4 border-zinc-900 flex items-center justify-between">
            <div className="text-xs text-zinc-600 font-mono font-bold uppercase">
              {completedIds.length} of {items.length} items reviewed
            </div>
            <button 
              disabled={!allDone}
              onClick={onClose}
              className={`px-8 py-3 rounded-sm text-xs font-mono font-bold uppercase tracking-widest transition-all border-2 ${allDone ? 'bg-orange-500 text-zinc-900 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none' : 'bg-stone-200 text-zinc-400 border-zinc-300 cursor-not-allowed'}`}
            >
              Finish Review
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

interface ReviewItemProps {
  key?: string;
  item: Partial<QuickQuote>;
  isDone: boolean;
  onToggle: () => void;
  onFormalize: () => void;
}

const ReviewItem = ({ item, isDone, onToggle, onFormalize }: ReviewItemProps) => {
  return (
    <div className={`p-4 rounded-sm border-2 transition-all ${isDone ? 'bg-stone-200 border-zinc-400 opacity-60' : 'bg-stone-100 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)]'}`}>
      <div className="flex items-start gap-4">
        <button 
          onClick={onToggle}
          className={`mt-1 w-6 h-6 rounded-sm border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-lime-500 border-zinc-900 text-zinc-900' : 'border-zinc-900 hover:bg-orange-500'}`}
        >
          {isDone && <CheckCircle2 className="w-4 h-4" />}
        </button>
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h5 className={`font-oswald font-bold text-lg text-zinc-900 uppercase ${isDone ? 'line-through' : ''}`}>{item.suggested_job_type}</h5>
              <p className="text-[10px] font-mono text-zinc-500 italic line-clamp-2 uppercase">"{item.source_input_text}"</p>
            </div>
            <span className="text-lg font-oswald font-black text-zinc-900">${item.estimated_total}</span>
          </div>
          
          {!isDone && (
            <div className="flex gap-2 mt-3">
              <button 
                onClick={onFormalize}
                className="px-3 py-1.5 bg-orange-500 text-zinc-900 text-[10px] font-mono font-bold rounded-sm border-2 border-zinc-900 uppercase tracking-tight flex items-center gap-1 hover:bg-orange-600 transition-colors shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                Formalize <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
