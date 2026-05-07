/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Package, 
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { storage } from "../lib/storage";
import { useEffect, useState } from "react";
import { Stok, LogTransaksi } from "../types";

function StatCard({ title, value, icon: Icon, color, delay }: { title: string, value: string | number, icon: any, color: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">{title}</p>
      <div className="flex items-end justify-between">
        <h3 className={cn("text-2xl font-black tracking-tighter", color.replace('bg-', 'text-'))}>{value}</h3>
        <div className={cn("p-1.5 rounded-md", color)}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
    </motion.div>
  );
}

import { cn } from "../lib/utils";

export default function Dashboard() {
  const [stok, setStok] = useState<Stok[]>([]);
  const [logs, setLogs] = useState<LogTransaksi[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activeGudangId, setActiveGudangId] = useState(localStorage.getItem("activeGudangId") || "");

  const fetchData = async () => {
    const currentGudang = localStorage.getItem("activeGudangId") || "";
    setActiveGudangId(currentGudang);

    const [allStok, allLogs, allProducts] = await Promise.all([
      storage.getStok(),
      storage.getLogs(),
      storage.getProducts()
    ]);

    // Filter by active warehouse
    const filteredStok = allStok.filter(s => s.gudangId === currentGudang);
    const filteredLogs = allLogs.filter(l => l.gudangId === currentGudang);

    setStok(filteredStok);
    setLogs(filteredLogs.slice(0, 8)); // Take first 8 (already sorted by latest in firestoreStorage)
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

  const totalStok = stok.reduce((acc, curr) => acc + curr.jumlah, 0);
  const totalMasuk = logs.filter(l => l.masuk > 0).reduce((acc, curr) => acc + curr.masuk, 0);
  const totalKeluar = logs.filter(l => l.keluar > 0).reduce((acc, curr) => acc + curr.keluar, 0);
  const lowStok = stok.filter(s => s.jumlah < 10).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total SKU Stok" 
          value={(totalStok ?? 0).toLocaleString()} 
          icon={Package} 
          color="bg-slate-800" 
          delay={0.1} 
        />
        <StatCard 
          title="Keluar (Sesi Ini)" 
          value={totalKeluar} 
          icon={ArrowUpFromLine} 
          color="bg-rose-600" 
          delay={0.2} 
        />
        <StatCard 
          title="Masuk (Sesi Ini)" 
          value={totalMasuk} 
          icon={ArrowDownToLine} 
          color="bg-emerald-600" 
          delay={0.3} 
        />
        <StatCard 
          title="Akurasi Stok" 
          value="99.9%" 
          icon={TrendingUp} 
          color="bg-blue-600" 
          delay={0.4} 
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Log Transaksi Terkini</h3>
            <span className="text-[10px] text-slate-400 font-mono">Sinkronisasi Real-time</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-[11px]">
              <thead className="bg-slate-50">
                <tr className="text-slate-400">
                  <th className="py-2 px-6 font-bold uppercase tracking-tighter">Waktu</th>
                  <th className="py-2 px-6 font-bold uppercase tracking-tighter">SKU</th>
                  <th className="py-2 px-6 font-bold uppercase tracking-tighter">Tipe</th>
                  <th className="py-2 px-6 font-bold uppercase tracking-tighter text-right">Jml</th>
                  <th className="py-2 px-6 font-bold uppercase tracking-tighter text-right">Stok Akhir</th>
                </tr>
              </thead>
              <tbody className="text-slate-600 divide-y divide-slate-50">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center italic text-slate-400">Belum ada aktivitas terekam.</td>
                  </tr>
                ) : (
                  logs
                    .filter(log => log.sku && log.sku.trim() !== "")
                    .map((log, index) => (
                    <tr key={log.id || `log-${index}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-6">{log.tanggal ? new Date(log.tanggal).toLocaleTimeString('id-ID') : '-'}</td>
                      <td className="py-2.5 px-6 font-bold text-slate-900">{log.sku || 'N/A'}</td>
                      <td className="py-2.5 px-6">
                        <span className={cn(
                          "font-bold",
                          (log.masuk || 0) > 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {(log.tipe || 'UNKNOWN').toUpperCase()}
                        </span>
                      </td>
                      <td className={cn(
                        "py-2.5 px-6 text-right font-bold",
                        (log.masuk || 0) > 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {(log.masuk || 0) > 0 ? `+${log.masuk}` : `-${log.keluar}`}
                      </td>
                      <td className="py-2.5 px-6 text-right font-black text-slate-900">{log.stok_setelah ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 text-[10px] text-slate-400 flex justify-between border-t border-slate-100">
            <span>Menampilkan 8 transaksi terakhir</span>
            <span className="font-mono">STATUS: TERBARU</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-12 lg:col-span-4 flex flex-col gap-4"
        >
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              Stok Kritis
            </h3>
            <div className="space-y-2">
              {stok.filter(s => s.sku && s.sku.trim() !== "" && s.jumlah < 10).length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aman • Level Hijau</p>
                </div>
              ) : (
                stok
                  .filter(s => s.sku && s.sku.trim() !== "" && s.jumlah < 10)
                  .map((s, index) => (
                  <div key={s.sku || `stok-${index}`} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black font-mono text-amber-800">{s.sku || 'N/A'}</span>
                      <span className="text-[10px] text-amber-700 truncate w-32">{products.find(p => p.sku === s.sku)?.nama_produk || 'Produk Tidak Ditemukan'}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-amber-900">{s.jumlah} UNIT</p>
                      <p className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter">RESTOCK SEGERA</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
