/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  Package, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  FileText, 
  History, 
  Scan,
  LayoutDashboard,
  Menu,
  X,
  Tag,
  Warehouse,
  ChevronDown,
  Plus,
  Trash2,
  Settings
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { auth, isFirebaseConfigured } from "./lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";
import { LogIn, LogOut } from "lucide-react";
import { storage } from "./lib/storage";
import { Gudang, AppUser, UserRole } from "./types";

// Pages
import Dashboard from "./pages/Dashboard";
import ScanKeluar from "./pages/ScanKeluar";
import BarangMasuk from "./pages/BarangMasuk";
import KeluarKhusus from "./pages/KeluarKhusus";
import StokGudang from "./pages/StokGudang";
import LogTransaksi from "./pages/LogTransaksi";
import Laporan from "./pages/Laporan";
import ManageSKU from "./pages/ManageSKU";

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [gudangList, setGudangList] = useState<Gudang[]>([]);
  const [activeGudangId, setActiveGudangId] = useState<string>("");
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newGudang, setNewGudang] = useState({ id: "", nama: "", lokasi: "" });

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          let profile = await storage.getUserProfile(currentUser.uid);
          if (!profile) {
            profile = await storage.createUserProfile({
              uid: currentUser.uid,
              email: currentUser.email || "",
              nama: currentUser.displayName || undefined
            });
          }
          setAppUser(profile);
        } catch (error) {
          console.error("Auth state change error:", error);
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchGudang = async () => {
      const list = await storage.getGudang();
      setGudangList(list);
      
      const saved = localStorage.getItem("activeGudangId");
      if (saved && list.find(g => g.id === saved)) {
        setActiveGudangId(saved);
      } else if (list.length > 0) {
        setActiveGudangId(list[0].id);
        localStorage.setItem("activeGudangId", list[0].id);
      } else {
        setActiveGudangId("");
        localStorage.removeItem("activeGudangId");
      }
    };
    fetchGudang();

    const handleListChanged = () => {
      fetchGudang();
    };
    window.addEventListener('warehouseListChanged', handleListChanged);
    return () => window.removeEventListener('warehouseListChanged', handleListChanged);
  }, []);

  const handleGudangChange = (id: string) => {
    setActiveGudangId(id);
    localStorage.setItem("activeGudangId", id);
    window.dispatchEvent(new Event('warehouseChanged'));
  };

  const handleAddGudang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGudang.id || !newGudang.nama) return;
    try {
      await storage.addGudang(newGudang);
      const list = await storage.getGudang();
      setGudangList(list);
      window.dispatchEvent(new Event('warehouseListChanged'));
      setNewGudang({ id: "", nama: "", lokasi: "" });
      if (list.length === 1) handleGudangChange(list[0].id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menambah gudang");
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteGudang = async (id: string) => {
    console.log("Attempting to delete warehouse:", id);
    try {
      console.log("Calling storage.deleteGudang...");
      await storage.deleteGudang(id);
      console.log("Delete successful, refreshing list...");
      const list = await storage.getGudang();
      setGudangList(list);
      window.dispatchEvent(new Event('warehouseListChanged'));
      if (activeGudangId === id) {
        handleGudangChange(list.length > 0 ? list[0].id : "");
      }
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Gagal menghapus gudang");
    }
  };

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!isFirebaseConfigured) {
      setLoginError("FIREBASE NOT CONFIGURED: Mohon isi environment variables di Settings > Secrets.");
      return;
    }
    if (!auth) return;
    
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/popup-blocked') {
        setLoginError("POPUP DIBLOKIR: Izinkan popup di browser Anda untuk login.");
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError("DOMAIN TIDAK DIIZINKAN: Tambahkan domain ini ke 'Authorized Domains' di Firebase Console.");
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError("METODE LOGIN DINONAKTIFKAN: Aktifkan Google Sign-in di Firebase Authentication.");
      } else if (error.code === 'auth/invalid-api-key') {
        setLoginError("API KEY TIDAK VALID: Periksa setelan API Key di Secrets.");
      } else {
        setLoginError(`LOGIN GAGAL: ${error.message}`);
      }
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    setAppUser(null);
  };

  const isAdmin = appUser?.role === UserRole.ADMIN;

  const menuItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/sku", icon: Tag, label: "Kelola SKU", adminOnly: true },
    { to: "/scan-keluar", icon: Scan, label: "Scan Keluar (Penjualan)" },
    { to: "/barang-masuk", icon: ArrowDownToLine, label: "Barang Masuk" },
    { to: "/keluar-khusus", icon: ArrowUpFromLine, label: "Keluar Khusus" },
    { to: "/stok", icon: Package, label: "Stok Gudang" },
    { to: "/logs", icon: History, label: "Log Transaksi" },
    { to: "/laporan", icon: BarChart3, label: "Laporan", adminOnly: true },
  ].filter(item => !item.adminOnly || isAdmin);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Menyiapkan WMS PRO...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(true)}
            className="fixed top-4 left-4 z-50 p-2 bg-white border border-slate-200 rounded-lg shadow-sm lg:hidden"
          >
            <Menu size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      <motion.aside 
        animate={{ x: isSidebarOpen ? 0 : -300 }}
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 flex flex-col transition-all",
          !isSidebarOpen && "hidden text-slate-400"
        )}
      >
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">W</div>
              <span className="text-xl font-bold text-white tracking-tight">WMS<span className="text-blue-400">PRO</span></span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-slate-500 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">OS Gudang v2.4</p>
        </div>

        <nav className="flex-1 py-6 overflow-y-auto">
          <div className="px-6 mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Menu Utama</div>
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-all group relative border-r-4",
                location.pathname === item.to 
                  ? "bg-blue-600 text-white border-blue-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800 border-transparent"
              )}
            >
              <item.icon size={16} className={cn("transition-transform group-hover:scale-110", location.pathname === item.to ? "text-white" : "text-slate-500")} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 bg-slate-950/50 mt-auto border-t border-slate-800/50">
          {loginError && (
            <div className="mb-3 p-2 bg-rose-500/10 border border-rose-500/20 rounded text-[9px] text-rose-300 font-bold uppercase tracking-tighter animate-pulse">
              {loginError}
              <button onClick={() => setLoginError(null)} className="ml-2 underline opacity-50 hover:opacity-100">Tutup</button>
            </div>
          )}
          {user ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                  alt={user.displayName || "User"} 
                  className="w-8 h-8 rounded-full ring-2 ring-slate-800"
                />
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
                  <p className="text-[10px] text-slate-500 truncate uppercase tracking-tighter">
                    {appUser?.role === UserRole.ADMIN ? "Administrator" : "Staf Gudang"}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full py-2 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-100 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={12} />
                KELUAR
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
              <LogIn size={14} />
              MASUK GOOGLE
            </button>
          )}
        </div>
      </motion.aside>

      <main className={cn(
        "flex-1 flex flex-col transition-all min-w-0 h-screen overflow-hidden",
        isSidebarOpen ? "lg:ml-64" : "ml-0"
      )}>
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Menu size={18} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                {location.pathname === "/" ? "DASHBOARD UTAMA" : (menuItems.find(i => i.to === location.pathname)?.label.toUpperCase() || location.pathname.substring(1).replace("-", " ").toUpperCase())}
              </h2>
              <div className="h-4 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-2 group relative">
                <Warehouse size={12} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                <div className="relative flex items-center">
                  <select 
                    value={activeGudangId}
                    onChange={(e) => handleGudangChange(e.target.value)}
                    className="bg-transparent border-none outline-none text-[10px] font-black text-slate-800 uppercase tracking-tighter cursor-pointer appearance-none pr-5 hover:text-blue-600 transition-colors z-10"
                  >
                    {gudangList.map(g => (
                      <option key={g.id} value={g.id}>{g.id} | {g.nama}</option>
                    ))}
                    {gudangList.length === 0 && <option value="">KLUSTER TIDAK DITEMUKAN</option>}
                  </select>
                  <ChevronDown size={10} className="absolute right-0 text-slate-300 pointer-events-none" />
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => setIsManageModalOpen(true)}
                    className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-blue-600 transition-all flex items-center justify-center translate-x-1"
                    title="Kelola Gudang"
                  >
                    <Settings size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {!isFirebaseConfigured && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-[9px] font-black text-amber-700 uppercase tracking-tighter">Demo Mode (LocalStorage)</span>
              </div>
            )}
            {isFirebaseConfigured && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter">Sistem Online</span>
              </div>
            )}
            <div className="text-[10px] text-slate-400 font-mono hidden lg:block">
              {new Date().toLocaleTimeString('id-ID')} | {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
        <AnimatePresence>
          {isManageModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => {
                  setIsManageModalOpen(false);
                  setConfirmDeleteId(null);
                }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden text-slate-900"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tighter">Kelola Gudang</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Tambah atau hapus cluster penyimpanan</p>
                  </div>
                  <button onClick={() => {
                    setIsManageModalOpen(false);
                    setConfirmDeleteId(null);
                  }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-3 mb-8">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Daftar Gudang Aktif</p>
                    {gudangList.map(g => (
                      <div key={g.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs uppercase">
                            {g.id.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{g.nama}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{g.id} • {g.lokasi}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {confirmDeleteId === g.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
                              <button 
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1.5 text-[9px] font-black uppercase text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                              >
                                Batal
                              </button>
                              <button 
                                onClick={() => handleDeleteGudang(g.id)}
                                className="px-3 py-1.5 text-[9px] font-black uppercase bg-red-500 text-white rounded-md hover:bg-red-600 shadow-sm shadow-red-500/20 transition-all"
                              >
                                Hapus
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(g.id);
                              }}
                              className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-100 flex items-center justify-center"
                              aria-label="Hapus Gudang"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {gudangList.length === 0 && (
                      <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <Warehouse size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Belum ada gudang terdaftar</p>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAddGudang} className="space-y-4 pt-6 border-t border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Tambah Gudang Baru</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">ID Gudang</label>
                        <input 
                          required
                          value={newGudang.id}
                          onChange={e => setNewGudang({...newGudang, id: e.target.value.toUpperCase()})}
                          placeholder="EX: G-002"
                          className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Lokasi</label>
                        <input 
                          required
                          value={newGudang.lokasi}
                          onChange={e => setNewGudang({...newGudang, lokasi: e.target.value.toUpperCase()})}
                          placeholder="EX: MEDAN"
                          className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nama Gudang</label>
                      <input 
                        required
                        value={newGudang.nama}
                        onChange={e => setNewGudang({...newGudang, nama: e.target.value.toUpperCase()})}
                        placeholder="EX: GUDANG CABANG"
                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full h-12 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Simpan Gudang Baru
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sku" element={<ManageSKU />} />
          <Route path="/scan-keluar" element={<ScanKeluar />} />
          <Route path="/barang-masuk" element={<BarangMasuk />} />
          <Route path="/keluar-khusus" element={<KeluarKhusus />} />
          <Route path="/stok" element={<StokGudang />} />
          <Route path="/logs" element={<LogTransaksi />} />
          <Route path="/laporan" element={<Laporan />} />
        </Routes>
      </Layout>
    </Router>
  );
}

