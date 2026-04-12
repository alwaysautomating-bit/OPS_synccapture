import React, { useState } from 'react';
import { Clock, PackagePlus, Plus, Trash2 } from 'lucide-react';
import { ComparableVendorQuote, Item, MaterialLine, MaterialVarianceHandling, SupplierOutreachDraft, SupabaseJob, Vendor, VendorItemPriceHistory } from '../types';
import {
  formatPriceDelta,
  getVendorItemExtremeChangeHint,
  getLatestVendorItemPrice,
  getVendorItemPriceDelta,
  getVendorItemRecentRange,
  getVendorItemPriceWatch,
  getVendorItemPriceStatus,
} from '../utils/priceIntelligence';

interface MaterialPriceMemoryProps {
  materials: MaterialLine[];
  items: Item[];
  vendors: Vendor[];
  selectedVendorId?: string;
  selectedJob?: SupabaseJob;
  priceHistory: VendorItemPriceHistory[];
  outreachDrafts: SupplierOutreachDraft[];
  comparableQuotesByLineId?: Record<string, ComparableVendorQuote[]>;
  loadingComparableLineId?: string | null;
  comparisonError?: string | null;
  onChange: (materials: MaterialLine[]) => void;
  onVendorChange?: (vendorId: string) => void;
  onSaveOutreachDraft: (draft: SupplierOutreachDraft) => void;
  onLoadComparableQuotes?: (lineId: string, itemId: string) => void;
  onUseComparableQuote?: (lineId: string, quote: ComparableVendorQuote) => void;
}

export const MaterialPriceMemory = ({
  materials,
  items,
  vendors,
  selectedVendorId,
  selectedJob,
  priceHistory,
  outreachDrafts,
  comparableQuotesByLineId = {},
  loadingComparableLineId,
  comparisonError,
  onChange,
  onVendorChange,
  onSaveOutreachDraft,
  onLoadComparableQuotes,
  onUseComparableQuote,
}: MaterialPriceMemoryProps) => {
  const selectedVendor = vendors.find(vendor => vendor.id === selectedVendorId);
  const [comparisonLineId, setComparisonLineId] = useState<string | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);

  const addMaterial = () => {
    const firstItem = items[0];
    if (!firstItem) return;

    onChange([
      ...materials,
      {
        id: `material_${Date.now()}`,
        itemId: firstItem.id,
        quantity: 1,
        unitPrice: undefined,
      },
    ]);
  };

  const updateMaterial = (lineId: string, patch: Partial<MaterialLine>) => {
    onChange(materials.map(line => line.id === lineId ? { ...line, ...patch } : line));
  };

  const handleVariance = (lineId: string, varianceHandling: MaterialVarianceHandling, unitPrice?: number) => {
    updateMaterial(lineId, {
      varianceHandling,
      varianceHandledAt: new Date().toISOString(),
      ...(unitPrice === undefined ? {} : { unitPrice }),
    });
  };

  const removeMaterial = (lineId: string) => {
    onChange(materials.filter(line => line.id !== lineId));
  };

  const getKnownVendorPricesForItem = (itemId: string) => {
    const latestByVendor = new Map<string, VendorItemPriceHistory>();

    priceHistory
      .filter(entry => entry.itemId === itemId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach(entry => {
        if (!latestByVendor.has(entry.vendorId)) {
          latestByVendor.set(entry.vendorId, entry);
        }
      });

    return Array.from(latestByVendor.values())
      .map(entry => ({
        entry,
        vendor: vendors.find(vendor => vendor.id === entry.vendorId),
      }))
      .filter((candidate): candidate is { entry: VendorItemPriceHistory; vendor: Vendor } => Boolean(candidate.vendor))
      .sort((a, b) => a.vendor.name.localeCompare(b.vendor.name));
  };

  const openComparison = (line: MaterialLine) => {
    const nextLineId = comparisonLineId === line.id ? null : line.id;
    setComparisonLineId(nextLineId);

    if (nextLineId && onLoadComparableQuotes) {
      onLoadComparableQuotes(line.id, line.itemId);
    }
  };

  const buildDraftBody = (supplier: Vendor, item: Item, line: MaterialLine) => {
    const currentVendorText = selectedVendor ? `Current vendor on this capture: ${selectedVendor.name}.` : 'No current vendor is selected on this capture.';
    const currentPriceText = typeof line.unitPrice === 'number' && line.unitPrice > 0
      ? `Current entered unit price: $${line.unitPrice.toFixed(2)}.`
      : 'No current unit price has been entered yet.';

    return [
      `Hi ${supplier.contactName || supplier.name},`,
      '',
      `Can you confirm current pricing and availability for ${line.quantity} ${item.unit} of ${item.canonicalName}?`,
      currentVendorText,
      currentPriceText,
      '',
      'Please send back current unit price and lead time when you have a chance.',
      '',
      'Thanks,',
    ].join('\n');
  };

  const generateOutreachDraft = (supplier: Vendor, item: Item, line: MaterialLine) => {
    const now = new Date().toISOString();
    const existingDraft = outreachDrafts.find(draft =>
      draft.vendorId === supplier.id &&
      draft.itemId === item.id &&
      draft.sourceMaterialLineId === line.id
    );

    const draft: SupplierOutreachDraft = {
      id: existingDraft?.id ?? `outreach_${Date.now()}`,
      vendorId: supplier.id,
      itemId: item.id,
      sourceMaterialLineId: line.id,
      quantity: line.quantity,
      currentVendorId: selectedVendorId,
      currentPrice: line.unitPrice,
      body: existingDraft?.body ?? buildDraftBody(supplier, item, line),
      createdAt: existingDraft?.createdAt ?? now,
      updatedAt: now,
    };

    onSaveOutreachDraft(draft);
    setActiveDraftId(draft.id);
  };

  const updateOutreachDraftBody = (draft: SupplierOutreachDraft, body: string) => {
    onSaveOutreachDraft({
      ...draft,
      body,
      updatedAt: new Date().toISOString(),
    });
  };

  const copyOutreachDraft = async (draft: SupplierOutreachDraft) => {
    try {
      await navigator.clipboard.writeText(draft.body);
      setCopiedDraftId(draft.id);
    } catch (error) {
      console.warn('Could not copy outreach draft', error);
    }
  };

  const renderSupabaseComparisonPanel = (
    line: MaterialLine,
    item: Item,
    comparableQuotes: ComparableVendorQuote[],
    isLoadingComparison: boolean
  ) => (
    <div className="mt-2 p-2 bg-stone-200 border-2 border-zinc-900 rounded-sm">
      <p className="text-[9px] font-mono font-black uppercase text-zinc-600 mb-2">
        Compare vendors for {item.canonicalName}
      </p>
      {selectedJob && (
        <p className="text-[9px] font-mono font-bold uppercase text-zinc-500 mb-2">
          Job {selectedJob.jobId} · {selectedJob.customerName || 'Active job'}
        </p>
      )}
      {isLoadingComparison ? (
        <p className="text-[9px] font-mono font-bold uppercase text-zinc-500">
          Loading comparable quotes...
        </p>
      ) : comparisonError ? (
        <p className="text-[9px] font-mono font-bold uppercase text-red-700">
          {comparisonError}
        </p>
      ) : comparableQuotes.length === 0 ? (
        <p className="text-[9px] font-mono font-bold uppercase text-zinc-500">
          No Supabase quote responses found for this job and item.
        </p>
      ) : (
        <div className="space-y-2">
          {comparableQuotes.map(quote => (
            <div key={quote.id} className="p-2 bg-stone-100 border-2 border-zinc-900 rounded-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[10px] font-mono font-black uppercase text-zinc-900">{quote.vendorName}</p>
                    {quote.isCheapest && (
                      <span className="px-1.5 py-0.5 bg-lime-500 text-zinc-900 rounded-sm border-2 border-zinc-900 text-[8px] font-mono font-black uppercase">
                        Cheapest
                      </span>
                    )}
                    {quote.vendorPreferred && (
                      <span className="px-1.5 py-0.5 bg-orange-500 text-zinc-900 rounded-sm border-2 border-zinc-900 text-[8px] font-mono font-black uppercase">
                        Preferred
                      </span>
                    )}
                    {quote.vendorId === selectedVendorId && (
                      <span className="px-1.5 py-0.5 bg-zinc-900 text-stone-100 rounded-sm border-2 border-zinc-900 text-[8px] font-mono font-black uppercase">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] font-mono font-bold uppercase text-zinc-500">
                    Qty {quote.quantity} · Unit ${quote.unitPrice.toFixed(2)} · Ship ${quote.shippingCost.toFixed(2)}
                  </p>
                  <p className="text-[9px] font-mono font-bold uppercase text-zinc-500">
                    {quote.leadTimeDays === null ? 'Lead time not set' : `${quote.leadTimeDays} day lead`} · {new Date(quote.createdAt).toLocaleDateString()}
                  </p>
                  {quote.notes && (
                    <p className="mt-1 text-[9px] font-mono font-bold uppercase text-zinc-600">
                      {quote.notes}
                    </p>
                  )}
                </div>
                <p className="text-sm font-oswald font-black text-zinc-900">${quote.totalCost.toFixed(2)}</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  onClick={() => onUseComparableQuote?.(line.id, quote)}
                  className="px-2 py-1 bg-orange-500 text-zinc-900 rounded-sm border-2 border-zinc-900 text-[9px] font-mono font-black uppercase"
                >
                  Use this vendor
                </button>
                <button
                  onClick={() => handleVariance(line.id, 'used_last_known', quote.unitPrice)}
                  className="px-2 py-1 bg-stone-200 text-zinc-700 rounded-sm border-2 border-zinc-900 text-[9px] font-mono font-black uppercase"
                >
                  Use this price
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-3 bg-stone-200 rounded-sm border-2 border-zinc-900">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <PackagePlus className="w-4 h-4 text-orange-500" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Materials</span>
        </div>
        <button
          onClick={addMaterial}
          disabled={items.length === 0}
          className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-orange-600 hover:text-orange-700 disabled:text-zinc-400"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {materials.length === 0 ? (
        <p className="text-[10px] font-mono font-bold uppercase text-zinc-500">
          Add materials to remember what a linked vendor charged.
        </p>
      ) : (
        <div className="space-y-3">
          {materials.map(line => {
            const item = items.find(currentItem => currentItem.id === line.itemId);
            const latestPrice = getLatestVendorItemPrice(priceHistory, selectedVendorId, line.itemId);
            const hasEnteredPrice = typeof line.unitPrice === 'number' && line.unitPrice > 0;
            const delta = getVendorItemPriceDelta(
              priceHistory,
              selectedVendorId,
              line.itemId,
              hasEnteredPrice ? line.unitPrice : undefined
            );
            const status = getVendorItemPriceStatus(
              priceHistory,
              selectedVendorId,
              line.itemId,
              hasEnteredPrice ? line.unitPrice : undefined
            );
            const watch = getVendorItemPriceWatch(
              priceHistory,
              selectedVendorId,
              line.itemId,
              hasEnteredPrice ? line.unitPrice : undefined
            );
            const extremeHint = getVendorItemExtremeChangeHint(
              priceHistory,
              selectedVendorId,
              line.itemId,
              hasEnteredPrice ? line.unitPrice : undefined
            );
            const recentRange = getVendorItemRecentRange(
              priceHistory,
              selectedVendorId,
              line.itemId,
              hasEnteredPrice ? line.unitPrice : undefined
            );
            const outsideRecentRange = recentRange.status === 'Above recent range' || recentRange.status === 'Below recent range';
            const hasUnusualPrice = hasEnteredPrice && (watch.shouldShow || extremeHint.shouldShow || outsideRecentRange);
            const knownVendorPrices = getKnownVendorPricesForItem(line.itemId);
            const comparableQuotes = comparableQuotesByLineId[line.id] ?? [];
            const hasSupabaseComparison = Boolean(selectedJob && onLoadComparableQuotes && onUseComparableQuote);
            const isComparingVendors = comparisonLineId === line.id;
            const isLoadingComparison = loadingComparableLineId === line.id;
            const deltaText = formatPriceDelta(delta);

            return (
              <div key={line.id} className="p-3 bg-stone-100 border-2 border-zinc-900 rounded-sm space-y-2">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <select
                    value={line.itemId}
                    onChange={(event) => updateMaterial(line.id, {
                      itemId: event.target.value,
                      varianceHandling: undefined,
                      varianceHandledAt: undefined,
                    })}
                    className="w-full p-2 bg-stone-50 rounded-sm border-2 border-zinc-900 text-[11px] font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    {items.map(currentItem => (
                      <option key={currentItem.id} value={currentItem.id}>
                        {currentItem.canonicalName}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeMaterial(line.id)}
                    className="w-9 h-9 flex items-center justify-center bg-stone-200 border-2 border-zinc-900 rounded-sm text-zinc-600 hover:text-red-600"
                    aria-label="Remove material"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="text-[9px] font-mono font-bold uppercase text-zinc-500 block mb-1">Qty</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.quantity}
                      onChange={(event) => updateMaterial(line.id, { quantity: Math.max(0, Number(event.target.value) || 0) })}
                      className="w-full p-2 bg-stone-50 rounded-sm border-2 border-zinc-900 text-xs font-mono text-zinc-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </label>
                  <label>
                    <span className="text-[9px] font-mono font-bold uppercase text-zinc-500 block mb-1">Vendor Price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice ?? ''}
                      onChange={(event) => updateMaterial(line.id, {
                        unitPrice: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value) || 0),
                        varianceHandling: undefined,
                        varianceHandledAt: undefined,
                      })}
                      placeholder="0.00"
                      className="w-full p-2 bg-stone-50 rounded-sm border-2 border-zinc-900 text-xs font-mono text-zinc-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </label>
                </div>

                <input
                  value={line.notes ?? ''}
                  onChange={(event) => updateMaterial(line.id, { notes: event.target.value })}
                  placeholder="Material note"
                  className="w-full p-2 bg-stone-50 rounded-sm border-2 border-zinc-900 text-xs font-mono text-zinc-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />

                {item && (
                  <div className={`flex items-start gap-2 p-2 rounded-sm text-[10px] font-mono font-bold uppercase border-2 ${latestPrice ? 'bg-orange-500/10 border-orange-500 text-orange-700' : 'bg-stone-200 border-zinc-400 text-zinc-500'}`}>
                    <Clock className="w-3 h-3 mt-0.5" />
                    <div className="space-y-0.5">
                      {latestPrice ? (
                        <>
                          <p>Last known: ${latestPrice.price.toFixed(2)} / {item.unit} on {new Date(latestPrice.date).toLocaleDateString()}</p>
                          <p>
                            {status}
                            {deltaText ? ` · ${deltaText}` : ''}
                            {hasEnteredPrice ? ' vs last known' : ' from prior'}
                          </p>
                          {watch.shouldShow && watch.label && (
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className={`px-2 py-1 rounded-sm border-2 border-zinc-900 text-[9px] font-mono font-black uppercase ${watch.direction === 'up' ? 'bg-amber-500 text-zinc-900' : 'bg-lime-500 text-zinc-900'}`}>
                                {watch.label}
                              </span>
                              {watch.reason && (
                                <span className="text-[9px] text-zinc-600">
                                  {watch.reason}
                                </span>
                              )}
                            </div>
                          )}
                          {recentRange.shouldShow && recentRange.status && recentRange.average !== null && recentRange.min !== null && recentRange.max !== null && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-mono font-bold uppercase">
                              <span className={`px-2 py-1 rounded-sm border-2 border-zinc-900 ${recentRange.status === 'Above recent range' ? 'bg-amber-500 text-zinc-900' : recentRange.status === 'Below recent range' ? 'bg-lime-500 text-zinc-900' : 'bg-stone-200 text-zinc-700'}`}>
                                {recentRange.status}
                              </span>
                              <span className="text-zinc-600">Recent avg ${recentRange.average.toFixed(2)}</span>
                              <span className="text-zinc-600">Range ${recentRange.min.toFixed(2)}-${recentRange.max.toFixed(2)}</span>
                              <span className="text-zinc-600">{recentRange.count} entries</span>
                            </div>
                          )}
                          {extremeHint.shouldShow && extremeHint.label && extremeHint.latest && (
                            <div className="mt-2 p-2 bg-red-500/10 border-2 border-red-600 rounded-sm text-red-700">
                              <p className="font-mono font-black uppercase text-[10px]">{extremeHint.label}</p>
                              <p className="mt-0.5 text-[9px] font-mono font-bold uppercase">
                                {extremeHint.reason} Last known was ${extremeHint.latest.price.toFixed(2)} on {new Date(extremeHint.latest.date).toLocaleDateString()}.
                              </p>
                            </div>
                          )}
                          {hasUnusualPrice && latestPrice && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <button
                                onClick={() => handleVariance(line.id, 'kept_entered')}
                                className={`px-2 py-1 rounded-sm border-2 border-zinc-900 text-[9px] font-mono font-black uppercase transition-all ${line.varianceHandling === 'kept_entered' ? 'bg-zinc-900 text-stone-100' : 'bg-stone-100 text-zinc-700'}`}
                              >
                                Keep entered price
                              </button>
                              <button
                                onClick={() => handleVariance(line.id, 'used_last_known', latestPrice.price)}
                                className={`px-2 py-1 rounded-sm border-2 border-zinc-900 text-[9px] font-mono font-black uppercase transition-all ${line.varianceHandling === 'used_last_known' ? 'bg-zinc-900 text-stone-100' : 'bg-stone-100 text-zinc-700'}`}
                              >
                                Use last known (${latestPrice.price.toFixed(2)})
                              </button>
                              <button
                                onClick={() => handleVariance(line.id, 'intentional')}
                                className={`px-2 py-1 rounded-sm border-2 border-zinc-900 text-[9px] font-mono font-black uppercase transition-all ${line.varianceHandling === 'intentional' ? 'bg-zinc-900 text-stone-100' : 'bg-stone-100 text-zinc-700'}`}
                              >
                                Mark intentional
                              </button>
                              {line.varianceHandling && (
                                <span className="px-2 py-1 bg-stone-200 text-zinc-600 rounded-sm border-2 border-zinc-400 text-[9px] font-mono font-bold uppercase">
                                  Handled: {line.varianceHandling.replace('_', ' ')}
                                </span>
                              )}
                              {(hasSupabaseComparison || knownVendorPrices.length > 0) && (
                                <button
                                  onClick={() => openComparison(line)}
                                  className={`px-2 py-1 rounded-sm border-2 border-zinc-900 text-[9px] font-mono font-black uppercase transition-all ${isComparingVendors ? 'bg-orange-500 text-zinc-900' : 'bg-stone-100 text-zinc-700'}`}
                                >
                                  Compare vendors
                                </button>
                              )}
                            </div>
                          )}
                          {!hasUnusualPrice && hasSupabaseComparison && (
                            <div className="mt-2">
                              <button
                                onClick={() => openComparison(line)}
                                className={`px-2 py-1 rounded-sm border-2 border-zinc-900 text-[9px] font-mono font-black uppercase transition-all ${isComparingVendors ? 'bg-orange-500 text-zinc-900' : 'bg-stone-100 text-zinc-700'}`}
                              >
                                Compare vendors
                              </button>
                            </div>
                          )}
                          {isComparingVendors && (hasSupabaseComparison ? (
                            renderSupabaseComparisonPanel(line, item, comparableQuotes, isLoadingComparison)
                          ) : (
                            <div className="mt-2 p-2 bg-stone-200 border-2 border-zinc-900 rounded-sm">
                              <p className="text-[9px] font-mono font-black uppercase text-zinc-600 mb-2">
                                Compare vendors for {item.canonicalName}
                              </p>
                              {knownVendorPrices.length === 0 ? (
                                <p className="text-[9px] font-mono font-bold uppercase text-zinc-500">
                                  No other vendor prices remembered for this item.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {knownVendorPrices.map(({ entry, vendor }) => {
                                      const draft = outreachDrafts.find(currentDraft =>
                                        currentDraft.vendorId === vendor.id &&
                                        currentDraft.itemId === line.itemId &&
                                        currentDraft.sourceMaterialLineId === line.id
                                      );
                                      const isDraftOpen = draft && activeDraftId === draft.id;

                                      return (
                                        <div key={`${entry.vendorId}-${entry.itemId}`} className="p-2 bg-stone-100 border-2 border-zinc-900 rounded-sm">
                                          <div className="flex items-start justify-between gap-2">
                                            <div>
                                              <p className="text-[10px] font-mono font-black uppercase text-zinc-900">{vendor.name}</p>
                                              <p className="text-[9px] font-mono font-bold uppercase text-zinc-500">
                                                Updated {new Date(entry.date).toLocaleDateString()}
                                              </p>
                                            </div>
                                            <p className="text-sm font-oswald font-black text-zinc-900">${entry.price.toFixed(2)}</p>
                                          </div>
                                          <div className="mt-2 flex flex-wrap gap-1.5">
                                            {onVendorChange && vendor.id !== selectedVendorId && (
                                              <button
                                                onClick={() => onVendorChange(vendor.id)}
                                                className="px-2 py-1 bg-stone-200 text-zinc-700 rounded-sm border-2 border-zinc-900 text-[9px] font-mono font-black uppercase"
                                              >
                                                Use this vendor
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleVariance(line.id, 'used_last_known', entry.price)}
                                              className="px-2 py-1 bg-stone-200 text-zinc-700 rounded-sm border-2 border-zinc-900 text-[9px] font-mono font-black uppercase"
                                            >
                                              Use this price
                                            </button>
                                            <button
                                              onClick={() => {
                                                if (!item) return;
                                                generateOutreachDraft(vendor, item, line);
                                              }}
                                              className="px-2 py-1 bg-orange-500 text-zinc-900 rounded-sm border-2 border-zinc-900 text-[9px] font-mono font-black uppercase"
                                            >
                                              {draft ? 'Open draft' : 'Draft outreach'}
                                            </button>
                                          </div>
                                          {draft && isDraftOpen && (
                                            <div className="mt-2 p-2 bg-stone-200 border-2 border-zinc-900 rounded-sm">
                                              <p className="text-[9px] font-mono font-black uppercase text-zinc-600 mb-1">
                                                Supplier outreach draft
                                              </p>
                                              <textarea
                                                value={draft.body}
                                                onChange={(event) => updateOutreachDraftBody(draft, event.target.value)}
                                                className="w-full min-h-32 p-2 bg-stone-50 rounded-sm border-2 border-zinc-900 text-[10px] font-mono text-zinc-900 focus:ring-2 focus:ring-orange-500 focus:outline-none resize-y"
                                              />
                                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                <button
                                                  onClick={() => copyOutreachDraft(draft)}
                                                  className="px-2 py-1 bg-stone-100 text-zinc-700 rounded-sm border-2 border-zinc-900 text-[9px] font-mono font-black uppercase"
                                                >
                                                  {copiedDraftId === draft.id ? 'Copied' : 'Copy'}
                                                </button>
                                                <span className="text-[9px] font-mono font-bold uppercase text-zinc-500">
                                                  Saved {new Date(draft.updatedAt).toLocaleDateString()}
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      ) : (
                        <>
                          <p>{selectedVendor ? `No history yet for ${selectedVendor.name} and ${item.canonicalName}.` : `No vendor selected yet for ${item.canonicalName}.`}</p>
                          {hasSupabaseComparison && (
                            <button
                              onClick={() => openComparison(line)}
                              className={`mt-2 px-2 py-1 rounded-sm border-2 border-zinc-900 text-[9px] font-mono font-black uppercase transition-all ${isComparingVendors ? 'bg-orange-500 text-zinc-900' : 'bg-stone-100 text-zinc-700'}`}
                            >
                              Compare vendors
                            </button>
                          )}
                          {hasSupabaseComparison && isComparingVendors && renderSupabaseComparisonPanel(line, item, comparableQuotes, isLoadingComparison)}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
