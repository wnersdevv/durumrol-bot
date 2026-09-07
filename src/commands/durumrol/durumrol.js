'use strict';

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  AttachmentBuilder
} = require('discord.js');

const guildSettingsService = require('../../services/guildSettingsService');
const roleRuleService = require('../../services/roleRuleService');
const statusService = require('../../services/statusService');
const statsService = require('../../services/statsService');
const userPreferenceService = require('../../services/userPreferenceService');
const logRepository = require('../../database/repositories/logRepository');
const permissionManager = require('../../core/permissionManager');
const { discordIdGecerliMi } = require('../../utils/ids');
const { kosulOzetle, bayrakEmoji } = require('../../utils/formatters');
const { anaPaneliGonder } = require('../../events/interactionCreate');
const { kurallarListesiPaneliOlustur } = require('../../components/panels/rulesListPanel');
const { istatistikPaneliOlustur } = require('../../components/panels/statsPanel');
const { ilkKurulumuCalistir } = require('../yonetim/guildKurulumSihirbazi');
const { kurallariDisaAktar, kurallariIceAktar } = require('../yonetim/exportImport');
const { UygulamaHatasi } = require('../../core/errorHandler');

function yetkiKontrolEt(interaction, gerekliSeviye) {
  if (!permissionManager.yetkiYeterliMi(interaction, gerekliSeviye)) {
    const isim = permissionManager.yetkiSeviyesiIsmi(gerekliSeviye);
    throw new UygulamaHatasi(`Bu işlem için en az **${isim}** yetkisi gerekli.`, { kod: 'YETKI_YETERSIZ', kalici: true });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('durumrol')
    .setDescription('WNERSDEV Durum & Rol sistemi yönetim komutları')
    .addSubcommand((sc) => sc.setName('panel').setDescription('Kontrol Merkezi panelini açar'))
    .addSubcommand((sc) => sc.setName('kur').setDescription('İlk kurulum sihirbazını çalıştırır')
      .addChannelOption((o) => o.setName('log-kanali').setDescription('Log/bildirim kanalı').setRequired(false)))
    .addSubcommand((sc) => sc.setName('ac').setDescription('Durum & Rol sistemini bu sunucuda etkinleştirir'))
    .addSubcommand((sc) => sc.setName('kapat').setDescription('Durum & Rol sistemini bu sunucuda devre dışı bırakır'))
    .addSubcommand((sc) => sc.setName('durum').setDescription('Sistemin bu sunucudaki mevcut durumunu gösterir'))
    .addSubcommand((sc) => sc.setName('kurallar').setDescription('Kural listesini gösterir'))
    .addSubcommand((sc) => sc.setName('senkronize').setDescription('Tüm uygun üyeleri kuyruk üzerinden yeniden değerlendirir'))
    .addSubcommand((sc) => sc.setName('kullanici-tara').setDescription('Belirli bir kullanıcıyı yeniden değerlendirir')
      .addUserOption((o) => o.setName('kullanici').setDescription('Taranacak kullanıcı').setRequired(true)))
    .addSubcommand((sc) => sc.setName('test').setDescription('Gerçek rol değişikliği yapmadan kural sonuçlarını gösterir')
      .addUserOption((o) => o.setName('kullanici').setDescription('Test edilecek kullanıcı (varsayılan: siz)').setRequired(false)))
    .addSubcommand((sc) => sc.setName('istatistik').setDescription('Sunucu istatistiklerini gösterir'))
    .addSubcommand((sc) => sc.setName('loglar').setDescription('Rol işlem loglarını filtreleyerek listeler')
      .addUserOption((o) => o.setName('kullanici').setDescription('Kullanıcıya göre filtrele').setRequired(false))
      .addStringOption((o) => o.setName('rol-id').setDescription('Rol ID\'sine göre filtrele').setRequired(false))
      .addStringOption((o) => o.setName('islem').setDescription('ADD veya REMOVE').addChoices({ name: 'ADD', value: 'ADD' }, { name: 'REMOVE', value: 'REMOVE' }).setRequired(false))
      .addBooleanOption((o) => o.setName('basarili').setDescription('Yalnızca başarılı/başarısız işlemler').setRequired(false)))
    .addSubcommandGroup((g) => g.setName('istisnalar').setDescription('Otomatik sistemden istisna tutulan kullanıcı/roller')
      .addSubcommand((sc) => sc.setName('kullanici-ekle').setDescription('Kullanıcıyı otomatik sistemden hariç tutar')
        .addUserOption((o) => o.setName('kullanici').setDescription('Hariç tutulacak kullanıcı').setRequired(true)))
      .addSubcommand((sc) => sc.setName('kullanici-cikar').setDescription('Kullanıcıyı istisna listesinden çıkarır')
        .addUserOption((o) => o.setName('kullanici').setDescription('Listeden çıkarılacak kullanıcı').setRequired(true)))
      .addSubcommand((sc) => sc.setName('listele').setDescription('İstisna kullanıcı/rolleri listeler')))
    .addSubcommand((sc) => sc.setName('tercihlerim').setDescription('Kendi otomatik durum rolü tercihinizi (opt-in/opt-out) yönetin')
      .addStringOption((o) => o.setName('secim').setDescription('opt-out veya opt-in').setRequired(true)
        .addChoices({ name: 'Opt-Out (Çık)', value: 'opt-out' }, { name: 'Opt-In (Katıl)', value: 'opt-in' })))
    .addSubcommand((sc) => sc.setName('disa-aktar').setDescription('Sunucu kurallarını JSON olarak dışa aktarır'))
    .addSubcommand((sc) => sc.setName('ice-aktar').setDescription('Daha önce dışa aktarılmış bir kural dosyasını içe aktarır')
      .addAttachmentOption((o) => o.setName('dosya').setDescription('JSON kural dosyası').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const alt = interaction.options.getSubcommand();
    const grup = interaction.options.getSubcommandGroup(false);
    const guild = interaction.guild;

    if (!guild) {
      return interaction.reply({ content: '❌ Bu komut yalnızca sunucularda kullanılabilir.', flags: MessageFlags.Ephemeral });
    }

    try {
      if (grup === 'istisnalar') {
        yetkiKontrolEt(interaction, permissionManager.YETKI_SEVIYELERI.ADMIN);
        return istisnalarIsle(interaction, alt, guild);
      }

      switch (alt) {
        case 'panel':
          yetkiKontrolEt(interaction, permissionManager.YETKI_SEVIYELERI.ADMIN);
          return anaPaneliGonder(interaction, guild);

        case 'kur': {
          yetkiKontrolEt(interaction, permissionManager.YETKI_SEVIYELERI.ADMIN);
          const logKanali = interaction.options.getChannel('log-kanali');
          await ilkKurulumuCalistir(guild.id, interaction.user.id, {
            logChannelId: logKanali?.id,
            notificationMode: logKanali ? 'important' : undefined
          });
          return interaction.reply({ content: `✅ İlk kurulum tamamlandı. Sistem etkinleştirildi.${logKanali ? ` Log kanalı: <#${logKanali.id}>` : ' Log kanalı ayarlanmadı, dilerseniz Genel Ayarlar panelinden ekleyebilirsiniz.'}\nKuralları eklemek için \`/durumrol panel\` komutunu kullanın.`, flags: MessageFlags.Ephemeral });
        }

        case 'ac':
          yetkiKontrolEt(interaction, permissionManager.YETKI_SEVIYELERI.ADMIN);
          await guildSettingsService.ayarlariGuncelle(guild.id, { enabled: true }, interaction.user.id);
          return interaction.reply({ content: '✅ Durum & Rol sistemi etkinleştirildi.', flags: MessageFlags.Ephemeral });

        case 'kapat':
          yetkiKontrolEt(interaction, permissionManager.YETKI_SEVIYELERI.ADMIN);
          await guildSettingsService.ayarlariGuncelle(guild.id, { enabled: false }, interaction.user.id);
          return interaction.reply({ content: '⛔ Durum & Rol sistemi devre dışı bırakıldı.', flags: MessageFlags.Ephemeral });

        case 'durum': {
          const ayarlar = await guildSettingsService.ayarlariGetir(guild.id);
          return interaction.reply({
            content: `**WNERSDEV Durum & Rol — Sunucu Durumu**\n` +
              `${bayrakEmoji(ayarlar.enabled)} Sistem Etkin\n` +
              `${bayrakEmoji(ayarlar.autoRoleAdd)} Otomatik Rol Ekleme\n` +
              `${bayrakEmoji(ayarlar.autoRoleRemove)} Otomatik Rol Kaldırma\n` +
              `Cooldown: ${ayarlar.cooldownSeconds}sn\n` +
              `Eşleşme Modu: ${ayarlar.matchMode}\n` +
              `Kurulum Tamamlandı: ${ayarlar.setupTamamlandi ? 'Evet' : 'Hayır'}`,
            flags: MessageFlags.Ephemeral
          });
        }

        case 'kurallar': {
          const kurallar = await roleRuleService.kurallariGetir(guild.id, { sadeceAktif: false });
          const { container } = kurallarListesiPaneliOlustur(kurallar, { sayfa: 0 });
          return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        case 'senkronize': {
          yetkiKontrolEt(interaction, permissionManager.YETKI_SEVIYELERI.ADMIN);
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const uyeler = await guild.members.fetch();
          let islenen = 0;
          for (const [, uye] of uyeler) {
            if (uye.user.bot) continue;
            const sonuc = await statusService.kullaniciyiYenidenTara(guild, uye, { oncelik: 'LOW', cooldownAtla: true });
            if (!sonuc.atlandi) islenen += 1;
          }
          return interaction.editReply({ content: `✅ Senkronizasyon tamamlandı. ${islenen} üye işlendi (kuyruk üzerinden rate-limit korumalı şekilde).` });
        }

        case 'kullanici-tara': {
          yetkiKontrolEt(interaction, permissionManager.YETKI_SEVIYELERI.MODERATOR);
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const kullanici = interaction.options.getUser('kullanici', true);
          const uye = await guild.members.fetch(kullanici.id).catch(() => null);
          if (!uye) return interaction.editReply({ content: '❌ Kullanıcı bu sunucuda bulunamadı.' });
          const sonuc = await statusService.kullaniciyiYenidenTara(guild, uye);
          return interaction.editReply({ content: sonuc.atlandi ? `Tarama atlandı: ${sonuc.sebep}` : '✅ Kullanıcı yeniden tarandı ve gerekli roller uygulandı.' });
        }

        case 'test': {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const kullanici = interaction.options.getUser('kullanici') || interaction.user;
          const uye = await guild.members.fetch(kullanici.id).catch(() => null);
          if (!uye) return interaction.editReply({ content: '❌ Kullanıcı bu sunucuda bulunamadı.' });
          const sonuc = await statusService.kullaniciyiYenidenTara(guild, uye, { testModu: true });
          if (sonuc.atlandi) return interaction.editReply({ content: `Test atlandı: ${sonuc.sebep}` });
          const satirlar = sonuc.degerlendirmeSonuclari.map((s) =>
            `${s.eslesti ? '✅' : '❌'} **${s.ruleName}** — ${s.uygulanacak ? `${s.action} uygulanacak` : 'işlem yok'}`
          );
          return interaction.editReply({
            content: `**Test Sonuçları — ${kullanici.tag}**\n_Gerçek rol değişikliği yapılmadı._\n\n${satirlar.join('\n') || 'Değerlendirilecek aktif kural yok.'}`
          });
        }

        case 'istatistik': {
          const istatistik = await statsService.guildIstatistikleriGetir(guild.id);
          return interaction.reply({ components: [istatistikPaneliOlustur(istatistik)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        case 'loglar': {
          yetkiKontrolEt(interaction, permissionManager.YETKI_SEVIYELERI.MODERATOR);
          const kullanici = interaction.options.getUser('kullanici');
          const roleId = interaction.options.getString('rol-id');
          const islem = interaction.options.getString('islem');
          const basarili = interaction.options.getBoolean('basarili');
          const kayitlar = await logRepository.rolIslemleriFiltrele(guild.id, {
            userId: kullanici?.id, roleId, action: islem, success: basarili === null ? undefined : basarili
          }, { limit: 15 });
          if (kayitlar.length === 0) {
            return interaction.reply({ content: 'Filtreye uyan log kaydı bulunamadı.', flags: MessageFlags.Ephemeral });
          }
          const metin = kayitlar.map((k) =>
            `${bayrakEmoji(k.success)} \`${new Date(k.timestamp).toLocaleString('tr-TR')}\` <@${k.targetUserId}> — ${k.action} <@&${k.roleId}> (${k.source})`
          ).join('\n');
          return interaction.reply({ content: `**Rol İşlem Logları (son ${kayitlar.length})**\n${metin}`, flags: MessageFlags.Ephemeral });
        }

        case 'tercihlerim': {
          const secim = interaction.options.getString('secim', true);
          const ayarlar = await guildSettingsService.ayarlariGetir(guild.id);
          if (secim === 'opt-out') {
            await userPreferenceService.optOutYap(guild.id, interaction.user.id, ayarlar);
            return interaction.reply({ content: '✅ Otomatik durum rollerinden çıkarıldınız (opt-out). Artık presence\'ınıza göre otomatik rol verilmeyecek/alınmayacak.', flags: MessageFlags.Ephemeral });
          }
          await userPreferenceService.optInYap(guild.id, interaction.user.id);
          return interaction.reply({ content: '✅ Otomatik durum rolü sistemine tekrar dahil oldunuz (opt-in).', flags: MessageFlags.Ephemeral });
        }

        case 'disa-aktar': {
          yetkiKontrolEt(interaction, permissionManager.YETKI_SEVIYELERI.ADMIN);
          const veri = await kurallariDisaAktar(guild.id);
          const buffer = Buffer.from(JSON.stringify(veri, null, 2), 'utf8');
          const dosya = new AttachmentBuilder(buffer, { name: `wnersdev-kurallar-${guild.id}.json` });
          return interaction.reply({ content: `✅ ${veri.kurallar.length} kural dışa aktarıldı. Bu dosya credential/token içermez.`, files: [dosya], flags: MessageFlags.Ephemeral });
        }

        case 'ice-aktar': {
          yetkiKontrolEt(interaction, permissionManager.YETKI_SEVIYELERI.ADMIN);
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const dosya = interaction.options.getAttachment('dosya', true);
          if (!dosya.name.endsWith('.json')) {
            return interaction.editReply({ content: '❌ Yalnızca .json dosyaları içe aktarılabilir.' });
          }
          const yanit = await fetch(dosya.url);
          const metin = await yanit.text();
          let veri;
          try {
            veri = JSON.parse(metin);
          } catch (_hata) {
            return interaction.editReply({ content: '❌ Dosya geçerli bir JSON değil.' });
          }
          const sonuc = await kurallariIceAktar(guild.id, veri, interaction.user.id, {
            roleIdGecerliMi: (roleId) => discordIdGecerliMi(roleId) && guild.roles.cache.has(roleId)
          });
          return interaction.editReply({
            content: `✅ İçe aktarma tamamlandı: ${sonuc.basarili} başarılı, ${sonuc.basarisiz} başarısız.` +
              (sonuc.hatalar.length ? `\n\nHatalar:\n${sonuc.hatalar.slice(0, 10).join('\n')}` : '')
          });
        }

        default:
          return interaction.reply({ content: '❌ Bilinmeyen alt komut.', flags: MessageFlags.Ephemeral });
      }
    } catch (hata) {
      if (hata instanceof UygulamaHatasi) {
        const yanit = { content: `❌ ${hata.message}`, flags: MessageFlags.Ephemeral };
        return interaction.deferred || interaction.replied ? interaction.editReply(yanit) : interaction.reply(yanit);
      }
      throw hata;
    }
  }
};

async function istisnalarIsle(interaction, alt, guild) {
  const guildSettingsService = require('../../services/guildSettingsService');
  if (alt === 'kullanici-ekle') {
    const kullanici = interaction.options.getUser('kullanici', true);
    await guildSettingsService.istisnaKullaniciEkle(guild.id, kullanici.id, interaction.user.id);
    return interaction.reply({ content: `✅ <@${kullanici.id}> otomatik sistemden hariç tutuldu.`, flags: MessageFlags.Ephemeral });
  }
  if (alt === 'kullanici-cikar') {
    const kullanici = interaction.options.getUser('kullanici', true);
    await guildSettingsService.istisnaKullaniciCikar(guild.id, kullanici.id, interaction.user.id);
    return interaction.reply({ content: `✅ <@${kullanici.id}> istisna listesinden çıkarıldı.`, flags: MessageFlags.Ephemeral });
  }
  if (alt === 'listele') {
    const ayarlar = await guildSettingsService.ayarlariGetir(guild.id);
    const kullanicilar = ayarlar.ignoredUsers.length ? ayarlar.ignoredUsers.map((id) => `<@${id}>`).join(', ') : 'Yok';
    const roller = ayarlar.ignoredRoles.length ? ayarlar.ignoredRoles.map((id) => `<@&${id}>`).join(', ') : 'Yok';
    return interaction.reply({ content: `**İstisna Kullanıcılar:** ${kullanicilar}\n**İstisna Roller:** ${roller}`, flags: MessageFlags.Ephemeral });
  }
}
