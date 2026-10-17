/**
 * DompetKu - Halaman Riwayat Transaksi
 * Menampilkan seluruh catatan transaksi dikelompokkan berdasarkan tanggal dengan subtotal harian.
 * Dilengkapi filter multi-kriteria (rentang waktu, jenis, kategori, dompet, tag, acara),
 * pencarian real-time, tombol aksi edit, duplikasi, dan hapus dengan undo 5 detik.
 */

import { getAll, put, remove } from '../db.js';
import {
  formatRupiah,
  formatTanggalLengkap,
  formatJam,
  showToast,
  ICONS,
  escapeHtml,
  getBulanKey
} from '../utils.js';

let stateFilter = {
  periode: 'bulan_ini', // 'bulan_ini', 'bulan_lalu', '30_hari', 'semua'
  jenis: 'semua',
  kategoriId: 'semua',
  dompetId: 'semua',
  searchQuery: ''
};

export async function renderTransaksi(container) {
  const [semuaTransaksi, semuaKategori, semuaDompet, semuaAcara] = await Promise.all([
    getAll('transaksi'),
    getAll('kategori'),
    getAll('dompet'),
    getAll('acara')
  ]);

  const kategoriMap = {};
  semuaKategori.forEach(k => { kategoriMap[k.id] = k; });

  const dompetMap = {};
  semuaDompet.forEach(d => { dompetMap[d.id] = d; });

  const sembunyikanSaldo = localStorage.getItem('dompetku_sembunyikan_saldo') === 'true';
  const formatNominalDisplay = (nom) => sembunyikanSaldo ? '••••••' : formatRupiah(nom);

  // Filter Data
  const sekarang = new Date();
  const blnIniKey = getBulanKey(sekarang);
  const blnLaluDate = new Date(sekarang.getFullYear(), sekarang.getMonth() - 1, 1);
  const blnLaluKey = getBulanKey(blnLaluDate);
  const tigapuluhHariLalu = new Date(sekarang);
  tigapuluhHariLalu.setDate(sekarang.getDate() - 30);

  const transaksiTerfilter = semuaTransaksi.filter(trx => {
    const tgl = new Date(trx.tanggal);

    // Filter Periode
    if (stateFilter.periode === 'bulan_ini') {
      if (!trx.tanggal || trx.tanggal.slice(0, 7) !== blnIniKey) return false;
    } else if (stateFilter.periode === 'bulan_lalu') {
      if (!trx.tanggal || trx.tanggal.slice(0, 7) !== blnLaluKey) return false;
    } else if (stateFilter.periode === '30_hari') {
      if (tgl < tigapuluhHariLalu) return false;
    }

    // Filter Jenis
    if (stateFilter.jenis !== 'semua' && trx.jenis !== stateFilter.jenis) {
      return false;
    }

    // Filter Kategori
    if (stateFilter.kategoriId !== 'semua' && trx.kategoriId !== stateFilter.kategoriId) {
      return false;
    }

    // Filter Dompet
    if (stateFilter.dompetId !== 'semua') {
      if (trx.dompetId !== stateFilter.dompetId && trx.dompetTujuanId !== stateFilter.dompetId) {
        return false;
      }
    }

    // Filter Pencarian Teks
    if (stateFilter.searchQuery.trim()) {
      const q = stateFilter.searchQuery.toLowerCase();
      const matchCatatan = (trx.catatan || '').toLowerCase().includes(q);
      const matchTag = (trx.tag || '').toLowerCase().includes(q);
      const matchNominal = trx.nominal.toString().includes(q);
      const katNama = (kategoriMap[trx.kategoriId]?.nama || '').toLowerCase();
      if (!matchCatatan && !matchTag && !matchNominal && !katNama.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Urutkan dari yang paling baru
  transaksiTerfilter.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  // Pengelompokan berdasarkan tanggal (YYYY-MM-DD)
  const grouped = {};
  transaksiTerfilter.forEach(trx => {
    const dateStr = trx.tanggal ? trx.tanggal.slice(0, 10) : 'Tidak diketahui';
    if (!grouped[dateStr]) {
      grouped[dateStr] = {
        tanggal: dateStr,
        items: [],
        totalPengeluaran: 0,
        totalPemasukan: 0
      };
    }
    grouped[dateStr].items.push(trx);
    if (trx.jenis === 'pengeluaran') {
      grouped[dateStr].totalPengeluaran += Number(trx.nominal || 0);
    } else if (trx.jenis === 'pemasukan') {
      grouped[dateStr].totalPemasukan += Number(trx.nominal || 0);
    }
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  // HTML Penyusun Halaman Transaksi
  let html = `
    <div class="transaksi-page animate-fade-in">
      <div class="page-header-flex mb-3">
        <div>
          <h1 class="page-title">Riwayat Transaksi</h1>
          <span class="text-xs text-muted">Ditemukan ${transaksiTerfilter.length} transaksi</span>
        </div>
        <button class="btn-primary btn-sm flex-align-center gap-1" onclick="window.bukaModalTransaksi()">
          ${ICONS.plus} Tambah Baru
        </button>
      </div>

      <!-- FILTER & PENCARIAN -->
      <section class="card filter-card mb-3 p-3">
        <div class="search-input-wrap mb-2">
          <span class="search-icon">${ICONS.search}</span>
          <input type="text" id="input-trx-search" class="form-input search-input" placeholder="Cari catatan, tag (#kopi), nominal..." value="${escapeHtml(stateFilter.searchQuery)}" />
        </div>

        <div class="filters-grid">
          <!-- Filter Periode -->
          <div class="filter-col">
            <label class="filter-label">Periode</label>
            <select id="select-filter-periode" class="form-select text-xs">
              <option value="bulan_ini" ${stateFilter.periode === 'bulan_ini' ? 'selected' : ''}>Bulan Ini</option>
              <option value="bulan_lalu" ${stateFilter.periode === 'bulan_lalu' ? 'selected' : ''}>Bulan Lalu</option>
              <option value="30_hari" ${stateFilter.periode === '30_hari' ? 'selected' : ''}>30 Hari Terakhir</option>
              <option value="semua" ${stateFilter.periode === 'semua' ? 'selected' : ''}>Semua Waktu</option>
            </select>
          </div>

          <!-- Filter Jenis -->
          <div class="filter-col">
            <label class="filter-label">Jenis</label>
            <select id="select-filter-jenis" class="form-select text-xs">
              <option value="semua" ${stateFilter.jenis === 'semua' ? 'selected' : ''}>Semua Jenis</option>
              <option value="pengeluaran" ${stateFilter.jenis === 'pengeluaran' ? 'selected' : ''}>Pengeluaran</option>
              <option value="pemasukan" ${stateFilter.jenis === 'pemasukan' ? 'selected' : ''}>Pemasukan</option>
              <option value="transfer" ${stateFilter.jenis === 'transfer' ? 'selected' : ''}>Transfer</option>
            </select>
          </div>

          <!-- Filter Dompet -->
          <div class="filter-col">
            <label class="filter-label">Dompet</label>
            <select id="select-filter-dompet" class="form-select text-xs">
              <option value="semua">Semua Dompet</option>
              ${semuaDompet.map(d => `
                <option value="${d.id}" ${stateFilter.dompetId === d.id ? 'selected' : ''}>${escapeHtml(d.nama)}</option>
              `).join('')}
            </select>
          </div>

          <!-- Filter Kategori -->
          <div class="filter-col">
            <label class="filter-label">Kategori</label>
            <select id="select-filter-kategori" class="form-select text-xs">
              <option value="semua">Semua Kategori</option>
              ${semuaKategori.map(k => `
                <option value="${k.id}" ${stateFilter.kategoriId === k.id ? 'selected' : ''}>${escapeHtml(k.nama)}</option>
              `).join('')}
            </select>
          </div>
        </div>
      </section>

      <!-- DAFTAR TRANSAKSI GROUPED PER TANGGAL -->
      <section class="section-trx-list">
  `;

  if (sortedDates.length === 0) {
    html += `
      <div class="empty-state text-center card p-5">
        <div class="empty-icon text-muted mb-2">${ICONS.transaction}</div>
        <p class="font-semibold text-sm">Tidak ada transaksi yang cocok</p>
        <span class="text-xs text-muted">Coba ubah kriteria filter atau buat transaksi baru sekarang</span>
      </div>
    `;
  } else {
    sortedDates.forEach(dateStr => {
      const group = grouped[dateStr];
      const netDaily = group.totalPemasukan - group.totalPengeluaran;

      html += `
        <div class="trx-date-group mb-3">
          <div class="date-group-header flex-between flex-align-center mb-1 px-1">
            <span class="date-header-title font-semibold text-xs text-muted">
              ${formatTanggalLengkap(dateStr)}
            </span>
            <span class="date-header-subtotal text-xs font-semibold ${netDaily >= 0 ? 'text-in' : 'text-out'}">
              ${netDaily >= 0 ? '+' : ''}${formatNominalDisplay(netDaily)}
            </span>
          </div>

          <div class="trx-group-cards card p-0 overflow-hidden">
      `;

      group.items.forEach(item => {
        const kat = kategoriMap[item.kategoriId] || { nama: 'Lainnya', warna: '#6b7280' };
        const dompetAsal = dompetMap[item.dompetId] || { nama: 'Dompet' };
        const dompetTujuan = dompetMap[item.dompetTujuanId];

        let iconColor = kat.warna || '#6b7280';
        let tanda = '-';
        let nominalClass = 'text-out';
        let detailKeterangan = kat.nama;

        if (item.jenis === 'pemasukan') {
          tanda = '+';
          nominalClass = 'text-in';
          iconColor = '#10b981';
        } else if (item.jenis === 'transfer') {
          tanda = '';
          nominalClass = 'text-tf';
          iconColor = '#3b82f6';
          detailKeterangan = `Transfer ke ${dompetTujuan ? dompetTujuan.nama : 'Lainnya'}`;
        }

        // Info mata uang asing jika ada
        const asingBadge = (item.nominalAsing && item.mataUangAsing)
          ? `<span class="badge-foreign text-xs">${item.nominalAsing.toLocaleString()} ${item.mataUangAsing}</span>`
          : '';

        html += `
          <div class="trx-item-row flex-between flex-align-center p-3 border-b" data-id="${item.id}">
            <div class="flex-align-center gap-3">
              <div class="trx-cat-circle" style="background-color: ${iconColor}20; color: ${iconColor};">
                ${item.jenis === 'pemasukan' ? ICONS.arrowDownLeft : (item.jenis === 'transfer' ? ICONS.arrowTransfer : ICONS.arrowUpRight)}
              </div>

              <div>
                <div class="flex-align-center gap-1">
                  <span class="trx-item-cat font-semibold text-sm">${escapeHtml(item.catatan || detailKeterangan)}</span>
                  ${asingBadge}
                </div>
                <div class="trx-item-meta text-xs text-muted flex-align-center gap-1">
                  <span>${formatJam(item.tanggal)}</span>
                  <span>•</span>
                  <span>${escapeHtml(dompetAsal.nama)}</span>
                  ${item.subkategori ? `<span>•</span><span>${escapeHtml(item.subkategori)}</span>` : ''}
                  ${item.tag ? `<span class="badge-tag">${escapeHtml(item.tag)}</span>` : ''}
                </div>
              </div>
            </div>

            <div class="trx-item-right text-right">
              <div class="trx-item-amount font-heading font-semibold ${nominalClass}">
                ${tanda}${formatNominalDisplay(item.nominal)}
              </div>

              <!-- Quick action buttons -->
              <div class="trx-actions-inline flex-align-center justify-end gap-2 mt-1">
                <button class="btn-trx-action btn-trx-copy" data-id="${item.id}" title="Duplikat transaksi">${ICONS.copy}</button>
                <button class="btn-trx-action btn-trx-edit" data-id="${item.id}" title="Ubah transaksi">${ICONS.edit}</button>
                <button class="btn-trx-action btn-trx-delete" data-id="${item.id}" title="Hapus transaksi">${ICONS.trash}</button>
              </div>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });
  }

  html += `
      </section>
    </div>
  `;

  container.innerHTML = html;

  // Filter Listeners
  const selectPeriode = container.querySelector('#select-filter-periode');
  if (selectPeriode) {
    selectPeriode.addEventListener('change', (e) => {
      stateFilter.periode = e.target.value;
      renderTransaksi(container);
    });
  }

  const selectJenis = container.querySelector('#select-filter-jenis');
  if (selectJenis) {
    selectJenis.addEventListener('change', (e) => {
      stateFilter.jenis = e.target.value;
      renderTransaksi(container);
    });
  }

  const selectDompet = container.querySelector('#select-filter-dompet');
  if (selectDompet) {
    selectDompet.addEventListener('change', (e) => {
      stateFilter.dompetId = e.target.value;
      renderTransaksi(container);
    });
  }

  const selectKategori = container.querySelector('#select-filter-kategori');
  if (selectKategori) {
    selectKategori.addEventListener('change', (e) => {
      stateFilter.kategoriId = e.target.value;
      renderTransaksi(container);
    });
  }

  const inputSearch = container.querySelector('#input-trx-search');
  if (inputSearch) {
    inputSearch.addEventListener('input', (e) => {
      stateFilter.searchQuery = e.target.value;
      renderTransaksi(container);
    });
  }

  // Aksi Edit
  const btnsEdit = container.querySelectorAll('.btn-trx-edit');
  btnsEdit.forEach(btn => {
    btn.addEventListener('click', () => {
      const trxId = btn.getAttribute('data-id');
      const item = semuaTransaksi.find(t => t.id === trxId);
      if (item && window.bukaModalTransaksi) {
        window.bukaModalTransaksi(item);
      }
    });
  });

  // Aksi Duplikat
  const btnsCopy = container.querySelectorAll('.btn-trx-copy');
  btnsCopy.forEach(btn => {
    btn.addEventListener('click', async () => {
      const trxId = btn.getAttribute('data-id');
      const item = semuaTransaksi.find(t => t.id === trxId);
      if (!item) return;

      const duplicated = {
        ...item,
        id: `trx_${Date.now()}`,
        tanggal: new Date().toISOString()
      };

      await put('transaksi', duplicated);
      showToast('Transaksi berhasil diduplikasi ke hari ini.', 'success');
      renderTransaksi(container);
    });
  });

  // Aksi Hapus dengan Pembatalan (Undo) 5 Detik
  const btnsDelete = container.querySelectorAll('.btn-trx-delete');
  btnsDelete.forEach(btn => {
    btn.addEventListener('click', async () => {
      const trxId = btn.getAttribute('data-id');
      const item = semuaTransaksi.find(t => t.id === trxId);
      if (!item) return;

      // Hapus sementara dari state
      await remove('transaksi', trxId);
      renderTransaksi(container);

      // Tampilkan toast undo
      showToast('Transaksi telah dihapus.', 'info', async () => {
        // Callback undo: simpan kembali
        await put('transaksi', item);
        showToast('Penghapusan dibatalkan.', 'success');
        renderTransaksi(container);
      }, 5000);
    });
  });
}
