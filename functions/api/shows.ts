// ABOUTME: Pages Function 版 /api/shows —— 搜索任意美剧

import { BASE_URL, errorMessage, fetchPage, jsonResponse, parseShowSearch } from '../../lib/upstream';

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const query = (new URL(context.request.url).searchParams.get('q') ?? '').trim();

  if (query.length < 2) {
    return jsonResponse({ success: false, error: '请输入至少 2 个字符的剧名关键词' }, { status: 400 });
  }

  try {
    const html = await fetchPage(`${BASE_URL}/tv_show_episode_scripts.php?search=${encodeURIComponent(query)}`);
    const shows = parseShowSearch(html);

    // 搜不到不算错误：返回空列表 + 提示文案，交给前端展示
    return jsonResponse({
      success: true,
      data: shows,
      message: shows.length === 0 ? `未找到与“${query}”相关的美剧，请检查拼写或换个关键词试试` : undefined,
    }, {
      // 上游 HTML 已经进 Cache API，这里再让浏览器/边缘缓存一天
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error('Error searching shows:', errorMessage(error));
    return jsonResponse({ success: false, error: `搜索剧集失败: ${errorMessage(error)}` }, { status: 502 });
  }
}
