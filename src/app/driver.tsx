import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, StyleSheet, Text, TextInput } from 'react-native';
import type * as Location from 'expo-location';
import { Redirect } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { AppButton, Card, Message, Screen, Section, SelectOption, Subtitle, Title, colors } from '@/components/ui';
import { useSession } from '@/context/AppContext';
import { ROUTES, routeById, stopsFor } from '@/data/catalog';
import { signOutUser } from '@/services/auth';
import { watchForegroundLocation } from '@/services/location';
import { claimRequest, publishLocation, releaseRequest, saveTrip, subscribeDriverRequests, subscribeOpenRequests, subscribeTrip } from '@/services/repository';
import type { BoardingRequest, DriverTrip, LocationSample } from '@/types/domain';

export default function DriverScreen() {
  const { user } = useSession();
  const [trip, setTrip] = useState<DriverTrip | null>(null);
  const [openRequests, setOpenRequests] = useState<BoardingRequest[]>([]);
  const [assignedRequests, setAssignedRequests] = useState<BoardingRequest[]>([]);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [direction, setDirection] = useState<string | null>(null);
  const [vehicleLabel, setVehicleLabel] = useState('Ônibus demonstração 01');
  const [trackingMessage, setTrackingMessage] = useState('Compartilhamento de localização ainda não iniciado.');
  const [simulating, setSimulating] = useState(false);
  const gpsSubscription = useRef<Location.LocationSubscription | null>(null);
  const simulationIndex = useRef(0);

  useKeepAwake('driver-trip');

  useEffect(() => {
    if (!user || user.role !== 'driver') return;
    return subscribeTrip(user.uid, setTrip);
  }, [user]);

  useEffect(() => {
    if (!user || !trip?.active) return;
    const unsubscribeOpen = subscribeOpenRequests(trip.routeId, trip.direction, setOpenRequests);
    const unsubscribeAssigned = subscribeDriverRequests(user.uid, setAssignedRequests);
    return () => { unsubscribeOpen(); unsubscribeAssigned(); };
  }, [user, trip?.active, trip?.routeId, trip?.direction]);

  useEffect(() => () => gpsSubscription.current?.remove(), []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && gpsSubscription.current) {
        gpsSubscription.current.remove();
        gpsSubscription.current = null;
        setTrackingMessage('Localização pausada porque o aplicativo foi para segundo plano. Volte e toque em compartilhar localização.');
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!simulating || !trip?.active || !user) return;
    const stops = stopsFor(trip.routeId, trip.direction);
    const publishSimulatedLocation = () => {
      const target = stops[simulationIndex.current % stops.length];
      simulationIndex.current += 1;
      const location: LocationSample = { latitude: target.latitude, longitude: target.longitude, accuracy: 12, recordedAt: Date.now(), source: 'simulacao' };
      publishLocation(user.uid, location).catch(() => setTrackingMessage('Não foi possível enviar a posição simulada.'));
    };
    publishSimulatedLocation();
    const interval = setInterval(publishSimulatedLocation, 5000);
    return () => clearInterval(interval);
  }, [simulating, trip?.active, trip?.routeId, trip?.direction, user]);

  if (!user) return <Redirect href="/auth" />;
  if (user.role !== 'driver') return <Redirect href="/passenger" />;

  const selectedRoute = routeId ? routeById(routeId) : undefined;
  const visibleOpenRequests = trip?.active ? openRequests : [];
  const visibleAssignedRequests = trip?.active ? assignedRequests : [];

  const startTrip = async () => {
    if (!selectedRoute || !direction || !vehicleLabel.trim()) return;
    const now = new Date().getTime();
    await saveTrip({ driverId: user.uid, routeId: selectedRoute.id, direction, vehicleLabel: vehicleLabel.trim(), active: true, location: null, startedAt: now, updatedAt: now });
    setTrackingMessage('Viagem iniciada. Compartilhe a localização ou inicie o simulador.');
  };

  const startGps = async () => {
    if (!trip?.active) return;
    setSimulating(false);
    gpsSubscription.current?.remove();
    gpsSubscription.current = await watchForegroundLocation(
      async (location) => {
        await publishLocation(user.uid, location);
        setTrackingMessage(`Localização enviada. Precisão aproximada de ${Math.round(location.accuracy ?? 0)} metros.`);
      },
      setTrackingMessage,
    );
  };

  const stopGps = () => {
    gpsSubscription.current?.remove();
    gpsSubscription.current = null;
    setTrackingMessage('Compartilhamento de localização pausado.');
  };

  const claim = async (request: BoardingRequest) => {
    if (!trip) return;
    try {
      await claimRequest(request, trip);
      Alert.alert('Passageiro confirmado', `${request.passengerName} receberá a confirmação do veículo ${trip.vehicleLabel}.`);
    } catch (error) {
      Alert.alert('Pedido indisponível', error instanceof Error ? error.message : 'Tente atualizar a lista.');
    }
  };

  const endTrip = () => {
    if (!trip) return;
    Alert.alert('Encerrar viagem', 'Pedidos ainda confirmados voltarão a ficar disponíveis para outro motorista.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Encerrar viagem', style: 'destructive', onPress: async () => {
        stopGps();
        setSimulating(false);
        await Promise.all(visibleAssignedRequests.map(releaseRequest));
        await saveTrip({ ...trip, active: false, location: null, updatedAt: Date.now() });
      } },
    ]);
  };

  if (!trip?.active) return <Screen>
    <Title>Iniciar viagem</Title>
    <Subtitle>Selecione a linha e o sentido que você está atendendo. Os dados desta tela são de demonstração.</Subtitle>
    <Section title="1. Escolha a linha">
      {ROUTES.map((route) => <SelectOption key={route.id} title={`Linha ${route.code}: ${route.name}`} description="Demonstração" selected={routeId === route.id} onPress={() => { setRouteId(route.id); setDirection(null); }} />)}
    </Section>
    {selectedRoute && <Section title="2. Escolha o sentido">
      {selectedRoute.directions.map((value) => <SelectOption key={value} title={value} description={`Linha ${selectedRoute.code}`} selected={direction === value} onPress={() => setDirection(value)} />)}
    </Section>}
    {direction && <Card>
      <Text style={styles.cardTitle}>Identificação do veículo</Text>
      <TextInput style={styles.input} value={vehicleLabel} onChangeText={setVehicleLabel} placeholder="Ex.: Ônibus demonstração 01" accessibilityLabel="Identificação do veículo" />
      <AppButton onPress={startTrip}>Iniciar viagem</AppButton>
    </Card>}
    <AppButton variant="secondary" onPress={signOutUser}>Sair</AppButton>
  </Screen>;

  return <Screen>
    <Title>Viagem em andamento</Title>
    <Subtitle>{trip.vehicleLabel}. Linha {routeById(trip.routeId)?.code}, {trip.direction}.</Subtitle>
    <Message tone={trip.location ? 'success' : 'warning'}>{trackingMessage}</Message>
    <Card>
      <Text accessibilityRole="header" style={styles.cardTitle}>Localização</Text>
      <AppButton onPress={startGps}>Compartilhar localização por GPS</AppButton>
      <AppButton variant="secondary" onPress={stopGps}>Pausar compartilhamento</AppButton>
      <AppButton variant="secondary" onPress={() => { simulationIndex.current = 0; setSimulating((value) => !value); }}>{simulating ? 'Pausar simulador' : 'Iniciar simulador de rota'}</AppButton>
      {simulating && <Message>Simulador ativo. Uma posição demonstrativa é enviada a cada cinco segundos.</Message>}
    </Card>
    <Section title={`Pedidos aguardando (${visibleOpenRequests.length})`}>
      {visibleOpenRequests.length === 0 && <Message>Nenhum passageiro aguardando nesta linha e sentido.</Message>}
      {visibleOpenRequests.map((request) => <Card key={request.id}><Text style={styles.cardTitle}>{request.passengerName} aguarda</Text><Text style={styles.body}>Ponto: {request.stop.name}. Referência: {request.stop.landmark}.</Text><AppButton onPress={() => claim(request)} accessibilityLabel={`Confirmar atendimento de ${request.passengerName}`}>Confirmar atendimento</AppButton></Card>)}
    </Section>
    <Section title={`Passageiros confirmados (${visibleAssignedRequests.length})`}>
      {visibleAssignedRequests.length === 0 && <Message>Nenhum passageiro confirmado nesta viagem.</Message>}
      {visibleAssignedRequests.map((request) => <Card key={request.id}><Text style={styles.cardTitle}>{request.passengerName}</Text><Text style={styles.body}>Aguardando no ponto {request.stop.name}, {request.stop.landmark}.</Text></Card>)}
    </Section>
    <AppButton variant="danger" onPress={endTrip}>Encerrar viagem</AppButton>
    <AppButton variant="secondary" onPress={signOutUser}>Sair</AppButton>
  </Screen>;
}

const styles = StyleSheet.create({
  cardTitle: { color: colors.navy, fontSize: 20, fontWeight: '700' },
  body: { color: colors.text, fontSize: 17, lineHeight: 24 },
  input: { minHeight: 52, borderWidth: 2, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, color: colors.text, fontSize: 17, backgroundColor: '#FFFFFF' },
});
