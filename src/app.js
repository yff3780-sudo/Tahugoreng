/**
 * DompetKu - Aplikasi Utama (Main Application Entry Point)
 * Mengontrol inisialisasi database, router, modal form transaksi lengkap dengan keypad HP,
 * verifikasi PIN keamanan, scheduler transaksi berulang, dan penanganan tema.
 */

import { initDB, getAll, getById, put, getSetting, setSetting } from './db.js';
import { isiDataContohRealistis } from './seed.js';
import { initRouter, navigateTo, getHalamanAktif } from './router.js';
import { formatRupiah, formatTanggal, formatNominalInput, parseNominal, showToast, hashPIN, ICONS, escapeHtml } from './utils.js';

let cachedDompet = [];
let cachedKategori = [];
let cachedAcaraAktif = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initDB();

    const temaTersimpan = await getSetting('tema', 'sistem');
    terapkanTema(temaTersimpan);

    const pinHash = await getSetting('pinHash', null);
    if (pinHash) {
      tampilkanLayarKunciPIN(pinHash);
    } else {
      await mulaiAplikasi();
    }
  } catch (err) {
    console.error('Error saat inisialisasi aplikasi DompetKu:', err);
    await mulaiAplikasi();
  }
});

async function mulaiAplikasi() {
  const semuaDompet = await getAll('dompet');
  if (semuaDompet.length === 0) {
    await isiDataContohRealistis();
  }

  await refreshCacheMaster();
  setupModalTransaksi();
  setupMenuLainnya();
  await cekTransaksiBerulangJatuhTempo();
  initRouter();
  updateHeaderAcaraBadge();
}

export async function refreshCacheMaster() {
  const [dompetList, kategoriList, acaraAktifId, semuaAcara] = await Promise.all([
    getAll('dompet'),
    getAll('kategori'),
    getSetting('acaraAktifId', null),
    getAll('acara')
  ]);

  cachedDompet = dompetList.filter(d => !d.diarsipkan);
  cachedKategori = kategoriList;
  cachedAcaraAktif = semuaAcara.find(a => a.id === acaraAktifId && a.status === 'aktif') || null;
}

export function terapkanTema(tema) {
  const root = document.documentElement;
  if (tema === 'gelap') {
    root.setAttribute('data-theme', 'dark');
  } else if (tema === 'terang') {
    root.setAttribute('data-theme', 'light');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
}

export async function updateHeaderAcaraBadge() {
  await refreshCacheMaster();
  const banner = document.getElementById('banner-mode-acara');
  if (!banner) return;

  if (cachedAcaraAktif) {
    banner.classList.remove('hidden');
    banner.innerHTML = `
      <div class="flex-between">
        <span class="text-xs font-semibold">Mode Aktif: ${escapeHtml(cachedAcaraAktif.nama)} (${cachedAcaraAktif.kodeMataUang || 'JPY'})</span>
        <button id="btn-tutup-banner-acara" class="text-xs underline">Kelola</button>
      </div>
    `;
    banner.querySelector('#btn-tutup-banner-acara')?.addEventListener('click', () => {
      navigateTo('acara');
    });
  } else {
    banner.classList.add('hidden');
    banner.innerHTML = '';
  }
}

function tampilkanLayarKunciPIN(pinHashBenar) {
  const lockScreen = document.getElementById('app-lock-screen');
  if (!lockScreen) {
    mulaiAplikasi();
    return;
  }

  lockScreen.classList.remove('hidden');
  let enteredPIN = '';

  const dots = lockScreen.querySelectorAll('.pin-dot');
  const updateDots = () => {
    dots.forEach((dot, idx) => {
      dot.classList.toggle('filled', idx < enteredPIN.length);
    });
  };

  const verify = async () => {
    const hashedInput = await hashPIN(enteredPIN);
    if (hashedInput === pinHashBenar) {
      lockScreen.classList.add('animate-fade-out');
      setTimeout(() => {
        lockScreen.classList.add('hidden');
        lockScreen.classList.remove('animate-fade-out');
        mulaiAplikasi();
      }, 250);
    } else {
      showToast('PIN salah! Silakan coba lagi.', 'error');
      enteredPIN = '';
      updateDots();
      lockScreen.querySelector('.pin-dots-row')?.classList.add('shake');
      setTimeout(() => lockScreen.querySelector('.pin-dots-row')?.classList.remove('shake'), 400);
    }
  };

  lockScreen.querySelectorAll('.btn-pin-key').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val;
      if (val === 'clear') {
        enteredPIN = '';
      } else if (val === 'backspace') {
        enteredPIN = enteredPIN.slice(0, -1);
      } else if (enteredPIN.length < 6) {
        enteredPIN += val;
      }

      updateDots();

      if (enteredPIN.length >= 4) {
        verify();
      }
    });
  });
}

async function cekTransaksiBerulangJatuhTempo() {
  try {
    const [semuaBerulang, modeEksekusi] = await Promise.all([
      getAll('berulang'),
      getSetting('modeEksekusiBerulang', 'konfirmasi')
    ]);

    const sekarang = new Date();
    const tglHariIni = sekarang.getDate();

    const yangJatuhTempo = semuaBerulang.filter(b => {
      if (!b.aktif) return false;
      return b.hariSpesifik === tglHariIni;
    });

    if (yangJatuhTempo.length === 0) return;

    if (modeEksekusi === 'otomatis') {
      for (const item of yangJatuhTempo) {
        await eksekusiTransaksiBerulang(item);
      }
      showToast(`Otomatis mencatat ${yangJatuhTempo.length} transaksi berulang hari ini.`, 'info');
    } else {
      tampilkanKonfirmasiBerulang(yangJatuhTempo);
    }
  } catch (e) {
    console.error('Error cek transaksi berulang:', e);
  }
}

async function eksekusiTransaksiBerulang(item) {
  await put('transaksi', {
    id: `trx_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tanggal: new Date().toISOString(),
    jenis: item.jenis,
    nominal: item.nominal,
    dompetId: item.dompetId,
    dompetTujuanId: item.dompetTujuanId || null,
    biayaAdmin: item.biayaAdmin || 0,
    kategoriId: item.kategoriId,
    subkategori: item.subkategori || item.nama,
    catatan: `[Rutin] ${item.nama}`,
    tag: 'berulang,rutin'
  });
}

function tampilkanKonfirmasiBerulang(daftarItem) {
  const container = document.getElementById('notifikasi-berulang-banner');
  if (!container) return;

  const item = daftarItem[0];
  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="banner-berulang animate-slide-up">
      <div class="flex-align-center gap-2">
        <span class="text-primary">${ICONS.kalender}</span>
        <div>
          <div class="font-semibold text-xs">${escapeHtml(item.nama)} jatuh tempo hari ini!</div>
          <div class="text-xs text-muted">Nominal: ${formatRupiah(item.nominal)}</div>
        </div>
      </div>
      <div class="flex-align-center gap-1">
        <button id="btn-catat-berulang" class="btn-primary-compact">Catat Sekarang</button>
        <button id="btn-abaikan-berulang" class="btn-secondary-compact">Nanti</button>
      </div>
    </div>
  `;

  container.querySelector('#btn-catat-berulang')?.addEventListener('click', async () => {
    for (const b of daftarItem) {
      await eksekusiTransaksiBerulang(b);
    }
    showToast('Transaksi berulang berhasil dicatat!', 'success');
    container.classList.add('hidden');
    navigateTo(getHalamanAktif());
  });

  container.querySelector('#btn-abaikan-berulang')?.addEventListener('click', () => {
    container.classList.add('hidden');
  });
}

let editTargetId = null;

function setupModalTransaksi() {
  const modal = document.getElementById('modal-input-transaksi');
  if (!modal) return;

  const btnClose = modal.querySelector('#btn-close-modal-transaksi');
  const tabsJenis = modal.querySelectorAll('.tab-jenis-btn');
  const inputNominal = modal.querySelector('#input-trx-nominal');
  const selectKategori = modal.querySelector('#select-trx-kategori');
  const selectSubkategori = modal.querySelector('#select-trx-subkategori');
  const selectDompetAsal = modal.querySelector('#select-trx-dompet');
  const selectDompetTujuan = modal.querySelector('#select-trx-dompet-tujuan');
  const groupTransferTujuan = modal.querySelector('#group-transfer-tujuan');
  const groupKategori = modal.querySelector('#group-kategori-trx');
  const inputBiayaAdmin = modal.querySelector('#input-trx-biaya-admin');
  const groupBiayaAdmin = modal.querySelector('#group-biaya-admin');
  const inputTanggal = modal.querySelector('#input-trx-tanggal');
  const inputCatatan = modal.querySelector('#input-trx-catatan');
  const inputTag = modal.querySelector('#input-trx-tag');
  const btnSimpan = modal.querySelector('#btn-simpan-transaksi');

  const groupValas = modal.querySelector('#group-trx-valas');
  const inputValasNominal = modal.querySelector('#input-trx-valas-nominal');
  const labelValasSimbol = modal.querySelector('#label-valas-simbol');

  let currentJenis = 'pengeluaran';

  const updateJenisView = (jenis) => {
    currentJenis = jenis;
    tabsJenis.forEach(tab => tab.classList.toggle('active', tab.dataset.jenis === jenis));

    if (jenis === 'transfer') {
      groupTransferTujuan.classList.remove('hidden');
      groupBiayaAdmin.classList.remove('hidden');
      groupKategori.classList.add('hidden');
    } else {
      groupTransferTujuan.classList.add('hidden');
      groupBiayaAdmin.classList.add('hidden');
      groupKategori.classList.remove('hidden');
      populateKategoriSelect(jenis);
    }
  };

  const populateKategoriSelect = (jenis) => {
    const list = cachedKategori.filter(k => k.jenis === jenis);
    selectKategori.innerHTML = list.map(k => `<option value="${k.id}">${escapeHtml(k.nama)}</option>`).join('');
    updateSubkategori();
  };

  const updateSubkategori = () => {
    const katId = selectKategori.value;
    const kat = cachedKategori.find(k => k.id === katId);
    if (kat && kat.subkategori && kat.subkategori.length > 0) {
      selectSubkategori.classList.remove('hidden');
      selectSubkategori.innerHTML = kat.subkategori.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    } else {
      selectSubkategori.classList.add('hidden');
      selectSubkategori.innerHTML = '';
    }
  };

  selectKategori.addEventListener('change', updateSubkategori);

  tabsJenis.forEach(tab => {
    tab.addEventListener('click', () => updateJenisView(tab.dataset.jenis));
  });

  modal.querySelectorAll('.keypad-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.key;
      let rawVal = inputNominal.value.replace(/\D/g, '');

      if (val === 'C') {
        rawVal = '';
      } else if (val === 'backspace') {
        rawVal = rawVal.slice(0, -1);
      } else if (val === '+000') {
        rawVal = rawVal ? `${rawVal}000` : '';
      } else if (val === '+00000') {
        rawVal = rawVal ? `${rawVal}00000` : '';
      } else {
        rawVal += val;
      }

      inputNominal.value = rawVal ? parseInt(rawVal, 10).toLocaleString('id-ID') : '';
    });
  });

  inputNominal.addEventListener('input', (e) => {
    const num = parseNominal(e.target.value);
    e.target.value = num > 0 ? num.toLocaleString('id-ID') : '';
  });

  inputBiayaAdmin?.addEventListener('input', (e) => {
    const num = parseNominal(e.target.value);
    e.target.value = num > 0 ? num.toLocaleString('id-ID') : '';
  });

  inputValasNominal?.addEventListener('input', (e) => {
    if (cachedAcaraAktif && cachedAcaraAktif.nilaiKurs) {
      const valas = parseNominal(e.target.value);
      const idr = Math.round(valas * cachedAcaraAktif.nilaiKurs);
      inputNominal.value = idr > 0 ? idr.toLocaleString('id-ID') : '';
    }
  });

  window.bukaModalTransaksi = (initialData = null, isEdit = false) => {
    refreshCacheMaster().then(() => {
      selectDompetAsal.innerHTML = cachedDompet.map(d => `<option value="${d.id}">${escapeHtml(d.nama)}</option>`).join('');
      selectDompetTujuan.innerHTML = cachedDompet.map(d => `<option value="${d.id}">${escapeHtml(d.nama)}</option>`).join('');

      editTargetId = (isEdit && initialData?.id) ? initialData.id : null;
      modal.querySelector('#modal-trx-title').textContent = isEdit ? 'Edit Transaksi' : 'Catat Transaksi Baru';

      if (cachedAcaraAktif) {
        groupValas.classList.remove('hidden');
        labelValasSimbol.textContent = cachedAcaraAktif.kodeMataUang || 'JPY';
        inputValasNominal.placeholder = `Nominal ${cachedAcaraAktif.kodeMataUang} (Kurs: Rp ${cachedAcaraAktif.nilaiKurs})`;
      } else {
        groupValas.classList.add('hidden');
      }

      if (initialData) {
        updateJenisView(initialData.jenis || 'pengeluaran');
        inputNominal.value = initialData.nominal ? Number(initialData.nominal).toLocaleString('id-ID') : '';
        if (initialData.dompetId) selectDompetAsal.value = initialData.dompetId;
        if (initialData.dompetTujuanId) selectDompetTujuan.value = initialData.dompetTujuanId;
        if (initialData.kategoriId) {
          selectKategori.value = initialData.kategoriId;
          updateSubkategori();
          if (initialData.subkategori) selectSubkategori.value = initialData.subkategori;
        }
        inputBiayaAdmin.value = initialData.biayaAdmin ? Number(initialData.biayaAdmin).toLocaleString('id-ID') : '';
        inputTanggal.value = initialData.tanggal ? initialData.tanggal.substring(0, 16) : formatTanggal(new Date(), 'iso-time');
        inputCatatan.value = initialData.catatan || '';
        inputTag.value = initialData.tag || '';

        if (initialData.nominalMataUangAsing) {
          inputValasNominal.value = Number(initialData.nominalMataUangAsing).toLocaleString('id-ID');
        } else {
          inputValasNominal.value = '';
        }
      } else {
        updateJenisView('pengeluaran');
        inputNominal.value = '';
        inputBiayaAdmin.value = '';
        inputValasNominal.value = '';
        inputTanggal.value = formatTanggal(new Date(), 'iso-time');
        inputCatatan.value = '';
        inputTag.value = '';
      }

      modal.classList.remove('hidden');
      inputNominal.focus();
    });
  };

  btnClose.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  btnSimpan.addEventListener('click', async () => {
    const nominal = parseNominal(inputNominal.value);
    if (nominal <= 0) {
      showToast('Harap masukkan nominal transaksi.', 'warning');
      return;
    }

    const jenis = currentJenis;
    const dompetId = selectDompetAsal.value;
    const dompetTujuanId = jenis === 'transfer' ? selectDompetTujuan.value : null;
    const biayaAdmin = jenis === 'transfer' ? parseNominal(inputBiayaAdmin.value) : 0;
    const kategoriId = jenis !== 'transfer' ? selectKategori.value : null;
    const subkategori = jenis !== 'transfer' ? selectSubkategori.value : null;
    const tanggal = inputTanggal.value ? new Date(inputTanggal.value).toISOString() : new Date().toISOString();
    const catatan = inputCatatan.value.trim();
    const tag = inputTag.value.trim();

    let nominalMataUangAsing = null;
    let kodeMataUang = null;
    let acaraId = null;

    if (cachedAcaraAktif) {
      acaraId = cachedAcaraAktif.id;
      kodeMataUang = cachedAcaraAktif.kodeMataUang;
      const v = parseNominal(inputValasNominal.value);
      if (v > 0) nominalMataUangAsing = v;
    }

    if (jenis === 'pengeluaran' && kategoriId) {
      const semuaAnggaran = await getAll('anggaran');
      const sekarang = new Date(tanggal);
      const m = sekarang.getMonth() + 1;
      const y = sekarang.getFullYear();
      const agg = semuaAnggaran.find(a => a.kategoriId === kategoriId && a.bulan === m && a.tahun === y);

      if (agg && agg.nominalPagu > 0) {
        const semuaTrx = await getAll('transaksi');
        let realisasiSaatIni = 0;
        semuaTrx.forEach(t => {
          const d = new Date(t.tanggal);
          if (t.jenis === 'pengeluaran' && t.kategoriId === kategoriId && d.getMonth() + 1 === m && d.getFullYear() === y && t.id !== editTargetId) {
            realisasiSaatIni += Number(t.nominal) || 0;
          }
        });

        if (realisasiSaatIni + nominal > agg.nominalPagu) {
          const selisihLebih = (realisasiSaatIni + nominal) - agg.nominalPagu;
          showToast(`Peringatan: Transaksi ini menyebabkan kategori melebihi pagu sebesar ${formatRupiah(selisihLebih)}!`, 'warning', null, null, 4500);
        }
      }
    }

    const trxData = {
      id: editTargetId || `trx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tanggal,
      jenis,
      nominal,
      dompetId,
      dompetTujuanId,
      biayaAdmin,
      kategoriId,
      subkategori,
      catatan,
      tag,
      acaraId,
      nominalMataUangAsing,
      kodeMataUang,
      updatedAt: new Date().toISOString()
    };

    await put('transaksi', trxData);
    showToast('Tersimpan!', 'success');
    modal.classList.add('hidden');
    navigateTo(getHalamanAktif());
  });
}

function setupMenuLainnya() {
  const btnLainnya = document.getElementById('nav-btn-lainnya');
  const drawer = document.getElementById('drawer-menu-lainnya');
  const backdrop = document.getElementById('drawer-menu-backdrop');

  const toggleDrawer = (open) => {
    if (open) {
      drawer?.classList.remove('hidden');
      backdrop?.classList.remove('hidden');
    } else {
      drawer?.classList.add('hidden');
      backdrop?.classList.add('hidden');
    }
  };

  btnLainnya?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleDrawer(true);
  });

  backdrop?.addEventListener('click', () => toggleDrawer(false));

  drawer?.querySelectorAll('[data-route]').forEach(link => {
    link.addEventListener('click', () => {
      toggleDrawer(false);
    });
  });
}

window.navigasiKe = (target) => {
  navigateTo(target);
};
