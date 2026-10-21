import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

export const colors = { navy: '#102A43', blue: '#1264A3', lightBlue: '#E8F3FA', green: '#0B6E4F', red: '#B42318', text: '#102A43', muted: '#486581', border: '#9FB3C8', surface: '#FFFFFF', background: '#F0F4F8', focus: '#F79009' };

export function Screen({ children }: PropsWithChildren) {
  return <ScrollView contentContainerStyle={styles.screen} accessibilityLabel="Conteúdo principal">{children}</ScrollView>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: PropsWithChildren) {
  return <Text accessibilityRole="header" style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: PropsWithChildren) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Message({ children, tone = 'info' }: PropsWithChildren<{ tone?: 'info' | 'success' | 'error' | 'warning' }>) {
  const background = tone === 'success' ? '#D1FAE5' : tone === 'error' ? '#FEE4E2' : tone === 'warning' ? '#FEF0C7' : colors.lightBlue;
  return <View accessible accessibilityLiveRegion="polite" style={[styles.message, { backgroundColor: background }]}><Text style={styles.messageText}>{children}</Text></View>;
}

export function AppButton({ children, variant = 'primary', style, accessibilityLabel, accessibilityHint, ...props }: PropsWithChildren<PressableProps & { variant?: 'primary' | 'secondary' | 'danger'; style?: StyleProp<ViewStyle> }>) {
  const background = variant === 'primary' ? colors.blue : variant === 'danger' ? colors.red : colors.surface;
  const textColor = variant === 'secondary' ? colors.navy : '#FFFFFF';
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} style={({ pressed }) => [styles.button, { backgroundColor: background, opacity: pressed ? 0.82 : 1 }, variant === 'secondary' && styles.secondaryButton, style]} {...props}><Text style={[styles.buttonText, { color: textColor }]}>{children}</Text></Pressable>;
}

export function SelectOption({ title, description, selected, onPress }: { title: string; description: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${title}. ${description}`} accessibilityHint="Toque duas vezes para selecionar" onPress={onPress} style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && { opacity: 0.8 }]}><Text style={styles.optionTitle}>{title}</Text><Text style={styles.optionDescription}>{description}</Text><Text style={styles.optionStatus}>{selected ? 'Selecionado' : 'Não selecionado'}</Text></Pressable>;
}

export function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return <View style={styles.section}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: colors.background, padding: 20, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 18, gap: 12, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.navy, fontSize: 28, lineHeight: 36, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 17, lineHeight: 24 },
  message: { borderRadius: 10, padding: 14 },
  messageText: { color: colors.navy, fontSize: 16, lineHeight: 23, fontWeight: '500' },
  button: { minHeight: 52, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, borderWidth: 2, borderColor: 'transparent' },
  secondaryButton: { borderColor: colors.blue },
  buttonText: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  option: { minHeight: 72, padding: 14, borderWidth: 2, borderColor: colors.border, borderRadius: 10, gap: 4, backgroundColor: colors.surface },
  optionSelected: { borderColor: colors.blue, backgroundColor: colors.lightBlue },
  optionTitle: { color: colors.navy, fontSize: 18, fontWeight: '700' },
  optionDescription: { color: colors.muted, fontSize: 16, lineHeight: 22 },
  optionStatus: { color: colors.navy, fontSize: 15, fontWeight: '600' },
  section: { gap: 10 },
  sectionTitle: { color: colors.navy, fontSize: 20, lineHeight: 28, fontWeight: '700' },
});
