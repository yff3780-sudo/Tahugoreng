/**
 * DompetKu - Smart Natural Language Transaction Parser (Input Cepat)
 * Mengurai kalimat natural bebas Bahasa Indonesia menjadi transaksi terstruktur.
 * Contoh kalimat yang didukung:
 *  - "makan siang 35rb gopay"
 *  - "gojek 18.500"
 *  - "tukin 5jt rek gaji"
 *  - "kemarin bensin 50rb"
 *  - "kopi susu 25k tunai"
 *  - "transfer 500rb bca ke gopay"
 */

import { toDatetimeLocal, formatRupiah } from './utils.js';

export function parseKalimatTransaksi(inputTeks, daftarDompet = [], daftarKategori = []) {
  if (!inputTeks || !inputTeks.trim()) {
    return null;
  }

  let teks = inputTeks.toLowerCase().trim();
  let nominal = 0;
  let tanggal = new Date();
  let jenis = 'pengeluaran'; // Default
  let dompetTerpilih = null;
  let dompetTujuanTerpilih = null;
  let kategoriTerpilih = null;
  let subkategoriTerpilih = '';
  let catatan = inputTeks.trim();

  // 1. Deteksi Tanggal Relatif
  if (teks.includes('kemarin')) {
    tanggal.setDate(tanggal.getDate() - 1);
    teks = teks.replace(/\bkemarin\b/g, ' ');
  } else if (teks.includes('lusa')) {
    tanggal.setDate(tanggal.getDate() + 2);
    teks = teks.replace(/\blusa\b/g, ' ');
  } else if (teks.includes('hari ini')) {
    teks = teks.replace(/\bhari ini\b/g, ' ');
  } else {
    const matchHariLalu = teks.match(/(\d+)\s*hari\s*lalu/);
    if (matchHariLalu) {
      const days = parseInt(matchHariLalu[1], 10);
      tanggal.setDate(tanggal.getDate() - days);
      teks = teks.replace(matchHariLalu[0], ' ');
    }
  }

  // 2. Deteksi Nominal Uang
  // Pola: 5jt, 5.5 jt, 5 juta, 35rb, 35ribu, 25k, 18.500, 150000
  let matchedNominal = false;

  // Cek juta (jt, juta)
  const regexJuta = /(\d+(?:[.,]\d+)?)\s*(?:jt|juta)\b/i;
  const matchJt = teks.match(regexJuta);
  if (matchJt) {
    const rawNum = parseFloat(matchJt[1].replace(',', '.'));
    nominal = Math.round(rawNum * 1000000);
    teks = teks.replace(matchJt[0], ' ');
    matchedNominal = true;
  }

  // Cek ribu (rb, ribu, k)
  if (!matchedNominal) {
    const regexRibu = /(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k)\b/i;
    const matchRb = teks.match(regexRibu);
    if (matchRb) {
      const rawNum = parseFloat(matchRb[1].replace(',', '.'));
      nominal = Math.round(rawNum * 1000);
      teks = teks.replace(matchRb[0], ' ');
      matchedNominal = true;
    }
  }

  // Cek angka dengan titik ribuan (misal: 18.500 atau 1.250.000)
  if (!matchedNominal) {
    const regexPemisahTitik = /\b(\d{1,3}(?:\.\d{3})+)\b/;
    const matchTitik = teks.match(regexPemisahTitik);
    if (matchTitik) {
      nominal = parseInt(matchTitik[1].replace(/\./g, ''), 10);
      teks = teks.replace(matchTitik[0], ' ');
      matchedNominal = true;
    }
  }

  // Cek angka polos >= 1000 (misal: 35000)
  if (!matchedNominal) {
    const regexPolos = /\b(\d{4,9})\b/;
    const matchPolos = teks.match(regexPolos);
    if (matchPolos) {
      nominal = parseInt(matchPolos[1], 10);
      teks = teks.replace(matchPolos[0], ' ');
      matchedNominal = true;
    }
  }

  // 3. Deteksi Jenis Transaksi (Transfer / Pemasukan / Pengeluaran)
  if (/\b(transfer|tf|pindah)\b/i.test(teks)) {
    jenis = 'transfer';
  } else if (/\b(gaji|tukin|honor|uang makan|bonus|thr|hadiah|sampingan|dapat|masuk|cashback)\b/i.test(teks)) {
    jenis = 'pemasukan';
  }

  // 4. Deteksi Dompet
  // Helper pencari dompet dari teks
  function cariDompet(fragment) {
    if (!fragment) return null;
    const f = fragment.toLowerCase();
    if (/\bgopay\b/.test(f)) return daftarDompet.find(d => d.id === 'wallet_gopay');
    if (/\bovo\b/.test(f)) return daftarDompet.find(d => d.id === 'wallet_ovo');
    if (/\b(tunai|cash)\b/.test(f)) return daftarDompet.find(d => d.id === 'wallet_tunai');
    if (/\b(bca|rek gaji|rekening gaji)\b/.test(f)) return daftarDompet.find(d => d.id === 'wallet_bca');
    if (/\b(mandiri|tabungan|rek tabungan)\b/.test(f)) return daftarDompet.find(d => d.id === 'wallet_mandiri');

    // Pencarian dinamis nama dompet
    for (const d of daftarDompet) {
      if (f.includes(d.nama.toLowerCase())) return d;
    }
    return null;
  }

  if (jenis === 'transfer') {
    // Pola transfer: "bca ke gopay"
    const matchTf = teks.match(/(.+?)\s+ke\s+(.+)/);
    if (matchTf) {
      dompetTerpilih = cariDompet(matchTf[1]);
      dompetTujuanTerpilih = cariDompet(matchTf[2]);
    } else {
      dompetTerpilih = cariDompet(teks);
    }
  } else {
    dompetTerpilih = cariDompet(teks);
  }

  // Default dompet jika tidak terdeteksi
  if (!dompetTerpilih && daftarDompet.length > 0) {
    if (jenis === 'pemasukan') {
      dompetTerpilih = daftarDompet.find(d => d.id === 'wallet_bca') || daftarDompet[0];
    } else {
      dompetTerpilih = daftarDompet.find(d => d.id === 'wallet_gopay') || daftarDompet[0];
    }
  }

  // 5. Deteksi Kategori & Subkategori
  if (jenis === 'pemasukan') {
    if (/\bgaji\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_gaji');
      subkategoriTerpilih = 'Gaji Pokok';
    } else if (/\btukin\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_tukin');
      subkategoriTerpilih = 'Tukin Bulanan';
    } else if (/\buang makan\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_uang_makan');
      subkategoriTerpilih = 'Uang Makan Harian';
    } else if (/\b(honor|narsum|kepanitiaan)\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_honor');
      subkategoriTerpilih = 'Honorarium';
    } else if (/\b(bonus|hadiah)\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_bonus');
    } else {
      kategoriTerpilih = daftarKategori.find(k => k.jenis === 'pemasukan') || null;
    }
  } else if (jenis === 'pengeluaran') {
    if (/\b(gojek|grab|maxim|ojol)\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_transport');
      subkategoriTerpilih = 'Ojol';
    } else if (/\b(bensin|pertalite|pertamax|solar|spbu)\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_transport');
      subkategoriTerpilih = 'Bensin';
    } else if (/\b(krl|mrt|transjakarta|busway|commuter|stasiun)\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_transport');
      subkategoriTerpilih = 'KRL/MRT/TransJakarta';
    } else if (/\b(tol|parkir)\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_transport');
      subkategoriTerpilih = 'Parkir & Tol';
    } else if (/\b(kopi|coffee|starbucks|janji jiwa|kenangan|fore)\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_makan');
      subkategoriTerpilih = 'Kopi';
    } else if (/\b(makan|siang|malam|sarapan|nasi|soto|bakso|ayam|mie|warteg|kfc|mcd)\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_makan');
      subkategoriTerpilih = 'Makan Siang';
    } else if (/\b(listrik|pln|token)\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_tagihan');
      subkategoriTerpilih = 'Listrik';
    } else if (/\b(wifi|indihome|biznet|internet)\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_tagihan');
      subkategoriTerpilih = 'Internet & WiFi';
    } else if (/\b(pulsa|kuota|data|telkomsel|indosat|xl)\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_tagihan');
      subkategoriTerpilih = 'Pulsa & Data';
    } else if (/\b(kondangan|nikah|amplop|arisan|donasi|sedekah)\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_sosial');
      subkategoriTerpilih = 'Kondangan';
    } else if (/\b(supermarket|pasar|superindo|indomaret|alfamart)\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_rumah');
      subkategoriTerpilih = 'Belanja Pasar/Supermarket';
    } else if (/\b(netflix|spotify|bioskop|xxi|game|steam)\b/.test(teks)) {
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_hiburan');
    } else {
      // Default pengeluaran Makan & Minum
      kategoriTerpilih = daftarKategori.find(k => k.id === 'kat_makan') || daftarKategori.find(k => k.jenis === 'pengeluaran');
      subkategoriTerpilih = 'Lain-lain';
    }
  }

  // Susun Ringkasan Bahasa Indonesia Manusiawi
  let ringkasan = '';
  if (jenis === 'transfer') {
    const dariNama = dompetTerpilih ? dompetTerpilih.nama : 'Dompet Asal';
    const keNama = dompetTujuanTerpilih ? dompetTujuanTerpilih.nama : 'Dompet Tujuan';
    ringkasan = `Transfer ${formatRupiah(nominal)} dari ${dariNama} ke ${keNama}`;
  } else {
    const tipeNama = jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
    const katNama = kategoriTerpilih ? kategoriTerpilih.nama : 'Umum';
    const dmpNama = dompetTerpilih ? dompetTerpilih.nama : 'Dompet';
    ringkasan = `${tipeNama} ${formatRupiah(nominal)} (${katNama}) via ${dmpNama}`;
  }

  return {
    nominal,
    jenis,
    dompetId: dompetTerpilih ? dompetTerpilih.id : null,
    dompetTujuanId: dompetTujuanTerpilih ? dompetTujuanTerpilih.id : null,
    kategoriId: kategoriTerpilih ? kategoriTerpilih.id : null,
    subkategori: subkategoriTerpilih,
    tanggal: toDatetimeLocal(tanggal),
    catatan,
    ringkasan,
    isComplete: nominal > 0 && Boolean(dompetTerpilih)
  };
}
