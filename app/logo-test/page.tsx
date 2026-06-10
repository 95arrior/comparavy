import AteFloLogo from "@/components/AteFloLogo";

// 임시 미리보기 (커밋하지 않음). localhost:3100/logo-test
export default function LogoTest() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-16 bg-white p-10">
      <div className="flex items-end gap-16">
        <div className="flex flex-col items-center gap-4">
          <AteFloLogo size={140} />
          <span className="text-sm text-neutral-500">무료 · 먹는 모션</span>
        </div>
        <div className="flex flex-col items-center gap-4">
          <AteFloLogo pro size={140} />
          <span className="text-sm text-neutral-500">프로 · 무지개 요동</span>
        </div>
        <div className="flex flex-col items-center gap-4">
          <AteFloLogo animated={false} size={140} />
          <span className="text-sm text-neutral-500">정지 (88%)</span>
        </div>
      </div>

      {/* 하단 따라다니는 pill 미리보기 (대시보드 실제 모습) */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-sm text-neutral-500">하단 인디케이터 (웹 클로드식)</span>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/90 px-3 py-1.5 shadow-sm">
            <AteFloLogo animated={false} size={22} />
            <span className="text-xs text-neutral-400">대기 (정지)</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/90 px-3 py-1.5 shadow-sm">
            <AteFloLogo animated size={22} />
            <span className="text-xs font-medium text-neutral-500">작성 중… (무료)</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/90 px-3 py-1.5 shadow-sm">
            <AteFloLogo pro animated size={22} />
            <span className="text-xs font-medium text-neutral-500">작성 중… (프로)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
