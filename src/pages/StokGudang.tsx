/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Search, Package, ArrowUpDown } from "lucide-react";
import { storage } from "../lib/storage";
import { Product, Stok } from "../types";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

export default function StokGudang() {
  const [stok, setStok] = useState<Stok[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeGudangId, setActiveGudangId] = useState(localStorage.getItem("activeGudangId") || "");

  const fetchData = async () => {
    const currentGudang = localStorage.getItem("activeGudangId") || "";
    setActiveGudangId(currentGudang);

    const [allStok, allProducts] = await Promise.all([
      storage.getStok(),
      storage.getProducts()
    ]);
    
    // Filter by active warehouse
    setStok(allStok.filter(s => s.gudangId === currentGudang));
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

  const filteredStok = stok.filter(s => {
    if (!s.sku || s.sku.trim() === "") return false;
    const product = products.find(p => p.sku === s.sku);
    return (s.sku?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
           (product?.nama_produk?.toLowerCase() || "").includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg text-white">
            <Package size={20} />
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Matriks Kontrol Inventaris</h2>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={14} />
          <input
            type="text"
            placeholder="CARI SKU / NAMA..."
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
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter">INDEKS SKU</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter">DESKRIPSI PRODUK</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter text-right">JUMLAH STOK</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-tighter text-center">STATUS SISTEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStok.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <Package size={32} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data tidak ditemukan</p>
                  </td>
                </tr>
              ) : (
                filteredStok.map((item, index) => {
                  const product = products.find(p => p.sku === item.sku);
                  const isLow = item.jumlah < 10;
                  return (
                    <tr 
                      key={item.sku || `item-${index}`} 
                      className="hover:bg-slate-50/80 transition-colors group border-l-2 border-transparent hover:border-blue-500"
                    >
                      <td className="px-6 py-3 font-black text-slate-900">{item.sku}</td>
                      <td className="px-6 py-3 text-slate-600 font-bold uppercase truncate max-w-[300px]">{product?.nama_produk}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={cn(
                          "text-base font-black tracking-tighter",
                          isLow ? "text-rose-600" : "text-slate-900"
                        )}>
                          {(item.jumlah ?? 0).toLocaleString()}
                        </span>
                        <span className="text-slate-400 text-[9px] uppercase ml-1 font-bold">Unit</span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        {isLow ? (
                          <div className="flex flex-col items-center">
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black uppercase rounded tracking-tighter border border-rose-100">Stok Rendah</span>
                            <span className="text-[8px] text-rose-400 font-bold mt-0.5 uppercase tracking-tighter">Level Kritis</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded tracking-tighter border border-emerald-100">Optimal</span>
                            <span className="text-[8px] text-emerald-400 font-bold mt-0.5 uppercase tracking-tighter">Terverifikasi</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
           <div>Database: Master_Inv_v1</div>
           <div>Sync Integrity: 100%</div>
        </div>
      </motion.div>
    </div>
  );
}
