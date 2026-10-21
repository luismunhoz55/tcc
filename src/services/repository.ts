import { get, onValue, push, ref, runTransaction, serverTimestamp, set, update } from 'firebase/database';
import type { BoardingRequest, DriverTrip, LocationSample, UserProfile } from '@/types/domain';
import { firebaseConfigured, getFirebase } from './firebase';

type Unsubscribe = () => void;
type LocalStore = {
  profiles: Record<string, UserProfile>;
  requests: Record<string, BoardingRequest>;
  trips: Record<string, DriverTrip>;
  listeners: Set<() => void>;
};

const root = globalThis as typeof globalThis & { __embarqueLocalStore?: LocalStore };
const local: LocalStore = root.__embarqueLocalStore ?? { profiles: {}, requests: {}, trips: {}, listeners: new Set() };
root.__embarqueLocalStore = local;

const notify = () => local.listeners.forEach((listener) => listener());
const watchLocal = (listener: () => void): Unsubscribe => {
  local.listeners.add(listener);
  return () => local.listeners.delete(listener);
};

const requestRouteKey = (routeId: string, direction: string) => `${routeId}--${encodeURIComponent(direction)}`;
const active = (request: BoardingRequest) => request.status === 'aguardando' || request.status === 'confirmado';
const open = (request: BoardingRequest) => request.status === 'aguardando' && request.expiresAt > Date.now();
const requestValues = (request: BoardingRequest) => ({ ...request, updatedAt: serverTimestamp() });

export async function createProfile(profile: UserProfile) {
  if (!firebaseConfigured) {
    local.profiles[profile.uid] = profile;
    notify();
    return;
  }
  const firebase = getFirebase();
  if (!firebase) throw new Error('Firebase indisponível.');
  await set(ref(firebase.database, `profiles/${profile.uid}`), profile);
}

export async function getProfile(uid: string) {
  if (!firebaseConfigured) return local.profiles[uid] ?? null;
  const firebase = getFirebase();
  if (!firebase) return null;
  const snapshot = await get(ref(firebase.database, `profiles/${uid}`));
  return (snapshot.val() as UserProfile | null) ?? null;
}

export async function createBoardingRequest(request: Omit<BoardingRequest, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'status' | 'driverId' | 'driverVehicleLabel'>) {
  const now = Date.now();
  const complete: BoardingRequest = { ...request, id: '', status: 'aguardando', driverId: null, driverVehicleLabel: null, createdAt: now, updatedAt: now, expiresAt: now + 30 * 60 * 1000 };
  if (!firebaseConfigured) {
    complete.id = `local-${now}`;
    local.requests[complete.id] = complete;
    notify();
    return complete;
  }
  const firebase = getFirebase();
  if (!firebase) throw new Error('Firebase indisponível.');
  const requestRef = push(ref(firebase.database, 'requests'));
  complete.id = requestRef.key!;
  const routeKey = requestRouteKey(complete.routeId, complete.direction);
  await update(ref(firebase.database), {
    [`requests/${complete.id}`]: requestValues(complete),
    [`passengerActiveRequests/${complete.passengerId}/${complete.id}`]: requestValues(complete),
    [`openRequests/${routeKey}/${complete.id}`]: requestValues(complete),
  });
  return complete;
}

export function subscribePassengerRequest(passengerId: string, listener: (request: BoardingRequest | null) => void): Unsubscribe {
  if (!firebaseConfigured) {
    const emit = () => listener(Object.values(local.requests).find((request) => request.passengerId === passengerId && active(request)) ?? null);
    emit();
    return watchLocal(emit);
  }
  const firebase = getFirebase();
  if (!firebase) return () => undefined;
  return onValue(ref(firebase.database, `passengerActiveRequests/${passengerId}`), (snapshot) => {
    const requests = Object.values(snapshot.val() ?? {}) as BoardingRequest[];
    listener(requests.find(active) ?? null);
  });
}

export function subscribeDriverRequests(driverId: string, listener: (requests: BoardingRequest[]) => void): Unsubscribe {
  if (!firebaseConfigured) {
    const emit = () => listener(Object.values(local.requests).filter((request) => request.driverId === driverId && active(request)));
    emit();
    return watchLocal(emit);
  }
  const firebase = getFirebase();
  if (!firebase) return () => undefined;
  return onValue(ref(firebase.database, `driverRequests/${driverId}`), (snapshot) => listener(Object.values(snapshot.val() ?? {}) as BoardingRequest[]));
}

export function subscribeOpenRequests(routeId: string, direction: string, listener: (requests: BoardingRequest[]) => void): Unsubscribe {
  if (!firebaseConfigured) {
    const emit = () => listener(Object.values(local.requests).filter((request) => request.routeId === routeId && request.direction === direction && open(request)));
    emit();
    return watchLocal(emit);
  }
  const firebase = getFirebase();
  if (!firebase) return () => undefined;
  return onValue(ref(firebase.database, `openRequests/${requestRouteKey(routeId, direction)}`), (snapshot) => listener(Object.values(snapshot.val() ?? {}) as BoardingRequest[]));
}

export async function claimRequest(request: BoardingRequest, trip: DriverTrip) {
  if (!firebaseConfigured) {
    const current = local.requests[request.id];
    if (!current || !open(current)) throw new Error('Este pedido já não está disponível.');
    local.requests[request.id] = { ...current, status: 'confirmado', driverId: trip.driverId, driverVehicleLabel: trip.vehicleLabel, updatedAt: Date.now() };
    notify();
    return;
  }
  const firebase = getFirebase();
  if (!firebase) throw new Error('Firebase indisponível.');
  const requestRef = ref(firebase.database, `requests/${request.id}`);
  const transaction = await runTransaction(requestRef, (current: BoardingRequest | null) => {
    if (!current || current.status !== 'aguardando' || current.expiresAt <= Date.now()) return;
    return { ...current, status: 'confirmado', driverId: trip.driverId, driverVehicleLabel: trip.vehicleLabel, updatedAt: Date.now() };
  });
  if (!transaction.committed) throw new Error('Este pedido já foi assumido por outro motorista.');
  const claimed = transaction.snapshot.val() as BoardingRequest;
  await update(ref(firebase.database), {
    [`passengerActiveRequests/${claimed.passengerId}/${claimed.id}`]: requestValues(claimed),
    [`driverRequests/${trip.driverId}/${claimed.id}`]: requestValues(claimed),
    [`openRequests/${requestRouteKey(claimed.routeId, claimed.direction)}/${claimed.id}`]: null,
  });
}

export async function updateRequestStatus(request: BoardingRequest, status: 'embarcado' | 'cancelado') {
  const changed: BoardingRequest = { ...request, status, updatedAt: Date.now() };
  if (!firebaseConfigured) {
    local.requests[request.id] = changed;
    notify();
    return;
  }
  const firebase = getFirebase();
  if (!firebase) throw new Error('Firebase indisponível.');
  const updates: Record<string, unknown> = {
    [`requests/${request.id}`]: requestValues(changed),
    [`passengerActiveRequests/${request.passengerId}/${request.id}`]: null,
    [`openRequests/${requestRouteKey(request.routeId, request.direction)}/${request.id}`]: null,
  };
  if (request.driverId) updates[`driverRequests/${request.driverId}/${request.id}`] = null;
  await update(ref(firebase.database), updates);
}

export async function releaseRequest(request: BoardingRequest) {
  if (request.status !== 'confirmado') return;
  const released: BoardingRequest = { ...request, status: 'aguardando', driverId: null, driverVehicleLabel: null, updatedAt: Date.now() };
  if (!firebaseConfigured) {
    local.requests[request.id] = released;
    notify();
    return;
  }
  const firebase = getFirebase();
  if (!firebase) throw new Error('Firebase indisponível.');
  await update(ref(firebase.database), {
    [`requests/${request.id}`]: requestValues(released),
    [`passengerActiveRequests/${request.passengerId}/${request.id}`]: requestValues(released),
    [`driverRequests/${request.driverId}/${request.id}`]: null,
    [`openRequests/${requestRouteKey(request.routeId, request.direction)}/${request.id}`]: requestValues(released),
  });
}

export async function saveTrip(trip: DriverTrip) {
  if (!firebaseConfigured) {
    local.trips[trip.driverId] = trip;
    notify();
    return;
  }
  const firebase = getFirebase();
  if (!firebase) throw new Error('Firebase indisponível.');
  await set(ref(firebase.database, `trips/${trip.driverId}`), { ...trip, updatedAt: serverTimestamp() });
}

export function subscribeTrip(driverId: string, listener: (trip: DriverTrip | null) => void): Unsubscribe {
  if (!firebaseConfigured) {
    const emit = () => listener(local.trips[driverId] ?? null);
    emit();
    return watchLocal(emit);
  }
  const firebase = getFirebase();
  if (!firebase) return () => undefined;
  return onValue(ref(firebase.database, `trips/${driverId}`), (snapshot) => listener(snapshot.val() as DriverTrip | null));
}

export async function publishLocation(driverId: string, location: LocationSample) {
  if (!firebaseConfigured) {
    const trip = local.trips[driverId];
    if (trip) local.trips[driverId] = { ...trip, location, updatedAt: Date.now() };
    notify();
    return;
  }
  const firebase = getFirebase();
  if (!firebase) throw new Error('Firebase indisponível.');
  await update(ref(firebase.database, `trips/${driverId}`), { location, updatedAt: serverTimestamp() });
}
