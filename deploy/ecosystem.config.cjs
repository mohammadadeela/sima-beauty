// PM2 process file. Start with:  pm2 start deploy/ecosystem.config.cjs
const path = require("path");
module.exports = {
  apps: [
    {
      name: "sima",
      cwd: path.resolve(__dirname, ".."),
      script: "dist/index.cjs",
      env: { NODE_ENV: "production" },
      max_memory_restart: "400M",
      time: true,
    },
  ],
};
