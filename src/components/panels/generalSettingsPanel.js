'use strict';

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { customIdUret } = require('../../utils/ids');
const { bayrakEmoji } = require('../../utils/formatters');

function genelAyarlarPaneliOlustur(guildSettings) {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent('## ⚙️ GENEL AYARLAR'));
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${bayrakEmoji(guildSettings.enabled)} Sistem Etkin\n` +
    `${bayrakEmoji(guildSettings.autoRoleAdd)} Otomatik Rol Ekleme\n` +
    `${bayrakEmoji(guildSettings.autoRoleRemove)} Otomatik Rol Kaldırma\n` +
    `${bayrakEmoji(guildSettings.optOutAllowed)} Kullanıcı Opt-Out İzni\n` +
    `Cooldown: ${guildSettings.cooldownSeconds} saniye\n` +
    `Eşleşme Modu: ${guildSettings.matchMode === 'HIGHEST_PRIORITY' ? 'Yalnızca En Yüksek Öncelikli Kural' : 'Tüm Uygun Roller'}\n` +
    `Log Kanalı: ${guildSettings.logChannelId ? `<#${guildSettings.logChannelId}>` : 'Ayarlanmadı'}\n` +
    `Bildirim Kanalı: ${guildSettings.notificationChannelId ? `<#${guildSettings.notificationChannelId}>` : 'Ayarlanmadı'} (${guildSettings.notificationMode})`
  ));
  container.addSeparatorComponents(new SeparatorBuilder());

  const satir1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customIdUret('ayar', 'toggle-sistem')).setLabel(guildSettings.enabled ? 'Sistemi Kapat' : 'Sistemi Aç').setStyle(guildSettings.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder().setCustomId(customIdUret('ayar', 'toggle-ekleme')).setLabel(guildSettings.autoRoleAdd ? 'Rol Eklemeyi Kapat' : 'Rol Eklemeyi Aç').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(customIdUret('ayar', 'toggle-kaldirma')).setLabel(guildSettings.autoRoleRemove ? 'Rol Kaldırmayı Kapat' : 'Rol Kaldırmayı Aç').setStyle(ButtonStyle.Secondary)
  );
  const satir2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customIdUret('ayar', 'toggle-mod')).setLabel('Eşleşme Modunu Değiştir').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(customIdUret('ayar', 'toggle-optout')).setLabel(guildSettings.optOutAllowed ? 'Opt-Out\'u Kapat' : 'Opt-Out\'u Aç').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(customIdUret('panel', 'ana')).setLabel('◀ Ana Panel').setStyle(ButtonStyle.Secondary)
  );
  container.addActionRowComponents(satir1, satir2);

  return container;
}

module.exports = { genelAyarlarPaneliOlustur };
