'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const CONFIG_YOLU = path.join(process.cwd(), 'ayarlar.json');

const VARSAYILAN_QUEUE = { maxConcurrent: 3, intervalMs: 1200, batchSize: 25 };
const VARSAYILAN_RECONCILIATION = { enabled: true, intervalMinutes: 30 };
const VARSAYILAN_ANOMALY = { enabled: true, windowSeconds: 60, maxActionsPerWindow: 150 };
const VARSAYILAN_CACHE = { guildSettingsTtlMs: 60000, rulesTtlMs: 60000, roleMetadataTtlMs: 300000 };

class ConfigDogrulamaHatasi extends Error {
  constructor(hatalar) {
    super('Config doğrulama hatası');
    this.name = 'ConfigDogrulamaHatasi';
    this.hatalar = hatalar;
  }
}

/**
 * Ham config nesnesini doğrular. Botu çökertmez, hataları Türkçe olarak toplar.
 * @returns {{ gecerli: boolean, hatalar: string[], uyarilar: string[] }}
 */
function configDogrula(ham) {
  const hatalar = [];
  const uyarilar = [];

  if (!ham || typeof ham !== 'object') {
    hatalar.push('ayarlar.json geçerli bir JSON nesnesi değil.');
    return { gecerli: false, hatalar, uyarilar };
  }

  if (!ham.token || typeof ham.token !== 'string' || ham.token.trim().length === 0) {
    uyarilar.push('token boş: bot UNCONFIGURED modda başlayacak, Discord\'a bağlanamayacak.');
  }
  if (!ham.clientId || typeof ham.clientId !== 'string' || ham.clientId.trim().length === 0) {
    uyarilar.push('clientId boş: slash komutları kayıt edilemeyecek.');
  }
  if (!ham.mongoUri || typeof ham.mongoUri !== 'string' || ham.mongoUri.trim().length === 0) {
    uyarilar.push('mongoUri boş: veritabanı bağlantısı kurulamayacak, sistem DEVRE DIŞI modda çalışacak.');
  }
  if (!Array.isArray(ham.ownerIds) || ham.ownerIds.length === 0) {
    uyarilar.push('ownerIds boş: OWNER seviyesi komutlar (kill-switch vb.) hiç kimse tarafından kullanılamayacak.');
  }

  if (ham.statusRoles && typeof ham.statusRoles !== 'object') {
    hatalar.push('statusRoles bir nesne olmalı.');
  } else if (ham.statusRoles) {
    const platformlar = ham.statusRoles.platforms;
    if (platformlar && typeof platformlar !== 'object') {
      hatalar.push('statusRoles.platforms bir nesne olmalı.');
    }
    if (ham.statusRoles.cooldownSeconds !== undefined && typeof ham.statusRoles.cooldownSeconds !== 'number') {
      hatalar.push('statusRoles.cooldownSeconds sayısal olmalı.');
    }
  }

  return { gecerli: hatalar.length === 0, hatalar, uyarilar };
}

function derinBirlestir(hedef, kaynak) {
  const sonuc = { ...hedef };
  for (const anahtar of Object.keys(kaynak || {})) {
    const deger = kaynak[anahtar];
    if (deger && typeof deger === 'object' && !Array.isArray(deger) && typeof hedef[anahtar] === 'object') {
      sonuc[anahtar] = derinBirlestir(hedef[anahtar], deger);
    } else {
      sonuc[anahtar] = deger;
    }
  }
  return sonuc;
}

function varsayilanlarlaTamamla(ham) {
  return {
    token: '',
    clientId: '',
    mongoUri: '',
    ownerIds: [],
    bot: { name: 'WNERSDEV Durum Rol', language: 'tr', debug: false },
    statusRoles: {
      enabled: true,
      presenceUpdateEnabled: true,
      autoRoleAdd: true,
      autoRoleRemove: true,
      cooldownSeconds: 5,
      roleHierarchyProtection: true,
      duplicateProtection: true,
      notifications: { enabled: false, channelId: '' },
      platforms: { customStatus: true, game: true, spotify: true, streaming: true, activity: true }
    },
    queue: VARSAYILAN_QUEUE,
    reconciliation: VARSAYILAN_RECONCILIATION,
    anomaly: VARSAYILAN_ANOMALY,
    cache: VARSAYILAN_CACHE,
    ...derinBirlestir({}, ham)
  };
}

class ConfigManager {
  constructor() {
    this._config = null;
    this._sonGecerliConfig = null;
    this._durum = 'BASLATILMADI';
  }

  /**
   * ayarlar.json dosyasını okur ve doğrular. Geçersizse ve daha önce
   * çalışan geçerli bir config varsa onu korur (çöküş engellenir).
   */
  yukle({ ilkYukleme = false } = {}) {
    let ham;
    try {
      if (!fs.existsSync(CONFIG_YOLU)) {
        logger.hata('ayarlar.json bulunamadı. ayarlar.example.json dosyasını kopyalayıp doldurun.');
        this._durum = 'DOSYA_YOK';
        if (this._sonGecerliConfig) return this._sonGecerliConfig;
        this._config = varsayilanlarlaTamamla({});
        return this._config;
      }
      const icerik = fs.readFileSync(CONFIG_YOLU, 'utf8');
      ham = JSON.parse(icerik);
    } catch (hata) {
      logger.hata('ayarlar.json okunamadı veya JSON formatı bozuk. Önceki geçerli config korunuyor.', hata);
      this._durum = 'PARSE_HATASI';
      if (this._sonGecerliConfig) return this._sonGecerliConfig;
      this._config = varsayilanlarlaTamamla({});
      return this._config;
    }

    const { gecerli, hatalar, uyarilar } = configDogrula(ham);

    for (const uyari of uyarilar) {
      logger.uyari(`Config uyarısı: ${uyari}`);
    }

    if (!gecerli) {
      hatalar.forEach((h) => logger.hata(`Config hatası: ${h}`));
      if (!ilkYukleme && this._sonGecerliConfig) {
        logger.uyari('Yeni config geçersiz olduğu için önceki çalışan config korunuyor.');
        return this._sonGecerliConfig;
      }
      this._durum = 'GECERSIZ';
    } else {
      this._durum = 'GECERLI';
    }

    const tamamlanmis = varsayilanlarlaTamamla(ham);
    this._config = tamamlanmis;
    this._sonGecerliConfig = tamamlanmis;
    return tamamlanmis;
  }

  al() {
    if (!this._config) return this.yukle({ ilkYukleme: true });
    return this._config;
  }

  durum() {
    return this._durum;
  }

  yapilandirilmisMi() {
    const c = this.al();
    return Boolean(c.token && c.clientId && c.mongoUri);
  }
}

module.exports = new ConfigManager();
module.exports.ConfigDogrulamaHatasi = ConfigDogrulamaHatasi;
module.exports.configDogrula = configDogrula;
