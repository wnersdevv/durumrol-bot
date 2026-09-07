'use strict';

const logger = require('../core/logger');
const stateManager = require('../core/stateManager');
const cooldownManager = require('../core/cooldownManager');
const configManager = require('../core/configManager');
const { presenceNormallestir, stateHashUret } = require('./activityService');
const { kurallariDegerlendir } = require('./ruleEngineService');
const roleRuleService = require('./roleRuleService');
const roleConflictService = require('./roleConflictService');
const roleSyncService = require('./roleSyncService');
const guildSettingsService = require('./guildSettingsService');
const userPreferenceService = require('./userPreferenceService');
const userStateRepository = require('../database/repositories/userStateRepository');
const logRepository = require('../database/repositories/logRepository');
const notificationService = require('./notificationService');
const { quietHoursIcindeMi } = require('../utils/time');

/**
 * Kurallar + roleConflictService çıktısını kullanarak, bir üye için
 * eklenmesi/kaldırılması gereken rolleri belirler.
 */
function eylemPlaniOlustur(degerlendirmeSonuclari, guildSettings, mevcutManagedRoles) {
  const eklenecekAday = [];
  const kaldirilacakAday = new Set();

  for (const { rule, uygulanacak } of degerlendirmeSonuclari) {
    const ruleId = rule._id.toString();
    if (rule.action === 'ADD' || rule.action === 'SYNC') {
      if (uygulanacak) {
        eklenecekAday.push({ roleId: rule.roleId, ruleId, rule });
      } else if (rule.removeWhenFalse && mevcutManagedRoles.includes(rule.roleId)) {
        kaldirilacakAday.add(rule.roleId);
      }
    } else if (rule.action === 'REMOVE') {
      if (uygulanacak) {
        kaldirilacakAday.add(rule.roleId);
      }
    }
  }

  const mevcutRollerSeti = new Set(mevcutManagedRoles);
  const { eklenecek, kaldirilacak } = roleConflictService.cakismalariCoz(
    eklenecekAday,
    guildSettings.roleGroups || [],
    mevcutRollerSeti
  );

  for (const roleId of kaldirilacakAday) kaldirilacak.add(roleId);
  for (const roleId of kaldirilacak) eklenecek.delete(roleId);

  const eklenecekRoller = [...eklenecek].map((roleId) => {
    const eslesen = eklenecekAday.find((a) => a.roleId === roleId);
    return { roleId, ruleId: eslesen?.ruleId || null };
  });

  return { eklenecekRoller, kaldirilacakRoller: [...kaldirilacak] };
}

/**
 * Anomaly kontrolü: son X saniyede beklenenin çok üzerinde işlem varsa
 * SAFE MODE'a geçer ve admin'i uyarır.
 */
async function anomaliKontrolEt(guild, guildSettings) {
  const config = configManager.al();
  if (!config.anomaly?.enabled) return false;
  const sayi = stateManager.pencereIcindekiIslemSayisi(guild.id, config.anomaly.windowSeconds);
  if (sayi > config.anomaly.maxActionsPerWindow) {
    if (!stateManager.safeModeAktifMi(guild.id)) {
      stateManager.safeModeAc(guild.id, `ROLE_ACTION_SPIKE: ${sayi} işlem / ${config.anomaly.windowSeconds}sn`);
      await notificationService.sistemUyarisiGonder(
        guild, guildSettings,
        'ROLE_ACTION_SPIKE Tespit Edildi',
        `Beklenenden çok daha fazla rol işlemi tespit edildi (${sayi} işlem / ${config.anomaly.windowSeconds} saniye). ` +
        'Olası bir hata veya kötüye kullanımı önlemek için SAFE MODE etkinleştirildi. Otomatik rol işlemleri durduruldu. ' +
        '`/sistem kill-switch` komutuyla durumu inceleyip düzeltebilirsiniz.'
      );
    }
    return true;
  }
  return false;
}

/**
 * Ana giriş noktası: bir üyenin presence değişikliğini işler.
 * testModu=true ise gerçek rol değişikliği YAPILMAZ, yalnızca sonuç döner.
 */
async function presenceIsle({ guild, member, presence }, { testModu = false, oncelik = 'NORMAL', cooldownAtla = false } = {}) {
  const config = configManager.al();

  if (!testModu) {
    if (stateManager.killSwitch.presenceIsleme) return { atlandi: true, sebep: 'Kill switch: presence işleme kapalı.' };
    if (!config.statusRoles?.enabled || !config.statusRoles?.presenceUpdateEnabled) {
      return { atlandi: true, sebep: 'statusRoles devre dışı.' };
    }
  }

  const guildSettings = await guildSettingsService.ayarlariGetir(guild.id);
  if (!guildSettings.enabled || !guildSettings.presenceUpdateEnabled) {
    return { atlandi: true, sebep: 'Guild ayarlarında sistem devre dışı.' };
  }
  if (guildSettings.ignoredUsers.includes(member.id)) {
    return { atlandi: true, sebep: 'Kullanıcı istisna listesinde.' };
  }
  if (guildSettings.ignoredRoles.some((rid) => member.roles.cache.has(rid))) {
    return { atlandi: true, sebep: 'Kullanıcı istisna rolüne sahip.' };
  }
  if (quietHoursIcindeMi({ ...guildSettings.quietHours, timezone: guildSettings.timezone }) && !testModu) {
    return { atlandi: true, sebep: 'Sessiz saatler (quiet hours) aktif.' };
  }

  const optedOut = await userPreferenceService.optedOutMu(guild.id, member.id).catch(() => false);
  if (optedOut && !testModu) {
    return { atlandi: true, sebep: 'Kullanıcı otomatik durum rollerinden opt-out yapmış.' };
  }

  if (!testModu) {
    const anomali = await anomaliKontrolEt(guild, guildSettings);
    if (anomali) return { atlandi: true, sebep: 'SAFE MODE aktif (anomaly tespiti).' };
    if (stateManager.safeModeAktifMi(guild.id)) {
      return { atlandi: true, sebep: 'SAFE MODE aktif.' };
    }
  }

  const normalPresence = presenceNormallestir(presence, guildSettings.platforms);
  const yeniHash = stateHashUret(normalPresence);

  let mevcutState = await userStateRepository.bul(guild.id, member.id);
  if (!testModu && mevcutState?.lastHash === yeniHash) {
    return { atlandi: true, sebep: 'State değişmedi (lastHash aynı), tekrar işlem yapılmadı.' };
  }

  const kurallar = await roleRuleService.kurallariGetir(guild.id, { sadeceAktif: true });
  const baglam = { normalPresence, member, guildId: guild.id };
  const degerlendirmeSonuclari = kurallariDegerlendir(kurallar, baglam, guildSettings.matchMode);

  for (const { rule, eslesti } of degerlendirmeSonuclari) {
    if (eslesti) roleRuleService.eslesmeSayaciniArtir(guild.id, rule._id.toString()).catch(() => {});
    logRepository.ruleExecutionKaydet({
      guildId: guild.id, ruleId: rule._id.toString(), userId: member.id,
      matched: eslesti, testMode: testModu,
      actionTaken: eslesti ? rule.action : 'NONE'
    }).catch((h) => logger.hata('RuleExecution kaydedilemedi', h));
  }

  const mevcutManagedRoles = mevcutState?.managedRoles || [];
  const { eklenecekRoller, kaldirilacakRoller } = eylemPlaniOlustur(degerlendirmeSonuclari, guildSettings, mevcutManagedRoles);

  if (testModu) {
    return {
      atlandi: false,
      testModu: true,
      normalPresence,
      degerlendirmeSonuclari: degerlendirmeSonuclari.map((s) => ({
        ruleId: s.rule._id.toString(), ruleName: s.rule.name, eslesti: s.eslesti, uygulanacak: s.uygulanacak, action: s.rule.action
      })),
      eklenecekRoller,
      kaldirilacakRoller
    };
  }

  const cooldownMs = cooldownAtla ? 0 : (guildSettings.cooldownSeconds ?? config.statusRoles.cooldownSeconds ?? 5) * 1000;
  const cooldownAnahtari = `presence:${guild.id}:${member.id}`;

  const isleyiciCalistir = async () => {
      try {
        const sonuclar = await roleSyncService.uyeIcinSonuclariUygula({
          guild, member, guildSettings, eklenecekRoller, kaldirilacakRoller, managedRoleIds: mevcutManagedRoles, oncelik
        });
        await userStateRepository.upsert(guild.id, member.id, {
          status: normalPresence.status,
          customStatus: normalPresence.customStatus,
          activities: normalPresence.activities,
          spotify: normalPresence.spotify,
          streaming: normalPresence.streaming,
          matchedRules: degerlendirmeSonuclari.filter((s) => s.eslesti).map((s) => s.rule._id.toString()),
          lastHash: yeniHash,
          lastProcessedAt: new Date()
        });
        return { atlandi: false, sonuclar };
      } catch (hata) {
        logger.hata('Presence işleme sırasında hata', hata);
        return { atlandi: false, hata: hata.message };
      }
  };

  if (cooldownAtla) {
    return isleyiciCalistir();
  }

  return new Promise((resolve) => {
    cooldownManager.debounceEt(cooldownAnahtari, null, cooldownMs, async () => {
      resolve(await isleyiciCalistir());
    });
  });
}

/**
 * Tek bir kullanıcıyı manuel olarak yeniden değerlendirir (/durumrol kullanıcı-tara).
 * Kullanıcının mevcut cache'lenmiş presence'ı guild.presences üzerinden alınır.
 */
async function kullaniciyiYenidenTara(guild, member, { testModu = false, oncelik = 'HIGH', cooldownAtla = true } = {}) {
  const presence = member.presence || { status: 'offline', activities: [] };
  return presenceIsle({ guild, member, presence }, { testModu, oncelik, cooldownAtla });
}

module.exports = { presenceIsle, kullaniciyiYenidenTara, eylemPlaniOlustur, anomaliKontrolEt };
