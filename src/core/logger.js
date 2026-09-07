'use strict';

const RENKLER = {
  reset: '\x1b[0m',
  gri: '\x1b[90m',
  mavi: '\x1b[34m',
  sari: '\x1b[33m',
  kirmizi: '\x1b[31m',
  yesil: '\x1b[32m',
  mor: '\x1b[35m'
};

function zamanDamgasi() {
  return new Date().toISOString();
}

function formatEt(seviye, renk, mesaj, meta) {
  const parcalar = [`${RENKLER.gri}[${zamanDamgasi()}]${RENKLER.reset}`, `${renk}[${seviye}]${RENKLER.reset}`, mesaj];
  const satir = parcalar.join(' ');
  if (meta !== undefined) {
    try {
      return `${satir} ${typeof meta === 'string' ? meta : JSON.stringify(meta)}`;
    } catch (_hata) {
      return `${satir} [meta serileştirilemedi]`;
    }
  }
  return satir;
}

let debugAktif = false;

const logger = {
  debugModunuAyarla(aktif) {
    debugAktif = !!aktif;
  },
  bilgi(mesaj, meta) {
    console.log(formatEt('BİLGİ', RENKLER.mavi, mesaj, meta));
  },
  basari(mesaj, meta) {
    console.log(formatEt('BAŞARILI', RENKLER.yesil, mesaj, meta));
  },
  uyari(mesaj, meta) {
    console.warn(formatEt('UYARI', RENKLER.sari, mesaj, meta));
  },
  hata(mesaj, hataNesnesi) {
    const meta = hataNesnesi instanceof Error
      ? { mesaj: hataNesnesi.message, stack: hataNesnesi.stack }
      : hataNesnesi;
    console.error(formatEt('HATA', RENKLER.kirmizi, mesaj, meta));
  },
  sistem(mesaj, meta) {
    console.log(formatEt('SİSTEM', RENKLER.mor, mesaj, meta));
  },
  debug(mesaj, meta) {
    if (!debugAktif) return;
    console.log(formatEt('DEBUG', RENKLER.gri, mesaj, meta));
  }
};

module.exports = logger;
