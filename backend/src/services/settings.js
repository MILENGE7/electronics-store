const prisma = require("../config/db");

// Store-wide settings live in a single row (id 1). The migration inserts it,
// but upsert keeps things working even on a database where it's missing.
function getSettings(client = prisma) {
  return client.storeSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

module.exports = { getSettings };
