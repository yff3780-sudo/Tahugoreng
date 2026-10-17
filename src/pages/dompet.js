/**
 * DompetKu - Halaman Pengelolaan Dompet & Rekening (Akun Finansial)
 * Menampilkan seluruh dompet aktif & terarsip dengan saldo real-time,
 * modal tambah/edit dompet, pemilihan warna & ikon,
 * serta transaksi Transfer Antar Dompet dengan biaya admin opsional.
 */

import { getAll, put, hitungSaldoSemuaDompet } from '../db.js';
import {
  formatRupiah,
  showToast,
  ICONS,
  escapeHtml
} from '../utils.js';

export async function renderDompet(container) {
  const [semuaDompet, saldoMap] = await Promise.all([
    getAll('dompet'),
    hitungSaldoSemuaDompet()
  ]);

  const sembunyikanSaldo = localStorage.getItem('dompetku_sembunyikan_saldo') === 'true';
  const formatSaldo = (nominal) => sembunyikanSaldo ? '••••••••' : formatRupiah(nominal);

  const dompetAktif = semuaDompet.filter(d => !d.diarsipkan);
  const dompetArsip = semuaDompet.filter(d => d.diarsipkan);

  const totalKekayaan = dompetAktif.reduce((acc, d) => acc + (saldoMap[d.id] || 0), 0);

  let html = `
    <div class="dompet-page animate-fade-in">
      <div class="page-header-flex mb-3">
        <div>
          <h1 class="page-title">Dompet & Rekening</h1>
          <span class="text-xs text-muted">Kelola akun bank, e-wallet, dan uang tunai</span>
        </div>
        <div class="flex-align-center gap-2">
          <button id="btn-modal-transfer" class="btn-sm btn-outline flex-align-center gap-1 text-primary">
            ${ICONS.arrowTransfer} Transfer
          </button>
          <button id="btn-tambah-dompet" class="btn-sm btn-primary flex-align-center gap-1">
            ${ICONS.plus} Dompet Baru
          </button>
        </div>
      </div>

      <!-- KARTU TOTAL KEKAYAAN BERSIH -->
      <section class="card total-wealth-card glass-panel mb-4 p-4">
        <span class="text-xs text-muted uppercase font-semibold">Total Kekayaan Bersih</span>
        <div class="nominal-total font-heading my-1">${formatSaldo(totalKekayaan)}</div>
        <span class="text-xs text-muted">Akumulasi seluruh saldo dari ${dompetAktif.length} dompet aktif</span>
      </section>

      <!-- DAFTAR DOMPET AKTIF -->
      <section class="section-wallets mb-4">
        <h2 class="section-title mb-2">Dompet Aktif (${dompetAktif.length})</h2>
        <div class="wallets-grid">
  `;

  dompetAktif.forEach(d => {
    const sld = saldoMap[d.id] || 0;
    html += `
      <div class="card wallet-card p-3 mb-3" style="border-left: 5px solid ${d.warna || '#3b82f6'};">
        <div class="flex-between flex-align-center mb-2">
          <div class="flex-align-center gap-2">
            <span class="wallet-icon-box" style="background-color: ${d.warna || '#3b82f6'}20; color: ${d.warna || '#3b82f6'};">
              ${ICONS.wallet}
            </span>
            <div>
              <h3 class="wallet-name font-semibold text-sm">${escapeHtml(d.nama)}</h3>
              <span class="badge-jenis text-xs">${escapeHtml(d.jenis || 'Rekening')}</span>
            </div>
          </div>

          <div class="flex-align-center gap-1">
            <button class="btn-icon btn-edit-wallet" data-id="${d.id}" title="Ubah Dompet">${ICONS.edit}</button>
            <button class="btn-icon btn-archive-wallet" data-id="${d.id}" title="Arsipkan Dompet">${ICONS.trash}</button>
          </div>
        </div>

        <div class="wallet-card-bottom flex-between flex-align-center pt-2 border-t">
          <div>
            <span class="text-xs text-muted block">Saldo Saat Ini</span>
            <span class="wallet-balance font-heading font-semibold text-base">${formatSaldo(sld)}</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-muted block">Saldo Awal</span>
            <span class="text-xs text-muted font-medium">${formatSaldo(d.saldoAwal || 0)}</span>
          </div>
        </div>
      </div>
    `;
  });

  html += `
        </div>
      </section>
  `;

  // Bagian Dompet Terarsip (jika ada)
  if (dompetArsip.length > 0) {
    html += `
      <section class="section-archived-wallets mb-4">
        <h2 class="section-title text-muted mb-2">Dompet Terarsip (${dompetArsip.length})</h2>
        <div class="wallets-grid opacity-75">
    `;

    dompetArsip.forEach(d => {
      const sld = saldoMap[d.id] || 0;
      html += `
        <div class="card wallet-card p-3 mb-2 border-dashed">
          <div class="flex-between flex-align-center">
            <div>
              <span class="font-semibold text-sm">${escapeHtml(d.nama)}</span>
              <span class="text-xs text-muted block">${formatSaldo(sld)}</span>
            </div>
            <button class="btn-sm btn-outline btn-unarchive-wallet" data-id="${d.id}">
              Pulihkan
            </button>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </section>
    `;
  }

  // MODAL FORM TAMBAH / UBAH DOMPET
  html += `
    <div id="modal-form-dompet" class="modal-backdrop hidden">
      <div class="modal-card modal-compact animate-scale-up">
        <div class="modal-header">
          <h2 id="modal-dompet-title" class="modal-title">Tambah Dompet Baru</h2>
          <button type="button" id="btn-close-modal-dompet" class="btn-icon">&times;</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="input-dompet-id" />

          <div class="form-group mb-3">
            <label class="form-label">Nama Dompet / Rekening</label>
            <input type="text" id="input-dompet-nama" class="form-input" placeholder="Misal: Rekening BCA, GoPay, Tunai..." />
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Tipe Akun</label>
            <select id="select-dompet-jenis" class="form-select">
              <option value="bank">Bank / Rekening</option>
              <option value="ewallet">E-Wallet (GoPay, OVO, ShopeePay)</option>
              <option value="cash">Uang Tunai (Cash)</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Saldo Awal (Rp)</label>
            <input type="text" id="input-dompet-saldo-awal" class="form-input" placeholder="0" />
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Warna Aksen</label>
            <div class="color-picker-row flex-align-center gap-2">
              <input type="color" id="input-dompet-warna" value="#3b82f6" class="form-color-input" />
              <span class="text-xs text-muted">Pilih warna pembeda</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" id="btn-simpan-dompet" class="btn-primary w-full">Simpan Dompet</button>
        </div>
      </div>
    </div>

    <!-- MODAL TRANSFER ANTAR DOMPET -->
    <div id="modal-transfer-internal" class="modal-backdrop hidden">
      <div class="modal-card modal-compact animate-scale-up">
        <div class="modal-header">
          <h2 class="modal-title">Transfer Antar Dompet</h2>
          <button type="button" id="btn-close-modal-transfer" class="btn-icon">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group mb-3">
            <label class="form-label">Dompet Asal (Sumber Dana)</label>
            <select id="select-transfer-asal" class="form-select">
              ${dompetAktif.map(d => `<option value="${d.id}">${escapeHtml(d.nama)} (${formatSaldo(saldoMap[d.id] || 0)})</option>`).join('')}
            </select>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Dompet Tujuan (Penerima)</label>
            <select id="select-transfer-tujuan" class="form-select">
              ${dompetAktif.map(d => `<option value="${d.id}">${escapeHtml(d.nama)}</option>`).join('')}
            </select>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Nominal Transfer (Rp)</label>
            <input type="text" id="input-transfer-nominal" class="form-input" placeholder="0" />
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Biaya Admin (Opsional, Rp)</label>
            <input type="text" id="input-transfer-admin" class="form-input" placeholder="0" />
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Catatan</label>
            <input type="text" id="input-transfer-catatan" class="form-input" placeholder="Misal: Top up GoPay dari BCA" />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" id="btn-eksekusi-transfer" class="btn-primary w-full">Kirim Transfer</button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Listeners Dompet
  const modalDompet = container.querySelector('#modal-form-dompet');
  const btnCloseDompet = container.querySelector('#btn-close-modal-dompet');
  const btnTambahDompet = container.querySelector('#btn-tambah-dompet');
  const btnSimpanDompet = container.querySelector('#btn-simpan-dompet');

  const inputId = container.querySelector('#input-dompet-id');
  const inputNama = container.querySelector('#input-dompet-nama');
  const selectJenis = container.querySelector('#select-dompet-jenis');
  const inputSaldoAwal = container.querySelector('#input-dompet-saldo-awal');
  const inputWarna = container.querySelector('#input-dompet-warna');
  const modalTitle = container.querySelector('#modal-dompet-title');

  const bukaModalDompet = (dompet = null) => {
    if (dompet) {
      modalTitle.textContent = 'Ubah Dompet';
      inputId.value = dompet.id;
      inputNama.value = dompet.nama;
      selectJenis.value = dompet.jenis || 'bank';
      inputSaldoAwal.value = (dompet.saldoAwal || 0).toLocaleString('id-ID');
      inputWarna.value = dompet.warna || '#3b82f6';
    } else {
      modalTitle.textContent = 'Tambah Dompet Baru';
      inputId.value = '';
      inputNama.value = '';
      selectJenis.value = 'bank';
      inputSaldoAwal.value = '';
      inputWarna.value = '#3b82f6';
    }
    modalDompet.classList.remove('hidden');
    inputNama.focus();
  };

  if (btnTambahDompet) {
    btnTambahDompet.addEventListener('click', () => bukaModalDompet(null));
  }

  if (btnCloseDompet) {
    btnCloseDompet.addEventListener('click', () => modalDompet.classList.add('hidden'));
  }

  if (btnSimpanDompet) {
    btnSimpanDompet.addEventListener('click', async () => {
      const nama = inputNama.value.trim();
      if (!nama) {
        showToast('Nama dompet wajib diisi.', 'warning');
        return;
      }

      const saldoAwal = parseInt(inputSaldoAwal.value.replace(/[^\d]/g, ''), 10) || 0;
      const dompetData = {
        id: inputId.value || `wallet_${Date.now()}`,
        nama,
        jenis: selectJenis.value,
        saldoAwal,
        warna: inputWarna.value,
        ikon: selectJenis.value,
        diarsipkan: false
      };

      await put('dompet', dompetData);
      showToast('Dompet berhasil disimpan.', 'success');
      modalDompet.classList.add('hidden');
      renderDompet(container);
    });
  }

  // Edit Dompet
  const btnsEdit = container.querySelectorAll('.btn-edit-wallet');
  btnsEdit.forEach(btn => {
    btn.addEventListener('click', () => {
      const dmpId = btn.getAttribute('data-id');
      const dmp = semuaDompet.find(d => d.id === dmpId);
      if (dmp) bukaModalDompet(dmp);
    });
  });

  // Arsipkan Dompet
  const btnsArchive = container.querySelectorAll('.btn-archive-wallet');
  btnsArchive.forEach(btn => {
    btn.addEventListener('click', async () => {
      const dmpId = btn.getAttribute('data-id');
      const dmp = semuaDompet.find(d => d.id === dmpId);
      if (!dmp) return;

      if (confirm(`Arsipkan dompet "${dmp.nama}"? Dompet tidak akan muncul di input transaksi.`)) {
        dmp.diarsipkan = true;
        await put('dompet', dmp);
        showToast(`Dompet "${dmp.nama}" telah diarsipkan.`, 'info');
        renderDompet(container);
      }
    });
  });

  // Pulihkan Dompet Terarsip
  const btnsUnarchive = container.querySelectorAll('.btn-unarchive-wallet');
  btnsUnarchive.forEach(btn => {
    btn.addEventListener('click', async () => {
      const dmpId = btn.getAttribute('data-id');
      const dmp = semuaDompet.find(d => d.id === dmpId);
      if (!dmp) return;

      dmp.diarsipkan = false;
      await put('dompet', dmp);
      showToast(`Dompet "${dmp.nama}" telah dipulihkan.`, 'success');
      renderDompet(container);
    });
  });

  // MODAL TRANSFER INTERNAL
  const modalTransfer = container.querySelector('#modal-transfer-internal');
  const btnBukaTransfer = container.querySelector('#btn-modal-transfer');
  const btnCloseTransfer = container.querySelector('#btn-close-modal-transfer');
  const btnEksekusiTransfer = container.querySelector('#btn-eksekusi-transfer');

  const selectAsal = container.querySelector('#select-transfer-asal');
  const selectTujuan = container.querySelector('#select-transfer-tujuan');
  const inputNominalTf = container.querySelector('#input-transfer-nominal');
  const inputAdminTf = container.querySelector('#input-transfer-admin');
  const inputCatatanTf = container.querySelector('#input-transfer-catatan');

  if (btnBukaTransfer) {
    btnBukaTransfer.addEventListener('click', () => {
      inputNominalTf.value = '';
      inputAdminTf.value = '';
      inputCatatanTf.value = '';
      modalTransfer.classList.remove('hidden');
    });
  }

  if (btnCloseTransfer) {
    btnCloseTransfer.addEventListener('click', () => modalTransfer.classList.add('hidden'));
  }

  if (btnEksekusiTransfer) {
    btnEksekusiTransfer.addEventListener('click', async () => {
      const asalId = selectAsal.value;
      const tujuanId = selectTujuan.value;

      if (asalId === tujuanId) {
        showToast('Dompet asal dan tujuan tidak boleh sama.', 'warning');
        return;
      }

      const nominal = parseInt(inputNominalTf.value.replace(/[^\d]/g, ''), 10) || 0;
      const biayaAdmin = parseInt(inputAdminTf.value.replace(/[^\d]/g, ''), 10) || 0;

      if (nominal <= 0) {
        showToast('Nominal transfer harus lebih besar dari 0.', 'warning');
        return;
      }

      const dmpAsal = semuaDompet.find(d => d.id === asalId);
      const dmpTujuan = semuaDompet.find(d => d.id === tujuanId);

      const trxTransfer = {
        id: `trx_tf_${Date.now()}`,
        jenis: 'transfer',
        nominal,
        biayaAdmin,
        dompetId: asalId,
        dompetTujuanId: tujuanId,
        tanggal: new Date().toISOString(),
        catatan: inputCatatanTf.value.trim() || `Transfer dari ${dmpAsal.nama} ke ${dmpTujuan.nama}`,
        tag: '#transfer'
      };

      await put('transaksi', trxTransfer);
      showToast(`Transfer ${formatRupiah(nominal)} berhasil dicatat!`, 'success');
      modalTransfer.classList.add('hidden');
      renderDompet(container);
    });
  }
}
