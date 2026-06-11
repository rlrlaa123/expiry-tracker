import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/ui/tokens';

/** 하단 시트 (목업 .sheet) — 딤 탭/뒤로가기로 닫힘 */
export function BottomSheet({
  visible,
  onClose,
  title,
  description,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose} accessibilityLabel="닫기" />
      <View style={styles.sheet}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
        {children}
      </View>
    </Modal>
  );
}

/** 시트 안의 선택지 버튼 (목업 .opt) — 본문 + 회색 보조 설명 */
export function SheetOption({
  label,
  hint,
  onPress,
  muted,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.opt, pressed && styles.optPressed]}
      accessibilityRole="button"
    >
      <Text style={[styles.optLabel, muted && styles.optLabelMuted]}>{label}</Text>
      {hint ? <Text style={styles.optHint}>{hint}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: 'rgba(20,22,18,0.4)',
  },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 30,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  desc: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  opt: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: spacing.sm,
  },
  optPressed: {
    opacity: 0.7,
  },
  optLabel: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.ink,
  },
  optLabelMuted: {
    color: colors.muted,
  },
  optHint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
});
