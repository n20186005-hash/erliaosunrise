interface WeatherInfo {
  condition: string;
  icon: string;
}

interface NormalizedWeather {
  current: {
    time: string;
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    windSpeed: number;
    windGust: number;
    cloudCover: number;
    precipitation: number;
    isDay: boolean;
    weatherCode: number;
    condition: string;
    icon: string;
  };
  target: {
    date: string;
    dateLabel: string;
    sunrise: string;
    civilDawn: string;
    arriveBy: string;
    sunset: string;
  };
  weather: {
    cloudCover: number;
    humidity: number;
    windSpeed: number;
    visibilityKm: number;
    precipitationProbability: number;
    temperature: number;
    weatherCode: number;
    condition: string;
    icon: string;
    dayMaxTemperature: number;
    temperatureSpread: number;
    uvIndexMax: number | null;
  };
  forecast: Array<{
    date: string;
    label: string;
    sunrise: string;
    weatherCode: number;
    condition: string;
    icon: string;
    minTemperature: number;
    maxTemperature: number;
    precipitationProbability: number;
  }>;
}

const LOCATION = {
  latitude: 22.9927444,
  longitude: 120.4098726,
  timezone: 'Asia/Taipei'
} as const;

const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

function json(data: unknown, init: ResponseInit = {}, cacheControl = 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800'): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', cacheControl);
  headers.set('x-content-type-options', 'nosniff');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function upstreamUrl(): URL {
  const url = new URL(WEATHER_API);
  url.searchParams.set('latitude', String(LOCATION.latitude));
  url.searchParams.set('longitude', String(LOCATION.longitude));
  url.searchParams.set('timezone', LOCATION.timezone);
  url.searchParams.set('forecast_days', '7');
  url.searchParams.set(
    'current',
    [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'wind_speed_10m',
      'wind_gusts_10m',
      'is_day'
    ].join(',')
  );
  url.searchParams.set(
    'hourly',
    [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation_probability',
      'cloud_cover',
      'visibility',
      'wind_speed_10m',
      'weather_code'
    ].join(',')
  );
  url.searchParams.set(
    'daily',
    [
      'sunrise',
      'sunset',
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'uv_index_max'
    ].join(',')
  );
  return url;
}

function requiredRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid weather object: ${field}`);
  }
  return value as Record<string, unknown>;
}

function requiredArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid weather array: ${field}`);
  }
  return value;
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid weather number: ${field}`);
  }
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid weather string: ${field}`);
  }
  return value;
}

function arrayNumber(record: Record<string, unknown>, field: string, index: number): number {
  return requiredNumber(requiredArray(record[field], field)[index], `${field}.${index}`);
}

function arrayString(record: Record<string, unknown>, field: string, index: number): string {
  return requiredString(requiredArray(record[field], field)[index], `${field}.${index}`);
}

function optionalArrayNumber(record: Record<string, unknown>, field: string, index: number): number | null {
  const value = requiredArray(record[field], field)[index];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function round(value: number, precision = 0): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseTaipeiDate(localIso: string): Date {
  return new Date(`${localIso}:00+08:00`);
}

function formatTime(localIso: string): string {
  return localIso.slice(11, 16);
}

function subtractMinutes(localIso: string, minutes: number): string {
  const date = parseTaipeiDate(localIso);
  date.setUTCMinutes(date.getUTCMinutes() - minutes);
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: LOCATION.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

function dateLabel(dateString: string, offset: number): string {
  if (offset === 0) return '下一次';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: LOCATION.timezone,
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  }).format(new Date(`${dateString}T12:00:00+08:00`));
}

function weatherInfo(code: number, isDay = true): WeatherInfo {
  const weather: Record<number, WeatherInfo> = {
    0: { condition: '晴朗', icon: isDay ? '☀️' : '🌙' },
    1: { condition: '大致晴朗', icon: isDay ? '🌤️' : '🌙' },
    2: { condition: '局部多雲', icon: '⛅' },
    3: { condition: '陰天', icon: '☁️' },
    45: { condition: '有霧', icon: '🌫️' },
    48: { condition: '霧淞', icon: '🌫️' },
    51: { condition: '細雨', icon: '🌦️' },
    53: { condition: '細雨', icon: '🌦️' },
    55: { condition: '較強細雨', icon: '🌧️' },
    56: { condition: '凍毛雨', icon: '🌧️' },
    57: { condition: '凍毛雨', icon: '🌧️' },
    61: { condition: '小雨', icon: '🌦️' },
    63: { condition: '中雨', icon: '🌧️' },
    65: { condition: '大雨', icon: '🌧️' },
    66: { condition: '凍雨', icon: '🌧️' },
    67: { condition: '凍雨', icon: '🌧️' },
    71: { condition: '小雪', icon: '🌨️' },
    73: { condition: '降雪', icon: '🌨️' },
    75: { condition: '大雪', icon: '❄️' },
    77: { condition: '霰', icon: '🌨️' },
    80: { condition: '短暫陣雨', icon: '🌦️' },
    81: { condition: '陣雨', icon: '🌧️' },
    82: { condition: '強陣雨', icon: '⛈️' },
    85: { condition: '陣雪', icon: '🌨️' },
    86: { condition: '強陣雪', icon: '🌨️' },
    95: { condition: '雷雨', icon: '⛈️' },
    96: { condition: '雷雨伴隨冰雹', icon: '⛈️' },
    99: { condition: '強雷雨伴隨冰雹', icon: '⛈️' }
  };
  return weather[code] ?? { condition: '天氣多變', icon: '🌤️' };
}

function chooseTargetIndex(daily: Record<string, unknown>): number {
  const sunrise = requiredArray(daily.sunrise, 'daily.sunrise');
  const nextIndex = sunrise.findIndex((value, index) => (
    parseTaipeiDate(requiredString(value, `daily.sunrise.${index}`)).getTime() > Date.now()
  ));
  if (nextIndex < 0) throw new Error('Next sunrise unavailable');
  return nextIndex;
}

function nearestHourlyIndex(hourly: Record<string, unknown>, targetIso: string): number {
  const times = requiredArray(hourly.time, 'hourly.time');
  const target = parseTaipeiDate(targetIso).getTime();
  let bestIndex = -1;
  let bestDifference = Number.POSITIVE_INFINITY;

  times.forEach((value, index) => {
    const difference = Math.abs(parseTaipeiDate(requiredString(value, `hourly.time.${index}`)).getTime() - target);
    if (difference < bestDifference) {
      bestDifference = difference;
      bestIndex = index;
    }
  });

  if (bestIndex < 0) throw new Error('Hourly forecast unavailable');
  return bestIndex;
}

function recommendation(input: {
  cloudCover: number;
  humidity: number;
  windSpeed: number;
  visibilityKm: number;
  precipitationProbability: number;
  weatherCode: number;
}) {
  const { cloudCover, humidity, windSpeed, visibilityKm, precipitationProbability, weatherCode } = input;
  const thunder = [82, 95, 96, 99].includes(weatherCode);
  const cloudScore = cloudCover <= 70
    ? clamp(30 - Math.abs(cloudCover - 40) * 0.45, 8, 30)
    : clamp(30 - (cloudCover - 70), 0, 30);
  const humidityScore = clamp((humidity - 55) * 0.55, 0, 20);
  const windScore = clamp(18 - windSpeed, 0, 18);
  const visibilityScore = visibilityKm >= 3 && visibilityKm <= 30 ? 14 : visibilityKm < 1.5 ? 2 : 8;
  const rainPenalty = clamp(precipitationProbability * 0.3, 0, 30);
  const severePenalty = thunder ? 35 : 0;
  const score = round(clamp(cloudScore + humidityScore + windScore + visibilityScore + 16 - rainPenalty - severePenalty, 0, 100));

  if (thunder || precipitationProbability >= 75 || windSpeed >= 45) {
    return {
      score,
      level: 'poor',
      title: '不建議專程前往',
      summary: '清晨可能有雷雨、強降雨或明顯風勢，請優先考量安全並延後行程。'
    };
  }
  if (score >= 70) {
    return {
      score,
      level: 'good',
      title: '條件值得期待',
      summary: '清晨雲量、濕度與風勢組合較有利，出發前仍請確認即時影像。'
    };
  }
  if (score >= 50) {
    return {
      score,
      level: 'fair',
      title: '可以碰碰運氣',
      summary: '部分條件不錯，但雲層或降雨仍可能影響日出，適合願意等待的旅人。'
    };
  }
  return {
    score,
    level: 'mixed',
    title: '條件較不穩定',
    summary: '雲量、能見度、降雨或風勢不夠理想，建議先看即時影像再決定。'
  };
}

interface AdviceInput {
  weatherCode: number;
  temperature: number;
  dayMaxTemperature: number;
  temperatureSpread: number;
  uvIndexMax: number | null;
  windSpeed: number;
  visibilityKm: number;
  precipitationProbability: number;
  cloudCover: number;
  humidity: number;
}

export interface ConditionsAdvice {
  outfit: string[];
  activity: string[];
  gear: string[];
  risks: string[];
}

/**
 * 面向一般遊客的建議引擎：依下一次日出時段的天氣組合輸出「可執行」的建議。
 * 原則：口語化、不使用氣象術語；未命中的項目不輸出，由前端隱藏；風險類條目優先且僅在命中時出現。
 */
export function buildAdvice(input: AdviceInput): ConditionsAdvice {
  const outfit: string[] = [];
  const activity: string[] = [];
  const gear: string[] = [];
  const risks: string[] = [];

  const thunder = [82, 95, 96, 99].includes(input.weatherCode);
  const heavyRain = [63, 65, 66, 67, 81, 82].includes(input.weatherCode);
  const rainy = heavyRain || [51, 53, 55, 56, 57, 61, 80].includes(input.weatherCode);
  const foggy = [45, 48].includes(input.weatherCode) || input.visibilityKm < 1;
  const cloudy = [2, 3].includes(input.weatherCode);
  const clearish = [0, 1].includes(input.weatherCode);
  const rainyRisk = rainy || input.precipitationProbability >= 60;

  if (thunder) {
    risks.push('有雷雨發展的可能：不要在空曠平台或樹下逗留，建議直接延後行程，安全優先。');
  } else if (heavyRain || input.precipitationProbability >= 75) {
    risks.push('降雨偏強或降雨機率很高：山區道路與惡地邊坡濕滑，建議改期，或改為化石園區等室內行程。');
  }
  if (input.windSpeed >= 40) {
    risks.push('風勢明顯偏強：觀景平台體感更冷、帽子與裝備易被吹落，請勿在邊坡逗留。');
  }
  if (foggy) {
    risks.push('濃霧可能遮蔽日出，也會影響行車能見度：山路請減速慢行、會車禮讓。');
  }

  if (input.temperature <= 12) {
    outfit.push('清晨氣溫偏冷，厚外套、毛帽與圍巾不可少。');
    gear.push('保暖帽與手套');
  } else if (input.temperature <= 18) {
    outfit.push('凌晨體感偏涼，一件薄外套或刷毛剛剛好。');
  }
  if (input.windSpeed >= 25 && input.windSpeed < 40) {
    outfit.push('風勢偏大，建議防風外套；寬鬆長裙與易吹落的帽子不適合。');
  }
  if (input.temperatureSpread >= 8) {
    outfit.push('晝夜溫差大，採洋蔥式穿搭，日出回溫後方便脫卸。');
  }
  if (input.dayMaxTemperature >= 32) {
    outfit.push('白天氣溫偏高，日出之後的行程安排透氣衣物。');
  }

  if (clearish && input.cloudCover <= 40) {
    activity.push('天氣晴朗，適合觀日與戶外行程；上午時段記得防曬。');
  }
  if (cloudy) {
    activity.push('雲層偏厚，日出色彩可能較平淡，但光線柔和、適合拍照與長時間戶外走走。');
  }
  if (input.cloudCover >= 40 && input.cloudCover <= 75 && input.humidity >= 70 && !rainyRisk) {
    activity.push('這樣的雲量與水氣組合，有機會出現晨霧或雲海，值得期待。');
  }
  if (rainyRisk) {
    activity.push('有降雨可能：路面與觀景平台濕滑，步行放慢、留意腳步。');
  }
  if (input.precipitationProbability >= 60) {
    activity.push('降雨機率不低，行程保留彈性，可先規劃化石園區等室內備案。');
  }
  if (input.uvIndexMax !== null && input.uvIndexMax >= 8) {
    activity.push('白天紫外線很強，上午十點後注意防曬與補充水分。');
  }

  if (input.uvIndexMax !== null && input.uvIndexMax >= 6) {
    gear.push('防曬乳與太陽眼鏡');
  }
  gear.push('手電筒或頭燈（抵達時天色未亮）');
  if (rainyRisk) {
    gear.push(thunder ? '輕便雨衣（風大，不建議長柄雨傘）' : '摺疊傘或輕便雨衣');
  }

  return { outfit, activity, gear, risks };
}

function normalizeWeather(raw: unknown): NormalizedWeather {
  const root = requiredRecord(raw, 'response');
  const current = requiredRecord(root.current, 'current');
  const hourly = requiredRecord(root.hourly, 'hourly');
  const daily = requiredRecord(root.daily, 'daily');
  const targetIndex = chooseTargetIndex(daily);
  const sunriseIso = arrayString(daily, 'sunrise', targetIndex);
  const targetDate = arrayString(daily, 'time', targetIndex);
  const hourlyIndex = nearestHourlyIndex(hourly, sunriseIso);
  const currentWeatherCode = requiredNumber(current.weather_code, 'current.weather_code');
  const targetWeatherCode = arrayNumber(hourly, 'weather_code', hourlyIndex);
  const currentInfo = weatherInfo(currentWeatherCode, requiredNumber(current.is_day, 'current.is_day') === 1);
  const targetInfo = weatherInfo(targetWeatherCode);

  const targetWeather = {
    cloudCover: round(arrayNumber(hourly, 'cloud_cover', hourlyIndex)),
    humidity: round(arrayNumber(hourly, 'relative_humidity_2m', hourlyIndex)),
    windSpeed: round(arrayNumber(hourly, 'wind_speed_10m', hourlyIndex), 1),
    visibilityKm: round(arrayNumber(hourly, 'visibility', hourlyIndex) / 1000, 1),
    precipitationProbability: round(arrayNumber(hourly, 'precipitation_probability', hourlyIndex)),
    temperature: round(arrayNumber(hourly, 'temperature_2m', hourlyIndex)),
    weatherCode: targetWeatherCode,
    dayMaxTemperature: round(arrayNumber(daily, 'temperature_2m_max', targetIndex)),
    temperatureSpread: round(
      arrayNumber(daily, 'temperature_2m_max', targetIndex) - arrayNumber(daily, 'temperature_2m_min', targetIndex)
    ),
    uvIndexMax: optionalArrayNumber(daily, 'uv_index_max', targetIndex),
    ...targetInfo
  };

  const forecastCount = Math.min(7, requiredArray(daily.time, 'daily.time').length - targetIndex);
  if (forecastCount < 3) throw new Error('Three-day forecast unavailable');

  return {
    current: {
      time: requiredString(current.time, 'current.time'),
      temperature: round(requiredNumber(current.temperature_2m, 'current.temperature_2m')),
      apparentTemperature: round(requiredNumber(current.apparent_temperature, 'current.apparent_temperature')),
      humidity: round(requiredNumber(current.relative_humidity_2m, 'current.relative_humidity_2m')),
      windSpeed: round(requiredNumber(current.wind_speed_10m, 'current.wind_speed_10m'), 1),
      windGust: round(requiredNumber(current.wind_gusts_10m, 'current.wind_gusts_10m'), 1),
      cloudCover: round(requiredNumber(current.cloud_cover, 'current.cloud_cover')),
      precipitation: round(requiredNumber(current.precipitation, 'current.precipitation'), 1),
      isDay: requiredNumber(current.is_day, 'current.is_day') === 1,
      weatherCode: currentWeatherCode,
      ...currentInfo
    },
    target: {
      date: targetDate,
      dateLabel: new Intl.DateTimeFormat('zh-TW', {
        timeZone: LOCATION.timezone,
        month: 'numeric',
        day: 'numeric',
        weekday: 'short'
      }).format(new Date(`${targetDate}T12:00:00+08:00`)),
      sunrise: formatTime(sunriseIso),
      civilDawn: subtractMinutes(sunriseIso, 28),
      arriveBy: subtractMinutes(sunriseIso, 75),
      sunset: formatTime(arrayString(daily, 'sunset', targetIndex))
    },
    weather: targetWeather,
    forecast: Array.from({ length: forecastCount }, (_, offset) => {
      const index = targetIndex + offset;
      const weatherCode = arrayNumber(daily, 'weather_code', index);
      return {
        date: arrayString(daily, 'time', index),
        label: dateLabel(arrayString(daily, 'time', index), offset),
        sunrise: formatTime(arrayString(daily, 'sunrise', index)),
        weatherCode,
        ...weatherInfo(weatherCode),
        minTemperature: round(arrayNumber(daily, 'temperature_2m_min', index)),
        maxTemperature: round(arrayNumber(daily, 'temperature_2m_max', index)),
        precipitationProbability: round(arrayNumber(daily, 'precipitation_probability_max', index))
      };
    })
  };
}

async function getConditions() {
  const upstream = await fetch(upstreamUrl(), {
    headers: { Accept: 'application/json' },
    cf: { cacheEverything: true, cacheTtl: 900 }
  });

  if (!upstream.ok) {
    throw new Error(`Open-Meteo returned ${upstream.status}`);
  }

  const weather = normalizeWeather(await upstream.json());
  return {
    status: 'ok',
    updatedAt: new Date().toISOString(),
    ...weather,
    recommendation: recommendation(weather.weather),
    advice: buildAdvice(weather.weather),
    source: {
      name: 'Open-Meteo',
      url: 'https://open-meteo.com/',
      timezone: LOCATION.timezone
    },
    disclaimer: '預報與觀景指數僅供行程參考，不代表一定能看到日出、雲海或斜射光；山區天氣可能快速變化。'
  };
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/conditions' && request.method === 'GET') {
      try {
        return json(await getConditions());
      } catch (error) {
        console.error(JSON.stringify({
          message: 'conditions request failed',
          error: error instanceof Error ? error.message : String(error),
          path: url.pathname
        }));
        return json({
          status: 'degraded',
          message: '暫時無法取得天氣資料，請稍後再試或查看官方即時影像。'
        }, { status: 502 }, 'no-store');
      }
    }

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ status: 'ok', service: 'erliao-sunrise-worker' }, {}, 'no-store');
    }

    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
