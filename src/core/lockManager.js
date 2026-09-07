'use strict';

/**
 * Aynı kullanıcı için eş zamanlı iki role-sync çalışmasını, aynı guild için
 * eş zamanlı iki reconciliation job'unu engelleyen basit mutex sistemi.
 * Promise tabanlı kuyruklama yapar: kilit doluysa bir sonraki istek,
 * öncekinin bitmesini bekler (deadlock oluşturmaz, sırayla işler).
 */
class LockManager {
  constructor() {
    this._kilitler = new Map(); // anahtar -> Promise zinciri
  }

  /**
   * Belirtilen anahtar için kilidi alır, fonksiyonu çalıştırır ve kilidi
   * bırakır. Aynı anahtarla eşzamanlı çağrılar sıraya girer.
   */
  async kilitle(anahtar, fonksiyon) {
    const oncekiZincir = this._kilitler.get(anahtar) || Promise.resolve();
    let cozBu;
    const buGorev = new Promise((resolve) => {
      cozBu = resolve;
    });
    this._kilitler.set(anahtar, oncekiZincir.then(() => buGorev));

    await oncekiZincir.catch(() => {});
    try {
      return await fonksiyon();
    } finally {
      cozBu();
      if (this._kilitler.get(anahtar) === undefined) return;
      // Kuyrukta başka iş kalmadıysa haritayı temizle (leak önleme)
      const guncel = this._kilitler.get(anahtar);
      guncel.then(() => {
        if (this._kilitler.get(anahtar) === guncel) {
          this._kilitler.delete(anahtar);
        }
      });
    }
  }

  meşgulMü(anahtar) {
    return this._kilitler.has(anahtar);
  }
}

module.exports = new LockManager();
