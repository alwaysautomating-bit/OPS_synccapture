import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Pencil, Plus, Save, Star, Truck, X } from 'lucide-react';
import { Item, Vendor, VendorCategory, VendorItemPriceHistory } from '../types';
import {
  formatPriceDelta,
  getPreviousVendorItemPrice,
  getVendorItemPriceWatchLabel,
  isMeaningfulPriceChange,
} from '../utils/priceIntelligence';

const VENDOR_CATEGORIES: VendorCategory[] = [
  'HVAC',
  'Plumbing',
  'Electrical',
  'General Supply',
  'Subcontractor',
  'Rental',
  'Other',
];

const emptyVendorForm = (): Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '',
  contactName: '',
  email: '',
  phone: '',
  category: 'General Supply',
  paymentTerms: '',
  leadTimeDays: 0,
  preferred: false,
  reliabilityScore: null,
  notes: '',
  aliases: [],
});

interface VendorManagerProps {
  isOpen: boolean;
  vendors: Vendor[];
  items: Item[];
  priceHistory: VendorItemPriceHistory[];
  onClose: () => void;
  onSaveVendor: (vendor: Vendor) => void;
}

export const VendorManager = ({ isOpen, vendors, items, priceHistory, onClose, onSaveVendor }: VendorManagerProps) => {
  const [selectedVendorId, setSelectedVendorId] = useState(vendors[0]?.id ?? '');
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view');
  const selectedVendor = vendors.find(vendor => vendor.id === selectedVendorId) ?? vendors[0];

  const [form, setForm] = useState<Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>>(emptyVendorForm());
  const sortedVendors = useMemo(
    () => [...vendors].sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.name.localeCompare(b.name)),
    [vendors]
  );

  if (!isOpen) return null;

  const startCreate = () => {
    setForm(emptyVendorForm());
    setMode('create');
  };

  const startEdit = (vendor: Vendor) => {
    const { id, createdAt, updatedAt, ...editableVendor } = vendor;
    setForm(editableVendor);
    setSelectedVendorId(id);
    setMode('edit');
  };

  const updateForm = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;

    const now = new Date().toISOString();
    const existingVendor = mode === 'edit' ? selectedVendor : undefined;

    const savedVendor: Vendor = {
      ...form,
      name: form.name.trim(),
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      paymentTerms: form.paymentTerms.trim(),
      notes: form.notes.trim(),
      id: existingVendor?.id ?? `vendor_${Date.now()}`,
      aliases: form.aliases?.filter(alias => alias.name.trim()) ?? [],
      createdAt: existingVendor?.createdAt ?? now,
      updatedAt: now,
    };

    onSaveVendor(savedVendor);
    setSelectedVendorId(savedVendor.id);
    setMode('view');
  };

  const aliasesText = form.aliases?.map(alias => alias.name).join(', ') ?? '';

  return (
    <div className="fixed inset-0 bg-zinc-950/80 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[92vh] bg-stone-200 border-4 border-zinc-900 rounded-sm shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] overflow-hidden flex flex-col">
        <div className="bg-stone-100 px-4 py-3 border-b-4 border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 border-2 border-zinc-900 rounded-sm flex items-center justify-center">
              <Truck className="w-5 h-5 text-zinc-900" />
            </div>
            <div>
              <h2 className="font-oswald font-bold text-xl text-zinc-900 uppercase tracking-widest">Vendors</h2>
              <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Operational supplier layer</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 border-2 border-transparent hover:border-zinc-900 rounded-sm transition-colors">
            <X className="w-5 h-5 text-zinc-900" />
          </button>
        </div>

        <div className="grid grid-cols-[140px_1fr] min-h-0 flex-1">
          <aside className="bg-stone-300 border-r-4 border-zinc-900 p-3 overflow-y-auto space-y-2">
            <button
              onClick={startCreate}
              className="w-full flex items-center justify-center gap-1.5 p-2 bg-orange-500 text-zinc-900 border-2 border-zinc-900 rounded-sm shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] text-[10px] font-mono font-bold uppercase tracking-widest active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <Plus className="w-3 h-3" />
              New
            </button>

            {sortedVendors.map(vendor => (
              <button
                key={vendor.id}
                onClick={() => {
                  setSelectedVendorId(vendor.id);
                  setMode('view');
                }}
                className={`w-full text-left p-2 rounded-sm border-2 transition-all ${selectedVendorId === vendor.id && mode === 'view' ? 'bg-stone-100 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]' : 'bg-stone-200 border-zinc-400'}`}
              >
                <span className="block text-[11px] font-oswald font-bold uppercase text-zinc-900 leading-tight">{vendor.name}</span>
                <span className="mt-1 flex items-center gap-1 text-[9px] font-mono font-bold uppercase text-zinc-500">
                  {vendor.preferred && <Star className="w-3 h-3 fill-orange-500 text-orange-500" />}
                  {vendor.category}
                </span>
              </button>
            ))}
          </aside>

          <main className="p-4 overflow-y-auto">
            {mode === 'view' && selectedVendor ? (
              <VendorDetails
                vendor={selectedVendor}
                items={items}
                priceHistory={priceHistory}
                onEdit={() => startEdit(selectedVendor)}
              />
            ) : (
              <VendorForm
                form={form}
                aliasesText={aliasesText}
                onUpdate={updateForm}
                onAliasesChange={(value) => updateForm('aliases', value.split(',').map((name, index) => ({
                  id: `alias_${selectedVendor?.id ?? 'new'}_${index}`,
                  vendorId: selectedVendor?.id ?? 'new',
                  name: name.trim(),
                })))}
                onCancel={() => setMode('view')}
                onSubmit={handleSubmit}
                title={mode === 'create' ? 'Create Vendor' : 'Edit Vendor'}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

const VendorDetails = ({
  vendor,
  items,
  priceHistory,
  onEdit,
}: {
  vendor: Vendor;
  items: Item[];
  priceHistory: VendorItemPriceHistory[];
  onEdit: () => void;
}) => (
  <div className="space-y-4">
    <div className="flex items-start justify-between gap-3 border-b-2 border-zinc-900 pb-3">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-oswald font-bold text-2xl uppercase text-zinc-900 leading-none">{vendor.name}</h3>
          {vendor.preferred && <Star className="w-4 h-4 fill-orange-500 text-orange-500" />}
        </div>
        <p className="text-[10px] font-mono font-bold uppercase text-orange-600 mt-1">{vendor.category}</p>
      </div>
      <button
        onClick={onEdit}
        className="p-2 bg-stone-100 border-2 border-zinc-900 rounded-sm shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
      >
        <Pencil className="w-4 h-4 text-zinc-900" />
      </button>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <Detail label="Contact" value={vendor.contactName || 'Not set'} />
      <Detail label="Phone" value={vendor.phone || 'Not set'} />
      <Detail label="Email" value={vendor.email || 'Not set'} />
      <Detail label="Terms" value={vendor.paymentTerms || 'Not set'} />
      <Detail label="Lead Time" value={`${vendor.leadTimeDays} day${vendor.leadTimeDays === 1 ? '' : 's'}`} />
      <Detail label="Reliability" value={vendor.reliabilityScore === null ? 'Unrated' : `${vendor.reliabilityScore}/100`} />
    </div>

    {vendor.aliases && vendor.aliases.length > 0 && (
      <div>
        <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-2">Alternate Names</h4>
        <div className="flex flex-wrap gap-1.5">
          {vendor.aliases.map(alias => (
            <span key={alias.id} className="px-2 py-1 bg-zinc-900 text-stone-100 text-[9px] font-mono font-bold rounded-sm uppercase">
              {alias.name}
            </span>
          ))}
        </div>
      </div>
    )}

    <div className="p-3 bg-stone-100 border-2 border-zinc-900 rounded-sm">
      <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-1">Notes</h4>
      <p className="text-xs font-mono text-zinc-700 leading-relaxed">{vendor.notes || 'No notes yet.'}</p>
    </div>

    <VendorPriceHistory vendor={vendor} items={items} priceHistory={priceHistory} />
  </div>
);

const VendorPriceHistory = ({
  vendor,
  items,
  priceHistory,
}: {
  vendor: Vendor;
  items: Item[];
  priceHistory: VendorItemPriceHistory[];
}) => {
  const recentPrices = priceHistory
    .filter(entry => entry.vendorId === vendor.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="p-3 bg-stone-100 border-2 border-zinc-900 rounded-sm">
      <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-2">Recent Price Memory</h4>
      {recentPrices.length === 0 ? (
        <p className="text-xs font-mono text-zinc-500 uppercase">No item prices remembered yet.</p>
      ) : (
        <div className="space-y-2">
          {recentPrices.map(entry => {
            const item = items.find(currentItem => currentItem.id === entry.itemId);
            const priorPrice = getPreviousVendorItemPrice(priceHistory, entry.vendorId, entry.itemId, entry.date);
            const amount = priorPrice ? entry.price - priorPrice.price : 0;
            const percent = priorPrice && priorPrice.price !== 0 ? (amount / priorPrice.price) * 100 : undefined;
            const deltaText = priorPrice ? formatPriceDelta({
              amount: Math.abs(amount) < 0.005 ? 0 : amount,
              percent: percent !== undefined && Math.abs(percent) < 0.005 ? 0 : percent,
              baseline: priorPrice,
              latest: entry,
            }) : undefined;
            const status = !priorPrice
              ? 'No prior'
              : amount > 0.005
                ? 'Up'
                : amount < -0.005
                  ? 'Down'
                  : 'Same';
            const direction = amount > 0.005 ? 'up' : amount < -0.005 ? 'down' : 'neutral';
            const watchLabel = percent !== undefined && isMeaningfulPriceChange(percent, amount)
              ? getVendorItemPriceWatchLabel(percent, direction)
              : null;

            return (
              <div key={entry.id} className="flex items-start justify-between gap-2 border-b-2 border-zinc-200 last:border-b-0 pb-2 last:pb-0">
                <div>
                  <p className="text-xs font-mono font-bold text-zinc-900 uppercase">{item?.canonicalName ?? 'Unknown item'}</p>
                  <p className="text-[9px] font-mono font-bold text-zinc-500 uppercase flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-orange-500" />
                    {new Date(entry.date).toLocaleDateString()} · {entry.sourceType.replace('_', ' ')}
                  </p>
                  {deltaText && (
                    <p className="text-[9px] font-mono font-bold text-orange-700 uppercase mt-1">
                      {status} from prior · {deltaText}
                    </p>
                  )}
                  {watchLabel && (
                    <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-sm border-2 border-zinc-900 text-[8px] font-mono font-black uppercase ${direction === 'up' ? 'bg-amber-500 text-zinc-900' : 'bg-lime-500 text-zinc-900'}`}>
                      {watchLabel}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-oswald font-black text-zinc-900">${entry.price.toFixed(2)}</p>
                  <p className="text-[9px] font-mono font-bold text-zinc-500 uppercase">Qty {entry.quantity}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="p-3 bg-stone-100 border-2 border-zinc-900 rounded-sm">
    <span className="text-[9px] font-mono font-bold uppercase text-zinc-500 block mb-1">{label}</span>
    <span className="text-xs font-mono font-bold text-zinc-900 break-words">{value}</span>
  </div>
);

interface VendorFormProps {
  form: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>;
  aliasesText: string;
  title: string;
  onUpdate: <K extends keyof VendorFormProps['form']>(field: K, value: VendorFormProps['form'][K]) => void;
  onAliasesChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

const VendorForm = ({ form, aliasesText, title, onUpdate, onAliasesChange, onCancel, onSubmit }: VendorFormProps) => (
  <div className="space-y-3">
    <h3 className="font-oswald font-bold text-2xl uppercase text-zinc-900 border-b-2 border-zinc-900 pb-2">{title}</h3>

    <Input label="Vendor Name" value={form.name} onChange={(value) => onUpdate('name', value)} required />
    <Input label="Contact Name" value={form.contactName} onChange={(value) => onUpdate('contactName', value)} />
    <Input label="Email" value={form.email} onChange={(value) => onUpdate('email', value)} type="email" />
    <Input label="Phone" value={form.phone} onChange={(value) => onUpdate('phone', value)} />

    <label className="block">
      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Category</span>
      <select
        value={form.category}
        onChange={(event) => onUpdate('category', event.target.value as VendorCategory)}
        className="w-full p-3 bg-stone-100 rounded-sm border-2 border-zinc-900 text-xs font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
      >
        {VENDOR_CATEGORIES.map(category => (
          <option key={category} value={category}>{category}</option>
        ))}
      </select>
    </label>

    <div className="grid grid-cols-2 gap-3">
      <Input label="Payment Terms" value={form.paymentTerms} onChange={(value) => onUpdate('paymentTerms', value)} />
      <Input
        label="Lead Days"
        value={String(form.leadTimeDays)}
        onChange={(value) => onUpdate('leadTimeDays', Math.max(0, Number(value) || 0))}
        type="number"
      />
    </div>

    <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
      <Input
        label="Reliability"
        value={form.reliabilityScore === null ? '' : String(form.reliabilityScore)}
        onChange={(value) => onUpdate('reliabilityScore', value === '' ? null : Math.min(100, Math.max(0, Number(value) || 0)))}
        type="number"
        placeholder="0-100"
      />
      <button
        onClick={() => onUpdate('preferred', !form.preferred)}
        className={`h-[46px] px-3 rounded-sm border-2 border-zinc-900 font-mono font-bold text-[10px] uppercase flex items-center gap-1.5 ${form.preferred ? 'bg-orange-500 text-zinc-900' : 'bg-stone-100 text-zinc-600'}`}
      >
        {form.preferred && <CheckCircle2 className="w-3 h-3" />}
        Preferred
      </button>
    </div>

    <Input label="Aliases" value={aliasesText} onChange={onAliasesChange} placeholder="Counter name, short name" />

    <label className="block">
      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Notes</span>
      <textarea
        value={form.notes}
        onChange={(event) => onUpdate('notes', event.target.value)}
        className="w-full min-h-24 p-3 bg-stone-100 rounded-sm border-2 border-zinc-900 text-xs font-mono text-zinc-900 focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
      />
    </label>

    <div className="grid grid-cols-2 gap-3 pt-2">
      <button
        onClick={onCancel}
        className="py-3 bg-stone-100 text-zinc-900 font-mono font-bold uppercase tracking-widest rounded-sm border-2 border-zinc-900"
      >
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={!form.name.trim()}
        className="py-3 bg-orange-500 disabled:bg-stone-300 disabled:text-zinc-500 text-zinc-900 font-mono font-bold uppercase tracking-widest rounded-sm border-2 border-zinc-900 shadow-[3px_3px_0px_0px_rgba(24,24,27,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" />
        Save
      </button>
    </div>
  </div>
);

const Input = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) => (
  <label className="block">
    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-1 block">
      {label}{required ? ' *' : ''}
    </span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full p-3 bg-stone-100 rounded-sm border-2 border-zinc-900 text-xs font-mono text-zinc-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
    />
  </label>
);
