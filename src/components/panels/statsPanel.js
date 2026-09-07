'use strict';

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { customIdUret } = require('../../utils/ids');

function istatistikPaneliOlustur(istatistik) {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent('## 📊 İSTATİSTİK'));
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `**Toplam Kural:** ${istatistik.toplamKural}\n` +
    `**Aktif Kural:** ${istatistik.aktifKural}\n` +
    `**Otomatik Rol Sayısı:** ${istatistik.otomatikRolSayisi}\n` +
    `**Bugün Verilen Roller:** ${istatistik.bugunVerilen}\n` +
    `**Bugün Alınan Roller:** ${istatistik.bugunAlinan}\n` +
    `**Başarısız İşlemler:** ${istatistik.basarisizIslem}\n` +
    `**En Çok Eşleşen Kural:** ${istatistik.enCokEslesenKuralId ? `\`${istatistik.enCokEslesenKuralId}\` (${istatistik.enCokEslesenKuralSayisi} eşleşme)` : 'Veri yok'}\n` +
    `**En Çok Verilen Rol:** ${istatistik.enCokVerilenRolId ? `<@&${istatistik.enCokVerilenRolId}> (${istatistik.enCokVerilenRolSayisi} kez)` : 'Veri yok'}`
  ));
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addActionRowComponents(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customIdUret('panel', 'ana')).setLabel('◀ Ana Panel').setStyle(ButtonStyle.Secondary)
  ));
  return container;
}

function saglikPaneliOlustur(saglik) {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent('## 🩺 SİSTEM DURUMU'));
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${saglik.discord.baglı ? '🟢' : '🔴'} Discord (ping: ${saglik.discord.ping ?? '-'}ms, ${saglik.discord.guildSayisi} sunucu)\n` +
    `${saglik.mongoDB.baglı ? '🟢' : '🔴'} MongoDB\n` +
    `${saglik.presenceListener.aktif ? '🟢' : '🔴'} Presence Listener\n` +
    `${saglik.roleQueue.uzunluk === 0 ? '🟢' : '🟡'} Role Queue (uzunluk: ${saglik.roleQueue.uzunluk})\n` +
    `${saglik.reconciliation.aktif ? '🟢' : '🔴'} Reconciliation\n` +
    `${saglik.ruleEngine.aktif ? '🟢' : '🔴'} Rule Engine\n\n` +
    `**Uptime:** ${saglik.uptime}\n` +
    `**Bellek:** RSS ${saglik.bellek.rss} / Heap ${saglik.bellek.heapUsed}\n` +
    `**CPU Yük Ortalaması:** ${saglik.cpu.yukOrtalamasi}\n` +
    `**Son Rol İşlemi:** ${saglik.sonRolIslemi ? `${saglik.sonRolIslemi.action} - ${new Date(saglik.sonRolIslemi.zaman).toLocaleString('tr-TR')}` : 'Yok'}\n` +
    `**Son Hata:** ${saglik.sonHata ? `${saglik.sonHata.mesaj}` : 'Yok'}`
  ));
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addActionRowComponents(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customIdUret('panel', 'ana')).setLabel('◀ Ana Panel').setStyle(ButtonStyle.Secondary)
  ));
  return container;
}

module.exports = { istatistikPaneliOlustur, saglikPaneliOlustur };
