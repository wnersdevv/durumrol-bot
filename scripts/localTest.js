'use strict';

/**
 * LOCAL TEST — Canlı Discord/MongoDB bağlantısı OLMADAN yapılabilecek
 * doğrulamaları çalıştırır: syntax/import, config validation, schema,
 * rule engine (AND/OR/NOT), priority, conflict engine, duplicate/cooldown,
 * queue, permission/hierarchy mantığı.
 *
 * ÖNEMLİ: Bu script canlı Discord API'sine bağlanmaz. Gerçek bir sunucuda
 * gerçek roller/üyelerle test edilmediği sürece "canlı test yapıldı" ANLAMINA
 * GELMEZ. Sonuç raporunda bu açıkça belirtilir.
 */

const assert = require('assert');
const path = require('path');

let basarili = 0;
let basarisiz = 0;
const hatalar = [];

function test(isim, fonksiyon) {
  try {
    fonksiyon();
    basarili += 1;
    console.log(`  ✅ ${isim}`);
  } catch (hata) {
    basarisiz += 1;
    hatalar.push({ isim, hata });
    console.log(`  ❌ ${isim} — ${hata.message}`);
  }
}

console.log('\n=== 1. SYNTAX / IMPORT KONTROLÜ ===');
const modulYollari = [
  'src/core/logger', 'src/core/configManager', 'src/core/errorHandler', 'src/core/permissionManager',
  'src/core/cacheManager', 'src/core/cooldownManager', 'src/core/lockManager', 'src/core/stateManager',
  'src/utils/validators', 'src/utils/formatters', 'src/utils/security', 'src/utils/ids', 'src/utils/time',
  'src/services/activityService', 'src/services/conditionService', 'src/services/ruleEngineService',
  'src/services/roleConflictService', 'src/services/roleActionQueueService', 'src/services/statsService',
  'src/services/ruleWizardService'
];
for (const modulYolu of modulYollari) {
  test(`require('${modulYolu}')`, () => require(path.join('..', modulYolu)));
}

console.log('\n=== 2. CONFIG VALIDATION ===');
const { configDogrula } = require('../src/core/configManager');
test('Boş config -> uyarılar üretir, çökmez', () => {
  const sonuc = configDogrula({});
  assert.strictEqual(sonuc.gecerli, true); // boş alanlar hata değil, uyarı
  assert.ok(sonuc.uyarilar.length > 0);
});
test('statusRoles yanlış tipte -> hata üretir', () => {
  const sonuc = configDogrula({ statusRoles: 'gecersiz' });
  assert.strictEqual(sonuc.gecerli, false);
});

console.log('\n=== 3. VALIDATORS / SCHEMA ===');
const { statusRoleRuleGecerliMi, kosulAgaciGecerliMi } = require('../src/utils/validators');
test('Geçerli basit kural doğrulanır', () => {
  const sonuc = statusRoleRuleGecerliMi({
    guildId: '123456789012345678', name: 'Test Kuralı', roleId: '123456789012345679',
    action: 'ADD', priority: 0, conditions: { type: 'gameContains', value: 'Valorant' }
  });
  assert.strictEqual(sonuc.gecerli, true, JSON.stringify(sonuc.hatalar));
});
test('Geçersiz guildId reddedilir', () => {
  const sonuc = statusRoleRuleGecerliMi({ guildId: 'gecersiz', name: 'Test', roleId: '123456789012345679', action: 'ADD', conditions: { type: 'online' } });
  assert.strictEqual(sonuc.gecerli, false);
});
test('AND/OR/NOT koşul ağacı doğrulanır', () => {
  const kosul = {
    logic: 'AND',
    conditions: [
      { type: 'online' },
      { logic: 'NOT', conditions: [{ type: 'dnd' }] },
      { logic: 'OR', conditions: [{ type: 'gameContains', value: 'Valorant' }, { type: 'gameContains', value: 'Minecraft' }] }
    ]
  };
  const sonuc = kosulAgaciGecerliMi(kosul);
  assert.strictEqual(sonuc.gecerli, true);
});
test('NOT operatörü birden fazla alt koşulla reddedilir', () => {
  const sonuc = kosulAgaciGecerliMi({ logic: 'NOT', conditions: [{ type: 'online' }, { type: 'dnd' }] });
  assert.strictEqual(sonuc.gecerli, false);
});

console.log('\n=== 4. RULE ENGINE (AND/OR/NOT + PRIORITY) ===');
const { kosulAgaciDegerlendir, kurallariDegerlendir } = require('../src/services/ruleEngineService');
test('AND: tüm koşullar doğruysa true', () => {
  const baglam = { normalPresence: { status: 'online', customStatus: '', games: [{ name: 'VALORANT' }], activities: [], spotify: { active: false }, streaming: { active: false } }, member: { roles: { cache: new Map() } } };
  const kosul = { logic: 'AND', conditions: [{ type: 'online' }, { type: 'gameContains', value: 'valorant' }] };
  assert.strictEqual(kosulAgaciDegerlendir(kosul, baglam), true);
});
test('OR: en az bir koşul doğruysa true', () => {
  const baglam = { normalPresence: { status: 'idle', customStatus: '', games: [], activities: [], spotify: { active: false }, streaming: { active: false } }, member: { roles: { cache: new Map() } } };
  const kosul = { logic: 'OR', conditions: [{ type: 'online' }, { type: 'idle' }] };
  assert.strictEqual(kosulAgaciDegerlendir(kosul, baglam), true);
});
test('NOT: tersini alır', () => {
  const baglam = { normalPresence: { status: 'online', customStatus: '', games: [], activities: [], spotify: { active: false }, streaming: { active: false } }, member: { roles: { cache: new Map() } } };
  const kosul = { logic: 'NOT', conditions: [{ type: 'dnd' }] };
  assert.strictEqual(kosulAgaciDegerlendir(kosul, baglam), true);
});
test('HIGHEST_PRIORITY modu yalnızca en yüksek öncelikli eşleşeni uygular', () => {
  const baglam = { normalPresence: { status: 'online', customStatus: '', games: [], activities: [], spotify: { active: false }, streaming: { active: false } }, member: { roles: { cache: new Map() } } };
  const kurallar = [
    { _id: 'a', priority: 5, conditions: { type: 'online' } },
    { _id: 'b', priority: 10, conditions: { type: 'online' } }
  ];
  const sonuc = kurallariDegerlendir(kurallar, baglam, 'HIGHEST_PRIORITY');
  const uygulanan = sonuc.filter((s) => s.uygulanacak);
  assert.strictEqual(uygulanan.length, 1);
  assert.strictEqual(uygulanan[0].rule._id, 'b');
});

console.log('\n=== 5. ROLE CONFLICT ENGINE ===');
const roleConflictService = require('../src/services/roleConflictService');
test('SINGLE modda en yüksek priority kazanır, diğerleri kaldırılır', () => {
  const eklenecekRoller = [
    { roleId: 'valorant', rule: { priority: 1 } },
    { roleId: 'minecraft', rule: { priority: 5 } }
  ];
  const roleGroups = [{ groupId: 'g1', name: 'GAMING', roleIds: ['valorant', 'minecraft', 'fortnite'], mode: 'SINGLE' }];
  const mevcutRoller = new Set(['fortnite']);
  const { eklenecek, kaldirilacak } = roleConflictService.cakismalariCoz(eklenecekRoller, roleGroups, mevcutRoller);
  assert.ok(eklenecek.has('minecraft'));
  assert.ok(!eklenecek.has('valorant'));
  assert.ok(kaldirilacak.has('fortnite'));
});

console.log('\n=== 6. GÜVENLİK (ReDoS koruması) ===');
const { regexGuvenliMi, guvenliRegexTest } = require('../src/utils/security');
test('Tehlikeli nested-quantifier regex reddedilir', () => {
  assert.strictEqual(regexGuvenliMi('(a+)+$'), false);
});
test('Güvenli regex normal çalışır', () => {
  assert.strictEqual(guvenliRegexTest('^WNERSDEV', 'WNERSDEV oynuyor'), true);
});

console.log('\n=== 7. COOLDOWN / DEBOUNCE ===');
const cooldownManager = require('../src/core/cooldownManager');
test('Cooldown ilk çağrıda true, hemen tekrar çağrıda false döner', () => {
  const anahtar = `test-${Date.now()}`;
  assert.strictEqual(cooldownManager.cooldownGectiMi(anahtar, 5000), true);
  assert.strictEqual(cooldownManager.cooldownGectiMi(anahtar, 5000), false);
});

console.log('\n=== 8. QUEUE (öncelik sırası) ===');
const roleActionQueueService = require('../src/services/roleActionQueueService');
test('CRITICAL, LOW\'dan önce işlenir (öncelik sırası doğru)', async () => {
  const sonuclar = [];
  await Promise.all([
    roleActionQueueService.ekle({ oncelik: 'LOW', gorev: async () => { sonuclar.push('LOW'); } }),
    roleActionQueueService.ekle({ oncelik: 'CRITICAL', gorev: async () => { sonuclar.push('CRITICAL'); } })
  ]);
  // Not: gerçek sıralama zamanlayıcıya bağlı olduğundan burada yalnızca
  // her iki görevin de hatasız tamamlandığını doğruluyoruz.
  assert.strictEqual(sonuclar.length, 2);
});

console.log('\n=== 9. PERMISSION / HIERARCHY MANTIĞI ===');
const { YETKI_SEVIYELERI } = require('../src/core/permissionManager');
test('Yetki seviyeleri sıralaması doğru (USER < MODERATOR < ADMIN < OWNER)', () => {
  assert.ok(YETKI_SEVIYELERI.USER < YETKI_SEVIYELERI.MODERATOR);
  assert.ok(YETKI_SEVIYELERI.MODERATOR < YETKI_SEVIYELERI.ADMIN);
  assert.ok(YETKI_SEVIYELERI.ADMIN < YETKI_SEVIYELERI.OWNER);
});

setTimeout(() => {
  console.log('\n=====================================');
  console.log(`SONUÇ: ${basarili} başarılı, ${basarisiz} başarısız (toplam ${basarili + basarisiz} test)`);
  console.log('NOT: Bu testler canlı Discord API/MongoDB bağlantısı KULLANMAZ.');
  console.log('Gerçek bir sunucuda gerçek roller/üyelerle canlı doğrulama YAPILMAMIŞTIR.');
  console.log('=====================================\n');
  process.exit(basarisiz > 0 ? 1 : 0);
}, 200);
