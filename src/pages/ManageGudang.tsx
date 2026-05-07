import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Warehouse, Plus, Trash2, Search, AlertCircle, CheckCircle2, Loader2, MapPin } from 'lucide-react';
import { storage } from '../lib/storage';
import { Gudang } from '../types';
import { cn } from '../lib/utils';

export default function ManageGudang() {
  const [gudang, setGudang] = useState<Gudang[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Form State
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");

  useEffect(() => {
    const fetchGudang = async () => {
      setGudang(await storage.getGudang());
    };
    fetchGudang();
  }, []);

  const handleAddGudang = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      if (!newId || !newName) throw new Error("ID DAN NAMA WAJIB DIISI.");
      
      const newGudang: Gudang = {
        id: newId.toUpperCase().trim(),
        nama: newName.toUpperCase().trim(),
        lokasi: newLocation.toUpperCase().trim()
      };

      await storage.addGudang(newGudang);
      setGudang(await storage.getGudang());
      setStatus({ type: 'success', message: `BERHASIL: GUDANG ${newGudang.nama} DITAMBAHKAN.` });
      window.dispatchEvent(new Event('warehouseListChanged'));
      setNewId("");
      setNewName("");
      setNewLocation("");
      setIsAdding(false);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message.toUpperCase() });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGudang = async (id: string) => {
    if (confirmingId === id) {
      setLoading(true);
      try {
        await storage.deleteGudang(id);
        setGudang(await storage.getGudang());
        setStatus({ type: 'success', message: `BERHASIL: GUDANG ${id} DIHAPUS.` });
        window.dispatchEvent(new Event('warehouseListChanged'));
        setConfirmingId(null);
      } catch (err: any) {
        setStatus({ type: 'error', message: err.message.toUpperCase() });
        setConfirmingId(null);
      } finally {
        setLoading(false);
      }
    } else {
      setConfirmingId(id);
      setTimeout(() => setConfirmingId(prev => prev === id ? null : prev), 3000);
    }
  };

  const filteredGudang = gudang.filter(g => 
    (g.id?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (g.nama?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (g.lokasi?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg text-white">
            <Warehouse size={20} />
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Manajer Kluster Gudang</h2>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={14} />
            <input
              type="text"
              placeholder="CARI ID / NAMA / LOKASI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full md:w-64 text-[11px] font-bold tracking-tight uppercase"
            />
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={14} />
            Add New Warehouse
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900 p-6 rounded-xl text-white mb-6 border border-slate-800 shadow-xl">
              <form onSubmit={handleAddGudang} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">ID Gudang</label>
                  <input
                    type="text"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="CONTOH: GDG-01"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-xs text-white uppercase"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Nama Gudang</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="CONTOH: GUDANG UTAMA"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs text-white uppercase"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Lokasi</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="CONTOH: JAKARTA"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs text-white uppercase"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Daftarkan
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
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter">ID</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter">NAMA GUDANG</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter">LOKASI</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 uppercase">
              {filteredGudang.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <Warehouse size={32} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belum ada gudang terdaftar</p>
                  </td>
                </tr>
              ) : (
                filteredGudang.map((g, index) => (
                  <tr 
                    key={g.id || `gdg-${index}`} 
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="px-6 py-4 font-black text-slate-900 border-r border-slate-50">{g.id}</td>
                    <td className="px-6 py-4 text-slate-600 font-bold">{g.nama}</td>
                    <td className="px-6 py-4 text-slate-400 italic flex items-center gap-2">
                       <MapPin size={10} /> {g.lokasi || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleDeleteGudang(g.id)}
                        className={cn(
                          "p-2 rounded-lg transition-all flex items-center gap-1 mx-auto",
                          confirmingId === g.id 
                            ? "bg-rose-500 text-white text-[8px] font-bold px-3 py-1" 
                            : "text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                        )}
                      >
                        {confirmingId === g.id ? "KLIK LAGI" : <Trash2 size={16} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
           <div>Kluster Aktif: {gudang.length}</div>
           <div>Status Jaringan: TERSINKRONISASI</div>
        </div>
      </motion.div>
    </div>
  );
}
