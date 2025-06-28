#!/usr/bin/env node
// check-syncid.js

// Standalone script to verify that your Sync ID is registered on the Actual server.
// Load environment variables from .env file (without overriding existing vars)
require('dotenv').config();
const api = require('@actual-app/api');

(async () => {
  const path = require('path');
  const budgetCacheDirRaw = process.env.BUDGET_CACHE_DIR;
  const budgetCacheDir =
    budgetCacheDirRaw &&
    (path.isAbsolute(budgetCacheDirRaw)
      ? budgetCacheDirRaw
      : path.resolve(process.cwd(), budgetCacheDirRaw));
  const {
    ACTUAL_SERVER_URL: serverURL,
    ACTUAL_PASSWORD: password,
    ACTUAL_SYNC_ID: syncId,
  } = process.env;

  if (!budgetCacheDir || !serverURL || !password || !syncId) {
    console.error(
      '❌ Please set BUDGET_CACHE_DIR (absolute or relative), ACTUAL_SERVER_URL, ACTUAL_PASSWORD and ACTUAL_SYNC_ID in your .env'
    );
    process.exit(1);
  }

  try {
    await api.init({ dataDir: budgetCacheDir, serverURL, password });

    console.log('🔍 Fetching list of budgets/groups from server…');
    const budgets = await api.getBudgets();
    console.log('→ Budgets on server:', budgets);

    const found = budgets.find((b) => b.groupId === syncId);
    if (found) {
      console.log(`✅ Sync ID ${syncId} FOUND on server for budget:`, found);
    } else {
      console.warn(
        `⚠️ Sync ID ${syncId} NOT found in the server’s budget list. ` +
          `Double-check your Sync ID in Settings → Show advanced settings → Sync ID.`
      );
    }
  } catch (err) {
    console.error('❌ Error talking to server:', err);
  } finally {
    await api.shutdown();
  }
})();
