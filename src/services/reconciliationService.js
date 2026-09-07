'use strict';

const logger = require('../core/logger');
const stateManager = require('../core/stateManager');
const lockManager = require('../core/lockManager');
const configManager = require('../core/configManager');
const guildSettingsService = require('./guildSettingsService');
const statusService = require('./statusService');
const userStateRepository = require('../database/repositories/userStateRepository');
const notificationService = require('./notificationService');

/**
 * Tek bir guild için reconciliation çalıştırır:
 * MongoDB'deki UserStatusState.managedRoles ile Discord'daki gerçek roller
 * ve aktif kurallar karşılaştırılır. Bu karşılaştırma, her üyenin presence'ı
 * yeniden değerlendirilerek (statusService.kullaniciyiYenidenTara) yapılır;
 * böylece eksik otomatik rol eklenir, artık geçerli olmayan otomatik rol
 * kaldırılır. Manuel/protected/external roller asla dokunulmaz çünkü
 * roleSyncService yalnızca managedRoles ve rule eşleşmesi üzerinden çalışır.
 */
async function guildIcinCalistir(guild) {
  const kilitAnahtari = `reconciliation:${guild.id}`;
  if (lockManager.meşgulMü(kilitAnahtari)) {
    logger.uyari(`Reconciliation zaten çalışıyor, atlanıyor: guild=${guild.id}`);
    return { atlandi: true, sebep: 'Zaten çalışıyor.' };
  }

  return lockManager.kilitle(kilitAnahtari, async () => {
    const config = configManager.al();
    if (!config.reconciliation?.enabled || stateManager.killSwitch.reconciliation) {
      return { atlandi: true, sebep: 'Reconciliation devre dışı veya kill switch kapalı.' };
    }

    const guildSettings = await guildSettingsService.ayarlariGetir(guild.id);
    if (!guildSettings.enabled) return { atlandi: true, sebep: 'Guild sistemi devre dışı.' };

    if (stateManager.safeModeAktifMi(guild.id)) {
      logger.uyari(`Reconciliation SAFE MODE nedeniyle atlanıyor: guild=${guild.id}`);
      return { atlandi: true, sebep: 'SAFE MODE aktif.' };
    }

    let uyeler;
    try {
      uyeler = await guild.members.fetch();
    } catch (hata) {
      logger.hata(`Reconciliation için üyeler getirilemedi: guild=${guild.id}`, hata);
      return { atlandi: true, sebep: 'Üye listesi alınamadı.' };
    }

    let islenen = 0;
    let hataSayisi = 0;
    for (const [, uye] of uyeler) {
      if (uye.user.bot) continue;
      try {
        const sonuc = await statusService.kullaniciyiYenidenTara(guild, uye, { oncelik: 'LOW', cooldownAtla: true });
        if (!sonuc.atlandi) islenen += 1;
      } catch (hata) {
        hataSayisi += 1;
        logger.hata(`Reconciliation sırasında üye işlenemedi: ${uye.id}`, hata);
      }
    }

    // Bir daha reconciliation'a takılmayan ama artık guild'de olmayan
    // eski state kayıtlarını temizlemek istatistik doğruluğu için önemlidir.
    const kayitliState = await userStateRepository.guildTumUyeleri(guild.id);
    for (const state of kayitliState) {
      if (!uyeler.has(state.userId)) {
        await userStateRepository.sil(guild.id, state.userId).catch(() => {});
      }
    }

    logger.sistem(`Reconciliation tamamlandı: guild=${guild.id} işlenen=${islenen} hata=${hataSayisi}`);

    if (hataSayisi > 0) {
      await notificationService.sistemUyarisiGonder(
        guild, guildSettings,
        'Reconciliation Tamamlandı (Hatalarla)',
        `${islenen} üye işlendi, ${hataSayisi} üyede hata oluştu. Detaylar için logları kontrol edin.`
      );
    }

    return { atlandi: false, islenen, hataSayisi };
  });
}

let _zamanlayici = null;

function periyodikBaslat(client) {
  const config = configManager.al();
  if (!config.reconciliation?.enabled) {
    logger.bilgi('Reconciliation config üzerinden devre dışı, periyodik job başlatılmadı.');
    return;
  }
  if (_zamanlayici) return;
  const araligMs = (config.reconciliation.intervalMinutes || 30) * 60 * 1000;
  _zamanlayici = setInterval(async () => {
    if (stateManager.killSwitch.reconciliation) return;
    for (const [, guild] of client.guilds.cache) {
      await guildIcinCalistir(guild).catch((h) => logger.hata(`Reconciliation guild hatası: ${guild.id}`, h));
    }
  }, araligMs);
  _zamanlayici.unref?.();
  logger.sistem(`Reconciliation periyodik job başlatıldı (her ${config.reconciliation.intervalMinutes} dakikada bir).`);
}

function periyodikDurdur() {
  if (_zamanlayici) {
    clearInterval(_zamanlayici);
    _zamanlayici = null;
  }
}

module.exports = { guildIcinCalistir, periyodikBaslat, periyodikDurdur };
