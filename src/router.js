/**
 * DompetKu - Router Halaman Tunggal (SPA)
 * Mengatur pergantian view halaman secara dinamis tanpa reload halaman
 */

import { renderBeranda } from './pages/beranda.js';
import { renderTransaksi } from './pages/transaksi.js';
import { renderAnggaran } from './pages/anggaran.js';
import { renderDompet } from './pages/dompet.js';
import { renderTarget } from './pages/target.js';
import { renderAcara } from './pages/acara.js';
import { renderLaporan } from './pages/laporan.js';
import { renderPengaturan } from './pages/pengaturan.js';

const ROUTES = {
  beranda: renderBeranda,
  transaksi: renderTransaksi,
  anggaran: renderAnggaran,
  dompet: renderDompet,
  target: renderTarget,
  acara: renderAcara,
  laporan: renderLaporan,
  pengaturan: renderPengaturan
};

let halamanAktif = 'beranda';

export function getHalamanAktif() {
  return halamanAktif;
}

export async function navigateTo(namaHalaman) {
  const target = ROUTES[namaHalaman] ? namaHalaman : 'beranda';
  halamanAktif = target;

  const mainContainer = document.getElementById('main-content');
  if (!mainContainer) return;

  document.querySelectorAll('[data-route]').forEach(el => {
    if (el.dataset.route === target) {
      el.classList.add('nav-active');
    } else {
      el.classList.remove('nav-active');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  const renderFn = ROUTES[target];
  await renderFn(mainContainer);

  window.location.hash = `#/${target}`;
}

export function initRouter() {
  const hash = window.location.hash.replace('#/', '');
  if (hash && ROUTES[hash]) {
    navigateTo(hash);
  } else {
    navigateTo('beranda');
  }

  window.addEventListener('hashchange', () => {
    const curHash = window.location.hash.replace('#/', '');
    if (curHash && ROUTES[curHash] && curHash !== halamanAktif) {
      navigateTo(curHash);
    }
  });

  document.addEventListener('click', (e) => {
    const routeTrigger = e.target.closest('[data-route]');
    if (routeTrigger) {
      const page = routeTrigger.dataset.route;
      if (page) {
        e.preventDefault();
        navigateTo(page);
      }
    }
  });
}
