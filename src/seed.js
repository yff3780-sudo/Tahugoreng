/**
 * DompetKu - Data Contoh Awal (Mock Data Generator)
 * Mengisi data realistis 3 bulan terakhir di Jakarta (gaji, tukin, makan siang,
 * ojol, kopi, tagihan, kondangan, pagu anggaran, target tabungan, dan acara Trip Jepang).
 */

import { put, getSetting, setSetting, clearStore } from './db.js';
import { getBulanKey } from './utils.js';

export const DOMPET_BAWAAN = [
  { id: 'wallet_bca', nama: 'Rekening Gaji (BCA)', jenis: 'bank', saldoAwal: 5000000, warna: '#0284c7', ikon: 'bank', diarsipkan: false },
  { id: 'wallet_mandiri', nama: 'Rekening Tabungan (Mandiri)', jenis: 'bank', saldoAwal: 25000000, warna: '#0369a1', ikon: 'savings', diarsipkan: false },
  { id: 'wallet_gopay', nama: 'GoPay', jenis: 'ewallet', saldoAwal: 250000, warna: '#059669', ikon: 'ewallet', diarsipkan: false },
  { id: 'wallet_ovo', nama: 'OVO', jenis: 'ewallet', saldoAwal: 150000, warna: '#7c3aed', ikon: 'ewallet', diarsipkan: false },
  { id: 'wallet_tunai', nama: 'Tunai di Dompet', jenis: 'cash', saldoAwal: 400000, warna: '#d97706', ikon: 'cash', diarsipkan: false }
];

export const KATEGORI_BAWAAN = [
  // Pemasukan
  { id: 'kat_gaji', nama: 'Gaji Pokok', jenis: 'pemasukan', warna: '#10b981', ikon: 'briefcase', subkategori: ['Gaji Pokok'] },
  { id: 'kat_tukin', nama: 'Tunjangan Kinerja', jenis: 'pemasukan', warna: '#059669', ikon: 'award', subkategori: ['Tukin Bulanan', 'Rapel'] },
  { id: 'kat_uang_makan', nama: 'Uang Makan', jenis: 'pemasukan', warna: '#14b8a6', ikon: 'coffee', subkategori: ['Uang Makan Harian'] },
  { id: 'kat_honor', nama: 'Honorarium', jenis: 'pemasukan', warna: '#0d9488', ikon: 'file-text', subkategori: ['Narasumber', 'Kepanitiaan'] },
  { id: 'kat_thr', nama: 'THR', jenis: 'pemasukan', warna: '#10b981', ikon: 'gift', subkategori: ['THR Keagamaan'] },
  { id: 'kat_gaji13', nama: 'Gaji ke-13', jenis: 'pemasukan', warna: '#059669', ikon: 'star', subkategori: ['Gaji 13'] },
  { id: 'kat_bonus', nama: 'Bonus/Hadiah', jenis: 'pemasukan', warna: '#3b82f6', ikon: 'gift', subkategori: ['Bonus Kinerja', 'Hadiah'] },
  { id: 'kat_sampingan', nama: 'Usaha Sampingan', jenis: 'pemasukan', warna: '#8b5cf6', ikon: 'trending-up', subkategori: ['Jualan Online', 'Freelance'] },
  { id: 'kat_masuk_lain', nama: 'Pemasukan Lainnya', jenis: 'pemasukan', warna: '#6b7280', ikon: 'plus-circle', subkategori: ['Cashback', 'Lain-lain'] },

  // Pengeluaran
  { id: 'kat_makan', nama: 'Makan & Minum', jenis: 'pengeluaran', warna: '#ef4444', ikon: 'utensils', subkategori: ['Makan Siang', 'Kopi', 'Jajan & Camilan', 'Makan Malam', 'Makan Keluarga'] },
  { id: 'kat_transport', nama: 'Transportasi', jenis: 'pengeluaran', warna: '#f97316', ikon: 'car', subkategori: ['Bensin', 'Ojol', 'KRL/MRT/TransJakarta', 'Parkir & Tol'] },
  { id: 'kat_tagihan', nama: 'Tagihan', jenis: 'pengeluaran', warna: '#eab308', ikon: 'zap', subkategori: ['Listrik', 'Air', 'Internet & WiFi', 'Pulsa & Data'] },
  { id: 'kat_rumah', nama: 'Rumah Tangga', jenis: 'pengeluaran', warna: '#84cc16', ikon: 'home', subkategori: ['Belanja Pasar/Supermarket', 'Alat Kebersihan', 'Perlengkapan Dapur'] },
  { id: 'kat_belanja', nama: 'Belanja', jenis: 'pengeluaran', warna: '#ec4899', ikon: 'shopping-bag', subkategori: ['Pakaian & Sepatu', 'Elektronik & Gadget', 'Hobi'] },
  { id: 'kat_kesehatan', nama: 'Kesehatan', jenis: 'pengeluaran', warna: '#06b6d4', ikon: 'activity', subkategori: ['Obat & Vitamin', 'Dokter & Klinik', 'BPJS Kesehatan'] },
  { id: 'kat_pendidikan', nama: 'Pendidikan & Kursus', jenis: 'pengeluaran', warna: '#6366f1', ikon: 'book', subkategori: ['Buku', 'Kursus Online', 'Sertifikasi'] },
  { id: 'kat_hiburan', nama: 'Hiburan & Langganan', jenis: 'pengeluaran', warna: '#a855f7', ikon: 'film', subkategori: ['Streaming Netflix/Spotify', 'Bioskop', 'Game'] },
  { id: 'kat_sosial', nama: 'Sosial', jenis: 'pengeluaran', warna: '#f43f5e', ikon: 'heart', subkategori: ['Kondangan', 'Arisan', 'Sedekah/Donasi'] },
  { id: 'kat_cicilan', nama: 'Cicilan', jenis: 'pengeluaran', warna: '#dc2626', ikon: 'credit-card', subkategori: ['KPR/Sewa', 'Kendaraan', 'Peralatan'] },
  { id: 'kat_perawatan', nama: 'Perawatan Diri', jenis: 'pengeluaran', warna: '#d946ef', ikon: 'smile', subkategori: ['Potong Rambut', 'Skincare', 'Gym & Olahraga'] },
  { id: 'kat_keluar_lain', nama: 'Pengeluaran Lainnya', jenis: 'pengeluaran', warna: '#9ca3af', ikon: 'more-horizontal', subkategori: ['Biaya Admin Bank', 'Lain-lain'] }
];

export const TEMPLATE_BAWAAN = [
  { id: 'tpl_1', nama: 'Kopi Pagi', jenis: 'pengeluaran', nominal: 25000, dompetId: 'wallet_gopay', kategoriId: 'kat_makan', subkategori: 'Kopi', catatan: 'Es Kopi Susu Tetangga', tag: '#kopi' },
  { id: 'tpl_2', nama: 'Makan Siang Kantor', jenis: 'pengeluaran', nominal: 35000, dompetId: 'wallet_gopay', kategoriId: 'kat_makan', subkategori: 'Makan Siang', catatan: 'Nasi Rames Warteg', tag: '#makan' },
  { id: 'tpl_3', nama: 'Bensin Motor', jenis: 'pengeluaran', nominal: 35000, dompetId: 'wallet_tunai', kategoriId: 'kat_transport', subkategori: 'Bensin', catatan: 'Pertalite full tank', tag: '#transport' },
  { id: 'tpl_4', nama: 'KRL / MRT Jakarta', jenis: 'pengeluaran', nominal: 14000, dompetId: 'wallet_gopay', kategoriId: 'kat_transport', subkategori: 'KRL/MRT/TransJakarta', catatan: 'PP Kantor', tag: '#krl' }
];

export const BERULANG_BAWAAN = [
  { id: 'rec_gaji', nama: 'Gaji Pokok Bulanan', jenis: 'pemasukan', nominal: 8500000, frekuensi: 'bulanan', tanggalSpesifik: 1, dompetId: 'wallet_bca', kategoriId: 'kat_gaji', subkategori: 'Gaji Pokok', aktif: true },
  { id: 'rec_tukin', nama: 'Tunjangan Kinerja', jenis: 'pemasukan', nominal: 6000000, frekuensi: 'bulanan', tanggalSpesifik: 5, dompetId: 'wallet_bca', kategoriId: 'kat_tukin', subkategori: 'Tukin Bulanan', aktif: true },
  { id: 'rec_wifi', nama: 'Tagihan WiFi Indihome', jenis: 'pengeluaran', nominal: 385000, frekuensi: 'bulanan', tanggalSpesifik: 15, dompetId: 'wallet_bca', kategoriId: 'kat_tagihan', subkategori: 'Internet & WiFi', aktif: true }
];

export const TAGIHAN_BAWAAN = [
  { id: 'bill_listrik', nama: 'Listrik PLN Pascabayar', nominal: 450000, tanggalJatuhTempo: '2026-10-20', dompetId: 'wallet_bca', kategoriId: 'kat_tagihan', status: 'belum_bayar', subkategori: 'Listrik' },
  { id: 'bill_wifi', nama: 'WiFi Internet', nominal: 385000, tanggalJatuhTempo: '2026-10-15', dompetId: 'wallet_bca', kategoriId: 'kat_tagihan', status: 'lunas', subkategori: 'Internet & WiFi' },
  { id: 'bill_bpjs', nama: 'BPJS Kesehatan Mandiri', nominal: 150000, tanggalJatuhTempo: '2026-10-10', dompetId: 'wallet_bca', kategoriId: 'kat_kesehatan', status: 'lunas', subkategori: 'BPJS Kesehatan' }
];

export const TARGET_BAWAAN = [
  {
    id: 'tgt_jepang',
    nama: 'Trip Liburan Jepang 2027',
    targetNominal: 25000000,
    terkumpul: 12500000,
    tenggatWaktu: '2027-04-30',
    dompetTujuanId: 'wallet_mandiri',
    ikon: 'plane',
    warna: '#f43f5e',
    riwayatSetoran: [
      { tanggal: '2026-08-05', nominal: 4000000, catatan: 'Setoran tabungan awal' },
      { tanggal: '2026-09-05', nominal: 4500000, catatan: 'Setoran dari bonus tukin' },
      { tanggal: '2026-10-06', nominal: 4000000, catatan: 'Setoran rutin bulanan' }
    ]
  },
  {
    id: 'tgt_darurat',
    nama: 'Dana Darurat 6 Bulan',
    targetNominal: 50000000,
    terkumpul: 28000000,
    tenggatWaktu: '2027-12-31',
    dompetTujuanId: 'wallet_mandiri',
    ikon: 'shield',
    warna: '#10b981',
    riwayatSetoran: [
      { tanggal: '2026-08-01', nominal: 10000000, catatan: 'Modal awal tabungan aman' },
      { tanggal: '2026-09-02', nominal: 9000000, catatan: 'Alokasi sisa gajian' },
      { tanggal: '2026-10-02', nominal: 9000000, catatan: 'Alokasi rutin' }
    ]
  }
];

export const ACARA_BAWAAN = [
  {
    id: 'evt_jepang',
    nama: 'Trip Jepang (Tokyo & Kyoto)',
    mataUang: 'JPY',
    kursIDR: 105, // 1 JPY = Rp 105
    anggaranIDR: 30000000,
    tanggalMulai: '2026-10-10',
    tanggalSelesai: '2026-10-25',
    status: 'aktif',
    catatan: 'Liburan musim gugur bersama keluarga'
  }
];

// Pagu bulanan per kategori untuk 3 bulan terakhir
export function generateAnggaranBawaan() {
  const bulanList = ['2026-08', '2026-09', '2026-10', '2026-11'];
  const daftar = [];

  const paguConfig = [
    { kategoriId: 'kat_makan', pagu: 3500000 },
    { kategoriId: 'kat_transport', pagu: 1500000 },
    { kategoriId: 'kat_tagihan', pagu: 1200000 },
    { kategoriId: 'kat_rumah', pagu: 2000000 },
    { kategoriId: 'kat_belanja', pagu: 1200000 },
    { kategoriId: 'kat_hiburan', pagu: 600000 },
    { kategoriId: 'kat_sosial', pagu: 800000 },
    { kategoriId: 'kat_kesehatan', pagu: 500000 },
    { kategoriId: 'kat_perawatan', pagu: 400000 }
  ];

  bulanList.forEach(bln => {
    paguConfig.forEach(cfg => {
      daftar.push({
        id: `bud_${bln}_${cfg.kategoriId}`,
        bulan: bln,
        kategoriId: cfg.kategoriId,
        pagu: cfg.pagu
      });
    });
  });

  return daftar;
}

// Generator Transaksi Realistis 3 Bulan Terakhir (Agustus - Oktober 2026)
export function generateTransaksiRealistis() {
  const transaksi = [];
  const baseDate = new Date('2026-10-17T09:00:00');

  // Gaji & Tukin untuk 3 bulan
  const payrolls = [
    { bln: '2026-08', tglGaji: '2026-08-01', tglTukin: '2026-08-05' },
    { bln: '2026-09', tglGaji: '2026-09-01', tglTukin: '2026-09-05' },
    { bln: '2026-10', tglGaji: '2026-10-01', tglTukin: '2026-10-05' }
  ];

  payrolls.forEach(p => {
    transaksi.push({
      id: `trx_gaji_${p.bln}`,
      jenis: 'pemasukan',
      nominal: 8500000,
      kategoriId: 'kat_gaji',
      subkategori: 'Gaji Pokok',
      dompetId: 'wallet_bca',
      tanggal: `${p.tglGaji}T08:00:00`,
      catatan: `Gaji Pokok Bulan ${p.bln}`,
      tag: '#gaji'
    });

    transaksi.push({
      id: `trx_tukin_${p.bln}`,
      jenis: 'pemasukan',
      nominal: 6000000,
      kategoriId: 'kat_tukin',
      subkategori: 'Tukin Bulanan',
      dompetId: 'wallet_bca',
      tanggal: `${p.tglTukin}T09:30:00`,
      catatan: `Tukin Kinerja ${p.bln}`,
      tag: '#tukin'
    });

    // Top-up GoPay rutin dari BCA
    transaksi.push({
      id: `trx_topup_${p.bln}`,
      jenis: 'transfer',
      nominal: 750000,
      biayaAdmin: 1000,
      dompetId: 'wallet_bca',
      dompetTujuanId: 'wallet_gopay',
      tanggal: `${p.tglGaji}T10:00:00`,
      catatan: 'Top up GoPay bulanan',
      tag: '#topup'
    });

    // Tagihan WiFi
    transaksi.push({
      id: `trx_wifi_${p.bln}`,
      jenis: 'pengeluaran',
      nominal: 385000,
      kategoriId: 'kat_tagihan',
      subkategori: 'Internet & WiFi',
      dompetId: 'wallet_bca',
      tanggal: `${p.bln}-15T11:00:00`,
      catatan: 'Tagihan Indihome',
      tag: '#tagihan'
    });
  });

  // Pengeluaran harian selama 80 hari ke belakang
  for (let d = 80; d >= 0; d--) {
    const curDate = new Date(baseDate);
    curDate.setDate(curDate.getDate() - d);
    const dateStr = curDate.toISOString().slice(0, 10);
    const dayOfWeek = curDate.getDay(); // 0: Minggu, 6: Sabtu

    // Makan siang kerja (Senin - Jumat)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      transaksi.push({
        id: `trx_makan_${d}`,
        jenis: 'pengeluaran',
        nominal: 35000 + (d % 3) * 5000,
        kategoriId: 'kat_makan',
        subkategori: 'Makan Siang',
        dompetId: 'wallet_gopay',
        tanggal: `${dateStr}T12:30:00`,
        catatan: (d % 2 === 0) ? 'Nasi Rames Ayam Bakar' : 'Soto Betawi Bu Nur',
        tag: '#kantor'
      });

      // Ojol / KRL Transport
      transaksi.push({
        id: `trx_trans_${d}`,
        jenis: 'pengeluaran',
        nominal: (d % 2 === 0) ? 14000 : 26000,
        kategoriId: 'kat_transport',
        subkategori: (d % 2 === 0) ? 'KRL/MRT/TransJakarta' : 'Ojol',
        dompetId: 'wallet_gopay',
        tanggal: `${dateStr}T08:15:00`,
        catatan: (d % 2 === 0) ? 'MRT Dukuh Atas PP' : 'Gojek Stasiun ke Kantor',
        tag: '#transport'
      });

      // Kopi sesekali
      if (d % 3 === 0) {
        transaksi.push({
          id: `trx_kopi_${d}`,
          jenis: 'pengeluaran',
          nominal: 25000,
          kategoriId: 'kat_makan',
          subkategori: 'Kopi',
          dompetId: 'wallet_gopay',
          tanggal: `${dateStr}T15:00:00`,
          catatan: 'Es Kopi Susu Aren',
          tag: '#kopi'
        });
      }
    }

    // Weekend (Sabtu & Minggu)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      transaksi.push({
        id: `trx_weekend_makan_${d}`,
        jenis: 'pengeluaran',
        nominal: 120000 + (d % 4) * 20000,
        kategoriId: 'kat_makan',
        subkategori: 'Makan Keluarga',
        dompetId: 'wallet_bca',
        tanggal: `${dateStr}T19:00:00`,
        catatan: 'Makan malam akhir pekan',
        tag: '#keluarga'
      });

      if (d % 14 === 0) {
        // Belanja supermarket 2 minggu sekali
        transaksi.push({
          id: `trx_supermarket_${d}`,
          jenis: 'pengeluaran',
          nominal: 650000,
          kategoriId: 'kat_rumah',
          subkategori: 'Belanja Pasar/Supermarket',
          dompetId: 'wallet_bca',
          tanggal: `${dateStr}T14:00:00`,
          catatan: 'Belanja bulanan Super Indo',
          tag: '#dapur'
        });
      }

      if (d % 21 === 0) {
        // Kondangan teman
        transaksi.push({
          id: `trx_kondangan_${d}`,
          jenis: 'pengeluaran',
          nominal: 250000,
          kategoriId: 'kat_sosial',
          subkategori: 'Kondangan',
          dompetId: 'wallet_tunai',
          tanggal: `${dateStr}T11:30:00`,
          catatan: 'Amplop kondangan resepsi',
          tag: '#kondangan'
        });
      }
    }

    // Transaksi khusus Acara Trip Jepang (10-15 Oktober)
    if (curDate >= new Date('2026-10-10') && curDate <= new Date('2026-10-15')) {
      transaksi.push({
        id: `trx_japan_${d}`,
        jenis: 'pengeluaran',
        nominal: 157500, // 1.500 JPY * 105
        kategoriId: 'kat_makan',
        subkategori: 'Makan Siang',
        dompetId: 'wallet_bca',
        tanggal: `${dateStr}T13:00:00`,
        catatan: 'Ichiran Ramen Shinjuku (1.500 JPY)',
        tag: '#tripjepang',
        acaraId: 'evt_jepang',
        nominalAsing: 1500,
        mataUangAsing: 'JPY',
        kurs: 105
      });
    }
  }

  return transaksi;
}

// Inisialisasi Seluruh Data Contoh
export async function isiDataContohRealistis() {
  console.log('Mengisi data contoh realistis DompetKu...');

  await clearStore('dompet');
  await clearStore('kategori');
  await clearStore('template');
  await clearStore('berulang');
  await clearStore('tagihan');
  await clearStore('target');
  await clearStore('acara');
  await clearStore('anggaran');
  await clearStore('transaksi');

  await put('dompet', DOMPET_BAWAAN);
  await put('kategori', KATEGORI_BAWAAN);
  await put('template', TEMPLATE_BAWAAN);
  await put('berulang', BERULANG_BAWAAN);
  await put('tagihan', TAGIHAN_BAWAAN);
  await put('target', TARGET_BAWAAN);
  await put('acara', ACARA_BAWAAN);
  await put('anggaran', generateAnggaranBawaan());
  await put('transaksi', generateTransaksiRealistis());

  await setSetting('cutOffDate', 1);
  await setSetting('modeEksekusiBerulang', 'konfirmasi');
  await setSetting('acaraAktifId', 'evt_jepang');

  console.log('Data contoh realistis berhasil dimuat ke IndexedDB!');
  return true;
}
