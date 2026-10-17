/**
 * DompetKu - Halaman Mode Acara / Trip (Travel & Multi-Currency)
 * Mengelola acara liburan (misal: Trip Jepang), konversi mata uang asing (JPY),
 * tracking pengeluaran spesifik acara vs anggaran acara, dan rata-rata per hari.
 */

import { getAll, put, setSetting, getSetting, remove } from '../db.js';
import { formatRupiah, formatTanggal, showToast, ICONS, escapeHtml } from '../utils.js';

export async function renderAcara(container) {
  const [semuaAcara, semuaTransaksi, semuaKategori, acaraAktifId] = await Promise.all([
    getAll('acara'),
    getAll('transaksi'),
    getAll('kategori'),
    getSetting('acaraAktifId', null)
  ]);

  const kategoriMap = {};
  semuaKategori.forEach(k => { kategoriMap[k.id] = k; });

  const daftarAcaraStat = semuaAcara.map(ac => {
    const isAktif = ac.id === acaraAktifId || ac.status === 'aktif';
    const trxAcara = semuaTransaksi.filter(t => t.acaraId === ac.id && t.jenis === 'pengeluaran');

    let totalIDR = 0;
    let totalForeign = 0;
    const kategoriBreakdown = {};
    const tanggalSet = new Set();

    trxAcara.forEach(t => {
      const nominal = Number(t.nominal) || 0;
      totalIDR += nominal;
      if (t.nominalMataUangAsing) {
        totalForeign += Number(t.nominalMataUangAsing) || 0;
      }
      tanggalSet.add(t.tanggal.split('T')[0]);

      const katNama = kategoriMap[t.kategoriId]?.nama || 'Lainnya';
      kategoriBreakdown[katNama] = (kategoriBreakdown[katNama] || 0) + nominal;
    });

    const tglMulai = new Date(ac.tanggalMulai);
    const tglSelesai = new Date(ac.tanggalSelesai);
    const totalHariTrip = Math.max(1, Math.round((tglSelesai - tglMulai) / (1000 * 60 * 60 * 24)) + 1);
    const hariAktifAdaTrx = Math.max(1, tanggalSet.size);

    const rataRataPerHari = totalIDR / hariAktifAdaTrx;
    const anggaran = Number(ac.anggaran) || 0;
    const persenSerapan = anggaran > 0 ? (totalIDR / anggaran) * 100 : 0;
    const sisaAnggaran = anggaran - totalIDR;

    return {
      ...ac,
      isAktif,
      totalIDR,
      totalForeign,
      totalHariTrip,
      hariAktifAdaTrx,
      rataRataPerHari,
      anggaran,
      persenSerapan,
      sisaAnggaran,
      trxCount: trxAcara.length,
      kategoriBreakdown
    };
  });

  let html = `
    <div class="acara-page animate-fade-in">
      <div class="acara-header-card">
        <div class="flex-between flex-wrap gap-2 mb-2">
          <div>
            <h1 class="page-title">Mode Acara & Liburan</h1>
            <span class="text-xs text-muted">Pantau pengeluaran perjalanan khusus dengan dukungan mata uang asing (JPY/USD)</span>
          </div>
          <button id="btn-tambah-acara" class="btn-primary-compact">
            ${ICONS.plus} Acara Baru
          </button>
        </div>
      </div>

      <section class="acara-list-container">
        ${daftarAcaraStat.length === 0 ? `
          <div class="empty-state-card text-center py-5">
            <div class="empty-icon text-muted mb-2">${ICONS.acara}</div>
            <h3 class="text-base font-semibold">Belum Ada Mode Acara</h3>
            <p class="text-xs text-muted mb-3">Buat acara seperti "Trip Jepang" untuk memisahkan budget liburan dari pengeluaran rutin.</p>
            <button id="btn-tambah-acara-empty" class="btn-primary-compact">Buat Acara Sekarang</button>
          </div>
        ` : `
          ${daftarAcaraStat.map(ac => `
            <div class="card-acara-detail ${ac.isAktif ? 'acara-aktif-border' : ''}">
              <div class="acara-item-top">
                <div>
                  <div class="flex-align-center gap-2">
                    <h2 class="acara-nama">${escapeHtml(ac.nama)}</h2>
                    ${ac.isAktif ? `<span class="badge-status-green">Mode Aktif</span>` : ''}
                  </div>
                  <span class="text-xs text-muted">
                    ${formatTanggal(ac.tanggalMulai, 'sedang')} s/d ${formatTanggal(ac.tanggalSelesai, 'sedang')} (${ac.totalHariTrip} hari)
                    • Mata uang: <strong>${ac.kodeMataUang || 'IDR'}</strong> (1 ${ac.kodeMataUang} = Rp ${(ac.nilaiKurs || 1).toLocaleString()})
                  </span>
                </div>

                <div class="flex-align-center gap-2">
                  <button class="btn-toggle-aktif-acara btn-secondary-compact" data-id="${ac.id}" data-nama="${escapeHtml(ac.nama)}" data-status="${ac.isAktif}">
                    ${ac.isAktif ? 'Nonaktifkan' : 'Aktifkan Mode Ini'}
                  </button>
                  <button class="btn-edit-acara btn-icon-subtle" data-id="${ac.id}" title="Edit Acara">${ICONS.edit}</button>
                </div>
              </div>

              <div class="acara-stats-grid mt-3">
                <div class="acara-stat-box">
                  <span class="text-xs text-muted">Total Pengeluaran Acara</span>
                  <div class="font-bold text-base text-danger">${formatRupiah(ac.totalIDR)}</div>
                  ${ac.kodeMataUang && ac.kodeMataUang !== 'IDR' ? `
                    <span class="text-xs text-muted">(${ac.simbolMataUang || ''}${ac.totalForeign.toLocaleString()} ${ac.kodeMataUang})</span>
                  ` : ''}
                </div>

                <div class="acara-stat-box">
                  <span class="text-xs text-muted">Pagu Anggaran Acara</span>
                  <div class="font-bold text-base">${formatRupiah(ac.anggaran)}</div>
                  <span class="text-xs ${ac.sisaAnggaran < 0 ? 'text-danger' : 'text-success'}">
                    Sisa: ${formatRupiah(ac.sisaAnggaran)}
                  </span>
                </div>

                <div class="acara-stat-box">
                  <span class="text-xs text-muted">Rata-rata Harian</span>
                  <div class="font-bold text-base text-primary">${formatRupiah(ac.rataRataPerHari)}/hari</div>
                  <span class="text-xs text-muted">Tercatat ${ac.trxCount} transaksi</span>
                </div>
              </div>

              <div class="acara-progress-wrap mt-3">
                <div class="flex-between text-xs mb-1">
                  <span>Serapan Anggaran Acara (${ac.persenSerapan.toFixed(1)}%)</span>
                  <span>${formatRupiah(ac.totalIDR)} / ${formatRupiah(ac.anggaran)}</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill ${ac.persenSerapan > 100 ? 'progress-red' : 'progress-blue'}" style="width: ${Math.min(ac.persenSerapan, 100)}%;"></div>
                </div>
              </div>

              ${Object.keys(ac.kategoriBreakdown).length > 0 ? `
                <div class="acara-breakdown-area mt-3">
                  <span class="text-xs font-semibold text-secondary mb-2 block">Pengeluaran per Kategori:</span>
                  <div class="acara-chips-breakdown">
                    ${Object.entries(ac.kategoriBreakdown).map(([katNama, total]) => `
                      <span class="chip-breakdown">
                        ${escapeHtml(katNama)}: <strong>${formatRupiah(total)}</strong>
                      </span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        `}
      </section>

      <div id="modal-acara" class="modal-backdrop hidden">
        <div class="modal-dialog animate-scale-up">
          <div class="modal-header">
            <h3 class="modal-title" id="modal-acara-title">Acara / Trip Baru</h3>
            <button id="btn-close-modal-acara" class="btn-close-modal">${ICONS.silang}</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="input-acara-id" />
            <div class="form-group mb-3">
              <label class="form-label">Nama Acara / Liburan</label>
              <input type="text" id="input-acara-nama" class="form-input" placeholder="Misal: Trip Jepang, Liburan Bali, Nikahan..." />
            </div>
            <div class="form-row-2col mb-3">
              <div class="form-group">
                <label class="form-label">Tanggal Mulai</label>
                <input type="date" id="input-acara-mulai" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Tanggal Selesai</label>
                <input type="date" id="input-acara-selesai" class="form-input" />
              </div>
            </div>
            <div class="form-group mb-3">
              <label class="form-label">Pagu Anggaran Acara (Rp)</label>
              <input type="text" id="input-acara-anggaran" class="form-input" placeholder="0" />
            </div>
            <div class="form-row-2col mb-3">
              <div class="form-group">
                <label class="form-label">Kode Mata Uang Tambahan</label>
                <input type="text" id="input-acara-valas" class="form-input" placeholder="JPY, USD, SGD, MYR..." />
              </div>
              <div class="form-group">
                <label class="form-label">Nilai Kurs ke Rupiah (Rp)</label>
                <input type="number" id="input-acara-kurs" class="form-input" placeholder="Contoh JPY: 108" />
              </div>
            </div>
            <div class="form-group mb-3">
              <label class="form-label">Catatan Tambahan</label>
              <input type="text" id="input-acara-catatan" class="form-input" placeholder="Itinerary ringkas, akomodasi..." />
            </div>
          </div>
          <div class="modal-footer">
            <button id="btn-simpan-acara" class="btn-primary w-full">Simpan Acara</button>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  setupAcaraEvents(container, semuaAcara);
}

function setupAcaraEvents(container, semuaAcara) {
  container.querySelectorAll('.btn-toggle-aktif-acara').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const isAktif = btn.dataset.status === 'true';
      const nama = btn.dataset.nama;

      if (isAktif) {
        await setSetting('acaraAktifId', null);
        showToast(`Mode Acara "${nama}" dinonaktifkan.`, 'info');
      } else {
        await setSetting('acaraAktifId', id);
        showToast(`Mode Acara "${nama}" aktif! Transaksi baru otomatis ditautkan ke acara ini.`, 'success');
      }

      window.updateHeaderAcaraBadge?.();
      renderAcara(container);
    });
  });

  const modal = container.querySelector('#modal-acara');
  const modalTitle = container.querySelector('#modal-acara-title');
  const inputId = container.querySelector('#input-acara-id');
  const inputNama = container.querySelector('#input-acara-nama');
  const inputMulai = container.querySelector('#input-acara-mulai');
  const inputSelesai = container.querySelector('#input-acara-selesai');
  const inputAnggaran = container.querySelector('#input-acara-anggaran');
  const inputValas = container.querySelector('#input-acara-valas');
  const inputKurs = container.querySelector('#input-acara-kurs');
  const inputCatatan = container.querySelector('#input-acara-catatan');

  const bukaTambahAcara = () => {
    inputId.value = '';
    modalTitle.textContent = 'Acara / Trip Baru';
    inputNama.value = '';
    inputMulai.value = new Date().toISOString().split('T')[0];
    const selesai = new Date();
    selesai.setDate(selesai.getDate() + 7);
    inputSelesai.value = selesai.toISOString().split('T')[0];
    inputAnggaran.value = '';
    inputValas.value = 'JPY';
    inputKurs.value = '108';
    inputCatatan.value = '';
    modal.classList.remove('hidden');
    inputNama.focus();
  };

  container.querySelector('#btn-tambah-acara')?.addEventListener('click', bukaTambahAcara);
  container.querySelector('#btn-tambah-acara-empty')?.addEventListener('click', bukaTambahAcara);

  container.querySelectorAll('.btn-edit-acara').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const ac = semuaAcara.find(x => x.id === id);
      if (!ac) return;

      inputId.value = ac.id;
      modalTitle.textContent = `Edit Acara: ${ac.nama}`;
      inputNama.value = ac.nama;
      inputMulai.value = ac.tanggalMulai ? ac.tanggalMulai.split('T')[0] : '';
      inputSelesai.value = ac.tanggalSelesai ? ac.tanggalSelesai.split('T')[0] : '';
      inputAnggaran.value = Number(ac.anggaran).toLocaleString('id-ID');
      inputValas.value = ac.kodeMataUang || 'JPY';
      inputKurs.value = ac.nilaiKurs || 1;
      inputCatatan.value = ac.catatan || '';
      modal.classList.remove('hidden');
    });
  });

  container.querySelector('#btn-close-modal-acara')?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  inputAnggaran?.addEventListener('input', (e) => {
    const bersih = e.target.value.replace(/\D/g, '');
    const num = parseInt(bersih, 10) || 0;
    e.target.value = num > 0 ? num.toLocaleString('id-ID') : '';
  });

  container.querySelector('#btn-simpan-acara')?.addEventListener('click', async () => {
    const nama = inputNama.value.trim();
    const mulai = inputMulai.value;
    const selesai = inputSelesai.value;
    const anggaran = parseInt(inputAnggaran.value.replace(/\D/g, ''), 10) || 0;
    const kodeMataUang = (inputValas.value.trim() || 'IDR').toUpperCase();
    const nilaiKurs = parseFloat(inputKurs.value) || 1;
    const catatan = inputCatatan.value.trim();

    if (!nama || !mulai || !selesai) {
      showToast('Lengkapi nama dan rentang tanggal acara.', 'warning');
      return;
    }

    const id = inputId.value || `acara_${Date.now()}`;
    const lama = semuaAcara.find(x => x.id === id);

    let simbolMataUang = 'Rp';
    if (kodeMataUang === 'JPY') simbolMataUang = '¥';
    else if (kodeMataUang === 'USD') simbolMataUang = '$';
    else if (kodeMataUang === 'SGD') simbolMataUang = 'S$';

    const acaraObj = {
      id,
      nama,
      tanggalMulai: mulai,
      tanggalSelesai: selesai,
      anggaran,
      kodeMataUang,
      simbolMataUang,
      nilaiKurs,
      catatan,
      status: lama?.status || 'aktif'
    };

    await put('acara', acaraObj);
    showToast('Acara berhasil disimpan!', 'success');
    modal.classList.add('hidden');
    renderAcara(container);
  });
}
