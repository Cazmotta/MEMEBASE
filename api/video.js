export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  const postUrl = decodeURIComponent(url);

  const endpoints = [
    `https://reddit.saved.video/api/index.php?url=${encodeURIComponent(postUrl)}`,
    `https://rxddit.com/api/info?url=${encodeURIComponent(postUrl)}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const r = await fetch(endpoint, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!r.ok) continue;
      const j = await r.json();
      const videoUrl =
        j.url || j.hd || j.sd ||
        (Array.isArray(j.links) && j.links[0]?.url) ||
        null;
      if (videoUrl) return res.status(200).json({ url: videoUrl });
    } catch (_) { continue; }
  }

  return res.status(404).json({ error: 'video not found' });
}
