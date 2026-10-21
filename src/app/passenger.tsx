import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { AppButton, Card, Message, Screen, Section, SelectOption, Subtitle, Title, colors } from '@/components/ui';
import { useSession } from '@/context/AppContext';
import { ROUTES, routeById, stopsFor } from '@/data/catalog';
import { announce } from '@/services/announcements';
import { requestCurrentLocation } from '@/services/location';
import { createBoardingRequest, subscribePassengerRequest, subscribeTrip, updateRequestStatus } from '@/services/repository';
import type { BoardingRequest, DriverTrip, LocationSample, Stop } from '@/types/domain';
import { distanceInMeters, formatDistance, isReliableLocation, isRequestExpired } from '@/utils/geo';
import { signOutUser } from '@/services/auth';

export default function PassengerScreen() {
  const { user } = useSession();
  const [request, setRequest] = useState<BoardingRequest | null>(null);
  const [trip, setTrip] = useState<DriverTrip | null>(null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [direction, setDirection] = useState<string | null>(null);
  const [stop, setStop] = useState<Stop | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationSample | null>(null);
  const [speaking, setSpeaking] = useState(true);
  const announced = useRef(new Set<string>());

  useKeepAwake('passenger-accompaniment');

  useEffect(() => {
    if (!user || user.role !== 'passenger') return;
    return subscribePassengerRequest(user.uid, setRequest);
  }, [user]);

  useEffect(() => {
    if (!request?.driverId) return;
    return subscribeTrip(request.driverId, setTrip);
  }, [request?.driverId]);

  const selectedRoute = routeId ? routeById(routeId) : undefined;
  const stopOptions = useMemo(() => {
    if (!routeId || !direction) return [];
    const options = stopsFor(routeId, direction);
    if (!currentLocation) return options;
    return [...options].sort((a, b) => distanceInMeters(currentLocation, a) - distanceInMeters(currentLocation, b));
  }, [routeId, direction, currentLocation]);

  const activeTrip = request?.driverId ? trip : null;
  const distance = request && activeTrip?.location && isReliableLocation(activeTrip.location) ? distanceInMeters(activeTrip.location, request.stop) : null;

  useEffect(() => {
    if (!request || distance === null) return;
    const threshold = distance <= 100 ? 100 : distance <= 500 ? 500 : null;
    if (!threshold) return;
    const key = `${request.id}-${threshold}`;
    if (announced.current.has(key)) return;
    announced.current.add(key);
    const message = threshold === 100 ? 'O veículo está muito próximo ao ponto, a aproximadamente cem metros.' : 'O veículo está se aproximando do ponto, a menos de quinhentos metros.';
    announce(message, speaking);
  }, [distance, request, speaking]);

  if (!user) return <Redirect href="/auth" />;
  if (user.role !== 'passenger') return <Redirect href="/driver" />;

  const sortByLocation = async () => {
    const location = await requestCurrentLocation();
    if (!location) {
      Alert.alert('Localização não disponível', 'Você pode continuar escolhendo o ponto manualmente.');
      return;
    }
    setCurrentLocation(location);
    await announce('Os pontos foram ordenados por proximidade.', speaking);
  };

  const submitRequest = async () => {
    if (!selectedRoute || !direction || !stop) return;
    try {
      const created = await createBoardingRequest({ passengerId: user.uid, passengerName: user.displayName, routeId: selectedRoute.id, routeCode: selectedRoute.code, direction, stop });
      setRequest(created);
      await announce(`Pedido enviado para a linha ${selectedRoute.code}, sentido ${direction}, no ponto ${stop.name}.`, speaking);
    } catch (error) {
      Alert.alert('Pedido não enviado', error instanceof Error ? error.message : 'Tente novamente.');
    }
  };

  const cancelRequest = () => {
    if (!request) return;
    Alert.alert('Cancelar pedido', 'O motorista deixará de receber este pedido.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Cancelar pedido', style: 'destructive', onPress: () => updateRequestStatus(request, 'cancelado') },
    ]);
  };

  const board = () => {
    if (!request) return;
    Alert.alert('Confirmar embarque', 'Você já embarcou no veículo?', [
      { text: 'Ainda não', style: 'cancel' },
      { text: 'Já embarquei', onPress: async () => { await updateRequestStatus(request, 'embarcado'); await announce('Embarque confirmado. Bom trajeto.', speaking); } },
    ]);
  };

  if (request) return <Screen>
    <Title>Acompanhar embarque</Title>
    <Subtitle>Linha {request.routeCode}, {request.direction}. Ponto: {request.stop.name}, {request.stop.landmark}.</Subtitle>
    {request.status === 'aguardando' && <Message tone="info">Pedido enviado. Aguardando um motorista da linha confirmar o atendimento.</Message>}
    {request.status === 'confirmado' && <Message tone="success">Motorista confirmado: veículo {request.driverVehicleLabel ?? 'identificado'}. Continue acompanhando a aproximação.</Message>}
    {isRequestExpired(request.expiresAt) && <Message tone="warning">Este pedido expirou. Cancele e envie um novo pedido se ainda estiver no ponto.</Message>}
    <Card>
      <Text accessibilityRole="header" style={styles.cardTitle}>Situação do veículo</Text>
      {!request.driverId && <Text style={styles.body}>A distância será mostrada após a confirmação do motorista.</Text>}
      {request.driverId && !activeTrip?.location && <Text style={styles.body}>Aguardando localização atual do motorista.</Text>}
      {request.driverId && activeTrip?.location && distance === null && <Message tone="warning">Localização indisponível ou imprecisa. Aguarde uma posição atualizada.</Message>}
      {distance !== null && <Text style={styles.distance}>Veículo a aproximadamente {formatDistance(distance)} do ponto.</Text>}
      <AppButton variant="secondary" onPress={() => announce(distance !== null ? `Veículo a aproximadamente ${formatDistance(distance)} do ponto.` : 'Ainda não há uma localização confiável do veículo.', speaking)} accessibilityLabel="Ouvir situação novamente">Ouvir situação novamente</AppButton>
      <AppButton variant="secondary" onPress={() => setSpeaking((enabled) => !enabled)} accessibilityLabel={speaking ? 'Desativar voz automática' : 'Ativar voz automática'}>{speaking ? 'Desativar voz automática' : 'Ativar voz automática'}</AppButton>
    </Card>
    <AppButton onPress={board}>Já embarquei</AppButton>
    <AppButton variant="danger" onPress={cancelRequest}>Cancelar pedido</AppButton>
    <AppButton variant="secondary" onPress={signOutUser}>Sair</AppButton>
  </Screen>;

  return <Screen>
    <Title>Solicitar embarque</Title>
    <Subtitle>Escolha a linha, o sentido e o ponto. Todas as opções são dados de demonstração.</Subtitle>
    <Section title="1. Escolha a linha">
      {ROUTES.map((route) => <SelectOption key={route.id} title={`Linha ${route.code}: ${route.name}`} description="Demonstração" selected={routeId === route.id} onPress={() => { setRouteId(route.id); setDirection(null); setStop(null); }} />)}
    </Section>
    {selectedRoute && <Section title="2. Escolha o sentido">
      {selectedRoute.directions.map((value) => <SelectOption key={value} title={value} description={`Linha ${selectedRoute.code}`} selected={direction === value} onPress={() => { setDirection(value); setStop(null); }} />)}
    </Section>}
    {direction && <Section title="3. Escolha o ponto">
      <AppButton variant="secondary" onPress={sortByLocation}>Ordenar pontos por proximidade</AppButton>
      {stopOptions.map((option) => <SelectOption key={option.id} title={option.name} description={option.landmark} selected={stop?.id === option.id} onPress={() => setStop(option)} />)}
    </Section>}
    {stop && <Card><Text style={styles.body}>Você solicitará a linha {selectedRoute?.code}, no sentido {direction}, no ponto {stop.name}. Confirme apenas se esta informação estiver correta.</Text><AppButton onPress={submitRequest}>Confirmar pedido de embarque</AppButton></Card>}
    <AppButton variant="secondary" onPress={signOutUser}>Sair</AppButton>
  </Screen>;
}

const styles = StyleSheet.create({
  cardTitle: { color: colors.navy, fontSize: 20, fontWeight: '700' },
  body: { color: colors.text, fontSize: 17, lineHeight: 24 },
  distance: { color: colors.green, fontSize: 20, lineHeight: 28, fontWeight: '700' },
});
