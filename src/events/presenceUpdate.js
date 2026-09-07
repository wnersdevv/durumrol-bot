'use strict';

const logger = require('../core/logger');
const statusService = require('../services/statusService');

module.exports = {
  name: 'presenceUpdate',
  once: false,
  async execute(oldPresence, newPresence) {
    try {
      if (!newPresence?.guild || !newPresence.member) return;
      if (newPresence.member.user.bot) return;
      await statusService.presenceIsle({
        guild: newPresence.guild,
        member: newPresence.member,
        presence: newPresence
      });
    } catch (hata) {
      logger.hata('presenceUpdate olayı işlenirken hata oluştu', hata);
    }
  }
};
