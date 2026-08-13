// ★인스타 카드뉴스 압축(2026-08-11 유저: "네이버만 올리는 게 아깝다 — 한 글감을 인스타용으로도").
//
//  구조: 완성된(팩트 크로스체크 통과한) 블로그 글을 카드뉴스 문구로 압축한다 — 새 사실 생성 금지, 압축만.
//  그래서 인스타 버전도 본문과 같은 신뢰도를 갖는다. 이미지는 유저가 직접 구한다(문구만 만든다).
//  ★표지는 홈판 썸네일 문법(유저 지시: "결핍을 긁거나 돈으로 유혹") — 검색이 아니라 피드 판이라 대중 훅이 무기다.
//  ★장수는 6~10 가변(유저 '제한 없이' 요청에 상한을 되돌려 제안·승인 — 인스타 캐러셀 기술 상한 10장, 완독은 6~8장).

import Anthropic from "@anthropic-ai/sdk";
import { logUsage } from "./usageLog";

export interface InstaCard { head: string; body: string }
export interface ClipSegment { say: string; motion: string }
// ★hook도 컷이다 + 캐릭터·배경 묘사를 프롬프트에 통째로 굽는다(2026-08-11 유저: "캐릭터까지 묘사, 프롬프트에 아예 녹여내자" —
//  'reference image' 문구는 이미지 없는 모드에서 오류·혼란을 만든다. 글로 고정하면 어느 모드든 돌고 컷 간 일관성도 글이 보장).
export interface ClipPart { say: string; scene: string }
export interface ClipScript { hook: ClipSegment; segments: ClipSegment[]; character: string; background: string; styleAnchor: string; cta: string; oneTake: string; parts: ClipPart[]; basePrompt: string; videoPrompt: string; topHook: string; clipCaption: string }
export interface InstaPack { cover: string; cards: InstaCard[]; cta: InstaCard; caption: string; clip?: ClipScript }

export async function articleToInstaCards(title: string, bodyHtml: string, keyword: string, userId?: string | null): Promise<InstaPack | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const text = String(bodyHtml || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);
  if (text.length < 300) return null;
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 3200, // ★1900→3200(2026-08-11 실측: 컷별 모션 프롬프트 추가 후 실본문에서 JSON이 상한에 잘려 복불복 실패 — 로컬 짧은 본문만 성공)
    messages: [{
      role: "user",
      content: [
        `아래 블로그 글(제목: "${title}", 키워드: "${keyword}")을 인스타그램 카드뉴스 문구로 압축해라. 경제·재테크 계정이다.`,
        "★절대 규칙: 글에 있는 사실만 쓴다 — 새 숫자·새 주장 금지(이 글은 팩트체크를 통과했고, 카드는 압축본이다).",
        "",
        "[표지 cover] 홈피드 훅 문법 — 결핍을 긁거나 돈으로 유혹. ★핵심 고유명사·키워드 필수(2026-08-11 유저: 'SK하이닉스 얘긴데 실명이 빠지면 안 되죠' — 표지도 동일): 기업·브랜드·제도 실명 + 숫자 앵커를 반드시 넣는다. 최대 2줄(\\n), 줄당 12자 내. 제목 문장 통째 반복 금지 — 표지는 궁금증, 카드가 답. 예: 'SK하이닉스 10억\\n1분 퇴근에 증발'.",
        "[카드 cards] 4~8장. 각 장 = head(한 줄 12자 내) + body(2~3줄, 줄당 18자 내, \\n 구분). 표지의 궁금증을 순서대로 푼다: 무슨 일이 → 왜 → 핵심 숫자·조건 → 함정 → 지금 할 것. 앞 장 끝이 다음 장을 궁금하게(넘기게 만드는 흐름).",
        "[마지막 장 cta] head=행동 한 줄, body=오늘 할 첫걸음 + '자세한 계산·최신 기준은 프로필 링크에'.",
        "[caption] 인스타 캡션: 훅 1줄 + 핵심 요약 2~3줄 + 해시태그 12~15개(#재테크 #경제 같은 대중 태그 + 소재 태그. 한 줄에 몰아서).",
        "[클립 clip] 네이버 클립용 — 캐릭터가 '키워드 그 자체'가 되어 가르치듯 말한다(2026-08-11 유저 확정 규격·예시):",
        "  hook = 의인화 오프닝 컷 {say, motion}: say는 '나 {키워드 핵심}인데! {가장 충격적인 돈 팩트 한 문장}! 지금부터 빠르게 알려줄게! 잘 들어!' 결(유저 실례: '나 레버리지인데! 주식 1억 있어도 현금 3천만원 없으면 이제 못 산대!'), motion은 시선을 확 잡는 등장 동작(예: 'The character bursts into frame pointing at the camera with wide excited eyes, quick zoom-in').",
        "  segments = 4~5개(★6개 미만 엄수). 각 세그 say = 10초 분량(2~3문장, 60~90자). ★대사 규칙(2026-08-11 유저 2·3차: '알기 쉽게 재밌게 + 말투 통일'):",
        "   ⓪★화자 고정(최우선, 2026-08-11 유저: '당사자가 이야기하듯 — 지금 레버리지가 이야기하는 거야'): 처음부터 끝까지 화자는 키워드 당사자 본인이다. 3인칭 해설('레버리지는 ~입니다') 절대 금지 — 모든 문장이 자기 이야기다('나는', '나를 사려면', '나한테 걸리면'). 말투는 전부 친근한 반말",
        "   ⓪-2★청자 확정(2026-08-11 유저: '확률을 봐야 해 — 그 회사 다니는 사람보다 일반인이 호기심에 누른다'): 시청자는 그 회사·집단과 무관한 구경꾼 일반인이다. 내부자에게 말 걸지 마라('당신도 복무 규정 읽어봐' ❌ — 전국에 몇천 명한테만 유효). 톤은 '엄마들이 선생님 뒷담화하듯' — 남의 사건을 신나게 옮기는 수다('글쎄, 그 직원이 어쨌는 줄 알아?', '어머 근데 여기서 반전이야'). 호기심을 아껴서 쓴다 — 제일 자극적인 디테일은 살짝 보여주고 끊어라. CTA도 일반인 각도('니네 회사 규정도 비슷할걸? 아래에 정리해뒀어', '판결 내용 진짜 재밌는데 자세한 건 아래에') — 특정 집단 행동 지시 금지('~야/~해/~된다고/~봐/~지?')이다. 존댓말('~요/~습니다') 절대 금지 — 컷마다 말투가 바뀌면 캐릭터가 다른 사람처럼 들린다.",
        "   ①훅의 캐릭터를 끝까지 유지 — 컷 2부터 선생님 말투로 돌아가지 마라. 캐릭터=키워드 자신이니 계속 '나'로 말한다('나를 사려면 현금 3천만이 필요해', '나 이제 아무나 못 만나').",
        "   ②★초등학생도 한 번에 알아듣는 말만(2026-08-11 유저 상향: '초딩이 들어도 알아들을 법하게') — 법·금융 용어는 전부 생활어로 번역한다: '성과급 청구권 소멸'→'받기로 한 돈이 사라져', '해고 처분'→'잘렸어', '청구했다'→'돈 달라고 소송 걸었다', '기각'→'법원이 안 된대', '대용증권 인정 제외'→'주식으로 대신 내는 건 안 쳐줘'. 번역이 안 되는 용어는 아예 빼라. 한 문장에 어려운 말이 하나라도 남았으면 그 문장을 다시 써라.",
        "   ③한 컷에 개념 하나 + 콕 박히는 숫자 하나만 — 정보를 쑤셔 넣지 마라. 어려운 세부는 '자세한 건 블로그에'로 미룬다.",
        "   ④재미 장치를 컷마다 1개: 충격 대비('1억 있어도 나 못 사'), 실감 숫자('나 하루 거래 12조였는데 3조로 쪼그라들었어'), 가벼운 되물음('빡세지?', '억울하지?').",
        "   ⑤마지막 세그 = 행동 지시('지금 계좌에 진짜 현금 얼마 있는지 봐 봐' + '자세한 계산은 블로그에 정리해 뒀어').",
        "  character = ★주제를 의인화한 캐릭터의 영어 외형 묘사 2문장(2026-08-11 유저: '캐릭터까지 묘사해서 프롬프트에 녹여내자'): 종·형태·색·복장·표정 스타일을 구체적으로 — 이 묘사만 읽고 누가 그려도 같은 캐릭터가 나오게. ★캐릭터 소재 우선순위(2026-08-12 유저 확정): ①브랜드·기업 이야기면 그 브랜드 로고가 몸이다 — 'based on the {브랜드} logo, its iconic shape and colors as the glossy body, with the brand wordmark exactly as in the real logo' (예: 삼성=파란 타원 로고 몸통+흰 SAMSUNG 워드마크) ②정부·공공기관 이야기면 그 기관 로고·엠블럼 몸통 ③로고가 없을 때만 주제 사물 의인화(반도체 부품주=회로 칩, 청약=집, 대출=지갑, 성과급=월급봉투). generic 동전 몸통+남색 블레이저 수렴 금지 — 소재가 다르면 몸이 반드시 달라야 한다. ★로고 캐릭터일 땐 로고 자체의 워드마크만 글자로 허용, 그 외 글자 금지. ★타겟 40~60대 문법(2026-08-11 유저 확정): 둥글둥글 단순한 국민 캐릭터 감성(카카오프렌즈 결)이되 ★반드시 3D 렌더 피규어 질감(2026-08-12 유저: '2D로 나오는데 입체감 있어야 해') — 'cute 3D rendered mascot, soft rounded volume like a vinyl toy figure, glossy eyes, Pixar-style render' 문구 필수, 'flat/2D illustration' 계열 단어 금지. 원색 고대비·디테일 최소, 표정은 크고 과장되게(멀리서도 읽히게), 복장에 주제와 어울리는 소품 딱 1개(공장·부품 소재=안전조끼, 은행·금융 소재=넥타이나 동그란 안경, 부동산=공인중개사 느낌 명찰 없는 조끼 — 편마다 달라지게). 금지: Z세대 밈·네온 코드, 로봇·외계인(이질감), 사기꾼풍 과장. 몸이나 배경에 글자·숫자 금지. 예(레버리지): 'A cute 3D rendered mascot, a round bouncy green coin with soft rounded volume like a vinyl toy figure, two bold red upward-arrow horns on its head, tiny navy suit vest, big glossy expressive eyes and a confident grin, Pixar-style render.'",
        "  background = 모든 컷 공통 배경 영어 1문장(주제 분위기, 글자 없는 요소만). 예: 'A clean pastel trading-floor studio with soft glowing chart shapes on the back wall.'",
        "  각 세그 motion = 그 컷의 동작·표정·카메라만 영어 1~2문장(캐릭터·배경·스타일 묘사 금지 — 코드가 구워서 합친다). 예: 'The character leans in and points at the viewer with a warning face, subtle push-in.'",
        "  styleAnchor = 스타일 한 줄(영어): 'Consistent Pixar-style 3D render, soft studio lighting, glossy toy-figure texture, subtle smooth motion.' 결 — ★2D/flat 금지(입체감 필수) — ★'reference image' 같은 말 금지(이미지 없는 모드에서 오류를 만든다).",
        "  cta = 마무리 대사(반말): '화면 오른쪽 위 블로그 누르면 다 나와!' 결. ★클립 전용 확정(2026-08-12 유저 실측: 네이버 클립의 링크는 화면 오른쪽 맨 위 '블로그' 버튼 — '아래를 확인해'는 잘못된 길안내라 폐기, 플랫폼 중립 규칙은 이날 뒤집힘). 대사 전부 글에 있는 사실만.",
        "  topHook = ★영상 상단 고정 후킹 문구(2026-08-11 유저: '3초 법칙 자극 + 키워드 무조건 삽입 — SK하이닉스 얘긴데 실명이 빠지면 안 되죠'): 1~2줄(\\n), 줄당 12자 내. ★핵심 고유명사·키워드 필수(브랜드·기업·제도 실명) + 숫자 앵커 + 충격 대비. 예: 'SK하이닉스 성과급 10억\\n1분 퇴근에 날아갔다'. 밋밋한 설명형('~하는 이유') 금지 — 스크롤 멈추는 자극형만.",
        "★마지막 관문(2026-08-11 유저 확정 — 출력 직전 4개 자가 검문, 하나라도 미달이면 고쳐서 출력):",
        "  ①알기 쉬운가 — ★초등학생이 한 번 듣고 이해되나? 법·금융 용어가 하나라도 남았으면 생활어로 번역하거나 삭제.",
        "  ②팩트인가 — 대사의 모든 숫자·날짜·사실이 본문에 실재하나? 본문에 없으면 그 문장을 삭제(새 사실 창작 절대 금지).",
        "  ③재밌는가 — 무관한 구경꾼이 낄낄대며 끝까지 볼 수다인가? 정보 나열로 읽히면 뒷담화 리듬('글쎄', '어머', '~지?')을 다시 입혀라. ★그리고 무심코 스크롤하던 사람이 첫 문장에서 멈출까? 첫 문장이 약하면 전체를 다시 써라.",
        "  ④댓글을 부르나 — 3편 마무리에 시청자가 한 줄로 답할 질문 1개 필수. 자기 상황을 말하게 하거나('여러분 회사 성과급 규정은 어때?') 편을 가르게 하라('이 해고, 심하다 vs 당연하다?'). '어떠셨나요' 같은 인사치레 금지.",
        "  oneTake = ★15초 티저 광고 대본(2026-08-12 유저 확정: '15초짜리 광고라고 생각하고 짜야 해 — 너무 궁금해서 글로 읽어봐야 할 것 같게'): ★175~205자(초당 12.5자 × 약 14~16초). ★이건 요약이 아니라 광고다 — 목적은 정보 전달이 아니라 블로그 클릭이다. 구조: ①의인화 훅 — 반드시 '나 {키워드 핵심}인데!'로 시작(유저 실례: '나 삼성전자 투자 공시인데!') + 가장 충격적인 돈 팩트 1개 ②사건 초간단 정리 — 초등학생도 아는 쉬운 팩트 2~3개만, 어려운 세부·조건·숫자 계산은 전부 블로그로 미룬다 ③★열린 고리(핵심 심리 장치): 제일 궁금한 대목을 던지고 절대 풀지 마라 — 이유·결말·반전의 답을 대본에서 말하는 순간 클릭할 이유가 사라진다('근데 왜 그랬는지가 진짜 소름인데…', '이게 끝이 아니야. 진짜 반전은…') ④CTA: 열린 고리와 길안내를 한 문장으로 — '어디를 언제 사야 하는지는… 화면 오른쪽 위 블로그 누르면 다 나와!' 결(★'아래' 안내 금지 — 클립 링크는 화면 오른쪽 위 블로그 버튼이다). ★훅 정합(2026-08-13 유저: '영상 보고 들어왔을 때 이탈하지 않게'): 첫 문장은 상단 고정 문구(topHook)가 건 약속을 즉시 이어받아라 — 들어온 사람이 3초 안에 '맞게 들어왔네'를 느껴야 한다, 훅과 다른 얘기로 시작하면 바로 나간다. ★비틀기(빠져들게): 문장마다 예상을 하나씩 배신해라 — '다들 A라고 보지? 틀렸어', 상식 뒤집기·엉뚱한 수혜자·의외의 숫자. 뻔한 다음 문장이 이탈 버튼이다. ★손해 FOMO(CTA 직전 필수, 유저: '자세히 안 보면 손해날 것 같은 어그로'): 안 보면 손해라는 감각 한 문장 — '모르고 지나가면… 남들 버는 거 구경만 하다 끝나', '이거 모르고 있다가 당하는 사람이 제일 많아' 결. 단 글에 있는 사실 기반 — 없는 손해 지어내기 금지. ★정보량 상한(2026-08-12 유저 실측: 문장 11개짜리는 '15초 동안 소화가 안 되고 잘 안 들린다'): 문장 7개 이하, 숫자 2개까지 — 팩트가 4개 넘으면 아무것도 안 들린다. ★공시·펀드 용어(조합·수시납입·집행·출자·수혜 같은 것)는 번역도 말고 아예 빼라 — 그 설명이 곧 글의 몫이다. ★매수 타이밍·결론('~할 때 사야 돈 본다')도 답이다 — 말하는 순간 클릭 이유가 사라진다. 강약: 3~7자 초단문 2개 이상 + '…' 뜸 1개 이상 + 물음표 1개. ★긴급 속보 문체(2026-08-14 유저: '나근나근 금지 — 속보 전하듯'): 특종 물어온 사람처럼 느낌표 있는 문장을 절반 이상, 설명조('~입니다/~어요') 금지. 반말·뒷담화 톤 유지.",
        "  acting = ★영상 생성용 연기 지시(2026-08-12 유저: '내용을 행동으로 표현 — 텍스트는 한글이 깨져서 절대 금지' / 2026-08-14 유저: '대본과 어울리게'): 영어 3~4문장. ★대본 문장 순서와 1:1로 — 각 문장이 말하는 내용을 그대로 몸으로(쌓는 얘기면 손을 겹겹이, 쪼개지는 얘기면 손을 오므리기). 대사에 없는 소품 팬터마임(계산기 두드리기 등) 금지: 예 'Gasps and covers mouth in shock → leans in close whispering like sharing gossip → counts rapidly on fingers with widening eyes → freezes, shrugs dramatically, then points to the upper-right corner of the screen (viewer's perspective) with a sly grin.' ★마지막 손짓은 반드시 화면 기준 오른쪽 위(2026-08-12 유저: 클립 블로그 버튼 위치 — 아래 지목 금지). 글자·숫자가 보일 소품(문서·차트 눈금·시계 숫자판) 금지 — 행동과 표정만.",
        "  clipCaption = ★클립 설명란 링크 문구 1줄(2026-08-12 유저: '주소만 떡 쓰면 스팸 같고 클릭이 안 나온다'): 대본이 참은 답을 예고 + 클릭 비용 낮추는 말, 같은 화자 반말 톤. 공식: '{영상이 안 푼 답 예고}, {3분 정리·표로 정리}해뒀어 👇' (예: '어떤 부품 회사들인지, 언제 사야 하는지… 여기 다 정리해뒀어 👇'). 공손 광고체(확인하세요·방문 부탁) 금지 — 그게 스팸 신호다. 링크는 유저가 뒤에 붙인다.",
        "",
        '출력 JSON만: {"cover":"...","cards":[{"head":"...","body":"..."}],"cta":{"head":"...","body":"..."},"caption":"...","clip":{"hook":{"say":"...","motion":"..."},"character":"...","background":"...","styleAnchor":"...","segments":[{"say":"...","motion":"..."}],"cta":"...","oneTake":"...","acting":"영어 연기 지시 3~4문장","clipCaption":"링크 위 한 줄(반말+👇)","topHook":"실명+숫자 후킹\\n두 줄까지"}}',
        "", "[본문]", text,
      ].join("\n"),
    }],
  });
  void logUsage({ userId, model: "claude-haiku-4-5", kind: "insta_cards", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });

  // ★20초 분량 코드 검증(2026-08-11 유저: "20초 대본인데 왜 9초? 두 번 체크해") — 프롬프트는 방향, 코드는 자로 잰다.
  //  175~210자 밖이면 본문을 근거로 딱 맞게 한 번 재작성(새 사실 금지). 그래도 안 맞으면 그대로 두되 화면 초 표시가 알린다.
  //  (2026-08-12 유저 2차 확정: '15초짜리 광고' — 초당 12.5자 × 14~16초. 요약이 아니라 티저)
  // ★어려운 단어 코드 감지(2026-08-11 유저: '초딩이 들어도 알아듣게' — 프롬프트만으론 모델이 용어를 남긴다)
  const HARD_TERM_RE = /(청구권|처분|기각|소멸|재직|구성원|호황|슈퍼사이클|대용증권|이수번호|산정|귀속|경과조치|법인차량|수시납입|집행|출자|조합|수혜|중복상장|재원|희석|신주|용처|재공시)/g;
  // ★CTA 위치 보정(2026-08-12 유저 실측: 클립 링크는 화면 오른쪽 위 '블로그' 버튼 — '아래' 안내는 오배송) — 마지막 문장은 코드가 보장
  const fixCta = (t: string) => {
    if (t.includes("오른쪽 위")) return t;
    const re = /(자세한 내용은\s*)?아래(를|에서)?\s*확인해(\s*봐)?\s*!?/;
    if (re.test(t)) return t.replace(re, "화면 오른쪽 위 블로그 누르면 다 나와!");
    return `${t.replace(/\s+$/, "")} 궁금하면 화면 오른쪽 위 블로그 눌러 봐!`;
  };
  // ★확정 치환 최후 방어선(2026-08-12 실측: 재작성 2회를 돌려도 haiku가 '재직·호황'을 남긴다 — 아는 단어는 코드가 직접 갈아끼운다)
  const EASY_MAP: [RegExp, string][] = [
    [/재직 중일 때만/g, "회사 다닐 때만"], [/재직 중인/g, "회사 다니는"], [/재직/g, "회사 다니는 중"],
    [/호황/g, "돈 엄청 버는 때"], [/슈퍼사이클/g, "초대박 시기"], [/해고 처분/g, "해고"],
    [/기각(됐|되었)/g, "퇴짜 맞았"], [/청구권/g, "받을 권리"], [/소멸(돼|되)/g, "사라지"],
  ];
  const easyWords = (t: string) => EASY_MAP.reduce((acc, [re, to]) => acc.replace(re, to), t);
  // ★재작성 후 재검증 루프(2026-08-12 실측: 1회 재작성이 186자·용어 잔존인 채 통과 — 고친 결과를 다시 재봐야 게이트다)
  async function fitOneTake(current: string): Promise<string> {
    let best = current;
    for (let attempt = 0; attempt < 2; attempt++) {
      const len = [...best].length;
      const hardTerms = Array.from(new Set(best.match(HARD_TERM_RE) ?? []));
      const sents = best.split(/[.!?…]+/).filter((x) => x.trim()).length;
    if (len >= 175 && len <= 210 && hardTerms.length === 0 && sents <= 8) return best; // 15초 광고 + 문장 7~8개 상한(정보 과적재 방지)
      const next = await rewriteOneTake(best, len, hardTerms);
      if (next === best) return best; // 재작성 실패·개선 없음 — 더 돌려도 같다
      best = next;
    }
    return best;
  }
  async function rewriteOneTake(current: string, len: number, hardTerms: string[]): Promise<string> {
    try {
      const fix = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 600,
        messages: [{ role: "user", content: [
          `아래 클립 대사를 정확히 180~200자(공백 포함)로 ${len < 175 ? "쉬운 팩트를 더 넣어 늘려" : len > 210 ? "줄여" : "같은 길이로"} 다시 써라. 지금은 ${len}자다. 문장은 반드시 완결로 끝나야 한다.${hardTerms.length ? ` ★다음 단어는 초등학생 생활어로 바꿔라(예: 청구권→받을 돈, 처분→잘렸어, 기각→법원이 안 된대, 재직→회사 다니는, 호황→돈 엄청 버는 때): ${hardTerms.join(", ")}` : ""}`,
          "규칙: 화자·반말·문체·구조(의인화 훅 '나 {키워드}인데!'→쉬운 사건 정리→열린 고리→'화면 오른쪽 위 블로그 누르면 다 나와!') 유지. ★이건 광고다 — 이유·결말·반전의 답을 새로 밝히지 마라(궁금증이 클릭 연료다). ★문장 7개 이하·숫자 2개까지 — 정보를 덜어내라. 공시·펀드 용어는 아예 빼라. ★문장마다 예상 비틀기('다들 A라 보지? 틀렸어') + CTA 직전 손해 FOMO 한 문장(글에 있는 사실 기반). ★강약 리듬 유지 — 3~7자 초단문 3개 이상, 반전 직전 '…' 뜸, 물음표 1개(같은 길이 문장 3연속 금지). 새 사실 금지 — 대사와 [본문]에 있는 것만. 대사 본문만 출력(따옴표·설명 없이).",
          "", "[현재 대사]", current, "", "[본문]", text.slice(0, 3000),
        ].join("\n") }],
      });
      void logUsage({ userId, model: "claude-haiku-4-5", kind: "insta_cards_fit", inputTokens: fix.usage?.input_tokens, outputTokens: fix.usage?.output_tokens });
      const ft = fix.content.find((b) => b.type === "text");
      const fixed = (ft && ft.type === "text" ? ft.text : "").trim().replace(/^["'\s]+|["'\s]+$/g, "");
      const flen = [...fixed].length;
      // 넓은 수용 창 — 최종 판정은 fitOneTake 루프가 다시 잰다(여기서 좁히면 개선분도 버린다)
      return flen >= 160 && flen <= 230 ? fixed : current;
    } catch { return current; }
  }
  const t = res.content.find((b) => b.type === "text");
  const m = /\{[\s\S]*\}/.exec(t && t.type === "text" ? t.text : "");
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as Partial<InstaPack>;
    const cards = (Array.isArray(j.cards) ? j.cards : [])
      .map((c) => ({ head: String(c?.head ?? "").trim().slice(0, 40), body: String(c?.body ?? "").trim().slice(0, 200) }))
      .filter((c) => c.head && c.body)
      .slice(0, 8); // 표지+내용 8+CTA = 최대 10장(인스타 캐러셀 상한)
    if (!j.cover || cards.length < 3) return null;
    const clipRaw = j.clip as { hook?: { say?: string; motion?: string } | string; character?: string; background?: string; styleAnchor?: string; segments?: { say?: string; motion?: string }[]; cta?: string } | undefined;
    // ★플랫폼 중립 강제(2026-08-11 유저 2차: "아직도 블로그라는데") — 프롬프트는 방향, 코드는 한계선. 대사의 '블로그'를 '아래'로 치환.
    const noBlog = (t: string) => t.replace(/블로그\s?링크/g, "아래").replace(/블로그/g, "아래");
    const character = String(clipRaw?.character ?? "").trim().slice(0, 320);
    const backgroundDesc = String(clipRaw?.background ?? "").trim().slice(0, 200);
    const anchor = String(clipRaw?.styleAnchor ?? "Consistent Pixar-style 3D render, soft studio lighting, glossy toy-figure texture, subtle smooth motion.").trim().replace(/2D cartoon/gi, "Pixar-style 3D render").slice(0, 160);
    // ★캐릭터·배경·스타일을 각 컷에 통째로 굽는다(유저: "프롬프트에 아예 녹여내자") — 복사 한 번 = 완성 프롬프트, 레퍼런스 이미지 의존 없음.
    // ★basePrompt를 한 곳에서 만든다(같은 값 두 곳 = 드리프트, CLAUDE.md) — 컷 프롬프트와 편별 통합 프롬프트가 같은 접두를 쓴다
    const basePrompt = `${character} ${backgroundDesc} ${anchor} Vertical 9:16 portrait video, the character centered with head and upper body filling the frame. The exact same character and background in every shot. Absolutely NO captions, subtitles or overlay text anywhere in the frame — especially no Korean Hangul, which always renders as broken glyphs. The only lettering allowed is the brand wordmark that is part of the character's own logo body. The character talks with natural mouth movement only.`.replace(/\s+/g, " ").trim();
    const bake = (m: string) => `${basePrompt} ${m}`.replace(/\s+/g, " ").trim().slice(0, 960);
    const segments = (Array.isArray(clipRaw?.segments) ? clipRaw!.segments : [])
      .map((g) => ({ say: String(g?.say ?? "").trim().slice(0, 160), motion: bake(String(g?.motion ?? "").trim().slice(0, 220)) }))
      .filter((g) => g.say)
      .slice(0, 5); // ★6개 미만(유저 확정)
    const hookRaw = clipRaw?.hook;
    const hook: { say: string; motion: string } = typeof hookRaw === "object" && hookRaw
      ? { say: noBlog(String(hookRaw.say ?? "").trim()).slice(0, 160), motion: bake(String(hookRaw.motion ?? "The character bursts into frame pointing at the camera with an excited face, quick zoom-in.").trim().slice(0, 220)) }
      : { say: noBlog(String(hookRaw ?? "").trim()).slice(0, 160), motion: bake("The character bursts into frame pointing at the camera with an excited face, quick zoom-in.") };
    const pack = {
      cover: String(j.cover).trim().slice(0, 60),
      cards,
      cta: { head: String(j.cta?.head ?? "지금 확인").trim().slice(0, 40), body: String(j.cta?.body ?? "자세한 내용은 프로필 링크에").trim().slice(0, 200) },
      caption: String(j.caption ?? "").trim().slice(0, 1200),
      clip: segments.length >= 3 && hook.say ? { hook, segments, character, background: backgroundDesc, styleAnchor: anchor, basePrompt,
        // ★영상 프롬프트(2026-08-12 유저 실측 2건 수리: 힉스필드가 못 알아들음 — ①1300자 기계 절단이 단어 중간에서 끊김 ②이미지를 넣는 모드라 캐릭터·배경 묘사가 중복·과다).
        //  이미지가 캐릭터를 들고 오므로 프롬프트는 '입력 이미지 그대로'+연기+무텍스트만. →화살표는 then으로, 절단은 단어 경계에서만.
        videoPrompt: (() => {
          const acting = String((clipRaw as { acting?: string } | undefined)?.acting ?? "").trim().replace(/\s*→\s*/g, ", then ").replace(/points?\s+(downward|down|below)/gi, "points to the upper-right corner of the screen");
          const cut = (t: string, n: number) => ([...t].length <= n ? t : `${t.slice(0, n).replace(/\s+\S*$/, "")}.`);
          return `The character from the input image, unchanged in design and outfit. ${cut(acting, 600)} The character speaks in an urgent, fast-paced breaking-news tone — excited and punchy, never calm or soothing. Vertical 9:16, head and upper body filling the frame, smooth cartoon motion. Absolutely no captions, subtitles or overlay text anywhere in the frame — especially no Korean Hangul. Lettering that is part of the character's own logo body is fine. The character only talks with natural mouth movement.`.replace(/\s+/g, " ").trim();
        })(),
        topHook: (String((clipRaw as { topHook?: string } | undefined)?.topHook ?? "").trim() || String(j.cover ?? "").trim()).slice(0, 60),
        clipCaption: noBlog(String((clipRaw as { clipCaption?: string } | undefined)?.clipCaption ?? "").trim()).slice(0, 120), // ★빈 값 폴백(2026-08-12 실측: 모델이 topHook을 빼먹음) — 표지가 같은 실명+숫자 문법이라 대체 가능
        oneTake: noBlog(String(clipRaw && "oneTake" in clipRaw ? (clipRaw as { oneTake?: string }).oneTake ?? "" : "").trim()).slice(0, 310), // ★130 잔재 제거(실물: 대사가 '왜냐면 나는 '에서 잘림)
        parts: (Array.isArray((clipRaw as { parts?: unknown[] } | undefined)?.parts) ? (clipRaw as { parts: unknown[] }).parts : [])
          .map((x) => typeof x === "object" && x
            ? { say: noBlog(String((x as { say?: string }).say ?? "").trim()).slice(0, 260), scene: String((x as { scene?: string }).scene ?? "").trim().slice(0, 240) }
            : { say: noBlog(String(x ?? "").trim()).slice(0, 260), scene: "" })
          .filter((x) => x.say).slice(0, 3), cta: String(clipRaw?.cta ?? "화면 오른쪽 위 블로그 누르면 다 나와!").trim().slice(0, 160) } : undefined,
    };
    if (pack.clip?.oneTake) pack.clip.oneTake = fixCta(easyWords(await fitOneTake(pack.clip.oneTake))).replace(/([!?\u2026])[.,]+/g, "$1").slice(0, 330); // noBlog 폐기(클립 CTA에 블로그 단어가 필요해짐) + 깨진 부호 청소
    return pack;
  } catch { return null; }
}
