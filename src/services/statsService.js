'use strict';

const ruleRepository = require('../database/repositories/ruleRepository');
const logRepository = require('../database/repositories/logRepository');
const { guildIzoleSorguDogrula } = require('../utils/security');

async function guildIstatistikleriGetir(guildId) {
  guildIzoleSorguDogrula(guildId);

  const [tumKurallar, aktifKurallar, bugun, enCokEslesen, enCokVerilen] = await Promise.all([
    ruleRepository.listele(guildId, { sadeceAktif: false }),
    ruleRepository.listele(guildId, { sadeceAktif: true }),
    logRepository.bugunkuSayilar(guildId),
    logRepository.enCokEslesenKurallar(guildId, { limit: 1 }),
    logRepository.enCokVerilenRoller(guildId, { limit: 1 })
  ]);

  const otomatikRolSayisi = new Set(aktifKurallar.map((k) => k.roleId)).size;

  return {
    toplamKural: tumKurallar.length,
    aktifKural: aktifKurallar.length,
    otomatikRolSayisi,
    bugunVerilen: bugun.verilen,
    bugunAlinan: bugun.alinan,
    basarisizIslem: bugun.basarisiz,
    enCokEslesenKuralId: enCokEslesen[0]?._id || null,
    enCokEslesenKuralSayisi: enCokEslesen[0]?.sayi || 0,
    enCokVerilenRolId: enCokVerilen[0]?._id || null,
    enCokVerilenRolSayisi: enCokVerilen[0]?.sayi || 0
  };
}

module.exports = { guildIstatistikleriGetir };
