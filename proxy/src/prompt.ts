/** SPEC §11 프롬프트 — 사용자 카테고리 목록을 동적 주입, '기타'는 항상 마지막에 1회 */
export function buildPrompt(categories: string[], ocrText: string): string {
  const list = [...new Set(categories.filter((c) => c && c !== '기타'))];
  const categoryList = [...list, '기타'].join(', ');
  return `생활용품 라벨 사진과 OCR 텍스트입니다. JSON만 출력하세요.

규칙:
1. product_name: 핵심 제품명만. 용량·광고문구 제외. 확신 없으면 null
2. brand: 브랜드명. 없으면 null
3. category: 다음 중에서만 선택: [${categoryList}]
4. dates: 발견한 모든 날짜를 분류:
   - EXP: "까지", "유통기한", "사용기한", EXP, BBE 문맥
   - MFG: "제조", MFG, 제조번호 옆 날짜
   - UNKNOWN: 구분 불가
   value는 YYYY-MM-DD 또는 YYYY-MM, raw는 라벨 원문 그대로
5. confidence: 필드별 "high"/"low". 추측이 섞이면 무조건 "low"
6. 보이지 않는 정보를 지어내지 마세요. 모르면 null

OCR 텍스트: ${ocrText}`;
}
