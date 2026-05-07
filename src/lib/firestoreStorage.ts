/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  runTransaction,
  serverTimestamp,
  Timestamp,
  writeBatch,
  getDocFromServer
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { Product, BarangMasuk, BarangKeluar, Stok, LogTransaksi, KeluarType, Gudang, AppUser, UserRole } from "../types";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
// [previous content]
interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  const errorMsg = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorMsg);
  throw new Error(errorMsg);
}

export const firestoreStorage = {
  getUserProfile: async (uid: string): Promise<AppUser | null> => {
    const path = `users/${uid}`;
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      if (docSnap.exists()) {
        return docSnap.data() as AppUser;
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return null;
    }
  },

  createUserProfile: async (user: { uid: string, email: string, nama?: string }): Promise<AppUser> => {
    const path = `users/${user.uid}`;
    try {
      const usersSnap = await getDocs(query(collection(db, 'users')));
      const isFirst = usersSnap.empty;

      const newUser: AppUser = {
        uid: user.uid,
        email: user.email,
        nama: user.nama || user.email.split('@')[0],
        role: isFirst ? UserRole.ADMIN : UserRole.USER,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), newUser);
      return newUser;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
      throw e;
    }
  },

  getProducts: async (): Promise<Product[]> => {
    const path = 'products';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => doc.data() as Product);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  getGudang: async (): Promise<Gudang[]> => {
    const path = 'gudang';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => doc.data() as Gudang);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  getBarangMasuk: async (): Promise<BarangMasuk[]> => {
    const path = 'barang_masuk';
    try {
      const q = query(collection(db, path), orderBy('tanggal', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as BarangMasuk);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  getBarangKeluar: async (): Promise<BarangKeluar[]> => {
    const path = 'barang_keluar';
    try {
      const q = query(collection(db, path), orderBy('tanggal', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as BarangKeluar);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  getStok: async (): Promise<Stok[]> => {
    const path = 'stok';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => doc.data() as Stok);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  getLogs: async (): Promise<LogTransaksi[]> => {
    const path = 'logs';
    try {
      const q = query(collection(db, path), orderBy('tanggal', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as LogTransaksi);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  addProduct: async (product: Product) => {
    const id = product.id;
    const path = `products/${id}`;
    try {
      const prodDoc = await getDoc(doc(db, 'products', id));
      if (prodDoc.exists()) {
        throw new Error(`SKU ${product.sku} sudah terdaftar di gudang ini.`);
      }
      await setDoc(doc(db, 'products', id), product);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  addGudang: async (gudang: Gudang) => {
    const path = `gudang/${gudang.id}`;
    try {
      await setDoc(doc(db, 'gudang', gudang.id), gudang);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  deleteGudang: async (id: string) => {
    const path = `gudang/${id}`;
    console.log(`Firestore: deleting gudang at ${path}`);
    try {
      await deleteDoc(doc(db, 'gudang', id));
      console.log(`Firestore: successfully deleted ${id}`);
    } catch (e) {
      console.error(`Firestore: failed to delete ${id}`, e);
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  deleteProduct: async (id: string) => {
    const path = `products/${id}`;
    try {
      await deleteDoc(doc(db, 'products', id));
      // Optionally delete related stock items, though it might be safer to keep them
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  deleteTransaction: async (id: string, type: "masuk" | "keluar") => {
    const logPath = `logs/${id}`;
    try {
      await runTransaction(db, async (transaction) => {
        const logDoc = await transaction.get(doc(db, 'logs', id));
        if (!logDoc.exists()) throw new Error("Transaksi tidak ditemukan.");
        
        const logData = logDoc.data() as LogTransaksi;
        const targetSku = logData.sku;
        const targetGudangId = logData.gudangId;
        const targetAmount = type === "masuk" ? logData.masuk : logData.keluar;

        const stokId = `${targetSku}_${targetGudangId}`;
        const stokDoc = await transaction.get(doc(db, 'stok', stokId));
        if (stokDoc.exists()) {
          const currentStok = stokDoc.data().jumlah;
          const newStok = type === "masuk" ? currentStok - targetAmount : currentStok + targetAmount;
          transaction.update(doc(db, 'stok', stokId), { jumlah: newStok });
        }

        transaction.delete(doc(db, 'logs', id));
        if (type === "masuk") {
          transaction.delete(doc(db, 'barang_masuk', id));
        } else {
          transaction.delete(doc(db, 'barang_keluar', id));
        }
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, logPath);
    }
  },

  clearLogs: async (gudangId?: string) => {
    try {
      const logsRef = collection(db, 'logs');
      const q = gudangId ? query(logsRef, where("gudangId", "==", gudangId)) : logsRef;
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      // Also clean up related collections
      const mRef = collection(db, 'barang_masuk');
      const mQ = gudangId ? query(mRef, where("gudangId", "==", gudangId)) : mRef;
      const mSnap = await getDocs(mQ);
      mSnap.forEach(docSnap => batch.delete(docSnap.ref));

      const kRef = collection(db, 'barang_keluar');
      const kQ = gudangId ? query(kRef, where("gudangId", "==", gudangId)) : kRef;
      const kSnap = await getDocs(kQ);
      kSnap.forEach(docSnap => batch.delete(docSnap.ref));

      // Reset stok for that warehouse
      const sRef = collection(db, 'stok');
      const sQ = gudangId ? query(sRef, where("gudangId", "==", gudangId)) : sRef;
      const sSnap = await getDocs(sQ);
      sSnap.forEach(docSnap => batch.update(docSnap.ref, { jumlah: 0 }));

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'bulk-clear');
    }
  },

  processTransaction: async (
    type: "masuk" | "keluar",
    data: { 
      sku: string, 
      gudangId: string,
      jumlah: number, 
      tanggal: string, 
      dokumen?: string, 
      resi?: string, 
      tipe_keluar?: KeluarType,
      keterangan?: string,
      force?: boolean
    }
  ) => {
    const transactionId = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const stokId = `${data.sku}_${data.gudangId}`;
    try {
      await runTransaction(db, async (transaction) => {
        const stokRef = doc(db, 'stok', stokId);
        const stokDoc = await transaction.get(stokRef);
        
        let currentJumlah = 0;
        if (stokDoc.exists()) {
          currentJumlah = stokDoc.data().jumlah;
        }

        let newJumlah = currentJumlah;

        if (type === "masuk") {
          newJumlah += data.jumlah;
        } else {
          newJumlah -= data.jumlah;
          if (newJumlah < 0 && !data.force) throw new Error("Stok tidak cukup di gudang ini.");
        }

        // Update stok
        if (!stokDoc.exists()) {
          transaction.set(stokRef, { id: stokId, sku: data.sku, gudangId: data.gudangId, jumlah: newJumlah });
        } else {
          transaction.update(stokRef, { jumlah: newJumlah });
        }

        // Save record
        if (type === "masuk") {
          transaction.set(doc(db, 'barang_masuk', transactionId), {
            id: transactionId,
            tanggal: data.tanggal,
            dokumen: data.dokumen || "-",
            sku: data.sku,
            gudangId: data.gudangId,
            jumlah: data.jumlah
          });
        } else {
          transaction.set(doc(db, 'barang_keluar', transactionId), {
            id: transactionId,
            tanggal: data.tanggal,
            resi: data.resi || "",
            sku: data.sku,
            gudangId: data.gudangId,
            jumlah: data.jumlah,
            tipe: data.tipe_keluar || KeluarType.PENJUALAN,
            keterangan: data.keterangan || ""
          });
        }

        // Add log
        transaction.set(doc(db, 'logs', transactionId), {
          id: transactionId,
          tanggal: data.tanggal,
          sku: data.sku,
          gudangId: data.gudangId,
          masuk: type === "masuk" ? data.jumlah : 0,
          keluar: type === "keluar" ? data.jumlah : 0,
          stok_setelah: newJumlah,
          tipe: type === "masuk" ? "Masuk" : (data.tipe_keluar === KeluarType.KHUSUS ? "Keluar Khusus" : "Penjualan")
        });
      });
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'transactions');
    }
  }
};
