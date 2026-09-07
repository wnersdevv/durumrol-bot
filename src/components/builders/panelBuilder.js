'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorSpacingSize
} = require('discord.js');
const { customIdUret } = require('../../utils/ids');
const { tarihiTurkceFormatla } = require('../../utils/time');

/**
 * Ana Kontrol Merkezi panelini (Components V2 Container) oluşturur.
 * Mesaj gönderilirken flags: [MessageFlags.IsComponentsV2] kullanılmalıdır.
 */
function anaPanelOlustur({ guildAdi, sistemDurumu, aktifKuralSayisi, yonetilenRolSayisi, islenenKullaniciSayisi, sonSenkronizasyon }) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('## 🛡️ WNERSDEV DURUM & ROL KONTROL MERKEZİ')
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`**Sunucu:** ${guildAdi}\n**Sistem Durumu:** ${sistemDurumu ? '🟢 Aktif' : '🔴 Devre Dışı'}`)
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `📋 **Aktif Kural Sayısı:** ${aktifKuralSayisi}\n` +
      `🎭 **Yönetilen Rol Sayısı:** ${yonetilenRolSayisi}\n` +
      `👥 **İşlenen Kullanıcı:** ${islenenKullaniciSayisi}\n` +
      `🔄 **Son Senkronizasyon:** ${sonSenkronizasyon ? tarihiTurkceFormatla(sonSenkronizasyon) : 'Henüz yapılmadı'}`
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const satir1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customIdUret('panel', 'genel-ayarlar')).setLabel('Genel Ayarlar').setStyle(ButtonStyle.Secondary).setEmoji('⚙️'),
    new ButtonBuilder().setCustomId(customIdUret('panel', 'kurallar')).setLabel('Kurallar').setStyle(ButtonStyle.Primary).setEmoji('📋'),
    new ButtonBuilder().setCustomId(customIdUret('panel', 'kural-ekle')).setLabel('Kural Ekle').setStyle(ButtonStyle.Success).setEmoji('➕'),
    new ButtonBuilder().setCustomId(customIdUret('panel', 'roller')).setLabel('Roller').setStyle(ButtonStyle.Secondary).setEmoji('🎭')
  );
  const satir2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customIdUret('panel', 'kullanicilar')).setLabel('Kullanıcılar').setStyle(ButtonStyle.Secondary).setEmoji('👥'),
    new ButtonBuilder().setCustomId(customIdUret('panel', 'istisnalar')).setLabel('İstisnalar').setStyle(ButtonStyle.Secondary).setEmoji('🚫'),
    new ButtonBuilder().setCustomId(customIdUret('panel', 'loglar')).setLabel('Loglar').setStyle(ButtonStyle.Secondary).setEmoji('📜'),
    new ButtonBuilder().setCustomId(customIdUret('panel', 'istatistik')).setLabel('İstatistik').setStyle(ButtonStyle.Secondary).setEmoji('📊')
  );
  const satir3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customIdUret('panel', 'sistem-durumu')).setLabel('Sistem Durumu').setStyle(ButtonStyle.Danger).setEmoji('🩺')
  );

  container.addActionRowComponents(satir1, satir2, satir3);

  return container;
}

module.exports = { anaPanelOlustur };
