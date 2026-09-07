'use strict';

const logger = require('../core/logger');
const cacheManager = require('../core/cacheManager');
const stateManager = require('../core/stateManager');

module.exports = {
  name: 'guildDelete',
  once: false,
  async execute(guild) {
    logger.sistem(`Sunucudan ayrılındı veya sunucu erişilemez oldu: ${guild.name || guild.id} (${guild.id})`);
    cacheManager.guildIcinTemizle(guild.id);
    stateManager.safeModeKapat(guild.id);
    // Not: Veri kasıtlı olarak silinmiyor; sunucu botu tekrar eklerse ayarlar korunur.
  }
};
