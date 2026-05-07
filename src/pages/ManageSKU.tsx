import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Plus, Trash2, Search, AlertCircle, CheckCircle2, Loader2, Tag, Upload } from 'lucide-react';
import { storage } from '../lib/storage';
import { Product } from '../types';
import { cn, formatError } from '../lib/utils';

export default function ManageSKU() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [confirmingSku, setConfirmingSku] = useState<string | null>(null);
  const [confirmingClearAll, setConfirmingClearAll] = useState(false);

  // Form State
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");

  const [activeGudangId, setActiveGudangId] = useState(localStorage.getItem("activeGudangId") || "");

  const refreshProducts = async () => {
    const currentGudang = localStorage.getItem("activeGudangId") || "";
    setActiveGudangId(currentGudang);
    const all = await storage.getProducts();
    setProducts(all.filter(p => p.gudangId === currentGudang));
  };

  useEffect(() => {
    refreshProducts();

    const handleChanged = () => {
      refreshProducts();
    };

    window.addEventListener('warehouseChanged', handleChanged);
    return () => window.removeEventListener('warehouseChanged', handleChanged);
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      if (!newSku || !newName || !activeGudangId) throw new Error("SEMUA FIELD WAJIB DIISI, TERMASUK GUDANG AKTIF.");
      
      const product: Product = {
        id: `${newSku.toUpperCase().trim()}_${activeGudangId}`,
        sku: newSku.toUpperCase().trim(),
        nama_produk: newName.trim(),
        gudangId: activeGudangId
      };

      await storage.addProduct(product);
      await refreshProducts();
      setStatus({ type: 'success', message: `BERHASIL: SKU ${product.sku} DITAMBAHKAN.` });
      setNewSku("");
      setNewName("");
      setIsAdding(false);
    } catch (err: any) {
      setStatus({ type: 'error', message: formatError(err).toUpperCase() });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string, sku: string) => {
    if (confirmingSku === id) {
      setLoading(true);
      try {
        await storage.deleteProduct(id);
        await refreshProducts();
        setStatus({ type: 'success', message: `BERHASIL: SKU ${sku} DIHAPUS.` });
        setConfirmingSku(null);
      } catch (err: any) {
        setStatus({ type: 'error', message: formatError(err).toUpperCase() });
        setConfirmingSku(null);
      } finally {
        setLoading(false);
      }
    } else {
      setConfirmingSku(id);
      setTimeout(() => setConfirmingSku(prev => prev === id ? null : prev), 3000);
    }
  };

  const handleImportCSV = async () => {
    if (!importData || !activeGudangId) return;
    setLoading(true);
    setStatus(null);
    try {
      const lines = importData.split("\n");
      let count = 0;
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.includes(";") ? line.split(";") : line.split(",");
        if (parts.length >= 2) {
          const skuVal = parts[0].trim().toUpperCase();
          const name = parts[1].trim();
          if (skuVal && name) {
            await storage.addProduct({ 
              id: `${skuVal}_${activeGudangId}`, 
              sku: skuVal, 
              nama_produk: name, 
              gudangId: activeGudangId 
            });
            count++;
          }
        }
      }
      await refreshProducts();
      setStatus({ type: 'success', message: `BERHASIL IMPORT ${count} SKU.` });
      setIsImporting(false);
      setImportData("");
    } catch (err: any) {
      setStatus({ type: 'error', message: "GAGAL IMPORT DATA: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const clearAllProducts = async () => {
    if (confirmingClearAll) {
      setLoading(true);
      try {
        for (const p of products) {
          await storage.deleteProduct(p.id);
        }
        await refreshProducts();
        setStatus({ type: 'success', message: "SEMUA SKU DI GUDANG INI BERHASIL DIHAPUS." });
        setConfirmingClearAll(false);
      } catch (err: any) {
        setStatus({ type: 'error', message: "GAGAL MENGHAPUS SEMUA SKU." });
      } finally {
        setLoading(false);
      }
    } else {
      setConfirmingClearAll(true);
      setTimeout(() => setConfirmingClearAll(false), 3000);
    }
  };

  const filteredProducts = products.filter(p => {
    if (!p.sku || p.sku.trim() === "") return false;
    return (p.sku?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
           (p.nama_produk?.toLowerCase() || "").includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg text-white">
            <Tag size={20} />
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Manajer Registri SKU</h2>
          
          {products.length > 0 && (
            <button
              onClick={clearAllProducts}
              className={cn(
                "ml-4 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-2",
                confirmingClearAll 
                  ? "bg-rose-600 text-white animate-pulse" 
                  : "bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              )}
            >
              <Trash2 size={12} />
              {confirmingClearAll ? "KLIK LAGI UNTUK HAPUS SEMUA SKU" : "HAPUS SEMUA"}
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
           <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={14} />
            <input
              type="text"
              placeholder="CARI SKU / NAMA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full md:w-64 text-[11px] font-bold tracking-tight uppercase"
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setIsImporting(!isImporting); setIsAdding(false); }}
              className="flex items-center gap-2 bg-slate-800 text-slate-300 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 border border-slate-700"
            >
              <Upload size={14} />
              Import CSV
            </button>
            <button 
              onClick={() => { setIsAdding(!isAdding); setIsImporting(false); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Plus size={14} />
              Add New SKU
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isImporting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900 p-6 rounded-xl text-white mb-6 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Panduan Impor Massal SKU</h3>
                <span className="text-[9px] text-slate-600">FORMAT CSV: SKU,NAMA PRODUK</span>
              </div>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="INV-001,Sepatu Lari Nike&#10;INV-002,Kaos Kaki Adidas..."
                className="w-full h-32 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-[11px] text-white uppercase placeholder:text-slate-600 mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleImportCSV}
                  disabled={loading || !importData}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Jalankan Impor
                </button>
                <button
                  onClick={() => setIsImporting(false)}
                  className="px-6 py-2.5 border border-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                  Batal
                </button>
              </div>
              <p className="text-[9px] text-slate-500 mt-4 leading-relaxed uppercase tracking-tight">
                PRO-TIP: DI GOOGLE SHEETS, KLIK FILE &gt; DOWNLOAD &gt; CSV. COPY PASTE ISINYA KE BOX DI ATAS.
              </p>
            </div>
          </motion.div>
        )}

        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900 p-6 rounded-xl text-white mb-6 border border-slate-800 shadow-xl">
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Kode SKU Baru</label>
                  <input
                    type="text"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="CONTOH: INV-001"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-xs text-white uppercase"
                    required
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Deskripsi Produk</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="MASUKKAN NAMA PRODUK..."
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs text-white uppercase"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Daftarkan SKU
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2.5 border border-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "p-3 rounded-lg border flex gap-3 items-center mb-4",
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

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-[11px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter">INDEKS SKU</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter">DESKRIPSI PRODUK</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 uppercase">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <Package size={32} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registri SKU Kosong</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, index) => (
                  <tr 
                    key={p.id || `sku-${index}`} 
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="px-6 py-4 font-black text-slate-900 border-r border-slate-50">{p.sku}</td>
                    <td className="px-6 py-4 text-slate-600 font-bold">{p.nama_produk}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleDeleteProduct(p.id, p.sku)}
                        className={cn(
                          "p-2 rounded-lg transition-all flex items-center gap-1 mx-auto",
                          confirmingSku === p.id 
                            ? "bg-rose-500 text-white text-[8px] font-bold px-3 py-1" 
                            : "text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                        )}
                        title="Delete SKU"
                      >
                        {confirmingSku === p.id ? "KLIK LAGI" : <Trash2 size={16} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
           <div>SKU Aktif: {products.length}</div>
           <div>Protokol Sistem: V2.4_SECURE</div>
        </div>
      </motion.div>
    </div>
  );
}
