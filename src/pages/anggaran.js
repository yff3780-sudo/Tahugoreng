/**
 * DompetKu - Halaman Anggaran Pagu & Realisasi
 * Mengelola alokasi anggaran bulanan per kategori ala pagu & realisasi:
 * - Progress bar serapan: hijau (<75%), kuning (75-100%), merah (>100%)
 * - Proyeksi pengeluaran akhir bulan berdasarkan rata-rata harian
 * - Rekomendasi batas aman belanja harian sampai akhir bulan
 * - Fitur salin pagu dari bulan sebelumnya
 * - Pindahkan sisa pagu ke rekening tabungan
 */

import { getAll, put, getById } from '../db.js';
import {
  formatRupiah,
  formatCompactRupiah,
  showToast,
  ICONS,
  escapeHtml,
  getBulanKey,
  NAMA_BULAN
} from '../utils.js';

let selectedMonth = getBulanKey(new Date());

export async function renderAnggaran(container) {
  const [semuaAnggaran, semuaTransaksi, semuaKategori, semuaDompet] = await Promise.all([
    getAll('anggaran'),
    getAll('transaksi'),
    getAll('kategori'),
    getAll('dompet')
  ]);

  const kategoriPengeluaran = semuaKategori.filter(k => k.jenis === 'pengeluaran');
  const kategoriMap = {};
  semuaKategori.forEach(k => { kategoriMap[k.id] = k; });

  const sembunyikanSaldo = localStorage.getItem('dompetku_sembunyikan_saldo') === 'true';
  const formatNominalDisplay = (n) => sembunyikanSaldo ? '••••••' : formatRupiah(n);

  // Parse bulan yang dipilih (misal: "2026-10")
  const [tahunStr, bulanStr] = selectedMonth.split('-');
  const tahunNum = parseInt(tahunStr, 10);
  const bulanNum = parseInt(bulanStr, 10) - 1; // 0-indexed
  const namaBulanTeks = `${NAMA_BULAN[bulanNum]} ${tahunNum}`;

  // Hitung jumlah hari di bulan ini dan sisa hari
  const sekarang = new Date();
  const isBulanBerjalan = (sekarang.getFullYear() === tahunNum && sekarang.getMonth() === bulanNum);
  const totalHariDalamBulan = new Date(tahunNum, bulanNum + 1, 0).getDate();
  const hariBerjalan = isBulanBerjalan ? sekarang.getDate() : totalHariDalamBulan;
  const sisaHari = isBulanBerjalan ? Math.max(1, totalHariDalamBulan - sekarang.getDate() + 1) : 1;

  // Hitung realisasi pengeluaran bulan ini per kategori
  const realisasiMap = {};
  semuaTransaksi.forEach(trx => {
    if (trx.jenis === 'pengeluaran' && trx.tanggal && trx.tanggal.slice(0, 7) === selectedMonth) {
      realisasiMap[trx.kategoriId] = (realisasiMap[trx.kategoriId] || 0) + Number(trx.nominal || 0);
    }
  });

  // Gabungkan dengan data anggaran
  const anggaranBulanIni = semuaAnggaran.filter(a => a.bulan === selectedMonth);
  const anggaranMap = {};
  anggaranBulanIni.forEach(a => { anggaranMap[a.kategoriId] = a; });

  let totalPaguSemua = 0;
  let totalRealisasiSemua = 0;

  const itemAnggaranList = kategoriPengeluaran.map(kat => {
    const dataAnggaran = anggaranMap[kat.id];
    const pagu = dataAnggaran ? Number(dataAnggaran.pagu || 0) : 0;
    const realisasi = realisasiMap[kat.id] || 0;
    const sisa = pagu - realisasi;
    const persen = pagu > 0 ? (realisasi / pagu) * 100 : 0;

    totalPaguSemua += pagu;
    totalRealisasiSemua += realisasi;

    // Proyeksi akhir bulan
    const rataHarian = hariBerjalan > 0 ? (realisasi / hariBerjalan) : 0;
    const estimasiAkhir = Math.round(rataHarian * totalHariDalamBulan);
    const persenProyeksi = pagu > 0 ? Math.round((estimasiAkhir / pagu) * 100) : 0;

    // Sisa aman harian
    const amanHarian = Math.max(0, Math.round(sisa / sisaHari));

    return {
      kategori: kat,
      pagu,
      realisasi,
      sisa,
      persen,
      rataHarian,
      estimasiAkhir,
      persenProyeksi,
      amanHarian,
      anggaranId: dataAnggaran ? dataAnggaran.id : `bud_${selectedMonth}_${kat.id}`
    };
  });

  const totalSisaSemua = totalPaguSemua - totalRealisasiSemua;
  const totalPersenSemua = totalPaguSemua > 0 ? (totalRealisasiSemua / totalPaguSemua) * 100 : 0;
  const amanBelanjaHarianTotal = Math.max(0, Math.round(totalSisaSemua / sisaHari));

  // HTML Penyusun Halaman
  let html = `
    <div class="anggaran-page animate-fade-in">
      <div class="page-header-flex mb-3">
        <div>
          <h1 class="page-title">Pagu & Anggaran Bulanan</h1>
          <span class="text-xs text-muted">Pantau serapan belanja agar tidak melebihi pagu</span>
        </div>

        <!-- Pemilih Bulan -->
        <div class="month-selector-badge flex-align-center gap-2">
          <input type="month" id="input-pilih-bulan" class="form-input text-xs" value="${selectedMonth}" />
        </div>
      </div>

      <!-- KARTU RINGKASAN SERAPAN PAGU TOTAL -->
      <section class="card summary-budget-card glass-panel mb-4 p-4">
        <div class="flex-between flex-align-center mb-2">
          <span class="text-xs text-muted uppercase font-semibold">Total Pagu Bulan ${namaBulanTeks}</span>
          <span class="badge-persen ${totalPersenSemua > 100 ? 'badge-danger' : (totalPersenSemua >= 75 ? 'badge-warning' : 'badge-success')}">
            ${totalPersenSemua.toFixed(1)}% Terpakai
          </span>
        </div>

        <div class="nominal-total font-heading mb-2">
          ${formatNominalDisplay(totalRealisasiSemua)} <span class="text-sm text-muted font-normal">/ ${formatNominalDisplay(totalPaguSemua)}</span>
        </div>

        <!-- Progress Bar Utama -->
        <div class="progress-track mb-3" style="height: 10px;">
          <div class="progress-bar ${totalPersenSemua > 100 ? 'progress-red' : (totalPersenSemua >= 75 ? 'progress-yellow' : 'progress-green')}" style="width: ${Math.min(100, totalPersenSemua)}%;"></div>
        </div>

        <div class="flex-between text-xs text-muted border-t pt-2">
          <div>
            <span>Sisa Pagu Bersih: </span>
            <strong class="${totalSisaSemua >= 0 ? 'text-in' : 'text-out'}">${formatNominalDisplay(totalSisaSemua)}</strong>
          </div>
          <div>
            ${isBulanBerjalan ? `<span>Batas Aman Belanja: </span><strong class="text-primary">${formatNominalDisplay(amanBelanjaHarianTotal)}/hari</strong>` : ''}
          </div>
        </div>
      </section>

      <!-- TOMBOL AKSI CEPAT ANGGARAN -->
      <div class="flex-between flex-align-center mb-3 gap-2">
        <button id="btn-salin-pagu-lalu" class="btn-sm btn-outline flex-align-center gap-1">
          ${ICONS.copy} Salin Pagu Bulan Lalu
        </button>
        <button id="btn-pindahkan-ke-tabungan" class="btn-sm btn-outline flex-align-center gap-1 text-primary">
          ${ICONS.arrowTransfer} Pindahkan Sisa ke Tabungan
        </button>
      </div>

      <!-- DAFTAR PAGU PER KATEGORI -->
      <section class="section-budget-categories">
        <div class="categories-budget-grid">
  `;

  itemAnggaranList.forEach(item => {
    let barColor = 'progress-green';
    let statusText = 'Terkendali';
    let statusBadgeClass = 'badge-success';

    if (item.persen > 100) {
      barColor = 'progress-red';
      statusText = 'Melebihi Pagu';
      statusBadgeClass = 'badge-danger';
    } else if (item.persen >= 75) {
      barColor = 'progress-yellow';
      statusText = 'Waspada (>=75%)';
      statusBadgeClass = 'badge-warning';
    }

    const barWidth = Math.min(100, item.persen);

    html += `
      <div class="card budget-category-card p-3 mb-3">
        <div class="flex-between flex-align-center mb-2">
          <div class="flex-align-center gap-2">
            <span class="category-icon-box" style="background-color: ${item.kategori.warna || '#6b7280'}20; color: ${item.kategori.warna || '#6b7280'};">
              ${ICONS.budget}
            </span>
            <div>
              <h3 class="category-budget-title font-semibold text-sm">${escapeHtml(item.kategori.nama)}</h3>
              <span class="text-xs text-muted">Pagu: ${formatNominalDisplay(item.pagu)}</span>
            </div>
          </div>

          <div class="text-right">
            <span class="badge-status-pagu text-xs ${statusBadgeClass}">${statusText}</span>
            <button class="btn-icon btn-edit-pagu ml-1" data-id="${item.anggaranId}" data-kat-id="${item.kategori.id}" data-kat-nama="${escapeHtml(item.kategori.nama)}" data-pagu="${item.pagu}" title="Ubah Pagu">
              ${ICONS.edit}
            </button>
          </div>
        </div>

        <div class="budget-values-row flex-between text-xs mb-1">
          <span>Realisasi: <strong>${formatNominalDisplay(item.realisasi)}</strong></span>
          <span>Sisa: <strong class="${item.sisa >= 0 ? 'text-in' : 'text-out'}">${formatNominalDisplay(item.sisa)}</strong> (${item.persen.toFixed(0)}%)</span>
        </div>

        <div class="progress-track mb-2">
          <div class="progress-bar ${barColor}" style="width: ${barWidth}%;"></div>
        </div>

        <!-- Proyeksi Akhir Bulan & Rekomendasi Aman Harian -->
        <div class="budget-card-footer text-xs text-muted border-t pt-2">
          ${item.pagu > 0 ? `
            <div class="mb-1">
              📈 Dengan pola saat ini, pengeluaran diperkirakan <strong>${item.persenProyeksi}%</strong> dari pagu (${formatNominalDisplay(item.estimasiAkhir)}).
            </div>
          ` : '<div class="mb-1 text-warning">Pagu belum diset untuk kategori ini.</div>'}

          ${isBulanBerjalan && item.pagu > 0 ? `
            <div>
              🛡️ Batas belanja aman: <strong>${formatNominalDisplay(item.amanHarian)}/hari</strong> sampai akhir bulan.
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });

  html += `
        </div>
      </section>

      <!-- MODAL ATUR PAGU ANGGARAN -->
      <div id="modal-atur-pagu" class="modal-backdrop hidden">
        <div class="modal-card modal-compact animate-scale-up">
          <div class="modal-header">
            <h2 id="modal-pagu-title" class="modal-title">Atur Pagu Anggaran</h2>
            <button type="button" id="btn-close-modal-pagu" class="btn-icon">&times;</button>
          </div>
          <div class="modal-body">
            <p id="modal-pagu-desc" class="text-xs text-muted mb-3"></p>
            <div class="form-group mb-3">
              <label class="form-label">Nominal Pagu Bulanan (Rp)</label>
              <input type="text" id="input-modal-pagu-nominal" class="form-input" placeholder="Misal: 3.500.000" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" id="btn-simpan-modal-pagu" class="btn-primary w-full">Simpan Pagu</button>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Listeners
  // Ganti Bulan
  const inputPilihBulan = container.querySelector('#input-pilih-bulan');
  if (inputPilihBulan) {
    inputPilihBulan.addEventListener('change', (e) => {
      selectedMonth = e.target.value;
      renderAnggaran(container);
    });
  }

  // Modal Atur Pagu
  const modalPagu = container.querySelector('#modal-atur-pagu');
  const btnCloseModal = container.querySelector('#btn-close-modal-pagu');
  const inputModalNominal = container.querySelector('#input-modal-pagu-nominal');
  const modalTitle = container.querySelector('#modal-pagu-title');
  const modalDesc = container.querySelector('#modal-pagu-desc');
  const btnSimpanPagu = container.querySelector('#btn-simpan-modal-pagu');

  let currentEditing = null;

  const btnsEditPagu = container.querySelectorAll('.btn-edit-pagu');
  btnsEditPagu.forEach(btn => {
    btn.addEventListener('click', () => {
      currentEditing = {
        id: btn.getAttribute('data-id'),
        katId: btn.getAttribute('data-kat-id'),
        katNama: btn.getAttribute('data-kat-nama'),
        pagu: Number(btn.getAttribute('data-pagu'))
      };

      modalTitle.textContent = `Atur Pagu: ${currentEditing.katNama}`;
      modalDesc.textContent = `Tentukan batas anggaran belanja untuk bulan ${namaBulanTeks}.`;
      inputModalNominal.value = currentEditing.pagu > 0 ? currentEditing.pagu.toLocaleString('id-ID') : '';
      modalPagu.classList.remove('hidden');
      inputModalNominal.focus();
    });
  });

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      modalPagu.classList.add('hidden');
    });
  }

  if (btnSimpanPagu) {
    btnSimpanPagu.addEventListener('click', async () => {
      if (!currentEditing) return;
      const cleanNom = inputModalNominal.value.replace(/[^\d]/g, '');
      const nominalBaru = parseInt(cleanNom, 10) || 0;

      const dataSimpan = {
        id: currentEditing.id,
        bulan: selectedMonth,
        kategoriId: currentEditing.katId,
        pagu: nominalBaru
      };

      await put('anggaran', dataSimpan);
      showToast(`Pagu ${currentEditing.katNama} berhasil diperbarui.`, 'success');
      modalPagu.classList.add('hidden');
      renderAnggaran(container);
    });
  }

  // Salin Pagu Bulan Lalu
  const btnSalin = container.querySelector('#btn-salin-pagu-lalu');
  if (btnSalin) {
    btnSalin.addEventListener('click', async () => {
      const dLalu = new Date(tahunNum, bulanNum - 1, 1);
      const blnLaluKey = getBulanKey(dLalu);
      const paguLalu = semuaAnggaran.filter(a => a.bulan === blnLaluKey);

      if (paguLalu.length === 0) {
        showToast('Tidak ada data pagu di bulan sebelumnya.', 'warning');
        return;
      }

      if (!confirm(`Salin pagu dari bulan ${NAMA_BULAN[dLalu.getMonth()]} ${dLalu.getFullYear()} ke bulan ${namaBulanTeks}?`)) {
        return;
      }

      for (const item of paguLalu) {
        await put('anggaran', {
          id: `bud_${selectedMonth}_${item.kategoriId}`,
          bulan: selectedMonth,
          kategoriId: item.kategoriId,
          pagu: item.pagu
        });
      }

      showToast('Pagu anggaran berhasil disalin dari bulan lalu!', 'success');
      renderAnggaran(container);
    });
  }

  // Pindahkan Sisa Pagu ke Tabungan
  const btnTabungan = container.querySelector('#btn-pindahkan-ke-tabungan');
  if (btnTabungan) {
    btnTabungan.addEventListener('click', async () => {
      if (totalSisaSemua <= 0) {
        showToast('Tidak ada sisa pagu positif yang bisa dipindahkan ke tabungan.', 'warning');
        return;
      }

      const rekeningTabungan = semuaDompet.find(d => d.jenis === 'bank' && d.nama.toLowerCase().includes('tabungan')) || semuaDompet[0];
      const rekeningGaji = semuaDompet.find(d => d.id === 'wallet_bca') || semuaDompet[0];

      if (!confirm(`Pindahkan sisa pagu sebesar ${formatRupiah(totalSisaSemua)} dari ${rekeningGaji.nama} ke ${rekeningTabungan.nama}?`)) {
        return;
      }

      const trxTransfer = {
        id: `trx_sisa_pagu_${Date.now()}`,
        jenis: 'transfer',
        nominal: totalSisaSemua,
        biayaAdmin: 0,
        dompetId: rekeningGaji.id,
        dompetTujuanId: rekeningTabungan.id,
        tanggal: new Date().toISOString(),
        catatan: `Pemindahan sisa pagu anggaran bulan ${namaBulanTeks}`,
        tag: '#saving #sisapagu'
      };

      await put('transaksi', trxTransfer);
      showToast(`Sisa pagu ${formatRupiah(totalSisaSemua)} berhasil dipindahkan ke tabungan!`, 'success');
      renderAnggaran(container);
    });
  }
}
