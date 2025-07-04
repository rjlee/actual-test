#!/usr/bin/env node

// Load environment variables from .env file
// Load environment variables from .env file (without overriding existing vars)
require('dotenv').config();

const api = require('@actual-app/api');
const cron = require('node-cron');
const fs = require('fs');
const { Buffer } = require('buffer');

(async () => {
  const path = require('path');
  const budgetCacheDirRaw = process.env.BUDGET_CACHE_DIR;
  const budgetCacheDir =
    budgetCacheDirRaw &&
    (path.isAbsolute(budgetCacheDirRaw)
      ? budgetCacheDirRaw
      : path.resolve(process.cwd(), budgetCacheDirRaw));
    const serverURL = process.env.ACTUAL_SERVER_URL;
  const password = process.env.ACTUAL_PASSWORD;
  const syncId = process.env.ACTUAL_SYNC_ID;

  if (!budgetCacheDir || !serverURL || !password || !syncId) {
    console.error(
      'Please set BUDGET_CACHE_DIR (absolute or relative), ACTUAL_SERVER_URL, ACTUAL_PASSWORD, and ACTUAL_SYNC_ID in your .env'
    );
    process.exit(1);
  }

  await api.init({ dataDir: budgetCacheDir, serverURL, password });

  // Connectivity check: verify the sync server is reachable
  try {
    console.log('🔌 Testing connectivity to Actual sync server at', serverURL);
    await api.getBudgets();
  } catch (err) {
    console.error(
      '❌ Unable to reach Actual server at',
      serverURL + ':',
      err.message
    );
    process.exit(1);
  }

  let hasDownloaded = false;

  async function syncAndReport() {
    // On first run, fetch the budget; try JSON-RPC first, then fallback to HTTP GET
    if (!hasDownloaded) {
      try {
        await api.downloadBudget(syncId);
        hasDownloaded = true;
      } catch (err) {
        console.error('Error downloading budget via JSON-RPC, falling back to HTTP GET:', err.message);
        try {
          const url = `${serverURL}/api/budgets/${syncId}/download`;
          const auth = 'Basic ' + Buffer.from(':' + password).toString('base64');
          const res = await fetch(url, { method: 'GET', headers: { Authorization: auth } });
          if (!res.ok) throw new Error(`HTTP GET download failed: ${res.status}`);
          const data = await res.arrayBuffer();
          await fs.promises.mkdir(path.join(budgetCacheDir, syncId), { recursive: true });
          await fs.promises.writeFile(path.join(budgetCacheDir, syncId, 'db.sqlite'), Buffer.from(data));
          hasDownloaded = true;
        } catch (e2) {
          console.error('Fallback HTTP GET download-budget failed:', e2.message);
        }
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
