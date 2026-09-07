'use strict';

const StatusRoleRule = require('../models/StatusRoleRule');
const { guildIzoleSorguDogrula } = require('../../utils/security');

async function listele(guildId, { sadeceAktif = false } = {}) {
  guildIzoleSorguDogrula(guildId);
  const filtre = { guildId };
  if (sadeceAktif) filtre.enabled = true;
  return StatusRoleRule.find(filtre).sort({ priority: -1, createdAt: 1 }).lean();
}

async function idIleBul(guildId, ruleId) {
  guildIzoleSorguDogrula(guildId);
  return StatusRoleRule.findOne({ _id: ruleId, guildId });
}

async function olustur(guildId, veri) {
  guildIzoleSorguDogrula(guildId);
  return StatusRoleRule.create({ ...veri, guildId });
}

async function guncelle(guildId, ruleId, guncellemeler) {
  guildIzoleSorguDogrula(guildId);
  return StatusRoleRule.findOneAndUpdate({ _id: ruleId, guildId }, { $set: guncellemeler }, { new: true });
}

async function sil(guildId, ruleId) {
  guildIzoleSorguDogrula(guildId);
  return StatusRoleRule.deleteOne({ _id: ruleId, guildId });
}

async function eslesmeSayaciniArtir(guildId, ruleId) {
  guildIzoleSorguDogrula(guildId);
  return StatusRoleRule.updateOne({ _id: ruleId, guildId }, { $inc: { eslesmeSayaci: 1 } });
}

module.exports = { listele, idIleBul, olustur, guncelle, sil, eslesmeSayaciniArtir };
