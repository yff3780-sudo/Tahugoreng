/**
 * DompetKu - Halaman Target Tabungan & Financial Goals
 * Menghitung otomatis alokasi setoran bulanan & mingguan agar target tercapai tepat waktu.
 * Menampilkan progress bar visual, status (Sesuai Jalur / Tertinggal), riwayat setoran,
 * serta modal setor dana langsung dari dompet asal.
 */

import { getAll, put, remove } from '../db.js';
import {
  formatRupiah,
  formatTanggal,
  showToast,
  ICONS,
  escapeHtml
} from '../utils.js';

export async function renderTarget(container) {
  const [semuaTarget, semuaDompet] = await Promise.all([
    getAll('target'),
    getAll('dompet')
  ]);

  const dompetMap = {};
  semuaDompet.forEach(d => { dompetMap[d.id] = d; });

  const sembunyikanSaldo = localStorage.getItem('dompetku_sembunyikan_saldo') === 'true';
  const formatSaldo = (nominal) => sembunyikanSaldo ? '••••••••' : formatRupiah(nominal);

  const sekarang = new Date();

  let html = `
    <div class="target-page animate-fade-in">
      <div class="page-header-flex mb-3">
        <div>
          <h1 class="page-title">Target Tabungan</h1>
          <span class="text-xs text-muted">Wujudkan impian finansial dengan rencana menabung terukur</span>
        </div>
        <button id="btn-tambah-target" class="btn-sm btn-primary flex-align-center gap-1">
          ${ICONS.plus} Target Baru
        </button>
      </div>

      <div class="target-goals-grid">
  `;

  if (semuaTarget.length === 0) {
    html += `
      <div class="empty-state card p-5 text-center col-span-full">
        <div class="empty-icon text-muted mb-2">${ICONS.target}</div>
        <p class="font-semibold text-sm">Belum ada target tabungan</p>
        <span class="text-xs text-muted">Mulai buat target pertama kamu seperti Dana Darurat atau Liburan!</span>
      </div>
    `;
  } else {
    semuaTarget.forEach(item => {
      const targetNom = Number(item.targetNominal || 0);
      const terkumpul = Number(item.terkumpul || 0);
      const sisa = Math.max(0, targetNom - terkumpul);
      const persen = targetNom > 0 ? Math.min(100, Math.round((terkumpul / targetNom) * 100)) : 0;

      // Hitung sisa waktu & target per bulan / minggu
      const tenggatDate = new Date(item.tenggatWaktu);
      const selisihHari = Math.max(1, Math.ceil((tenggatDate - sekarang) / (1000 * 60 * 60 * 24)));
      const sisaBulan = Math.max(1, Math.round(selisihHari / 30.4));
      const sisaMinggu = Math.max(1, Math.round(selisihHari / 7));

      const tabungPerBulan = Math.ceil(sisa / sisaBulan);
      const tabungPerMinggu = Math.ceil(sisa / sisaMinggu);

      // Status On Track / Tertinggal
      // Jika waktu berjalan sudah 50% tapi tabungan baru <40%, tandai tertinggal
      const isTertinggal = (persen < 35 && sisaBulan <= 3) && persen < 100;
      const statusBadgeClass = persen >= 100 ? 'badge-success' : (isTertinggal ? 'badge-warning' : 'badge-primary');
      const statusText = persen >= 100 ? 'Tercapai 🎉' : (isTertinggal ? 'Tertinggal' : 'Sesuai Jalur');

      const dmpTujuan = dompetMap[item.dompetTujuanId] || { nama: 'Rekening Tabungan' };

      html += `
        <div class="card target-card p-4 mb-3" style="border-top: 4px solid ${item.warna || '#10b981'};">
          <div class="flex-between flex-align-center mb-2">
            <div class="flex-align-center gap-2">
              <span class="target-icon-box" style="background-color: ${item.warna || '#10b981'}20; color: ${item.warna || '#10b981'};">
                ${ICONS.target}
              </span>
              <div>
                <h3 class="target-title font-semibold text-base">${escapeHtml(item.nama)}</h3>
                <span class="text-xs text-muted">Disimpan di: ${escapeHtml(dmpTujuan.nama)}</span>
              </div>
            </div>

            <div class="flex-align-center gap-2">
              <span class="badge-status-target text-xs ${statusBadgeClass}">${statusText}</span>
              <button class="btn-icon btn-hapus-target" data-id="${item.id}" title="Hapus target">${ICONS.trash}</button>
            </div>
          </div>

          <div class="target-amounts flex-between flex-align-center my-2">
            <div>
              <span class="text-xs text-muted block">Terkumpul</span>
              <span class="font-heading font-semibold text-lg text-primary">${formatSaldo(terkumpul)}</span>
            </div>
            <div class="text-right">
              <span class="text-xs text-muted block">Target (${persen}%)</span>
              <span class="font-heading font-semibold text-base">${formatSaldo(targetNom)}</span>
            </div>
          </div>

          <div class="progress-track mb-3" style="height: 10px;">
            <div class="progress-bar progress-blue" style="width: ${persen}%;"></div>
          </div>

          <!-- Kalkulator Otomatis -->
          ${persen < 100 ? `
            <div class="target-plan-box p-3 mb-3 text-xs bg-subtle rounded-md">
              <div class="font-semibold text-primary mb-1">💡 Rencana Menabung Agar Tercapai:</div>
              <div class="flex-between">
                <span>Per bulan: <strong>${formatSaldo(tabungPerBulan)}</strong></span>
                <span>Per minggu: <strong>${formatSaldo(tabungPerMinggu)}</strong></span>
              </div>
              <div class="text-muted mt-1">Tenggat waktu: ${formatTanggal(item.tenggatWaktu)} (${selisihHari} hari lagi)</div>
            </div>
          ` : `
            <div class="p-2 mb-3 text-xs text-center text-in bg-in-subtle font-semibold rounded-md">
              Selamat! Target tabungan ini sudah tercapai sepenuhnya.
            </div>
          `}

          <!-- Riwayat Setoran Ringkas & Tombol Setor -->
          <div class="flex-between flex-align-center border-t pt-3">
            <span class="text-xs text-muted">${(item.riwayatSetoran || []).length} kali setoran tercatat</span>
            <button class="btn-sm btn-primary btn-setor-dana" data-id="${item.id}" data-nama="${escapeHtml(item.nama)}">
              + Setor Tabungan
            </button>
          </div>
        </div>
      `;
    });
  }

  html += `
      </div>

      <!-- MODAL TAMBAH TARGET -->
      <div id="modal-tambah-target" class="modal-backdrop hidden">
        <div class="modal-card modal-compact animate-scale-up">
          <div class="modal-header">
            <h2 class="modal-title">Buat Target Tabungan Baru</h2>
            <button type="button" id="btn-close-modal-target" class="btn-icon">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group mb-3">
              <label class="form-label">Nama Target</label>
              <input type="text" id="input-target-nama" class="form-input" placeholder="Misal: Trip Jepang, Beli Laptop, DP Rumah..." />
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Target Nominal (Rp)</label>
              <input type="text" id="input-target-nominal" class="form-input" placeholder="0" />
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Saldo Terkumpul Awal (Rp)</label>
              <input type="text" id="input-target-awal" class="form-input" placeholder="0" />
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Tenggat Waktu</label>
              <input type="date" id="input-target-tenggat" class="form-input" />
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Dompet Rekening Penampung</label>
              <select id="select-target-dompet" class="form-select">
                ${semuaDompet.map(d => `<option value="${d.id}">${escapeHtml(d.nama)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" id="btn-simpan-target-baru" class="btn-primary w-full">Simpan Target</button>
          </div>
        </div>
      </div>

      <!-- MODAL SETOR DANA KE TARGET -->
      <div id="modal-setor-dana" class="modal-backdrop hidden">
        <div class="modal-card modal-compact animate-scale-up">
          <div class="modal-header">
            <h2 id="modal-setor-title" class="modal-title">Setor Dana Tabungan</h2>
            <button type="button" id="btn-close-modal-setor" class="btn-icon">&times;</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="input-setor-target-id" />

            <div class="form-group mb-3">
              <label class="form-label">Sumber Dana (Dompet Asal)</label>
              <select id="select-setor-asal" class="form-select">
                ${semuaDompet.map(d => `<option value="${d.id}">${escapeHtml(d.nama)}</option>`).join('')}
              </select>
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Nominal Setoran (Rp)</label>
              <input type="text" id="input-setor-nominal" class="form-input" placeholder="0" />
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Catatan Tambahan</label>
              <input type="text" id="input-setor-catatan" class="form-input" placeholder="Misal: Alokasi gaji bulan ini" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" id="btn-eksekusi-setoran" class="btn-primary w-full">Konfirmasi Setoran</button>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Listeners Target Tabungan
  const modalTarget = container.querySelector('#modal-tambah-target');
  const btnBukaTarget = container.querySelector('#btn-tambah-target');
  const btnCloseTarget = container.querySelector('#btn-close-modal-target');
  const btnSimpanTarget = container.querySelector('#btn-simpan-target-baru');

  if (btnBukaTarget) {
    btnBukaTarget.addEventListener('click', () => {
      container.querySelector('#input-target-nama').value = '';
      container.querySelector('#input-target-nominal').value = '';
      container.querySelector('#input-target-awal').value = '';
      container.querySelector('#input-target-tenggat').value = '';
      modalTarget.classList.remove('hidden');
    });
  }

  if (btnCloseTarget) {
    btnCloseTarget.addEventListener('click', () => modalTarget.classList.add('hidden'));
  }

  if (btnSimpanTarget) {
    btnSimpanTarget.addEventListener('click', async () => {
      const nama = container.querySelector('#input-target-nama').value.trim();
      const nomStr = container.querySelector('#input-target-nominal').value.replace(/[^\d]/g, '');
      const awalStr = container.querySelector('#input-target-awal').value.replace(/[^\d]/g, '');
      const tenggat = container.querySelector('#input-target-tenggat').value;
      const dompetTujuanId = container.querySelector('#select-target-dompet').value;

      if (!nama || !nomStr || !tenggat) {
        showToast('Mohon lengkapi nama target, nominal, dan tanggal tenggat.', 'warning');
        return;
      }

      const targetBaru = {
        id: `tgt_${Date.now()}`,
        nama,
        targetNominal: parseInt(nomStr, 10),
        terkumpul: parseInt(awalStr, 10) || 0,
        tenggatWaktu: tenggat,
        dompetTujuanId,
        warna: '#3b82f6',
        riwayatSetoran: awalStr ? [{ tanggal: new Date().toISOString().slice(0, 10), nominal: parseInt(awalStr, 10), catatan: 'Setoran awal' }] : []
      };

      await put('target', targetBaru);
      showToast('Target tabungan baru berhasil dibuat!', 'success');
      modalTarget.classList.add('hidden');
      renderTarget(container);
    });
  }

  // Hapus Target
  const btnsHapus = container.querySelectorAll('.btn-hapus-target');
  btnsHapus.forEach(btn => {
    btn.addEventListener('click', async () => {
      const tgtId = btn.getAttribute('data-id');
      if (confirm('Apakah kamu yakin ingin menghapus target tabungan ini?')) {
        await remove('target', tgtId);
        showToast('Target tabungan dihapus.', 'info');
        renderTarget(container);
      }
    });
  });

  // Modal Setor Dana
  const modalSetor = container.querySelector('#modal-setor-dana');
  const btnCloseSetor = container.querySelector('#btn-close-modal-setor');
  const btnEksekusiSetor = container.querySelector('#btn-eksekusi-setoran');
  const modalSetorTitle = container.querySelector('#modal-setor-title');
  const inputSetorTgtId = container.querySelector('#input-setor-target-id');
  const selectSetorAsal = container.querySelector('#select-setor-asal');
  const inputSetorNominal = container.querySelector('#input-setor-nominal');
  const inputSetorCatatan = container.querySelector('#input-setor-catatan');

  const btnsSetor = container.querySelectorAll('.btn-setor-dana');
  btnsSetor.forEach(btn => {
    btn.addEventListener('click', () => {
      const tgtId = btn.getAttribute('data-id');
      const nama = btn.getAttribute('data-nama');

      inputSetorTgtId.value = tgtId;
      modalSetorTitle.textContent = `Setor ke: ${nama}`;
      inputSetorNominal.value = '';
      inputSetorCatatan.value = '';
      modalSetor.classList.remove('hidden');
    });
  });

  if (btnCloseSetor) {
    btnCloseSetor.addEventListener('click', () => modalSetor.classList.add('hidden'));
  }

  if (btnEksekusiSetor) {
    btnEksekusiSetor.addEventListener('click', async () => {
      const tgtId = inputSetorTgtId.value;
      const targetItem = semuaTarget.find(t => t.id === tgtId);
      if (!targetItem) return;

      const nomStr = inputSetorNominal.value.replace(/[^\d]/g, '');
      const nominal = parseInt(nomStr, 10) || 0;
      if (nominal <= 0) {
        showToast('Nominal setoran harus lebih besar dari 0.', 'warning');
        return;
      }

      const asalId = selectSetorAsal.value;
      const dmpAsal = dompetMap[asalId];
      const dmpTujuan = dompetMap[targetItem.dompetTujuanId];

      // Catat transfer internal jika dompet asal dan tujuan berbeda
      if (asalId !== targetItem.dompetTujuanId) {
        const trxTransfer = {
          id: `trx_setor_${Date.now()}`,
          jenis: 'transfer',
          nominal,
          biayaAdmin: 0,
          dompetId: asalId,
          dompetTujuanId: targetItem.dompetTujuanId,
          tanggal: new Date().toISOString(),
          catatan: `Setoran tabungan: ${targetItem.nama}`,
          tag: '#tabungan #goal'
        };
        await put('transaksi', trxTransfer);
      }

      // Update akumulasi target
      targetItem.terkumpul = (targetItem.terkumpul || 0) + nominal;
      if (!targetItem.riwayatSetoran) targetItem.riwayatSetoran = [];
      targetItem.riwayatSetoran.push({
        tanggal: new Date().toISOString().slice(0, 10),
        nominal,
        catatan: inputSetorCatatan.value.trim() || `Setor dari ${dmpAsal ? dmpAsal.nama : 'Dompet'}`
      });

      await put('target', targetItem);
      showToast(`Setoran ${formatRupiah(nominal)} berhasil dicatat!`, 'success');
      modalSetor.classList.add('hidden');
      renderTarget(container);
    });
  }
}
