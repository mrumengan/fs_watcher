const config = Object.assign(require('./config/main.json'), require('./config/mysql2.json'))
const debug = require('debug')('fs_watcher:app')
const chokidar = require('chokidar')
const mysql = require('./services/mysql2');
const axios = require('axios');

const tblUploadedFile = config.tables.uploadedFile

// const { initializeApp } = require('firebase-admin/app');
// const app = initializeApp();
// const admin = require("firebase-admin");
// const serviceAccount = require("../serviceAccountKey.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://smart-display-398.firebaseio.com"
// });

debug('Watching: ' + config.watchFolder)

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

// watcher.on('change', (path, stats) => updateUploadedFile(path, stats))

watcher.on('unlink', (path, stats) => removeUploadedFile(path, stats))


recordNewFile = async function (path, stats) {
  var fileName = path.replace(config.watchFolder + '/', '')
  var fileUrl = config.urlPrefix + '/' + fileName

  debug(`Added: ${fileName} ${fileUrl}`)
  // debug(stats)

  let unixTime = Math.floor(Date.now() / 1000)

  qFind = 'SELECT id, url FROM ' + tblUploadedFile + ' WHERE url = ?'
  params = [fileUrl]
  qr = await mysql.query(qFind, params);

  if (qr[0] && qr[0].id) {
    debug('exist: ', qr[0].url)
  } else {
    debug('new file: ')
    params = [1, fileName, fileUrl, unixTime, unixTime]
    qInsert = 'INSERT INTO ' + tblUploadedFile + ' (tv_show_channel_id, file_name, url, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ';
    qr = await mysql.query(qInsert, params);
    let body = {
      fileName: path,
      fileSize: stats.size
    }
    // sendPushNotif(body)
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
  let fileName = path.replace(config.watchFolder + '/', '')
  var fileUrl = config.urlPrefix + '/' + fileName

  debug(`Delete: ${path}`)
  // debug(stats)

  qFind = 'SELECT id FROM ' + tblUploadedFile + ' WHERE url = ?'
  params = [fileUrl]
  qr = await mysql.query(qFind, params)

  if (qr[0].id) {
    params = [fileUrl]
    qRemove = 'DELETE FROM ' + tblUploadedFile + ' WHERE url = ? ';
    qr = await mysql.query(qRemove, params);
  } else {
    debug('not exist: ', qr.id)
  }

}

// baseURL: 'https://fcm.googleapis.com/fcm/send',

const http = axios.create({
  baseURL: 'https://fcm.googleapis.com/fcm',
  timeout: 1000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'key=AAAA_cRpgZY:APA91bEaBwuFd44eQBoTOONal082-XGO5PF8CNUeoZJpP6Y7vqE7ZrvLI1MBorA6nM_ih147xVvaj9f06TOxP6Np4orj3wHxox38wV7pN1PXm1_-EKH2eOkcheGIzvdVoHKd7gkbHuGj'
  }
});

sendPushNotifTo = async function (fcmToken, message) {

  debug('Sending to: ' + fcmToken)
  http.post('https://fcm.googleapis.com/fcm/send', {
    to: fcmToken,
    notification: {
      title: 'New file update!',
      body: message
    }
  })
    .then(response => {
      debug(response.data)
    })
    .catch(err => {
      debug("Error: " + err.message);
      debug(err);
    })
}

let tokens = [];

sendPushNotif = async function (message) {
  // debug(message)
  // tokens.forEach(token => {
  //   sendPushNotifTo(token, message)
  // })
}

