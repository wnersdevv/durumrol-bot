'use strict';

const crypto = require('crypto');

const DISCORD_SNOWFLAKE_REGEX = /^[0-9]{17,20}$/;

function discordIdGecerliMi(id) {
  return typeof id === 'string' && DISCORD_SNOWFLAKE_REGEX.test(id);
}

function benzersizIdUret(onEk = '') {
  const rastgele = crypto.randomBytes(8).toString('hex');
  const zaman = Date.now().toString(36);
  return onEk ? `${onEk}_${zaman}${rastgele}` : `${zaman}${rastgele}`;
}

/**
 * Discord message component customId üretimi. Format:
 * wnersdev:<alan>:<eylem>:<ekVeri>
 * customId 100 karakter Discord sınırını aşmamalı.
 */
function customIdUret(alan, eylem, ekVeri = '') {
  const parcalar = ['wnersdev', alan, eylem];
  if (ekVeri) parcalar.push(String(ekVeri));
  const sonuc = parcalar.join(':');
  if (sonuc.length > 100) {
    throw new Error(`customId 100 karakteri aşıyor: ${sonuc.length} karakter`);
  }
  return sonuc;
}

function customIdCoz(customId) {
  const parcalar = String(customId).split(':');
  const [onEk, alan, eylem, ...ekVeriParcalari] = parcalar;
  return {
    onEk,
    alan,
    eylem,
    ekVeri: ekVeriParcalari.join(':')
  };
}

module.exports = {
  discordIdGecerliMi,
  benzersizIdUret,
  customIdUret,
  customIdCoz
};
