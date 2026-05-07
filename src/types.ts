/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  nama?: string;
  createdAt: string;
}

export interface Gudang {
  id: string;
  nama: string;
  lokasi?: string;
}

export interface Product {
  id: string; // SKU_GUDANGID
  sku: string;
  nama_produk: string;
  gudangId: string;
}

export interface BarangMasuk {
  id: string;
  tanggal: string;
  dokumen: string;
  sku: string;
  jumlah: number;
  gudangId: string;
}

export enum KeluarType {
  PENJUALAN = "penjualan",
  KHUSUS = "khusus",
}

export interface BarangKeluar {
  id: string;
  tanggal: string;
  resi?: string;
  sku: string;
  jumlah: number;
  tipe: KeluarType;
  keterangan?: string;
  gudangId: string;
}

export interface Stok {
  id: string; // SKU_GUDANGID to make it unique
  sku: string;
  gudangId: string;
  jumlah: number;
}

export interface LogTransaksi {
  id: string;
  tanggal: string;
  sku: string;
  gudangId: string;
  masuk: number;
  keluar: number;
  stok_setelah: number;
  tipe: string; // e.g., "Masuk", "Penjualan", "Keluar Khusus"
}
