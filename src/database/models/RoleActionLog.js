'use strict';

const { Schema, model } = require('mongoose');

const RoleActionLogSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true }, // işlemi tetikleyen/gerçekleştiren
  targetUserId: { type: String, required: true, index: true }, // rolün uygulandığı üye
  roleId: { type: String, required: true },
  action: { type: String, enum: ['ADD', 'REMOVE'], required: true },
  source: { type: String, enum: ['AUTOMATIC', 'MANUAL', 'SYSTEM'], required: true, index: true },
  ruleId: { type: String, default: null },
  success: { type: Boolean, required: true },
  error: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: false });

RoleActionLogSchema.index({ guildId: 1, timestamp: -1 });
RoleActionLogSchema.index({ guildId: 1, success: 1, timestamp: -1 });

module.exports = model('RoleActionLog', RoleActionLogSchema);
