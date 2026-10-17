/**
 * DompetKu - Visualisasi Grafik & Analitik (Chart.js & Custom Heatmap)
 * Menampilkan:
 * 1. Donut chart pengeluaran per kategori (interaktif dengan drill-down subkategori)
 * 2. Bar chart pemasukan vs pengeluaran 12 bulan terakhir
 * 3. Line chart tren evolusi kekayaan bersih (Net Worth)
 * 4. Heatmap kalender harian ala GitHub aktivitas
 */

import { formatRupiah, formatCompactRupiah, escapeHtml } from './utils.js';

const chartInstances = {};

function hancurkanChartLama(canvasId) {
  if (chartInstances[canvasId]) {
    try {
      chartInstances[canvasId].destroy();
    } catch (e) {
      console.warn('Gagal destroy chart lama:', e);
    }
    delete chartInstances[canvasId];
  }
}

// 1. Donut Chart Pengeluaran per Kategori
export function renderChartDonutKategori(canvasId, categoryData, onCategoryClick = null) {
  hancurkanChartLama(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return;

  if (!categoryData || categoryData.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const labels = categoryData.map(d => d.nama);
  const data = categoryData.map(d => d.total);
  const bgColors = categoryData.map(d => d.warna || '#3b82f6');

  const chart = new window.Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: bgColors,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const persen = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return ` ${context.label}: ${formatRupiah(val)} (${persen}%)`;
            }
          }
        }
      },
      onClick: (evt, elements) => {
        if (elements.length > 0 && onCategoryClick) {
          const index = elements[0].index;
          onCategoryClick(categoryData[index]);
        }
      }
    }
  });

  chartInstances[canvasId] = chart;
}

// 2. Bar Chart Pemasukan vs Pengeluaran 12 Bulan Terakhir
export function renderChartPemasukanPengeluaran(canvasId, monthlyData) {
  hancurkanChartLama(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return;

  const labels = monthlyData.map(d => d.label);
  const dataPemasukan = monthlyData.map(d => d.pemasukan);
  const dataPengeluaran = monthlyData.map(d => d.pengeluaran);

  const chart = new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Pemasukan',
          data: dataPemasukan,
          backgroundColor: '#10b981',
          borderRadius: 6,
          barPercentage: 0.7,
          categoryPercentage: 0.8
        },
        {
          label: 'Pengeluaran',
          data: dataPengeluaran,
          backgroundColor: '#ef4444',
          borderRadius: 6,
          barPercentage: 0.7,
          categoryPercentage: 0.8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Plus Jakarta Sans', size: 11 },
            callback: (val) => formatCompactRupiah(val)
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#94a3b8',
            boxWidth: 12,
            font: { family: 'Plus Jakarta Sans', size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatRupiah(ctx.raw)}`
          }
        }
      }
    }
  });

  chartInstances[canvasId] = chart;
}

// 3. Line Chart Tren Kekayaan Bersih
export function renderChartTrenKekayaan(canvasId, wealthTrendData) {
  hancurkanChartLama(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return;

  const labels = wealthTrendData.map(d => d.label);
  const data = wealthTrendData.map(d => d.nilai);

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
  gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

  const chart = new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Kekayaan Bersih',
        data,
        borderColor: '#3b82f6',
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointBackgroundColor: '#3b82f6',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Plus Jakarta Sans', size: 11 },
            callback: (val) => formatCompactRupiah(val)
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Kekayaan Bersih: ${formatRupiah(ctx.raw)}`
          }
        }
      }
    }
  });

  chartInstances[canvasId] = chart;
}

// 4. Heatmap Kalender Harian Ala Aktivitas GitHub
export function renderHeatmapKalender(containerId, dailyExpenseMap = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Siapkan rentang 30 hari ke belakang
  const sekarang = new Date();
  const days = [];
  let maxPengeluaran = 100000;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(sekarang);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const total = dailyExpenseMap[dateStr] || 0;
    if (total > maxPengeluaran) maxPengeluaran = total;

    days.push({
      dateStr,
      tanggal: d.getDate(),
      hari: d.toLocaleDateString('id-ID', { weekday: 'short' }),
      total
    });
  }

  let html = `<div class="heatmap-grid">`;
  days.forEach(day => {
    let level = 0;
    if (day.total > 0) {
      const ratio = day.total / maxPengeluaran;
      if (ratio > 0.75) level = 4;
      else if (ratio > 0.45) level = 3;
      else if (ratio > 0.20) level = 2;
      else level = 1;
    }

    const titleTooltip = `${day.dateStr}: ${formatRupiah(day.total)}`;
    html += `
      <div class="heatmap-cell level-${level}" title="${escapeHtml(titleTooltip)}">
        <span class="heatmap-date">${day.tanggal}</span>
      </div>
    `;
  });
  html += `</div>`;

  html += `
    <div class="heatmap-legend mt-2">
      <span class="text-xs text-muted">Sedikit</span>
      <div class="heatmap-legend-dots">
        <span class="heatmap-cell level-0"></span>
        <span class="heatmap-cell level-1"></span>
        <span class="heatmap-cell level-2"></span>
        <span class="heatmap-cell level-3"></span>
        <span class="heatmap-cell level-4"></span>
      </div>
      <span class="text-xs text-muted">Banyak</span>
    </div>
  `;

  container.innerHTML = html;
}
