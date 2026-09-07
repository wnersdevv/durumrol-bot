'use strict';

const logger = require('../core/logger');
const stateManager = require('../core/stateManager');
const cacheManager = require('../core/cacheManager');
const reconciliationService = require('../services/reconciliationService');
const roleActionQueueService = require('../services/roleActionQueueService');
const configManager = require('../core/configManager');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.basari(`WNERSDEV Durum & Rol aktif: ${client.user.tag} (${client.guilds.cache.size} sunucu)`);
    stateManager.hazirBildir();

    const config = configManager.al();
    cacheManager.yapilandir(config.cache);
    cacheManager.baslat();
    roleActionQueueService.yapilandir(config.queue);
    roleActionQueueService.baslat();
    reconciliationService.periyodikBaslat(client);

    client.user.setPresence({
      activities: [{ name: 'Durum & Rol | /durumrol panel', type: 3 }],
      status: 'online'
    });
  }
};
