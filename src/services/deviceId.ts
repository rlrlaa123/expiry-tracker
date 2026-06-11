import { File, Paths } from 'expo-file-system';

/**
 * 프록시 rate limit용 기기 식별자 — 최초 1회 생성해 document 디렉터리에 보관.
 * 개인정보가 아닌 랜덤 값이며 서버는 카운터 외에 저장하지 않는다 (SPEC §11).
 */
export function getDeviceId(): string {
  const file = new File(Paths.document, 'device-id.txt');
  try {
    if (file.exists) return file.textSync().trim();
  } catch {
    // 읽기 실패 시 새로 발급
  }
  const id = `dev-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  try {
    file.write(id);
  } catch {
    // 저장 실패해도 이번 세션용 id는 반환
  }
  return id;
}
