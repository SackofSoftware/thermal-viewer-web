// Vercel Serverless Function: get a temporary direct download link from Dropbox
// POST /api/dropbox-link { path: "/Inspections/..." }
// Returns { url: "https://uc....dl.dropboxusercontent.com/..." }

const { Dropbox } = require('dropbox');

let dbx = null;

function getClient() {
  if (!dbx) {
    const config = {
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
    };
    if (process.env.DROPBOX_REFRESH_TOKEN) {
      config.refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
    }
    if (process.env.DROPBOX_ACCESS_TOKEN) {
      config.accessToken = process.env.DROPBOX_ACCESS_TOKEN;
    }
    dbx = new Dropbox(config);
  }
  return dbx;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST required' });
  }

  const { path } = req.body;
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'path required' });
  }

  // Security: only allow paths under /Inspections/
  if (!path.startsWith('/Inspections/')) {
    return res.status(403).json({ error: 'forbidden path' });
  }

  try {
    const client = getClient();
    const result = await client.filesGetTemporaryLink({ path });
    // Cache for 3 hours (links expire after 4)
    res.setHeader('Cache-Control', 'public, max-age=10800');
    return res.status(200).json({ url: result.result.link });
  } catch (err) {
    console.error('Dropbox error:', err.message, err.status, JSON.stringify(err.error || {}));
    return res.status(500).json({ error: 'Failed to get link', detail: err.message });
  }
};
