'use strict';

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { customIdUret } = require('../../utils/ids');

function ruleBasicModalOlustur() {
  const modal = new ModalBuilder()
    .setCustomId(customIdUret('wizard', 'temel'))
    .setTitle('Kural Ekle (1/3) - Temel Bilgiler');

  const adInput = new TextInputBuilder()
    .setCustomId('name')
    .setLabel('Kural Adı')
    .setStyle(TextInputStyle.Short)
    .setMinLength(2)
    .setMaxLength(100)
    .setRequired(true)
    .setPlaceholder('Örn: Valorant Oynayanlar');

  const rolInput = new TextInputBuilder()
    .setCustomId('roleId')
    .setLabel('Rol ID')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('Rolün Discord ID\'sini yapıştırın (Rolü sağ tıklayıp ID Kopyala)');

  const oncelikInput = new TextInputBuilder()
    .setCustomId('priority')
    .setLabel('Öncelik (sayı, büyük = önce değerlendirilir)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder('0');

  const actionInput = new TextInputBuilder()
    .setCustomId('action')
    .setLabel('Action (ADD / REMOVE / SYNC)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue('ADD');

  modal.addComponents(
    new ActionRowBuilder().addComponents(adInput),
    new ActionRowBuilder().addComponents(rolInput),
    new ActionRowBuilder().addComponents(oncelikInput),
    new ActionRowBuilder().addComponents(actionInput)
  );

  return modal;
}

module.exports = { ruleBasicModalOlustur };
