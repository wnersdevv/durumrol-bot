'use strict';

const logger = require('../core/logger');
const { discordHatasiKaliciMi } = require('../core/errorHandler');

const ONCELIKLER = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'];
const MAKS_DENEME = 3;
const BASLANGIC_BACKOFF_MS = 1000;

/**
 * RoleActionQueue: Discord API rate limitlerine takılmamak için rol
 * ekleme/kaldırma işlemlerini önceliklendirerek, kontrollü aralıklarla
 * (intervalMs) ve sınırlı eşzamanlılıkla (maxConcurrent) işler.
 * Geçici hatalarda (rate limit, 5xx) exponential backoff ile retry yapar;
 * kalıcı hatalarda (permission/hierarchy) retry yapmaz.
 */
class RoleActionQueueService {
  constructor() {
    this._kuyruklar = { CRITICAL: [], HIGH: [], NORMAL: [], LOW: [] };
    this._calisanSayisi = 0;
    this._maxConcurrent = 3;
    this._intervalMs = 1200;
    this._zamanlayici = null;
    this._durduruldu = false;
  }

  yapilandir({ maxConcurrent, intervalMs } = {}) {
    if (maxConcurrent) this._maxConcurrent = maxConcurrent;
    if (intervalMs) this._intervalMs = intervalMs;
  }

  baslat() {
    if (this._zamanlayici) return;
    this._durduruldu = false;
    this._zamanlayici = setInterval(() => this._isleGoturmeyeCalis(), this._intervalMs);
    this._zamanlayici.unref?.();
  }

  /**
   * Kuyruğa iş ekler. gorev: async () => void — gerçek Discord API çağrısını içerir.
   * Döner: Promise<{ basarili, hata }>
   */
  ekle({ oncelik = 'NORMAL', gorev, aciklama = '' }) {
    if (!ONCELIKLER.includes(oncelik)) oncelik = 'NORMAL';
    return new Promise((resolve) => {
      this._kuyruklar[oncelik].push({ gorev, aciklama, deneme: 0, resolve });
    });
  }

  _sonrakiIsiAl() {
    for (const oncelik of ONCELIKLER) {
      if (this._kuyruklar[oncelik].length > 0) {
        return this._kuyruklar[oncelik].shift();
      }
    }
    return null;
  }

  async _isleGoturmeyeCalis() {
    if (this._durduruldu) return;
    while (this._calisanSayisi < this._maxConcurrent) {
      const is = this._sonrakiIsiAl();
      if (!is) return;
      this._calisanSayisi += 1;
      this._isiCalistir(is).finally(() => {
        this._calisanSayisi -= 1;
      });
    }
  }

  async _isiCalistir(is) {
    try {
      await is.gorev();
      is.resolve({ basarili: true });
    } catch (hata) {
      is.deneme += 1;
      const kalici = discordHatasiKaliciMi(hata);
      if (kalici || is.deneme >= MAKS_DENEME) {
        logger.hata(`Kuyruk işi kalıcı olarak başarısız oldu: ${is.aciklama}`, hata);
        is.resolve({ basarili: false, hata: hata.message, kalici });
        return;
      }
      const backoffMs = BASLANGIC_BACKOFF_MS * 2 ** (is.deneme - 1);
      logger.uyari(`Kuyruk işi geçici hata aldı, ${backoffMs}ms sonra tekrar denenecek: ${is.aciklama}`);
      setTimeout(() => {
        this._kuyruklar.HIGH.push(is);
      }, backoffMs).unref?.();
    }
  }

  toplamUzunluk() {
    return ONCELIKLER.reduce((toplam, o) => toplam + this._kuyruklar[o].length, 0);
  }

  durdur() {
    this._durduruldu = true;
    if (this._zamanlayici) {
      clearInterval(this._zamanlayici);
      this._zamanlayici = null;
    }
  }

  temizle() {
    for (const oncelik of ONCELIKLER) {
      for (const is of this._kuyruklar[oncelik]) {
        is.resolve({ basarili: false, hata: 'Kuyruk kapatıldığı için işlem iptal edildi.' });
      }
      this._kuyruklar[oncelik] = [];
    }
  }
}

module.exports = new RoleActionQueueService();
