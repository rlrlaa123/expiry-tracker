import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';

/**
 * 온디바이스 OCR (ML Kit 한국어 모델 — dev build #1부터 포함).
 * 압축본이 아닌 원본 사진에 돌려 인식률을 보존한다.
 */
export async function recognizeKoreanText(imageUri: string): Promise<string> {
  const result = await TextRecognition.recognize(imageUri, TextRecognitionScript.KOREAN);
  return result.text;
}
