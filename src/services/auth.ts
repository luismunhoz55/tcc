import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { UserProfile, UserRole } from '@/types/domain';
import { firebaseConfigured, getFirebase } from './firebase';
import { createProfile, getProfile } from './repository';

export type Session = { user: UserProfile | null; loading: boolean };
type SessionListener = (session: Session) => void;

let demoUser: UserProfile | null = null;
const demoListeners = new Set<SessionListener>();
const realListeners = new Set<SessionListener>();

const notifyDemo = () => demoListeners.forEach((listener) => listener({ user: demoUser, loading: false }));
const notifyReal = (user: UserProfile | null) => realListeners.forEach((listener) => listener({ user, loading: false }));

export function subscribeToSession(listener: SessionListener) {
  if (!firebaseConfigured) {
    listener({ user: demoUser, loading: false });
    demoListeners.add(listener);
    return () => demoListeners.delete(listener);
  }

  const firebase = getFirebase();
  if (!firebase) return () => undefined;
  listener({ user: null, loading: true });
  realListeners.add(listener);
  const unsubscribeAuth = onAuthStateChanged(firebase.auth, async (user) => {
    if (!user) {
      listener({ user: null, loading: false });
      return;
    }
    const profile = await getProfile(user.uid);
    listener({ user: profile, loading: false });
  });
  return () => {
    realListeners.delete(listener);
    unsubscribeAuth();
  };
}

export async function registerPassenger(displayName: string, email: string, password: string) {
  if (!firebaseConfigured) {
    demoUser = { uid: `demo-passenger-${Date.now()}`, displayName, email, role: 'passenger', createdAt: Date.now() };
    notifyDemo();
    return;
  }
  const firebase = getFirebase();
  if (!firebase) throw new Error('A configuração do Firebase está incompleta.');
  const credential = await createUserWithEmailAndPassword(firebase.auth, email.trim(), password);
  const profile = { uid: credential.user.uid, displayName: displayName.trim(), email: email.trim(), role: 'passenger' as const, createdAt: Date.now() };
  await createProfile(profile);
  notifyReal(profile);
}

export async function signIn(email: string, password: string) {
  if (!firebaseConfigured) {
    const isDriver = email.toLowerCase().includes('motorista');
    demoUser = {
      uid: isDriver ? 'demo-driver' : 'demo-passenger',
      displayName: isDriver ? 'Motorista de demonstração' : 'Passageiro de demonstração',
      email,
      role: isDriver ? 'driver' : 'passenger',
      createdAt: Date.now(),
    };
    notifyDemo();
    return;
  }
  const firebase = getFirebase();
  if (!firebase) throw new Error('A configuração do Firebase está incompleta.');
  await signInWithEmailAndPassword(firebase.auth, email.trim(), password);
}

export async function signInAsDemo(role: UserRole) {
  demoUser = {
    uid: role === 'driver' ? 'demo-driver' : 'demo-passenger',
    displayName: role === 'driver' ? 'Motorista de demonstração' : 'Passageiro de demonstração',
    email: `${role}@demonstracao.local`,
    role,
    createdAt: Date.now(),
  };
  notifyDemo();
}

export async function requestPasswordReset(email: string) {
  const firebase = getFirebase();
  if (!firebase) throw new Error('O modo demonstração não envia e-mails. Configure o Firebase para recuperar a senha.');
  await sendPasswordResetEmail(firebase.auth, email.trim());
}

export async function signOutUser() {
  if (!firebaseConfigured) {
    demoUser = null;
    notifyDemo();
    return;
  }
  const firebase = getFirebase();
  if (firebase) await signOut(firebase.auth);
}

export function authErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/invalid-email': 'Informe um e-mail válido.',
    'auth/weak-password': 'A senha deve ter pelo menos seis caracteres.',
    'auth/invalid-credential': 'E-mail ou senha inválidos.',
    'auth/user-not-found': 'E-mail ou senha inválidos.',
    'auth/wrong-password': 'E-mail ou senha inválidos.',
  };
  return messages[code ?? ''] ?? 'Não foi possível concluir a operação. Tente novamente.';
}
