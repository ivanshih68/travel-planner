/**
 * 根據目的地抓取 Unsplash 風景圖
 */
export async function fetchUnsplashCoverImage(destination: string): Promise<string | null> {
  console.log(`[Unsplash Debug] 開始抓取圖片，目的地: ${destination}`);
  try {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY || process.env.VITE_UNSPLASH_ACCESS_KEY;
    
    // 檢查金鑰是否存在（僅顯示前 4 碼以示安全）
    if (!accessKey) {
      console.error('[Unsplash Debug] 錯誤: 找不到 UNSPLASH_ACCESS_KEY 環境變數');
      return null;
    }
    console.log(`[Unsplash Debug] 使用金鑰前綴: ${accessKey.substring(0, 4)}...`);

    const queryText = `${destination} travel scenery landscape`;
    const query = encodeURIComponent(queryText);
    const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape&client_id=${accessKey}`;
    
    console.log(`[Unsplash Debug] 請求 URL: https://api.unsplash.com/search/photos?query=${queryText}...`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Unsplash Debug] API 請求失敗 (Status: ${response.status}): ${errorText}`);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.results?.[0]?.urls?.regular;
    
    if (imageUrl) {
      console.log(`[Unsplash Debug] 成功抓取圖片: ${imageUrl}`);
      return imageUrl;
    }

    console.warn(`[Unsplash Debug] 搜尋成功但沒有結果。目的地: ${destination}`);
    return null;
  } catch (error: any) {
    console.error('[Unsplash Debug] 發生未預期錯誤:', error.message);
    return null;
  }
}

// 預設旅遊背景圖 (當抓不到圖片時使用)
export const DEFAULT_TRIP_COVER = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=2070&auto=format&fit=crop';
