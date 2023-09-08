module.exports = {
  apps: [{
    name: "fs-watcher-demo",
    script: "./app.js",
    instances: "1",
    exec_mode: "fork",
    watch: true,
    "env": {
      "NODE_ENV": "development",
      "TZ": "Asia/Jakarta",
      "DEBUG": "fs_watcher:*"
    },
    "env_staging": {
      "NODE_ENV": "staging",
      "TZ": "Asia/Jakarta"
    },
    "env_production": {
      "NODE_ENV": "production",
      "TZ": "Asia/Jakarta"
    }
  }]
}
