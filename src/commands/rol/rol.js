'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const roleSyncService = require('../../services/roleSyncService');
const guildSettingsService = require('../../services/guildSettingsService');
const roleConflictService = require('../../services/roleConflictService');
const permissionManager = require('../../core/permissionManager');
const { UygulamaHatasi } = require('../../core/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rol')
    .setDescription('Manuel rol yönetim komutları')
    .addSubcommand((sc) => sc.setName('ver').setDescription('Bir kullanıcıya rol verir')
      .addUserOption((o) => o.setName('kullanici').setDescription('Rol verilecek kullanıcı').setRequired(true))
      .addRoleOption((o) => o.setName('rol').setDescription('Verilecek rol').setRequired(true)))
    .addSubcommand((sc) => sc.setName('al').setDescription('Bir kullanıcıdan rol alır')
      .addUserOption((o) => o.setName('kullanici').setDescription('Rolü alınacak kullanıcı').setRequired(true))
      .addRoleOption((o) => o.setName('rol').setDescription('Alınacak rol').setRequired(true)))
    .addSubcommand((sc) => sc.setName('bilgi').setDescription('Bir rol hakkında bilgi gösterir')
      .addRoleOption((o) => o.setName('rol').setDescription('Bilgi alınacak rol').setRequired(true)))
    .addSubcommand((sc) => sc.setName('liste').setDescription('Bir kullanıcının rollerini listeler')
      .addUserOption((o) => o.setName('kullanici').setDescription('Kullanıcı (varsayılan: siz)').setRequired(false)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) return interaction.reply({ content: '❌ Bu komut yalnızca sunucularda kullanılabilir.', flags: MessageFlags.Ephemeral });
    const alt = interaction.options.getSubcommand();

    if (alt === 'ver' || alt === 'al') {
      if (!permissionManager.manuelRolIzniVarMi(interaction.member, interaction.options.getRole('rol', true))
        && !permissionManager.yetkiYeterliMi(interaction, permissionManager.YETKI_SEVIYELERI.MODERATOR)) {
        return interaction.reply({ content: '❌ Bu rolü yönetmek için yeterli izniniz veya rol hiyerarşiniz yok.', flags: MessageFlags.Ephemeral });
      }

      const kullanici = interaction.options.getUser('kullanici', true);
      const rol = interaction.options.getRole('rol', true);
      const uye = await guild.members.fetch(kullanici.id).catch(() => null);
      if (!uye) return interaction.reply({ content: '❌ Kullanıcı bu sunucuda bulunamadı.', flags: MessageFlags.Ephemeral });

      const guildSettings = await guildSettingsService.ayarlariGetir(guild.id);
      const action = alt === 'ver' ? 'ADD' : 'REMOVE';

      const sonuc = await roleSyncService.rolIslemiUygula({
        guild, member: uye, role: rol, action, source: 'MANUAL', actorId: interaction.user.id, guildSettings, oncelik: 'HIGH'
      });

      if (!sonuc.basarili) {
        return interaction.reply({ content: `❌ İşlem gerçekleştirilemedi: ${sonuc.sebep}`, flags: MessageFlags.Ephemeral });
      }

      // Rol bir SINGLE modlu gruba aitse, ekleme durumunda gruptaki diğer rolleri bilgilendirme amaçlı belirt
      const grup = roleConflictService.rolunGrubunuBul(rol.id, guildSettings.roleGroups || []);
      const grupNotu = (alt === 'ver' && grup?.mode === 'SINGLE') ? `\n_Not: Bu rol "${grup.name}" grubunda tek-seçim modunda; çakışan roller otomatik yönetilmez, gerekirse manuel kaldırın._` : '';

      return interaction.reply({ content: `✅ <@${kullanici.id}> için <@&${rol.id}> rolü ${alt === 'ver' ? 'verildi' : 'alındı'}.${grupNotu}`, flags: MessageFlags.Ephemeral });
    }

    if (alt === 'bilgi') {
      const rol = interaction.options.getRole('rol', true);
      const guildSettings = await guildSettingsService.ayarlariGetir(guild.id);
      const korumali = guildSettings.protectedRoles.includes(rol.id);
      const grup = roleConflictService.rolunGrubunuBul(rol.id, guildSettings.roleGroups || []);
      return interaction.reply({
        content: `**Rol Bilgisi — ${rol.name}**\n` +
          `ID: \`${rol.id}\`\nRenk: ${rol.hexColor}\nPozisyon: ${rol.position}\nÜye Sayısı: ${rol.members.size}\n` +
          `Korumalı: ${korumali ? 'Evet' : 'Hayır'}\nGrup: ${grup ? `${grup.name} (${grup.mode})` : 'Yok'}\nDiscord Tarafından Yönetiliyor: ${rol.managed ? 'Evet' : 'Hayır'}`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (alt === 'liste') {
      const kullanici = interaction.options.getUser('kullanici') || interaction.user;
      const uye = await guild.members.fetch(kullanici.id).catch(() => null);
      if (!uye) return interaction.reply({ content: '❌ Kullanıcı bu sunucuda bulunamadı.', flags: MessageFlags.Ephemeral });
      const roller = uye.roles.cache.filter((r) => r.id !== guild.id).sort((a, b) => b.position - a.position);
      const liste = roller.size ? roller.map((r) => `<@&${r.id}>`).join(', ') : 'Hiç rolü yok.';
      return interaction.reply({ content: `**${kullanici.tag} — Roller (${roller.size})**\n${liste}`, flags: MessageFlags.Ephemeral });
    }
  }
};
