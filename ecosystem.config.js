module.exports = {
  apps: [
    {
      name: "ripple-server",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3001
      },
      watch: false,
      instances: 1,
      exec_mode: "fork",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      merge_logs: true
    }
  ]
}; 