import Brand from "@/components/Brand";
import WaitlistForm from "@/components/WaitlistForm";

/** 출시 전, 관리자가 아닌 로그인 사용자에게 보이는 '공사중' 화면. */
export default function ConstructionScreen({ email }: { email: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center text-neutral-900 antialiased">
      <Brand />
      <div className="mt-10 text-5xl">🚧</div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">아직 공사 중이에요</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-500">
        더 좋은 모습으로 곧 만나요. 준비되면 가장 먼저 메일로 알려드릴게요.
      </p>
      <div className="mt-8 w-full max-w-md">
        <WaitlistForm source="construction" />
      </div>
      <p className="mt-8 text-xs text-neutral-400">{email} (으)로 로그인됨</p>
    </div>
  );
}
