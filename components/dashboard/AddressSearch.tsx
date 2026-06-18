"use client";

import { useState } from "react";

// 다음(카카오) 우편번호 서비스 — 도로명/지번 검색 팝업. API 키 불필요(공개 스크립트).
// 선택 시 도로명 자동 입력 + 좌표는 /api/geocode(카카오 REST)로 변환. 상세주소는 직접 입력.

type DaumData = { roadAddress: string; jibunAddress: string; zonecode: string };
type DaumPostcode = { open: () => void };
declare global {
  interface Window {
    daum?: { Postcode: new (opts: { oncomplete: (d: DaumData) => void }) => DaumPostcode };
  }
}

const SCRIPT_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

function loadPostcode(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.daum?.Postcode) return resolve();
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("load fail")));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("load fail"));
    document.head.appendChild(s);
  });
}

export interface AddressPick {
  address: string; // 도로명(없으면 지번)
  lat: number | null;
  lng: number | null;
}

export default function AddressSearch({
  address,
  detail,
  onPick,
  onDetailChange,
  inputCls,
}: {
  address: string;
  detail: string;
  onPick: (r: AddressPick) => void;
  onDetailChange: (s: string) => void;
  inputCls: string;
}) {
  const [loading, setLoading] = useState(false);

  async function open() {
    try {
      setLoading(true);
      await loadPostcode();
      new window.daum!.Postcode({
        oncomplete: async (d) => {
          const road = d.roadAddress || d.jibunAddress;
          // 먼저 주소만 채우고(즉시 반영), 좌표는 비동기로 채움
          onPick({ address: road, lat: null, lng: null });
          try {
            const res = await fetch(`/api/geocode?query=${encodeURIComponent(road)}`);
            const g = await res.json();
            onPick({ address: road, lat: g?.lat ?? null, lng: g?.lng ?? null });
          } catch {
            /* 좌표 실패해도 주소는 유지 */
          }
        },
      }).open();
    } catch {
      // 스크립트 로드 실패 — 사용자가 다시 시도하도록 둔다
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={open} disabled={loading} className={`${inputCls} text-left disabled:opacity-60`}>
        {address ? (
          <span className="text-neutral-900">{address}</span>
        ) : (
          <span className="text-neutral-400">{loading ? "주소 검색 여는 중…" : "주소 검색 (클릭하면 도로명으로 찾기)"}</span>
        )}
      </button>
      <input
        value={detail}
        onChange={(e) => onDetailChange(e.target.value)}
        placeholder={address ? "상세주소 (동·호수 등)" : "주소를 먼저 검색해 주세요"}
        maxLength={100}
        disabled={!address}
        className={`${inputCls} disabled:bg-neutral-50 disabled:text-neutral-400`}
      />
    </div>
  );
}
