const PER_MINUTE = 5;
const PER_DAY = 50;

/**
 * device_id당 분5/일50 (SPEC §11). KV는 eventual consistency라 소프트 리밋 —
 * Gemini 무료 쿼터 보호 목적이므로 충분하다. 카운터 외 어떤 내용도 저장하지 않는다.
 */
export async function checkRateLimit(
  kv: KVNamespace,
  deviceId: string,
  now = new Date(),
): Promise<{ allowed: boolean; reason?: 'minute' | 'day' }> {
  const minuteKey = `rl:${deviceId}:m:${Math.floor(now.getTime() / 60_000)}`;
  const dayKey = `rl:${deviceId}:d:${now.toISOString().slice(0, 10)}`;

  const [minuteRaw, dayRaw] = await Promise.all([kv.get(minuteKey), kv.get(dayKey)]);
  const minuteCount = Number(minuteRaw ?? 0);
  const dayCount = Number(dayRaw ?? 0);

  if (minuteCount >= PER_MINUTE) return { allowed: false, reason: 'minute' };
  if (dayCount >= PER_DAY) return { allowed: false, reason: 'day' };

  await Promise.all([
    kv.put(minuteKey, String(minuteCount + 1), { expirationTtl: 120 }),
    kv.put(dayKey, String(dayCount + 1), { expirationTtl: 60 * 60 * 25 }),
  ]);
  return { allowed: true };
}
