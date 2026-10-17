/**
 * DompetKu - Halaman Beranda
 * Menampilkan:
 * 1. Total kekayaan bersih + tombol sembunyikan saldo (mata)
 * 2. Carousel saldo per dompet
 * 3. Pemasukan & pengeluaran bulan ini vs bulan lalu (%)
 * 4. Kolom input cepat cerdas (NLP) dengan preview dinamis sebelum simpan
 * 5. Template transaksi favorit 1-tap
 * 6. Ringkasan anggaran 3 kategori paling kritis
 * 7. Tagihan jatuh tempo terdekat (< 7 hari)
 * 8. Progres target tabungan utama
 * 9. Insight finansial otomatis dalam kalimat cerdas
 */

import { getAll, put, hitungSaldoSemuaDompet, getSetting } from '../db.js';
import { parseKalimatTransaksi } from '../parser.js';
import {
  formatRupiah,
  formatCompactRupiah,
  formatTanggal,
  formatTanggalLengkap,
  showToast,
  ICONS,
  escapeHtml,
  getBulanKey
} from '../utils.js';
import { navigateTo } from '../router.js';

export async function renderBeranda(container) {
  const [
    semuaDompet,
    semuaTransaksi,
    semuaKategori,
    semuaAnggaran,
    semuaTagihan,
    semuaTarget,
    semuaTemplate,
    saldoMap
  ] = await Promise.all([
    getAll('dompet'),
    getAll('transaksi'),
    getAll('kategori'),
    getAll('anggaran'),
    getAll('tagihan'),
    getAll('target'),
    getAll('template'),
    hitungSaldoSemuaDompet()
  ]);

  const dompetAktif = semuaDompet.filter(d => !d.diarsipkan);
  const kategoriMap = {};
  semuaKategori.forEach(k => { kategoriMap[k.id] = k; });

  // Status sembunyikan saldo
  const sembunyikanSaldo = localStorage.getItem('dompetku_sembunyikan_saldo') === 'true';
  const formatSaldo = (nominal) => sembunyikanSaldo ? '••••••••' : formatRupiah(nominal);

  // Total Kekayaan Bersih
  const totalKekayaan = dompetAktif.reduce((acc, d) => acc + (saldoMap[d.id] || 0), 0);

  // Perhitungan Pemasukan & Pengeluaran Bulan Ini & Bulan Lalu
  const sekarang = new Date();
  const blnIniKey = getBulanKey(sekarang);
  const blnLaluDate = new Date(sekarang.getFullYear(), sekarang.getMonth() - 1, 1);
  const blnLaluKey = getBulanKey(blnLaluDate);

  let inBulanIni = 0;
  let outBulanIni = 0;
  let inBulanLalu = 0;
  let outBulanLalu = 0;

  const trxKategoriBulanIni = {};
  const trxKategoriBulanLalu = {};

  semuaTransaksi.forEach(t => {
    const tBln = t.tanggal ? t.tanggal.slice(0, 7) : '';
    const nom = Number(t.nominal || 0);

    if (tBln === blnIniKey) {
      if (t.jenis === 'pemasukan') inBulanIni += nom;
      if (t.jenis === 'pengeluaran') {
        outBulanIni += nom;
        trxKategoriBulanIni[t.kategoriId] = (trxKategoriBulanIni[t.kategoriId] || 0) + nom;
      }
    } else if (tBln === blnLaluKey) {
      if (t.jenis === 'pemasukan') inBulanLalu += nom;
      if (t.jenis === 'pengeluaran') {
        outBulanLalu += nom;
        trxKategoriBulanLalu[t.kategoriId] = (trxKategoriBulanLalu[t.kategoriId] || 0) + nom;
      }
    }
  });

  const diffInPersen = inBulanLalu > 0 ? (((inBulanIni - inBulanLalu) / inBulanLalu) * 100).toFixed(0) : 0;
  const diffOutPersen = outBulanLalu > 0 ? (((outBulanIni - outBulanLalu) / outBulanLalu) * 100).toFixed(0) : 0;

  // Insight Finansial Otomatis
  const insights = [];
  // Cek lonjakan ojol/transportasi
  const outTransportIni = trxKategoriBulanIni['kat_transport'] || 0;
  const outTransportLalu = trxKategoriBulanLalu['kat_transport'] || 0;
  if (outTransportLalu > 0 && outTransportIni > outTransportLalu) {
    const lonjakan = Math.round(((outTransportIni - outTransportLalu) / outTransportLalu) * 100);
    if (lonjakan >= 15) {
      insights.push(`Pengeluaran transportasi naik ${lonjakan}% dibanding bulan lalu. Pertimbangkan opsi tiket bulanan atau KRL.`);
    }
  }

  // Cek hari paling boros minggu ini
  const hariTotals = [0, 0, 0, 0, 0, 0, 0];
  const semingguLalu = new Date(sekarang);
  semingguLalu.setDate(sekarang.getDate() - 7);
  semuaTransaksi.forEach(t => {
    const d = new Date(t.tanggal);
    if (d >= semingguLalu && t.jenis === 'pengeluaran') {
      hariTotals[d.getDay()] += Number(t.nominal || 0);
    }
  });
  let maxHariIdx = 0;
  let maxHariVal = 0;
  hariTotals.forEach((v, idx) => {
    if (v > maxHariVal) {
      maxHariVal = v;
      maxHariIdx = idx;
    }
  });
  const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  if (maxHariVal > 0) {
    insights.push(`Minggu ini kamu paling banyak belanja di hari ${namaHari[maxHariIdx]} (${formatRupiah(maxHariVal)}).`);
  }

  // Insight default jika kosong
  if (insights.length === 0) {
    insights.push(`Pengeluaran bulan ini berjalan terkontrol dengan rasio tabungan yang sehat. Pertahankan disiplin pagu.`);
  }

  // Ringkasan Anggaran Kritis (Top 3 Kategori Pengeluaran vs Pagu)
  const anggaranBlnIni = semuaAnggaran.filter(a => a.bulan === blnIniKey);
  const statusAnggaran = anggaranBlnIni.map(a => {
    const kat = kategoriMap[a.kategoriId] || { nama: 'Kategori', warna: '#6b7280' };
    const realisasi = trxKategoriBulanIni[a.kategoriId] || 0;
    const pagu = Number(a.pagu || 0);
    const persen = pagu > 0 ? (realisasi / pagu) * 100 : 0;
    return {
      kategoriId: a.kategoriId,
      nama: kat.nama,
      warna: kat.warna,
      pagu,
      realisasi,
      sisa: pagu - realisasi,
      persen
    };
  }).sort((a, b) => b.persen - a.persen).slice(0, 3);

  // Tagihan Jatuh Tempo Terdekat (< 7 hari)
  const tagihanTerdekat = semuaTagihan.filter(tag => {
    if (tag.status === 'lunas') return false;
    const jt = new Date(tag.tanggalJatuhTempo);
    const selisihHari = Math.ceil((jt - sekarang) / (1000 * 60 * 60 * 24));
    return selisihHari >= -2 && selisihHari <= 7;
  }).slice(0, 3);

  // Target Utama (Trip Jepang atau Target Pertama)
  const targetUtama = semuaTarget[0] || null;

  // HTML Penyusun Halaman
  let html = `
    <div class="beranda-page animate-fade-in">
      <!-- 1. KARTU SALDO TOTAL -->
      <section class="card-total-saldo glass-panel mb-3">
        <div class="flex-between flex-align-center mb-1">
          <span class="text-xs text-muted uppercase tracking-wider font-semibold">Total Kekayaan Bersih</span>
          <button id="btn-toggle-privasi" class="btn-icon" title="Sembunyikan / Tampilkan Saldo">
            ${sembunyikanSaldo ? ICONS.eyeOff : ICONS.eye}
          </button>
        </div>
        <div class="nominal-total font-heading">${formatSaldo(totalKekayaan)}</div>

        <div class="summary-in-out-row mt-3 pt-3 border-t">
          <div class="summary-col col-in">
            <div class="flex-align-center gap-1 text-xs text-muted">
              <span class="dot-indicator dot-in"></span> Pemasukan
            </div>
            <div class="val font-semibold text-sm text-in">${formatSaldo(inBulanIni)}</div>
            <span class="badge-trend ${Number(diffInPersen) >= 0 ? 'trend-up' : 'trend-down'}">
              ${Number(diffInPersen) >= 0 ? '▲ +' : '▼ '}${diffInPersen}% bln lalu
            </span>
          </div>

          <div class="summary-divider"></div>

          <div class="summary-col col-out">
            <div class="flex-align-center gap-1 text-xs text-muted">
              <span class="dot-indicator dot-out"></span> Pengeluaran
            </div>
            <div class="val font-semibold text-sm text-out">${formatSaldo(outBulanIni)}</div>
            <span class="badge-trend ${Number(diffOutPersen) > 0 ? 'trend-down' : 'trend-up'}">
              ${Number(diffOutPersen) >= 0 ? '▲ +' : '▼ '}${diffOutPersen}% bln lalu
            </span>
          </div>
        </div>
      </section>

      <!-- 2. CAROUSEL DOMPET AKTIF -->
      <section class="section-dompet-carousel mb-4">
        <div class="flex-between flex-align-center mb-2">
          <h2 class="section-title">Dompet & Rekening</h2>
          <button class="text-xs text-link" onclick="window.dompetkuNav('dompet')">Lihat Semua</button>
        </div>
        <div class="wallet-chips-scroll">
  `;

  dompetAktif.forEach(d => {
    const sld = saldoMap[d.id] || 0;
    html += `
      <div class="wallet-chip-card" style="border-left: 4px solid ${d.warna || '#3b82f6'};" onclick="window.dompetkuNav('dompet')">
        <div class="chip-header">
          <span class="chip-name font-semibold">${escapeHtml(d.nama)}</span>
        </div>
        <div class="chip-balance font-heading">${formatSaldo(sld)}</div>
      </div>
    `;
  });

  html += `
        </div>
      </section>

      <!-- 3. INPUT CEPAT KALIMAT NATURAL (NLP) -->
      <section class="section-quick-input card mb-4">
        <div class="flex-between flex-align-center mb-2">
          <div class="flex-align-center gap-2">
            <span class="text-primary">${ICONS.sparkles}</span>
            <h2 class="section-title mb-0">Input Cepat Cerdas</h2>
          </div>
          <span class="badge-ai text-xs">AI Parser</span>
        </div>
        <p class="text-xs text-muted mb-2">
          Ketik kalimat bebas: <em>"makan siang 35rb gopay"</em>, <em>"gojek 18.500"</em>, <em>"tukin 5jt rek gaji"</em>, atau <em>"kemarin bensin 50rb"</em>
        </p>

        <div class="quick-input-bar">
          <input type="text" id="input-quick-teks" class="form-input" placeholder="Ketik transaksi kamu di sini..." autocomplete="off" />
          <button id="btn-parse-quick" class="btn-primary flex-align-center gap-1">
            ${ICONS.plus} Catat
          </button>
        </div>

        <!-- Preview Hasil Tebakan Parser -->
        <div id="quick-input-preview-card" class="quick-preview-card hidden mt-2 animate-fade-in"></div>
      </section>

      <!-- 4. TEMPLATE TRANSAKSI FAVORIT (1-TAP CHIPS) -->
      <section class="section-templates mb-4">
        <h2 class="section-title mb-2">Template Sekali Tap</h2>
        <div class="template-chips-scroll">
  `;

  semuaTemplate.forEach(tpl => {
    const dmp = dompetAktif.find(d => d.id === tpl.dompetId);
    const kat = kategoriMap[tpl.kategoriId];
    html += `
      <button class="template-chip-btn" data-tpl-id="${tpl.id}" title="${tpl.catatan || tpl.nama}">
        <span class="tpl-nama font-semibold">${escapeHtml(tpl.nama)}</span>
        <span class="tpl-nom">${formatRupiah(tpl.nominal)}</span>
        <span class="tpl-source text-xs text-muted">${dmp ? dmp.nama : ''}</span>
      </button>
    `;
  });

  html += `
        </div>
      </section>

      <!-- 5. INSIGHT OTOMATIS -->
      <section class="card-insight mb-4">
        <div class="flex-align-center gap-2 mb-1">
          <span class="insight-icon">${ICONS.sparkles}</span>
          <span class="text-xs font-bold uppercase tracking-wider text-primary">Insight Finansial</span>
        </div>
        <p class="text-sm insight-text font-medium">${escapeHtml(insights[0])}</p>
        ${insights.length > 1 ? `<p class="text-xs text-muted mt-1 border-t pt-1">${escapeHtml(insights[1])}</p>` : ''}
      </section>

      <!-- 6. ANGGARAN KRITIS -->
      <section class="section-critical-budget card mb-4">
        <div class="flex-between flex-align-center mb-2">
          <h2 class="section-title">Pagu Anggaran Kritis</h2>
          <button class="text-xs text-link" onclick="window.dompetkuNav('anggaran')">Kelola Pagu</button>
        </div>
  `;

  if (statusAnggaran.length === 0) {
    html += `<p class="text-xs text-muted py-2">Belum ada pagu bulanan yang diatur untuk bulan ini.</p>`;
  } else {
    statusAnggaran.forEach(item => {
      let progressColorClass = 'progress-green';
      if (item.persen >= 100) progressColorClass = 'progress-red';
      else if (item.persen >= 75) progressColorClass = 'progress-yellow';

      const barWidth = Math.min(item.persen, 100);

      html += `
        <div class="budget-item-compact mb-3">
          <div class="flex-between text-xs mb-1">
            <span class="font-semibold">${escapeHtml(item.nama)}</span>
            <span class="text-muted">${formatRupiah(item.realisasi)} / ${formatRupiah(item.pagu)} (${item.persen.toFixed(0)}%)</span>
          </div>
          <div class="progress-track">
            <div class="progress-bar ${progressColorClass}" style="width: ${barWidth}%;"></div>
          </div>
        </div>
      `;
    });
  }

  html += `
      </section>

      <!-- 7. TAGIHAN JATUH TEMPO & TARGET UTAMA ROW -->
      <div class="dashboard-grid-2col mb-4">
        <!-- Tagihan Terdekat -->
        <div class="card p-3">
          <div class="flex-between flex-align-center mb-2">
            <h2 class="section-title text-sm">Tagihan Segera</h2>
            <span class="text-xs text-muted">&lt; 7 Hari</span>
          </div>
  `;

  if (tagihanTerdekat.length === 0) {
    html += `<p class="text-xs text-muted py-2">Tidak ada tagihan yang jatuh tempo dalam waktu dekat. Semua aman!</p>`;
  } else {
    tagihanTerdekat.forEach(tag => {
      html += `
        <div class="tagihan-mini-item flex-between flex-align-center py-2 border-b">
          <div>
            <div class="text-xs font-semibold">${escapeHtml(tag.nama)}</div>
            <div class="text-xs text-muted">${formatTanggal(tag.tanggalJatuhTempo)} • ${formatRupiah(tag.nominal)}</div>
          </div>
          <button class="btn-sm btn-outline btn-bayar-tagihan" data-id="${tag.id}" data-nama="${escapeHtml(tag.nama)}" data-nominal="${tag.nominal}" data-kat="${tag.kategoriId}" data-dmp="${tag.dompetId}">
            Bayar
          </button>
        </div>
      `;
    });
  }

  html += `
        </div>

        <!-- Target Tabungan Utama -->
        <div class="card p-3">
          <div class="flex-between flex-align-center mb-2">
            <h2 class="section-title text-sm">Target Utama</h2>
            <button class="text-xs text-link" onclick="window.dompetkuNav('target')">Lihat</button>
          </div>
  `;

  if (!targetUtama) {
    html += `<p class="text-xs text-muted py-2">Belum ada target tabungan yang dibuat.</p>`;
  } else {
    const persenTerkumpul = Math.min(100, Math.round((targetUtama.terkumpul / targetUtama.targetNominal) * 100));
    html += `
      <div class="target-mini-card">
        <div class="text-xs font-semibold text-primary mb-1">${escapeHtml(targetUtama.nama)}</div>
        <div class="flex-between text-xs text-muted mb-1">
          <span>${formatRupiah(targetUtama.terkumpul)}</span>
          <span>${formatRupiah(targetUtama.targetNominal)} (${persenTerkumpul}%)</span>
        </div>
        <div class="progress-track mb-2">
          <div class="progress-bar progress-blue" style="width: ${persenTerkumpul}%;"></div>
        </div>
        <span class="text-xs text-muted">Tenggat: ${formatTanggal(targetUtama.tenggatWaktu)}</span>
      </div>
    `;
  }

  html += `
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Event Listeners Beranda
  // Toggle Privasi Saldo
  const btnPrivasi = container.querySelector('#btn-toggle-privasi');
  if (btnPrivasi) {
    btnPrivasi.addEventListener('click', () => {
      const current = localStorage.getItem('dompetku_sembunyikan_saldo') === 'true';
      localStorage.setItem('dompetku_sembunyikan_saldo', (!current).toString());
      renderBeranda(container);
    });
  }

  // Input Cepat NLP Parser
  const inputQuick = container.querySelector('#input-quick-teks');
  const btnParse = container.querySelector('#btn-parse-quick');
  const previewCard = container.querySelector('#quick-input-preview-card');

  let hasilParser = null;

  const updatePreview = () => {
    const teks = inputQuick.value;
    if (!teks.trim()) {
      previewCard.classList.add('hidden');
      hasilParser = null;
      return;
    }

    hasilParser = parseKalimatTransaksi(teks, dompetAktif, semuaKategori);
    if (!hasilParser || hasilParser.nominal === 0) {
      previewCard.classList.remove('hidden');
      previewCard.innerHTML = `
        <div class="preview-error text-xs text-warning">
          Sebutkan nominal uang (misal: 35rb, 50k, 18.500, atau 5jt).
        </div>
      `;
      return;
    }

    previewCard.classList.remove('hidden');
    previewCard.innerHTML = `
      <div class="preview-success">
        <div class="flex-between flex-align-center mb-1">
          <span class="text-xs font-bold text-primary">Pratinjau Hasil AI:</span>
          <span class="badge-jenis badge-${hasilParser.jenis}">${hasilParser.jenis}</span>
        </div>
        <div class="preview-summary text-sm font-semibold mb-2">
          ${escapeHtml(hasilParser.ringkasan)}
        </div>
        <div class="flex-align-center gap-2">
          <button id="btn-konfirmasi-quick" class="btn-sm btn-primary flex-1">
            Simpan Sekarang
          </button>
          <button id="btn-edit-quick" class="btn-sm btn-outline">
            Koreksi di Form
          </button>
        </div>
      </div>
    `;

    const btnKonfirmasi = previewCard.querySelector('#btn-konfirmasi-quick');
    if (btnKonfirmasi) {
      btnKonfirmasi.addEventListener('click', async () => {
        if (!hasilParser) return;
        const trxBaru = {
          id: `trx_${Date.now()}`,
          jenis: hasilParser.jenis,
          nominal: hasilParser.nominal,
          kategoriId: hasilParser.kategoriId,
          subkategori: hasilParser.subkategori,
          dompetId: hasilParser.dompetId,
          dompetTujuanId: hasilParser.dompetTujuanId,
          tanggal: hasilParser.tanggal,
          catatan: hasilParser.catatan,
          tag: '#inputcepat'
        };

        await put('transaksi', trxBaru);
        showToast('Transaksi berhasil disimpan via Input Cepat!', 'success');
        inputQuick.value = '';
        previewCard.classList.add('hidden');
        renderBeranda(container);
      });
    }

    const btnEdit = previewCard.querySelector('#btn-edit-quick');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => {
        if (window.bukaModalTransaksi) {
          window.bukaModalTransaksi(hasilParser);
        }
      });
    }
  };

  if (inputQuick) {
    inputQuick.addEventListener('input', updatePreview);
    inputQuick.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const btnKonfirmasi = previewCard.querySelector('#btn-konfirmasi-quick');
        if (btnKonfirmasi) btnKonfirmasi.click();
      }
    });
  }

  if (btnParse) {
    btnParse.addEventListener('click', () => {
      updatePreview();
      const btnKonfirmasi = previewCard.querySelector('#btn-konfirmasi-quick');
      if (btnKonfirmasi) btnKonfirmasi.click();
    });
  }

  // 1-Tap Template Chips
  const templateBtns = container.querySelectorAll('.template-chip-btn');
  templateBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const tplId = btn.getAttribute('data-tpl-id');
      const tpl = semuaTemplate.find(t => t.id === tplId);
      if (!tpl) return;

      const trxBaru = {
        id: `trx_${Date.now()}`,
        jenis: tpl.jenis || 'pengeluaran',
        nominal: Number(tpl.nominal),
        kategoriId: tpl.kategoriId,
        subkategori: tpl.subkategori || '',
        dompetId: tpl.dompetId,
        tanggal: new Date().toISOString(),
        catatan: tpl.catatan || tpl.nama,
        tag: tpl.tag || '#template'
      };

      await put('transaksi', trxBaru);
      showToast(`Transaksi "${tpl.nama}" tersimpan!`, 'success');
      renderBeranda(container);
    });
  });

  // Bayar Tagihan Cepat
  const btnsBayarTagihan = container.querySelectorAll('.btn-bayar-tagihan');
  btnsBayarTagihan.forEach(btn => {
    btn.addEventListener('click', async () => {
      const tagId = btn.getAttribute('data-id');
      const nama = btn.getAttribute('data-nama');
      const nominal = Number(btn.getAttribute('data-nominal'));
      const katId = btn.getAttribute('data-kat');
      const dmpId = btn.getAttribute('data-dmp');

      // Update status tagihan menjadi lunas
      const tagItem = semuaTagihan.find(t => t.id === tagId);
      if (tagItem) {
        tagItem.status = 'lunas';
        await put('tagihan', tagItem);
      }

      // Catat sebagai transaksi pengeluaran otomatis
      const trxBaru = {
        id: `trx_bayar_tagihan_${Date.now()}`,
        jenis: 'pengeluaran',
        nominal,
        kategoriId: katId || 'kat_tagihan',
        subkategori: 'Tagihan',
        dompetId: dmpId || 'wallet_bca',
        tanggal: new Date().toISOString(),
        catatan: `Pembayaran ${nama}`,
        tag: '#tagihan'
      };

      await put('transaksi', trxBaru);
      showToast(`Tagihan "${nama}" berhasil dilunasi & dicatat ke pengeluaran.`, 'success');
      renderBeranda(container);
    });
  });
}
