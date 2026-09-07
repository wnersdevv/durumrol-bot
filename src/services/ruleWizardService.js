'use strict';

/**
 * Kural Ekleme Wizard'ının adım adım topladığı geçici veriyi bellekte tutar.
 * Kalıcı değildir; kullanıcı wizard'ı bitirmeden bot yeniden başlarsa
 * wizard verisi kaybolur (bu kabul edilebilir, çünkü henüz DB'ye yazılmadı).
 * 10 dakika işlem yapılmazsa otomatik temizlenir (memory leak önleme).
 */
const TIMEOUT_MS = 10 * 60 * 1000;

class RuleWizardService {
  constructor() {
    this._durumlar = new Map(); // anahtar: guildId:userId -> { veri, zamanlayici }
  }

  _anahtar(guildId, userId) {
    return `${guildId}:${userId}`;
  }

  baslat(guildId, userId, mevcutKural = null) {
    const anahtar = this._anahtar(guildId, userId);
    this._eskiyiTemizle(anahtar);
    const veri = mevcutKural
      ? {
          adim: 1, editingRuleId: mevcutKural._id.toString(), name: mevcutKural.name, roleId: mevcutKural.roleId,
          action: mevcutKural.action, priority: mevcutKural.priority,
          conditionType: mevcutKural.conditions?.type || null, conditionValue: mevcutKural.conditions?.value || null,
          removeWhenFalse: mevcutKural.removeWhenFalse, notificationEnabled: Boolean(mevcutKural.notification?.enabled),
          enabled: mevcutKural.enabled
        }
      : { adim: 1, editingRuleId: null, name: null, roleId: null, action: 'ADD', priority: 0, conditionType: null, conditionOperator: null, conditionValue: null, removeWhenFalse: true, notificationEnabled: false, enabled: true };
    const zamanlayici = setTimeout(() => this._durumlar.delete(anahtar), TIMEOUT_MS);
    zamanlayici.unref?.();
    this._durumlar.set(anahtar, { veri, zamanlayici });
    return veri;
  }

  _eskiyiTemizle(anahtar) {
    const mevcut = this._durumlar.get(anahtar);
    if (mevcut) clearTimeout(mevcut.zamanlayici);
  }

  getir(guildId, userId) {
    return this._durumlar.get(this._anahtar(guildId, userId))?.veri || null;
  }

  guncelle(guildId, userId, kismiVeri) {
    const anahtar = this._anahtar(guildId, userId);
    const mevcut = this._durumlar.get(anahtar);
    if (!mevcut) return null;
    Object.assign(mevcut.veri, kismiVeri);
    clearTimeout(mevcut.zamanlayici);
    mevcut.zamanlayici = setTimeout(() => this._durumlar.delete(anahtar), TIMEOUT_MS);
    mevcut.zamanlayici.unref?.();
    return mevcut.veri;
  }

  iptalEt(guildId, userId) {
    const anahtar = this._anahtar(guildId, userId);
    this._eskiyiTemizle(anahtar);
    this._durumlar.delete(anahtar);
  }
}

module.exports = new RuleWizardService();
