'use strict';

const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { customIdUret } = require('../../utils/ids');
const { GECERLI_KOSUL_TURLERI } = require('../../utils/validators');

const KOSUL_ETIKETLERI = {
  customStatusContains: 'Custom Status içeriyor', customStatusEquals: 'Custom Status tam eşleşme',
  customStatusStartsWith: 'Custom Status ile başlıyor', customStatusEndsWith: 'Custom Status ile bitiyor',
  customStatusRegex: 'Custom Status regex',
  gameEquals: 'Oyun adı tam eşleşme', gameContains: 'Oyun adı içeriyor',
  gameStartsWith: 'Oyun adı ile başlıyor', gameEndsWith: 'Oyun adı ile bitiyor',
  activityType: 'Aktivite türü', activityName: 'Aktivite adı', applicationId: 'Uygulama ID',
  spotifyActive: 'Spotify aktif', spotifyTrack: 'Spotify şarkı', spotifyArtist: 'Spotify sanatçı', spotifyAlbum: 'Spotify albüm',
  streamingActive: 'Yayın aktif', streamingPlatform: 'Yayın platformu', streamingUrl: 'Yayın URL',
  userStatus: 'Kullanıcı durumu', online: 'Çevrimiçi', idle: 'Boşta', dnd: 'Rahatsız Etmeyin',
  hasRole: 'Role sahip', doesNotHaveRole: 'Role sahip değil'
};

function ruleConditionSelectOlustur() {
  const secenekler = GECERLI_KOSUL_TURLERI.slice(0, 25).map((tur) => ({
    label: KOSUL_ETIKETLERI[tur] || tur,
    value: tur
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId(customIdUret('wizard', 'kosul-turu'))
    .setPlaceholder('Koşul türünü seçin')
    .addOptions(secenekler);

  return new ActionRowBuilder().addComponents(select);
}

module.exports = { ruleConditionSelectOlustur, KOSUL_ETIKETLERI };
