/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpFromLine, MessageSquare, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { storage } from "../lib/storage";
import { Product, KeluarType, BarangKeluar } from "../types";
import { cn, formatError } from "../lib/utils";
import { Trash2 } from "lucide-react";

export default function KeluarKhusus() {
  const [sku, setSku] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [jumlah, setJumlah] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [force, setForce] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<BarangKeluar[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [activeGudangId, setActiveGudangId] = useState(localStorage.getItem("activeGudangId") || "");

  const refreshRecent = async () => {
    const currentGudang = localStorage.getItem("activeGudangId") || "";
    setActiveGudangId(currentGudang);

    const today = new Date().toDateString();
    const data = await storage.getBarangKeluar();
    const updatedRecent = data
      .filter(k => k.gudangId === currentGudang && k.tipe === KeluarType.KHUSUS && new Date(k.tanggal).toDateString() === today)
      .reverse();
    setRecentTransactions(updatedRecent);

    const allProducts = await storage.getProducts();
    setProducts(allProducts.filter(p => p.gudangId === currentGudang));
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
    if (!sku || !keterangan || jumlah <= 0 || !activeGudangId) {
      setStatus({ type: 'error', message: "Keterangan, jumlah, dan Gudang wajib diisi." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await storage.processTransaction("keluar", {
        sku,
        gudangId: activeGudangId,
        keterangan,
        jumlah,
        tanggal: new Date().toISOString(),
        tipe_keluar: KeluarType.KHUSUS,
        force
      });

      await refreshRecent();
      setStatus({ type: 'success', message: `Berhasil! ${jumlah} unit ${sku} keluar (khusus) dari ${activeGudangId}.` });
      setKeterangan("");
      setJumlah(0);
      setSku("");
    } catch (err: any) {
      setStatus({ type: 'error', message: formatError(err).toUpperCase() });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string, ket: string) => {
    if (confirmingId === id) {
      setLoading(true);
      try {
        await storage.deleteTransaction(id, "keluar");
        await refreshRecent();
        setStatus({ type: 'success', message: `TRANSAKSI BERHASIL DIBATALKAN.` });
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
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Audit Barang Keluar Khusus</h3>
            <span className="text-[10px] bg-amber-100 text-amber-700 font-black px-2 py-0.5 rounded tracking-tighter">INTERNAL / NON-SALE</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Identifikasi SKU</label>
              <select
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-xs uppercase appearance-none"
                required
              >
                <option value="">-- PILIH REF SKU --</option>
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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Justifikasi / Keterangan Operasional</label>
              <div className="relative">
                <textarea
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="EX: INTERNAL PRODUCT DAMAGE / PROMOTIONAL SAMPLE..."
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-[11px] uppercase placeholder:text-slate-300"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Kuantitas</label>
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Otorisasi Tanggal</label>
                <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 text-center text-[10px] font-black font-mono">
                  {new Date().toLocaleDateString('id-ID').toUpperCase()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <input 
                type="checkbox" 
                id="force-audit"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="force-audit" className="text-[10px] font-bold text-slate-500 uppercase tracking-tight cursor-pointer">
                Paksa Ambil (Tanpa Cek Stok)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !sku || !keterangan || jumlah <= 0}
              className={cn(
                "w-full py-3.5 rounded-lg font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95",
                loading || !sku || !keterangan || jumlah <= 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-amber-600 text-white hover:bg-amber-700 shadow-amber-200"
              )}
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <ArrowUpFromLine size={16} />}
              {loading ? "MEMPROSES AUDIT..." : "KONFIRMASI PENGELUARAN"}
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

      <div className="col-span-12 lg:col-span-5">
        <section className="bg-slate-100 border border-slate-200 rounded-xl p-5">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm flex-shrink-0">
               <MessageSquare className="text-slate-500" size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Requirement Validasi</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                Setiap transaksi non-penjualan akan dicatat di buku besar khusus. Harap sertakan alasan yang jelas sesuai standar audit gudang.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-6">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-700">Log Khusus Hari Ini</h3>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{new Date().toLocaleDateString('id-ID')}</span>
          </div>
          <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
            {recentTransactions.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belum ada pengeluaran khusus hari ini</p>
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
                        <span className="text-[9px] font-bold text-slate-400 italic mt-0.5">{tx.keterangan}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right flex-shrink-0">
                      <div>
                        <span className="text-sm font-black text-rose-600 tracking-tighter">-{tx.jumlah} UNIT</span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{new Date(tx.tanggal).toLocaleTimeString('id-ID')}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteTransaction(tx.id, tx.keterangan || "")}
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
