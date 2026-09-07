'use strict';

const { guvenliRegexTest, GuvenlikHatasi } = require('../utils/security');
const logger = require('../core/logger');

function metinKarsilastir(operator, hedefMetin, deger) {
  const metin = (hedefMetin || '').toLowerCase();
  const aranan = (deger || '').toLowerCase();
  switch (operator) {
    case 'equals': return metin === aranan;
    case 'contains': return metin.includes(aranan);
    case 'notContains': return !metin.includes(aranan);
    case 'startsWith': return metin.startsWith(aranan);
    case 'endsWith': return metin.endsWith(aranan);
    default: return false;
  }
}

/**
 * Bağlam (context): { normalPresence, member, guildId }
 * normalPresence: activityService.presenceNormallestir() çıktısı
 * member: discord.js GuildMember (hasRole/doesNotHaveRole için)
 */
function yaprakKosulDegerlendir(kosul, baglam) {
  const { normalPresence, member } = baglam;
  const { type, operator, value } = kosul;

  try {
    switch (type) {
      case 'customStatusContains':
        return metinKarsilastir('contains', normalPresence.customStatus, value);
      case 'customStatusEquals':
        return metinKarsilastir('equals', normalPresence.customStatus, value);
      case 'customStatusStartsWith':
        return metinKarsilastir('startsWith', normalPresence.customStatus, value);
      case 'customStatusEndsWith':
        return metinKarsilastir('endsWith', normalPresence.customStatus, value);
      case 'customStatusRegex':
        return guvenliRegexTest(value, normalPresence.customStatus);

      case 'gameEquals':
        return normalPresence.games.some((g) => metinKarsilastir('equals', g.name, value));
      case 'gameContains':
        return normalPresence.games.some((g) => metinKarsilastir('contains', g.name, value));
      case 'gameStartsWith':
        return normalPresence.games.some((g) => metinKarsilastir('startsWith', g.name, value));
      case 'gameEndsWith':
        return normalPresence.games.some((g) => metinKarsilastir('endsWith', g.name, value));

      case 'activityType':
        return normalPresence.activities.some((a) => String(a.type) === String(value));
      case 'activityName':
        return normalPresence.activities.some((a) => metinKarsilastir('contains', a.name, value));
      case 'applicationId':
        return normalPresence.games.some((g) => g.applicationId === value)
          || normalPresence.activities.some((a) => a.applicationId === value);

      case 'spotifyActive':
        return normalPresence.spotify.active === (value !== false && value !== 'false');
      case 'spotifyTrack':
        return normalPresence.spotify.active && metinKarsilastir('contains', normalPresence.spotify.track, value);
      case 'spotifyArtist':
        return normalPresence.spotify.active && metinKarsilastir('contains', normalPresence.spotify.artist, value);
      case 'spotifyAlbum':
        return normalPresence.spotify.active && metinKarsilastir('contains', normalPresence.spotify.album, value);

      case 'streamingActive':
        return normalPresence.streaming.active === (value !== false && value !== 'false');
      case 'streamingPlatform':
        return normalPresence.streaming.active && metinKarsilastir('equals', normalPresence.streaming.platform, value);
      case 'streamingUrl':
        return normalPresence.streaming.active && metinKarsilastir('contains', normalPresence.streaming.url, value);

      case 'userStatus':
        return normalPresence.status === value;
      case 'online':
        return normalPresence.status === 'online';
      case 'idle':
        return normalPresence.status === 'idle';
      case 'dnd':
        return normalPresence.status === 'dnd';

      case 'hasRole':
        return Boolean(member?.roles?.cache?.has(value));
      case 'doesNotHaveRole':
        return !member?.roles?.cache?.has(value);

      default:
        logger.uyari(`Bilinmeyen koşul türü değerlendirilemedi: ${type}`);
        return false;
    }
  } catch (hata) {
    if (hata instanceof GuvenlikHatasi) {
      logger.uyari(`Koşul güvenlik nedeniyle atlandı: ${hata.message}`);
      return false;
    }
    logger.hata('Koşul değerlendirme hatası', hata);
    return false;
  }
}

module.exports = { yaprakKosulDegerlendir, metinKarsilastir };
