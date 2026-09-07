'use strict';

const UserStatusState = require('../models/UserStatusState');
const { guildIzoleSorguDogrula } = require('../../utils/security');

async function bul(guildId, userId) {
  guildIzoleSorguDogrula(guildId);
  return UserStatusState.findOne({ guildId, userId });
}

async function upsert(guildId, userId, veri) {
  guildIzoleSorguDogrula(guildId);
  return UserStatusState.findOneAndUpdate(
    { guildId, userId },
    { $set: veri },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function guildTumUyeleri(guildId) {
  guildIzoleSorguDogrula(guildId);
  return UserStatusState.find({ guildId }).lean();
}

async function sil(guildId, userId) {
  guildIzoleSorguDogrula(guildId);
  return UserStatusState.deleteOne({ guildId, userId });
}

module.exports = { bul, upsert, guildTumUyeleri, sil };
