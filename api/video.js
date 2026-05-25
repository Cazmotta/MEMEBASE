export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  const postUrl = decodeURIComponent(url);
  const errors = [];

  // Tenta extrair o ID do vídeo direto da API do Reddit
  try {
    const apiUrl = postUrl.replace('www.reddit.com', 'api.reddit.com') + '.json';
    const r = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MemeBase/1.0)',
        'Accept': 'application/json'
      }
    });
    if (r.ok) {
      const j = await r.json();
      const post = j?.[0]?.data?.children?.[0]?.data;
      if (post?.is_video && post?.media?.reddit_video) {
        const vid = post.media.reddit_video;
        const baseUrl = vid.fallback_url?.split('?')[0] || '';
        const audioUrl = baseUrl.replace(/DASH_\d+\.mp4/, 'DASH_audio.mp4');
        // Testa se o áudio existe
        const audioTest = await fetch(audioUrl, { method: 'HEAD' }).catch(() => null);
        if (audioTest?.ok) {
          return res.status(200).json({ url: baseUrl, audio: audioUrl, merged: false });
        }
        return res.status(200).json({ url: baseUrl, merged: false });
      }
      // Vídeo externo (gifv, mp4, etc)
      if (post?.url && /\.(mp4|webm|gifv)(\?|$)/i.test(post.url)) {
        return res.status(200).json({ url: post.url.replace('.gifv', '.mp4'), merged: true });
      }
    }
  } catch (e) { errors.push('reddit_api: ' + e.message); }

  // Fallback: reddit.saved.video
  try {
    const r = await fetch(`https://reddit.saved.video/api/index.php?url=${encodeURIComponent(postUrl)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (r.ok) {
      const j = await r.json();
      const videoUrl = j.url || j.hd || j.sd || (Array.isArray(j.links) && j.links[0]?.url) || null;
      if (videoUrl) return res.status(200).json({ url: videoUrl, merged: true });
    }
  } catch (e) { errors.push('saved_video: ' + e.message); }

  // Fallback: rxddit
  try {
    const r = await fetch(`https://rxddit.com/api/info?url=${encodeURIComponent(postUrl)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (r.ok) {
      const j = await r.json();
      const videoUrl = j.url || j.hd || j.sd || null;
      if (videoUrl) return res.status(200).json({ url: videoUrl, merged: true });
    }
  } catch (e) { errors.push('rxddit: ' + e.message); }

  return res.status(404).json({ error: 'video not found', details: errors });
}
