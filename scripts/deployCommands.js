'use strict';

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const configManager = require('../src/core/configManager');
const logger = require('../src/core/logger');

const config = configManager.yukle({ ilkYukleme: true });

if (!config.token || !config.clientId) {
  logger.hata('token veya clientId ayarlanmamış. ayarlar.json dosyasını doldurun.');
  process.exit(1);
}

function komutVerileriniTopla() {
  const komutlar = [];
  const komutlarDizini = path.join(__dirname, '..', 'src', 'commands');
  const kategoriler = fs.readdirSync(komutlarDizini, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const kategori of kategoriler) {
    const kategoriYolu = path.join(komutlarDizini, kategori.name);
    const dosyalar = fs.readdirSync(kategoriYolu).filter((f) => f.endsWith('.js'));
    for (const dosya of dosyalar) {
      const modul = require(path.join(kategoriYolu, dosya));
      if (modul?.data?.toJSON) {
        komutlar.push(modul.data.toJSON());
      }
    }
  }
  return komutlar;
}

async function dagit() {
  const komutlar = komutVerileriniTopla();
  const rest = new REST().setToken(config.token);
  try {
    logger.sistem(`${komutlar.length} slash komut Discord'a kaydediliyor...`);
    await rest.put(Routes.applicationCommands(config.clientId), { body: komutlar });
    logger.basari('Slash komutlar başarıyla kaydedildi (global — yayılması ~1 saat sürebilir).');
  } catch (hata) {
    logger.hata('Slash komutlar kaydedilemedi.', hata);
    process.exit(1);
  }
}

dagit();
