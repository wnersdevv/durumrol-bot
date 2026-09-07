'use strict';

/**
 * PresenceUpdate debounce sistemi. Aynı kullanıcı kısa sürede art arda
 * presence değiştirdiğinde her seferinde işlem yapmak yerine, son state'i
 * bir gecikmeyle ("debounceMs") işler. Ayrıca genel amaçlı komut cooldown'u
 * da bu modülden yönetilir.
 */
class CooldownManager {
  constructor() {
    this._debounceZamanlayicilari = new Map(); // anahtar -> { timeout, sonVeri }
    this._sonIslemZamani = new Map(); // anahtar -> epoch ms (basit cooldown için)
  }

  /**
   * Debounce: aynı anahtar için gelen art arda çağrılarda yalnızca en
   * son veriyle, gecikme sonunda bir kez fonksiyon çalıştırılır.
   */
  debounceEt(anahtar, veri, debounceMs, fonksiyon) {
    const mevcut = this._debounceZamanlayicilari.get(anahtar);
    if (mevcut) {
      clearTimeout(mevcut.timeout);
    }
    const timeout = setTimeout(() => {
      this._debounceZamanlayicilari.delete(anahtar);
      fonksiyon(veri);
    }, debounceMs);
    timeout.unref?.();
    this._debounceZamanlayicilari.set(anahtar, { timeout, sonVeri: veri });
  }

  /**
   * Basit cooldown kontrolü: anahtar için son işlemden bu yana
   * cooldownMs geçmediyse false döner (işlem engellenir).
   */
  cooldownGectiMi(anahtar, cooldownMs) {
    const simdi = Date.now();
    const son = this._sonIslemZamani.get(anahtar);
    if (son && simdi - son < cooldownMs) {
      return false;
    }
    this._sonIslemZamani.set(anahtar, simdi);
    return true;
  }

  kalanCooldownMs(anahtar, cooldownMs) {
    const son = this._sonIslemZamani.get(anahtar);
    if (!son) return 0;
    const kalan = cooldownMs - (Date.now() - son);
    return kalan > 0 ? kalan : 0;
  }

  temizle() {
    for (const { timeout } of this._debounceZamanlayicilari.values()) {
      clearTimeout(timeout);
    }
    this._debounceZamanlayicilari.clear();
    this._sonIslemZamani.clear();
  }
}

module.exports = new CooldownManager();
