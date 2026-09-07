'use strict';

const { Schema, model } = require('mongoose');

const RoleGroupSchema = new Schema({
  groupId: { type: String, required: true },
  name: { type: String, required: true },
  roleIds: { type: [String], default: [] },
  mode: { type: String, enum: ['SINGLE', 'MULTIPLE'], default: 'MULTIPLE' },
  priority: { type: Number, default: 0 }
}, { _id: false });

const GuildSettingsSchema = new Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  enabled: { type: Boolean, default: true },
  presenceUpdateEnabled: { type: Boolean, default: true },
  autoRoleAdd: { type: Boolean, default: true },
  autoRoleRemove: { type: Boolean, default: true },
  notificationChannelId: { type: String, default: '' },
  logChannelId: { type: String, default: '' },
  notificationMode: { type: String, enum: ['all', 'important', 'errors', 'disabled'], default: 'disabled' },
  cooldownSeconds: { type: Number, default: 5, min: 0, max: 3600 },
  quietHours: {
    enabled: { type: Boolean, default: false },
    baslangicSaat: { type: Number, default: 23, min: 0, max: 23 },
    bitisSaat: { type: Number, default: 7, min: 0, max: 23 }
  },
  timezone: { type: String, default: 'Europe/Istanbul' },

  ignoredRoles: { type: [String], default: [] },
  ignoredUsers: { type: [String], default: [] },
  protectedRoles: { type: [String], default: [] },

  roleGroups: { type: [RoleGroupSchema], default: [] },

  matchMode: { type: String, enum: ['ALL_MATCHING', 'HIGHEST_PRIORITY'], default: 'ALL_MATCHING' },

  platforms: {
    customStatus: { type: Boolean, default: true },
    game: { type: Boolean, default: true },
    spotify: { type: Boolean, default: true },
    streaming: { type: Boolean, default: true },
    activity: { type: Boolean, default: true }
  },

  optOutAllowed: { type: Boolean, default: true },

  permissions: {
    kuralYonetimSeviyesi: { type: String, enum: ['ADMIN', 'MODERATOR'], default: 'ADMIN' }
  },

  setupTamamlandi: { type: Boolean, default: false },

  settings: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

GuildSettingsSchema.index({ guildId: 1 }, { unique: true });

module.exports = model('GuildSettings', GuildSettingsSchema);
