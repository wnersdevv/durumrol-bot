'use strict';

const guildSettingsRepository = require('../database/repositories/guildSettingsRepository');
const cacheManager = require('../core/cacheManager');
const auditService = require('./auditService');

function cacheAnahtari(guildId) {
  return `guild:${guildId}`;
}

async function ayarlariGetir(guildId, { cacheKullan = true } = {}) {
  if (cacheKullan) {
    const onbellek = cacheManager.guildSettings.al(cacheAnahtari(guildId));
    if (onbellek) return onbellek;
  }
  const ayarlar = await guildSettingsRepository.bulYokSaOlustur(guildId);
  const duz = ayarlar.toObject ? ayarlar.toObject() : ayarlar;
  cacheManager.guildSettings.ayarla(cacheAnahtari(guildId), duz);
  return duz;
}

async function ayarlariGuncelle(guildId, guncellemeler, actorId) {
  const guncel = await guildSettingsRepository.guncelle(guildId, guncellemeler);
  cacheManager.guildSettings.sil(cacheAnahtari(guildId));
  await auditService.kaydet(guildId, actorId, 'AYAR_GUNCELLENDI', guildId, guncellemeler);
  return guncel;
}

async function korumaliRolEkle(guildId, roleId, actorId) {
  const ayarlar = await guildSettingsRepository.bulYokSaOlustur(guildId);
  if (!ayarlar.protectedRoles.includes(roleId)) {
    ayarlar.protectedRoles.push(roleId);
    await ayarlar.save();
    cacheManager.guildSettings.sil(cacheAnahtari(guildId));
    await auditService.kaydet(guildId, actorId, 'KORUMALI_ROL_EKLENDI', roleId, {});
  }
  return ayarlar;
}

async function istisnaKullaniciEkle(guildId, userId, actorId) {
  const ayarlar = await guildSettingsRepository.bulYokSaOlustur(guildId);
  if (!ayarlar.ignoredUsers.includes(userId)) {
    ayarlar.ignoredUsers.push(userId);
    await ayarlar.save();
    cacheManager.guildSettings.sil(cacheAnahtari(guildId));
    await auditService.kaydet(guildId, actorId, 'ISTISNA_KULLANICI_EKLENDI', userId, {});
  }
  return ayarlar;
}

async function istisnaKullaniciCikar(guildId, userId, actorId) {
  const ayarlar = await guildSettingsRepository.bulYokSaOlustur(guildId);
  ayarlar.ignoredUsers = ayarlar.ignoredUsers.filter((id) => id !== userId);
  await ayarlar.save();
  cacheManager.guildSettings.sil(cacheAnahtari(guildId));
  await auditService.kaydet(guildId, actorId, 'ISTISNA_KULLANICI_CIKARILDI', userId, {});
  return ayarlar;
}

module.exports = {
  ayarlariGetir,
  ayarlariGuncelle,
  korumaliRolEkle,
  istisnaKullaniciEkle,
  istisnaKullaniciCikar
};
