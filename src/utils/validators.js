'use strict';

const { discordIdGecerliMi } = require('./ids');
const { regexGuvenliMi } = require('./security');

const GECERLI_ACTIONLAR = ['ADD', 'REMOVE', 'SYNC'];
const GECERLI_KOSUL_TURLERI = [
  'customStatusContains', 'customStatusEquals', 'customStatusStartsWith', 'customStatusEndsWith', 'customStatusRegex',
  'gameEquals', 'gameContains', 'gameStartsWith', 'gameEndsWith',
  'activityType', 'activityName', 'applicationId',
  'spotifyActive', 'spotifyTrack', 'spotifyArtist', 'spotifyAlbum',
  'streamingActive', 'streamingPlatform', 'streamingUrl',
  'userStatus', 'online', 'idle', 'dnd',
  'hasRole', 'doesNotHaveRole'
];
const GECERLI_MANTIKSAL_OPERATORLER = ['AND', 'OR', 'NOT'];

function stringBosMu(deger) {
  return typeof deger !== 'string' || deger.trim().length === 0;
}

function kuralAdiGecerliMi(ad) {
  return typeof ad === 'string' && ad.trim().length >= 2 && ad.trim().length <= 100;
}

function actionGecerliMi(action) {
  return GECERLI_ACTIONLAR.includes(action);
}

function kosulTuruGecerliMi(tur) {
  return GECERLI_KOSUL_TURLERI.includes(tur);
}

function mantikselOperatorGecerliMi(op) {
  return GECERLI_MANTIKSAL_OPERATORLER.includes(op);
}

/**
 * Kural koşul ağacını (AND/OR/NOT + yaprak koşullar) doğrular.
 * Yaprak koşul: { type, operator?, value }  (operator: eq/contains/vb, condition type'a göre değişir)
 * Bileşik koşul: { logic: 'AND'|'OR'|'NOT', conditions: [...] }
 */
function kosulAgaciGecerliMi(kosul, derinlik = 0) {
  if (derinlik > 10) return { gecerli: false, hata: 'Koşul ağacı çok derin (maksimum 10 seviye).' };
  if (!kosul || typeof kosul !== 'object') return { gecerli: false, hata: 'Koşul bir nesne olmalı.' };

  if (kosul.logic) {
    if (!mantikselOperatorGecerliMi(kosul.logic)) {
      return { gecerli: false, hata: `Geçersiz mantıksal operatör: ${kosul.logic}` };
    }
    if (!Array.isArray(kosul.conditions) || kosul.conditions.length === 0) {
      return { gecerli: false, hata: 'Bileşik koşulda en az bir alt koşul olmalı.' };
    }
    if (kosul.logic === 'NOT' && kosul.conditions.length !== 1) {
      return { gecerli: false, hata: 'NOT operatörü tam olarak bir alt koşul almalı.' };
    }
    for (const altKosul of kosul.conditions) {
      const sonuc = kosulAgaciGecerliMi(altKosul, derinlik + 1);
      if (!sonuc.gecerli) return sonuc;
    }
    return { gecerli: true };
  }

  if (!kosulTuruGecerliMi(kosul.type)) {
    return { gecerli: false, hata: `Geçersiz koşul türü: ${kosul.type}` };
  }
  if (kosul.type.endsWith('Regex') && kosul.value && !regexGuvenliMi(kosul.value)) {
    return { gecerli: false, hata: 'Regex pattern güvenlik kriterlerini karşılamıyor.' };
  }
  return { gecerli: true };
}

function statusRoleRuleGecerliMi(kural) {
  const hatalar = [];
  if (!discordIdGecerliMi(kural.guildId)) hatalar.push('guildId geçersiz.');
  if (!kuralAdiGecerliMi(kural.name)) hatalar.push('Kural adı 2-100 karakter arasında olmalı.');
  if (!discordIdGecerliMi(kural.roleId)) hatalar.push('roleId geçersiz.');
  if (!actionGecerliMi(kural.action)) hatalar.push(`Geçersiz action: ${kural.action}`);
  if (kural.priority !== undefined && (typeof kural.priority !== 'number' || kural.priority < 0)) {
    hatalar.push('priority negatif olmayan bir sayı olmalı.');
  }
  const kosulSonucu = kosulAgaciGecerliMi(kural.conditions);
  if (!kosulSonucu.gecerli) hatalar.push(kosulSonucu.hata);

  return { gecerli: hatalar.length === 0, hatalar };
}

module.exports = {
  GECERLI_ACTIONLAR,
  GECERLI_KOSUL_TURLERI,
  GECERLI_MANTIKSAL_OPERATORLER,
  stringBosMu,
  kuralAdiGecerliMi,
  actionGecerliMi,
  kosulTuruGecerliMi,
  mantikselOperatorGecerliMi,
  kosulAgaciGecerliMi,
  statusRoleRuleGecerliMi
};
