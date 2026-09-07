'use strict';

const logger = require('../core/logger');
const stateManager = require('../core/stateManager');
const lockManager = require('../core/lockManager');
const roleActionQueueService = require('./roleActionQueueService');
const logRepository = require('../database/repositories/logRepository');
const userStateRepository = require('../database/repositories/userStateRepository');
const notificationService = require('./notificationService');

/**
 * Bir rol ekleme/kaldırma işleminin güvenlik ön kontrollerini yapar.
 * Döner: { izinVer: boolean, sebep: string|null }
 */
function guvenlikOnKontrolu({ guild, member, role, action, guildSettings }) {
  if (!guild) return { izinVer: false, sebep: 'Guild bulunamadı.' };
  if (!member) return { izinVer: false, sebep: 'Üye bulunamadı.' };
  if (!role) return { izinVer: false, sebep: 'Rol bulunamadı.' };

  const botUye = guild.members.me;
  if (!botUye) return { izinVer: false, sebep: 'Bot üyeliği bulunamadı.' };

  if (!botUye.permissions.has('ManageRoles')) {
    return { izinVer: false, sebep: 'Botun Rolleri Yönet izni yok.' };
  }
  if (role.position >= botUye.roles.highest.position) {
    return { izinVer: false, sebep: 'Rol, botun en yüksek rolünden daha yüksek veya eşit konumda (hierarchy).' };
  }
  if (role.managed) {
    return { izinVer: false, sebep: 'Rol Discord/entegrasyon tarafından yönetiliyor, elle değiştirilemez.' };
  }

  if (guildSettings?.protectedRoles?.includes(role.id)) {
    return { izinVer: false, sebep: 'Rol korumalı roller listesinde.' };
  }
  if (guildSettings?.ignoredUsers?.includes(member.id)) {
    return { izinVer: false, sebep: 'Kullanıcı istisna listesinde, otomatik sistem işlem yapmaz.' };
  }
  if (guildSettings?.ignoredRoles?.some((rid) => member.roles.cache.has(rid))) {
    return { izinVer: false, sebep: 'Kullanıcı istisna rolüne sahip.' };
  }

  const zatenVar = member.roles.cache.has(role.id);
  if (action === 'ADD' && zatenVar) {
    return { izinVer: false, sebep: 'DUPLICATE_PROTECTION: kullanıcı zaten role sahip.', zatenIslenmis: true };
  }
  if (action === 'REMOVE' && !zatenVar) {
    return { izinVer: false, sebep: 'Kullanıcıda zaten bu rol yok.', zatenIslenmis: true };
  }

  return { izinVer: true, sebep: null };
}

/**
 * Tek bir rol işlemini (ADD/REMOVE) güvenlik kontrollerinden geçirip
 * kuyruğa ekler, sonucu loglar ve gerekirse bildirim gönderir.
 * source: 'AUTOMATIC' | 'MANUAL' | 'SYSTEM'
 */
async function rolIslemiUygula({ guild, member, role, action, source, ruleId = null, actorId, guildSettings, oncelik = 'NORMAL' }) {
  if (stateManager.safeModeAktifMi(guild.id) && source === 'AUTOMATIC') {
    return { basarili: false, sebep: 'SAFE MODE aktif: otomatik rol işlemleri durduruldu.', atlandi: true };
  }
  if (source === 'AUTOMATIC') {
    if (action === 'ADD' && stateManager.killSwitch.otomatikRolEkleme) {
      return { basarili: false, sebep: 'Kill switch: otomatik rol ekleme kapalı.', atlandi: true };
    }
    if (action === 'REMOVE' && stateManager.killSwitch.otomatikRolKaldirma) {
      return { basarili: false, sebep: 'Kill switch: otomatik rol kaldırma kapalı.', atlandi: true };
    }
  }

  const kontrol = guvenlikOnKontrolu({ guild, member, role, action, guildSettings });
  if (!kontrol.izinVer) {
    if (!kontrol.zatenIslenmis) {
      logger.uyari(`Rol işlemi engellendi: ${kontrol.sebep} (guild=${guild.id}, user=${member?.id}, role=${role?.id})`);
    }
    return { basarili: false, sebep: kontrol.sebep, atlandi: true };
  }

  const kuyrukAnahtari = `role-sync:${guild.id}:${member.id}`;
  return lockManager.kilitle(kuyrukAnahtari, async () => {
    const sonuc = await roleActionQueueService.ekle({
      oncelik,
      aciklama: `${action} rol=${role.id} kullanici=${member.id} guild=${guild.id}`,
      gorev: async () => {
        if (action === 'ADD') {
          await member.roles.add(role, `WNERSDEV Durum & Rol (${source})${ruleId ? ` - kural:${ruleId}` : ''}`);
        } else {
          await member.roles.remove(role, `WNERSDEV Durum & Rol (${source})${ruleId ? ` - kural:${ruleId}` : ''}`);
        }
      }
    });

    await logRepository.rolIslemiKaydet({
      guildId: guild.id,
      userId: actorId || member.id,
      targetUserId: member.id,
      roleId: role.id,
      action,
      source,
      ruleId,
      success: sonuc.basarili,
      error: sonuc.hata || ''
    });

    if (sonuc.basarili) {
      stateManager.rolIslemiKaydet({ guildId: guild.id, userId: member.id, roleId: role.id, action });
      await notificationService.rolIslemiBildir({ guild, guildSettings, member, role, action, source, basarili: true });
    } else {
      stateManager.hataKaydet(sonuc.hata || kontrol.sebep);
      await notificationService.rolIslemiBildir({ guild, guildSettings, member, role, action, source, basarili: false, hata: sonuc.hata });
    }

    return sonuc;
  });
}

/**
 * Bir kural değerlendirme sonucuna göre (roleConflictService çıktısı dahil)
 * gereken tüm ADD/REMOVE işlemlerini uygular ve UserStatusState'i günceller.
 */
async function uyeIcinSonuclariUygula({ guild, member, guildSettings, eklenecekRoller, kaldirilacakRoller, managedRoleIds, oncelik = 'NORMAL' }) {
  const sonuclar = [];

  for (const roleId of kaldirilacakRoller) {
    const rol = guild.roles.cache.get(roleId);
    if (!rol) continue;
    const sonuc = await rolIslemiUygula({
      guild, member, role: rol, action: 'REMOVE', source: 'AUTOMATIC', guildSettings,
      oncelik
    });
    sonuclar.push({ roleId, action: 'REMOVE', ...sonuc });
  }

  for (const { roleId, ruleId } of eklenecekRoller) {
    const rol = guild.roles.cache.get(roleId);
    if (!rol) continue;
    const sonuc = await rolIslemiUygula({
      guild, member, role: rol, action: 'ADD', source: 'AUTOMATIC', ruleId, guildSettings,
      oncelik
    });
    sonuclar.push({ roleId, action: 'ADD', ruleId, ...sonuc });
  }

  const guncelManagedRoles = new Set(managedRoleIds);
  for (const s of sonuclar) {
    if (!s.basarili) continue;
    if (s.action === 'ADD') guncelManagedRoles.add(s.roleId);
    if (s.action === 'REMOVE') guncelManagedRoles.delete(s.roleId);
  }

  await userStateRepository.upsert(guild.id, member.id, {
    managedRoles: [...guncelManagedRoles],
    lastProcessedAt: new Date()
  });

  return sonuclar;
}

module.exports = {
  guvenlikOnKontrolu,
  rolIslemiUygula,
  uyeIcinSonuclariUygula
};
