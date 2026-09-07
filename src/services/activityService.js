'use strict';

const { ActivityType } = require('discord.js');
const { metniTemizle } = require('../utils/security');

/**
 * discord.js Presence nesnesini, kural motorunun anlayacağı düz bir
 * yapıya dönüştürür. Guild platform ayarlarına (customStatus/game/spotify/
 * streaming/activity) göre ilgili alanlar dahil edilmez (false ise boş kalır).
 */
function presenceNormallestir(presence, platformAyarlari = {}) {
  const sonuc = {
    status: presence?.status || 'offline',
    customStatus: '',
    games: [],
    spotify: { active: false, track: '', artist: '', album: '' },
    streaming: { active: false, platform: '', url: '', title: '' },
    activities: []
  };

  if (!presence || !Array.isArray(presence.activities)) {
    return sonuc;
  }

  for (const aktivite of presence.activities) {
    // CUSTOM_STATUS
    if (aktivite.type === ActivityType.Custom && platformAyarlari.customStatus !== false) {
      sonuc.customStatus = metniTemizle(aktivite.state || aktivite.name || '', 256);
      continue;
    }

    // SPOTIFY (applicationId sabit: 'spotify:1' benzeri değil, name==='Spotify')
    if (aktivite.name === 'Spotify' && platformAyarlari.spotify !== false) {
      sonuc.spotify = {
        active: true,
        track: metniTemizle(aktivite.details || '', 256),
        artist: metniTemizle(aktivite.state || '', 256),
        album: metniTemizle(aktivite.assets?.largeText || '', 256)
      };
      continue;
    }

    // STREAMING
    if (aktivite.type === ActivityType.Streaming && platformAyarlari.streaming !== false) {
      sonuc.streaming = {
        active: true,
        platform: metniTemizle(aktivite.url?.includes('twitch') ? 'twitch' : (aktivite.url?.includes('youtube') ? 'youtube' : 'diger'), 64),
        url: metniTemizle(aktivite.url || '', 512),
        title: metniTemizle(aktivite.details || aktivite.name || '', 256)
      };
      continue;
    }

    // OYUN / GENEL ACTIVITY (Playing, Watching, Competing, Listening [Spotify hariç])
    if (platformAyarlari.game !== false || platformAyarlari.activity !== false) {
      sonuc.games.push({
        name: metniTemizle(aktivite.name || '', 256),
        type: aktivite.type,
        state: metniTemizle(aktivite.state || '', 256),
        details: metniTemizle(aktivite.details || '', 256),
        applicationId: aktivite.applicationId || '',
        url: aktivite.url || '',
        startTimestamp: aktivite.timestamps?.start || null,
        endTimestamp: aktivite.timestamps?.end || null,
        partyId: aktivite.party?.id || ''
      });
    }

    sonuc.activities.push({
      type: aktivite.type,
      name: metniTemizle(aktivite.name || '', 256),
      state: metniTemizle(aktivite.state || '', 256),
      details: metniTemizle(aktivite.details || '', 256),
      applicationId: aktivite.applicationId || ''
    });
  }

  return sonuc;
}

/**
 * Normalize edilmiş presence verisinden, UserStatusState'e kaydedilecek
 * deterministik bir hash üretir. Aynı state için tekrar işlem yapılmasını
 * önlemek amacıyla kullanılır.
 */
function stateHashUret(normalPresence) {
  const anahtarVeri = {
    status: normalPresence.status,
    customStatus: normalPresence.customStatus,
    games: normalPresence.games.map((g) => `${g.name}|${g.state}|${g.details}`),
    spotify: `${normalPresence.spotify.active}|${normalPresence.spotify.track}|${normalPresence.spotify.artist}`,
    streaming: `${normalPresence.streaming.active}|${normalPresence.streaming.url}`
  };
  return Buffer.from(JSON.stringify(anahtarVeri)).toString('base64');
}

module.exports = { presenceNormallestir, stateHashUret };
