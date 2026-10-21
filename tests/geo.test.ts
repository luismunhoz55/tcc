import assert from 'node:assert/strict';
import test from 'node:test';
import { distanceInMeters, formatDistance, isReliableLocation, isRequestExpired } from '../src/utils/geo';

test('calcula a distância aproximada entre duas coordenadas', () => {
  const distance = distanceInMeters(
    { latitude: -26.2502, longitude: -49.3838 },
    { latitude: -26.2478, longitude: -49.3824 },
  );

  assert.ok(distance > 280 && distance < 310);
  assert.equal(formatDistance(distance), `${Math.round(distance)} metros`);
});

test('aceita apenas uma localização recente e com precisão suficiente', () => {
  const now = 1_000_000;
  assert.equal(isReliableLocation({ latitude: 0, longitude: 0, accuracy: 50, recordedAt: now - 30_000, source: 'gps' }, now), true);
  assert.equal(isReliableLocation({ latitude: 0, longitude: 0, accuracy: 51, recordedAt: now - 1_000, source: 'gps' }, now), false);
  assert.equal(isReliableLocation({ latitude: 0, longitude: 0, accuracy: 10, recordedAt: now - 30_001, source: 'gps' }, now), false);
  assert.equal(isReliableLocation(null, now), false);
});

test('marca pedidos vencidos', () => {
  assert.equal(isRequestExpired(0), true);
  assert.equal(isRequestExpired(Date.now() + 60_000), false);
});
