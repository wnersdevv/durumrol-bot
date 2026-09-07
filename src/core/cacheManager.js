'use strict';

/**
 * Basit TTL destekli bellek-içi cache. Memory leak'i önlemek için:
 * - her girdi TTL ile süreli
 * - periyodik temizlik (sweep) çalışır
 * - maksimum girdi sayısı sınırlanır (LRU benzeri tahliye)
 */
class CacheBolumu {
  constructor({ ttlMs = 60000, maxGirdi = 5000 } = {}) {
    this.ttlMs = ttlMs;
    this.maxGirdi = maxGirdi;
    this._harita = new Map();
  }

  al(anahtar) {
    const girdi = this._harita.get(anahtar);
    if (!girdi) return undefined;
    if (Date.now() > girdi.sonaErmeZamani) {
      this._harita.delete(anahtar);
      return undefined;
    }
    // LRU: erişilen girdiyi en sona taşı
    this._harita.delete(anahtar);
    this._harita.set(anahtar, girdi);
    return girdi.deger;
  }

  ayarla(anahtar, deger, ttlMsOverride) {
    if (this._harita.size >= this.maxGirdi) {
      const enEskiAnahtar = this._harita.keys().next().value;
      if (enEskiAnahtar !== undefined) this._harita.delete(enEskiAnahtar);
    }
    this._harita.set(anahtar, {
      deger,
      sonaErmeZamani: Date.now() + (ttlMsOverride ?? this.ttlMs)
    });
  }

  sil(anahtar) {
    this._harita.delete(anahtar);
  }

  onEkiyleSil(onEk) {
    for (const anahtar of this._harita.keys()) {
      if (typeof anahtar === 'string' && anahtar.startsWith(onEk)) {
        this._harita.delete(anahtar);
      }
    }
  }

  temizle() {
    this._harita.clear();
  }

  supurgeCalistir() {
    const simdi = Date.now();
    for (const [anahtar, girdi] of this._harita.entries()) {
      if (simdi > girdi.sonaErmeZamani) this._harita.delete(anahtar);
    }
  }

  get boyut() {
    return this._harita.size;
  }
}

class CacheManager {
  constructor() {
    this.guildSettings = new CacheBolumu({ ttlMs: 60000 });
    this.rules = new CacheBolumu({ ttlMs: 60000 });
    this.roleMetadata = new CacheBolumu({ ttlMs: 300000 });
    this.userState = new CacheBolumu({ ttlMs: 30000 });
    this._supurgeAraligi = null;
  }

  yapilandir({ guildSettingsTtlMs, rulesTtlMs, roleMetadataTtlMs } = {}) {
    if (guildSettingsTtlMs) this.guildSettings.ttlMs = guildSettingsTtlMs;
    if (rulesTtlMs) this.rules.ttlMs = rulesTtlMs;
    if (roleMetadataTtlMs) this.roleMetadata.ttlMs = roleMetadataTtlMs;
  }

  baslat() {
    if (this._supurgeAraligi) return;
    this._supurgeAraligi = setInterval(() => {
      this.guildSettings.supurgeCalistir();
      this.rules.supurgeCalistir();
      this.roleMetadata.supurgeCalistir();
      this.userState.supurgeCalistir();
    }, 60000);
    this._supurgeAraligi.unref?.();
  }

  durdur() {
    if (this._supurgeAraligi) {
      clearInterval(this._supurgeAraligi);
      this._supurgeAraligi = null;
    }
  }

  guildIcinTemizle(guildId) {
    this.guildSettings.sil(`guild:${guildId}`);
    this.rules.onEkiyleSil(`guild:${guildId}:`);
    this.userState.onEkiyleSil(`guild:${guildId}:`);
  }

  tumunuTemizle() {
    this.guildSettings.temizle();
    this.rules.temizle();
    this.roleMetadata.temizle();
    this.userState.temizle();
  }
}

module.exports = new CacheManager();
