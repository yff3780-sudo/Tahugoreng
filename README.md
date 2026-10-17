# DompetKu — Aplikasi Catatan Keuangan Pribadi Cerdas (PWA & Offline-First) 👛📊

> **DompetKu** adalah aplikasi web pencatatan keuangan pribadi modern, cepat, dan 100% aman tanpa server. Seluruh data keuangan tersimpan secara lokal di peramban Anda menggunakan IndexedDB dengan enkripsi hash PIN untuk privasi penuh. Mendukung mode offline (PWA), input cepat dengan parser kalimat alami (NLP), pagu anggaran dinamis, target tabungan, dan mode liburan multi-mata uang.

---

## 🌐 Demo & Tautan Aplikasi
Aplikasi dapat langsung diakses dan di-install melalui tautan GitHub Pages berikut:
🔗 **[https://yff3780-sudo.github.io/Tahugoreng/](https://yff3780-sudo.github.io/Tahugoreng/)**

*(Bisa dijalankan langsung tanpa instalasi server, tanpa akun, dan bisa diakses saat tidak ada koneksi internet).*

---

## ✨ Fitur-Fitur Unggulan

### 1. 👛 Manajemen Multi-Dompet & Kekayaan Bersih
- Catat saldo berbagai akun keuangan: Rekening Gaji (BCA), Tabungan (Mandiri), GoPay, OVO, dan Tunai di dompet.
- **Kalkulasi Saldo Dinamis**: Saldo otomatis dihitung dari saldo awal + pemasukan - pengeluaran - transfer keluar + transfer masuk - biaya admin.
- **Transfer Antar Dompet**: Tidak dihitung sebagai pengeluaran/pemasukan, dilengkapi biaya admin opsional.
- **Privasi Saldo ("Sembunyikan Saldo")**: Tombol ikon mata untuk menyamarkan nominal saat membuka di ruang publik.

### 2. ⚡ Input Cepat Berbasis Kalimat Bebas (AI Parser)
Ketik kalimat santai seperti di WhatsApp, sistem akan mengenali nominal, dompet, kategori, dan tanggal secara otomatis:
- `"makan siang 35rb gopay"` ➔ Pengeluaran Rp 35.000, Kategori Makan & Minum, Dompet GoPay.
- `"gojek 18.500"` ➔ Pengeluaran Rp 18.500, Kategori Transportasi (Ojol), Dompet GoPay.
- `"tukin 5jt rek gaji"` ➔ Pemasukan Rp 5.000.000, Kategori Tunjangan Kinerja, Dompet Rekening Gaji.
- `"kemarin bensin 50rb"` ➔ Pengeluaran Rp 50.000 dengan tanggal kemarin.
- `"kopi 25k tunai"` ➔ Pengeluaran Rp 25.000, Kategori Makan & Minum (Kopi), Dompet Tunai.
- `"transfer 500rb bca ke gopay"` ➔ Transfer Rp 500.000 dari BCA ke GoPay.
- *Pratinjau langsung sebelum disimpan dan bisa dikoreksi lewat modal form.*

### 3. 🎯 Pagu Anggaran & Realisasi (Budget Tracking)
- Tentukan batas pagu bulanan per kategori belanja.
- **Progress Bar Warna-Warni**:
  - 🟢 **Hijau**: Serapan aman (< 75%).
  - 🟡 **Kuning**: Peringatan waspada (75% – 100%).
  - 🔴 **Merah**: Melebihi pagu (> 100%).
- **Proyeksi Pengeluaran Akhir Bulan**: *"Dengan pola belanja sekarang, Makan & Minum diperkirakan 112% dari pagu"*.
- **Rekomendasi Batas Aman Harian**: *"Aman belanja Rp 85.000/hari sampai akhir bulan"*.
- **Salin Pagu**: Salin konfigurasi pagu dari bulan lalu dalam sekali klik.
- **Pindahkan Sisa Pagu**: Alokasikan sisa anggaran positif langsung ke rekening tabungan.

### 4. 📅 Tagihan & Transaksi Berulang (Recurring Scheduler)
- Daftar tagihan bulanan (Listrik PLN, WiFi, BPJS) dengan indikator jatuh tempo < 7 hari di Beranda.
- Transaksi rutin otomatis (Gaji tanggal 1, Tukin tanggal 5, WiFi tanggal 15) dengan pilihan eksekusi otomatis atau konfirmasi saat aplikasi dibuka.

### 5. 🎯 Target Tabungan (Financial Goals)
- Rencanakan target besar seperti *"Trip Jepang"* atau *"Dana Darurat"*.
- Kalkulator otomatis hitung kebutuhan menabung per bulan & per minggu agar target tercapai tepat waktu.
- Progress bar, indikator status *"Sesuai Jalur"* / *"Tertinggal"*, riwayat setoran, dan tombol setor langsung.

### 6. ✈️ Mode Acara / Trip (Multi-Mata Uang JPY)
- Aktifkan mode trip (misal: Trip ke Jepang).
- Input belanja dalam Yen (JPY) dengan nilai kurs yang bisa disesuaikan manual.
- Laporan khusus trip: total IDR vs foreign currency, breakdown per hari dan kategori.

### 7. 📊 Laporan Visual & Heatmap Aktivitas
- Donut chart interaktif dengan fitur drill-down ke subkategori.
- Bar chart perbandingan Pemasukan vs Pengeluaran 12 bulan terakhir.
- Line chart evolusi tren kekayaan bersih (Net Worth).
- Heatmap kalender harian ala GitHub untuk memantau intensitas belanja 30 hari terakhir.
- Analisis rasio tabungan, bulan paling hemat, dan bulan paling boros.

### 8. 🔒 Keamanan PIN & Kunci Layar
- Kunci aplikasi dengan PIN 4–6 digit.
- Disimpan sebagai **SHA-256 hash** menggunakan Web Crypto API tanpa plain-text.
- Layar pengunci otomatis saat dibuka kembali.

---

## 📱 Panduan Install di Smartphone (PWA)

DompetKu adalah Progressive Web App (PWA) yang dapat di-install langsung ke layar utama HP tanpa melalui Play Store / App Store:

### 🤖 Di Android (Google Chrome):
1. Buka tautan **`https://ffy.github.io/dompetku/`** di browser Chrome.
2. Ketuk ikon titik tiga (⋮) di pojok kanan atas.
3. Pilih **"Tambahkan ke Layar Utama"** atau **"Install Aplikasi"**.
4. Ikon DompetKu akan muncul di daftar aplikasi smartphone dan siap digunakan secara offline.

### 🍎 Di iPhone / iOS (Safari):
1. Buka tautan **`https://ffy.github.io/dompetku/`** di peramban Safari.
2. Ketuk tombol **Bagikan (Share)** (ikon kotak dengan panah ke atas) di menu navigasi bawah.
3. Gulir ke bawah dan ketuk **"Add to Home Screen" (Tambahkan ke Layar Utama)**.
4. Ketuk **Add (Tambah)** di pojok kanan atas.

---

## 💾 Panduan Cadangkan & Pulihkan Data (Backup & Restore)

Karena DompetKu beroperasi tanpa server (local-first):

### Cadangkan Data (Backup JSON):
1. Masuk ke menu **Pengaturan** (ikon gear / roda gigi).
2. Di bagian *Ekspor, Backup & Restore*, ketuk **"Backup JSON"**.
3. File JSON lengkap seluruh transaksi, dompet, target, dan pengaturan akan tersimpan di perangkat Anda.

### Ekspor ke Spreadsheet (CSV):
1. Di menu **Pengaturan**, ketuk **"Unduh CSV"**.
2. Buka file di Microsoft Excel, Google Sheets, atau Apple Numbers untuk pembukuan manual.

### Pulihkan Data (Restore):
1. Di menu **Pengaturan**, klik tombol **"Pilih File Backup (.json)"**.
2. Pilih file cadangan JSON yang sebelumnya diunduh.
3. Seluruh data keuangan akan dipulihkan secara instan ke IndexedDB peramban.

---

## 🛠️ Arsitektur & Teknologi

- **Bahasa**: Vanilla HTML5, CSS3 Modern (Custom Design System, CSS Variables, Glassmorphism), dan JavaScript murni ES6+ (Native Modules).
- **Grafik**: Chart.js 4.4 dari CDN.
- **Penyimpanan**: IndexedDB dengan fallback otomatis ke `localStorage` (semua akses dibungkus `try/catch`).
- **Offline / PWA**: `manifest.json` + `sw.js` (Service Worker cache-first).
- **Hosting**: GitHub Pages (Static hosting tanpa server backend).
- **Keamanan**: SHA-256 PIN hashing via `crypto.subtle`.

---

## 👨‍💻 Lisensi & Pembuat
Dibuat untuk pengelolaan finansial pribadi yang cerdas, aman, dan berdaya guna tinggi.
Lisensi: MIT.
