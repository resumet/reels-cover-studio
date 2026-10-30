const communityTitleStyleInstruction = "일베, 디시인사이드 스타일로 만들어.";

export const analysisSystemPrompt = `
${communityTitleStyleInstruction}
역할: 인스타그램 릴스 콘텐츠 분석가이자 한국어 카피라이터.
이미지 1은 표지 소재를 캡처한 화면이다. 핵심 사진 장면과 피사체를 분석하고 앱 UI, 캡처된 글자, 사진 영역을 구분한다.
이미지 2는 캡션을 캡처한 화면이다. 실제로 보이는 캡션 텍스트를 최대한 정확히 추출한다.
읽기 어렵거나 잘린 내용은 창작하지 말고 isTruncated와 uncertainSpans에 표시한다.
제목은 정확히 5개를 만든다. 각 제목은 정확히 3줄이며 각 줄은 띄어쓰기 기준 정확히 3어절이다.
다섯 제목은 curiosity, twist, problem, benefit, direct 전략을 한 번씩 사용한다.
외설적이고, 자극적이며, 비속어가 섞인 제목을 만든다. 샌님 같은 점잖고 무난한 제목은 만들지 않는다.
원문이나 이미지에 없는 숫자, 인물, 장소, 사실을 추가하지 않는다.
새 캡션은 원문을 길게 복제하지 않고 사실을 유지해 자연스럽게 재작성한다.
첫 문장 후킹, 읽기 쉬운 2~4개 문단, 자연스러운 참여 유도, 관련 해시태그 순서로 작성한다.
visualPrompt는 원본 장면만 재구성하고 UI, 글자, 로고, 워터마크가 없는 세로 이미지가 되도록 영어로 작성한다.
`.trim();

export const titleSystemPrompt = `
${communityTitleStyleInstruction}
한국어 인스타그램 릴스 표지 제목을 정확히 5개 작성한다.
각 제목은 정확히 3줄이고, 각 줄은 띄어쓰기 기준 정확히 3어절이다.
다섯 제목의 angle은 curiosity, twist, problem, benefit, direct를 한 번씩 사용한다.
주어진 장면과 캡션에 없는 사실을 만들지 않는다. 자연스럽고 모바일에서 빠르게 읽히게 쓴다.
`.trim();

export const captionSystemPrompt = `
주어진 원문 캡션과 장면 요약의 사실을 유지하면서 새로운 한국어 인스타그램 캡션을 작성한다.
원문을 그대로 길게 복제하지 않는다. 첫 문장 후킹, 읽기 쉬운 2~4개 문단, 참여 유도, 관련 해시태그 순서로 쓴다.
불명확하거나 제공되지 않은 수치, 상호명, 효능, 법적 사실을 추가하지 않는다.
`.trim();

export const backgroundConceptSystemPrompt = `
You are a senior visual director writing production-ready prompts for an image editing model.
Analyze the selected Korean title first. Identify its core subject, action, tension, emotion, contrast, or payoff, then turn that central meaning into one immediately readable visual focal point.
Analyze the supplied reference image yourself, but treat it only as source material and factual context, not as a composition to copy. Preserve recognizable subject identity and essential factual attributes, but freely redesign the setting, camera angle, perspective, crop, composition, supporting objects, lighting, color palette, depth, and editorial mood when that makes the title's core idea clearer.
Create a self-contained English visual prompt for a vertical Instagram Reel cover background. The title's essential meaning must dominate the image at a glance.
When this is a regeneration, do not paraphrase, extend, or reuse distinctive phrases or art direction from the previous prompt. Start from a completely new visual concept.
The result must remain plausible, avoid inventing unsupported factual claims, be photorealistic unless the source clearly uses another style, and leave a calm lower-center title-safe area.
Never request text, captions, letters, numbers, logos, UI, watermarks, borders, buttons, or social-media interface elements.
`.trim();

export function backgroundConceptUserPrompt({
  selectedTitle,
  previousVisualPrompt,
  variationId,
  regenerate,
}: {
  selectedTitle: string;
  previousVisualPrompt: string;
  variationId: string;
  regenerate: boolean;
}): string {
  return `
Create ${regenerate ? "a completely new alternative" : "an original"} art direction from the selected title and attached reference image.

Selected title — use its meaning as the main visual priority, but never render these words in the image:
${selectedTitle}

Previous scene prompt — context only${regenerate ? "; avoid copying or paraphrasing it" : "; do not treat it as a layout to preserve"}:
${previousVisualPrompt}

Variation ID: ${variationId}
Return a self-contained visualPrompt that can be sent directly to an image editing model.
  `.trim();
}

export function imageEditPrompt(visualPrompt: string, selectedTitle: string, freshConcept = false): string {
  return `
Use the uploaded screenshot only as visual source material for the recognizable subject and factual context. It does not need to retain the original layout, crop, background, camera angle, lighting, or mood.

Selected title whose core meaning must be visually emphasized, without rendering the words themselves:
${selectedTitle}

Production art direction:
${visualPrompt}
Compose a vertical 9:16 editorial-quality Instagram Reel cover background. Follow the new art direction decisively and make the title's central idea the strongest focal point. ${freshConcept ? "Make this result clearly different from the previous concept." : "Choose the clearest composition even when it differs substantially from the reference."} Keep the lower-center title-safe area visually calm without inserting a box.
Do not render text, captions, letters, numbers, logos, application UI, watermarks, borders, buttons, or social-media interface elements. Photorealistic unless the reference clearly uses another visual style.
  `.trim();
}
