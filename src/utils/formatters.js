'use strict';

function kosulOzetle(kosul, derinlik = 0) {
  if (!kosul) return '(koşul yok)';
  if (kosul.logic) {
    const altlar = (kosul.conditions || []).map((k) => kosulOzetle(k, derinlik + 1));
    if (kosul.logic === 'NOT') return `DEĞİL(${altlar[0]})`;
    return `(${altlar.join(kosul.logic === 'AND' ? ' VE ' : ' VEYA ')})`;
  }
  const deger = kosul.value !== undefined ? ` "${kosul.value}"` : '';
  return `${kosul.type}${deger}`;
}

function actionTurkce(action) {
  const harita = { ADD: 'EKLE', REMOVE: 'KALDIR', SYNC: 'SENKRONİZE ET' };
  return harita[action] || action;
}

function durumTurkce(status) {
  const harita = {
    online: '🟢 Çevrimiçi',
    idle: '🌙 Boşta',
    dnd: '⛔ Rahatsız Etmeyin',
    offline: '⚫ Çevrimdışı',
    invisible: '⚫ Görünmez'
  };
  return harita[status] || status || 'bilinmiyor';
}

function bayrakEmoji(basarili) {
  return basarili ? '✅' : '❌';
}

function listeyiNumarala(liste, formatFonksiyonu) {
  return liste.map((oge, i) => `**${i + 1}.** ${formatFonksiyonu(oge)}`).join('\n');
}

function kirp(metin, maksUzunluk) {
  if (typeof metin !== 'string') return '';
  return metin.length > maksUzunluk ? `${metin.slice(0, maksUzunluk - 1)}…` : metin;
}

module.exports = {
  kosulOzetle,
  actionTurkce,
  durumTurkce,
  bayrakEmoji,
  listeyiNumarala,
  kirp
};
