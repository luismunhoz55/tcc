import type { LocationSample } from '@/types/domain';

const EARTH_RADIUS_METERS = 6371000;

const radians = (value: number) => (value * Math.PI) / 180;

export function distanceInMeters(from: Pick<LocationSample, 'latitude' | 'longitude'>, to: Pick<LocationSample, 'latitude' | 'longitude'>) {
  const dLat = radians(to.latitude - from.latitude);
  const dLon = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isReliableLocation(location: LocationSample | null, now = Date.now()) {
  return Boolean(location && location.accuracy !== null && location.accuracy <= 50 && now - location.recordedAt <= 30000);
}

export function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} metros` : `${(meters / 1000).toFixed(1).replace('.', ',')} quilômetros`;
}

export function isRequestExpired(expiresAt: number) {
  return expiresAt <= Date.now();
}
