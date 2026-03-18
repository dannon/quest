// PM2 process manager configuration for orangehack.com deployment
module.exports = {
  apps: [
    {
      name: 'quest-terminal-server',
      script: 'server/dist/index.js',
      cwd: '/var/www/quest',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
    },
  ],
};
