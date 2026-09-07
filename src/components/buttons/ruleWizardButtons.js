'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { customIdUret } = require('../../utils/ids');

function ozetOnayButonlari(veri) {
  const satir1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(customIdUret('wizard', 'toggle-kaldir'))
      .setLabel(`Koşul false olunca kaldır: ${veri.removeWhenFalse ? 'EVET' : 'HAYIR'}`)
      .setStyle(veri.removeWhenFalse ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(customIdUret('wizard', 'toggle-bildirim'))
      .setLabel(`Bildirim: ${veri.notificationEnabled ? 'AÇIK' : 'KAPALI'}`)
      .setStyle(veri.notificationEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(customIdUret('wizard', 'toggle-aktif'))
      .setLabel(`Durum: ${veri.enabled ? 'AKTİF' : 'PASİF'}`)
      .setStyle(veri.enabled ? ButtonStyle.Success : ButtonStyle.Secondary)
  );
  const satir2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customIdUret('wizard', 'onayla')).setLabel('Kuralı Kaydet').setStyle(ButtonStyle.Primary).setEmoji('✅'),
    new ButtonBuilder().setCustomId(customIdUret('wizard', 'iptal')).setLabel('İptal').setStyle(ButtonStyle.Danger).setEmoji('✖️')
  );
  return [satir1, satir2];
}

function ruleConditionDegistirSatiri() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customIdUret('wizard', 'kosul-degistir')).setLabel('Koşulu Değiştir').setStyle(ButtonStyle.Secondary).setEmoji('🔀')
  );
}

function ruleListeSatirButonlari(ruleId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customIdUret('kural', 'duzenle', ruleId)).setLabel('Düzenle').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
    new ButtonBuilder().setCustomId(customIdUret('kural', 'sil', ruleId)).setLabel('Sil').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
    new ButtonBuilder().setCustomId(customIdUret('kural', 'ac-kapat', ruleId)).setLabel('Aç/Kapat').setStyle(ButtonStyle.Secondary).setEmoji('🔁'),
    new ButtonBuilder().setCustomId(customIdUret('kural', 'test', ruleId)).setLabel('Test').setStyle(ButtonStyle.Primary).setEmoji('🧪'),
    new ButtonBuilder().setCustomId(customIdUret('kural', 'onizle', ruleId)).setLabel('Önizle').setStyle(ButtonStyle.Secondary).setEmoji('👁️')
  );
}

module.exports = { ozetOnayButonlari, ruleListeSatirButonlari, ruleConditionDegistirSatiri };
