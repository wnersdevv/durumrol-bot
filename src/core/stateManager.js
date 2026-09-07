'use strict';

const logger = require('./logger');

/**
 * Botun tüm çalışma zamanı (runtime) durumunu tutan tekil (singleton) merkez.
 * Kill switch, SAFE MODE, sağlık bilgisi ve anomaly sayaçları burada tutulur.
 * Bu veriler kalıcı değildir (process bazlı); kalıcı ayarlar GuildSettings'te.
 */
class StateManager {
  constructor() {
    this.baslangicZamani = Date.now();
    this.discordHazir = false;
    this.mongoBagli = false;

    // Global (tüm sistem geneli) kill switch'ler - OWNER tarafından ayarlanır
    this.killSwitch = {
      otomatikRolEkleme: false,
      otomatikRolKaldirma: false,
      presenceIsleme: false,
      reconciliation: false,
      bildirimler: false
    };

    // Guild bazlı SAFE MODE: belirsizlik/anomaly durumunda otomatik devreye girer
    this._safeModeGuildler = new Map(); // guildId -> { sebep, zaman }

    this.sonRolIslemi = null; // { guildId, userId, roleId, action, zaman }
    this.sonHata = null; // { mesaj, zaman }

    // Anomaly tespiti için kayan pencere sayaçları: guildId -> timestamp[]
    this._islemZamanDamgalari = new Map();
  }

  hazirBildir() {
    this.discordHazir = true;
  }

  mongoDurumunuAyarla(bagli) {
    this.mongoBagli = bagli;
  }

  killSwitchAyarla(anahtar, deger) {
    if (!(anahtar in this.killSwitch)) {
      throw new Error(`Bilinmeyen kill switch anahtarı: ${anahtar}`);
    }
    this.killSwitch[anahtar] = Boolean(deger);
    logger.sistem(`Kill switch güncellendi: ${anahtar} = ${deger}`);
  }

  killSwitchDurumu() {
    return { ...this.killSwitch };
  }

  safeModeAc(guildId, sebep) {
    this._safeModeGuildler.set(guildId, { sebep, zaman: Date.now() });
    logger.uyari(`SAFE MODE etkinleştirildi: guild=${guildId} sebep=${sebep}`);
  }

  safeModeKapat(guildId) {
    this._safeModeGuildler.delete(guildId);
    logger.sistem(`SAFE MODE devre dışı bırakıldı: guild=${guildId}`);
  }

  safeModeAktifMi(guildId) {
    return this._safeModeGuildler.has(guildId);
  }

  safeModeBilgisi(guildId) {
    return this._safeModeGuildler.get(guildId) || null;
  }

  rolIslemiKaydet({ guildId, userId, roleId, action }) {
    this.sonRolIslemi = { guildId, userId, roleId, action, zaman: Date.now() };
    this._islemZamanDamgaEkle(guildId);
  }

  hataKaydet(mesaj) {
    this.sonHata = { mesaj, zaman: Date.now() };
  }

  _islemZamanDamgaEkle(guildId) {
    const liste = this._islemZamanDamgalari.get(guildId) || [];
    liste.push(Date.now());
    this._islemZamanDamgalari.set(guildId, liste);
  }

  /**
   * Belirtilen pencere içindeki (saniye) işlem sayısını döner ve
   * eski kayıtları temizler (memory leak önleme).
   */
  pencereIcindekiIslemSayisi(guildId, pencereSaniye) {
    const simdi = Date.now();
    const esikZaman = simdi - pencereSaniye * 1000;
    const liste = (this._islemZamanDamgalari.get(guildId) || []).filter((t) => t >= esikZaman);
    this._islemZamanDamgalari.set(guildId, liste);
    return liste.length;
  }

  uptimeSaniye() {
    return Math.floor((Date.now() - this.baslangicZamani) / 1000);
  }

  temizle() {
    this._islemZamanDamgalari.clear();
    this._safeModeGuildler.clear();
  }
}

module.exports = new StateManager();
