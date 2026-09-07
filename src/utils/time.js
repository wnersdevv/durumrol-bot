'use strict';

function suanZamanDamgasi() {
  return Date.now();
}

function saniyeyiOkunabilirYap(saniye) {
  const gun = Math.floor(saniye / 86400);
  const saat = Math.floor((saniye % 86400) / 3600);
  const dakika = Math.floor((saniye % 3600) / 60);
  const sn = Math.floor(saniye % 60);
  const parcalar = [];
  if (gun > 0) parcalar.push(`${gun}g`);
  if (saat > 0) parcalar.push(`${saat}s`);
  if (dakika > 0) parcalar.push(`${dakika}dk`);
  parcalar.push(`${sn}sn`);
  return parcalar.join(' ');
}

function msyiOkunabilirYap(ms) {
  return saniyeyiOkunabilirYap(Math.floor(ms / 1000));
}

/**
 * Guild timezone'una göre şu anki saatin quiet hours (sessiz saatler)
 * aralığında olup olmadığını kontrol eder. quietHours: { baslangicSaat, bitisSaat, timezone }
 * Gece yarısını aşan aralıkları (ör. 23-07) destekler.
 */
function quietHoursIcindeMi(quietHours) {
  if (!quietHours || quietHours.enabled === false) return false;
  const { baslangicSaat, bitisSaat, timezone = 'Europe/Istanbul' } = quietHours;
  if (baslangicSaat === undefined || bitisSaat === undefined) return false;

  let suankiSaat;
  try {
    const formatlayici = new Intl.DateTimeFormat('tr-TR', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone
    });
    suankiSaat = parseInt(formatlayici.format(new Date()), 10);
  } catch (_hata) {
    suankiSaat = new Date().getHours();
  }

  if (baslangicSaat === bitisSaat) return false;
  if (baslangicSaat < bitisSaat) {
    return suankiSaat >= baslangicSaat && suankiSaat < bitisSaat;
  }
  // Gece yarısını aşan aralık, ör: 23 -> 07
  return suankiSaat >= baslangicSaat || suankiSaat < bitisSaat;
}

function tarihiTurkceFormatla(tarih) {
  if (!tarih) return 'bilinmiyor';
  const d = tarih instanceof Date ? tarih : new Date(tarih);
  if (Number.isNaN(d.getTime())) return 'bilinmiyor';
  return d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
}

module.exports = {
  suanZamanDamgasi,
  saniyeyiOkunabilirYap,
  msyiOkunabilirYap,
  quietHoursIcindeMi,
  tarihiTurkceFormatla
};
