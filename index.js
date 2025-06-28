#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

const api = require('@actual-app/api');
const cron = require('node-cron');

(async () => {
  const dataDir = process.env.ACTUAL_DATA_DIR;
  const serverURL = process.env.ACTUAL_SERVER_URL;
  const password = process.env.ACTUAL_PASSWORD;
  const syncId = process.env.ACTUAL_SYNC_ID;

  if (!dataDir || !serverURL || !password || !syncId) {
    console.error(
      'Please set ACTUAL_DATA_DIR, ACTUAL_SERVER_URL, ACTUAL_PASSWORD, and ACTUAL_SYNC_ID in your .env'
    );
    process.exit(1);
  }

  await api.init({ dataDir, serverURL, password });

  let hasDownloaded = false;

  async function syncAndReport() {
    // On first run, fetch or sync the budget; ignore errors
    if (!hasDownloaded) {
      try {
        await api.downloadBudget(syncId);
        hasDownloaded = true;
      } catch (err) {
        console.error('Error downloading budget:', err.message);
      }
    }

    // Sync changes; ignore errors
    try {
      await api.sync();
    } catch (err) {
      // ignore sync errors
    }

    // Fetch accounts and balances; ignore errors per account
    let accounts = [];
    try {
      accounts = await api.getAccounts();
    } catch (err) {
      // ignore getAccounts errors
    }

    console.log(new Date().toISOString(), 'Account balances:');
    for (const acc of accounts) {
      let balance;
      try {
        balance = await api.getAccountBalance(acc.id);
      } catch {
        balance = 'n/a';
      }
      console.log(`- ${acc.name}: ${balance}`);
    }
  }

  // Run once now, then schedule every minute
  await syncAndReport();
  const job = cron.schedule('* * * * *', syncAndReport);

  async function cleanup() {
    job.stop();
    await api.shutdown();
    process.exit();
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
})();
