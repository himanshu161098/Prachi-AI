export interface PlaybackMediaResult {
  videoId: string;
  title: string;
  channel?: string;
  watchUrl: string;
  embedUrl: string;
}

export class MediaPlaybackService {
  private static cache = new Map<string, { result: PlaybackMediaResult; expiresAt: number }>();

  /**
   * Resolves the first playable, non-ad YouTube video for a given query or trending feed.
   */
  public static async resolveYouTubeFirstTrack(query: string): Promise<PlaybackMediaResult | null> {
    const raw = query.trim();
    const cleanQuery = !raw || /^(song|songs|gana|gaana|music|hit song|hit songs|trending)$/i.test(raw)
      ? 'trending hit songs'
      : raw;

    const cacheKey = cleanQuery.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    try {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8'
        },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!res.ok) {
        return null;
      }

      const html = await res.text();

      // 1. Primary extractor: parse ytInitialData JSON object
      const jsonMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
                         html.match(/ytInitialData\s*=\s*({.+?});/);

      if (jsonMatch && jsonMatch[1]) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

          for (const section of contents) {
            const itemSection = section.itemSectionRenderer?.contents || [];
            for (const item of itemSection) {
              // Ensure we strictly pick videoRenderer and skip adSlotRenderer / promos
              if (item.videoRenderer && item.videoRenderer.videoId) {
                const videoId: string = item.videoRenderer.videoId;
                const title: string =
                  item.videoRenderer.title?.runs?.[0]?.text ||
                  item.videoRenderer.title?.simpleText ||
                  cleanQuery;
                const channel: string =
                  item.videoRenderer.ownerText?.runs?.[0]?.text ||
                  item.videoRenderer.shortBylineText?.runs?.[0]?.text ||
                  '';

                const result: PlaybackMediaResult = {
                  videoId,
                  title,
                  channel,
                  watchUrl: `https://www.youtube.com/watch?v=${videoId}&autoplay=1`,
                  embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`
                };

                this.cache.set(cacheKey, { result, expiresAt: Date.now() + 15 * 60 * 1000 });
                return result;
              }
            }
          }
        } catch (parseErr) {
          // JSON parsing failed, try regex fallback below
        }
      }

      // 2. Secondary fallback: Regex scanning for first videoId in non-ad contexts
      const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
      let m: RegExpExecArray | null;
      while ((m = videoIdRegex.exec(html)) !== null) {
        const videoId = m[1];
        if (videoId) {
          const result: PlaybackMediaResult = {
            videoId,
            title: cleanQuery,
            watchUrl: `https://www.youtube.com/watch?v=${videoId}&autoplay=1`,
            embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`
          };
          this.cache.set(cacheKey, { result, expiresAt: Date.now() + 15 * 60 * 1000 });
          return result;
        }
      }
    } catch (err: any) {
      console.warn('[MediaPlaybackService] Live resolution error:', err?.message || err);
    }

    return null;
  }
}
