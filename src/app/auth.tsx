import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput } from 'react-native';
import { Redirect } from 'expo-router';
import { AppButton, Card, Message, Screen, Subtitle, Title, colors } from '@/components/ui';
import { useSession } from '@/context/AppContext';
import { authErrorMessage, registerPassenger, requestPasswordReset, signIn, signInAsDemo } from '@/services/auth';
import { firebaseConfigured } from '@/services/firebase';

type Mode = 'login' | 'register' | 'forgot';

export default function AuthScreen() {
  const { user } = useSession();
  const [mode, setMode] = useState<Mode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Redirect href={user.role === 'driver' ? '/driver' : '/passenger'} />;

  const submit = async () => {
    if (!email.trim()) return Alert.alert('Informe seu e-mail', 'Digite o e-mail para continuar.');
    if (mode === 'register' && !displayName.trim()) return Alert.alert('Informe seu nome', 'Digite seu nome para criar a conta.');
    if (mode !== 'forgot' && password.length < 6) return Alert.alert('Senha muito curta', 'Use pelo menos seis caracteres.');
    setBusy(true);
    try {
      if (mode === 'register') await registerPassenger(displayName, email, password);
      else if (mode === 'forgot') {
        await requestPasswordReset(email);
        Alert.alert('E-mail enviado', 'Confira sua caixa de entrada para redefinir a senha.');
        setMode('login');
      } else await signIn(email, password);
    } catch (error) {
      Alert.alert('Não foi possível continuar', authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return <Screen>
    <Title>Embarque Acessível</Title>
    <Subtitle>Apoio ao embarque no transporte público. Dados e linhas desta versão são demonstrativos.</Subtitle>
    {!firebaseConfigured && <Message tone="warning">Modo demonstração local ativo. Configure o Firebase para sincronizar dois celulares e usar contas reais.</Message>}
    <Card>
      <Text accessibilityRole="header" style={styles.cardTitle}>{mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta de passageiro' : 'Recuperar senha'}</Text>
      {mode === 'register' && <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Seu nome" accessibilityLabel="Seu nome" autoCapitalize="words" />}
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="E-mail" accessibilityLabel="E-mail" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
      {mode !== 'forgot' && <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Senha com pelo menos 6 caracteres" accessibilityLabel="Senha" secureTextEntry autoCapitalize="none" />}
      <AppButton onPress={submit} disabled={busy} accessibilityLabel={mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta de passageiro' : 'Enviar e-mail para recuperar senha'}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Enviar e-mail'}</AppButton>
      {mode === 'login' && <>
        <AppButton variant="secondary" onPress={() => setMode('register')}>Criar conta de passageiro</AppButton>
        <AppButton variant="secondary" onPress={() => setMode('forgot')}>Esqueci minha senha</AppButton>
      </>}
      {mode !== 'login' && <AppButton variant="secondary" onPress={() => setMode('login')}>Voltar para entrar</AppButton>}
    </Card>
    {!firebaseConfigured && <Card>
      <Text accessibilityRole="header" style={styles.cardTitle}>Acesso para demonstração</Text>
      <Subtitle>Use em aparelhos separados para conhecer as duas telas. A sincronização entre aparelhos requer Firebase.</Subtitle>
      <AppButton variant="secondary" onPress={() => signInAsDemo('passenger')}>Entrar como passageiro de demonstração</AppButton>
      <AppButton variant="secondary" onPress={() => signInAsDemo('driver')}>Entrar como motorista de demonstração</AppButton>
    </Card>}
    <Message>Contas de motorista são preparadas pelo responsável do projeto. Entre com o e-mail e senha fornecidos.</Message>
  </Screen>;
}

const styles = StyleSheet.create({
  cardTitle: { color: colors.navy, fontSize: 21, fontWeight: '700' },
  input: { minHeight: 52, borderWidth: 2, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, color: colors.text, fontSize: 17, backgroundColor: '#FFFFFF' },
});
