/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, BarangMasuk, BarangKeluar, Stok, LogTransaksi, KeluarType, Gudang, AppUser, UserRole } from "../types";
import { firestoreStorage } from "./firestoreStorage";

import { isFirebaseConfigured } from "./firebase";

// Determine if we should use Firebase
const USE_FIREBASE = isFirebaseConfigured;

const STORAGE_KEYS = {
  PRODUCTS: "wms_products",
  GUDANG: "wms_gudang",
  BARANG_MASUK: "wms_barang_masuk",
  BARANG_KELUAR: "wms_barang_keluar",
  STOK: "wms_stok",
  LOGS: "wms_logs",
  USERS: "wms_users",
};

const INITIAL_PRODUCTS: Product[] = [];

const INITIAL_GUDANG: Gudang[] = [
  { id: "G-001", nama: "GUDANG UTAMA", lokasi: "JAKARTA" },
];

export const storage = {
  getUserProfile: async (uid: string): Promise<AppUser | null> => {
    if (USE_FIREBASE) return firestoreStorage.getUserProfile(uid);
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    const users: AppUser[] = data ? JSON.parse(data) : [];
    return users.find(u => u.uid === uid) || null;
  },

  createUserProfile: async (user: { uid: string, email: string, nama?: string }): Promise<AppUser> => {
    if (USE_FIREBASE) return firestoreStorage.createUserProfile(user);
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    const users: AppUser[] = data ? JSON.parse(data) : [];
    
    const newUser: AppUser = {
      uid: user.uid,
      email: user.email,
      nama: user.nama || user.email.split('@')[0],
      role: users.length === 0 ? UserRole.ADMIN : UserRole.USER,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return newUser;
  },

  getProducts: async (): Promise<Product[]> => {
    if (USE_FIREBASE) return firestoreStorage.getProducts();
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  },

  getGudang: async (): Promise<Gudang[]> => {
    if (USE_FIREBASE) return firestoreStorage.getGudang();
    const data = localStorage.getItem(STORAGE_KEYS.GUDANG);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.GUDANG, JSON.stringify(INITIAL_GUDANG));
      return INITIAL_GUDANG;
    }
    return JSON.parse(data);
  },

  getBarangMasuk: async (): Promise<BarangMasuk[]> => {
    if (USE_FIREBASE) return firestoreStorage.getBarangMasuk();
    const data = localStorage.getItem(STORAGE_KEYS.BARANG_MASUK);
    const records: BarangMasuk[] = data ? JSON.parse(data) : [];
    return records;
  },

  getBarangKeluar: async (): Promise<BarangKeluar[]> => {
    if (USE_FIREBASE) return firestoreStorage.getBarangKeluar();
    const data = localStorage.getItem(STORAGE_KEYS.BARANG_KELUAR);
    const records: BarangKeluar[] = data ? JSON.parse(data) : [];
    return records;
  },

  getStok: async (): Promise<Stok[]> => {
    if (USE_FIREBASE) return firestoreStorage.getStok();
    const data = localStorage.getItem(STORAGE_KEYS.STOK);
    if (!data) return [];
    return JSON.parse(data);
  },

  getLogs: async (): Promise<LogTransaksi[]> => {
    if (USE_FIREBASE) return firestoreStorage.getLogs();
    const data = localStorage.getItem(STORAGE_KEYS.LOGS);
    const logs: LogTransaksi[] = data ? JSON.parse(data) : [];
    return logs;
  },

  addProduct: async (product: Product) => {
    if (USE_FIREBASE) return firestoreStorage.addProduct(product);
    const products = await storage.getProducts();
    if (products.find(p => p.id === product.id)) {
      throw new Error(`SKU ${product.sku} sudah terdaftar di gudang ini.`);
    }
    products.push(product);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  addGudang: async (gudang: Gudang) => {
    if (USE_FIREBASE) return firestoreStorage.addGudang(gudang);
    const gudangs = await storage.getGudang();
    if (gudangs.find(g => g.id === gudang.id)) {
      throw new Error(`Gudang ${gudang.id} sudah terdaftar.`);
    }
    gudangs.push(gudang);
    localStorage.setItem(STORAGE_KEYS.GUDANG, JSON.stringify(gudangs));
  },

  deleteGudang: async (id: string) => {
    if (USE_FIREBASE) return firestoreStorage.deleteGudang(id);
    const gudangs = await storage.getGudang();
    const filtered = gudangs.filter(g => g.id !== id);
    localStorage.setItem(STORAGE_KEYS.GUDANG, JSON.stringify(filtered));
  },

  deleteProduct: async (id: string) => {
    if (USE_FIREBASE) return firestoreStorage.deleteProduct(id);
    const products = await storage.getProducts();
    const filteredProducts = products.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(filteredProducts));
  },

  deleteTransaction: async (id: string, type: "masuk" | "keluar") => {
    if (USE_FIREBASE) return firestoreStorage.deleteTransaction(id, type);
    
    const logs = await storage.getLogs();
    const stok = await storage.getStok();
    const masuk = await storage.getBarangMasuk();
    const keluar = await storage.getBarangKeluar();

    const logIndex = logs.findIndex(l => l.id === id);
    if (logIndex === -1) throw new Error("Transaksi tidak ditemukan.");
    
    const targetSku = logs[logIndex].sku;
    const targetGudangId = logs[logIndex].gudangId;
    const targetAmount = type === "masuk" ? logs[logIndex].masuk : logs[logIndex].keluar;

    const stokId = `${targetSku}_${targetGudangId}`;
    const stokIndex = stok.findIndex(s => s.id === stokId);
    if (stokIndex !== -1) {
      if (type === "masuk") stok[stokIndex].jumlah -= targetAmount;
      else stok[stokIndex].jumlah += targetAmount;
      localStorage.setItem(STORAGE_KEYS.STOK, JSON.stringify(stok));
    }

    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs.filter(l => l.id !== id)));
    localStorage.setItem(STORAGE_KEYS.BARANG_MASUK, JSON.stringify(masuk.filter(r => r.id !== id)));
    localStorage.setItem(STORAGE_KEYS.BARANG_KELUAR, JSON.stringify(keluar.filter(r => r.id !== id)));
    return true;
  },

  clearLogs: async (gudangId?: string) => {
    if (USE_FIREBASE) return firestoreStorage.clearLogs(gudangId);
    
    if (gudangId) {
      const logs = await storage.getLogs();
      const filteredLogs = logs.filter(l => l.gudangId !== gudangId);
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(filteredLogs));

      const masuk = await storage.getBarangMasuk();
      localStorage.setItem(STORAGE_KEYS.BARANG_MASUK, JSON.stringify(masuk.filter(m => m.gudangId !== gudangId)));

      const keluar = await storage.getBarangKeluar();
      localStorage.setItem(STORAGE_KEYS.BARANG_KELUAR, JSON.stringify(keluar.filter(k => k.gudangId !== gudangId)));

      const stok = await storage.getStok();
      const resetStok = stok.map(s => s.gudangId === gudangId ? { ...s, jumlah: 0 } : s);
      localStorage.setItem(STORAGE_KEYS.STOK, JSON.stringify(resetStok));
    } else {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.BARANG_MASUK, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.BARANG_KELUAR, JSON.stringify([]));
      const stok = await storage.getStok();
      const resetStok = stok.map(s => ({ ...s, jumlah: 0 }));
      localStorage.setItem(STORAGE_KEYS.STOK, JSON.stringify(resetStok));
    }
  },

  processTransaction: async (
    type: "masuk" | "keluar", 
    data: { 
      sku: string, 
      gudangId: string, 
      jumlah: number, 
      tanggal: string, 
      force?: boolean,
      [key: string]: any 
    }
  ) => {
    if (USE_FIREBASE) return firestoreStorage.processTransaction(type, data);
    
    const stok = await storage.getStok();
    const stokId = `${data.sku}_${data.gudangId}`;
    let itemStok = stok.find(s => s.id === stokId);
    
    if (!itemStok) {
        itemStok = { id: stokId, sku: data.sku, gudangId: data.gudangId, jumlah: 0 };
        stok.push(itemStok);
    }

    let newJumlah = itemStok.jumlah;

    if (type === "masuk") newJumlah += data.jumlah;
    else {
      newJumlah -= data.jumlah;
      if (newJumlah < 0 && !data.force) throw new Error("Stok tidak cukup di gudang ini.");
    }

    itemStok.jumlah = newJumlah;
    localStorage.setItem(STORAGE_KEYS.STOK, JSON.stringify(stok));

    const transactionId = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    if (type === "masuk") {
      const records = await storage.getBarangMasuk();
      records.push({ id: transactionId, ...data } as any);
      localStorage.setItem(STORAGE_KEYS.BARANG_MASUK, JSON.stringify(records));
    } else {
      const records = await storage.getBarangKeluar();
      records.push({ id: transactionId, ...data, tipe: data.tipe_keluar || KeluarType.PENJUALAN } as any);
      localStorage.setItem(STORAGE_KEYS.BARANG_KELUAR, JSON.stringify(records));
    }

    const logs = await storage.getLogs();
    logs.push({
      id: transactionId,
      sku: data.sku,
      gudangId: data.gudangId,
      tanggal: data.tanggal,
      masuk: type === "masuk" ? data.jumlah : 0,
      keluar: type === "keluar" ? data.jumlah : 0,
      stok_setelah: newJumlah,
      tipe: type === "masuk" ? "Masuk" : (data.tipe_keluar === KeluarType.KHUSUS ? "Keluar Khusus" : "Penjualan")
    });
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    return true;
  }
};

