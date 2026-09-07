'use strict';

const { Schema, model } = require('mongoose');

// Yönetimsel işlemlerin denetim kaydı: kural oluşturma/silme, ayar değişikliği,
// kill-switch değişikliği, export/import, kullanıcı istisnası vb.
const AuditLogSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  actorId: { type: String, required: true },
  eylem: { type: String, required: true }, // ör: 'KURAL_OLUSTURULDU', 'KILL_SWITCH_DEGISTI'
  hedef: { type: String, default: '' }, // ör: ruleId, roleId, userId
  detay: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: false });

AuditLogSchema.index({ guildId: 1, timestamp: -1 });

module.exports = model('AuditLog', AuditLogSchema);
