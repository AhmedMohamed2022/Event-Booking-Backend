module.exports = {
  apps: [
    {
      name: "event-booking-api",
      script: "server.js",
      instances: "max",
      exec_mode: "cluster",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      max_memory_restart: "500M",
    },
  ],
};
