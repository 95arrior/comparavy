"use client";

// 임시 미리보기 (커밋하지 않음). localhost:3100/editor-test
import { useState } from "react";
import ArticleEditor from "@/components/dashboard/ArticleEditor";

const SAMPLE = `<h2>강아지 분리불안 해결 방법</h2>
<p>주인이 신발만 신어도 짖고, 문이 닫히면 하울링이 시작된다면 분리불안일 수 있습니다. 핵심은 '혼자 있어도 괜찮다'는 경험을 작은 단위로 쌓는 것입니다.</p>
<h3>1단계: 외출 신호부터 무뎌지게 만들기</h3>
<p>강아지는 열쇠 소리, 외투 걸치기를 외출과 연결해 미리 불안해집니다. 외출 생각이 없을 때 열쇠를 집었다 내려놓아 보세요.</p>
<ul><li>열쇠를 집었다 그냥 내려놓기</li><li>신발 신고 소파에 앉았다 벗기</li></ul>
<h3>2단계: 부재 시간 늘리기</h3>
<p>10초 → 1분 → 5분 순으로 천천히 늘립니다. 불안해지기 직전에 돌아오는 게 핵심입니다.</p>`;

export default function EditorTest() {
  const [title, setTitle] = useState("강아지 분리불안 해결 방법: 따라 하면 끝나는 단계별 훈련");
  const [featured, setFeatured] = useState<string | null>(null);
  const [, setHtml] = useState(SAMPLE);
  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 text-lg font-semibold">에디터 — 대표이미지(선택)·제목 H1·표·번호목록·정렬·드래그링크</h1>
      <ArticleEditor
        title={title}
        onTitleChange={setTitle}
        featuredImage={featured}
        onFeaturedChange={setFeatured}
        originalHtml={SAMPLE}
        initialHtml={SAMPLE}
        onChange={setHtml}
      />
    </div>
  );
}
