import { useEffect, useState } from 'react';
import { SKILLS } from '../game/skills.js';
import { normalizePvpSkillIds } from '../pvp/pvpSkillSelection.js';
import { canStartPvpRoom, isPvpLoadoutSaved } from '../pvp/pvpLobbyState.js';
import PvpSkillPicker from './PvpSkillPicker.jsx';

function skillNames(skillIds) {
  if (!Array.isArray(skillIds) || skillIds.length !== 3) return '아직 스킬을 선택하지 않았습니다.';
  return skillIds.map((skillId) => SKILLS[skillId]?.name ?? skillId).join(' · ');
}

function readyLabel(ready) {
  return ready ? '준비 완료' : '준비 중';
}

export default function PvpLobbyScreen({
  room,
  loading,
  errorMessage,
  displayName,
  onCreateRoom,
  onJoinRoom,
  onSaveLoadout,
  onSetReady,
  onStart,
  onCancel,
  onBack,
}) {
  const [inviteCode, setInviteCode] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState([]);
  const [copyMessage, setCopyMessage] = useState('');
  const isHost = Boolean(room?.isHost);
  const ownReady = isHost ? room?.hostReady : room?.guestReady;
  const ownSkills = isHost ? room?.hostSkillIds : room?.guestSkillIds;
  const loadoutSaved = isPvpLoadoutSaved(selectedSkillIds, normalizePvpSkillIds(ownSkills));
  const canConfigure = Boolean(room && ['waiting', 'ready'].includes(room.status) && !ownReady);

  useEffect(() => {
    setSelectedSkillIds(normalizePvpSkillIds(room
      ? (room.isHost ? room.hostSkillIds : room.guestSkillIds)
      : []));
  }, [room?.code, room?.isHost]);

  const submitJoin = (event) => {
    event.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 6) return;
    onJoinRoom?.(code, displayName);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopyMessage('초대 코드를 복사했습니다.');
    } catch {
      setCopyMessage('초대 코드를 직접 복사해 주세요.');
    }
  };

  return (
    <section className="screen-panel pvp-lobby-panel" aria-labelledby="pvp-lobby-title">
      <button className="back-button" type="button" onClick={onBack}>← 시작 화면</button>
      <div className="panel-heading pvp-lobby-heading">
        <p className="eyebrow">COMPANY 1 VS 1</p>
        <h1 id="pvp-lobby-title">회사 사용자 대전</h1>
        <p className="intro">초대 코드를 공유해 동료와 대전하고, 각자 사용할 스킬을 골라 주세요.</p>
      </div>

      {!room ? (
        <div className="pvp-entry-grid">
          <article className="pvp-entry-card">
            <span className="pvp-entry-number">01 / CREATE</span>
            <h2>초대방 만들기</h2>
            <p>방을 만들면 초대 코드가 발급됩니다.</p>
            <button className="primary-button" type="button" disabled={loading} onClick={() => onCreateRoom?.(displayName)}>
              {loading ? '방 만드는 중…' : '새 방 만들기'} <span aria-hidden="true">↗</span>
            </button>
          </article>
          <form className="pvp-entry-card pvp-join-form" onSubmit={submitJoin}>
            <span className="pvp-entry-number">02 / JOIN</span>
            <h2>초대 코드로 참가</h2>
            <p>동료에게 받은 6자리 코드를 입력하세요.</p>
            <label htmlFor="pvp-invite-code">초대 코드</label>
            <input
              id="pvp-invite-code"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.replace(/[^a-z\d]/giu, '').slice(0, 6).toUpperCase())}
              maxLength={6}
              autoComplete="off"
              placeholder="예: ABC234"
              aria-describedby="pvp-invite-help"
            />
            <small id="pvp-invite-help">숫자와 영문 대문자 6자리</small>
            <button className="secondary-button pvp-join-button" type="submit" disabled={loading || inviteCode.length !== 6}>
              {loading ? '참가 중…' : '방에 참가'} <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="pvp-room-layout">
          <div className="pvp-room-summary">
            <div className="pvp-invite-code-card">
              <div><span>INVITE CODE</span><strong>{room.code}</strong></div>
              <button className="secondary-button" type="button" onClick={copyCode}>코드 복사</button>
              {copyMessage && <small role="status">{copyMessage}</small>}
            </div>
            <div className="pvp-members">
              <article className={`pvp-member-card${room.isHost ? ' is-self' : ''}`}>
                <span className="pvp-member-role">HOME · HOST {room.isHost ? '· 나' : ''}</span>
                <strong>{room.hostDisplayName}</strong>
                <span className={`pvp-ready-state${room.hostReady ? ' is-ready' : ''}`}>{readyLabel(room.hostReady)}</span>
                <small>{skillNames(room.hostSkillIds)}</small>
              </article>
              <span className="pvp-versus" aria-hidden="true">VS</span>
              <article className={`pvp-member-card${!room.isHost ? ' is-self' : ''}`}>
                <span className="pvp-member-role">AWAY · GUEST {!room.isHost ? '· 나' : ''}</span>
                <strong>{room.guestDisplayName || '동료 기다리는 중'}</strong>
                {room.guestDisplayName
                  ? <span className={`pvp-ready-state${room.guestReady ? ' is-ready' : ''}`}>{readyLabel(room.guestReady)}</span>
                  : <span className="pvp-ready-state">초대 대기</span>}
                <small>{skillNames(room.guestSkillIds)}</small>
              </article>
            </div>
            <p className="pvp-room-status" role="status">
              {room.status === 'playing' ? '경기가 시작되었습니다.' : room.status === 'ready' ? '두 선수 모두 준비됐습니다.' : '상대가 참가하고 준비할 때까지 기다려 주세요.'}
            </p>
          </div>

          <div className="pvp-room-controls">
            <PvpSkillPicker selectedSkillIds={selectedSkillIds} onChange={setSelectedSkillIds} disabled={!canConfigure || loading} />
            <div className="pvp-room-actions">
              {canConfigure && <button className="secondary-button" type="button" disabled={loading || selectedSkillIds.length !== 3} onClick={() => onSaveLoadout?.(room.code, selectedSkillIds)}>
                {loading ? '저장 중…' : '선택한 스킬 저장'}
              </button>}
              {room && ['waiting', 'ready'].includes(room.status) && ownSkills?.length === 3 && <button className="primary-button" type="button" disabled={loading || (!ownReady && !loadoutSaved)} onClick={() => onSetReady?.(room.code, !ownReady)}>
                {ownReady ? '준비 취소' : '준비 완료'} <span aria-hidden="true">→</span>
              </button>}
              {isHost && <button className="primary-button pvp-start-button" type="button" disabled={loading || !canStartPvpRoom(room)} onClick={() => onStart?.(room.code)}>
                {loading ? '시작 중…' : '경기 시작'} <span aria-hidden="true">↗</span>
              </button>}
              {isHost && ['waiting', 'ready'].includes(room.status) && <button className="secondary-button pvp-cancel-button" type="button" disabled={loading} onClick={() => onCancel?.(room.code)}>방 취소</button>}
            </div>
          </div>
        </div>
      )}

      {errorMessage && <p className="pvp-error" role="alert">{errorMessage}</p>}
    </section>
  );
}
