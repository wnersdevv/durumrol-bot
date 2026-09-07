'use strict';

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { customIdUret } = require('../../utils/ids');

function ruleValueModalOlustur(conditionType) {
  const modal = new ModalBuilder()
    .setCustomId(customIdUret('wizard', 'deger'))
    .setTitle('Kural Ekle (3/3) - Koşul Değeri');

  const degerInput = new TextInputBuilder()
    .setCustomId('value')
    .setLabel(`Değer (${conditionType})`)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(256)
    .setPlaceholder('Örn: VALORANT, WNERSDEV, spotify sanatçı adı vb.');

  modal.addComponents(new ActionRowBuilder().addComponents(degerInput));
  return modal;
}

module.exports = { ruleValueModalOlustur };
