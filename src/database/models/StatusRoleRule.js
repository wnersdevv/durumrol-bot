'use strict';

const { Schema, model } = require('mongoose');

// Koşul ağacı: bileşik (logic+conditions) ya da yaprak (type/operator/value)
// Şema esnekliği için Mixed kullanılır; doğrulama utils/validators.js içinde yapılır.
const StatusRoleRuleSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  enabled: { type: Boolean, default: true },
  priority: { type: Number, default: 0, index: true },
  roleId: { type: String, required: true },
  action: { type: String, enum: ['ADD', 'REMOVE', 'SYNC'], required: true },
  conditions: { type: Schema.Types.Mixed, required: true },
  removeWhenFalse: { type: Boolean, default: true },
  cooldown: { type: Number, default: 0, min: 0 },
  notification: {
    enabled: { type: Boolean, default: false }
  },
  groupId: { type: String, default: null },
  createdBy: { type: String, required: true },
  eslesmeSayaci: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

StatusRoleRuleSchema.index({ guildId: 1, enabled: 1, priority: -1 });
StatusRoleRuleSchema.index({ guildId: 1, roleId: 1 });

module.exports = model('StatusRoleRule', StatusRoleRuleSchema);
