/**
 * 根據目的地抓取 Unsplash 風景圖
 */
export async function fetchUnsplashCoverImage(destination: string): Promise<string | null> {
  console.log(`[Unsplash Debug] 開始抓取圖片，目的地: ${destination}`);
  try {
    // 支援前後端的變數命名，但建議在後端統一使用 UNSPLASH_ACCESS_KEY
    const accessKey = process.env.UNSPLASH_ACCESS_KEY || process.env.VITE_UNSPLASH_ACCESS_KEY;
    
    if (!accessKey) {
      console.error('[Unsplash Debug] 錯誤: 找不到 UNSPLASH_ACCESS_KEY 環境變數');
      return null;
    }

    // 💡 優化 1：直接使用目的地作為關鍵字，精準度最高
    const query = encodeURIComponent(destination.trim());
    
    // 💡 優化 2：改用 /photos/random API，每次都會回傳不同的高畫質圖片
    const url = `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&client_id=${accessKey}`;
    
    console.log(`[Unsplash Debug] 請求 URL: https://api.unsplash.com/photos/random?query=${destination}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Unsplash Debug] API 請求失敗 (Status: ${response.status}): ${errorText}`);
      return null;
    }

    const data = await response.json();
    
    // 注意：random API 回傳的是單一物件 (data)，而不是陣列 (data.results)
    const imageUrl = data?.urls?.regular;
    
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
