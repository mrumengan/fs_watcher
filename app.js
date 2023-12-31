const config = Object.assign(require('./config/main.json'), require('./config/mysql2.json'))
const debug = require('debug')('fs_watcher:app')
const chokidar = require('chokidar')
const mysql = require('./services/mysql2');
const axios = require('axios');

const tblUploadedFile = config.tables.uploadedFile

// const { initializeApp } = require('firebase-admin/app');
// const app = initializeApp();
//const admin = require("firebase-admin");
//const serviceAccount = require("../serviceAccountKey.json");
//admin.initializeApp({
//  credential: admin.credential.cert(serviceAccount),
//  databaseURL: "https://smart-display-398.firebaseio.com"
//});


const watcher = chokidar.watch(config.watchFolder, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  awaitWriteFinish: {
    stabilityThreshold: 5000 * 1, // sec * min
    pollInterval: 1000,
    alwaysStat: true,
  },
  ignoreInitial: true,
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
    // sendPushNotif({
    //   fileName: path,
    //   fileSize: stats.size
    // })
  } else {
    params = [path, stats.size, unixTime, unixTime]
    qInsert = 'INSERT INTO ' + tblUploadedFile + ' VALUES (NULL, ?, ?, ?, ?) ';
    qr = await mysql.query(qInsert, params);
    let body = {
      fileName: path,
      fileSize: stats.size
    }
    sendPushNotif(body)
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
    priority: 'high',
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

let tokens = [
  'c9uyim3PTTyPC7FM-Eu3P4:APA91bHRBUDXua3UTeqZq8AiIVO2I-aPGIl0VnzSJY-j_Yft2FgPzXqx9wJEGPSOxLkW2a0LfQcFIqa_I--waBtK5yDd0wTK1Z6wCBRzbUtPKHuKkH397DtYIZ1_B1TKfq0ho-jWqO8r',
  'cd-pidgvSniKsDHZDqsMOX:APA91bEyFOt_CclTSBBYJ0XYQbDQcj0Q9DZbLKhCaZpSDmYBXZ07AjOc9Hkc1A58WRFwGKGAQTqbdwGgJSH_Ht-harVbKLLFn1jpimV7fdPEQVFIDRDSmvJyga5cPe99fr5S_VqT9ugB',
  'eNfXl4uXSRyk-55MRNQxgj:APA91bGXH1Kjo6-lH1l6q1BPYzlMhIY92dGzAgsMHFOCBXhFkygB0iE9NO1cFverKoLX1QluhIZdhLf7mu-FWbQjnj1UWLzpEnlUljtbfIJCXu5xHZiFGJ5NfpktlIVOWsycemBOZtwT',     // wahyu
  'cedQmx3xTwmDP3WkLyxfhR:APA91bEWSzE1duahtC27w3DyqC3uaynNnPgi_CijqNdg_8FPuyAevlXBHZzaqnxYOY4pWBGMwQ09Nyc398cYnc9SIIpdOxpEJ1cwDw3YCwyh54b7UBkgkFnmiGdPooqL_ATRJtLZQ5su',     // aryo
  'cb_qopaJRwi_uXug9saQZv:APA91bH3R_3ZIYrrfwNdVVmiknEKejnr4-jH2nQjGmi_-v_R0bJXPVwLu92RJPHV6zLyplDKHFYsbWJrb-qcnwQFRQRL6x7KFZ4zBTtHucVywanAFNjdMCyZQTM2MREIRHo07FTt-8-6'      // mason
]

sendPushNotif = async function (message) {
  debug(message)
  tokens.forEach(token => {
    sendPushNotifTo(token, message)
  })
}

