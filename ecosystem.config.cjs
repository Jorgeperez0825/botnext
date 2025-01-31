module.exports = {
  apps: [{
    name: 'trading-bot',
    script: 'npm',
    args: 'run start-multi',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    env: {
      NODE_ENV: 'production',
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
      FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
      BINANCE_API_KEY: process.env.BINANCE_API_KEY,
      BINANCE_API_SECRET: process.env.BINANCE_API_SECRET,
      CLAUDE_API_KEY: process.env.CLAUDE_API_KEY
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    time: true
  }]
} 