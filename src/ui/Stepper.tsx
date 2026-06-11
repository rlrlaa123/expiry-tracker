import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/ui/tokens';

/** −/＋ 스테퍼 (목업 settings .stepper) */
export function Stepper({
  label,
  onMinus,
  onPlus,
}: {
  label: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onMinus} hitSlop={8} style={styles.btn} accessibilityRole="button" accessibilityLabel="감소">
        <Text style={styles.btnLabel}>−</Text>
      </Pressable>
      <Text style={styles.value}>{label}</Text>
      <Pressable onPress={onPlus} hitSlop={8} style={styles.btn} accessibilityRole="button" accessibilityLabel="증가">
        <Text style={styles.btnLabel}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnLabel: {
    fontSize: 15,
    color: colors.ink,
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    minWidth: 56,
    textAlign: 'center',
  },
});
