'use strict';

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');

const configManager = require('./src/core/configManager');
const logger = require('./src/core/logger');
const { kuresekHatalariBagla } = require('./src/core/errorHandler');
const stateManager = require('./src/core/stateManager');
const cacheManager = require('./src/core/cacheManager');
const roleActionQueueService = require('./src/services/roleActionQueueService');
const reconciliationService = require('./src/services/reconciliationService');
const { baglan, baglantiyiKapat } = require('./src/database/connection');

kuresekHatalariBagla();

const config = configManager.yukle({ ilkYukleme: true });
logger.debugModunuAyarla(config.bot?.debug);

logger.sistem('WNERSDEV Durum & Rol başlatılıyor...');

if (!config.token || !config.clientId) {
  logger.hata('token veya clientId ayarlanmamış. Bot UNCONFIGURED modda: Discord\'a bağlanılmayacak.');
  logger.hata('Lütfen ayarlar.json dosyasını ayarlar.example.json şablonuna göre doldurun ve yeniden başlatın.');
  process.exit(1);
}

// Presence tabanlı sistem için gerekli Gateway Intent'ler.
const GEREKLI_INTENTLER = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildPresences,
  GatewayIntentBits.GuildMessages
];

const client = new Client({
  intents: GEREKLI_INTENTLER,
  partials: [Partials.GuildMember, Partials.User],
  ws: { properties: { browser: 'Discord iOS' } } // presence verisinin bazı istemci türlerinde daha tutarlı gelmesi için
});

client.commands = new Collection();

function komutlariYukle() {
  const komutlarDizini = path.join(__dirname, 'src', 'commands');
  if (!fs.existsSync(komutlarDizini)) return;

  const kategoriler = fs.readdirSync(komutlarDizini, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const kategori of kategoriler) {
    const kategoriYolu = path.join(komutlarDizini, kategori.name);
    const dosyalar = fs.readdirSync(kategoriYolu).filter((f) => f.endsWith('.js'));
    for (const dosya of dosyalar) {
      const modul = require(path.join(kategoriYolu, dosya));
      if (modul?.data?.name && typeof modul.execute === 'function') {
        client.commands.set(modul.data.name, modul);
        logger.debug(`Komut yüklendi: /${modul.data.name}`);
      }
    }
  }
  logger.bilgi(`${client.commands.size} slash komut yüklendi.`);
}

function eventleriYukle() {
  const eventDizini = path.join(__dirname, 'src', 'events');
  const dosyalar = fs.readdirSync(eventDizini).filter((f) => f.endsWith('.js'));
  for (const dosya of dosyalar) {
    const modul = require(path.join(eventDizini, dosya));
    if (!modul?.name || typeof modul.execute !== 'function') continue;
    if (modul.once) {
      client.once(modul.name, (...args) => modul.execute(...args, client));
    } else {
      client.on(modul.name, (...args) => modul.execute(...args, client));
    }
    logger.debug(`Event yüklendi: ${modul.name}`);
  }
  logger.bilgi('Event dinleyicileri yüklendi.');
}

async function baslat() {
  komutlariYukle();
  eventleriYukle();

  await baglan(config.mongoUri);

  try {
    await client.login(config.token);
  } catch (hata) {
    logger.hata('Discord\'a giriş yapılamadı. Token geçersiz olabilir.', hata);
    process.exit(1);
  }
}

async function zarifKapanis(sinyal) {
  logger.sistem(`${sinyal} alındı, sistem güvenli şekilde kapatılıyor...`);
  try {
    stateManager.killSwitchAyarla('presenceIsleme', true);
    reconciliationService.periyodikDurdur();
    roleActionQueueService.durdur();
    roleActionQueueService.temizle();
    cacheManager.durdur();
    cacheManager.tumunuTemizle();
    await baglantiyiKapat();
    client.destroy();
    logger.sistem('Kapatma işlemleri tamamlandı. Güle güle!');
  } catch (hata) {
    logger.hata('Kapatma sırasında hata oluştu', hata);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => zarifKapanis('SIGINT'));
process.on('SIGTERM', () => zarifKapanis('SIGTERM'));

baslat();
