/**
 * Weather Service for Voyager
 * Uses OpenWeatherMap 5-day / 3-hour forecast API
 */

export interface WeatherInfo {
  temp: number;
  description: string;
  icon: string;
  pop: number; // Probability of precipitation (0-1)
  main: string;
}

export async function getWeatherData(destination: string, targetDate: string): Promise<WeatherInfo | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.warn('[Weather] OPENWEATHER_API_KEY not configured');
    return null;
  }

  try {
    // 1. Get coordinates for the destination
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(destination)}&limit=1&appid=${apiKey}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) {
      console.warn(`[Weather] Could not find coordinates for: ${destination}`);
      return null;
    }

    const { lat, lon } = geoData[0];

    // 2. Get 5-day forecast (OpenWeather free tier limitation)
    const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    if (!weatherData || !weatherData.list) return null;

    // 3. Find the forecast closest to the target date at noon
    const targetTimestamp = new Date(targetDate).setHours(12, 0, 0, 0) / 1000;
    
    // Filter for the entry closest to targetTimestamp
    let closestEntry = weatherData.list[0];
    let minDiff = Math.abs(closestEntry.dt - targetTimestamp);

    for (const entry of weatherData.list) {
      const diff = Math.abs(entry.dt - targetTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestEntry = entry;
      }
    }

    // Only return if the date is within reasonable range (OpenWeather 5-day limit)
    const entryDate = new Date(closestEntry.dt * 1000).toISOString().split('T')[0];
    const requestedDate = targetDate.split('T')[0];
    
    if (entryDate !== requestedDate) {
      console.log(`[Weather] No exact match for ${requestedDate}, closest is ${entryDate}`);
      // If it's more than 5 days away, OpenWeather free API won't have it
    }

    return {
      temp: Math.round(closestEntry.main.temp),
      description: closestEntry.weather[0].description,
      main: closestEntry.weather[0].main,
      icon: closestEntry.weather[0].icon,
      pop: closestEntry.pop || 0
    };
  } catch (error: any) {
    console.error('[Weather] Error fetching data:', error.message);
    return null;
  }
}
