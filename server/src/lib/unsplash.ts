/**
 * 根據目的地抓取 Unsplash 風景圖
 */
export async function fetchUnsplashCoverImage(destination: string): Promise<string | null> {
  try {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      console.warn('[Unsplash] 尚未設定 UNSPLASH_ACCESS_KEY，跳過自動抓圖');
      return null;
    }

    // 優化關鍵字：目的地 + 旅遊風景
    const query = encodeURIComponent(`${destination} travel scenery landscape`);
    const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape&client_id=${accessKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    const imageUrl = data.results?.[0]?.urls?.regular;
    
    if (imageUrl) {
      console.log(`[Unsplash] 成功為 ${destination} 抓取圖片: ${imageUrl}`);
      return imageUrl;
    }

    console.log(`[Unsplash] 找不到符合 ${destination} 的圖片`);
    return null;
  } catch (error: any) {
    console.error('[Unsplash] 抓取圖片發生錯誤:', error.message);
    return null;
  }
}

// 預設旅遊背景圖 (當抓不到圖片時使用)
export const DEFAULT_TRIP_COVER = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=2070&auto=format&fit=crop';
