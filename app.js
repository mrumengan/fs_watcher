const config = Object.assign(require('./config/main.json'), require('./config/mysql2.json'))
const debug = require('debug')('fs_watcher:app')
const chokidar = require('chokidar')
const mysql = require('./services/mysql2');

const tblUploadedFile = config.tables.uploadedFile

// const { initializeApp } = require('firebase-admin/app');
// const app = initializeApp();
const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://smart-display-398.firebaseio.com"
});


const watcher = chokidar.watch(config.watchFolder, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  awaitWriteFinish: {
    stabilityThreshold: 5000 * 1, // sec * min
    pollInterval: 1000,
    alwaysStat: true,
  },
  ignoreInitial: false,
});

watcher.on('add', (path, stats) => recordNewFile(path, stats))

watcher.on('change', (path, stats) => updateUploadedFile(path, stats))

watcher.on('unlink', (path, stats) => removeUploadedFile(path, stats))


recordNewFile = async function (path, stats) {
  var path = path.replace(config.watchFolder + '/', '')

  debug(`Added: ${path}`)
  // debug(stats)

  let unixTime = Math.floor(Date.now() / 1000)

  qFind = 'SELECT id, file_name FROM ' + tblUploadedFile + ' WHERE file_name = ?'
  params = [path]
  qr = await mysql.query(qFind, params);

  if (qr[0] && qr[0].id) {
    debug('exist: ', qr[0].file_name)
  } else {
    params = [path, stats.size, unixTime, unixTime]
    qInsert = 'INSERT INTO ' + tblUploadedFile + ' VALUES (NULL, ?, ?, ?, ?) ';
    qr = await mysql.query(qInsert, params);
  }
}

updateUploadedFile = async function (path, stats) {
  var path = path.replace(config.watchFolder + '/', '')

  debug(`Update: ${path}`)
  // debug(stats)

  let unixTime = Math.floor(Date.now() / 1000)

  qFind = 'SELECT id FROM ' + tblUploadedFile + ' WHERE file_name = ?'
  params = [path]
  qr = await mysql.query(qFind, params);

  if (qr[0].id) {
    params = [stats.size, unixTime, path]
    qUpdate = 'UPDATE ' + tblUploadedFile + ' SET file_size = ?, updated_at = ? WHERE file_name = ?';
    qr = await mysql.query(qUpdate, params);
  } else {
    debug('not exist: ', qr.id)
  }

}

removeUploadedFile = async function (path, stats) {
  var path = path.replace(config.watchFolder + '/', '')

  debug(`Delete: ${path}`)
  // debug(stats)

  qFind = 'SELECT id FROM ' + tblUploadedFile + ' WHERE file_name = ?'
  params = [path]
  qr = await mysql.query(qFind, params)

  if (qr[0].id) {
    params = [path]
    qRemove = 'DELETE FROM ' + tblUploadedFile + ' WHERE file_name = ? ';
    qr = await mysql.query(qRemove, params);
  } else {
    debug('not exist: ', qr.id)
  }

}

sendNotification = async function (registrationToken, msg) {

  const message = {
    data: {
      score: '850',
      time: '2:45'
    },
    token: registrationToken
  };

  // Send a message to the device corresponding to the provided
  // registration token.
  admin.messaging().send(message)
    .then((response) => {
      // Response is a message ID string.
      console.log('Successfully sent message:', response);
    })
    .catch((error) => {
      console.log('Error sending message:', error);
    });
}

sendNotification('TEST', 'Pesan')
