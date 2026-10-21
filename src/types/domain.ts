export type UserRole = 'passenger' | 'driver';
export type RequestStatus = 'aguardando' | 'confirmado' | 'embarcado' | 'cancelado';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: number;
}

export interface Route {
  id: string;
  code: string;
  name: string;
  directions: string[];
}

export interface Stop {
  id: string;
  routeId: string;
  direction: string;
  name: string;
  landmark: string;
  latitude: number;
  longitude: number;
}

export interface LocationSample {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: number;
  source: 'gps' | 'simulacao';
}

export interface DriverTrip {
  driverId: string;
  routeId: string;
  direction: string;
  vehicleLabel: string;
  active: boolean;
  location: LocationSample | null;
  startedAt: number;
  updatedAt: number;
}

export interface BoardingRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  routeId: string;
  routeCode: string;
  direction: string;
  stop: Stop;
  status: RequestStatus;
  driverId: string | null;
  driverVehicleLabel: string | null;
  createdAt: number;
  expiresAt: number;
  updatedAt: number;
}
