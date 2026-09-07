'use strict';

const { yaprakKosulDegerlendir } = require('./conditionService');
const logger = require('../core/logger');

/**
 * Koşul ağacını (AND/OR/NOT + yaprak koşullar) özyinelemeli olarak
 * değerlendirir. baglam: { normalPresence, member, guildId }
 */
function kosulAgaciDegerlendir(kosul, baglam) {
  if (!kosul) return false;

  if (kosul.logic) {
    const altSonuclar = () => kosul.conditions.map((k) => kosulAgaciDegerlendir(k, baglam));
    switch (kosul.logic) {
      case 'AND':
        return kosul.conditions.every((k) => kosulAgaciDegerlendir(k, baglam));
      case 'OR':
        return kosul.conditions.some((k) => kosulAgaciDegerlendir(k, baglam));
      case 'NOT':
        return !kosulAgaciDegerlendir(kosul.conditions[0], baglam);
      default:
        logger.uyari(`Bilinmeyen mantıksal operatör: ${kosul.logic}`);
        return false;
    }
  }

  return yaprakKosulDegerlendir(kosul, baglam);
}

/**
 * Bir üye için, verilen kural listesini (guild'e ait, enabled=true, priority
 * sırasına göre önceden sıralanmış) sırayla değerlendirir.
 * matchMode: 'ALL_MATCHING' -> eşleşen tüm kurallar uygulanır.
 *            'HIGHEST_PRIORITY' -> yalnızca en yüksek priority'li eşleşen kural uygulanır.
 * Döner: [{ rule, eslesti }]
 */
function kurallariDegerlendir(kurallar, baglam, matchMode = 'ALL_MATCHING') {
  const sonuclar = kurallar.map((rule) => ({
    rule,
    eslesti: kosulAgaciDegerlendir(rule.conditions, baglam)
  }));

  if (matchMode === 'HIGHEST_PRIORITY') {
    const ilkEslesen = sonuclar.find((s) => s.eslesti);
    return sonuclar.map((s) => ({
      ...s,
      uygulanacak: ilkEslesen ? s.rule._id.toString() === ilkEslesen.rule._id.toString() : false
    }));
  }

  return sonuclar.map((s) => ({ ...s, uygulanacak: s.eslesti }));
}

module.exports = { kosulAgaciDegerlendir, kurallariDegerlendir };
