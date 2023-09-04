const config = Object.assign(require('./config/main.json'), require('./config/mysql2.json'))
const debug = require('debug')('fs_watcher:app')
const chokidar = require('chokidar')
const mysql = require('./services/mysql2');

// debug('Config: ', config)

const tblUploadedFile = config.tables.uploadedFile

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

watcher
  .on('add', (path, stats) => recordNewFile(path, stats))
  .on('unlink', path => debug(`File ${path} has been removed`));

watcher.on('change', (path, stats) => {
  if (stats) debug(`File ${path} changed size to ${stats.size}`);
});

recordNewFile = async function (path, stats) {
  var path = path.replace(config.watchFolder + '/', '')

  debug(`Added: ${path}`)
  // debug(stats)

  let unixTime = Math.floor(Date.now() / 1000)
  params = [path, stats.size, unixTime, unixTime]

  qFind = 'SELECT id FROM ' + tblUploadedFile + ' WHERE file_name = ?'
  params = [path]
  qr = await mysql.query(qFind, params);
  debug(qr[0].id)

  if (qr[0].id) {
    debug('exist: ', qr.id)
  } else {
    qInsert = 'INSERT INTO ' + tblUploadedFile + ' VALUES (NULL, ?, ?, ?, ?) ';
    qr = await mysql.query(qInsert, params);
  }
}

updateUploadedFile = async function (path, stats) {

}
