'use strict';

const roleRuleService = require('../../services/roleRuleService');
const { statusRoleRuleGecerliMi } = require('../../utils/validators');
const permissionManager = require('../../core/permissionManager');
const { UygulamaHatasi } = require('../../core/errorHandler');

/**
 * Guild kurallarını, credential/token/Mongo URI İÇERMEYEN, yalnızca kural
 * tanımlarını içeren bir JSON nesnesine aktarır.
 */
async function kurallariDisaAktar(guildId) {
  const kurallar = await roleRuleService.kurallariGetir(guildId, { sadeceAktif: false, cacheKullan: false });
  return {
    wnersdevExportVersion: 1,
    exportTarihi: new Date().toISOString(),
    kurallar: kurallar.map((k) => ({
      name: k.name,
      enabled: k.enabled,
      priority: k.priority,
      roleId: k.roleId,
      action: k.action,
      conditions: k.conditions,
      removeWhenFalse: k.removeWhenFalse,
      cooldown: k.cooldown,
      notification: k.notification
    }))
  };
}

/**
 * Dışa aktarılmış JSON'u içe aktarır. Her kural, oluşturulmadan önce tam
 * doğrulamadan geçer; roleId hâlâ guild'de var olan geçerli bir rol olmalıdır
 * (çağıran taraf bu kontrolü guild.roles.cache ile yapmalıdır).
 */
async function kurallariIceAktar(guildId, veri, actorId, { roleIdGecerliMi } = {}) {
  if (!veri || !Array.isArray(veri.kurallar)) {
    throw new UygulamaHatasi('Geçersiz içe aktarma dosyası: "kurallar" alanı bulunamadı.', { kod: 'GECERSIZ_IMPORT', kalici: true });
  }

  const sonuclar = { basarili: 0, basarisiz: 0, hatalar: [] };

  for (const [index, kuralVerisi] of veri.kurallar.entries()) {
    try {
      if (roleIdGecerliMi && !roleIdGecerliMi(kuralVerisi.roleId)) {
        throw new Error(`roleId (${kuralVerisi.roleId}) bu sunucuda mevcut değil.`);
      }
      const aday = { ...kuralVerisi, guildId };
      const { gecerli, hatalar } = statusRoleRuleGecerliMi(aday);
      if (!gecerli) throw new Error(hatalar.join(' | '));
      await roleRuleService.kuralOlustur(guildId, kuralVerisi, actorId);
      sonuclar.basarili += 1;
    } catch (hata) {
      sonuclar.basarisiz += 1;
      sonuclar.hatalar.push(`Kural #${index + 1}: ${hata.message}`);
    }
  }

  return sonuclar;
}

function iceAktarmaYetkisiVarMi(interaction) {
  return permissionManager.yetkiYeterliMi(interaction, permissionManager.YETKI_SEVIYELERI.ADMIN);
}

module.exports = { kurallariDisaAktar, kurallariIceAktar, iceAktarmaYetkisiVarMi };
