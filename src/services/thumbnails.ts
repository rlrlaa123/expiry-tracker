import { Directory, File, Paths } from 'expo-file-system';

/**
 * 폼 저장 시 캐시의 압축 이미지를 영구 보관 위치(document/thumbnails)로 이동.
 * 캐시는 OS가 수시로 비울 수 있어 DB가 가리키는 썸네일은 document 쪽이어야 한다.
 * 이동 실패 시 원본 uri 반환 — 썸네일 없이도 앱은 동작해야 한다.
 */
export function persistThumbnail(cacheUri: string, itemId: string): string {
  try {
    const dir = new Directory(Paths.document, 'thumbnails');
    if (!dir.exists) dir.create({ intermediates: true });
    const dest = new File(dir, `${itemId}.jpg`);
    new File(cacheUri).moveSync(dest);
    return dest.uri;
  } catch {
    return cacheUri;
  }
}
