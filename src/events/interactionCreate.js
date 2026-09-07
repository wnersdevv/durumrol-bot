'use strict';

const { MessageFlags } = require('discord.js');
const logger = require('../core/logger');
const { customIdCoz } = require('../utils/ids');
const { UygulamaHatasi } = require('../core/errorHandler');

const guildSettingsService = require('../services/guildSettingsService');
const roleRuleService = require('../services/roleRuleService');
const statsService = require('../services/statsService');
const healthService = require('../services/healthService');
const statusService = require('../services/statusService');
const ruleWizardService = require('../services/ruleWizardService');
const permissionManager = require('../core/permissionManager');

const { anaPanelOlustur } = require('../components/builders/panelBuilder');
const { genelAyarlarPaneliOlustur } = require('../components/panels/generalSettingsPanel');
const { kurallarListesiPaneliOlustur } = require('../components/panels/rulesListPanel');
const { istatistikPaneliOlustur, saglikPaneliOlustur } = require('../components/panels/statsPanel');
const { ruleBasicModalOlustur } = require('../components/modals/ruleBasicModal');
const { ruleValueModalOlustur } = require('../components/modals/ruleValueModal');
const { ruleConditionSelectOlustur } = require('../components/selects/ruleConditionSelect');
const { ozetOnayButonlari, ruleConditionDegistirSatiri } = require('../components/buttons/ruleWizardButtons');
const { kosulOzetle } = require('../utils/formatters');

async function anaPaneliGonder(interaction, guild) {
  const guildSettings = await guildSettingsService.ayarlariGetir(guild.id);
  const kurallar = await roleRuleService.kurallariGetir(guild.id, { sadeceAktif: true });
  const yonetilenRolSeti = new Set(kurallar.map((k) => k.roleId));
  const container = anaPanelOlustur({
    guildAdi: guild.name,
    sistemDurumu: guildSettings.enabled,
    aktifKuralSayisi: kurallar.length,
    yonetilenRolSayisi: yonetilenRolSeti.size,
    islenenKullaniciSayisi: guild.memberCount,
    sonSenkronizasyon: null
  });
  const gonderFonksiyonu = interaction.deferred || interaction.replied ? interaction.editReply.bind(interaction) : interaction.reply.bind(interaction);
  await gonderFonksiyonu({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

async function butonYonlendir(interaction) {
  const { alan, eylem, ekVeri } = customIdCoz(interaction.customId);
  const guild = interaction.guild;
  if (!guild) return;

  if (!permissionManager.yetkiYeterliMi(interaction, permissionManager.YETKI_SEVIYELERI.ADMIN)) {
    return interaction.reply({ content: '❌ Bu işlem için yetkiniz yok (ADMIN gerekli).', flags: MessageFlags.Ephemeral });
  }

  if (alan === 'panel') {
    await interaction.deferUpdate();
    if (eylem === 'ana') return anaPaneliGonder(interaction, guild);
    if (eylem === 'genel-ayarlar') {
      const ayarlar = await guildSettingsService.ayarlariGetir(guild.id);
      return interaction.editReply({ components: [genelAyarlarPaneliOlustur(ayarlar)], flags: MessageFlags.IsComponentsV2 });
    }
    if (eylem === 'kurallar') {
      const kurallar = await roleRuleService.kurallariGetir(guild.id, { sadeceAktif: false });
      const { container } = kurallarListesiPaneliOlustur(kurallar, { sayfa: 0 });
      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
    if (eylem === 'kural-ekle') {
      ruleWizardService.baslat(guild.id, interaction.user.id);
      return interaction.followUp({ content: 'Kural ekleme sihirbazını açmak için aşağıdaki butona basın.', flags: MessageFlags.Ephemeral });
    }
    if (eylem === 'istatistik') {
      const istatistik = await statsService.guildIstatistikleriGetir(guild.id);
      return interaction.editReply({ components: [istatistikPaneliOlustur(istatistik)], flags: MessageFlags.IsComponentsV2 });
    }
    if (eylem === 'sistem-durumu') {
      const saglik = healthService.saglikRaporuOlustur(interaction.client);
      return interaction.editReply({ components: [saglikPaneliOlustur(saglik)], flags: MessageFlags.IsComponentsV2 });
    }
    return interaction.followUp({ content: 'Bu panel bölümü yakında eklenecek.', flags: MessageFlags.Ephemeral });
  }

  if (alan === 'kurallar' && eylem === 'sayfa') {
    await interaction.deferUpdate();
    const kurallar = await roleRuleService.kurallariGetir(guild.id, { sadeceAktif: false });
    const { container } = kurallarListesiPaneliOlustur(kurallar, { sayfa: parseInt(ekVeri, 10) || 0 });
    return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }

  if (alan === 'kural') {
    const ruleId = ekVeri;
    if (eylem === 'ac-kapat') {
      await interaction.deferUpdate();
      const kural = await roleRuleService.kuralGetir(guild.id, ruleId);
      if (!kural) return interaction.followUp({ content: 'Kural bulunamadı.', flags: MessageFlags.Ephemeral });
      await roleRuleService.kuralAcKapat(guild.id, ruleId, !kural.enabled, interaction.user.id);
      const kurallar = await roleRuleService.kurallariGetir(guild.id, { sadeceAktif: false });
      const { container } = kurallarListesiPaneliOlustur(kurallar, { sayfa: 0 });
      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
    if (eylem === 'sil') {
      await interaction.deferUpdate();
      await roleRuleService.kuralSil(guild.id, ruleId, interaction.user.id);
      const kurallar = await roleRuleService.kurallariGetir(guild.id, { sadeceAktif: false });
      const { container } = kurallarListesiPaneliOlustur(kurallar, { sayfa: 0 });
      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
    if (eylem === 'test') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const kural = await roleRuleService.kuralGetir(guild.id, ruleId);
      if (!kural) return interaction.editReply({ content: 'Kural bulunamadı.' });
      const uye = interaction.member;
      const sonuc = await statusService.kullaniciyiYenidenTara(guild, uye, { testModu: true });
      const kendiSonucu = sonuc.degerlendirmeSonuclari?.find((s) => s.ruleId === ruleId);
      return interaction.editReply({
        content: `**Test Sonucu — ${kural.name}**\n` +
          `Koşul: \`${kosulOzetle(kural.conditions)}\`\n` +
          `Sonuç: ${kendiSonucu?.eslesti ? '✅ Eşleşti' : '❌ Eşleşmedi'}\n` +
          `Uygulanacak Action: ${kendiSonucu?.uygulanacak ? kural.action : 'Yok'}\n` +
          `_Bu bir test işlemidir, gerçek rol değişikliği yapılmadı._`
      });
    }
    if (eylem === 'onizle') {
      const kural = await roleRuleService.kuralGetir(guild.id, ruleId);
      if (!kural) return interaction.reply({ content: 'Kural bulunamadı.', flags: MessageFlags.Ephemeral });
      return interaction.reply({
        content: `**${kural.name}**\nRol: <@&${kural.roleId}>\nAction: ${kural.action} | Öncelik: ${kural.priority} | Durum: ${kural.enabled ? 'Aktif' : 'Pasif'}\nKoşul: \`${kosulOzetle(kural.conditions)}\`\nOluşturan: <@${kural.createdBy}>`,
        flags: MessageFlags.Ephemeral
      });
    }
    if (eylem === 'duzenle') {
      const kural = await roleRuleService.kuralGetir(guild.id, ruleId);
      if (!kural) return interaction.reply({ content: 'Kural bulunamadı.', flags: MessageFlags.Ephemeral });
      const veri = ruleWizardService.baslat(guild.id, interaction.user.id, kural);
      return interaction.reply({
        content: `**Kural Düzenleniyor — ${veri.name}**\nRol: <@&${veri.roleId}>\nAction: ${veri.action} | Öncelik: ${veri.priority}\nKoşul: \`${veri.conditionType} = "${veri.conditionValue}"\`\n\nAyarları değiştirip kaydedin, ya da koşulu değiştirmek için "Koşulu Değiştir" seçeneğini kullanın.`,
        components: [ruleConditionDegistirSatiri(), ...ozetOnayButonlari(veri)],
        flags: MessageFlags.Ephemeral
      });
    }
  }

  if (alan === 'wizard') {
    const veri = ruleWizardService.getir(guild.id, interaction.user.id);
    if (!veri) {
      return interaction.reply({ content: 'Sihirbaz oturumu zaman aşımına uğradı. Lütfen "Kural Ekle" ile yeniden başlayın.', flags: MessageFlags.Ephemeral });
    }
    if (eylem === 'toggle-kaldir') {
      ruleWizardService.guncelle(guild.id, interaction.user.id, { removeWhenFalse: !veri.removeWhenFalse });
      return interaction.update({ components: ozetOnayButonlari(ruleWizardService.getir(guild.id, interaction.user.id)) });
    }
    if (eylem === 'toggle-bildirim') {
      ruleWizardService.guncelle(guild.id, interaction.user.id, { notificationEnabled: !veri.notificationEnabled });
      return interaction.update({ components: ozetOnayButonlari(ruleWizardService.getir(guild.id, interaction.user.id)) });
    }
    if (eylem === 'toggle-aktif') {
      ruleWizardService.guncelle(guild.id, interaction.user.id, { enabled: !veri.enabled });
      return interaction.update({ components: ozetOnayButonlari(ruleWizardService.getir(guild.id, interaction.user.id)) });
    }
    if (eylem === 'kosul-degistir') {
      return interaction.reply({ content: 'Yeni koşul türünü seçin.', components: [ruleConditionSelectOlustur()], flags: MessageFlags.Ephemeral });
    }
    if (eylem === 'iptal') {
      ruleWizardService.iptalEt(guild.id, interaction.user.id);
      return interaction.update({ content: '❌ İşlem iptal edildi.', components: [] });
    }
    if (eylem === 'onayla') {
      try {
        const kuralVerisi = {
          name: veri.name,
          roleId: veri.roleId,
          priority: veri.priority,
          action: veri.action,
          conditions: { type: veri.conditionType, value: veri.conditionValue },
          removeWhenFalse: veri.removeWhenFalse,
          notification: { enabled: veri.notificationEnabled },
          enabled: veri.enabled
        };
        const kural = veri.editingRuleId
          ? await roleRuleService.kuralGuncelle(guild.id, veri.editingRuleId, kuralVerisi, interaction.user.id)
          : await roleRuleService.kuralOlustur(guild.id, kuralVerisi, interaction.user.id);
        ruleWizardService.iptalEt(guild.id, interaction.user.id);
        return interaction.update({ content: `✅ Kural ${veri.editingRuleId ? 'güncellendi' : 'oluşturuldu'}: **${kural.name}**`, components: [] });
      } catch (hata) {
        if (hata instanceof UygulamaHatasi) {
          return interaction.reply({ content: `❌ ${hata.message}`, flags: MessageFlags.Ephemeral });
        }
        throw hata;
      }
    }
  }
}

async function selectYonlendir(interaction) {
  const { alan, eylem } = customIdCoz(interaction.customId);
  if (alan === 'wizard' && eylem === 'kosul-turu') {
    const guild = interaction.guild;
    const secilenTur = interaction.values[0];
    ruleWizardService.guncelle(guild.id, interaction.user.id, { conditionType: secilenTur });
    return interaction.showModal(ruleValueModalOlustur(secilenTur));
  }
}

async function modalYonlendir(interaction) {
  const { alan, eylem } = customIdCoz(interaction.customId);
  const guild = interaction.guild;
  if (alan !== 'wizard') return;

  if (eylem === 'temel') {
    const name = interaction.fields.getTextInputValue('name');
    const roleId = interaction.fields.getTextInputValue('roleId').replace(/\D/g, '');
    const priorityHam = interaction.fields.getTextInputValue('priority');
    const action = interaction.fields.getTextInputValue('action').toUpperCase().trim();

    ruleWizardService.baslat(guild.id, interaction.user.id);
    ruleWizardService.guncelle(guild.id, interaction.user.id, {
      name,
      roleId,
      priority: parseInt(priorityHam, 10) || 0,
      action: ['ADD', 'REMOVE', 'SYNC'].includes(action) ? action : 'ADD'
    });

    return interaction.reply({
      content: 'Adım 2/3: Koşul türünü seçin.',
      components: [ruleConditionSelectOlustur()],
      flags: MessageFlags.Ephemeral
    });
  }

  if (eylem === 'deger') {
    const value = interaction.fields.getTextInputValue('value');
    const veri = ruleWizardService.guncelle(guild.id, interaction.user.id, { conditionValue: value });
    if (!veri) {
      return interaction.reply({ content: 'Sihirbaz oturumu zaman aşımına uğradı. Lütfen yeniden başlayın.', flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({
      content: `**Kural Özeti**\nAd: ${veri.name}\nRol: <@&${veri.roleId}>\nAction: ${veri.action} | Öncelik: ${veri.priority}\nKoşul: \`${veri.conditionType} = "${veri.conditionValue}"\`\n\nAşağıdaki seçenekleri gözden geçirip kaydedin:`,
      components: ozetOnayButonlari(veri),
      flags: MessageFlags.Ephemeral
    });
  }
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
          logger.uyari(`Bilinmeyen komut çağrıldı: ${interaction.commandName}`);
          return interaction.reply({ content: '❌ Bu komut şu anda kullanılamıyor.', flags: MessageFlags.Ephemeral });
        }
        await command.execute(interaction);
        return;
      }

      if (interaction.isButton()) {
        return butonYonlendir(interaction);
      }

      if (interaction.isStringSelectMenu()) {
        return selectYonlendir(interaction);
      }

      if (interaction.isModalSubmit()) {
        return modalYonlendir(interaction);
      }
    } catch (hata) {
      logger.hata('Interaction işlenirken hata oluştu', hata);
      const mesaj = hata instanceof UygulamaHatasi ? `❌ ${hata.message}` : '❌ Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: mesaj, components: [] });
        } else if (interaction.isRepliable?.()) {
          await interaction.reply({ content: mesaj, flags: MessageFlags.Ephemeral });
        }
      } catch (_ikincilHata) {
        // Yanıt verilemiyorsa (ör. interaction süresi doldu) sessizce geç.
      }
    }
  },
  anaPaneliGonder
};
