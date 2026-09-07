'use strict';

const { EmbedBuilder } = require('discord.js');
const stateManager = require('../core/stateManager');
const cooldownManager = require('../core/cooldownManager');
const logger = require('../core/logger');
const { actionTurkce } = require('../utils/formatters');

const BILDIRIM_COOLDOWN_MS = 3000;

function modeIzinVeriyorMu(mode, basarili, action) {
  if (mode === 'disabled' || !mode) return false;
  if (mode === 'all') return true;
  if (mode === 'errors') return !basarili;
  if (mode === 'important') return !basarili || action === 'ADD';
  return false;
}

async function kanalaGonder(guild, channelId, embed) {
  if (!channelId) return;
  try {
    const kanal = await guild.channels.fetch(channelId).catch(() => null);
    if (!kanal || !kanal.isTextBased()) return;
    await kanal.send({ embeds: [embed] });
  } catch (hata) {
    logger.hata('Bildirim kanalına mesaj gönderilemedi.', hata);
  }
}

async function rolIslemiBildir({ guild, guildSettings, member, role, action, source, basarili, hata }) {
  if (stateManager.killSwitch.bildirimler) return;
  if (!guildSettings?.notificationChannelId) return;
  const mode = guildSettings.notificationMode || 'disabled';
  if (!modeIzinVeriyorMu(mode, basarili, action)) return;

  const cooldownAnahtari = `bildirim:${guild.id}`;
  if (!cooldownManager.cooldownGectiMi(cooldownAnahtari, BILDIRIM_COOLDOWN_MS)) return;

  const embed = new EmbedBuilder()
    .setColor(basarili ? 0x57F287 : 0xED4245)
    .setTitle(basarili ? 'Rol İşlemi Gerçekleştirildi' : 'Rol İşlemi Başarısız')
    .addFields(
      { name: 'Kullanıcı', value: `<@${member.id}>`, inline: true },
      { name: 'Rol', value: `<@&${role.id}>`, inline: true },
      { name: 'İşlem', value: actionTurkce(action), inline: true },
      { name: 'Kaynak', value: source, inline: true }
    )
    .setTimestamp(new Date());

  if (!basarili && hata) {
    embed.addFields({ name: 'Hata', value: String(hata).slice(0, 1000) });
  }

  await kanalaGonder(guild, guildSettings.notificationChannelId, embed);
}

async function sistemUyarisiGonder(guild, guildSettings, baslik, aciklama) {
  if (!guildSettings?.notificationChannelId) return;
  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle(`⚠️ ${baslik}`)
    .setDescription(aciklama)
    .setTimestamp(new Date());
  await kanalaGonder(guild, guildSettings.notificationChannelId, embed);
}

module.exports = { rolIslemiBildir, sistemUyarisiGonder };
