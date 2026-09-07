'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const configManager = require('../../core/configManager');
const stateManager = require('../../core/stateManager');
const healthService = require('../../services/healthService');
const statsService = require('../../services/statsService');
const permissionManager = require('../../core/permissionManager');
const auditService = require('../../services/auditService');
const { saglikPaneliOlustur, istatistikPaneliOlustur } = require('../../components/panels/statsPanel');
const { UygulamaHatasi } = require('../../core/errorHandler');

const KILL_SWITCH_SECENEKLERI = [
  { name: 'Otomatik Rol Ekleme', value: 'otomatikRolEkleme' },
  { name: 'Otomatik Rol Kaldırma', value: 'otomatikRolKaldirma' },
  { name: 'Presence İşleme', value: 'presenceIsleme' },
  { name: 'Reconciliation', value: 'reconciliation' },
  { name: 'Bildirimler', value: 'bildirimler' }
];

function yetkiKontrolEt(interaction, gerekliSeviye) {
  if (!permissionManager.yetkiYeterliMi(interaction, gerekliSeviye)) {
    const isim = permissionManager.yetkiSeviyesiIsmi(gerekliSeviye);
    throw new UygulamaHatasi(`Bu işlem için en az **${isim}** yetkisi gerekli.`, { kod: 'YETKI_YETERSIZ', kalici: true });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sistem')
    .setDescription('Bot geneli sistem yönetim komutları')
    .addSubcommand((sc) => sc.setName('durum').setDescription('Botun genel sağlık durumunu gösterir'))
    .addSubcommand((sc) => sc.setName('istatistik').setDescription('Bu sunucunun istatistiklerini gösterir'))
    .addSubcommand((sc) => sc.setName('config-yenile').setDescription('ayarlar.json dosyasını yeniden yükler (OWNER)'))
    .addSubcommand((sc) => sc.setName('bakim').setDescription('Bakım modunu (presence işleme durdurma) aç/kapat yapar (OWNER)')
      .addBooleanOption((o) => o.setName('aktif').setDescription('true: bakım modunu aç, false: kapat').setRequired(true)))
    .addSubcommand((sc) => sc.setName('kill-switch').setDescription('Belirli bir alt sistemi tamamen kapatır/açar (OWNER)')
      .addStringOption((o) => o.setName('anahtar').setDescription('Kapatılacak/açılacak alt sistem').setRequired(true).addChoices(...KILL_SWITCH_SECENEKLERI))
      .addBooleanOption((o) => o.setName('deger').setDescription('true: kapat, false: aç').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const alt = interaction.options.getSubcommand();

    try {
      switch (alt) {
        case 'durum': {
          const saglik = healthService.saglikRaporuOlustur(interaction.client);
          return interaction.reply({ components: [saglikPaneliOlustur(saglik)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        case 'istatistik': {
          if (!interaction.guild) return interaction.reply({ content: '❌ Bu alt komut yalnızca sunucularda kullanılabilir.', flags: MessageFlags.Ephemeral });
          const istatistik = await statsService.guildIstatistikleriGetir(interaction.guild.id);
          return interaction.reply({ components: [istatistikPaneliOlustur(istatistik)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        case 'config-yenile': {
          yetkiKontrolEt(interaction, permissionManager.YETKI_SEVIYELERI.OWNER);
          const oncekiDurum = configManager.durum();
          configManager.yukle();
          const guncelDurum = configManager.durum();
          await auditService.kaydet(interaction.guild?.id || 'GLOBAL', interaction.user.id, 'CONFIG_YENILENDI', '', { oncekiDurum, guncelDurum });
          return interaction.reply({
            content: guncelDurum === 'GECERLI'
              ? '✅ Config başarıyla yeniden yüklendi.'
              : `⚠️ Yeni config geçersiz veya eksik (${guncelDurum}). ${oncekiDurum === 'GECERLI' ? 'Önceki çalışan config korunuyor, bot çökmedi.' : 'Varsayılan değerlerle devam ediliyor.'}`,
            flags: MessageFlags.Ephemeral
          });
        }

        case 'bakim': {
          yetkiKontrolEt(interaction, permissionManager.YETKI_SEVIYELERI.OWNER);
          const aktif = interaction.options.getBoolean('aktif', true);
          stateManager.killSwitchAyarla('presenceIsleme', aktif);
          await auditService.kaydet(interaction.guild?.id || 'GLOBAL', interaction.user.id, 'BAKIM_MODU_DEGISTI', '', { aktif });
          return interaction.reply({ content: aktif ? '🛠️ Bakım modu etkinleştirildi: presence işleme durduruldu.' : '✅ Bakım modu kapatıldı, presence işleme devam ediyor.', flags: MessageFlags.Ephemeral });
        }

        case 'kill-switch': {
          yetkiKontrolEt(interaction, permissionManager.YETKI_SEVIYELERI.OWNER);
          const anahtar = interaction.options.getString('anahtar', true);
          const deger = interaction.options.getBoolean('deger', true);
          stateManager.killSwitchAyarla(anahtar, deger);
          await auditService.kaydet(interaction.guild?.id || 'GLOBAL', interaction.user.id, 'KILL_SWITCH_DEGISTI', anahtar, { deger });
          return interaction.reply({ content: `${deger ? '⛔' : '✅'} \`${anahtar}\` ${deger ? 'kapatıldı' : 'açıldı'}.`, flags: MessageFlags.Ephemeral });
        }

        default:
          return interaction.reply({ content: '❌ Bilinmeyen alt komut.', flags: MessageFlags.Ephemeral });
      }
    } catch (hata) {
      if (hata instanceof UygulamaHatasi) {
        return interaction.reply({ content: `❌ ${hata.message}`, flags: MessageFlags.Ephemeral });
      }
      throw hata;
    }
  }
};
