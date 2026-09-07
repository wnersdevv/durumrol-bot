'use strict';

const { Schema, model } = require('mongoose');

const UserRolePreferenceSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  optedOut: { type: Boolean, default: false },
  optOutTarihi: { type: Date, default: null },
  notes: { type: String, default: '' }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

UserRolePreferenceSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = model('UserRolePreference', UserRolePreferenceSchema);
