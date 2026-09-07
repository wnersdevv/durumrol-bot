'use strict';

const GuildSettings = require('../models/GuildSettings');
const { guildIzoleSorguDogrula } = require('../../utils/security');

async function bul(guildId) {
  guildIzoleSorguDogrula(guildId);
  return GuildSettings.findOne({ guildId }).lean();
}

async function bulYokSaOlustur(guildId) {
  guildIzoleSorguDogrula(guildId);
  let ayarlar = await GuildSettings.findOne({ guildId });
  if (!ayarlar) {
    ayarlar = await GuildSettings.create({ guildId });
  }
  return ayarlar;
}

async function guncelle(guildId, guncellemeler) {
  guildIzoleSorguDogrula(guildId);
  return GuildSettings.findOneAndUpdate(
    { guildId },
    { $set: guncellemeler },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function sil(guildId) {
  guildIzoleSorguDogrula(guildId);
  return GuildSettings.deleteOne({ guildId });
}

module.exports = { bul, bulYokSaOlustur, guncelle, sil };
