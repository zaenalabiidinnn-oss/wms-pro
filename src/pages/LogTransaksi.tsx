/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { History, ArrowDownToLine, ArrowUpFromLine, Search, Trash2 } from "lucide-react";
import { storage } from "../lib/storage";
import { LogTransaksi as LogType } from "../types";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

export default function LogTransaksi() {
  const [logs, setLogs] = useState<LogType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [activeGudangId, setActiveGudangId] = useState(localStorage.getItem("activeGudangId") || "");

  const refreshLogs = async () => {
    const currentGudang = localStorage.getItem("activeGudangId") || "";
    setActiveGudangId(currentGudang);

    const allLogs = await storage.getLogs();
    const filtered = allLogs.filter(l => l.gudangId === currentGudang);
    setLogs([...filtered].reverse());
  };

  useEffect(() => {
    refreshLogs();

    const handleChanged = () => {
      refreshLogs();
    };
    window.addEventListener('warehouseChanged', handleChanged);
    return () => window.removeEventListener('warehouseChanged', handleChanged);
  }, []);

  const handleClearAll = async () => {
    if (confirmingAll) {
      await storage.clearLogs(activeGudangId);
      await refreshLogs();
      setConfirmingAll(false);
    } else {
      setConfirmingAll(true);
      setTimeout(() => setConfirmingAll(false), 3000);
    }
  };

  const filteredLogs = logs.filter(l => {
    if (!l.sku || l.sku.trim() === "") return false;
    return (l.sku?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
           (l.tipe?.toLowerCase() || "").includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg text-white">
            <History size={20} />
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Buku Besar Transaksi Sistem</h2>
          
          {logs.length > 0 && (
            <button
              onClick={handleClearAll}
              className={cn(
                "ml-4 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-2",
                confirmingAll 
                  ? "bg-rose-600 text-white animate-pulse" 
                  : "bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              )}
            >
              <Trash2 size={12} />
              {confirmingAll ? "KLIK LAGI UNTUK HAPUS SEMUA" : "HAPUS SEMUA"}
            </button>
          )}
        </div>
        
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={14} />
          <input
            type="text"
            placeholder="CARI SKU / TIPE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full md:w-80 text-[11px] font-bold tracking-tight uppercase"
          />
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-[11px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter">WAKTU</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter">REF SKU</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter">OPERASI</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter text-right">MSK</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter text-right">KLR</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter text-right border-l-2 border-slate-100">STOK AKHIR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 uppercase">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <History size={32} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Log tidak ditemukan</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="px-6 py-3">
                      <p className="text-slate-900 font-black">
                        {new Date(log.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold">
                        {new Date(log.tanggal).toLocaleTimeString('id-ID')}
                      </p>
                    </td>
                    <td className="px-6 py-3 font-black text-slate-900">{log.sku}</td>
                    <td className="px-6 py-3">
                      <span className={cn(
                        "font-black tracking-tight",
                        log.masuk > 0 
                          ? "text-emerald-500" 
                          : (log.tipe?.toLowerCase() || "").includes("khusus")
                            ? "text-amber-500"
                            : "text-rose-500"
                      )}>
                        {log.tipe}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {log.masuk > 0 ? (
                        <span className="font-black text-emerald-600">+{log.masuk}</span>
                      ) : (
                        <span className="text-slate-200">---</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {log.keluar > 0 ? (
                        <span className="font-black text-rose-600">-{log.keluar}</span>
                      ) : (
                        <span className="text-slate-200">---</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right font-black text-slate-900 border-l-2 border-slate-50 bg-slate-50/30">
                      {log.stok_setelah}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
