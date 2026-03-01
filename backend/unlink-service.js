// @unlink-xyz packages are ESM-only ("type": "module").
// We use dynamic import() to load them from our CommonJS backend.
// Lazy singleton — SDK initializes on first privacy/burner route call.

let unlinkInstance = null;
let initPromise = null;

async function getUnlink() {
  // Return cached instance if ready
  if (unlinkInstance) return unlinkInstance;

  // Deduplicate concurrent calls — only one init runs at a time
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const { initUnlink, createSqliteStorage } = await import("@unlink-xyz/node");

        const unlink = await initUnlink({
          chain: "monad-testnet",
          storage: createSqliteStorage({ path: "./wallet.db" }),
          setup: true,   // auto-creates seed + first account
          sync: false,    // disable background sync (prevents gateway RPC retry spam)
          autoSync: false,
        });

        // Verify seed exists (setup: true should handle this)
        const seedExists = await unlink.sdk.seed.exists();
        if (!seedExists) {
          const { mnemonic } = await unlink.sdk.seed.create();
          console.log("[unlink] SAVE THIS MNEMONIC:", mnemonic);
        }

        // Verify at least one account exists
        const accounts = await unlink.sdk.accounts.list();
        if (accounts.length === 0) {
          await unlink.sdk.accounts.create();
          console.log("[unlink] Created first account");
        }

        // Export mnemonic for backup reference (first run)
        try {
          const mnemonic = await unlink.sdk.seed.exportMnemonic();
          console.log("[unlink] Mnemonic available (stored in wallet.db)");
        } catch (_) {
          // exportMnemonic may not be available
        }

        unlinkInstance = unlink;
        console.log(`✅ Unlink SDK ready | ${accounts.length || 1} account(s) | chain: monad-testnet`);
        return unlink;
      } catch (err) {
        initPromise = null; // allow retry on next call
        throw err;
      }
    })();
  }

  return initPromise;
}

module.exports = { getUnlink };
