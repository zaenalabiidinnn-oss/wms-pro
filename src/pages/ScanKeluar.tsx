/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Scan, Package, CheckCircle2, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { storage } from "../lib/storage";
import { Product, KeluarType, BarangKeluar } from "../types";
import { cn, formatError } from "../lib/utils";

export default function ScanKeluar() {
  const [sku, setSku] = useState("");
  const [resi, setResi] = useState("");
  const [jumlah, setJumlah] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [force, setForce] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<BarangKeluar[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  
  const [stok, setStok] = useState<any[]>([]);
  
  const resiRef = useRef<HTMLInputElement>(null);

  const [activeGudangId, setActiveGudangId] = useState(localStorage.getItem("activeGudangId") || "");

  const refreshRecent = async () => {
    const currentGudang = localStorage.getItem("activeGudangId") || "";
    setActiveGudangId(currentGudang);

    const today = new Date().toDateString();
    const data = await storage.getBarangKeluar();
    const updatedRecent = data
      .filter(k => k.gudangId === currentGudang && k.tipe === KeluarType.PENJUALAN && new Date(k.tanggal).toDateString() === today)
      .reverse();
    setRecentTransactions(updatedRecent);
    
    const allProducts = await storage.getProducts();
    setProducts(allProducts.filter(p => p.gudangId === currentGudang));

    // Also refresh stock levels
    const allStok = await storage.getStok();
    setStok(allStok.filter(s => s.gudangId === currentGudang));
  };

  useEffect(() => {
    refreshRecent();

    const handleChanged = () => {
      refreshRecent();
    };
    window.addEventListener('warehouseChanged', handleChanged);
    return () => window.removeEventListener('warehouseChanged', handleChanged);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sku || !resi || jumlah <= 0 || !activeGudangId) {
      setStatus({ type: 'error', message: "Semua field wajib diisi dengan benar, termasuk Gudang." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // Enforce resi uniqueness for penjualan
      const existingOut = await storage.getBarangKeluar();
      if (existingOut.some(k => k.resi === resi)) {
        throw new Error(`Resi ${resi} sudah pernah diproses.`);
      }

      await storage.processTransaction("keluar", {
        sku,
        gudangId: activeGudangId,
        resi,
        jumlah,
        tanggal: new Date().toISOString(),
        tipe_keluar: KeluarType.PENJUALAN,
        force
      });

      await refreshRecent();

      setStatus({ type: 'success', message: `BERHASIL: ${jumlah} UNIT ${sku} SIAP KIRIM DARI ${activeGudangId}.` });
      setResi("");
      setJumlah(1);
      
      if (resiRef.current) resiRef.current.focus();
    } catch (err: any) {
      setStatus({ type: 'error', message: formatError(err).toUpperCase() });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (sku && resi) {
        handleSubmit();
      } else if (!sku) {
        setStatus({ type: 'error', message: "HARAP PILIH SKU TERLEBIH DAHULU." });
      }
    }
  };

  const handleDeleteTransaction = async (id: string, resiVal: string) => {
    if (confirmingId === id) {
      setLoading(true);
      try {
        await storage.deleteTransaction(id, "keluar");
        await refreshRecent();
        setStatus({ type: 'success', message: `TRANSAKSI ${resiVal} BERHASIL DIBATALKAN.` });
        setConfirmingId(null);
      } catch (err: any) {
        setStatus({ type: 'error', message: "GAGAL MEMBATALKAN TRANSAKSI." });
        setConfirmingId(null);
      } finally {
        setLoading(false);
      }
    } else {
      setConfirmingId(id);
      setTimeout(() => setConfirmingId(prev => prev === id ? null : prev), 3000);
    }
  };

  const selectedProduct = products.find(p => p.sku === sku);

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-12 gap-8">
      <div className="col-span-12 lg:col-span-7">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Scan Barang Keluar</h3>
            <span className="text-[10px] bg-rose-100 text-rose-700 font-black px-2 py-0.5 rounded tracking-tighter">PENJUALAN RESMI</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Produk SKU</label>
              <select
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-xs uppercase appearance-none"
                required
              >
                <option value="">-- PILIH SKU --</option>
                {products
                  .filter(p => p.sku && p.sku.trim() !== "")
                  .map((p, index) => (
                  <option key={p.sku || `opt-${index}`} value={p.sku}>
                    {p.sku} {p.nama_produk ? `| ${p.nama_produk}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">No. Resi Pengiriman</label>
              <div className="relative">
                <input
                  ref={resiRef}
                  type="text"
                  value={resi}
                  onChange={(e) => setResi(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="SCAN ATAU INPUT RESI..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm placeholder:text-slate-300"
                  required
                />
                <Scan size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Jumlah</label>
                <input
                  type="number"
                  min="1"
                  value={jumlah}
                  onChange={(e) => setJumlah(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center text-sm font-black"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Tanggal Sync</label>
                <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 text-center text-[10px] font-black font-mono">
                  {new Date().toLocaleDateString('id-ID').toUpperCase()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <input 
                type="checkbox" 
                id="force-scan"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="force-scan" className="text-[10px] font-bold text-slate-500 uppercase tracking-tight cursor-pointer">
                Paksa Scan (Bypass Validasi Stok)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !sku || !resi}
              className={cn(
                "w-full py-3.5 rounded-lg font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95",
                loading || !sku || !resi
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
              )}
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Package size={16} />}
              {loading ? "MEMPROSES..." : "PROSES TRANSAKSI"}
            </button>

            <AnimatePresence>
              {status && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "p-3 rounded-lg border flex gap-3 items-center",
                    status.type === 'success' 
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                      : "bg-rose-50 border-rose-100 text-rose-700"
                  )}
                >
                  {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <p className="text-[10px] font-black uppercase tracking-tight">{status.message}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>
      </div>

      <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="text-amber-700" size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-amber-900 uppercase tracking-tight">Protokol Keamanan</p>
              <p className="text-[10px] text-amber-700 mt-1 leading-relaxed">
                Pastikan nomor resi sesuai dengan label yang tercetak. Sistem akan melakukan validasi ganda terhadap database penjualan.
              </p>
            </div>
          </div>
        </section>

        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 p-5 rounded-xl text-white shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Package size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Metadata Produk</p>
                <p className="text-sm font-bold truncate">{selectedProduct.nama_produk}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Stok Saat Ini</p>
                <p className="text-xl font-black font-mono text-blue-400">
                  {stok.find(s => s.sku === sku)?.jumlah || 0}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Indeks Harga Unit</p>
                <p className="text-xl font-black font-mono text-slate-300">--</p>
              </div>
            </div>
          </motion.div>
        )}

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-700">Diproses Hari Ini</h3>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{new Date().toLocaleDateString('id-ID')}</span>
          </div>
          <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
            {recentTransactions.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tidak ada item yang diproses baru-baru ini</p>
              </div>
            ) : (
              recentTransactions.map((tx, i) => {
                const prod = products.find(p => p.sku === tx.sku);
                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-400">
                        {i + 1}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black font-mono text-slate-900 uppercase tracking-tight">{tx.sku}</span>
                        <span className="text-[9px] font-black text-slate-600 truncate uppercase mt-0.5">{prod?.nama_produk || 'Unknown Product'}</span>
                        <span className="text-[9px] font-bold text-slate-400 font-mono mt-0.5">{tx.resi}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right flex-shrink-0">
                      <div>
                        <span className="text-sm font-black text-rose-600 tracking-tighter">-{tx.jumlah} UNIT</span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{new Date(tx.tanggal).toLocaleTimeString('id-ID')}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteTransaction(tx.id, tx.resi)}
                        className={cn(
                          "p-2 rounded-lg transition-all flex items-center gap-1",
                          confirmingId === tx.id 
                            ? "bg-rose-500 text-white text-[8px] font-bold px-3 py-1" 
                            : "text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                        )}
                        title="Hapus Transaksi"
                      >
                        {confirmingId === tx.id ? "KLIK LAGI" : <Trash2 size={15} />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {recentTransactions.length > 0 && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Catatan Database: {recentTransactions.length} Item</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
