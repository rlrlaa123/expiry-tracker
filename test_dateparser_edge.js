const { parseDates } = require('./dist/domain/dateParser.js');

// YY.MM.DD 패턴 테스트 — 비날짜 텍스트 오탐
const testCases = [
  '12.06.11',  // 2012년 6월 11일 또는 비날짜 숫자?
  'v12.06.11',  // 버전 번호?
  '12.06.11 외',  // 뒤에 텍스트가 있으면?
  '가격 12.06.11',  // 앞에 텍스트가 있으면?
  '1.1.1',     // 너무 작은 숫자 (IP?)
  '99.99.99',  // 불가능한 날짜
  '25.13.32',  // 월/일 초과
];

testCases.forEach(text => {
  try {
    const result = parseDates(text);
    console.log(`"${text}" -> ${JSON.stringify(result)}`);
  } catch (e) {
    console.log(`"${text}" -> ERROR: ${e.message}`);
  }
});
