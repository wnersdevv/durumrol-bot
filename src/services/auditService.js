'use strict';

const logRepository = require('../database/repositories/logRepository');
const logger = require('../core/logger');

async function kaydet(guildId, actorId, eylem, hedef = '', detay = {}) {
  try {
    await logRepository.auditKaydet({ guildId, actorId, eylem, hedef, detay });
  } catch (hata) {
    logger.hata(`Audit log kaydedilemedi: ${eylem}`, hata);
  }
}

module.exports = { kaydet };
