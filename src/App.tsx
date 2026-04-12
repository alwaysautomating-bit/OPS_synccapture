import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Keyboard, 
  Camera, 
  DollarSign, 
  Save, 
  Send, 
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
  Calculator as CalcIcon,
  Clock,
  Navigation,
  AlertTriangle,
  Zap,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LineChart,
  Star,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QuickQuote, Customer, InputType, Invoice, WorkOrder, Vendor, Item, VendorItemPriceHistory, MaterialLine, SupplierOutreachDraft } from './types';
import { MOCK_CUSTOMERS, MOCK_ITEMS, MOCK_VENDOR_ITEM_PRICE_HISTORY, MOCK_VENDORS } from './mockData';
import { usePersistentCollection } from './hooks/usePersistentCollection';
import { interpretQuote } from './services/geminiService';
import { Calculator } from './components/Calculator';
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

const QuickActions = ({ onAction }: { onAction: (type: 'talk' | 'type' | 'photo' | 'budget' | 'calc') => void }) => (
  <div className="grid grid-cols-5 gap-2 p-4 bg-stone-300 border-b-2 border-zinc-900">
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
    <button 
      onClick={() => onAction('budget')}
      className="flex flex-col items-center justify-center gap-1 p-3 bg-stone-100 rounded-sm border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
    >
      <DollarSign className="w-6 h-6 text-lime-600" />
      <span className="text-[10px] font-mono font-bold text-zinc-900 uppercase">Budget</span>
    </button>
    <button 
      onClick={() => onAction('calc')}
      className="flex flex-col items-center justify-center gap-1 p-3 bg-stone-100 rounded-sm border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
    >
      <CalcIcon className="w-6 h-6 text-amber-600" />
      <span className="text-[10px] font-mono font-bold text-zinc-900 uppercase">Calc</span>
    </button>
  </div>
);

const SuggestionCard = ({
  quote,
  vendors,
  items,
  priceHistory,
  outreachDrafts,
  onEdit,
  onOpenVendorManager,
  onSaveOutreachDraft,
}: {
  quote: Partial<QuickQuote>;
  vendors: Vendor[];
  items: Item[];
  priceHistory: VendorItemPriceHistory[];
  outreachDrafts: SupplierOutreachDraft[];
  onEdit: (field: keyof QuickQuote, value: any) => void;
  onOpenVendorManager: () => void;
  onSaveOutreachDraft: (draft: SupplierOutreachDraft) => void;
}) => {
  const confidenceColor = quote.confidence_score && quote.confidence_score > 0.8 ? 'text-lime-600' : 'text-amber-600';
  const selectedVendor = vendors.find(vendor => vendor.id === quote.vendorId);
  
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
          priceHistory={priceHistory}
          outreachDrafts={outreachDrafts}
          onChange={(materials) => onEdit('materials', materials)}
          onVendorChange={(vendorId) => onEdit('vendorId', vendorId)}
          onSaveOutreachDraft={onSaveOutreachDraft}
        />

        <div className="pt-4 border-t-2 border-zinc-200 flex items-center justify-between">
          <span className="text-sm font-oswald font-bold text-zinc-900 uppercase tracking-wider">Internal Budget</span>
          <span className="text-3xl font-oswald font-black text-zinc-900">${quote.estimated_total}</span>
        </div>

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

        {/* Priority Toggles */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button 
            onClick={() => onEdit('is_urgent', !quote.is_urgent)}
            className={`flex items-center justify-center gap-2 p-3 rounded-sm border-2 transition-all font-mono uppercase ${quote.is_urgent ? 'bg-amber-500 border-zinc-900 text-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)]' : 'bg-stone-200 border-zinc-400 text-zinc-500'}`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[10px] font-bold">Urgent</span>
          </button>
          <button 
            onClick={() => onEdit('is_emergency', !quote.is_emergency)}
            className={`flex items-center justify-center gap-2 p-3 rounded-sm border-2 transition-all font-mono uppercase ${quote.is_emergency ? 'bg-red-600 border-zinc-900 text-stone-100 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)]' : 'bg-stone-200 border-zinc-400 text-zinc-500'}`}
          >
            <Zap className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase">Emergency</span>
          </button>
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
  const [inputType, setInputType] = useState<InputType>('typed');
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
  const [showHistory, setShowHistory] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
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
    
    // Apply selected job intent/priority
    result.is_urgent = jobIntent === 'Urgent';
    result.is_emergency = jobIntent === 'Emergency';
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
    setInputText('');
    setJobIntent('Proposal');
    if (!suggestedQuote.is_emergency) {
      alert("Quote sent to office for review.");
    }
  };

  const handleUseCalcResult = (result: string) => {
    setInputText(prev => prev + (prev ? ' ' : '') + result);
    setShowCalculator(false);
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
    const newWO: WorkOrder = {
      id: `WO-${Date.now()}`,
      quote_id: quote.id!,
      customer_id: quote.customer_id!,
      job_type: quote.suggested_job_type!,
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

  const getVendor = (vendorId?: string) => vendors.find(vendor => vendor.id === vendorId);

  if (view === 'landing') {
    return <LandingPage onStart={() => setView('app')} />;
  }

  if (view === 'work-orders') {
    return (
      <div className="min-h-screen bg-stone-200 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="bg-stone-100 px-4 py-3 border-b-4 border-zinc-900 flex items-center justify-between sticky top-0 z-20 shadow-[0px_4px_0px_0px_rgba(24,24,27,1)]">
          <button 
            onClick={() => setView('app')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-orange-500 border-2 border-zinc-900 flex items-center justify-center transform -skew-x-12">
              <div className="w-2 h-2 bg-zinc-900"></div>
            </div>
            <h1 className="font-oswald font-bold text-xl tracking-widest text-zinc-900 uppercase">SYNC<span className="text-orange-600">-</span>CAPTURE</h1>
          </button>
          <button 
            onClick={() => setView('app')}
            className="p-2 text-orange-600 font-mono font-bold text-xs uppercase tracking-widest hover:text-orange-700 transition-colors"
          >
            Back to Field
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-stone-100 border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] rounded-sm flex items-center justify-center text-orange-500 mb-6">
            <ClipboardList className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-oswald font-bold text-zinc-900 mb-2 uppercase">Work Orders</h2>
          <p className="text-zinc-500 font-mono mb-8 max-w-[240px] uppercase text-xs">
            This view is currently being configured. Soon you'll be able to see all active work orders here.
          </p>
          
          <div className="w-full space-y-3">
            {workOrders.length === 0 ? (
              [1, 2, 3].map(i => (
                <div key={i} className="p-4 bg-stone-100 rounded-sm border-2 border-zinc-300 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] flex items-center gap-4 opacity-40 grayscale">
                  <div className="w-10 h-10 bg-stone-200 border-2 border-zinc-300 rounded-sm" />
                  <div className="flex-1 text-left">
                    <div className="h-3 w-24 bg-stone-200 rounded-sm mb-2" />
                    <div className="h-2 w-32 bg-stone-200 rounded-sm" />
                  </div>
                </div>
              ))
            ) : (
              workOrders.map(wo => (
                <div key={wo.id} className="p-4 bg-stone-100 rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] flex items-center justify-between">
                  <div>
                    <h4 className="font-oswald font-bold text-lg text-zinc-900 uppercase">{wo.job_type}</h4>
                    <p className="text-[10px] text-orange-600 uppercase font-mono font-bold tracking-widest">{wo.status}</p>
                    {getVendor(wo.vendorId) && (
                      <p className="text-[10px] text-zinc-500 uppercase font-mono font-bold mt-1 flex items-center gap-1">
                        <Truck className="w-3 h-3 text-orange-500" />
                        {getVendor(wo.vendorId)?.name}
                      </p>
                    )}
                    {wo.materials && wo.materials.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {wo.materials.map(line => {
                          const materialItem = items.find(currentItem => currentItem.id === line.itemId);
                          return (
                            <span key={line.id} className="px-1.5 py-0.5 bg-stone-200 text-zinc-700 text-[8px] font-mono font-bold rounded-sm uppercase border-2 border-zinc-400">
                              {materialItem?.canonicalName ?? 'Material'} · {line.quantity}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase">ID: {wo.id}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
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
          vendors={vendors}
          items={items}
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
          vendors={vendors}
          items={items}
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
          <div className="mb-4">
            <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Job Type / Priority</label>
            <div className="relative">
              <select 
                value={jobIntent}
                onChange={(e) => {
                  const val = e.target.value;
                  setJobIntent(val);
                  if (suggestedQuote) {
                    const updated = { ...suggestedQuote };
                    updated.is_urgent = val === 'Urgent';
                    updated.is_emergency = val === 'Emergency';
                    
                    // Add tag if not already present
                    const currentTags = updated.tags || [];
                    if (val === 'Proposal' || val === 'Complete') {
                      if (!currentTags.includes(val)) {
                        updated.tags = [...currentTags, val];
                      }
                    }
                    setSuggestedQuote(updated);
                  }
                }}
                className="w-full p-3 bg-stone-100 rounded-sm border-2 border-zinc-900 text-sm font-mono font-bold text-zinc-900 appearance-none focus:ring-2 focus:ring-orange-500 focus:outline-none pr-10 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)]"
              >
                <option value="Proposal">Proposal</option>
                <option value="Urgent">Urgent</option>
                <option value="Emergency">Emergency</option>
                <option value="Complete">Complete</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-900 pointer-events-none" />
            </div>
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
          if (type === 'budget') alert("Manual budget entry coming soon.");
          if (type === 'calc') setShowCalculator(true);
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
            vendors={vendors}
            items={items}
            priceHistory={priceHistory}
            outreachDrafts={supplierOutreachDrafts}
            onEdit={handleEdit}
            onOpenVendorManager={() => setShowVendorManager(true)}
            onSaveOutreachDraft={(draft) => {
              setSupplierOutreachDrafts(currentDrafts => {
                const exists = currentDrafts.some(currentDraft => currentDraft.id === draft.id);
                return exists
                  ? currentDrafts.map(currentDraft => currentDraft.id === draft.id ? draft : currentDraft)
                  : [draft, ...currentDrafts];
              });
            }}
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
                              const materialItem = items.find(currentItem => currentItem.id === line.itemId);
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

        {/* Calculator View */}
        <Calculator
          isOpen={showCalculator}
          onClose={() => setShowCalculator(false)}
          onUseResult={handleUseCalcResult}
        />

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
          vendors={vendors}
          items={items}
          priceHistory={priceHistory}
          onClose={() => setShowVendorManager(false)}
          onSaveVendor={handleSaveVendor}
        />
      </div>

      {/* Bottom Actions */}
      {suggestedQuote && !isInterpreting && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-stone-200 border-t-4 border-zinc-900 grid grid-cols-2 gap-3 z-30">
          <button 
            onClick={handleSave}
            className="flex items-center justify-center gap-2 py-4 bg-stone-100 text-zinc-900 font-mono font-bold uppercase tracking-widest rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <Save className="w-5 h-5" />
            Save Draft
          </button>
          <button 
            onClick={handleSendToOffice}
            className="flex items-center justify-center gap-2 py-4 bg-orange-500 text-zinc-900 font-mono font-bold uppercase tracking-widest rounded-sm border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <Send className="w-5 h-5" />
            Send to Office
          </button>
        </div>
      )}
    </div>
  );
}
