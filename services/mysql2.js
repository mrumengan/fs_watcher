const debug = require('debug')('fs_watcher:services.mysl2')
const config = require('../config/mysql2.json');
const mysql = require('mysql2/promise');

// const connection = await mysql.createConnection(config.server);
const pool = mysql.createPool(config.serverPool);

async function query(sql, params) {
  let results = [];
  try {
    // debug('Params: ', params);
    const _q = pool.format(sql, params);
    debug(_q);
    results = await pool.query(sql, params, (err, rows) => {
      return rows;
    });
  } catch (e) {
    console.error('MySQL Error: ', e.toString());
  }

  // pool.end();

  return results[0];
}

module.exports = {
  query
}