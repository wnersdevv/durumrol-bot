'use strict';

const ruleRepository = require('../database/repositories/ruleRepository');
const cacheManager = require('../core/cacheManager');
const { statusRoleRuleGecerliMi } = require('../utils/validators');
const { DogrulamaHatasi } = require('../core/errorHandler');
const auditService = require('./auditService');

function cacheAnahtari(guildId) {
  return `guild:${guildId}:rules`;
}

async function kurallariGetir(guildId, { sadeceAktif = true, cacheKullan = true } = {}) {
  const anahtar = `${cacheAnahtari(guildId)}:${sadeceAktif}`;
  if (cacheKullan) {
    const onbellek = cacheManager.rules.al(anahtar);
    if (onbellek) return onbellek;
  }
  const kurallar = await ruleRepository.listele(guildId, { sadeceAktif });
  cacheManager.rules.ayarla(anahtar, kurallar);
  return kurallar;
}

function cacheGecersizKil(guildId) {
  cacheManager.rules.onEkiyleSil(cacheAnahtari(guildId));
}

async function kuralOlustur(guildId, veri, actorId) {
  const adayKural = { ...veri, guildId };
  const { gecerli, hatalar } = statusRoleRuleGecerliMi(adayKural);
  if (!gecerli) {
    throw new DogrulamaHatasi(`Kural doğrulanamadı: ${hatalar.join(' | ')}`, { hatalar });
  }
  const kural = await ruleRepository.olustur(guildId, { ...veri, createdBy: actorId });
  cacheGecersizKil(guildId);
  await auditService.kaydet(guildId, actorId, 'KURAL_OLUSTURULDU', kural._id.toString(), { name: kural.name });
  return kural;
}

async function kuralGuncelle(guildId, ruleId, guncellemeler, actorId) {
  if (guncellemeler.conditions || guncellemeler.action || guncellemeler.roleId || guncellemeler.name) {
    const mevcut = await ruleRepository.idIleBul(guildId, ruleId);
    if (!mevcut) throw new DogrulamaHatasi('Kural bulunamadı.');
    const birlesik = { ...mevcut.toObject(), ...guncellemeler };
    const { gecerli, hatalar } = statusRoleRuleGecerliMi(birlesik);
    if (!gecerli) throw new DogrulamaHatasi(`Kural doğrulanamadı: ${hatalar.join(' | ')}`, { hatalar });
  }
  const kural = await ruleRepository.guncelle(guildId, ruleId, guncellemeler);
  cacheGecersizKil(guildId);
  await auditService.kaydet(guildId, actorId, 'KURAL_GUNCELLENDI', ruleId, guncellemeler);
  return kural;
}

async function kuralSil(guildId, ruleId, actorId) {
  const sonuc = await ruleRepository.sil(guildId, ruleId);
  cacheGecersizKil(guildId);
  await auditService.kaydet(guildId, actorId, 'KURAL_SILINDI', ruleId, {});
  return sonuc;
}

async function kuralAcKapat(guildId, ruleId, enabled, actorId) {
  return kuralGuncelle(guildId, ruleId, { enabled }, actorId);
}

async function kuralGetir(guildId, ruleId) {
  return ruleRepository.idIleBul(guildId, ruleId);
}

async function eslesmeSayaciniArtir(guildId, ruleId) {
  return ruleRepository.eslesmeSayaciniArtir(guildId, ruleId);
}

module.exports = {
  kurallariGetir,
  kuralOlustur,
  kuralGuncelle,
  kuralSil,
  kuralAcKapat,
  kuralGetir,
  eslesmeSayaciniArtir,
  cacheGecersizKil
};
