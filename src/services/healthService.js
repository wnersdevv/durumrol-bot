'use strict';

const os = require('os');
const stateManager = require('../core/stateManager');
const configManager = require('../core/configManager');
const { baglanmisMi } = require('../database/connection');
const roleActionQueueService = require('./roleActionQueueService');
const { saniyeyiOkunabilirYap } = require('../utils/time');

function saglikRaporuOlustur(client) {
  const config = configManager.al();
  const bellek = process.memoryUsage();

  return {
    discord: {
      baglı: client?.isReady?.() ?? false,
      ping: client?.ws?.ping ?? null,
      guildSayisi: client?.guilds?.cache?.size ?? 0
    },
    mongoDB: {
      baglı: baglanmisMi()
    },
    presenceListener: {
      aktif: config.statusRoles?.presenceUpdateEnabled === true && !stateManager.killSwitch.presenceIsleme
    },
    roleQueue: {
      uzunluk: roleActionQueueService.toplamUzunluk()
    },
    reconciliation: {
      aktif: config.reconciliation?.enabled === true && !stateManager.killSwitch.reconciliation
    },
    ruleEngine: {
      aktif: config.statusRoles?.enabled === true
    },
    uptime: saniyeyiOkunabilirYap(stateManager.uptimeSaniye()),
    uptimeSaniye: stateManager.uptimeSaniye(),
    bellek: {
      rss: `${(bellek.rss / 1024 / 1024).toFixed(1)} MB`,
      heapUsed: `${(bellek.heapUsed / 1024 / 1024).toFixed(1)} MB`
    },
    cpu: {
      yukOrtalamasi: os.loadavg()[0].toFixed(2)
    },
    sonRolIslemi: stateManager.sonRolIslemi,
    sonHata: stateManager.sonHata,
    killSwitch: stateManager.killSwitchDurumu()
  };
}

module.exports = { saglikRaporuOlustur };
