import * as Location from 'expo-location';
import type { LocationSample } from '@/types/domain';

export async function requestCurrentLocation(): Promise<LocationSample | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') return null;
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return fromExpoLocation(position);
}

export function fromExpoLocation(position: Location.LocationObject): LocationSample {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    recordedAt: position.timestamp,
    source: 'gps',
  };
}

export async function watchForegroundLocation(onLocation: (location: LocationSample) => void, onError: (message: string) => void) {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    onError('A localização não foi autorizada. Ative a permissão para compartilhar sua posição.');
    return null;
  }
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 1 },
    (position) => onLocation(fromExpoLocation(position)),
    onError,
  );
}
