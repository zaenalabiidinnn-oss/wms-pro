/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowDownToLine, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { storage } from "../lib/storage";
import { Product, BarangMasuk as IBarangMasuk } from "../types";
import { cn, formatError } from "../lib/utils";
import { Trash2 } from "lucide-react";

export default function BarangMasuk() {
  const [sku, setSku] = useState("");
  const [dokumen, setDokumen] = useState("");
  const [jumlah, setJumlah] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<IBarangMasuk[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [stok, setStok] = useState<any[]>([]);

  const [activeGudangId, setActiveGudangId] = useState(localStorage.getItem("activeGudangId") || "");

  const refreshRecent = async () => {
    const currentGudang = localStorage.getItem("activeGudangId") || "";
    setActiveGudangId(currentGudang);
    
    const today = new Date().toDateString();
    const data = await storage.getBarangMasuk();
    const updatedRecent = data
      .filter(m => m.gudangId === currentGudang && new Date(m.tanggal).toDateString() === today)
      .reverse();
    setRecentTransactions(updatedRecent);
    
    const allProducts = await storage.getProducts();
    setProducts(allProducts.filter(p => p.gudangId === currentGudang));

    // Also refresh stock
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !dokumen || jumlah <= 0 || !activeGudangId) {
      setStatus({ type: 'error', message: "Semua field wajib diisi, termasuk Gudang." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await storage.processTransaction("masuk", {
        sku,
        gudangId: activeGudangId,
        dokumen,
        jumlah,
        tanggal: new Date().toISOString()
      });

      await refreshRecent();
      setStatus({ type: 'success', message: `Berhasil! ${jumlah} unit ${sku} ditambahkan ke stok gudang ${activeGudangId}.` });
      setDokumen("");
      setJumlah(0);
      setSku("");
    } catch (err: any) {
      setStatus({ type: 'error', message: formatError(err).toUpperCase() });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string, docVal: string) => {
    if (confirmingId === id) {
      setLoading(true);
      try {
        await storage.deleteTransaction(id, "masuk");
        await refreshRecent();
        setStatus({ type: 'success', message: `TRANSAKSI ${docVal} BERHASIL DIBATALKAN.` });
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

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-12 gap-8">
      <div className="col-span-12 lg:col-span-7">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Input Penerimaan Barang</h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-black px-2 py-0.5 rounded tracking-tighter">STOCK IN-BOUND</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Pilih Produk</label>
              <select
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-xs uppercase appearance-none"
                required
              >
                <option value="">-- PILIH PRODUK --</option>
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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nomor Dokumen PO / Penjual</label>
              <div className="relative">
                <input
                  type="text"
                  value={dokumen}
                  onChange={(e) => setDokumen(e.target.value)}
                  placeholder="EX: PO-SYNC-8821"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm uppercase placeholder:text-slate-300"
                  required
                />
                <FileText size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Jumlah Unit</label>
                <input
                  type="number"
                  min="1"
                  value={jumlah || ""}
                  onChange={(e) => setJumlah(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center text-sm font-black"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Waktu Input</label>
                <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 text-center text-[10px] font-black font-mono">
                  {new Date().toLocaleTimeString('id-ID')}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !sku || !dokumen || jumlah <= 0}
              className={cn(
                "w-full py-3.5 rounded-lg font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95",
                loading || !sku || !dokumen || jumlah <= 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"
              )}
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <ArrowDownToLine size={16} />}
              {loading ? "MENYIMPAN DATA..." : "KONFIRMASI PENERIMAAN"}
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
                  <p className="text-[10px] font-black uppercase tracking-tight">{status.message.toUpperCase()}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>
      </div>

      <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Ringkasan SKU Terpilih</p>
          {sku ? (
            <div className="space-y-4">
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-[9px] font-bold text-slate-500 uppercase">Nama Produk</p>
                <p className="text-sm font-bold">{products.find(p => p.sku === sku)?.nama_produk}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Stok Saat Ini</p>
                  <p className="text-xl font-black text-emerald-400">{stok.find(s => s.sku === sku)?.jumlah || 0}</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Estimasi Akhir</p>
                  <p className="text-xl font-black text-blue-400">
                    {(stok.find(s => s.sku === sku)?.jumlah || 0) + (jumlah || 0)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-lg">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Silahkan Pilih SKU</p>
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-700">Penerimaan Hari Ini</h3>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{new Date().toLocaleDateString('id-ID')}</span>
          </div>
          <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
            {recentTransactions.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belum ada penerimaan hari ini</p>
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
                        <span className="text-[9px] font-black text-slate-600 truncate uppercase mt-0.5">{prod?.nama_produk || 'Produk Tidak Diketahui'}</span>
                        <span className="text-[9px] font-bold text-slate-400 font-mono mt-0.5">{tx.dokumen}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right flex-shrink-0">
                      <div>
                        <span className="text-sm font-black text-emerald-600 tracking-tighter">+{tx.jumlah} UNIT</span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{new Date(tx.tanggal).toLocaleTimeString('id-ID')}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteTransaction(tx.id, tx.dokumen)}
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
        </section>
      </div>
    </div>
  );
}
