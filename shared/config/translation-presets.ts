// 한국어 주석: NLLB-200 600M(양자화)용 디코딩 프리셋
// - 목적: UI 변경 없이도 "정확 모드" 디코딩을 중앙에서 관리하기 위함입니다.
// - 사용처: shared/lib/translator.ts 등에서 언어쌍별 기본 num_beams / max_new_tokens를 가져다 씁니다.

export type LanguagePair = "ko-ja" | "ja-ko" | "ko-en" | "en-ko";

export type DecodingPreset = {
  numBeams: number;
  maxNewTokens: number;
  lengthPenalty?: number;
  noRepeatNgramSize?: number;
};

// 한국어 주석: "속도 무관, 정확도 우선" 기본값(초기안)
// - numBeams: 5
// - maxNewTokens: 160
// - lengthPenalty: 1.05
// - noRepeatNgramSize: 3
// 실제 값은 단말 벤치마크/사용자 피드백을 통해 추후 조정 가능합니다.
const ACCURATE_PRESETS: Record<LanguagePair, DecodingPreset> = {
  "ko-ja": {
    numBeams: 5,
    maxNewTokens: 160,
    lengthPenalty: 1.05,
    noRepeatNgramSize: 3,
  },
  "ja-ko": {
    numBeams: 5,
    maxNewTokens: 160,
    lengthPenalty: 1.05,
    noRepeatNgramSize: 3,
  },
  "ko-en": {
    numBeams: 5,
    maxNewTokens: 160,
    lengthPenalty: 1.05,
    noRepeatNgramSize: 3,
  },
  "en-ko": {
    numBeams: 5,
    maxNewTokens: 160,
    lengthPenalty: 1.05,
    noRepeatNgramSize: 3,
  },
};

export function getAccuratePreset(pair: LanguagePair): DecodingPreset {
  return ACCURATE_PRESETS[pair];
}

