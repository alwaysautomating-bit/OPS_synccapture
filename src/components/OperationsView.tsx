import React from 'react';
import { 
  FileText, 
  ClipboardList, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight,
  TrendingUp,
  DollarSign,
  Zap,
  Star,
  Truck
} from 'lucide-react';
import { motion } from 'motion/react';
import { Item, QuickQuote, Invoice, WorkOrder, Vendor, OpsQueueItem, OpsQueueName } from '../types';

interface OperationsViewProps {
  history: Partial<QuickQuote>[];
  invoices: Invoice[];
  workOrders: WorkOrder[];
  opsQueueItems: OpsQueueItem[];
  vendors: Vendor[];
  items: Item[];
  onGenerateInvoice: (quote: Partial<QuickQuote>) => void;
  onFormalize: (quote: Partial<QuickQuote>) => void;
  onMarkAsPaid: (invoiceId: string) => void;
  onCompleteWorkOrder: (woId: string) => void;
  onRunEndOfDayReview: () => void;
}

export const OperationsView = ({ 
  history, 
  invoices, 
  workOrders, 
  opsQueueItems,
  vendors,
  items,
  onGenerateInvoice,
  onFormalize,
  onMarkAsPaid,
  onCompleteWorkOrder,
  onRunEndOfDayReview
}: OperationsViewProps) => {
  const pendingProposals = history.filter(q => q.status === 'reviewed');
  const formalizedQuotes = history.filter(q => q.status === 'formalized');
  const getVendor = (vendorId?: string) => vendors.find(vendor => vendor.id === vendorId);
  const getItem = (itemId?: string) => items.find(item => item.id === itemId);
  const queueLabels: Record<OpsQueueName, string> = {
    proposals: 'Proposals',
    work_orders: 'Work Orders',
    office_updates: 'Office Updates',
    emergencies: 'Emergencies',
  };
  const queueTone: Record<OpsQueueName, string> = {
    proposals: 'border-orange-500',
    work_orders: 'border-lime-500',
    office_updates: 'border-zinc-900',
    emergencies: 'border-red-600',
  };
  const queueBuckets = (['emergencies', 'proposals', 'work_orders', 'office_updates'] as OpsQueueName[]).map(queue => ({
    queue,
    items: opsQueueItems.filter(item => item.queue === queue),
  }));
  
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const pendingRevenue = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-stone-200 p-6 space-y-8">
      {/* End of Day Trigger */}
      <div className="bg-zinc-900 p-6 rounded-sm shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] text-stone-100 relative overflow-hidden border-2 border-zinc-900">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">AI Operations Hub</span>
          </div>
          <h3 className="text-2xl font-oswald font-bold mb-4 uppercase tracking-wide">End of Day Review</h3>
          <p className="text-xs font-mono text-zinc-400 mb-6 max-w-[240px]">Analyze and structure all messy field inputs from today for final processing.</p>
          <button 
            onClick={onRunEndOfDayReview}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-zinc-900 text-xs font-mono font-bold rounded-sm uppercase tracking-widest transition-all active:translate-x-[2px] active:translate-y-[2px] border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:shadow-none flex items-center justify-center gap-2"
          >
            Run AI Analysis <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      </div>

      {/* Routed Action Queues */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b-2 border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-oswald font-bold text-zinc-900 uppercase">Action Queues</h2>
          </div>
          <span className="px-2 py-0.5 bg-zinc-900 text-stone-100 text-[10px] font-mono font-bold rounded-sm border-2 border-zinc-900">
            {opsQueueItems.length}
          </span>
        </div>

        <div className="space-y-4">
          {queueBuckets.map(({ queue, items: queueItems }) => (
            <div key={queue} className={`bg-stone-100 rounded-sm border-2 ${queueTone[queue]} shadow-[4px_4px_0px_0px_rgba(24,24,27,1)]`}>
              <div className="flex items-center justify-between p-3 border-b-2 border-zinc-900">
                <h3 className="font-oswald font-bold text-lg text-zinc-900 uppercase">{queueLabels[queue]}</h3>
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-500">{queueItems.length} open</span>
              </div>
              <div className="divide-y-2 divide-zinc-200">
                {queueItems.length === 0 ? (
                  <p className="p-4 text-[10px] font-mono font-bold uppercase text-zinc-500">No routed captures.</p>
                ) : (
                  queueItems.map(item => (
                    <div key={item.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-oswald font-bold text-lg text-zinc-900 uppercase leading-tight">{item.title}</h4>
                          <p className="mt-1 text-[10px] font-mono font-bold uppercase text-zinc-500 line-clamp-2">{item.summary}</p>
                        </div>
                        <span className={`px-2 py-1 text-[9px] font-mono font-bold uppercase border-2 border-zinc-900 rounded-sm ${
                          item.priority === 'emergency' ? 'bg-red-600 text-stone-100' :
                          item.priority === 'urgent' ? 'bg-amber-500 text-zinc-900' :
                          'bg-stone-200 text-zinc-700'
                        }`}>
                          {item.priority}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono font-bold uppercase text-zinc-600">
                        <span>{item.jobMatch?.workOrderId ?? item.jobMatch?.customerName ?? 'No job match'}</span>
                        <span className="text-right">{Math.round((item.confidenceScore ?? 0) * 100)}% confidence</span>
                      </div>
                      {item.reasons.length > 0 && (
                        <p className="mt-2 text-[10px] font-mono uppercase text-zinc-500">{item.reasons[0]}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Proposals Section */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b-2 border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-oswald font-bold text-zinc-900 uppercase">Pending Proposals</h2>
          </div>
          <span className="px-2 py-0.5 bg-zinc-900 text-stone-100 text-[10px] font-mono font-bold rounded-sm border-2 border-zinc-900">
            {pendingProposals.length}
          </span>
        </div>
        
        <div className="space-y-3">
          {pendingProposals.length === 0 ? (
            <div className="p-8 text-center bg-stone-100 rounded-sm border-2 border-zinc-400 border-dashed">
              <p className="text-sm font-mono font-bold text-zinc-500 uppercase">No proposals awaiting review</p>
            </div>
          ) : (
            pendingProposals.map((quote) => (
              <motion.div 
                key={quote.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-stone-100 p-4 rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)]"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-oswald font-bold text-lg text-zinc-900 uppercase">{quote.suggested_job_type}</h4>
                    <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Captured {new Date(quote.created_at!).toLocaleDateString()}</p>
                    {getVendor(quote.vendorId) && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-zinc-600">
                        <Truck className="w-3 h-3 text-orange-500" />
                        <span>{getVendor(quote.vendorId)?.name}</span>
                        {getVendor(quote.vendorId)?.preferred && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500 text-zinc-900 rounded-sm border-2 border-zinc-900 text-[8px]">
                            <Star className="w-2.5 h-2.5 fill-zinc-900" />
                            Preferred
                          </span>
                        )}
                      </div>
                    )}
                    {quote.materials && quote.materials.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {quote.materials.map(line => (
                          <span key={line.id} className="px-1.5 py-0.5 bg-stone-200 text-zinc-700 text-[8px] font-mono font-bold rounded-sm uppercase border-2 border-zinc-400">
                            {getItem(line.itemId)?.canonicalName ?? 'Material'} · {line.quantity}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-lg font-oswald font-black text-zinc-900">${quote.estimated_total}</span>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => onFormalize(quote)}
                    className="flex-1 py-2 bg-orange-500 text-zinc-900 text-xs font-mono font-bold rounded-sm border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                  >
                    Formalize <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Active Work Orders */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b-2 border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-oswald font-bold text-zinc-900 uppercase">Work Orders</h2>
          </div>
          <span className="px-2 py-0.5 bg-zinc-900 text-stone-100 text-[10px] font-mono font-bold rounded-sm border-2 border-zinc-900">
            {workOrders.length}
          </span>
        </div>
        
        <div className="space-y-3">
          {workOrders.length === 0 ? (
            <div className="p-8 text-center bg-stone-100 rounded-sm border-2 border-zinc-400 border-dashed">
              <p className="text-sm font-mono font-bold text-zinc-500 uppercase">No active work orders</p>
            </div>
          ) : (
            workOrders.map((wo) => (
              <div key={wo.id} className="bg-stone-100 p-4 rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] flex items-center justify-between">
                  <div>
                    <h4 className="font-oswald font-bold text-lg text-zinc-900 uppercase">{wo.job_type}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-orange-600 uppercase font-mono font-bold tracking-widest">{wo.status}</p>
                    {wo.tags && wo.tags.length > 0 && (
                      <div className="flex gap-1">
                        {wo.tags.map((tag, i) => (
                          <span key={i} className="px-1 py-0.5 bg-zinc-900 text-stone-100 text-[8px] font-mono font-bold rounded-sm uppercase border-2 border-zinc-900">
                            {tag}
                          </span>
                        ))}
                      </div>
                      )}
                    </div>
                    {getVendor(wo.vendorId) && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-zinc-600">
                        <Truck className="w-3 h-3 text-orange-500" />
                        <span>{getVendor(wo.vendorId)?.name}</span>
                        {getVendor(wo.vendorId)?.preferred && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500 text-zinc-900 rounded-sm border-2 border-zinc-900 text-[8px]">
                            <Star className="w-2.5 h-2.5 fill-zinc-900" />
                            Preferred
                          </span>
                        )}
                      </div>
                    )}
                    {wo.materials && wo.materials.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {wo.materials.map(line => (
                          <span key={line.id} className="px-1.5 py-0.5 bg-stone-200 text-zinc-700 text-[8px] font-mono font-bold rounded-sm uppercase border-2 border-zinc-400">
                            {getItem(line.itemId)?.canonicalName ?? 'Material'} · {line.quantity}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase">ID: {wo.id}</p>
                  <div className="flex flex-col items-end gap-1 mt-1">
                    {wo.status !== 'completed' && (
                      <button 
                        onClick={() => onCompleteWorkOrder(wo.id)}
                        className="text-lime-600 text-[10px] font-mono font-bold uppercase hover:underline"
                      >
                        Complete Job
                      </button>
                    )}
                    <button className="text-orange-600 text-[10px] font-mono font-bold uppercase hover:underline">Assign Tech</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Invoices */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b-2 border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-oswald font-bold text-zinc-900 uppercase">Invoices</h2>
          </div>
          <span className="px-2 py-0.5 bg-zinc-900 text-stone-100 text-[10px] font-mono font-bold rounded-sm border-2 border-zinc-900">
            {invoices.length}
          </span>
        </div>
        
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="p-8 text-center bg-stone-100 rounded-sm border-2 border-zinc-400 border-dashed">
              <p className="text-sm font-mono font-bold text-zinc-500 uppercase">No invoices generated yet</p>
            </div>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="bg-stone-100 p-4 rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-sm border-2 border-zinc-900 flex items-center justify-center ${inv.status === 'paid' ? 'bg-lime-500 text-zinc-900' : 'bg-amber-500 text-zinc-900'}`}>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-oswald font-bold text-lg text-zinc-900">${inv.amount}</h4>
                    <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Due {new Date(inv.due_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-0.5 rounded-sm border-2 border-zinc-900 text-[9px] font-mono font-bold uppercase ${inv.status === 'paid' ? 'bg-lime-500 text-zinc-900' : 'bg-amber-500 text-zinc-900'}`}>
                    {inv.status}
                  </span>
                  {inv.status === 'pending' && (
                    <button 
                      onClick={() => onMarkAsPaid(inv.id)}
                      className="text-orange-600 text-[9px] font-mono font-bold uppercase hover:underline"
                    >
                      Mark as Paid
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
