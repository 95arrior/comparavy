"use client";

import { useEffect, useRef, useState } from "react";

// 다음(카카오) 우편번호 서비스 — 인라인 embed 방식(팝업 X). API 키 불필요(공개 스크립트).
// 주소칸을 누르면 그 자리에 검색 UI가 펼쳐지고, 선택하면 도로명 자동 입력 + 닫힘.
// 좌표는 /api/geocode(카카오 REST)로 변환. 상세주소는 직접 입력.

type DaumData = { roadAddress: string; jibunAddress: string; zonecode: string };
type DaumPostcode = { embed: (el: HTMLElement) => void };
type DaumPostcodeOpts = { oncomplete: (d: DaumData) => void; onclose?: () => void; width?: string | number; height?: string | number };
declare global {
  interface Window {
    daum?: { Postcode: new (opts: DaumPostcodeOpts) => DaumPostcode };
  }
}

const SCRIPT_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

function loadPostcode(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.daum?.Postcode) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("우편번호 스크립트를 불러오지 못했어요.")));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("우편번호 스크립트를 불러오지 못했어요."));
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
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // onPick은 매 렌더 새 함수일 수 있어 ref로 안정화(embed 효과가 재실행되지 않게).
  const onPickRef = useRef(onPick);
  useEffect(() => { onPickRef.current = onPick; });

  // 상세주소 자동 포커스: 주소가 '빈값 → 채워짐'으로 바뀔 때(=검색 직후)만. 편집화면 진입(이미 채워짐)엔 포커스 안 함.
  const detailRef = useRef<HTMLInputElement>(null);
  const prevAddr = useRef(address);
  useEffect(() => {
    if (!prevAddr.current && address) detailRef.current?.focus();
    prevAddr.current = address;
  }, [address]);

  // open이 true가 되면 그 자리에 다음 검색 UI를 embed. 인라인이라 팝업 차단 무관.
  useEffect(() => {
    if (!open || !boxRef.current) return;
    let canceled = false;
    setErr(null);
    loadPostcode()
      .then(() => {
        if (canceled || !boxRef.current) return;
        boxRef.current.innerHTML = "";
        new window.daum!.Postcode({
          width: "100%",
          height: "100%",
          oncomplete: (d) => {
            const road = d.roadAddress || d.jibunAddress;
            onPickRef.current({ address: road, lat: null, lng: null }); // 즉시 주소 반영
            setOpen(false);
            // 좌표는 비동기로 보강(실패해도 주소는 유지)
            fetch(`/api/geocode?query=${encodeURIComponent(road)}`)
              .then((r) => r.json())
              .then((g) => onPickRef.current({ address: road, lat: g?.lat ?? null, lng: g?.lng ?? null }))
              .catch((e) => setErr("좌표 변환은 실패했지만 주소는 저장돼요. (" + (e?.message ?? "geocode") + ")"));
          },
          onclose: () => setOpen(false),
        }).embed(boxRef.current);
      })
      .catch((e: unknown) => {
        if (!canceled) setErr(e instanceof Error ? e.message : "주소 검색을 열지 못했어요.");
      });
    return () => { canceled = true; };
  }, [open]);

  return (
    <div className="space-y-3">
      {/* 주소 표시 + 검색 토글 */}
      <button type="button" onClick={() => setOpen((v) => !v)} className={`${inputCls} flex items-center justify-between text-left`}>
        {address ? <span className="text-neutral-900">{address}</span> : <span className="text-neutral-400">주소 검색 (눌러서 도로명으로 찾기)</span>}
        <span className="ml-2 shrink-0 text-sm font-medium text-[#1D75F7]">{open ? "닫기" : address ? "변경" : "검색"}</span>
      </button>

      {/* 인라인 검색 영역 (펼침) */}
      {open && (
        <div className="ateflo-reveal overflow-hidden rounded-xl border border-neutral-200">
          <div ref={boxRef} style={{ width: "100%", height: 420 }} />
        </div>
      )}

      {err && <p className="text-xs text-amber-600">{err}</p>}

      {/* 상세주소 — 주소 선택 후에만 스르륵 나타남(ateflo-fade-in) + 자동 포커스 */}
      {address && (
        <input
          ref={detailRef}
          value={detail}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder="상세주소 (동·호수 등)"
          maxLength={100}
          className={`${inputCls} ateflo-fade-in`}
        />
      )}
    </div>
  );
}
