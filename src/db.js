/**
 * DompetKu - Lapisan Database IndexedDB dengan Fallback LocalStorage
 * Menyimpan seluruh data keuangan di browser secara lokal, aman, tanpa server.
 * Semua akses dibungkus try/catch untuk keandalan maksimal.
 */

const DB_NAME = 'DompetKuDB';
const DB_VERSION = 1;

const STORES = [
  'transaksi',
  'dompet',
  'kategori',
  'anggaran',
  'tagihan',
  'target',
  'acara',
  'template',
  'berulang',
  'pengaturan'
];

let dbInstance = null;
let useLocalStorageFallback = false;

// Inisialisasi IndexedDB
export async function initDB() {
  return new Promise((resolve) => {
    try {
      if (!window.indexedDB) {
        console.warn('IndexedDB tidak didukung pada browser ini, beralih ke localStorage fallback.');
        useLocalStorageFallback = true;
        return resolve(false);
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store transaksi
        if (!db.objectStoreNames.contains('transaksi')) {
          const store = db.createObjectStore('transaksi', { keyPath: 'id' });
          store.createIndex('tanggal', 'tanggal', { unique: false });
          store.createIndex('dompetId', 'dompetId', { unique: false });
          store.createIndex('kategoriId', 'kategoriId', { unique: false });
          store.createIndex('jenis', 'jenis', { unique: false });
        }

        // Store dompet
        if (!db.objectStoreNames.contains('dompet')) {
          db.createObjectStore('dompet', { keyPath: 'id' });
        }

        // Store kategori
        if (!db.objectStoreNames.contains('kategori')) {
          db.createObjectStore('kategori', { keyPath: 'id' });
        }

        // Store anggaran (pagu bulanan per kategori)
        if (!db.objectStoreNames.contains('anggaran')) {
          const store = db.createObjectStore('anggaran', { keyPath: 'id' });
          store.createIndex('bulan', 'bulan', { unique: false });
        }

        // Store tagihan
        if (!db.objectStoreNames.contains('tagihan')) {
          db.createObjectStore('tagihan', { keyPath: 'id' });
        }

        // Store target tabungan
        if (!db.objectStoreNames.contains('target')) {
          db.createObjectStore('target', { keyPath: 'id' });
        }

        // Store acara / trip mode
        if (!db.objectStoreNames.contains('acara')) {
          db.createObjectStore('acara', { keyPath: 'id' });
        }

        // Store template cepat
        if (!db.objectStoreNames.contains('template')) {
          db.createObjectStore('template', { keyPath: 'id' });
        }

        // Store transaksi berulang
        if (!db.objectStoreNames.contains('berulang')) {
          db.createObjectStore('berulang', { keyPath: 'id' });
        }

        // Store pengaturan
        if (!db.objectStoreNames.contains('pengaturan')) {
          db.createObjectStore('pengaturan', { keyPath: 'kunci' });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(true);
      };

      request.onerror = (event) => {
        console.warn('Gagal membuka IndexedDB, menggunakan localStorage:', event.target.error);
        useLocalStorageFallback = true;
        resolve(false);
      };
    } catch (err) {
      console.warn('Kesalahan fatal inisialisasi IndexedDB:', err);
      useLocalStorageFallback = true;
      resolve(false);
    }
  });
}

// Fallback Helper LocalStorage
function lsGet(storeName) {
  try {
    const raw = localStorage.getItem(`dompetku_${storeName}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('LocalStorage get error:', e);
    return [];
  }
}

function lsSet(storeName, data) {
  try {
    localStorage.setItem(`dompetku_${storeName}`, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage set error:', e);
  }
}

// Mengambil seluruh data dari sebuah Object Store
export async function getAll(storeName) {
  try {
    if (useLocalStorageFallback || !dbInstance) {
      return lsGet(storeName);
    }

    return new Promise((resolve) => {
      try {
        const tx = dbInstance.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve(lsGet(storeName));
      } catch (e) {
        console.warn(`getAll fallback for ${storeName}:`, e);
        resolve(lsGet(storeName));
      }
    });
  } catch (err) {
    console.error(`Error getAll(${storeName}):`, err);
    return [];
  }
}

// Mengambil 1 item berdasarkan ID atau Kunci
export async function getById(storeName, id) {
  try {
    if (useLocalStorageFallback || !dbInstance) {
      const items = lsGet(storeName);
      return items.find(it => (it.id === id || it.kunci === id)) || null;
    }

    return new Promise((resolve) => {
      try {
        const tx = dbInstance.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => {
          const items = lsGet(storeName);
          resolve(items.find(it => (it.id === id || it.kunci === id)) || null);
        };
      } catch (e) {
        const items = lsGet(storeName);
        resolve(items.find(it => (it.id === id || it.kunci === id)) || null);
      }
    });
  } catch (err) {
    console.error(`Error getById(${storeName}, ${id}):`, err);
    return null;
  }
}

// Menyimpan atau memperbarui data (mendukung item tunggal atau array)
export async function put(storeName, itemOrItems) {
  try {
    const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];

    if (useLocalStorageFallback || !dbInstance) {
      const existing = lsGet(storeName);
      items.forEach(item => {
        const keyField = storeName === 'pengaturan' ? 'kunci' : 'id';
        const idx = existing.findIndex(e => e[keyField] === item[keyField]);
        if (idx >= 0) {
          existing[idx] = item;
        } else {
          existing.push(item);
        }
      });
      lsSet(storeName, existing);
      return true;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = dbInstance.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        items.forEach(item => {
          store.put(item);
        });

        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => {
          console.warn(`put error on ${storeName}:`, e);
          // Sync ke localStorage sebagai cadangan
          const existing = lsGet(storeName);
          items.forEach(item => {
            const keyField = storeName === 'pengaturan' ? 'kunci' : 'id';
            const idx = existing.findIndex(e => e[keyField] === item[keyField]);
            if (idx >= 0) existing[idx] = item;
            else existing.push(item);
          });
          lsSet(storeName, existing);
          resolve(true);
        };
      } catch (err) {
        console.warn(`put transaction catch on ${storeName}:`, err);
        resolve(true);
      }
    });
  } catch (err) {
    console.error(`Error put(${storeName}):`, err);
    return false;
  }
}

// Menghapus data berdasarkan ID
export async function remove(storeName, id) {
  try {
    if (useLocalStorageFallback || !dbInstance) {
      const items = lsGet(storeName);
      const keyField = storeName === 'pengaturan' ? 'kunci' : 'id';
      const filtered = items.filter(it => it[keyField] !== id);
      lsSet(storeName, filtered);
      return true;
    }

    return new Promise((resolve) => {
      try {
        const tx = dbInstance.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);

        req.onsuccess = () => resolve(true);
        req.onerror = () => {
          const items = lsGet(storeName);
          const keyField = storeName === 'pengaturan' ? 'kunci' : 'id';
          lsSet(storeName, items.filter(it => it[keyField] !== id));
          resolve(true);
        };
      } catch (e) {
        const items = lsGet(storeName);
        const keyField = storeName === 'pengaturan' ? 'kunci' : 'id';
        lsSet(storeName, items.filter(it => it[keyField] !== id));
        resolve(true);
      }
    });
  } catch (err) {
    console.error(`Error remove(${storeName}, ${id}):`, err);
    return false;
  }
}

// Helper Pengaturan Spesifik (Kunci & Nilai)
export async function getSetting(kunci, defaultValue = null) {
  try {
    const item = await getById('pengaturan', kunci);
    return (item && item.nilai !== undefined) ? item.nilai : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

export async function setSetting(kunci, nilai) {
  try {
    return await put('pengaturan', { kunci, nilai, diperbaruiPada: new Date().toISOString() });
  } catch (e) {
    console.error(`Error setSetting(${kunci}):`, e);
    return false;
  }
}

// Hitung Saldo Dinamis Setiap Dompet berdasarkan Transaksi Real
// Saldo = SaldoAwal + Pemasukan - Pengeluaran - TransferKeluar + TransferMasuk - BiayaAdmin
export async function hitungSaldoSemuaDompet() {
  try {
    const [semuaDompet, semuaTransaksi] = await Promise.all([
      getAll('dompet'),
      getAll('transaksi')
    ]);

    const saldoMap = {};
    semuaDompet.forEach(d => {
      saldoMap[d.id] = Number(d.saldoAwal || 0);
    });

    semuaTransaksi.forEach(trx => {
      const nominal = Number(trx.nominal || 0);
      const biayaAdmin = Number(trx.biayaAdmin || 0);

      if (trx.jenis === 'pemasukan') {
        if (saldoMap[trx.dompetId] !== undefined) {
          saldoMap[trx.dompetId] += nominal;
        }
      } else if (trx.jenis === 'pengeluaran') {
        if (saldoMap[trx.dompetId] !== undefined) {
          saldoMap[trx.dompetId] -= nominal;
        }
      } else if (trx.jenis === 'transfer') {
        // Kurangi dari dompet asal
        if (saldoMap[trx.dompetId] !== undefined) {
          saldoMap[trx.dompetId] -= (nominal + biayaAdmin);
        }
        // Tambahkan ke dompet tujuan
        if (trx.dompetTujuanId && saldoMap[trx.dompetTujuanId] !== undefined) {
          saldoMap[trx.dompetTujuanId] += nominal;
        }
      }
    });

    return saldoMap;
  } catch (err) {
    console.error('Error hitungSaldoSemuaDompet:', err);
    return {};
  }
}

// Ekspor seluruh database ke file objek JSON
export async function exportAllData() {
  const result = {
    metadata: {
      aplikasi: 'DompetKu',
      versi: '1.0.0',
      dibuatPada: new Date().toISOString()
    },
    data: {}
  };

  for (const store of STORES) {
    result.data[store] = await getAll(store);
  }

  return result;
}

// Impor seluruh data dari file JSON
export async function importAllData(importedObj) {
  if (!importedObj || !importedObj.data) {
    throw new Error('Format file JSON tidak valid untuk DompetKu');
  }

  for (const store of STORES) {
    if (Array.isArray(importedObj.data[store])) {
      // Bersihkan data lama
      await clearStore(store);
      // Masukkan data baru
      if (importedObj.data[store].length > 0) {
        await put(store, importedObj.data[store]);
      }
    }
  }

  return true;
}

// Menghapus isi suatu object store
export async function clearStore(storeName) {
  if (useLocalStorageFallback || !dbInstance) {
    lsSet(storeName, []);
    return true;
  }

  return new Promise((resolve) => {
    try {
      const tx = dbInstance.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        lsSet(storeName, []);
        resolve(true);
      };
    } catch (e) {
      lsSet(storeName, []);
      resolve(true);
    }
  });
}

// Reset Bersih Semua Data
export async function resetAllData() {
  for (const store of STORES) {
    await clearStore(store);
  }
  localStorage.clear();
  return true;
}
