'use strict';

const { Schema, model } = require('mongoose');

const ActivitySnapshotSchema = new Schema({
  type: { type: String },
  name: { type: String },
  state: { type: String },
  details: { type: String },
  applicationId: { type: String },
  url: { type: String },
  partyId: { type: String }
}, { _id: false });

const UserStatusStateSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  status: { type: String, enum: ['online', 'idle', 'dnd', 'offline', 'invisible'], default: 'offline' },
  customStatus: { type: String, default: '' },
  activities: { type: [ActivitySnapshotSchema], default: [] },
  spotify: {
    active: { type: Boolean, default: false },
    track: { type: String, default: '' },
    artist: { type: String, default: '' },
    album: { type: String, default: '' }
  },
  streaming: {
    active: { type: Boolean, default: false },
    platform: { type: String, default: '' },
    url: { type: String, default: '' },
    title: { type: String, default: '' }
  },
  matchedRules: { type: [String], default: [] }, // ruleId listesi
  managedRoles: { type: [String], default: [] }, // sistemin verdiği AUTOMATIC roller
  optedOut: { type: Boolean, default: false },
  lastProcessedAt: { type: Date, default: null },
  lastHash: { type: String, default: '' }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

UserStatusStateSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = model('UserStatusState', UserStatusStateSchema);
