"use client";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/shared/ui/select";

export type OptionsFormValues = {
  defaultDirection: "koja" | "jako";
  autoCopy: boolean;
  amount?: string; // demo field for numeric input behavior
  phone?: string;
  email?: string;
  otp?: string;
  query?: string;
  username?: string;
};

export type OptionsFormProps = {
  initial?: Partial<OptionsFormValues>;
  onSubmit?: (values: OptionsFormValues) => void | Promise<void>;
  className?: string;
  disabled?: boolean;
};

/**
 * OptionsForm — 설정 화면의 기본 옵션 폼(모바일 최적화 입력)
 * - 입력 최적화: inputMode/enterKeyHint/autocomplete
 * - 접근성: label/aria-describedby/aria-invalid
 * - 실제 저장 연동은 상위 onSubmit에서 처리
 */
export default function OptionsForm({ initial, onSubmit, className, disabled }: OptionsFormProps) {
  const [values, setValues] = useState<OptionsFormValues>({
    defaultDirection: initial?.defaultDirection ?? "koja",
    autoCopy: initial?.autoCopy ?? false,
    amount: initial?.amount ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    otp: initial?.otp ?? "",
    query: initial?.query ?? "",
    username: initial?.username ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function patch<K extends keyof OptionsFormValues>(key: K, v: OptionsFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (disabled || busy) return;
    const nextErr: Record<string, string> = {};
    if (!values.username?.trim()) nextErr.username = "사용자명을 입력하세요";
    setErrors(nextErr);
    if (Object.keys(nextErr).length) return;
    try {
      setBusy(true);
      await onSubmit?.(values);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={("grid gap-3 " + (className ?? "")).trim()}>
      <fieldset className="grid gap-2">
        <label htmlFor="dir" className="text-sm font-medium">
          기본 번역 방향
        </label>
        <Select
          value={values.defaultDirection}
          onValueChange={(v) => patch("defaultDirection", v as OptionsFormValues["defaultDirection"])}
          disabled={disabled || busy}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="koja">한국어 → 일본어</SelectItem>
            <SelectItem value="jako">일본어 → 한국어</SelectItem>
          </SelectContent>
        </Select>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={values.autoCopy}
          onChange={(e) => patch("autoCopy", e.target.checked)}
          disabled={disabled || busy}
        />
        <span className="text-sm">번역 완료 시 자동 복사</span>
      </label>

      <div className="my-2 border-t pt-2 text-sm font-medium opacity-70">
        모바일 입력 최적화
      </div>

      <label htmlFor="amount" className="text-sm font-medium">금액</label>
      <Input
        id="amount"
        placeholder="예: 12,000"
        inputMode="decimal"
        enterKeyHint="next"
        value={values.amount}
        onChange={(e) => patch("amount", e.target.value)}
        disabled={disabled || busy}
      />

      <label htmlFor="phone" className="text-sm font-medium">전화번호</label>
      <Input
        id="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        enterKeyHint="next"
        value={values.phone}
        onChange={(e) => patch("phone", e.target.value)}
        disabled={disabled || busy}
      />

      <label htmlFor="email" className="text-sm font-medium">이메일</label>
      <Input
        id="email"
        type="email"
        autoComplete="email"
        enterKeyHint="next"
        value={values.email}
        onChange={(e) => patch("email", e.target.value)}
        disabled={disabled || busy}
      />

      <label htmlFor="otp" className="text-sm font-medium">인증 코드</label>
      <Input
        id="otp"
        inputMode="numeric"
        autoComplete="one-time-code"
        enterKeyHint="next"
        value={values.otp}
        onChange={(e) => patch("otp", e.target.value)}
        disabled={disabled || busy}
      />

      <label htmlFor="query" className="text-sm font-medium">검색</label>
      <Input
        id="query"
        type="search"
        enterKeyHint="search"
        value={values.query}
        onChange={(e) => patch("query", e.target.value)}
        disabled={disabled || busy}
      />

      <label htmlFor="username" className="text-sm font-medium">사용자명</label>
      <Input
        id="username"
        aria-describedby="uHelp uErr"
        aria-invalid={!!errors.username}
        value={values.username}
        onChange={(e) => patch("username", e.target.value)}
        disabled={disabled || busy}
      />
      <small id="uHelp" className="text-sm opacity-70">영문 4자 이상</small>
      {errors.username && (
        <p id="uErr" role="alert" className="text-destructive text-sm">{errors.username}</p>
      )}

      <Button type="submit" className="mt-2" disabled={disabled || busy}>
        {busy ? "저장 중…" : "저장"}
      </Button>
    </form>
  );
}
