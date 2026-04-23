import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Keyboard, 
  Camera, 
  ChevronRight, 
  ChevronDown,
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck,
  History, 
  User, 
  MapPin, 
  Loader2,
  X,
  Plus,
  Minus,
  Clock,
  Navigation,
  AlertTriangle,
  Zap,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LineChart,
  Star,
  Truck,
  Package,
  Image as ImageIcon,
  Save,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QuickQuote, Customer, InputType, Invoice, WorkOrder, WorkOrderNote, WorkOrderWorkEntry, WorkOrderPart, WorkOrderAttachment, LaborSession, Vendor, Item, VendorItemPriceHistory, MaterialLine, SupplierOutreachDraft, SupabaseJob, ComparableVendorQuote, RoutingDecision, PrimaryAction, OpsQueueItem, JobMatchingCandidate } from './types';
import { MOCK_CUSTOMERS, MOCK_ITEMS, MOCK_VENDOR_ITEM_PRICE_HISTORY, MOCK_VENDORS } from './mockData';
import { usePersistentCollection } from './hooks/usePersistentCollection';
import { isSupabaseConfigured } from './lib/env';
import { getJobs } from './data/jobs';
import { getItems } from './data/items';
import { getVendors } from './data/vendors';
import { getComparableQuotesForItem } from './data/quotes';
import { createOrUpdatePartsUsage } from './data/partsUsage';
import { interpretQuote } from './services/geminiService';
import { buildRoutingDecision, createOpsQueueItem, detectSuggestedActions, matchJob, normalizeCapture } from './routing';
import { LandingPage } from './components/LandingPage';
import { PhotoCapture } from './components/PhotoCapture';
import { OperationsView } from './components/OperationsView';
import { EndOfDayModal } from './components/EndOfDayModal';
import { ProfitRealityCheck } from './components/ProfitRealityCheck';
import { VendorManager } from './components/VendorManager';
import { MaterialPriceMemory } from './components/MaterialPriceMemory';

// --- Components ---

const JobContext = ({ customer }: { customer: Customer }) => (
  <div className="bg-zinc-900 p-4 border-b-4 border-orange-500 flex items-start gap-3">
    <div className="bg-orange-500 p-2 rounded-sm border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]">
      <User className="w-5 h-5 text-zinc-900" />
    </div>
    <div className="flex-1">
      <h2 className="font-oswald font-bold text-stone-100 uppercase tracking-wide leading-tight">{customer.name}</h2>
      <div className="flex items-center gap-1 mt-1 text-xs text-zinc-400 font-mono">
        <MapPin className="w-3 h-3 text-orange-500" />
        <span className="truncate uppercase">{customer.address}</span>
      </div>
    </div>
    <div className="text-right">
      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-orange-500">Work Order</span>
      <p className="text-xs font-mono font-bold text-stone-100">#WO-8821</p>
    </div>
  </div>
);

const QuickActions = ({ onAction }: { onAction: (type: 'talk' | 'type' | 'photo') => void }) => (
  <div className="grid grid-cols-3 gap-2 p-4 bg-stone-300 border-b-2 border-zinc-900">
    <button 
      onClick={() => onAction('talk')}
      className="flex flex-col items-center justify-center gap-1 p-3 bg-stone-100 rounded-sm border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
    >
      <Mic className="w-6 h-6 text-orange-500" />
      <span className="text-[10px] font-mono font-bold text-zinc-900 uppercase">Talk</span>
    </button>
    <button 
      onClick={() => onAction('type')}
      className="flex flex-col items-center justify-center gap-1 p-3 bg-stone-100 rounded-sm border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
    >
      <Keyboard className="w-6 h-6 text-zinc-700" />
      <span className="text-[10px] font-mono font-bold text-zinc-900 uppercase">Type</span>
    </button>
    <button 
      onClick={() => onAction('photo')}
      className="flex flex-col items-center justify-center gap-1 p-3 bg-stone-100 rounded-sm border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
    >
      <Camera className="w-6 h-6 text-zinc-700" />
      <span className="text-[10px] font-mono font-bold text-zinc-900 uppercase">Photo</span>
    </button>
  </div>
);

type WorkOrderPanel = 'job-notes' | 'todays-work' | 'parts' | 'photos' | 'work-session';

const formatDuration = (minutes?: number) => {
  if (!minutes || minutes < 1) return 'Less than 1 min';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
};

const getAttachmentPreview = (source: WorkOrderAttachment['source']) => (
  source === 'camera'
    ? 'linear-gradient(135deg, #f97316 0%, #18181b 100%)'
    : 'linear-gradient(135deg, #a3e635 0%, #18181b 100%)'
);

const WorkOrderDetailShell = ({
  workOrder,
  notes,
  workEntries,
  parts,
  attachments,
  laborSessions,
  onAddNote,
  onAddWorkEntry,
  onAddPart,
  onAddAttachment,
  onStartWork,
  onFinishWork,
  onBack,
}: {
  workOrder: WorkOrder;
  notes: WorkOrderNote[];
  workEntries: WorkOrderWorkEntry[];
  parts: WorkOrderPart[];
  attachments: WorkOrderAttachment[];
  laborSessions: LaborSession[];
  onAddNote: (note: Omit<WorkOrderNote, 'id' | 'createdAt'>) => void;
  onAddWorkEntry: (entry: Omit<WorkOrderWorkEntry, 'id' | 'createdAt'>) => void;
  onAddPart: (part: Omit<WorkOrderPart, 'id' | 'createdAt'>) => void;
  onAddAttachment: (attachment: Omit<WorkOrderAttachment, 'id' | 'createdAt'>) => void;
  onStartWork: () => void;
  onFinishWork: () => void;
  onBack: () => void;
}) => {
  const [activePanel, setActivePanel] = useState<WorkOrderPanel | null>(null);
  const [noteText, setNoteText] = useState('');
  const [workText, setWorkText] = useState('');
  const [workPart, setWorkPart] = useState('');
  const [workPhotoAttached, setWorkPhotoAttached] = useState(false);
  const [partName, setPartName] = useState('');
  const [partQuantity, setPartQuantity] = useState('1');
  const [attachmentSource, setAttachmentSource] = useState<WorkOrderAttachment['source']>('camera');
  const [attachmentNote, setAttachmentNote] = useState('');
  const [panelMessage, setPanelMessage] = useState<string | null>(null);

  const title = workOrder.title ?? workOrder.job_type;
  const workOrderNumber = workOrder.work_order_number ?? workOrder.id;
  const customerName = workOrder.customer_name ?? MOCK_CUSTOMERS.find(currentCustomer => currentCustomer.id === workOrder.customer_id)?.name ?? 'Customer placeholder';
  const address = workOrder.address ?? MOCK_CUSTOMERS.find(currentCustomer => currentCustomer.id === workOrder.customer_id)?.address;
  const createdAt = workOrder.created_at ?? workOrder.scheduled_date ?? new Date().toISOString();
  const rawStatus = workOrder.status as WorkOrder['status'] | 'in-progress';
  const normalizedStatus = rawStatus === 'in-progress' ? 'in_progress' : rawStatus;
  const activeLaborSession = laborSessions.find(session => !session.ended_at);
  const completedLaborSessions = laborSessions.filter(session => session.ended_at);
  const latestCompletedSession = completedLaborSessions[0];
  const canStartWork = normalizedStatus === 'scheduled' && !activeLaborSession;
  const canFinishWork = normalizedStatus === 'in_progress' && Boolean(activeLaborSession);
  const panelLabels: Record<WorkOrderPanel, string> = {
    'job-notes': 'Job Notes',
    'todays-work': "Today's Work",
    parts: 'Parts',
    photos: 'Photos',
    'work-session': 'Work Session',
  };
  const panels: { id: WorkOrderPanel; icon: React.ElementType; label: string; summary: string; detail?: string }[] = [
    {
      id: 'job-notes',
      icon: FileText,
      label: 'Job Notes',
      summary: notes.length ? `${notes.length} saved` : 'No notes yet',
      detail: notes[0]?.note,
    },
    {
      id: 'todays-work',
      icon: ClipboardList,
      label: "Today's Work",
      summary: workEntries.length ? `${workEntries.length} entries` : 'No work logged',
      detail: workEntries[0]?.summary,
    },
    {
      id: 'parts',
      icon: Package,
      label: 'Parts',
      summary: parts.length ? `${parts.length} parts` : 'No parts added',
      detail: parts.slice(0, 2).map(part => `${part.name} x${part.quantity}`).join(', '),
    },
    {
      id: 'photos',
      icon: ImageIcon,
      label: 'Photos',
      summary: attachments.length ? `${attachments.length} attached` : 'No photos attached',
      detail: attachments[0]?.note,
    },
    {
      id: 'work-session',
      icon: Clock,
      label: 'Work Session',
      summary: activeLaborSession ? 'In progress' : latestCompletedSession ? `Last: ${formatDuration(latestCompletedSession.durationMinutes)}` : 'Not started',
      detail: completedLaborSessions.length ? `${completedLaborSessions.length} completed` : undefined,
    },
  ];

  const showSaved = (message: string) => {
    setPanelMessage(message);
    window.setTimeout(() => setPanelMessage(null), 1800);
  };

  const handleOpenPanel = (panel: WorkOrderPanel) => {
    setPanelMessage(null);
    setActivePanel(panel);
  };

  const handleSaveNote = () => {
    const trimmedNote = noteText.trim();
    if (!trimmedNote) return;
    onAddNote({ workOrderId: workOrder.id, note: trimmedNote, createdBy: 'Field tech' });
    setNoteText('');
    showSaved('Note saved');
  };

  const handleSaveWorkEntry = () => {
    const trimmedWork = workText.trim();
    if (!trimmedWork) return;
    onAddWorkEntry({
      workOrderId: workOrder.id,
      summary: trimmedWork,
      optionalPart: workPart.trim() || undefined,
      photoAttached: workPhotoAttached,
    });
    setWorkText('');
    setWorkPart('');
    setWorkPhotoAttached(false);
    showSaved('Work entry saved');
  };

  const handleSavePart = () => {
    const trimmedName = partName.trim();
    const quantity = Number(partQuantity);
    if (!trimmedName || Number.isNaN(quantity) || quantity <= 0) return;
    onAddPart({ workOrderId: workOrder.id, name: trimmedName, quantity });
    setPartName('');
    setPartQuantity('1');
    showSaved('Part saved');
  };

  const handleSaveAttachment = () => {
    onAddAttachment({
      workOrderId: workOrder.id,
      source: attachmentSource,
      note: attachmentNote.trim() || undefined,
      previewUrl: getAttachmentPreview(attachmentSource),
    });
    setAttachmentNote('');
    showSaved('Photo attached');
  };

  const handleStartWork = () => {
    onStartWork();
    showSaved('Work session started');
  };

  const handleFinishWork = () => {
    onFinishWork();
    showSaved('Work session finished');
  };

  return (
    <div className="min-h-screen bg-stone-200 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden font-sans">
      <div className="bg-stone-100 px-4 py-3 border-b-4 border-zinc-900 flex items-center justify-between sticky top-0 z-20 shadow-[0px_4px_0px_0px_rgba(24,24,27,1)]">
        <button
          onClick={onBack}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-orange-500 border-2 border-zinc-900 flex items-center justify-center transform -skew-x-12">
            <ClipboardList className="w-4 h-4 text-zinc-900" />
          </div>
          <h1 className="font-oswald font-bold text-xl tracking-widest text-zinc-900 uppercase">WORK ORDER</h1>
        </button>
        <button
          onClick={onBack}
          className="p-2 text-orange-600 font-mono font-bold text-xs uppercase tracking-widest hover:text-orange-700 transition-colors"
        >
          Field
        </button>
      </div>

      <main className="flex-1 overflow-y-auto pb-8">
        <section className="p-5 bg-zinc-900 text-stone-100 border-b-4 border-orange-500">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-orange-500">{workOrderNumber}</p>
              <h2 className="mt-1 font-oswald text-4xl font-bold uppercase leading-none break-words">{title}</h2>
            </div>
            <span className="shrink-0 px-2 py-1 bg-stone-100 text-zinc-900 rounded-sm border-2 border-orange-500 text-[10px] font-mono font-bold uppercase tracking-widest">
              {normalizedStatus.replace('_', ' ')}
            </span>
          </div>
          <div className="mt-4 space-y-1 text-[11px] font-mono font-bold uppercase tracking-wide text-zinc-300">
            <p className="flex items-center gap-2">
              <User className="w-3 h-3 text-orange-500" />
              {customerName}
            </p>
            {address && (
              <p className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-orange-500" />
                {address}
              </p>
            )}
            <p className="flex items-center gap-2 text-zinc-500">
              <Clock className="w-3 h-3 text-orange-500" />
              Created {new Date(createdAt).toLocaleDateString()}
            </p>
          </div>
          {normalizedStatus !== 'completed' && (
            <div className="mt-5">
              {canStartWork && (
                <button
                  onClick={handleStartWork}
                  className="w-full py-3 bg-orange-500 text-zinc-900 rounded-sm border-2 border-zinc-900 text-[10px] font-mono font-bold uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(250,250,249,0.35)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  Start Work
                </button>
              )}
              {canFinishWork && (
                <button
                  onClick={handleFinishWork}
                  className="w-full py-3 bg-lime-500 text-zinc-900 rounded-sm border-2 border-zinc-900 text-[10px] font-mono font-bold uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(250,250,249,0.35)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  Finish Today's Work
                </button>
              )}
            </div>
          )}
        </section>

        <section className="p-4 space-y-3">
          {panels.map(panel => {
            const Icon = panel.icon;
            return (
              <button
                key={panel.id}
                onClick={() => handleOpenPanel(panel.id)}
                className="w-full bg-stone-100 border-2 border-zinc-900 rounded-sm shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] p-4 flex items-start justify-between gap-3 text-left active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                <span className="flex items-start gap-3 min-w-0">
                  <span className="w-10 h-10 bg-stone-200 border-2 border-zinc-900 rounded-sm flex items-center justify-center text-orange-600">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-oswald text-xl font-bold uppercase tracking-wide text-zinc-900">{panel.label}</span>
                    <span className="block mt-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-orange-600">{panel.summary}</span>
                    {panel.detail && (
                      <span className="block mt-1 text-xs font-mono text-zinc-500 line-clamp-2">{panel.detail}</span>
                    )}
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 text-zinc-500 shrink-0 mt-2" />
              </button>
            );
          })}
        </section>
      </main>

      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed inset-0 z-50 bg-stone-200 flex flex-col max-w-md mx-auto shadow-2xl border-x-2 border-zinc-900"
          >
            <div className="bg-stone-100 px-4 py-4 border-b-4 border-zinc-900 flex items-center justify-between shadow-[0px_4px_0px_0px_rgba(24,24,27,1)]">
              <div>
                <h3 className="font-oswald font-bold text-2xl text-zinc-900 uppercase">{panelLabels[activePanel]}</h3>
                {panelMessage && (
                  <p className="mt-1 text-[10px] font-mono font-bold uppercase tracking-widest text-lime-700">{panelMessage}</p>
                )}
              </div>
              <button
                onClick={() => setActivePanel(null)}
                className="w-10 h-10 border-2 border-zinc-900 rounded-sm bg-stone-200 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {activePanel === 'job-notes' && (
                <>
                  <p className="text-xs font-mono font-bold uppercase leading-relaxed text-zinc-600">
                    Persistent notes stay with this job for future visits and future techs.
                  </p>
                  <textarea
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder="Job notes"
                    className="w-full min-h-[320px] p-4 bg-stone-100 rounded-sm border-2 border-zinc-900 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                  <button className="w-full py-4 bg-stone-100 text-zinc-900 rounded-sm border-2 border-zinc-900 font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                    <Mic className="w-5 h-5 text-orange-600" />
                    Record Note
                  </button>
                  {notes.length > 0 && (
                    <div className="space-y-2">
                      {notes.slice(0, 3).map(note => (
                        <div key={note.id} className="p-3 bg-stone-100 border-2 border-zinc-900 rounded-sm">
                          <p className="text-sm font-mono text-zinc-900">{note.note}</p>
                          <p className="mt-2 text-[9px] font-mono font-bold uppercase text-zinc-500">{new Date(note.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activePanel === 'todays-work' && (
                <>
                  <textarea
                    value={workText}
                    onChange={(event) => setWorkText(event.target.value)}
                    placeholder="What did you do?"
                    className="w-full min-h-[240px] p-4 bg-stone-100 rounded-sm border-2 border-zinc-900 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                  <input
                    value={workPart}
                    onChange={(event) => setWorkPart(event.target.value)}
                    placeholder="Optional part"
                    className="w-full p-4 bg-stone-100 rounded-sm border-2 border-zinc-900 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={() => setWorkPhotoAttached(current => !current)}
                    className={`w-full py-4 rounded-sm border-2 border-zinc-900 font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${workPhotoAttached ? 'bg-lime-500 text-zinc-900' : 'bg-stone-100 text-zinc-900'}`}
                  >
                    <Camera className="w-5 h-5 text-orange-600" />
                    {workPhotoAttached ? 'Photo Marked' : 'Optional Photo'}
                  </button>
                  {workEntries.length > 0 && (
                    <div className="space-y-2">
                      {workEntries.slice(0, 3).map(entry => (
                        <div key={entry.id} className="p-3 bg-stone-100 border-2 border-zinc-900 rounded-sm">
                          <p className="text-sm font-mono text-zinc-900">{entry.summary}</p>
                          <p className="mt-2 text-[9px] font-mono font-bold uppercase text-zinc-500">
                            {entry.optionalPart ? `Part: ${entry.optionalPart}` : 'No part'} {entry.photoAttached ? ' / Photo attached' : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activePanel === 'parts' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-[1fr_88px] gap-2">
                    <input
                      value={partName}
                      onChange={(event) => setPartName(event.target.value)}
                      placeholder="Part name"
                      className="w-full p-4 bg-stone-100 rounded-sm border-2 border-zinc-900 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="number"
                      min="1"
                      value={partQuantity}
                      onChange={(event) => setPartQuantity(event.target.value)}
                      placeholder="Qty"
                      className="w-full p-4 bg-stone-100 rounded-sm border-2 border-zinc-900 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  {parts.length > 0 && (
                    <div className="space-y-2">
                      {parts.map(part => (
                        <div key={part.id} className="p-3 bg-stone-100 border-2 border-zinc-900 rounded-sm flex items-center justify-between">
                          <span className="font-mono text-sm font-bold text-zinc-900">{part.name}</span>
                          <span className="font-mono text-xs font-bold uppercase text-orange-600">Qty {part.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activePanel === 'photos' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAttachmentSource('camera')}
                    className={`min-h-[140px] text-zinc-900 rounded-sm border-2 border-zinc-900 font-mono font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-3 ${attachmentSource === 'camera' ? 'bg-orange-500' : 'bg-stone-100'}`}
                  >
                    <Camera className="w-8 h-8 text-orange-600" />
                    Camera
                  </button>
                  <button
                    onClick={() => setAttachmentSource('upload')}
                    className={`min-h-[140px] text-zinc-900 rounded-sm border-2 border-zinc-900 font-mono font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-3 ${attachmentSource === 'upload' ? 'bg-orange-500' : 'bg-stone-100'}`}
                  >
                    <Upload className="w-8 h-8 text-orange-600" />
                    Upload
                  </button>
                  </div>
                  <input
                    value={attachmentNote}
                    onChange={(event) => setAttachmentNote(event.target.value)}
                    placeholder="Photo note"
                    className="w-full p-4 bg-stone-100 rounded-sm border-2 border-zinc-900 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {attachments.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {attachments.slice(0, 6).map(attachment => (
                        <div key={attachment.id} className="aspect-square rounded-sm border-2 border-zinc-900 overflow-hidden bg-stone-100">
                          <div className="h-full w-full flex items-end p-2" style={{ background: attachment.previewUrl ?? getAttachmentPreview(attachment.source) }}>
                            <span className="text-[8px] font-mono font-bold uppercase text-stone-100">{attachment.source}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activePanel === 'work-session' && (
                <>
                  {canStartWork && (
                    <button
                      onClick={handleStartWork}
                      className="w-full py-5 bg-orange-500 text-zinc-900 rounded-sm border-2 border-zinc-900 font-mono font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                    >
                      Start Work
                    </button>
                  )}
                  {canFinishWork && (
                    <button
                      onClick={handleFinishWork}
                      className="w-full py-5 bg-lime-500 text-zinc-900 rounded-sm border-2 border-zinc-900 font-mono font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                    >
                      Finish Today's Work
                    </button>
                  )}
                  {activeLaborSession && (
                    <div className="p-4 bg-zinc-900 text-stone-100 rounded-sm border-2 border-zinc-900">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-orange-500">Started</p>
                      <p className="mt-1 font-oswald text-2xl font-bold uppercase">{new Date(activeLaborSession.started_at).toLocaleTimeString()}</p>
                    </div>
                  )}
                  {latestCompletedSession && (
                    <div className="p-4 bg-stone-100 rounded-sm border-2 border-zinc-900">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-lime-700">Completed Session</p>
                      <p className="mt-1 font-oswald text-3xl font-bold uppercase text-zinc-900">{formatDuration(latestCompletedSession.durationMinutes)}</p>
                    </div>
                  )}
                  {normalizedStatus === 'completed' && (
                    <p className="p-4 bg-stone-100 rounded-sm border-2 border-zinc-900 text-xs font-mono font-bold uppercase text-zinc-600">This work order is completed.</p>
                  )}
                </>
              )}
            </div>

            <div className="p-4 bg-stone-100 border-t-4 border-zinc-900">
              {activePanel === 'job-notes' && (
                <button
                  onClick={handleSaveNote}
                  disabled={!noteText.trim()}
                  className="w-full py-4 bg-orange-500 disabled:bg-stone-300 disabled:text-zinc-500 text-zinc-900 rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  <Save className="w-5 h-5" />
                  Save Note
                </button>
              )}
              {activePanel === 'todays-work' && (
                <button
                  onClick={handleSaveWorkEntry}
                  disabled={!workText.trim()}
                  className="w-full py-4 bg-orange-500 disabled:bg-stone-300 disabled:text-zinc-500 text-zinc-900 rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  <Save className="w-5 h-5" />
                  Save Work
                </button>
              )}
              {activePanel === 'parts' && (
                <button
                  onClick={handleSavePart}
                  disabled={!partName.trim()}
                  className="w-full py-4 bg-orange-500 disabled:bg-stone-300 disabled:text-zinc-500 text-zinc-900 rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Save Part
                </button>
              )}
              {activePanel === 'photos' && (
                <button
                  onClick={handleSaveAttachment}
                  className="w-full py-4 bg-orange-500 text-zinc-900 rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  <Save className="w-5 h-5" />
                  Save Photo
                </button>
              )}
              {activePanel === 'work-session' && (
                <button
                  onClick={() => setActivePanel(null)}
                  className="w-full py-4 bg-stone-200 text-zinc-900 rounded-sm border-2 border-zinc-900 font-mono font-bold uppercase tracking-widest"
                >
                  Done
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SuggestionCard = ({
  quote,
  routingDecision,
  vendors,
  items,
  priceHistory,
  outreachDrafts,
  supabaseJobs,
  selectedSupabaseJobId,
  selectedSupabaseJob,
  supabaseError,
  comparableQuotesByLineId,
  loadingComparableLineId,
  comparisonError,
  onEdit,
  onExecuteAction,
  onSelectedSupabaseJobChange,
  onOpenVendorManager,
  onSaveOutreachDraft,
  onLoadComparableQuotes,
  onUseComparableQuote,
}: {
  quote: Partial<QuickQuote>;
  routingDecision: RoutingDecision | null;
  vendors: Vendor[];
  items: Item[];
  priceHistory: VendorItemPriceHistory[];
  outreachDrafts: SupplierOutreachDraft[];
  supabaseJobs: SupabaseJob[];
  selectedSupabaseJobId?: string;
  selectedSupabaseJob?: SupabaseJob;
  supabaseError?: string | null;
  comparableQuotesByLineId: Record<string, ComparableVendorQuote[]>;
  loadingComparableLineId: string | null;
  comparisonError: string | null;
  onEdit: (field: keyof QuickQuote, value: any) => void;
  onExecuteAction: (action: PrimaryAction) => void;
  onSelectedSupabaseJobChange: (jobId: string) => void;
  onOpenVendorManager: () => void;
  onSaveOutreachDraft: (draft: SupplierOutreachDraft) => void;
  onLoadComparableQuotes: (lineId: string, itemId: string) => void;
  onUseComparableQuote: (lineId: string, quote: ComparableVendorQuote) => void;
}) => {
  const confidenceColor = quote.confidence_score && quote.confidence_score > 0.8 ? 'text-lime-600' : 'text-amber-600';
  const selectedVendor = vendors.find(vendor => vendor.id === quote.vendorId);
  const actionTone: Record<PrimaryAction, string> = {
    generate_proposal: 'bg-orange-500 text-zinc-900',
    log_to_job: 'bg-lime-500 text-zinc-900',
    notify_office: 'bg-stone-100 text-zinc-900',
    escalate_emergency: 'bg-red-600 text-stone-100',
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-4 p-5 bg-stone-100 rounded-sm border-2 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)]"
    >
      <div className="flex justify-between items-start mb-4 border-b-2 border-zinc-200 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-orange-600 mb-1 block">Analyzed Data</span>
          <h3 className="text-2xl font-oswald font-bold text-zinc-900 uppercase">{quote.suggested_job_type}</h3>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 bg-zinc-900 rounded-sm border-2 border-zinc-900 ${confidenceColor}`}>
          <CheckCircle2 className="w-3 h-3" />
          <span className="text-[10px] font-mono font-bold">{(quote.confidence_score! * 100).toFixed(0)}% MATCH</span>
        </div>
      </div>

      <div className="space-y-4">
        {routingDecision && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-stone-200 rounded-sm border-2 border-zinc-900">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 block mb-1">Linked Job</span>
                <p className="font-oswald font-bold text-zinc-900 uppercase leading-tight">
                  {routingDecision.jobMatch?.workOrderId ?? routingDecision.jobMatch?.customerName ?? 'Office Match Needed'}
                </p>
                <p className="text-[10px] font-mono font-bold uppercase text-zinc-500 mt-1">
                  {routingDecision.jobMatch ? `${routingDecision.jobMatch.matchType.replace(/_/g, ' ')} / ${Math.round(routingDecision.jobMatch.confidence * 100)}%` : 'No confident match'}
                </p>
              </div>
              <button
                onClick={() => onEdit('is_urgent', !quote.is_urgent)}
                className={`p-3 rounded-sm border-2 border-zinc-900 text-left transition-all active:translate-x-[2px] active:translate-y-[2px] ${quote.is_urgent ? 'bg-amber-500 text-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)]' : 'bg-stone-200 text-zinc-600'}`}
              >
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest block mb-1">Urgent Toggle</span>
                <span className="font-oswald font-bold uppercase">{quote.is_urgent ? 'Urgent' : 'Default'}</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Suggested Actions</span>
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-500">{routingDecision.targetQueue.replace('_', ' ')}</span>
              </div>
              <div className="grid gap-2">
                {routingDecision.suggestedActions.map((suggestion) => (
                  <button
                    key={suggestion.action}
                    onClick={() => onExecuteAction(suggestion.action)}
                    className={`w-full p-4 rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-left ${actionTone[suggestion.action]}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-oswald text-xl font-bold uppercase tracking-wide">{suggestion.label}</span>
                      <span className="text-[10px] font-mono font-bold uppercase">{Math.round(suggestion.confidence * 100)}%</span>
                    </div>
                    <p className="mt-1 text-[10px] font-mono font-bold uppercase opacity-75">{suggestion.reason}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <details className="group rounded-sm border-2 border-zinc-900 bg-stone-200">
          <summary className="cursor-pointer list-none p-3 flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-600">Supporting Extracted Data</span>
            <ChevronDown className="w-4 h-4 text-zinc-900 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="p-3 pt-0 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-stone-200 rounded-sm border-2 border-zinc-900">
            <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 block mb-1">Materials</span>
            <div className="flex items-center gap-1">
              <span className="text-zinc-400 font-mono font-bold">$</span>
              <input 
                type="number" 
                value={quote.estimated_material_cost || 0}
                onChange={(e) => onEdit('estimated_material_cost', parseFloat(e.target.value))}
                className="w-full bg-transparent font-mono font-bold text-zinc-900 focus:outline-none"
              />
            </div>
          </div>
          <div className="p-3 bg-stone-200 rounded-sm border-2 border-zinc-900">
            <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 block mb-1">Labor</span>
            <div className="flex items-center gap-1">
              <span className="text-zinc-400 font-mono font-bold">$</span>
              <input 
                type="number" 
                value={quote.estimated_labor_cost || 0}
                onChange={(e) => onEdit('estimated_labor_cost', parseFloat(e.target.value))}
                className="w-full bg-transparent font-mono font-bold text-zinc-900 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {quote.flat_rate_low && (
          <div className="flex items-center justify-between px-4 py-2 bg-orange-500/10 rounded-sm border-2 border-orange-500">
            <span className="text-xs font-mono font-bold text-orange-700 uppercase">Flat Rate Range</span>
            <span className="text-xs font-mono font-bold text-orange-700">${quote.flat_rate_low} – ${quote.flat_rate_high}</span>
          </div>
        )}

        {isSupabaseConfigured && (
          <div className="p-3 bg-stone-200 rounded-sm border-2 border-zinc-900">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 block mb-2">Supabase Job</span>
            {supabaseJobs.length > 0 ? (
              <select
                value={selectedSupabaseJobId ?? ''}
                onChange={(event) => onSelectedSupabaseJobChange(event.target.value)}
                className="w-full p-3 bg-stone-100 rounded-sm border-2 border-zinc-900 text-xs font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {supabaseJobs.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.jobId} - {job.customerName || 'Active job'}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[10px] font-mono font-bold uppercase text-zinc-500">
                {supabaseError ?? 'No Supabase jobs loaded yet.'}
              </p>
            )}
            {selectedSupabaseJob && (
              <p className="mt-2 text-[10px] font-mono font-bold uppercase text-zinc-600">
                Compare choices save to parts usage for {selectedSupabaseJob.jobId}.
              </p>
            )}
          </div>
        )}

        <div className="p-3 bg-stone-200 rounded-sm border-2 border-zinc-900">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-500" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Vendor</span>
            </div>
            <button
              onClick={onOpenVendorManager}
              className="text-[10px] font-mono font-bold uppercase text-orange-600 hover:text-orange-700"
            >
              Manage
            </button>
          </div>
          <select
            value={quote.vendorId ?? ''}
            onChange={(event) => onEdit('vendorId', event.target.value || undefined)}
            className="w-full p-3 bg-stone-100 rounded-sm border-2 border-zinc-900 text-xs font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
          >
            <option value="">No vendor assigned</option>
            {vendors.map(vendor => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.preferred ? '* ' : ''}{vendor.name} - {vendor.category}
              </option>
            ))}
          </select>
          {selectedVendor && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold uppercase text-zinc-600">
              {selectedVendor.preferred && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500 text-zinc-900 rounded-sm border-2 border-zinc-900">
                  <Star className="w-3 h-3 fill-zinc-900" />
                  Preferred
                </span>
              )}
              <span>{selectedVendor.paymentTerms}</span>
              <span>{selectedVendor.leadTimeDays} day lead</span>
            </div>
          )}
        </div>

        <MaterialPriceMemory
          materials={quote.materials ?? []}
          items={items}
          vendors={vendors}
          selectedVendorId={quote.vendorId}
          selectedJob={selectedSupabaseJob}
          priceHistory={priceHistory}
          outreachDrafts={outreachDrafts}
          comparableQuotesByLineId={comparableQuotesByLineId}
          loadingComparableLineId={loadingComparableLineId}
          comparisonError={comparisonError}
          onChange={(materials) => onEdit('materials', materials)}
          onVendorChange={(vendorId) => onEdit('vendorId', vendorId)}
          onSaveOutreachDraft={onSaveOutreachDraft}
          onLoadComparableQuotes={onLoadComparableQuotes}
          onUseComparableQuote={onUseComparableQuote}
        />

        <div className="pt-4 border-t-2 border-zinc-200 flex items-center justify-between">
          <span className="text-sm font-oswald font-bold text-zinc-900 uppercase tracking-wider">Internal Budget</span>
            <span className="text-3xl font-oswald font-black text-zinc-900">${quote.estimated_total}</span>
          </div>
          </div>
        </details>

        {/* Tags Section */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-4 h-4 text-zinc-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Tags</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quote.tags?.map((tag, i) => (
              <span key={i} className="px-2 py-1 bg-zinc-900 text-stone-100 text-[10px] font-mono font-bold rounded-sm border-2 border-zinc-900 uppercase">
                {tag}
              </span>
            ))}
            <button 
              onClick={() => {
                const newTag = prompt("Enter new tag:");
                if (newTag) {
                  onEdit('tags', [...(quote.tags || []), newTag]);
                }
              }}
              className="px-2 py-1 bg-stone-200 text-zinc-900 text-[10px] font-mono font-bold rounded-sm border-2 border-zinc-900 border-dashed uppercase hover:bg-stone-300 transition-colors"
            >
              + Add Tag
            </button>
          </div>
        </div>

        {quote.missing_items && quote.missing_items.length > 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 rounded-sm border-2 border-amber-500">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-mono font-bold text-amber-700 uppercase tracking-tight">Missing Data:</span>
            </div>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
              {quote.missing_items.map((item, i) => (
                <li key={i} className="text-[10px] font-mono text-amber-800 flex items-center gap-1 uppercase">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-sm"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Proof of Presence Section */}
        <div className="mt-4 pt-4 border-t-2 border-zinc-200">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Proof of Presence</span>
          </div>
          
          {/* Photo Evidence */}
          {quote.photos && quote.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {quote.photos.map((photo, i) => (
                <div key={i} className="aspect-square rounded-sm overflow-hidden border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]">
                  <img 
                    src={photo} 
                    alt={`Evidence ${i}`} 
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {quote.location && (
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 bg-stone-200 border-2 border-zinc-300 p-2 rounded-sm">
                <Navigation className="w-3 h-3 text-orange-500" />
                <span className="font-mono font-bold">GPS: {quote.location.latitude.toFixed(4)}, {quote.location.longitude.toFixed(4)}</span>
                <span className="ml-auto font-mono text-zinc-400">ACC: {quote.location.accuracy?.toFixed(0)}M</span>
              </div>
            )}
            {quote.audit_trail?.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px] text-zinc-600 font-mono">
                <Clock className="w-3 h-3 mt-0.5 text-zinc-400" />
                <div>
                  <span className="font-bold text-zinc-900 uppercase">{entry.action}:</span> {entry.details}
                  <span className="block text-[9px] text-zinc-400 mt-0.5">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'landing' | 'app' | 'work-orders' | 'operations'>('landing');
  const [mode, setMode] = useState<'field' | 'ops'>('field');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [suggestedQuote, setSuggestedQuote] = useState<Partial<QuickQuote> | null>(null);
  const [jobIntent, setJobIntent] = useState<string>('Proposal');
  const [customer] = useState<Customer>(MOCK_CUSTOMERS[0]);
  const [vendors, setVendors] = usePersistentCollection<Vendor>('vendors', MOCK_VENDORS);
  const [items] = usePersistentCollection<Item>('items', MOCK_ITEMS);
  const [priceHistory, setPriceHistory] = usePersistentCollection<VendorItemPriceHistory>('vendorItemPriceHistory', MOCK_VENDOR_ITEM_PRICE_HISTORY);
  const [supplierOutreachDrafts, setSupplierOutreachDrafts] = usePersistentCollection<SupplierOutreachDraft>('supplierOutreachDrafts', []);
  const [supabaseJobs, setSupabaseJobs] = useState<SupabaseJob[]>([]);
  const [supabaseVendors, setSupabaseVendors] = useState<Vendor[]>([]);
  const [supabaseItems, setSupabaseItems] = useState<Item[]>([]);
  const [selectedSupabaseJobId, setSelectedSupabaseJobId] = useState<string>('');
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [comparableQuotesByLineId, setComparableQuotesByLineId] = useState<Record<string, ComparableVendorQuote[]>>({});
  const [loadingComparableLineId, setLoadingComparableLineId] = useState<string | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [inputType, setInputType] = useState<InputType>('typed');
  const [routingDecision, setRoutingDecision] = useState<RoutingDecision | null>(null);
  const [history, setHistory] = usePersistentCollection<Partial<QuickQuote> & { id: string }>('quickQuotes', [
    {
      id: 'q_demo_1',
      customer_id: 'cust_1',
      source_input_text: 'Customer needs AC tune-up and likely a capacitor from the counter.',
      source_input_type: 'typed',
      suggested_job_type: 'AC Tune-up / Inspection',
      estimated_material_cost: 85,
      estimated_labor_cost: 125,
      estimated_subcontractor_cost: 0,
      estimated_total: 210,
      confidence_score: 0.91,
      reasoning: 'Demo capture seeded for vendor assignment testing.',
      status: 'reviewed',
      created_by: 'demo',
      created_at: '2026-04-10T15:30:00.000Z',
      vendorId: 'vendor_1',
      materials: [
        {
          id: 'material_demo_1',
          itemId: 'item_1',
          quantity: 1,
          unitPrice: 34.5,
          notes: 'Likely capacitor from counter stock.',
        },
      ],
      tags: ['HVAC', 'Proposal'],
    },
  ]);
  const [invoices, setInvoices] = usePersistentCollection<Invoice>('invoices', []);
  const [workOrders, setWorkOrders] = usePersistentCollection<WorkOrder>('workOrders', [
    {
      id: 'WO-demo-1',
      work_order_number: 'WO-1001',
      title: 'AC Tune-up / Inspection',
      customer_name: 'Acme Property Group',
      address: '1428 Elm Street, Springfield',
      created_at: '2026-04-10T15:30:00.000Z',
      quote_id: 'q_demo_1',
      customer_id: 'cust_1',
      job_type: 'AC Tune-up / Inspection',
      status: 'scheduled',
      vendorId: 'vendor_1',
      materials: [
        {
          id: 'material_demo_1',
          itemId: 'item_1',
          quantity: 1,
          unitPrice: 34.5,
          notes: 'Likely capacitor from counter stock.',
        },
      ],
      tags: ['HVAC', 'Proposal'],
    },
  ]);
  const [workOrderNotes, setWorkOrderNotes] = usePersistentCollection<WorkOrderNote>('workOrderNotes', []);
  const [workOrderWorkEntries, setWorkOrderWorkEntries] = usePersistentCollection<WorkOrderWorkEntry>('workOrderWorkEntries', []);
  const [workOrderParts, setWorkOrderParts] = usePersistentCollection<WorkOrderPart>('workOrderParts', []);
  const [workOrderAttachments, setWorkOrderAttachments] = usePersistentCollection<WorkOrderAttachment>('workOrderAttachments', []);
  const [laborSessions, setLaborSessions] = usePersistentCollection<LaborSession>('laborSessions', []);
  const [opsQueueItems, setOpsQueueItems] = usePersistentCollection<OpsQueueItem>('opsQueueItems', []);
  const [showHistory, setShowHistory] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showVendorManager, setShowVendorManager] = useState(false);
  const [isEndOfDayModalOpen, setIsEndOfDayModalOpen] = useState(false);
  const [showProfitRealityCheck, setShowProfitRealityCheck] = useState(false);
  const [messyInputs, setMessyInputs] = useState<Partial<QuickQuote>[]>([]);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        handleInterpret(transcript, 'voice');
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isCancelled = false;

    const loadSupabaseSlice = async () => {
      try {
        const [jobs, remoteVendors, remoteItems] = await Promise.all([
          getJobs(),
          getVendors(),
          getItems(),
        ]);

        if (isCancelled) return;

        setSupabaseJobs(jobs);
        setSupabaseVendors(remoteVendors);
        setSupabaseItems(remoteItems);
        setSelectedSupabaseJobId(currentJobId => currentJobId || jobs[0]?.id || '');
        setSupabaseError(null);
      } catch (error) {
        console.warn('Could not load Supabase comparison data', error);
        if (!isCancelled) {
          setSupabaseError('Supabase comparison data could not be loaded.');
        }
      }
    };

    loadSupabaseSlice();

    return () => {
      isCancelled = true;
    };
  }, []);

  const activeVendors = supabaseVendors.length > 0 ? supabaseVendors : vendors;
  const activeItems = supabaseItems.length > 0 ? supabaseItems : items;
  const selectedSupabaseJob = supabaseJobs.find(job => job.id === selectedSupabaseJobId);

  const buildJobCandidates = (): JobMatchingCandidate[] => {
    const localWorkOrders = workOrders.map(workOrder => {
      const matchedCustomer = MOCK_CUSTOMERS.find(currentCustomer => currentCustomer.id === workOrder.customer_id);
      return {
        id: workOrder.quote_id,
        workOrderId: workOrder.id,
        customerId: workOrder.customer_id,
        customerName: workOrder.customer_name ?? matchedCustomer?.name,
        address: workOrder.address ?? matchedCustomer?.address,
        status: workOrder.status,
        createdAt: workOrder.created_at ?? workOrder.scheduled_date ?? new Date().toISOString(),
        location: matchedCustomer?.id === customer.id && suggestedQuote?.location
          ? { latitude: suggestedQuote.location.latitude, longitude: suggestedQuote.location.longitude }
          : undefined,
      };
    });

    const remoteJobs = supabaseJobs.map(job => ({
      id: job.id,
      workOrderId: job.jobId,
      customerName: job.customerName,
      status: job.status,
      createdAt: job.createdAt,
    }));

    return [...localWorkOrders, ...remoteJobs];
  };

  const handleLoadComparableQuotes = async (lineId: string, itemId: string) => {
    if (!selectedSupabaseJobId) {
      setComparisonError('Select a Supabase job before comparing vendors.');
      return;
    }

    setLoadingComparableLineId(lineId);
    setComparisonError(null);

    try {
      const quotes = await getComparableQuotesForItem(selectedSupabaseJobId, itemId);
      setComparableQuotesByLineId(current => ({
        ...current,
        [lineId]: quotes,
      }));
    } catch (error) {
      console.warn('Could not load comparable quotes', error);
      setComparisonError('Could not load Supabase quote responses.');
    } finally {
      setLoadingComparableLineId(null);
    }
  };

  const handleUseComparableQuote = async (lineId: string, comparableQuote: ComparableVendorQuote) => {
    if (!suggestedQuote) return;

    const updatedMaterials = (suggestedQuote.materials ?? []).map(line =>
      line.id === lineId
        ? {
            ...line,
            itemId: comparableQuote.itemId,
            quantity: comparableQuote.quantity,
            unitPrice: comparableQuote.unitPrice,
            varianceHandling: 'intentional' as const,
            varianceHandledAt: new Date().toISOString(),
          }
        : line
    );
    const estimatedMaterialCost = updatedMaterials.reduce((sum, line) => sum + line.quantity * (line.unitPrice ?? 0), 0);
    const updatedQuote = {
      ...suggestedQuote,
      vendorId: comparableQuote.vendorId,
      materials: updatedMaterials,
      estimated_material_cost: estimatedMaterialCost,
      estimated_total: estimatedMaterialCost + (suggestedQuote.estimated_labor_cost ?? 0) + (suggestedQuote.estimated_subcontractor_cost ?? 0),
    };

    setSuggestedQuote(updatedQuote);
    setComparisonError(null);

    try {
      await createOrUpdatePartsUsage(comparableQuote, true);
    } catch (error) {
      console.warn('Could not persist parts usage', error);
      setComparisonError('Vendor choice updated locally, but parts usage could not be saved.');
    }
  };

  const handleInterpret = async (text: string, type: InputType) => {
    if (!text.trim()) return;
    setIsInterpreting(true);
    setInputType(type);
    
    // Capture location
    let locationData = undefined;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
    } catch (e) {
      console.warn("Could not capture location", e);
    }

    const result = await interpretQuote(text, type);
    const presence = {
      timestamp: new Date().toISOString(),
      location: locationData,
      photoCount: suggestedQuote?.photos?.length ?? 0,
      capturedBy: 'field-tech-demo',
    };
    const normalizedCapture = normalizeCapture({
      text,
      inputType: type,
      presence,
      customer,
      selectedJobId: selectedSupabaseJobId,
      quote: result,
    });
    const suggestedActions = detectSuggestedActions(normalizedCapture);
    const jobMatch = matchJob({
      normalizedCapture,
      candidates: buildJobCandidates(),
    });
    const baseDecision = buildRoutingDecision(normalizedCapture, suggestedActions, jobMatch);
    const decision: RoutingDecision = jobIntent === 'Urgent'
      ? {
          ...baseDecision,
          urgency: 'urgent',
          priority: baseDecision.isEmergency ? 'emergency' : 'urgent',
          reasons: [
            ...baseDecision.reasons.filter(reason => !reason.toLowerCase().includes('urgent flag')),
            'Urgent flag raises queue priority.',
          ],
        }
      : baseDecision;
    
    // Apply selected job intent/priority
    result.is_urgent = jobIntent === 'Urgent' || decision.urgency === 'urgent';
    result.is_emergency = jobIntent === 'Emergency' || decision.isEmergency;
    if (jobIntent === 'Proposal' || jobIntent === 'Complete') {
      if (!result.tags?.includes(jobIntent)) {
        result.tags = [...(result.tags || []), jobIntent];
      }
    }
    
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'Captured',
      details: `Initial ${type} input captured at job site.`
    };

    setSuggestedQuote({
      ...result,
      location: locationData,
      audit_trail: [auditEntry]
    });
    setRoutingDecision(decision);
    setIsInterpreting(false);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInputText('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleEdit = (field: keyof QuickQuote, value: any) => {
    if (!suggestedQuote) return;
    const updated = { ...suggestedQuote, [field]: value };
    
    // Sync dropdown state
    if (field === 'is_urgent' && value) setJobIntent('Urgent');
    if (field === 'is_emergency' && value) setJobIntent('Emergency');
    if (field === 'is_urgent' && !value && jobIntent === 'Urgent') setJobIntent('Proposal');
    if (field === 'is_emergency' && !value && jobIntent === 'Emergency') setJobIntent('Proposal');

    // Recalculate total if costs change
    if (field === 'estimated_material_cost' || field === 'estimated_labor_cost' || field === 'estimated_subcontractor_cost') {
      updated.estimated_total = (updated.estimated_material_cost || 0) + 
                                (updated.estimated_labor_cost || 0) + 
                                (updated.estimated_subcontractor_cost || 0);
    }

    if (field === 'is_urgent' && routingDecision) {
      setRoutingDecision({
        ...routingDecision,
        urgency: value ? 'urgent' : 'default',
        priority: routingDecision.isEmergency ? 'emergency' : value ? 'urgent' : 'normal',
        reasons: [
          ...routingDecision.reasons.filter(reason => !reason.toLowerCase().includes('urgent flag')),
          value ? 'Urgent flag raises queue priority.' : 'Default urgency.',
        ],
      });
    }
    
    setSuggestedQuote(updated);
  };

  const handleSaveVendor = (vendor: Vendor) => {
    setVendors(currentVendors => {
      const exists = currentVendors.some(existingVendor => existingVendor.id === vendor.id);
      return exists
        ? currentVendors.map(existingVendor => existingVendor.id === vendor.id ? vendor : existingVendor)
        : [vendor, ...currentVendors];
    });
  };

  const buildPriceMemoryEntries = (
    quote: Partial<QuickQuote>,
    sourceType: 'capture' | 'work_order',
    sourceId: string
  ): VendorItemPriceHistory[] => {
    if (!quote.vendorId || !quote.materials?.length) return [];

    return quote.materials
      .filter((line): line is MaterialLine & { unitPrice: number } => Boolean(line.itemId) && line.quantity > 0 && typeof line.unitPrice === 'number' && line.unitPrice > 0)
      .map((line) => ({
        id: `price_${sourceType}_${sourceId}_${line.id}`,
        vendorId: quote.vendorId!,
        itemId: line.itemId,
        price: line.unitPrice,
        quantity: line.quantity,
        currency: 'USD' as const,
        date: new Date().toISOString(),
        sourceType,
        sourceId,
        notes: line.notes,
      }));
  };

  const rememberPricesFromQuote = (
    quote: Partial<QuickQuote>,
    sourceType: 'capture' | 'work_order',
    sourceId: string
  ) => {
    const newEntries = buildPriceMemoryEntries(quote, sourceType, sourceId);
    if (newEntries.length === 0) return;

    setPriceHistory(currentEntries => {
      const newIds = new Set(newEntries.map(entry => entry.id));
      return [...newEntries, ...currentEntries.filter(entry => !newIds.has(entry.id))];
    });
  };

  const handleSave = () => {
    if (!suggestedQuote) return;

    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'Saved',
      details: `Draft finalized and saved to internal job budget.${suggestedQuote.is_urgent ? ' Marked as URGENT.' : ''}${suggestedQuote.is_emergency ? ' Marked as EMERGENCY.' : ''}${suggestedQuote.photos?.length ? ` Attached ${suggestedQuote.photos.length} photos.` : ''}`
    };

    const finalQuote = {
      ...suggestedQuote,
      id: `q_${Date.now()}`,
      customer_id: customer.id,
      status: 'draft' as const,
      created_at: new Date().toISOString(),
      audit_trail: [...(suggestedQuote.audit_trail || []), auditEntry]
    };
    rememberPricesFromQuote(finalQuote, 'capture', finalQuote.id);
    setHistory([finalQuote, ...history]);
    setSuggestedQuote(null);
    setRoutingDecision(null);
    setInputText('');
    setJobIntent('Proposal');
    // In a real app, this would send to a database
    alert("Quote anchored to reality. Proof of Presence captured.");
  };

  const handleSendToOffice = () => {
    if (!suggestedQuote) return;
    
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'Sent',
      details: `Quote sent to office for review and formalization.${suggestedQuote.is_urgent ? ' Marked as URGENT.' : ''}${suggestedQuote.is_emergency ? ' Marked as EMERGENCY.' : ''}`
    };

    if (suggestedQuote.is_emergency) {
      // Simulate routing to Teams/Slack
      console.log("EMERGENCY ROUTING TRIGGERED: Sending to Teams/Slack channel...");
      alert("EMERGENCY: This quote has been routed immediately to the office via internal chat tools.");
    }

    const finalQuote = {
      ...suggestedQuote,
      id: `q_${Date.now()}`,
      customer_id: customer.id,
      status: 'reviewed' as const,
      created_at: new Date().toISOString(),
      audit_trail: [...(suggestedQuote.audit_trail || []), auditEntry]
    };
    rememberPricesFromQuote(finalQuote, 'capture', finalQuote.id);
    setHistory([finalQuote, ...history]);
    setSuggestedQuote(null);
    setRoutingDecision(null);
    setInputText('');
    setJobIntent('Proposal');
    if (!suggestedQuote.is_emergency) {
      alert("Quote sent to office for review.");
    }
  };

  const handleExecuteSuggestedAction = (action: PrimaryAction) => {
    if (!suggestedQuote || !routingDecision) return;

    const actionDecision = buildRoutingDecision(
      routingDecision.normalizedCapture,
      routingDecision.suggestedActions.map(suggestion => ({
        ...suggestion,
        primary: suggestion.action === action,
      })),
      routingDecision.jobMatch
    );
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'Routed',
      details: `${action.replace(/_/g, ' ')} routed to ${actionDecision.targetQueue.replace(/_/g, ' ')}.${actionDecision.priority !== 'normal' ? ` Priority: ${actionDecision.priority}.` : ''}`,
    };
    const finalQuote = {
      ...suggestedQuote,
      id: `q_${Date.now()}`,
      customer_id: customer.id,
      status: action === 'log_to_job' ? 'formalized' as const : 'reviewed' as const,
      is_urgent: actionDecision.priority === 'urgent',
      is_emergency: actionDecision.isEmergency,
      created_at: new Date().toISOString(),
      audit_trail: [...(suggestedQuote.audit_trail || []), auditEntry],
    };
    const queueItem = createOpsQueueItem(actionDecision, {
      id: finalQuote.id,
      suggested_job_type: finalQuote.suggested_job_type,
      confidence_score: finalQuote.confidence_score,
    });

    rememberPricesFromQuote(finalQuote, 'capture', finalQuote.id);
    setHistory([finalQuote, ...history]);
    setOpsQueueItems([queueItem, ...opsQueueItems]);
    setSuggestedQuote(null);
    setRoutingDecision(null);
    setInputText('');
    setJobIntent('Proposal');

    if (action === 'escalate_emergency') {
      alert('Emergency escalated to the office queue immediately.');
      return;
    }

    alert(`${queueItem.title} routed to ${queueItem.queue.replace(/_/g, ' ')}.`);
  };

  const handleCapturePhoto = (photo: string) => {
    if (!suggestedQuote) {
      // If no quote exists, create a placeholder one to attach the photo to
      setSuggestedQuote({
        suggested_job_type: 'New Job Capture',
        estimated_material_cost: 0,
        estimated_labor_cost: 0,
        estimated_subcontractor_cost: 0,
        estimated_total: 0,
        confidence_score: 1,
        reasoning: 'Manual photo capture initiated.',
        photos: [photo],
        is_urgent: jobIntent === 'Urgent',
        is_emergency: jobIntent === 'Emergency',
        tags: ['Photo Capture', ...(jobIntent === 'Proposal' || jobIntent === 'Complete' ? [jobIntent] : [])],
        audit_trail: [{
          timestamp: new Date().toISOString(),
          action: 'Photo Captured',
          details: 'Visual evidence captured at job site.'
        }]
      });
    } else {
      const updatedPhotos = [...(suggestedQuote.photos || []), photo];
      const auditEntry = {
        timestamp: new Date().toISOString(),
        action: 'Photo Added',
        details: 'Visual evidence attached to current capture.'
      };
      setSuggestedQuote({
        ...suggestedQuote,
        photos: updatedPhotos,
        audit_trail: [...(suggestedQuote.audit_trail || []), auditEntry]
      });
    }
    setShowPhotoCapture(false);
  };

  const handleFormalize = (quote: Partial<QuickQuote>) => {
    // 1. Update quote status
    const updatedHistory = history.map(q => 
      q.id === quote.id ? { ...q, status: 'formalized' as const } : q
    );
    setHistory(updatedHistory);

    // 2. Create Work Order
    const matchedCustomer = MOCK_CUSTOMERS.find(currentCustomer => currentCustomer.id === quote.customer_id);
    const newWO: WorkOrder = {
      id: `WO-${Date.now()}`,
      work_order_number: `WO-${Date.now().toString().slice(-6)}`,
      title: quote.suggested_job_type ?? 'Untitled Work Order',
      customer_name: matchedCustomer?.name ?? 'Customer placeholder',
      address: matchedCustomer?.address,
      created_at: new Date().toISOString(),
      quote_id: quote.id!,
      customer_id: quote.customer_id!,
      job_type: quote.suggested_job_type ?? 'Untitled Work Order',
      status: 'scheduled',
      vendorId: quote.vendorId,
      materials: quote.materials,
      tags: quote.tags
    };
    rememberPricesFromQuote(quote, 'work_order', newWO.id);
    setWorkOrders([newWO, ...workOrders]);

    alert("Quote formalized. Work Order generated.");
  };

  const handleCompleteWorkOrder = (woId: string) => {
    const wo = workOrders.find(w => w.id === woId);
    if (!wo) return;

    // 1. Update Work Order status
    const updatedWOs = workOrders.map(w => 
      w.id === woId ? { ...w, status: 'completed' as const } : w
    );
    setWorkOrders(updatedWOs);

    // 2. Find the original quote to get the amount
    const quote = history.find(q => q.id === wo.quote_id);
    if (quote) {
      // 3. Create Invoice upon completion
      const newInvoice: Invoice = {
        id: `INV-${Date.now()}`,
        quote_id: quote.id!,
        customer_id: quote.customer_id!,
        amount: quote.estimated_total!,
        status: 'pending',
        created_at: new Date().toISOString(),
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      };
      setInvoices([newInvoice, ...invoices]);
      alert("Job completed. Invoice generated automatically.");
    }
  };

  const handleRunEndOfDayReview = () => {
    // Simulate finding "messy" inputs from the day
    let messy = history.filter(q => q.status === 'draft' || q.confidence_score! < 0.7);
    
    if (messy.length === 0) {
      // For demo purposes, if no messy inputs, add some mock ones
      messy = [
        {
          id: 'messy-1',
          suggested_job_type: 'AC Not Cooling',
          source_input_text: 'unit outside is making a loud buzzing sound and not spinning, customer says it started this morning',
          estimated_total: 450,
          confidence_score: 0.6,
          is_urgent: true,
          status: 'draft',
          vendorId: 'vendor_1',
          materials: [{ id: 'messy_material_1', itemId: 'item_1', quantity: 1, unitPrice: 34.5 }],
          tags: ['HVAC', 'Repair']
        },
        {
          id: 'messy-2',
          suggested_job_type: 'Water Heater Leak',
          source_input_text: 'small puddle under the tank, looks like it is coming from the bottom valve',
          estimated_total: 800,
          confidence_score: 0.8,
          status: 'draft',
          vendorId: 'vendor_2',
          materials: [{ id: 'messy_material_2', itemId: 'item_2', quantity: 1, unitPrice: 642 }],
          tags: ['Plumbing', 'Proposal']
        },
        {
          id: 'messy-3',
          suggested_job_type: 'Drain Clog',
          source_input_text: 'kitchen sink backed up, tried plunging but no luck',
          estimated_total: 150,
          confidence_score: 0.9,
          status: 'draft',
          vendorId: 'vendor_3',
          materials: [{ id: 'messy_material_3', itemId: 'item_3', quantity: 1, unitPrice: 72 }],
          tags: ['Plumbing', 'Complete']
        }
      ];
    }

    setMessyInputs(messy);
    setIsEndOfDayModalOpen(true);
  };

  const handleMarkMessyDone = (id: string) => {
    // Update the status in history to 'reviewed'
    const updatedHistory = history.map(q => 
      q.id === id ? { ...q, status: 'reviewed' as const } : q
    );
    setHistory(updatedHistory);
  };

  const handleGenerateInvoice = (quote: Partial<QuickQuote>) => {
    const newInvoice: Invoice = {
      id: `INV-${Date.now()}`,
      quote_id: quote.id!,
      customer_id: quote.customer_id!,
      amount: quote.estimated_total!,
      status: 'pending',
      created_at: new Date().toISOString(),
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    };
    setInvoices([newInvoice, ...invoices]);
    alert("Invoice generated.");
  };

  const handleMarkAsPaid = (invoiceId: string) => {
    const updatedInvoices = invoices.map(inv => 
      inv.id === invoiceId ? { ...inv, status: 'paid' as const } : inv
    );
    setInvoices(updatedInvoices);

    // Also update the quote status if all invoices for it are paid (simplified)
    const invoice = invoices.find(i => i.id === invoiceId);
    if (invoice) {
      const updatedHistory = history.map(q => 
        q.id === invoice.quote_id ? { ...q, status: 'invoiced' as const } : q
      );
      setHistory(updatedHistory);
    }
    
    alert("Invoice marked as paid.");
  };

  const getVendor = (vendorId?: string) => activeVendors.find(vendor => vendor.id === vendorId);

  const updateWorkOrderStatus = (workOrderId: string, status: WorkOrder['status']) => {
    setWorkOrders(currentWorkOrders => currentWorkOrders.map(currentWorkOrder => (
      currentWorkOrder.id === workOrderId ? { ...currentWorkOrder, status } : currentWorkOrder
    )));
  };

  const handleAddWorkOrderNote = (note: Omit<WorkOrderNote, 'id' | 'createdAt'>) => {
    setWorkOrderNotes(currentNotes => [
      {
        ...note,
        id: `won-${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
      ...currentNotes,
    ]);
  };

  const handleAddWorkOrderWorkEntry = (entry: Omit<WorkOrderWorkEntry, 'id' | 'createdAt'>) => {
    setWorkOrderWorkEntries(currentEntries => [
      {
        ...entry,
        id: `wowe-${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
      ...currentEntries,
    ]);
  };

  const handleAddWorkOrderPart = (part: Omit<WorkOrderPart, 'id' | 'createdAt'>) => {
    setWorkOrderParts(currentParts => [
      {
        ...part,
        id: `wop-${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
      ...currentParts,
    ]);
  };

  const handleAddWorkOrderAttachment = (attachment: Omit<WorkOrderAttachment, 'id' | 'createdAt'>) => {
    setWorkOrderAttachments(currentAttachments => [
      {
        ...attachment,
        id: `woa-${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
      ...currentAttachments,
    ]);
  };

  const handleStartLaborSession = (workOrderId: string) => {
    const alreadyActive = laborSessions.some(session => session.workOrderId === workOrderId && !session.ended_at);
    if (alreadyActive) return;

    setLaborSessions(currentSessions => [
      {
        id: `labor-${Date.now()}`,
        workOrderId,
        started_at: new Date().toISOString(),
      },
      ...currentSessions,
    ]);
    updateWorkOrderStatus(workOrderId, 'in_progress');
  };

  const handleFinishLaborSession = (workOrderId: string) => {
    const endedAt = new Date();
    setLaborSessions(currentSessions => currentSessions.map(session => {
      if (session.workOrderId !== workOrderId || session.ended_at) return session;
      const startedAt = new Date(session.started_at);
      const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
      return {
        ...session,
        ended_at: endedAt.toISOString(),
        durationMinutes,
      };
    }));
    updateWorkOrderStatus(workOrderId, 'scheduled');
  };

  if (view === 'landing') {
    return <LandingPage onStart={() => setView('app')} />;
  }

  if (view === 'work-orders') {
    const workOrder = workOrders[0] ?? {
      id: 'WO-local-1',
      work_order_number: 'WO-LOCAL-1',
      title: 'First Work Order',
      customer_name: 'Customer placeholder',
      address: '',
      created_at: new Date().toISOString(),
      quote_id: 'local-placeholder',
      customer_id: 'cust_1',
      job_type: 'First Work Order',
      status: 'scheduled' as const,
    };

    return (
      <WorkOrderDetailShell
        workOrder={workOrder}
        notes={workOrderNotes.filter(note => note.workOrderId === workOrder.id)}
        workEntries={workOrderWorkEntries.filter(entry => entry.workOrderId === workOrder.id)}
        parts={workOrderParts.filter(part => part.workOrderId === workOrder.id)}
        attachments={workOrderAttachments.filter(attachment => attachment.workOrderId === workOrder.id)}
        laborSessions={laborSessions.filter(session => session.workOrderId === workOrder.id)}
        onBack={() => setView('app')}
        onAddNote={handleAddWorkOrderNote}
        onAddWorkEntry={handleAddWorkOrderWorkEntry}
        onAddPart={handleAddWorkOrderPart}
        onAddAttachment={handleAddWorkOrderAttachment}
        onStartWork={() => handleStartLaborSession(workOrder.id)}
        onFinishWork={() => handleFinishLaborSession(workOrder.id)}
      />
    );
  }

  if (view === 'operations') {
    return (
      <div className="min-h-screen bg-stone-200 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="bg-stone-100 px-4 py-3 border-b-4 border-zinc-900 flex items-center justify-between sticky top-0 z-20 shadow-[0px_4px_0px_0px_rgba(24,24,27,1)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 border-2 border-zinc-900 flex items-center justify-center transform -skew-x-12">
              <LayoutDashboard className="w-4 h-4 text-orange-500" />
            </div>
            <h1 className="font-oswald font-bold text-xl tracking-widest text-zinc-900 uppercase">SYNC<span className="text-orange-600">-</span>OPS</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowVendorManager(true)}
              className="p-2 text-zinc-600 font-mono font-bold text-xs uppercase tracking-widest flex items-center gap-1 hover:text-zinc-900 transition-colors"
            >
              <Truck className="w-3 h-3" /> Vendors
            </button>
            <button 
              onClick={() => setView('app')}
              className="p-2 text-orange-600 font-mono font-bold text-xs uppercase tracking-widest flex items-center gap-1 hover:text-orange-700 transition-colors"
            >
              <User className="w-3 h-3" /> Field Mode
            </button>
          </div>
        </div>

        <OperationsView 
          history={history}
          invoices={invoices}
          workOrders={workOrders}
          opsQueueItems={opsQueueItems}
          vendors={activeVendors}
          items={activeItems}
          onFormalize={handleFormalize}
          onGenerateInvoice={handleGenerateInvoice}
          onMarkAsPaid={handleMarkAsPaid}
          onCompleteWorkOrder={handleCompleteWorkOrder}
          onRunEndOfDayReview={handleRunEndOfDayReview}
        />

        <EndOfDayModal 
          isOpen={isEndOfDayModalOpen}
          onClose={() => setIsEndOfDayModalOpen(false)}
          items={messyInputs}
          onMarkDone={handleMarkMessyDone}
          onFormalize={(quote) => {
            handleFormalize(quote);
            handleMarkMessyDone(quote.id!);
          }}
        />
        <VendorManager
          isOpen={showVendorManager}
          vendors={activeVendors}
          items={activeItems}
          priceHistory={priceHistory}
          onClose={() => setShowVendorManager(false)}
          onSaveVendor={handleSaveVendor}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-stone-100 px-4 py-3 border-b-4 border-zinc-900 flex items-center justify-between sticky top-0 z-20 shadow-[0px_4px_0px_0px_rgba(24,24,27,1)]">
        <button 
          onClick={() => setView('landing')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-orange-500 border-2 border-zinc-900 flex items-center justify-center transform -skew-x-12">
            <div className="w-2 h-2 bg-zinc-900"></div>
          </div>
          <h1 className="font-oswald font-bold text-xl tracking-widest text-zinc-900 uppercase">SYNC<span className="text-orange-600">-</span>CAPTURE</h1>
        </button>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setView('operations')}
            className={`p-2 transition-colors rounded-sm border-2 flex items-center gap-1.5 ${view === 'operations' ? 'bg-orange-500 border-zinc-900 text-zinc-900 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]' : 'border-transparent text-zinc-500 hover:text-zinc-900'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest hidden sm:inline">Ops</span>
          </button>
          <button 
            onClick={() => setView('work-orders')}
            className={`p-2 transition-colors rounded-sm border-2 flex items-center gap-1.5 ${view === 'work-orders' ? 'bg-orange-500 border-zinc-900 text-zinc-900 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]' : 'border-transparent text-zinc-500 hover:text-zinc-900'}`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest hidden sm:inline">W.O.</span>
          </button>
          <button
            onClick={() => setShowVendorManager(true)}
            className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors border-2 border-transparent"
            title="Vendors"
          >
            <Truck className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowProfitRealityCheck(true)}
            className="p-2 text-zinc-500 hover:text-emerald-600 transition-colors border-2 border-transparent"
            title="Profit Reality Check"
          >
            <LineChart className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors border-2 border-transparent"
          >
            <History className="w-5 h-5" />
          </button>
        </div>
      </div>

      <JobContext customer={customer} />

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Input Area */}
        <div className="p-4 bg-stone-200 border-b-4 border-zinc-900">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-orange-600">Field Capture</span>
              <h2 className="font-oswald font-bold text-2xl text-zinc-900 uppercase tracking-wide">Say what happened</h2>
              <p className="text-[10px] font-mono font-bold uppercase text-zinc-500 mt-1">GPS, time, and job context attach automatically.</p>
            </div>
            <button
              onClick={() => setJobIntent(jobIntent === 'Urgent' ? 'Proposal' : 'Urgent')}
              className={`px-3 py-2 rounded-sm border-2 border-zinc-900 text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${jobIntent === 'Urgent' ? 'bg-amber-500 text-zinc-900 shadow-[3px_3px_0px_0px_rgba(24,24,27,1)]' : 'bg-stone-100 text-zinc-600'}`}
            >
              {jobIntent === 'Urgent' ? 'Urgent On' : 'Mark Urgent'}
            </button>
          </div>
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="AWAITING INPUT..."
              className="w-full min-h-[240px] p-6 bg-stone-100 rounded-sm border-2 border-zinc-900 focus:ring-2 focus:ring-orange-500 text-zinc-900 font-mono placeholder:text-zinc-400 resize-none text-lg shadow-[4px_4px_0px_0px_rgba(24,24,27,1)]"
            />
            <div className="absolute bottom-3 right-3 flex gap-2">
              <button 
                onClick={toggleListening}
                className={`p-3 rounded-sm border-2 border-zinc-900 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] ${isListening ? 'bg-red-500 text-zinc-900 animate-pulse shadow-[4px_4px_0px_0px_rgba(24,24,27,1)]' : 'bg-orange-500 text-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)]'}`}
              >
                <Mic className="w-6 h-6" />
              </button>
              {inputText.trim() && !isInterpreting && (
                <button 
                  onClick={() => handleInterpret(inputText, 'typed')}
                  className="p-3 bg-lime-500 text-zinc-900 rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>

        <QuickActions onAction={(type) => {
          if (type === 'talk') toggleListening();
          if (type === 'type') { /* focus textarea */ }
          if (type === 'photo') setShowPhotoCapture(true);
        }} />

        {/* Status Overlay */}
        <AnimatePresence>
          {isInterpreting && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center p-12 text-center"
            >
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
              <h3 className="font-oswald font-bold text-xl text-zinc-900 uppercase tracking-widest">Processing Data...</h3>
              <p className="text-sm text-gray-500 mt-1">Building your internal budget</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestion Card */}
        {suggestedQuote && !isInterpreting && (
          <SuggestionCard
            quote={suggestedQuote}
            routingDecision={routingDecision}
            vendors={activeVendors}
            items={activeItems}
            priceHistory={priceHistory}
            outreachDrafts={supplierOutreachDrafts}
            supabaseJobs={supabaseJobs}
            selectedSupabaseJobId={selectedSupabaseJobId}
            selectedSupabaseJob={selectedSupabaseJob}
            supabaseError={supabaseError}
            comparableQuotesByLineId={comparableQuotesByLineId}
            loadingComparableLineId={loadingComparableLineId}
            comparisonError={comparisonError}
            onEdit={handleEdit}
            onExecuteAction={handleExecuteSuggestedAction}
            onSelectedSupabaseJobChange={setSelectedSupabaseJobId}
            onOpenVendorManager={() => setShowVendorManager(true)}
            onSaveOutreachDraft={(draft) => {
              setSupplierOutreachDrafts(currentDrafts => {
                const exists = currentDrafts.some(currentDraft => currentDraft.id === draft.id);
                return exists
                  ? currentDrafts.map(currentDraft => currentDraft.id === draft.id ? draft : currentDraft)
                  : [draft, ...currentDrafts];
              });
            }}
            onLoadComparableQuotes={handleLoadComparableQuotes}
            onUseComparableQuote={handleUseComparableQuote}
          />
        )}

        {/* History View */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed inset-0 bg-stone-200 z-50 flex flex-col"
            >
              <div className="p-4 border-b-4 border-zinc-900 flex items-center justify-between bg-stone-100 shadow-[0px_4px_0px_0px_rgba(24,24,27,1)]">
                <h2 className="font-oswald font-bold text-xl text-zinc-900 uppercase">Recent Captures</h2>
                <button onClick={() => setShowHistory(false)} className="p-2 border-2 border-transparent hover:border-zinc-900 rounded-sm transition-colors">
                  <X className="w-6 h-6 text-zinc-900" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {history.length === 0 ? (
                  <div className="text-center py-20 text-zinc-500">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-mono font-bold uppercase">No recent captures</p>
                  </div>
                ) : (
                  history.map((item, idx) => (
                    <div key={idx} className="p-4 bg-stone-100 rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] flex gap-3">
                      {item.photos && item.photos.length > 0 && (
                        <div className="w-16 h-16 rounded-sm overflow-hidden flex-shrink-0 border-2 border-zinc-900">
                          <img 
                            src={item.photos[0]} 
                            alt="Thumb" 
                            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <h4 className="font-oswald font-bold text-lg text-zinc-900 uppercase">{item.suggested_job_type}</h4>
                              {item.is_emergency && <Zap className="w-3 h-3 text-red-600 fill-red-600" />}
                              {item.is_urgent && <AlertTriangle className="w-3 h-3 text-amber-500 fill-amber-500" />}
                            </div>
                            <p className="text-xs font-mono text-zinc-500 line-clamp-1 italic uppercase">"{item.source_input_text}"</p>
                          </div>
                          <span className="text-lg font-oswald font-black text-zinc-900">${item.estimated_total}</span>
                        </div>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {item.tags.map((tag, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-zinc-900 text-stone-100 text-[8px] font-mono font-bold rounded-sm uppercase border-2 border-zinc-900">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {getVendor(item.vendorId) && (
                          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-zinc-600">
                            <Truck className="w-3 h-3 text-orange-500" />
                            <span>{getVendor(item.vendorId)?.name}</span>
                            {getVendor(item.vendorId)?.preferred && (
                              <span className="px-1.5 py-0.5 bg-orange-500 text-zinc-900 rounded-sm border-2 border-zinc-900 text-[8px]">Preferred</span>
                            )}
                          </div>
                        )}
                        {item.materials && item.materials.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1">
                            {item.materials.map(line => {
                              const materialItem = activeItems.find(currentItem => currentItem.id === line.itemId);
                              return (
                                <span key={line.id} className="px-1.5 py-0.5 bg-stone-200 text-zinc-700 text-[8px] font-mono font-bold rounded-sm uppercase border-2 border-zinc-400">
                                  {materialItem?.canonicalName ?? 'Material'} · {line.quantity}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase text-zinc-500">
                            {new Date(item.created_at!).toLocaleDateString()}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-sm uppercase border-2 border-zinc-900 ${
                            item.status === 'draft' ? 'bg-stone-200 text-zinc-700' :
                            item.status === 'reviewed' ? 'bg-orange-500 text-zinc-900' :
                            item.status === 'formalized' ? 'bg-lime-500 text-zinc-900' :
                            item.status === 'invoiced' ? 'bg-green-600 text-stone-100' : 'bg-stone-200 text-zinc-700'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <PhotoCapture
          isOpen={showPhotoCapture}
          onClose={() => setShowPhotoCapture(false)}
          onCapture={handleCapturePhoto}
        />

        <ProfitRealityCheck 
          isOpen={showProfitRealityCheck}
          onClose={() => setShowProfitRealityCheck(false)}
        />

        <VendorManager
          isOpen={showVendorManager}
          vendors={activeVendors}
          items={activeItems}
          priceHistory={priceHistory}
          onClose={() => setShowVendorManager(false)}
          onSaveVendor={handleSaveVendor}
        />
      </div>

    </div>
  );
}
