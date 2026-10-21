// ABOUTME: Pages Function 版 /api/episodes —— 抓取某部剧的季/集目录

import {
  BASE_URL,
  UpstreamError,
  errorMessage,
  fetchPage,
  jsonResponse,
  parseEpisodeIndex,
  resolveShowId,
} from '../../lib/upstream';

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const showId = resolveShowId(new URL(context.request.url).searchParams.get('show'));

  try {
    const html = await fetchPage(`${BASE_URL}/episode_scripts.php?tv-show=${showId}`);
    const episodes = parseEpisodeIndex(html, showId);

    if (Object.keys(episodes).length === 0) {
      return jsonResponse(
        { success: false, error: `未找到剧集《${showId}》，请检查剧名是否正确` },
        { status: 404 }
      );
    }

    return jsonResponse({ success: true, data: episodes, show: showId }, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (error) {
    // 站点对不存在的剧返回 404，这里转成友好提示而不是 500
    if (error instanceof UpstreamError && error.status === 404) {
      return jsonResponse(
        { success: false, error: `未找到剧集《${showId}》，请检查剧名是否正确` },
        { status: 404 }
      );
    }
    console.error('Error fetching episodes:', errorMessage(error));
    return jsonResponse({ success: false, error: `获取剧集列表失败: ${errorMessage(error)}` }, { status: 502 });
  }
}
