'use strict';

const guildSettingsService = require('../../services/guildSettingsService');

/**
 * Guild ilk kurulum sihirbazı. Tam interaktif bir Components V2 akışı yerine,
 * /durumrol kur komutu çağrıldığında güvenli varsayılanlarla sistemi etkinleştirir
 * ve kurulumu tamamlanmış olarak işaretler. Detaylı ayarlar (log kanalı, korumalı
 * roller vb.) Genel Ayarlar panelinden veya ilgili istisna komutlarından yapılır.
 */
async function ilkKurulumuCalistir(guildId, actorId, { logChannelId, notificationMode } = {}) {
  const guncellemeler = {
    enabled: true,
    presenceUpdateEnabled: true,
    autoRoleAdd: true,
    autoRoleRemove: true,
    setupTamamlandi: true
  };
  if (logChannelId) guncellemeler.logChannelId = logChannelId;
  if (notificationMode) {
    guncellemeler.notificationMode = notificationMode;
    guncellemeler.notificationChannelId = logChannelId || '';
  }
  return guildSettingsService.ayarlariGuncelle(guildId, guncellemeler, actorId);
}

module.exports = { ilkKurulumuCalistir };
