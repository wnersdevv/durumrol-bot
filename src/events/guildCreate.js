'use strict';

const logger = require('../core/logger');
const guildSettingsService = require('../services/guildSettingsService');

module.exports = {
  name: 'guildCreate',
  once: false,
  async execute(guild) {
    logger.sistem(`Yeni sunucuya katılındı: ${guild.name} (${guild.id})`);
    try {
      await guildSettingsService.ayarlariGetir(guild.id, { cacheKullan: false });
    } catch (hata) {
      logger.hata(`Guild ayarları oluşturulamadı: ${guild.id}`, hata);
    }
  }
};
