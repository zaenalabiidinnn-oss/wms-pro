/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { BarChart3, Calendar, Filter, FileSpreadsheet } from "lucide-react";
import { storage } from "../lib/storage";
import { LogTransaksi, Product } from "../types";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

export default function Laporan() {
  const [logs, setLogs] = useState<LogTransaksi[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [view, setView] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeGudangId, setActiveGudangId] = useState(localStorage.getItem("activeGudangId") || "");

  const fetchData = async () => {
    const currentGudang = localStorage.getItem("activeGudangId") || "";
    setActiveGudangId(currentGudang);

    const [allLogs, allProducts] = await Promise.all([
      storage.getLogs(),
      storage.getProducts()
    ]);
    
    // Filter by active warehouse
    setLogs(allLogs.filter(l => l.gudangId === currentGudang));
    setProducts(allProducts.filter(p => p.gudangId === currentGudang));
  };

  useEffect(() => {
    fetchData();

    const handleChanged = () => {
      fetchData();
    };
    window.addEventListener('warehouseChanged', handleChanged);
    return () => window.removeEventListener('warehouseChanged', handleChanged);
  }, []);

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const filteredLogs = logs.filter(l => {
    const d = new Date(l.tanggal);
    if (view === 'monthly') {
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    }
    return d.getFullYear() === selectedYear;
  });

  const summary = products
    .filter(p => p.sku && p.sku.trim() !== "")
    .map(p => {
    const pLogs = filteredLogs.filter(l => l.sku === p.sku);
    const masuk = pLogs.reduce((acc, curr) => acc + curr.masuk, 0);
    const keluar = pLogs.reduce((acc, curr) => acc + curr.keluar, 0);
    return { ...p, masuk, keluar };
  });

  const totalMasuk = summary.reduce((acc, curr) => acc + curr.masuk, 0);
  const totalKeluar = summary.reduce((acc, curr) => acc + curr.keluar, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg text-white">
            <BarChart3 size={20} />
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Analisis & Laporan Stok</h2>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
          <button 
            onClick={() => setView('monthly')}
            className={cn(
              "px-4 py-1.5 text-[10px] font-black uppercase rounded transition-all",
              view === 'monthly' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            )}
          >
            Bulanan
          </button>
          <button 
            onClick={() => setView('yearly')}
            className={cn(
              "px-4 py-1.5 text-[10px] font-black uppercase rounded transition-all",
              view === 'yearly' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            )}
          >
            Tahunan
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Tahun Referensi</label>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs appearance-none min-w-[100px]"
          >
            {[2023, 2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {view === 'monthly' && (
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Bulan Referensi</label>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs appearance-none min-w-[140px]"
            >
              {months.map((m, i) => (
                <option key={m} value={i}>{m.toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}

        <div className="ml-auto flex gap-3">
          <div className="px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-3">
             <ArrowDownToLine size={14} className="text-emerald-600" />
             <div className="text-right">
               <p className="text-[8px] font-bold text-emerald-700 uppercase leading-none mb-1">Stok Masuk</p>
               <p className="text-base font-black text-emerald-900 font-mono tracking-tighter leading-none">{(totalMasuk ?? 0).toLocaleString()}</p>
             </div>
          </div>
          <div className="px-4 py-2 bg-rose-50 rounded-lg border border-rose-100 flex items-center gap-3">
             <ArrowUpFromLine size={14} className="text-rose-600" />
             <div className="text-right">
               <p className="text-[8px] font-bold text-rose-700 uppercase leading-none mb-1">Stok Keluar</p>
               <p className="text-base font-black text-rose-900 font-mono tracking-tighter leading-none">{(totalKeluar ?? 0).toLocaleString()}</p>
             </div>
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet size={14} className="text-blue-600" />
            Matriks Alur Inventaris
          </h3>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Periode: {view === 'monthly' ? `${months[selectedMonth]} ${selectedYear}` : selectedYear}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter">INDEKS SKU</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter">DESKRIPSI</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter text-right">MASUK</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter text-right">KELUAR</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter text-right">SELISIH BERSIH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 uppercase">
              {summary.map((item, index) => (
                <tr key={item.sku || `rep-${index}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3 font-black text-slate-900 border-r border-slate-50">{item.sku}</td>
                  <td className="px-6 py-3 text-slate-600 font-bold">{item.nama_produk}</td>
                  <td className="px-6 py-3 text-right">
                    <span className="font-black text-emerald-600">+{item.masuk}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="font-black text-rose-600">-{item.keluar}</span>
                  </td>
                  <td className={cn(
                    "px-6 py-3 text-right font-black border-l border-slate-50",
                    item.masuk - item.keluar >= 0 ? "text-blue-600 bg-blue-50/20" : "text-rose-600 bg-rose-50/20"
                  )}>
                    {item.masuk - item.keluar > 0 ? "+" : ""}{item.masuk - item.keluar}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center px-6">
           <span>Laporan Audit Terverifikasi</span>
           <span>Timestamp: {new Date().toISOString()}</span>
        </div>
      </motion.div>
    </div>
  );
}

import { ArrowDownToLine as ArrowDownToLineIcon, ArrowUpFromLine as ArrowUpFromLineIcon } from "lucide-react";
const ArrowDownToLine = ArrowDownToLineIcon;
const ArrowUpFromLine = ArrowUpFromLineIcon;
