'use strict';

const { discordIdGecerliMi } = require('./ids');

const MAKS_REGEX_UZUNLUGU = 200;
const MAKS_DEGER_UZUNLUGU = 512;
const REGEX_CALISMA_SURESI_MS = 50;

// Tehlikeli, katastrofik geri izleme (catastrophic backtracking) üretebilecek
// yaygın kalıpları reddet: iç içe nicelik belirteçleri (nested quantifiers).
const TEHLIKELI_REGEX_KALIPLARI = [
  /(\([^)]*[+*]\)[+*])/, // (a+)+ tarzı
  /(\([^)]*\{[0-9]+,\}[^)]*\)[+*])/,
  /(\.\*){2,}/, // .*.* gibi çoklu greedy
  /(\.\+){2,}/
];

class GuvenlikHatasi extends Error {
  constructor(mesaj) {
    super(mesaj);
    this.name = 'GuvenlikHatasi';
  }
}

function regexGuvenliMi(pattern) {
  if (typeof pattern !== 'string') return false;
  if (pattern.length === 0 || pattern.length > MAKS_REGEX_UZUNLUGU) return false;
  return !TEHLIKELI_REGEX_KALIPLARI.some((kalip) => kalip.test(pattern));
}

/**
 * Kullanıcı tanımlı regex'i, senkron zaman aşımı simülasyonu ile
 * (çalışma süresi ölçümü) güvenli şekilde çalıştırır. Node.js'te gerçek
 * bir senkron regex timeout mekanizması olmadığından, önce statik risk
 * analizi (regexGuvenliMi) yapılır; ardından çalışma süresi ölçülür ve
 * sınır aşılırsa sonuç reddedilir ve gelecekte o kural devre dışı bırakılır.
 */
function guvenliRegexTest(pattern, deger) {
  if (!regexGuvenliMi(pattern)) {
    throw new GuvenlikHatasi(`Regex pattern güvenlik kontrolünden geçemedi: riskli kalıp veya uzunluk aşımı.`);
  }
  if (typeof deger !== 'string' || deger.length > MAKS_DEGER_UZUNLUGU) {
    return false;
  }

  const baslangic = process.hrtime.bigint();
  let sonuc;
  try {
    const regex = new RegExp(pattern);
    sonuc = regex.test(deger);
  } catch (_hata) {
    throw new GuvenlikHatasi('Regex derlenemedi: geçersiz pattern.');
  }
  const bitis = process.hrtime.bigint();
  const gecenMs = Number(bitis - baslangic) / 1_000_000;

  if (gecenMs > REGEX_CALISMA_SURESI_MS) {
    throw new GuvenlikHatasi(`Regex çalışma süresi sınırı aşıldı (${gecenMs.toFixed(1)}ms). Kural güvenlik nedeniyle atlandı.`);
  }
  return sonuc;
}

function metniTemizle(deger, maksUzunluk = MAKS_DEGER_UZUNLUGU) {
  if (typeof deger !== 'string') return '';
  return deger.slice(0, maksUzunluk);
}

function guildIzoleSorguDogrula(guildId) {
  if (!discordIdGecerliMi(guildId)) {
    throw new GuvenlikHatasi('Geçersiz guildId: sorgu guild izolasyonu için gereklidir.');
  }
  return guildId;
}

module.exports = {
  GuvenlikHatasi,
  MAKS_REGEX_UZUNLUGU,
  MAKS_DEGER_UZUNLUGU,
  regexGuvenliMi,
  guvenliRegexTest,
  metniTemizle,
  guildIzoleSorguDogrula
};
