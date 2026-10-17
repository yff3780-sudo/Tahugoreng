/**
 * DompetKu - Halaman Laporan & Analitik Finansial
 * Visualisasi Donut drill-down subkategori, Bar chart komparasi 12 bulan,
 * Line chart tren kekayaan bersih, Heatmap kalender harian, dan metrik rasio tabungan.
 */

import { getAll, hitungSaldoSemuaDompet } from '../db.js';
import { formatRupiah, formatCompactRupiah, showToast, ICONS, escapeHtml } from '../utils.js';
import { renderChartDonutKategori, renderChartPemasukanPengeluaran, renderChartTrenKekayaan, renderHeatmapKalender } from '../charts.js';

let statePeriodeLaporan = 'bulan_ini';
let selectedKategoriDrillDown = null;

export async function renderLaporan(container) {
  const [semuaTransaksi, semuaKategori, saldoMap, sembunyikanSaldo] = await Promise.all([
    getAll('transaksi'),
    getAll('kategori'),
    hitungSaldoSemuaDompet(),
    localStorage.getItem('dompetku_sembunyikan_saldo') === 'true'
  ]);

  const kategoriMap = {};
  semuaKategori.forEach(k => { kategoriMap[k.id] = k; });

  const sekarang = new Date();
  const formatSaldo = (nominal) => sembunyikanSaldo ? '••••••••' : formatRupiah(nominal);

  const transaksiPeriode = semuaTransaksi.filter(trx => {
    const tgl = new Date(trx.tanggal);
    if (statePeriodeLaporan === 'bulan_ini') {
      return tgl.getMonth() === sekarang.getMonth() && tgl.getFullYear() === sekarang.getFullYear();
    }
    if (statePeriodeLaporan === 'bulan_lalu') {
      const blnLalu = sekarang.getMonth() === 0 ? 11 : sekarang.getMonth() - 1;
      const thnLalu = sekarang.getMonth() === 0 ? sekarang.getFullYear() - 1 : sekarang.getFullYear();
      return tgl.getMonth() === blnLalu && tgl.getFullYear() === thnLalu;
    }
    if (statePeriodeLaporan === '3_bulan') {
      const tigaBulanLalu = new Date(sekarang.getTime() - 90 * 24 * 60 * 60 * 1000);
      return tgl >= tigaBulanLalu;
    }
    if (statePeriodeLaporan === 'tahun_ini') {
      return tgl.getFullYear() === sekarang.getFullYear();
    }
    return true;
  });

  let totalMasuk = 0;
  let totalKeluar = 0;
  const pengeluaranPerKategoriMap = {};
  const subkategoriMap = {};
  const pengeluaranHarianMap = {};

  transaksiPeriode.forEach(t => {
    const nominal = Number(t.nominal) || 0;
    const isoDate = t.tanggal.split('T')[0];

    if (t.jenis === 'pemasukan') {
      totalMasuk += nominal;
    } else if (t.jenis === 'pengeluaran') {
      totalKeluar += nominal;
      pengeluaranHarianMap[isoDate] = (pengeluaranHarianMap[isoDate] || 0) + nominal;
      pengeluaranPerKategoriMap[t.kategoriId] = (pengeluaranPerKategoriMap[t.kategoriId] || 0) + nominal;

      if (!subkategoriMap[t.kategoriId]) subkategoriMap[t.kategoriId] = {};
      const subNama = t.subkategori || 'Lain-lain';
      subkategoriMap[t.kategoriId][subNama] = (subkategoriMap[t.kategoriId][subNama] || 0) + nominal;
    }
  });

  const sisaBersih = totalMasuk - totalKeluar;
  const rasioTabungan = totalMasuk > 0 ? Math.round((sisaBersih / totalMasuk) * 100) : 0;

  const dataDonutKategori = Object.entries(pengeluaranPerKategoriMap).map(([katId, total]) => {
    const kat = kategoriMap[katId] || { nama: 'Lainnya', warna: '#64748b' };
    return {
      id: katId,
      nama: kat.nama,
      total,
      warna: kat.warna
    };
  }).sort((a, b) => b.total - a.total);

  const data12Bulan = [];
  const namaBulanSingkat = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const pengeluaranPerBulanIndex = {};

  for (let i = 11; i >= 0; i--) {
    const d = new Date(sekarang.getFullYear(), sekarang.getMonth() - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const key = `${y}-${m}`;

    let inBulan = 0;
    let outBulan = 0;

    semuaTransaksi.forEach(t => {
      const tglTrx = new Date(t.tanggal);
      if (tglTrx.getMonth() === m && tglTrx.getFullYear() === y) {
        if (t.jenis === 'pemasukan') inBulan += Number(t.nominal) || 0;
        if (t.jenis === 'pengeluaran') outBulan += Number(t.nominal) || 0;
      }
    });

    pengeluaranPerBulanIndex[key] = { label: `${namaBulanSingkat[m]} ${y}`, total: outBulan };

    data12Bulan.push({
      bulanLabel: `${namaBulanSingkat[m]}`,
      pemasukan: inBulan,
      pengeluaran: outBulan
    });
  }

  const bulanAdaTransaksi = Object.values(pengeluaranPerBulanIndex).filter(b => b.total > 0);
  bulanAdaTransaksi.sort((a, b) => a.total - b.total);
  const bulanPalingHemat = bulanAdaTransaksi[0] || { label: '-', total: 0 };
  const bulanPalingBoros = bulanAdaTransaksi[bulanAdaTransaksi.length - 1] || { label: '-', total: 0 };

  let saldoKumulatifSekarang = 0;
  Object.values(saldoMap).forEach(s => {
    if (!s.dompet.diarsipkan) saldoKumulatifSekarang += s.saldoAkhir;
  });

  const dataTrenKekayaan = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(sekarang.getFullYear(), sekarang.getMonth() - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();

    let selisihSejakBulanItu = 0;
    semuaTransaksi.forEach(t => {
      const tDate = new Date(t.tanggal);
      if (tDate >= d) {
        if (t.jenis === 'pemasukan') selisihSejakBulanItu += Number(t.nominal) || 0;
        if (t.jenis === 'pengeluaran') selisihSejakBulanItu -= Number(t.nominal) || 0;
      }
    });

    const saldoBulanItu = Math.max(0, saldoKumulatifSekarang - selisihSejakBulanItu);
    dataTrenKekayaan.push({
      label: `${namaBulanSingkat[m]} ${y}`,
      total: saldoBulanItu
    });
  }

  const dataHarianList = Object.entries(pengeluaranHarianMap).map(([tanggal, total]) => ({ tanggal, total }));

  let html = `
    <div class="laporan-page animate-fade-in">
      <div class="laporan-header-card">
        <div class="flex-between flex-wrap gap-2 mb-3">
          <div>
            <h1 class="page-title">Laporan & Analisis Finansial</h1>
            <span class="text-xs text-muted">Statistik visual mendalam arus kas, komposisi pengeluaran, dan tren</span>
          </div>

          <div class="periode-pills-row">
            <button class="btn-periode-pill ${statePeriodeLaporan === 'bulan_ini' ? 'active' : ''}" data-periode="bulan_ini">Bulan Ini</button>
            <button class="btn-periode-pill ${statePeriodeLaporan === 'bulan_lalu' ? 'active' : ''}" data-periode="bulan_lalu">Bulan Lalu</button>
            <button class="btn-periode-pill ${statePeriodeLaporan === '3_bulan' ? 'active' : ''}" data-periode="3_bulan">3 Bulan</button>
            <button class="btn-periode-pill ${statePeriodeLaporan === 'tahun_ini' ? 'active' : ''}" data-periode="tahun_ini">Tahun Ini</button>
          </div>
        </div>

        <div class="laporan-stats-row">
          <div class="lap-stat-card in">
            <span class="text-xs text-muted">Total Pemasukan</span>
            <div class="font-bold text-base text-success">${formatSaldo(totalMasuk)}</div>
          </div>
          <div class="lap-stat-card out">
            <span class="text-xs text-muted">Total Pengeluaran</span>
            <div class="font-bold text-base text-danger">${formatSaldo(totalKeluar)}</div>
          </div>
          <div class="lap-stat-card ${rasioTabungan >= 20 ? 'green' : (rasioTabungan > 0 ? 'yellow' : 'red')}">
            <span class="text-xs text-muted">Rasio Tabungan</span>
            <div class="font-bold text-base">${rasioTabungan}% (${formatSaldo(sisaBersih)})</div>
          </div>
        </div>
      </div>

      <div class="laporan-grid-2col">
        <section class="card-chart-box">
          <div class="section-header mb-2">
            <div>
              <h2 class="section-title">Komposisi Pengeluaran</h2>
              <span class="text-xs text-muted">Klik bagian donat untuk melihat rincian subkategori</span>
            </div>
            ${selectedKategoriDrillDown ? `
              <button id="btn-reset-drilldown" class="btn-secondary-compact">Kembali ke Semua</button>
            ` : ''}
          </div>

          <div class="chart-canvas-wrapper donut-wrap">
            <canvas id="chart-donut-kategori"></canvas>
          </div>

          <div id="drilldown-subkategori-panel" class="drilldown-panel ${selectedKategoriDrillDown ? '' : 'hidden'}">
            ${selectedKategoriDrillDown ? `
              <div class="drilldown-header">
                <span class="font-semibold text-xs">Rincian Subkategori: ${escapeHtml(selectedKategoriDrillDown.nama)}</span>
                <span class="text-xs font-bold text-danger">${formatRupiah(selectedKategoriDrillDown.total)}</span>
              </div>
              <div class="drilldown-list mt-2">
                ${Object.entries(subkategoriMap[selectedKategoriDrillDown.id] || {}).map(([subNama, subTotal]) => `
                  <div class="flex-between text-xs py-1 border-b">
                    <span>${escapeHtml(subNama)}</span>
                    <strong>${formatRupiah(subTotal)}</strong>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </section>

        <section class="card-chart-box">
          <div class="section-header mb-2">
            <div>
              <h2 class="section-title">Pemasukan vs Pengeluaran</h2>
              <span class="text-xs text-muted">Tren 12 bulan terakhir</span>
            </div>
          </div>
          <div class="chart-canvas-wrapper bar-wrap">
            <canvas id="chart-batang-12bulan"></canvas>
          </div>
        </section>
      </div>

      <div class="laporan-grid-2col mt-4">
        <section class="card-chart-box">
          <div class="section-header mb-2">
            <div>
              <h2 class="section-title">Tren Pertumbuhan Kekayaan Bersih</h2>
              <span class="text-xs text-muted">Evaluasi akumulasi aset finansial</span>
            </div>
          </div>
          <div class="chart-canvas-wrapper line-wrap">
            <canvas id="chart-tren-kekayaan"></canvas>
          </div>
        </section>

        <section class="card-chart-box">
          <div class="section-header mb-2">
            <div>
              <h2 class="section-title">Heatmap Pengeluaran Harian</h2>
              <span class="text-xs text-muted">Intensitas belanja 30 hari terakhir</span>
            </div>
          </div>
          <div id="heatmap-kalender-container" class="mt-2"></div>
        </section>
      </div>

      <section class="card-ringkasan-tahunan mt-4">
        <h2 class="section-title mb-3">Laporan Tahunan Cepat</h2>
        <div class="tahunan-stat-grid">
          <div class="tahunan-stat-box hemat">
            <div class="tahunan-icon">${ICONS.centang}</div>
            <div>
              <span class="text-xs text-muted">Bulan Paling Hemat:</span>
              <div class="font-bold text-sm">${bulanPalingHemat.label}</div>
              <span class="text-xs text-success">${formatSaldo(bulanPalingHemat.total)}</span>
            </div>
          </div>

          <div class="tahunan-stat-box boros">
            <div class="tahunan-icon">${ICONS.kilat}</div>
            <div>
              <span class="text-xs text-muted">Bulan Paling Boros:</span>
              <div class="font-bold text-sm">${bulanPalingBoros.label}</div>
              <span class="text-xs text-danger">${formatSaldo(bulanPalingBoros.total)}</span>
            </div>
          </div>

          <div class="tahunan-stat-box rata">
            <div class="tahunan-icon">${ICONS.anggaran}</div>
            <div>
              <span class="text-xs text-muted">Rata-rata Pengeluaran Bulanan:</span>
              <div class="font-bold text-sm">
                ${formatSaldo(bulanAdaTransaksi.length > 0 ? (bulanAdaTransaksi.reduce((a, b) => a + b.total, 0) / bulanAdaTransaksi.length) : 0)}
              </div>
              <span class="text-xs text-muted">Dari ${bulanAdaTransaksi.length} bulan tercatat</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;

  container.innerHTML = html;

  setTimeout(() => {
    renderChartDonutKategori('chart-donut-kategori', dataDonutKategori, (itemKategori) => {
      selectedKategoriDrillDown = itemKategori;
      renderLaporan(container);
    });

    renderChartPemasukanPengeluaran('chart-batang-12bulan', data12Bulan);
    renderChartTrenKekayaan('chart-tren-kekayaan', dataTrenKekayaan);
    renderHeatmapKalender('heatmap-kalender-container', dataHarianList);
  }, 50);

  setupLaporanEvents(container);
}

function setupLaporanEvents(container) {
  container.querySelectorAll('.btn-periode-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      statePeriodeLaporan = btn.dataset.periode;
      selectedKategoriDrillDown = null;
      renderLaporan(container);
    });
  });

  container.querySelector('#btn-reset-drilldown')?.addEventListener('click', () => {
    selectedKategoriDrillDown = null;
    renderLaporan(container);
  });
}
