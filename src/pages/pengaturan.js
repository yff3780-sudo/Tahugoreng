/**
 * DompetKu - Halaman Pengaturan & Preferensi
 * Pengaturan siklus bulanan (cut-off date), keamanan PIN (SHA-256 hash),
 * ekspor CSV & backup/restore JSON, transaksi berulang, template favorit, dan reset data.
 */

import { getAll, put, remove, getSetting, setSetting, exportAllData, importAllData, resetAllData } from '../db.js';
import { isiDataContohRealistis } from '../seed.js';
import { hashPIN, showToast, ICONS, escapeHtml, formatRupiah } from '../utils.js';

export async function renderPengaturan(container) {
  const [
    semuaKategori,
    semuaTemplate,
    semuaBerulang,
    cutOffDate,
    modeBerulang,
    pinHash,
    temaAktif
  ] = await Promise.all([
    getAll('kategori'),
    getAll('template'),
    getAll('berulang'),
    getSetting('cutOffDate', 1),
    getSetting('modeEksekusiBerulang', 'konfirmasi'),
    getSetting('pinHash', null),
    getSetting('tema', 'sistem')
  ]);

  const hasPIN = Boolean(pinHash);

  let html = `
    <div class="pengaturan-page animate-fade-in">
      <div class="pengaturan-header-card mb-3">
        <h1 class="page-title">Pengaturan Aplikasi</h1>
        <span class="text-xs text-muted">Sesuaikan preferensi, keamanan, siklus gajian, dan backup data</span>
      </div>

      <section class="card-setting-group">
        <h2 class="setting-group-title">
          ${ICONS.matahari} Tema & Tampilan
        </h2>
        <div class="setting-item-row">
          <div>
            <div class="font-medium text-sm">Mode Tampilan</div>
            <div class="text-xs text-muted">Pilih mode gelap, terang, atau mengikuti sistem perangkat</div>
          </div>
          <select id="select-tema-aplikasi" class="form-select-sm">
            <option value="sistem" ${temaAktif === 'sistem' ? 'selected' : ''}>Ikuti Sistem</option>
            <option value="terang" ${temaAktif === 'terang' ? 'selected' : ''}>Mode Terang</option>
            <option value="gelap" ${temaAktif === 'gelap' ? 'selected' : ''}>Mode Gelap</option>
          </select>
        </div>
      </section>

      <section class="card-setting-group mt-3">
        <h2 class="setting-group-title">
          ${ICONS.kalender} Siklus Finansial
        </h2>
        <div class="setting-item-row">
          <div>
            <div class="font-medium text-sm">Tanggal Awal Siklus Bulanan</div>
            <div class="text-xs text-muted">Tanggal mulainya perhitungan laporan & anggaran (misal: tgl 1 atau tgl 25 saat gajian)</div>
          </div>
          <div class="flex-align-center gap-1">
            <span class="text-xs text-muted">Tiap tanggal</span>
            <input type="number" id="input-cut-off-date" min="1" max="28" class="form-input-num" value="${cutOffDate}" />
          </div>
        </div>

        <div class="setting-item-row mt-2">
          <div>
            <div class="font-medium text-sm">Eksekusi Transaksi Berulang</div>
            <div class="text-xs text-muted">Saat transaksi jatuh tempo (gaji/tagihan), catat otomatis atau minta konfirmasi</div>
          </div>
          <select id="select-mode-berulang" class="form-select-sm">
            <option value="konfirmasi" ${modeBerulang === 'konfirmasi' ? 'selected' : ''}>Tampilkan Konfirmasi</option>
            <option value="otomatis" ${modeBerulang === 'otomatis' ? 'selected' : ''}>Otomatis Catat</option>
          </select>
        </div>
      </section>

      <section class="card-setting-group mt-3">
        <h2 class="setting-group-title">
          ${ICONS.gembok} Keamanan & Kunci PIN
        </h2>
        <div class="setting-item-row">
          <div>
            <div class="font-medium text-sm">Kunci Aplikasi dengan PIN (4–6 Digit)</div>
            <div class="text-xs text-muted">Melindungi privasi finansial saat membuka aplikasi. PIN disimpan aman sebagai SHA-256 hash.</div>
          </div>
          <div>
            ${hasPIN ? `
              <div class="flex-align-center gap-2">
                <span class="badge-status-green">PIN Aktif</span>
                <button id="btn-hapus-pin" class="btn-danger-compact">Hapus PIN</button>
              </div>
            ` : `
              <button id="btn-pasang-pin" class="btn-primary-compact">Pasang PIN</button>
            `}
          </div>
        </div>
      </section>

      <section class="card-setting-group mt-3">
        <h2 class="setting-group-title">
          ${ICONS.transaksi} Rutinitas & Template Transaksi
        </h2>
        <div class="setting-item-row">
          <div>
            <div class="font-medium text-sm">Transaksi Berulang Aktif (${semuaBerulang.length})</div>
            <div class="text-xs text-muted">Gaji pokok tgl 1, tunjangan tgl 5, tagihan internet, tabungan rutin</div>
          </div>
          <button id="btn-kelola-berulang" class="btn-secondary-compact">Lihat Daftar</button>
        </div>
        <div id="drawer-berulang" class="sub-drawer hidden mt-2">
          <div class="berulang-list-items">
            ${semuaBerulang.map(b => `
              <div class="flex-between text-xs py-2 border-b">
                <div>
                  <div class="font-semibold">${escapeHtml(b.nama)}</div>
                  <span class="text-muted">Tiap tanggal ${b.hariSpesifik || 1} • ${b.frekuensi}</span>
                </div>
                <div class="text-right">
                  <div class="font-bold">${formatRupiah(b.nominal)}</div>
                  <button class="btn-hapus-berulang text-danger text-xs" data-id="${b.id}">Hapus</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="setting-item-row mt-2">
          <div>
            <div class="font-medium text-sm">Template Favorit Sekali Tap (${semuaTemplate.length})</div>
            <div class="text-xs text-muted">Tombol cepat transaksi harian di Beranda</div>
          </div>
          <button id="btn-kelola-template" class="btn-secondary-compact">Lihat Template</button>
        </div>
        <div id="drawer-template" class="sub-drawer hidden mt-2">
          <div class="template-list-items">
            ${semuaTemplate.map(t => `
              <div class="flex-between text-xs py-2 border-b">
                <div>
                  <div class="font-semibold">${escapeHtml(t.nama)}</div>
                  <span class="text-muted">${formatRupiah(t.nominal)}</span>
                </div>
                <button class="btn-hapus-template text-danger text-xs" data-id="${t.id}">Hapus</button>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <section class="card-setting-group mt-3">
        <h2 class="setting-group-title">
          ${ICONS.download} Ekspor, Backup & Restore
        </h2>
        <div class="setting-item-row">
          <div>
            <div class="font-medium text-sm">Ekspor Transaksi ke CSV (Excel)</div>
            <div class="text-xs text-muted">Unduh file spreadsheet daftar seluruh transaksi kamu</div>
          </div>
          <button id="btn-ekspor-csv" class="btn-secondary-compact">
            ${ICONS.download} Unduh CSV
          </button>
        </div>

        <div class="setting-item-row mt-2">
          <div>
            <div class="font-medium text-sm">Backup Seluruh Data (JSON)</div>
            <div class="text-xs text-muted">Cadangkan semua dompet, transaksi, pagu, dan target ke berkas JSON</div>
          </div>
          <button id="btn-backup-json" class="btn-secondary-compact">
            ${ICONS.download} Backup JSON
          </button>
        </div>

        <div class="setting-item-row mt-2">
          <div>
            <div class="font-medium text-sm">Restore Data dari JSON</div>
            <div class="text-xs text-muted">Pulihkan data dari berkas backup yang sebelumnya disimpan</div>
          </div>
          <div>
            <input type="file" id="file-restore-json" accept=".json" class="hidden" />
            <button id="btn-trigger-restore" class="btn-secondary-compact">
              ${ICONS.upload} Pulihkan Data
            </button>
          </div>
        </div>
      </section>

      <section class="card-setting-group danger-zone mt-3">
        <h2 class="setting-group-title text-danger">
          ${ICONS.hapus} Data Contoh & Reset
        </h2>
        <div class="setting-item-row">
          <div>
            <div class="font-medium text-sm">Isi Ulang Data Contoh (Mock Data)</div>
            <div class="text-xs text-muted">Muat kembali data contoh realistis 3 bulan Jakarta (gaji, ojol, kopi, trip Jepang)</div>
          </div>
          <button id="btn-isi-mock-data" class="btn-warning-compact">
            Isi Data Contoh
          </button>
        </div>

        <div class="setting-item-row mt-2">
          <div>
            <div class="font-medium text-sm text-danger">Hapus Semua Data (Reset Total)</div>
            <div class="text-xs text-muted">Menghapus seluruh transaksi, dompet, dan pengaturan di browser ini.</div>
          </div>
          <button id="btn-reset-total" class="btn-danger-compact">
            Reset Total
          </button>
        </div>
      </section>

      <div id="modal-pasang-pin" class="modal-backdrop hidden">
        <div class="modal-dialog animate-scale-up">
          <div class="modal-header">
            <h3 class="modal-title">Pasang Kunci PIN</h3>
            <button id="btn-close-modal-pin" class="btn-close-modal">${ICONS.silang}</button>
          </div>
          <div class="modal-body">
            <p class="text-xs text-muted mb-3">Masukkan 4–6 digit angka rahasia untuk mengunci aplikasi DompetKu.</p>
            <div class="form-group mb-3">
              <label class="form-label">PIN Baru (4-6 angka)</label>
              <input type="password" id="input-pin-baru" maxlength="6" class="form-input text-center font-bold text-lg" placeholder="••••" />
            </div>
            <div class="form-group mb-3">
              <label class="form-label">Konfirmasi PIN</label>
              <input type="password" id="input-pin-konfirmasi" maxlength="6" class="form-input text-center font-bold text-lg" placeholder="••••" />
            </div>
          </div>
          <div class="modal-footer">
            <button id="btn-simpan-pin" class="btn-primary w-full">Simpan & Aktifkan PIN</button>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  setupPengaturanEvents(container);
}

function setupPengaturanEvents(container) {
  container.querySelector('#select-tema-aplikasi')?.addEventListener('change', async (e) => {
    const tema = e.target.value;
    await setSetting('tema', tema);
    window.terapkanTema(tema);
    showToast(`Tema diubah ke ${tema}.`, 'info');
  });

  container.querySelector('#input-cut-off-date')?.addEventListener('change', async (e) => {
    const val = Math.min(28, Math.max(1, parseInt(e.target.value, 10) || 1));
    e.target.value = val;
    await setSetting('cutOffDate', val);
    showToast(`Tanggal siklus bulanan diatur ke tanggal ${val}.`, 'success');
  });

  container.querySelector('#select-mode-berulang')?.addEventListener('change', async (e) => {
    await setSetting('modeEksekusiBerulang', e.target.value);
    showToast('Preferensi transaksi berulang diperbarui.', 'success');
  });

  const modalPin = container.querySelector('#modal-pasang-pin');
  const inputPinBaru = container.querySelector('#input-pin-baru');
  const inputPinKonfirmasi = container.querySelector('#input-pin-konfirmasi');

  container.querySelector('#btn-pasang-pin')?.addEventListener('click', () => {
    inputPinBaru.value = '';
    inputPinKonfirmasi.value = '';
    modalPin.classList.remove('hidden');
    inputPinBaru.focus();
  });

  container.querySelector('#btn-close-modal-pin')?.addEventListener('click', () => {
    modalPin.classList.add('hidden');
  });

  container.querySelector('#btn-simpan-pin')?.addEventListener('click', async () => {
    const p1 = inputPinBaru.value.trim();
    const p2 = inputPinKonfirmasi.value.trim();

    if (p1.length < 4 || p1.length > 6 || !/^\d+$/.test(p1)) {
      showToast('PIN harus terdiri dari 4 hingga 6 digit angka.', 'warning');
      return;
    }
    if (p1 !== p2) {
      showToast('Konfirmasi PIN tidak cocok.', 'error');
      return;
    }

    const hashed = await hashPIN(p1);
    await setSetting('pinHash', hashed);
    showToast('Kunci PIN berhasil diaktifkan!', 'success');
    modalPin.classList.add('hidden');
    renderPengaturan(container);
  });

  container.querySelector('#btn-hapus-pin')?.addEventListener('click', async () => {
    if (confirm('Apakah kamu yakin ingin menonaktifkan kunci PIN?')) {
      await setSetting('pinHash', null);
      showToast('Kunci PIN dinonaktifkan.', 'info');
      renderPengaturan(container);
    }
  });

  container.querySelector('#btn-kelola-berulang')?.addEventListener('click', () => {
    container.querySelector('#drawer-berulang')?.classList.toggle('hidden');
  });

  container.querySelector('#btn-kelola-template')?.addEventListener('click', () => {
    container.querySelector('#drawer-template')?.classList.toggle('hidden');
  });

  container.querySelectorAll('.btn-hapus-berulang').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await remove('berulang', id);
      showToast('Transaksi berulang dihapus.', 'info');
      renderPengaturan(container);
    });
  });

  container.querySelectorAll('.btn-hapus-template').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await remove('template', id);
      showToast('Template dihapus.', 'info');
      renderPengaturan(container);
    });
  });

  container.querySelector('#btn-ekspor-csv')?.addEventListener('click', async () => {
    const [semuaTrx, semuaDompet, semuaKat] = await Promise.all([
      getAll('transaksi'),
      getAll('dompet'),
      getAll('kategori')
    ]);

    const dompetMap = {};
    semuaDompet.forEach(d => { dompetMap[d.id] = d.nama; });

    const katMap = {};
    semuaKat.forEach(k => { katMap[k.id] = k.nama; });

    let csvContent = '\uFEFFTanggal,Jam,Jenis,Kategori,Subkategori,Nominal (Rp),Dompet Asal,Dompet Tujuan,Catatan,Tag\n';

    semuaTrx.forEach(t => {
      const tglObj = new Date(t.tanggal);
      const tgl = tglObj.toLocaleDateString('id-ID');
      const jam = tglObj.toLocaleTimeString('id-ID');
      const jenis = t.jenis;
      const kat = katMap[t.kategoriId] || '-';
      const sub = t.subkategori || '-';
      const nom = t.nominal;
      const dAsal = dompetMap[t.dompetId] || '-';
      const dTujuan = dompetMap[t.dompetTujuanId] || '-';
      const cat = `"${(t.catatan || '').replace(/"/g, '""')}"`;
      const tag = `"${(t.tag || '').replace(/"/g, '""')}"`;

      csvContent += `${tgl},${jam},${jenis},${kat},${sub},${nom},${dAsal},${dTujuan},${cat},${tag}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DompetKu_Transaksi_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File CSV berhasil diunduh!', 'success');
  });

  container.querySelector('#btn-backup-json')?.addEventListener('click', async () => {
    const data = await exportAllData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DompetKu_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON berhasil diunduh!', 'success');
  });

  const fileInput = container.querySelector('#file-restore-json');
  container.querySelector('#btn-trigger-restore')?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (!parsed.data) throw new Error('Data tidak valid');
          if (confirm('Memulihkan backup akan menggantikan data yang ada saat ini. Lanjutkan?')) {
            await importAllData(parsed);
            showToast('Data berhasil dipulihkan dari backup!', 'success');
            setTimeout(() => window.location.reload(), 1000);
          }
        } catch (err) {
          showToast('Gagal memulihkan data: Format file JSON tidak valid.', 'error');
        }
      };
      reader.readAsText(file);
    } catch (err) {
      showToast('Error membaca berkas.', 'error');
    }
  });

  container.querySelector('#btn-isi-mock-data')?.addEventListener('click', async () => {
    if (confirm('Isi ulang data contoh realistis 3 bulan? Data yang ada saat ini akan diganti dengan data contoh.')) {
      await isiDataContohRealistis();
      showToast('Data contoh realistis berhasil dimuat!', 'success');
      setTimeout(() => window.navigasiKe('beranda'), 800);
    }
  });

  container.querySelector('#btn-reset-total')?.addEventListener('click', async () => {
    const konfirmasi = prompt('Ketik "HAPUS" untuk mengonfirmasi reset total semua data:');
    if (konfirmasi === 'HAPUS') {
      await resetAllData();
      localStorage.clear();
      showToast('Semua data berhasil dibersihkan.', 'info');
      setTimeout(() => window.location.reload(), 1000);
    }
  });
}
