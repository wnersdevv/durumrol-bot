'use strict';

/**
 * Bir kural değerlendirmesi sonucunda "eklenmesi gereken" rol listesini,
 * guild'in RoleGroup tanımlarına göre çözümler. SINGLE modundaki bir grupta
 * birden fazla rol eklenmek isteniyorsa, en yüksek priority'ye sahip kural
 * kazanır ve diğer grup rolleri "kaldırılacaklar" listesine eklenir.
 *
 * eklenecekRoller: [{ roleId, rule }]
 * roleGroups: GuildSettings.roleGroups
 * mevcutRoller: Set<roleId> - üyenin şu an sahip olduğu roller
 *
 * Döner: { eklenecek: Set<roleId>, kaldirilacak: Set<roleId> }
 */
function cakismalariCoz(eklenecekRoller, roleGroups = [], mevcutRoller = new Set()) {
  const eklenecek = new Set(eklenecekRoller.map((r) => r.roleId));
  const kaldirilacak = new Set();

  for (const grup of roleGroups) {
    if (grup.mode !== 'SINGLE') continue;
    const grupRolIdleri = new Set(grup.roleIds);

    // Bu grup içinde yeni eklenmek istenen roller
    const grupIcinAdaylar = eklenecekRoller.filter((r) => grupRolIdleri.has(r.roleId));
    if (grupIcinAdaylar.length === 0) continue;

    // En yüksek priority'li aday kazanır
    const kazanan = grupIcinAdaylar.reduce((en, aday) => {
      const enOncelik = en.rule?.priority ?? 0;
      const adayOncelik = aday.rule?.priority ?? 0;
      return adayOncelik > enOncelik ? aday : en;
    }, grupIcinAdaylar[0]);

    // Kazanan hariç grup içindeki diğer tüm roller (yeni eklenecekler dahil,
    // ve üyenin zaten sahip olduğu grup rolleri dahil) kaldırılacak listesine girer
    for (const roleId of grupRolIdleri) {
      if (roleId === kazanan.roleId) continue;
      eklenecek.delete(roleId);
      if (mevcutRoller.has(roleId)) {
        kaldirilacak.add(roleId);
      }
    }
  }

  return { eklenecek, kaldirilacak };
}

/**
 * Bir rolün herhangi bir SINGLE modlu gruba ait olup olmadığını,
 * ve o gruptaki diğer rolleri döner (manuel /rol ver komutunda kullanılabilir).
 */
function rolunGrubunuBul(roleId, roleGroups = []) {
  return roleGroups.find((g) => g.roleIds.includes(roleId)) || null;
}

module.exports = { cakismalariCoz, rolunGrubunuBul };
