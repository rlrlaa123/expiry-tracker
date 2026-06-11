import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, radius } from '@/ui/tokens';

import type { HomeFilter } from './filter';

const FIXED: { filter: HomeFilter; label: string }[] = [
  { filter: { kind: 'all' }, label: '전체' },
  { filter: { kind: 'soon' }, label: '임박 (D-30)' },
  { filter: { kind: 'expired' }, label: '만료' },
  { filter: { kind: 'unset' }, label: '기한 미설정' },
];

function isSame(a: HomeFilter, b: HomeFilter): boolean {
  return a.kind === b.kind && (a.kind !== 'location' || a.location === (b as typeof a).location);
}

/** 필터 칩 행 — 고정 4종 + 보관 위치 동적 칩 (목업 .filters) */
export function FilterChips({
  active,
  locations,
  onChange,
}: {
  active: HomeFilter;
  locations: string[];
  onChange: (f: HomeFilter) => void;
}) {
  const chips = [
    ...FIXED,
    ...locations.map((loc) => ({
      filter: { kind: 'location', location: loc } satisfies HomeFilter,
      label: `📍 ${loc}`,
    })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {chips.map(({ filter, label }) => {
        const on = isSame(active, filter);
        return (
          <Pressable
            key={label}
            onPress={() => onChange(filter)}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingTop: 6,
    paddingBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  chipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  label: {
    fontSize: 13,
    color: colors.ink,
  },
  labelOn: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
