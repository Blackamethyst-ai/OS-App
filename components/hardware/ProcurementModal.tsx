/**
 * ProcurementModal Component
 *
 * Full procurement workflow: quantity selection, vendor quotes, confirmation, order tracking.
 * Uses real vendor data from vendorService (minerstat + PriceAPI).
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ShoppingCart, Package, Truck, CheckCircle2, AlertTriangle,
    Loader2, ChevronRight, Star, Clock, Shield, Building2,
    CreditCard, FileText, ArrowLeft, Sparkles, Database, Wifi
} from 'lucide-react';
import { useAppStore } from '../../store';
import * as vendorService from '../../services/vendorService';
import type { GpuWithLiveData, VendorQuote } from '../../types';

interface ProcurementModalProps {
    gpu: GpuWithLiveData;
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'quantity' | 'quotes' | 'confirm' | 'processing' | 'complete';

const ProcurementModal: React.FC<ProcurementModalProps> = ({ gpu, isOpen, onClose }) => {
    const { actions } = useAppStore();
    const { setHardwareState } = actions;

    const [step, setStep] = useState<Step>('quantity');
    const [quantity, setQuantity] = useState(1);
    const [quotes, setQuotes] = useState<VendorQuote[]>([]);
    const [selectedQuote, setSelectedQuote] = useState<VendorQuote | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [quoteError, setQuoteError] = useState<string | null>(null);

    // Get data source status for display
    const dataSourceStatus = useMemo(() => vendorService.getDataSourceStatus(), []);

    // Reset state when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setStep('quantity');
            setQuantity(1);
            setQuotes([]);
            setSelectedQuote(null);
            setOrderId(null);
            setQuoteError(null);
        }
    }, [isOpen]);

    const handleGetQuotes = useCallback(async () => {
        setIsLoading(true);
        setQuoteError(null);
        try {
            // Fetch real vendor quotes from vendorService
            const realQuotes = await vendorService.getVendorQuotes(
                gpu.model,
                quantity,
                { msrp: gpu.msrp, includeMarketAverage: true, includePriceApi: true }
            );
            setQuotes(realQuotes);
            setStep('quotes');
        } catch (error) {
            console.error('[Procurement] Failed to fetch quotes:', error);
            setQuoteError('Failed to fetch vendor quotes. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [gpu, quantity]);

    const handleSelectQuote = useCallback((quote: VendorQuote) => {
        setSelectedQuote(quote);
        setStep('confirm');
    }, []);

    const handleConfirmOrder = useCallback(async () => {
        if (!selectedQuote) return;

        setStep('processing');
        setIsLoading(true);

        // Simulate order processing
        await new Promise(r => setTimeout(r, 2000));

        const newOrderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
        setOrderId(newOrderId);

        // Update store with order
        setHardwareState(prev => ({
            procurement: {
                ...prev.procurement,
                status: 'completed',
                currentOrder: {
                    id: newOrderId,
                    gpuId: gpu.id,
                    gpuModel: gpu.model,
                    quantity,
                    selectedQuote,
                    status: 'completed',
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                },
                orderHistory: [
                    ...prev.procurement.orderHistory,
                    {
                        id: newOrderId,
                        gpuId: gpu.id,
                        gpuModel: gpu.model,
                        quantity,
                        status: 'completed',
                        createdAt: Date.now()
                    }
                ]
            }
        }));

        setIsLoading(false);
        setStep('complete');
    }, [selectedQuote, gpu, quantity, setHardwareState]);

    const totalCost = useMemo(() => {
        if (selectedQuote) return selectedQuote.totalPrice;
        const basePrice = gpu.livePrice?.price || gpu.msrp;
        return basePrice * quantity;
    }, [selectedQuote, gpu, quantity]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-[700px] max-h-[85vh] bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#10b981]/10 rounded-xl">
                                <ShoppingCart size={20} className="text-[#10b981]" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black font-mono text-white uppercase tracking-tight">Procurement</h2>
                                <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">{gpu.model}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    {/* Progress Steps */}
                    <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                        {(['quantity', 'quotes', 'confirm', 'complete'] as const).map((s, i) => (
                            <React.Fragment key={s}>
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                    step === s ? 'bg-[#10b981]/20 text-[#10b981]' :
                                    ['quantity', 'quotes', 'confirm', 'complete'].indexOf(step) > i ? 'text-[#10b981]/60' : 'text-gray-700'
                                }`}>
                                    {['quantity', 'quotes', 'confirm', 'complete'].indexOf(step) > i ? (
                                        <CheckCircle2 size={12} />
                                    ) : (
                                        <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[8px]">{i + 1}</span>
                                    )}
                                    {s === 'quantity' ? 'Qty' : s === 'quotes' ? 'Quotes' : s === 'confirm' ? 'Confirm' : 'Done'}
                                </div>
                                {i < 3 && <ChevronRight size={12} className="text-gray-800" />}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[50vh]">
                        <AnimatePresence mode="wait">
                            {step === 'quantity' && (
                                <motion.div key="quantity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-white/5 rounded-xl">
                                                <Package size={24} className="text-[#22d3ee]" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-sm font-black text-white uppercase">{gpu.model}</h3>
                                                <p className="text-[9px] text-gray-600 font-mono mt-1">{gpu.manufacturer} • {gpu.arch} • {gpu.specs.vram}</p>
                                                <div className="mt-3 flex items-center gap-4">
                                                    <span className="text-xl font-black font-mono text-[#10b981]">${(gpu.livePrice?.price || gpu.msrp).toLocaleString()}</span>
                                                    <span className="text-[8px] font-mono text-gray-600 uppercase">per unit</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Quantity</label>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl text-white font-black text-xl hover:bg-white/10 transition-colors"
                                            >-</button>
                                            <input
                                                type="number"
                                                value={quantity}
                                                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-24 h-12 bg-white/5 border border-white/10 rounded-xl text-center text-white font-black font-mono text-xl"
                                            />
                                            <button
                                                onClick={() => setQuantity(quantity + 1)}
                                                className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl text-white font-black text-xl hover:bg-white/10 transition-colors"
                                            >+</button>
                                        </div>
                                        {quantity >= 5 && (
                                            <p className="text-[9px] text-[#10b981] font-mono">Bulk discount available for {quantity}+ units</p>
                                        )}
                                    </div>

                                    <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl flex items-center justify-between">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Estimated Total</span>
                                        <span className="text-2xl font-black font-mono text-[#10b981]">${totalCost.toLocaleString()}</span>
                                    </div>

                                    {/* Data Sources Status */}
                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                        <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-3">Data Sources</div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <Wifi size={10} className={dataSourceStatus.minerstat.available ? 'text-[#10b981]' : 'text-gray-600'} />
                                                <span className="text-[9px] text-gray-500 font-mono">minerstat</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Wifi size={10} className={dataSourceStatus.priceApi.available ? 'text-[#10b981]' : 'text-gray-600'} />
                                                <span className="text-[9px] text-gray-500 font-mono">
                                                    PriceAPI {dataSourceStatus.priceApi.available && `(${dataSourceStatus.priceApi.credits.remaining} credits)`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Error Display */}
                                    {quoteError && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                                            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                            <p className="text-[9px] text-red-400/80 leading-relaxed">{quoteError}</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {step === 'quotes' && (
                                <motion.div key="quotes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <button onClick={() => setStep('quantity')} className="flex items-center gap-2 text-[9px] text-gray-500 hover:text-white transition-colors">
                                            <ArrowLeft size={12} /> Back
                                        </button>
                                        <span className="text-[9px] text-gray-600 font-mono">{quantity} unit{quantity > 1 ? 's' : ''} • {gpu.model}</span>
                                    </div>

                                    {quotes.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <Database size={32} className="mx-auto text-gray-700 mb-4" />
                                            <p className="text-[10px] text-gray-500 font-mono">No vendor quotes available</p>
                                            <p className="text-[9px] text-gray-600 font-mono mt-2">Try refreshing or check data source connections</p>
                                        </div>
                                    ) : quotes.map(quote => {
                                        // Determine source badge color and text
                                        const sourceBadge = quote.id.includes('minerstat')
                                            ? { color: 'text-cyan-500 bg-cyan-500/10', text: 'minerstat' }
                                            : quote.id.includes('priceapi')
                                            ? { color: 'text-purple-500 bg-purple-500/10', text: 'PriceAPI' }
                                            : quote.id.includes('msrp')
                                            ? { color: 'text-gray-500 bg-gray-500/10', text: 'MSRP Est.' }
                                            : { color: 'text-blue-500 bg-blue-500/10', text: 'Live' };

                                        return (
                                            <div
                                                key={quote.id}
                                                onClick={() => handleSelectQuote(quote)}
                                                className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-[#10b981]/30 cursor-pointer transition-all group"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-4">
                                                        <div className="p-2.5 bg-white/5 rounded-xl group-hover:bg-[#10b981]/10 transition-colors">
                                                            <Building2 size={18} className="text-gray-500 group-hover:text-[#10b981] transition-colors" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-sm font-black text-white">{quote.vendor}</h4>
                                                                <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wide ${sourceBadge.color}`}>
                                                                    {sourceBadge.text}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <div className="flex items-center gap-1">
                                                                    <Star size={10} className="text-[#f1c21b] fill-[#f1c21b]" />
                                                                    <span className="text-[9px] text-gray-500 font-mono">{quote.rating}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Clock size={10} className="text-gray-600" />
                                                                    <span className="text-[9px] text-gray-500 font-mono">{quote.leadTime}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Shield size={10} className="text-gray-600" />
                                                                    <span className="text-[9px] text-gray-500 font-mono">{quote.warranty}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-black font-mono text-[#10b981]">${quote.totalPrice.toLocaleString()}</div>
                                                        <div className="text-[8px] text-gray-600 font-mono">${quote.unitPrice.toLocaleString()} / unit</div>
                                                    </div>
                                                </div>
                                                {quote.inStock ? (
                                                    <div className="mt-3 flex items-center gap-2 text-[8px] text-[#10b981] font-mono">
                                                        <CheckCircle2 size={10} /> In Stock - Ready to Ship
                                                    </div>
                                                ) : (
                                                    <div className="mt-3 flex items-center gap-2 text-[8px] text-amber-500 font-mono">
                                                        <AlertTriangle size={10} /> Pre-order - Ships in {quote.leadTime}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </motion.div>
                            )}

                            {step === 'confirm' && selectedQuote && (
                                <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <button onClick={() => setStep('quotes')} className="flex items-center gap-2 text-[9px] text-gray-500 hover:text-white transition-colors">
                                            <ArrowLeft size={12} /> Back to Quotes
                                        </button>
                                    </div>

                                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                                        <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Order Summary</h4>

                                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                                            <span className="text-[10px] text-gray-500">Product</span>
                                            <span className="text-[10px] text-white font-mono">{gpu.model}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                                            <span className="text-[10px] text-gray-500">Quantity</span>
                                            <span className="text-[10px] text-white font-mono">{quantity}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                                            <span className="text-[10px] text-gray-500">Vendor</span>
                                            <span className="text-[10px] text-white font-mono">{selectedQuote.vendor}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                                            <span className="text-[10px] text-gray-500">Lead Time</span>
                                            <span className="text-[10px] text-white font-mono">{selectedQuote.leadTime}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                                            <span className="text-[10px] text-gray-500">Warranty</span>
                                            <span className="text-[10px] text-white font-mono">{selectedQuote.warranty}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3">
                                            <span className="text-[10px] font-black text-white uppercase">Total</span>
                                            <span className="text-xl font-black font-mono text-[#10b981]">${selectedQuote.totalPrice.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-start gap-3">
                                        <Database size={16} className="text-cyan-500 shrink-0 mt-0.5" />
                                        <div className="text-[9px] text-cyan-400/80 leading-relaxed">
                                            <p className="font-bold mb-1">Real Market Data</p>
                                            <p>Pricing sourced from minerstat and PriceAPI. Order placement is simulated.</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'processing' && (
                                <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 flex flex-col items-center justify-center gap-6">
                                    <div className="relative">
                                        <Loader2 size={48} className="text-[#10b981] animate-spin" />
                                        <div className="absolute inset-0 blur-2xl bg-[#10b981]/30 rounded-full" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-lg font-black text-white uppercase tracking-tight">Processing Order</h3>
                                        <p className="text-[9px] text-gray-600 font-mono mt-2 uppercase tracking-widest">Connecting to vendor systems...</p>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'complete' && (
                                <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 flex flex-col items-center justify-center gap-6">
                                    <div className="relative">
                                        <div className="w-20 h-20 bg-[#10b981]/20 rounded-full flex items-center justify-center">
                                            <CheckCircle2 size={40} className="text-[#10b981]" />
                                        </div>
                                        <Sparkles size={20} className="absolute -top-2 -right-2 text-[#f1c21b]" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-lg font-black text-white uppercase tracking-tight">Order Confirmed</h3>
                                        <p className="text-[9px] text-gray-600 font-mono mt-2 uppercase tracking-widest">Order ID: {orderId}</p>
                                    </div>
                                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl w-full max-w-sm">
                                        <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                            <Truck size={14} className="text-[#22d3ee]" />
                                            <span>Estimated delivery: {selectedQuote?.leadTime}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/5 flex items-center justify-between">
                        <button onClick={onClose} className="px-5 py-2.5 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">
                            {step === 'complete' ? 'Close' : 'Cancel'}
                        </button>

                        {step === 'quantity' && (
                            <button
                                onClick={handleGetQuotes}
                                disabled={isLoading}
                                className="px-6 py-2.5 bg-[#10b981] text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#10b981]/90 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                                Get Quotes
                            </button>
                        )}

                        {step === 'confirm' && (
                            <button
                                onClick={handleConfirmOrder}
                                disabled={isLoading}
                                className="px-6 py-2.5 bg-[#10b981] text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#10b981]/90 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                                Confirm Order
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ProcurementModal;
