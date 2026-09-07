'use strict';

const mongoose = require('mongoose');
const logger = require('../core/logger');
const stateManager = require('../core/stateManager');

let baglaniyorMu = false;

async function baglan(mongoUri) {
  if (!mongoUri) {
    logger.uyari('mongoUri tanımlı değil. Veritabanı olmadan DEVRE DIŞI modda devam ediliyor.');
    stateManager.mongoDurumunuAyarla(false);
    return null;
  }
  if (baglaniyorMu) return mongoose.connection;
  baglaniyorMu = true;

  mongoose.connection.on('connected', () => {
    logger.basari('MongoDB bağlantısı kuruldu.');
    stateManager.mongoDurumunuAyarla(true);
  });
  mongoose.connection.on('disconnected', () => {
    logger.uyari('MongoDB bağlantısı koptu.');
    stateManager.mongoDurumunuAyarla(false);
  });
  mongoose.connection.on('error', (hata) => {
    logger.hata('MongoDB bağlantı hatası', hata);
    stateManager.mongoDurumunuAyarla(false);
  });

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10
    });
  } catch (hata) {
    logger.hata('MongoDB bağlantısı kurulamadı. Sistem DEVRE DIŞI modda çalışacak.', hata);
    stateManager.mongoDurumunuAyarla(false);
  } finally {
    baglaniyorMu = false;
  }
  return mongoose.connection;
}

async function baglantiyiKapat() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.sistem('MongoDB bağlantısı güvenli şekilde kapatıldı.');
  }
}

function baglanmisMi() {
  return mongoose.connection.readyState === 1;
}

module.exports = { baglan, baglantiyiKapat, baglanmisMi, mongoose };
