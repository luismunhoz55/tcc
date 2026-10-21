import type { Route, Stop } from '@/types/domain';

export const ROUTES: Route[] = [
  { id: 'centro-terminal', code: 'D01', name: 'Centro — Terminal', directions: ['Centro para Terminal', 'Terminal para Centro'] },
  { id: 'bairro-escola', code: 'D02', name: 'Bairro — Escola', directions: ['Bairro para Escola', 'Escola para Bairro'] },
];

export const STOPS: Stop[] = [
  { id: 'd01-ct-1', routeId: 'centro-terminal', direction: 'Centro para Terminal', name: 'Praça Demonstrativa', landmark: 'Em frente à biblioteca', latitude: -26.2502, longitude: -49.3838 },
  { id: 'd01-ct-2', routeId: 'centro-terminal', direction: 'Centro para Terminal', name: 'Rua do Comércio', landmark: 'Ao lado do mercado', latitude: -26.2478, longitude: -49.3824 },
  { id: 'd01-ct-3', routeId: 'centro-terminal', direction: 'Centro para Terminal', name: 'Terminal Demonstrativo', landmark: 'Entrada principal', latitude: -26.2449, longitude: -49.3798 },
  { id: 'd01-tc-1', routeId: 'centro-terminal', direction: 'Terminal para Centro', name: 'Terminal Demonstrativo', landmark: 'Plataforma de retorno', latitude: -26.2449, longitude: -49.3798 },
  { id: 'd01-tc-2', routeId: 'centro-terminal', direction: 'Terminal para Centro', name: 'Avenida Central', landmark: 'Em frente à farmácia', latitude: -26.2473, longitude: -49.3820 },
  { id: 'd01-tc-3', routeId: 'centro-terminal', direction: 'Terminal para Centro', name: 'Praça Demonstrativa', landmark: 'Perto da faixa de pedestres', latitude: -26.2502, longitude: -49.3838 },
  { id: 'd02-be-1', routeId: 'bairro-escola', direction: 'Bairro para Escola', name: 'Bairro Demonstrativo', landmark: 'Em frente ao centro comunitário', latitude: -26.2540, longitude: -49.3870 },
  { id: 'd02-be-2', routeId: 'bairro-escola', direction: 'Bairro para Escola', name: 'Rua das Flores', landmark: 'Ponto próximo à esquina', latitude: -26.2518, longitude: -49.3849 },
  { id: 'd02-be-3', routeId: 'bairro-escola', direction: 'Bairro para Escola', name: 'Escola Demonstrativa', landmark: 'Portão principal', latitude: -26.2495, longitude: -49.3815 },
  { id: 'd02-eb-1', routeId: 'bairro-escola', direction: 'Escola para Bairro', name: 'Escola Demonstrativa', landmark: 'Ponto em frente à escola', latitude: -26.2495, longitude: -49.3815 },
  { id: 'd02-eb-2', routeId: 'bairro-escola', direction: 'Escola para Bairro', name: 'Rua das Flores', landmark: 'Perto da praça', latitude: -26.2518, longitude: -49.3849 },
  { id: 'd02-eb-3', routeId: 'bairro-escola', direction: 'Escola para Bairro', name: 'Bairro Demonstrativo', landmark: 'Em frente ao centro comunitário', latitude: -26.2540, longitude: -49.3870 },
];

export const routeById = (id: string) => ROUTES.find((route) => route.id === id);
export const stopsFor = (routeId: string, direction: string) => STOPS.filter((stop) => stop.routeId === routeId && stop.direction === direction);
