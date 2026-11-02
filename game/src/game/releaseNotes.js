const freezeSections = (sections) => Object.freeze(
  sections.map(({ title, items }) => Object.freeze({
    title,
    items: Object.freeze([...items]),
  })),
);

export const RELEASE_HISTORY = Object.freeze([
  Object.freeze({
    version: '1.0.0',
    date: '2026-11-02',
    sections: freezeSections([
      {
        title: '5단계 아케이드 캠페인',
        items: [
          '4대4 3D 축구로 다섯 단계의 라이벌과 맞붙고, 승리 보상으로 팀 스킬을 키워요.',
          '새 캠페인과 이어 하기로 진행 상황을 관리하고, 경기 기록을 확인할 수 있어요.',
        ],
      },
      {
        title: '우리 팀 스타일 꾸미기',
        items: [
          '팀 로고와 유니폼 색상을 고르고 경기에서 미리 볼 수 있어요.',
          '골 세리머니를 직접 고르거나 매 경기 무작위로 정할 수 있어요.',
        ],
      },
      {
        title: '골 세리머니와 연출',
        items: [
          'SIUUU, L을 가져가, 슬릭백, RKO 네 가지 세리머니를 추가했어요.',
          '세리머니별 음원과 가까운 3/4 카메라 연출로 동작을 더 잘 볼 수 있어요.',
          'RKO는 동료의 복부 가격 후 대상과 시전자가 함께 넘어지며, 시전자는 접촉 순간 하늘을 보고 대상 앞쪽에 착지해요.',
        ],
      },
      {
        title: '회사 사용자 대전',
        items: [
          '초대 방에서 실시간으로 맞붙고, 스킬 조합과 PvP 기록을 확인할 수 있어요.',
        ],
      },
      {
        title: '킥오프와 조작 개선',
        items: [
          '킥오프 전 선수들이 자기 진영에서 대기하고, S를 눌러 아군에게 패스하면 경기가 시작돼요.',
          '방향키로 킥오프 패스 방향을 정할 수 있어요.',
        ],
      },
    ]),
  }),
]);

export const CURRENT_RELEASE = RELEASE_HISTORY[0];
export const APP_VERSION = CURRENT_RELEASE.version;
export const APP_VERSION_LABEL = `v${APP_VERSION}`;

// Keep the original sections export for existing consumers.
export const RELEASE_NOTES = CURRENT_RELEASE.sections;
