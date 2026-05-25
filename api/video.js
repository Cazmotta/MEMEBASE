export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const postUrl = decodeURIComponent(url).replace(/\/?$/, '') + '.json';
    const r = await fetch(postUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });

    if (!r.ok) return res.status(502).json({ error: 'reddit fetch failed', status: r.status });

    const j = await r.json();
    const post = j?.[0]?.data?.children?.[0]?.data;
    if (!post) return res.status(404).json({ error: 'post not found' });

    // Vídeo nativo do Reddit
    if (post.is_video && post.media?.reddit_video) {
      const vid = post.media.reddit_video;
      const baseUrl = (vid.fallback_url || '').split('?')[0];
      // Monta URL do áudio — padrão do v.redd.it
      const audioUrl = baseUrl.replace(/\/DASH_\d+\.mp4$/, '/DASH_audio.mp4');
      return res.status(200).json({
        type: 'reddit_video',
        video: baseUrl,
        audio: audioUrl,
        width: vid.width,
        height: vid.height,
      });
    }

    // Vídeo externo (mp4, gifv, webm)
    if (post.url && /\.(mp4|webm|gifv)(\?|$)/i.test(post.url)) {
      return res.status(200).json({
        type: 'external',
        video: post.url.replace('.gifv', '.mp4'),
        audio: null,
      });
    }

    // Hosted video (v.redd.it sem is_video flag)
    if (post.secure_media?.reddit_video) {
      const vid = post.secure_media.reddit_video;
      const baseUrl = (vid.fallback_url || '').split('?')[0];
      const audioUrl = baseUrl.replace(/\/DASH_\d+\.mp4$/, '/DASH_audio.mp4');
      return res.status(200).json({
        type: 'reddit_video',
        video: baseUrl,
        audio: audioUrl,
      });
    }

    return res.status(404).json({ error: 'no video found in post' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
