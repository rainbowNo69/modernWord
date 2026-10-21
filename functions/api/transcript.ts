// ABOUTME: Pages Function 版 /api/transcript —— 抓取单集剧本对白

import {
  BASE_URL,
  UpstreamError,
  errorMessage,
  fetchPage,
  jsonResponse,
  parseTranscript,
  resolveShowId,
} from '../../lib/upstream';

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const params = new URL(context.request.url).searchParams;
  const showId = resolveShowId(params.get('show'));
  const season = parseInt(params.get('season') ?? '', 10);
  const episode = parseInt(params.get('episode') ?? '', 10);

  if (!season || !episode || season < 1 || season > 99 || episode < 1 || episode > 999) {
    return jsonResponse({ success: false, error: '无效的季或集参数' }, { status: 400 });
  }

  const episodeId = `s${String(season).padStart(2, '0')}e${String(episode).padStart(2, '0')}`;

  try {
    const html = await fetchPage(`${BASE_URL}/view_episode_scripts.php?tv-show=${showId}&episode=${episodeId}`);
    const lines = parseTranscript(html);

    if (lines.length === 0) {
      return jsonResponse(
        { success: false, error: `未找到《${showId}》第 ${season} 季第 ${episode} 集的剧本，请确认该剧有这一集` },
        { status: 404 }
      );
    }

    // 剧本内容不会再变，交给浏览器缓存一天，重复查看不再回源
    return jsonResponse({ success: true, data: lines }, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (error) {
    if (error instanceof UpstreamError && error.status === 404) {
      return jsonResponse(
        { success: false, error: `未找到《${showId}》第 ${season} 季第 ${episode} 集的剧本，请确认该剧有这一集` },
        { status: 404 }
      );
    }
    console.error('Error fetching transcript:', errorMessage(error));
    return jsonResponse({ success: false, error: `获取剧本失败: ${errorMessage(error)}` }, { status: 502 });
  }
}
