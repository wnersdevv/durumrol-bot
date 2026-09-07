'use strict';

const { PermissionsBitField } = require('discord.js');
const configManager = require('./configManager');

const YETKI_SEVIYELERI = Object.freeze({
  USER: 0,
  MODERATOR: 1,
  ADMIN: 2,
  OWNER: 3
});

/**
 * Bir üyenin sahip olduğu en yüksek yetki seviyesini belirler.
 * OWNER: ayarlar.json -> ownerIds içinde olan Discord ID.
 * ADMIN: Discord "Yönetici" (Administrator) izni olan üyeler.
 * MODERATOR: "Rolleri Yönet" (ManageRoles) izni olan üyeler.
 * USER: diğer herkes.
 */
function kullaniciYetkiSeviyesi(interaction) {
  const config = configManager.al();
  const kullaniciId = interaction.user?.id;

  if (kullaniciId && Array.isArray(config.ownerIds) && config.ownerIds.includes(kullaniciId)) {
    return YETKI_SEVIYELERI.OWNER;
  }

  const uye = interaction.member;
  if (!uye || !uye.permissions) return YETKI_SEVIYELERI.USER;

  const izinler = uye.permissions instanceof PermissionsBitField
    ? uye.permissions
    : new PermissionsBitField(BigInt(uye.permissions));

  if (izinler.has(PermissionsBitField.Flags.Administrator)) {
    return YETKI_SEVIYELERI.ADMIN;
  }
  if (izinler.has(PermissionsBitField.Flags.ManageRoles)) {
    return YETKI_SEVIYELERI.MODERATOR;
  }
  return YETKI_SEVIYELERI.USER;
}

function yetkiYeterliMi(interaction, gerekliSeviye) {
  return kullaniciYetkiSeviyesi(interaction) >= gerekliSeviye;
}

function yetkiSeviyesiIsmi(seviye) {
  return Object.keys(YETKI_SEVIYELERI).find((k) => YETKI_SEVIYELERI[k] === seviye) || 'BİLİNMİYOR';
}

/**
 * Bir üyenin belirli bir rolü manuel olarak verip alamayacağını, guild
 * hiyerarşisi (rolleri yönetme izni + rol pozisyonu) açısından kontrol eder.
 */
function manuelRolIzniVarMi(uye, hedefRol) {
  if (!uye?.permissions?.has(PermissionsBitField.Flags.ManageRoles)) return false;
  const enYuksekRolPozisyonu = uye.roles?.highest?.position ?? 0;
  return enYuksekRolPozisyonu > hedefRol.position;
}

module.exports = {
  YETKI_SEVIYELERI,
  kullaniciYetkiSeviyesi,
  yetkiYeterliMi,
  yetkiSeviyesiIsmi,
  manuelRolIzniVarMi
};
