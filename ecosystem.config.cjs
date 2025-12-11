module.exports = {
  apps: [
    {
      name: "GMR_Production",
      script: "./dist/index.js",   // Path to your built server file
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};
