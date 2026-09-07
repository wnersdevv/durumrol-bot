'use strict';

const { Schema, model } = require('mongoose');

// Kural motorunun her çalıştırılışında (gerçek veya test modu) bıraktığı iz.
// İstatistik ("en çok eşleşen kural") ve hata ayıklama için kullanılır.
const RuleExecutionSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  ruleId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  matched: { type: Boolean, required: true },
  testMode: { type: Boolean, default: false },
  actionTaken: { type: String, enum: ['ADD', 'REMOVE', 'NONE'], default: 'NONE' },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: false });

RuleExecutionSchema.index({ guildId: 1, ruleId: 1, timestamp: -1 });

module.exports = model('RuleExecution', RuleExecutionSchema);
