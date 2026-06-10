import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { seedCategories } from '@/db/seed';
import { colors, spacing, typography } from '@/ui/tokens';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!success) return;
    seedCategories(db)
      .then(() => setSeeded(true))
      .catch((e) => console.error('seed failed', e));
  }, [success]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>데이터베이스를 준비하지 못했어요</Text>
        <Text style={styles.errorHint}>앱을 완전히 종료한 뒤 다시 열어 주세요</Text>
      </View>
    );
  }

  if (!success || !seeded) {
    // 마이그레이션은 수 ms 안에 끝나므로 스플래시 뒤에 가려지는 빈 화면이면 충분
    return <View style={styles.center} />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  errorTitle: {
    ...typography.heading,
    color: colors.ink,
  },
  errorHint: {
    ...typography.caption,
    color: colors.muted,
  },
});
