'use strict';

const logger = require('./logger');

class UygulamaHatasi extends Error {
  constructor(mesaj, { kod = 'BILINMEYEN_HATA', kalici = false, meta = null } = {}) {
    super(mesaj);
    this.name = 'UygulamaHatasi';
    this.kod = kod;
    this.kalici = kalici; // true ise retry yapılmamalı (ör. permission/hierarchy hatası)
    this.meta = meta;
  }
}

class YetkiHatasi extends UygulamaHatasi {
  constructor(mesaj, meta) {
    super(mesaj, { kod: 'YETKI_HATASI', kalici: true, meta });
    this.name = 'YetkiHatasi';
  }
}

class DogrulamaHatasi extends UygulamaHatasi {
  constructor(mesaj, meta) {
    super(mesaj, { kod: 'DOGRULAMA_HATASI', kalici: true, meta });
    this.name = 'DogrulamaHatasi';
  }
}

class DiscordApiHatasi extends UygulamaHatasi {
  constructor(mesaj, { kalici = false, meta = null } = {}) {
    super(mesaj, { kod: 'DISCORD_API_HATASI', kalici, meta });
    this.name = 'DiscordApiHatasi';
  }
}

/**
 * Discord.js hatasını inceleyip kalıcı mı (retry yapılmamalı) yoksa
 * geçici mi (retry yapılabilir) olduğuna karar verir.
 */
function discordHatasiKaliciMi(hata) {
  const kod = hata && (hata.code ?? hata.status);
  // 50013: Missing Permissions, 50001: Missing Access, 10011: Unknown Role,
  // 10007: Unknown Member, 10004: Unknown Guild -> kalıcı hatalar
  const kaliciKodlar = new Set([50013, 50001, 10011, 10007, 10004, 50035]);
  if (kaliciKodlar.has(kod)) return true;
  // 429 (rate limit), 500, 502, 503, 504 -> geçici
  if ([429, 500, 502, 503, 504].includes(kod)) return false;
  return false;
}

async function guvenliCalistir(fonksiyon, baglam = 'bilinmeyen-islem') {
  try {
    return await fonksiyon();
  } catch (hata) {
    logger.hata(`Beklenmeyen hata [${baglam}]`, hata);
    return null;
  }
}

function kuresekHatalariBagla() {
  process.on('unhandledRejection', (sebep) => {
    logger.hata('Yakalanmamış Promise reddi (unhandledRejection)', sebep);
  });
  process.on('uncaughtException', (hata) => {
    logger.hata('Yakalanmamış istisna (uncaughtException) - süreç devam ediyor', hata);
  });
}

module.exports = {
  UygulamaHatasi,
  YetkiHatasi,
  DogrulamaHatasi,
  DiscordApiHatasi,
  discordHatasiKaliciMi,
  guvenliCalistir,
  kuresekHatalariBagla
};
