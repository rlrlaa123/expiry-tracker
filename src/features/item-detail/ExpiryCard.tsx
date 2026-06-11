import { StyleSheet, Text, View } from 'react-native';

import type { ComputedExpiry } from '@/domain/expiry';
import { formatDot } from '@/features/items/enrich';

/** 상태별 카드 배경 — 목업 gradient의 대표색 단색 대체 (ADR 006) */
function cardColor(dday: number | null): string {
  if (dday === null) return '#878D85'; // 기한 미설정 — 중립 회녹
  if (dday < 0) return '#C2493D'; // over
  if (dday <= 30) return '#C9881F'; // warn
  return '#2E7D6B'; // 안전
}

/**
 * 만료 카드 + 수명 진행바 (목업 item-detail .expiry-card — 시그니처 UI).
 * progress: (개봉일 또는 등록일) → 만료일 구간에서 오늘의 % 위치
 */
export function ExpiryCard({
  expiry,
  dday,
  progressPct,
  startLabel,
}: {
  expiry: ComputedExpiry | null;
  dday: number | null;
  progressPct: number | null;
  startLabel: '개봉' | '등록';
}) {
  const ddayLabel = dday === null ? 'D-?' : dday >= 0 ? `D-${dday}` : `D+${-dday}`;
  return (
    <View style={[styles.card, { backgroundColor: cardColor(dday) }]}>
      <View style={styles.top}>
        <View style={styles.topLeft}>
          <Text style={styles.cap}>만료 예정</Text>
          <Text style={styles.date}>{expiry ? formatDot(expiry.date) : '—'}</Text>
          <Text style={styles.why}>
            {expiry ? expiry.basis : '기한 미설정 — 유통기한을 입력해 주세요'}
          </Text>
        </View>
        <View style={styles.ddayBox}>
          <Text style={styles.ddayText}>{ddayLabel}</Text>
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progressPct ?? 0}%` }]} />
      </View>
      <View style={styles.lifeCap}>
        <Text style={styles.lifeCapText}>{startLabel}</Text>
        <Text style={styles.lifeCapText}>
          {progressPct === null ? '' : `${progressPct}% 경과`}
        </Text>
        <Text style={styles.lifeCapText}>만료</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    marginBottom: 14,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  topLeft: {
    flex: 1,
    paddingRight: 10,
  },
  cap: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  date: {
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  why: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  ddayBox: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  ddayText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  track: {
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 99,
  },
  lifeCap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  lifeCapText: {
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.75)',
  },
});
