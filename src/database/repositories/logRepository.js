'use strict';

const RoleActionLog = require('../models/RoleActionLog');
const AuditLog = require('../models/AuditLog');
const RuleExecution = require('../models/RuleExecution');
const { guildIzoleSorguDogrula } = require('../../utils/security');

async function rolIslemiKaydet(kayit) {
  guildIzoleSorguDogrula(kayit.guildId);
  return RoleActionLog.create(kayit);
}

async function rolIslemleriFiltrele(guildId, filtre = {}, { limit = 20, skip = 0 } = {}) {
  guildIzoleSorguDogrula(guildId);
  const sorgu = { guildId };
  if (filtre.userId) sorgu.targetUserId = filtre.userId;
  if (filtre.roleId) sorgu.roleId = filtre.roleId;
  if (filtre.ruleId) sorgu.ruleId = filtre.ruleId;
  if (filtre.action) sorgu.action = filtre.action;
  if (filtre.success !== undefined) sorgu.success = filtre.success;
  if (filtre.baslangic || filtre.bitis) {
    sorgu.timestamp = {};
    if (filtre.baslangic) sorgu.timestamp.$gte = filtre.baslangic;
    if (filtre.bitis) sorgu.timestamp.$lte = filtre.bitis;
  }
  return RoleActionLog.find(sorgu).sort({ timestamp: -1 }).skip(skip).limit(limit).lean();
}

async function auditKaydet(kayit) {
  guildIzoleSorguDogrula(kayit.guildId);
  return AuditLog.create(kayit);
}

async function ruleExecutionKaydet(kayit) {
  guildIzoleSorguDogrula(kayit.guildId);
  return RuleExecution.create(kayit);
}

async function enCokEslesenKurallar(guildId, { limit = 5 } = {}) {
  guildIzoleSorguDogrula(guildId);
  return RuleExecution.aggregate([
    { $match: { guildId, matched: true } },
    { $group: { _id: '$ruleId', sayi: { $sum: 1 } } },
    { $sort: { sayi: -1 } },
    { $limit: limit }
  ]);
}

async function enCokVerilenRoller(guildId, { limit = 5 } = {}) {
  guildIzoleSorguDogrula(guildId);
  return RoleActionLog.aggregate([
    { $match: { guildId, action: 'ADD', success: true } },
    { $group: { _id: '$roleId', sayi: { $sum: 1 } } },
    { $sort: { sayi: -1 } },
    { $limit: limit }
  ]);
}

async function bugunkuSayilar(guildId) {
  guildIzoleSorguDogrula(guildId);
  const gunBaslangici = new Date();
  gunBaslangici.setHours(0, 0, 0, 0);
  const [verilen, alinan, basarisiz] = await Promise.all([
    RoleActionLog.countDocuments({ guildId, action: 'ADD', success: true, timestamp: { $gte: gunBaslangici } }),
    RoleActionLog.countDocuments({ guildId, action: 'REMOVE', success: true, timestamp: { $gte: gunBaslangici } }),
    RoleActionLog.countDocuments({ guildId, success: false, timestamp: { $gte: gunBaslangici } })
  ]);
  return { verilen, alinan, basarisiz };
}

module.exports = {
  rolIslemiKaydet,
  rolIslemleriFiltrele,
  auditKaydet,
  ruleExecutionKaydet,
  enCokEslesenKurallar,
  enCokVerilenRoller,
  bugunkuSayilar
};
