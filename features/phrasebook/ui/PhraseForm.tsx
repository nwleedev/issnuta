"use client";
import * as React from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/shared/ui/select";

export type PhraseFormValues = {
  category: string;
  source: string; // 원문
  target: string; // 번역문
};

export type PhraseFormProps = {
  categories?: string[];
  defaultValues?: Partial<PhraseFormValues>;
  submitLabel?: string;
  onSubmit?: (values: PhraseFormValues) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
};

/**
 * PhraseForm — 프레이즈 생성/편집 폼(클라이언트 컴포넌트)
 * - 외부 상태/스토리지 연동은 상위 onSubmit에서 처리합니다.
 * - 의존 라이브러리 없이 접근성/모바일 입력 최적화만 반영.
 */
export default function PhraseForm({
  categories = ["인사", "길찾기", "음식", "쇼핑", "긴급"],
  defaultValues,
  submitLabel = "저장",
  onSubmit,
  disabled,
  className,
}: PhraseFormProps) {
  const [category, setCategory] = React.useState(
    defaultValues?.category ?? categories[0] ?? ""
  );
  const [source, setSource] = React.useState(defaultValues?.source ?? "");
  const [target, setTarget] = React.useState(defaultValues?.target ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || busy) return;
    // 간단 검증
    if (!source.trim() || !target.trim()) {
      setError("원문/번역문을 입력하세요.");
      return;
    }
    setError(null);
    try {
      setBusy(true);
      await onSubmit?.({ category, source: source.trim(), target: target.trim() });
      // 성공 시 초기화(원한다면)
      setSource("");
      setTarget("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={("grid gap-3 " + (className ?? "")).trim()}
    >
      <label htmlFor="phr-cat" className="text-sm font-medium">
        카테고리
      </label>
      <Select
        value={category}
        onValueChange={setCategory}
        disabled={disabled || busy}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <label htmlFor="phr-src" className="text-sm font-medium">
        원문
      </label>
      <Input
        id="phr-src"
        placeholder="예: 안녕하세요"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        inputMode="text"
        enterKeyHint="next"
        disabled={disabled || busy}
      />

      <label htmlFor="phr-dst" className="text-sm font-medium">
        번역문
      </label>
      <Input
        id="phr-dst"
        placeholder="예: こんにちは"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        inputMode="text"
        enterKeyHint="done"
        disabled={disabled || busy}
      />

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="mt-1" disabled={disabled || busy}>
        {busy ? "저장 중…" : submitLabel}
      </Button>
    </form>
  );
}
