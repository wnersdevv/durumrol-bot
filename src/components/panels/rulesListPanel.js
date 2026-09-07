'use strict';

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { kosulOzetle } = require('../../utils/formatters');
const { customIdUret } = require('../../utils/ids');
const { ruleListeSatirButonlari } = require('../buttons/ruleWizardButtons');

/**
 * Sayfalanmış kural listesi paneli. Her kural için ayrı bir satır bilgi +
 * altında Düzenle/Sil/Aç-Kapat/Test/Önizle butonları (Discord mesaj başına
 * en fazla 5 action row alabildiğinden, sayfa başına en fazla 4 kural gösterilir
 * — 1 satır navigasyon + üst bilgi için pay bırakılır).
 */
function kurallarListesiPaneliOlustur(kurallar, { sayfa = 0, sayfaBasi = 3 } = {}) {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent('## 📋 KURALLAR'));

  if (kurallar.length === 0) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent('Henüz hiç kural oluşturulmamış. "Kural Ekle" butonuyla başlayın.'));
    return { container, toplamSayfa: 1 };
  }

  const toplamSayfa = Math.max(1, Math.ceil(kurallar.length / sayfaBasi));
  const guncelSayfa = Math.min(Math.max(sayfa, 0), toplamSayfa - 1);
  const dilim = kurallar.slice(guncelSayfa * sayfaBasi, guncelSayfa * sayfaBasi + sayfaBasi);

  for (const kural of dilim) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**${kural.enabled ? '🟢' : '⚪'} ${kural.name}**\n` +
      `Rol: <@&${kural.roleId}> | Öncelik: ${kural.priority} | Action: ${kural.action}\n` +
      `Koşul: \`${kosulOzetle(kural.conditions)}\`\n` +
      `Eşleşme Sayısı: ${kural.eslesmeSayaci || 0}`
    ));
    container.addActionRowComponents(ruleListeSatirButonlari(kural._id.toString()));
  }

  container.addSeparatorComponents(new SeparatorBuilder());
  const navSatiri = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customIdUret('kurallar', 'sayfa', `${guncelSayfa - 1}`)).setLabel('◀ Önceki').setStyle(ButtonStyle.Secondary).setDisabled(guncelSayfa <= 0),
    new ButtonBuilder().setCustomId(customIdUret('kurallar', 'sayfa-bilgi')).setLabel(`Sayfa ${guncelSayfa + 1}/${toplamSayfa}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(customIdUret('kurallar', 'sayfa', `${guncelSayfa + 1}`)).setLabel('Sonraki ▶').setStyle(ButtonStyle.Secondary).setDisabled(guncelSayfa >= toplamSayfa - 1)
  );
  container.addActionRowComponents(navSatiri);

  return { container, toplamSayfa };
}

module.exports = { kurallarListesiPaneliOlustur };
