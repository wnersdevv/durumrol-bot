'use strict';

const UserRolePreference = require('../database/models/UserRolePreference');
const { guildIzoleSorguDogrula } = require('../utils/security');
const { UygulamaHatasi } = require('../core/errorHandler');
const auditService = require('./auditService');

async function tercihGetir(guildId, userId) {
  guildIzoleSorguDogrula(guildId);
  return UserRolePreference.findOne({ guildId, userId }).lean();
}

async function optOutYap(guildId, userId, guildSettings) {
  guildIzoleSorguDogrula(guildId);
  if (guildSettings && guildSettings.optOutAllowed === false) {
    throw new UygulamaHatasi('Bu sunucuda yönetici opt-out özelliğini kapatmış. Otomatik durum rollerinden çıkamazsınız.', { kod: 'OPT_OUT_KAPALI', kalici: true });
  }
  const tercih = await UserRolePreference.findOneAndUpdate(
    { guildId, userId },
    { $set: { optedOut: true, optOutTarihi: new Date() } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  await auditService.kaydet(guildId, userId, 'OPT_OUT_YAPILDI', userId, {});
  return tercih;
}

async function optInYap(guildId, userId) {
  guildIzoleSorguDogrula(guildId);
  const tercih = await UserRolePreference.findOneAndUpdate(
    { guildId, userId },
    { $set: { optedOut: false, optOutTarihi: null } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  await auditService.kaydet(guildId, userId, 'OPT_IN_YAPILDI', userId, {});
  return tercih;
}

async function optedOutMu(guildId, userId) {
  const tercih = await tercihGetir(guildId, userId);
  return Boolean(tercih?.optedOut);
}

module.exports = { tercihGetir, optOutYap, optInYap, optedOutMu };
