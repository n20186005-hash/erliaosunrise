// 二寮觀日亭座標與日出計算：伺服器建置期與瀏覽器端共用。
// 採用 NOAA 近似演算法計算天文日出（Zenith 90.833°），結果僅供行程參考；
// 山稜遮擋可能使現場可見太陽的時間晚於天文日出。

export const ERLIAO = {
  lat: 22.9927444,
  lon: 120.4098726,
  tz: 8
} as const;

const RAD = Math.PI / 180;
const ZENITH = 90.833;

export interface TaipeiDate {
  year: number;
  month: number;
  day: number;
}

export function taipeiDate(offsetDays = 0): TaipeiDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(Date.now() + offsetDays * 86400000));
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read('year'), month: read('month'), day: read('day') };
}

export function weekdayLabel(offsetDays = 0): string {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  }).format(new Date(Date.now() + offsetDays * 86400000));
}

export function dateLabel(offsetDays = 0): string {
  const { month, day } = taipeiDate(offsetDays);
  return `${month} 月 ${day} 日`;
}

export function sunriseHours(year: number, month: number, day: number): number | null {
  const dayOfYear = Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86400000);
  const lngHour = ERLIAO.lon / 15;
  const t = dayOfYear + (6 - lngHour) / 24;

  const meanAnomaly = 0.9856 * t - 3.289;
  let trueLongitude = meanAnomaly
    + 1.916 * Math.sin(meanAnomaly * RAD)
    + 0.02 * Math.sin(2 * meanAnomaly * RAD)
    + 282.634;
  trueLongitude = ((trueLongitude % 360) + 360) % 360;

  let rightAscension = Math.atan(0.91764 * Math.tan(trueLongitude * RAD)) / RAD;
  rightAscension = ((rightAscension % 360) + 360) % 360;
  rightAscension += Math.floor(trueLongitude / 90) * 90 - Math.floor(rightAscension / 90) * 90;
  rightAscension /= 15;

  const sinDeclination = 0.39782 * Math.sin(trueLongitude * RAD);
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosHourAngle = (Math.cos(ZENITH * RAD) - sinDeclination * Math.sin(ERLIAO.lat * RAD))
    / (cosDeclination * Math.cos(ERLIAO.lat * RAD));
  if (cosHourAngle > 1 || cosHourAngle < -1) return null;

  const hourAngle = (360 - Math.acos(cosHourAngle) / RAD) / 15;
  const utcHours = hourAngle + rightAscension - 0.06571 * t - 6.622 - lngHour;
  return ((((utcHours % 24) + 24) % 24) + ERLIAO.tz) % 24;
}

export function formatHours(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface SunriseDay {
  offset: number;
  label: string;
  dateLabel: string;
  time: string;
  hours: number;
}

export function nextSunrises(count = 7): SunriseDay[] {
  const out: SunriseDay[] = [];
  for (let offset = 0; offset < count; offset++) {
    const d = taipeiDate(offset);
    const hours = sunriseHours(d.year, d.month, d.day);
    if (hours === null) continue;
    out.push({
      offset,
      label: offset === 0 ? '今天' : weekdayLabel(offset),
      dateLabel: dateLabel(offset),
      time: formatHours(hours),
      hours
    });
  }
  return out;
}
