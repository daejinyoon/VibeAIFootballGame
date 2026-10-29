import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { getPlayerEdgeIndicatorPlacement } from '../game/playerSelectionIndicator.js';

export function PlayerSelectionEdgeIndicator({ actorsRef, enabled = false, paused = false }) {
  const elementRef = useRef(null);
  const worldPositionRef = useRef(new Vector3());
  const projectedPositionRef = useRef(new Vector3());
  const cameraSpacePositionRef = useRef(new Vector3());

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;
    if (!enabled || paused) {
      element.hidden = true;
      return undefined;
    }

    let animationFrameId = 0;
    let mounted = true;
    const update = () => {
      if (!mounted) return;
      const actors = actorsRef?.current;
      const camera = actors?.camera;
      const selectedPlayerId = actors?.selectedPlayerId;
      const actor = selectedPlayerId ? actors?.players?.get(selectedPlayerId) : null;
      if (!camera || !actor || !actor.visible) {
        element.hidden = true;
      } else {
        const worldPosition = worldPositionRef.current;
        const projectedPosition = projectedPositionRef.current;
        actor.getWorldPosition(worldPosition);
        camera.updateMatrixWorld();
        projectedPosition.copy(worldPosition).project(camera);
        const cameraSpaceZ = cameraSpacePositionRef.current.copy(worldPosition)
          .applyMatrix4(camera.matrixWorldInverse).z;
        const placement = getPlayerEdgeIndicatorPlacement({
          ndcX: projectedPosition.x,
          ndcY: projectedPosition.y,
          ndcZ: projectedPosition.z,
          behindCamera: cameraSpaceZ > 0,
          width: element.parentElement?.clientWidth ?? 0,
          height: element.parentElement?.clientHeight ?? 0,
        });
        if (!placement) {
          element.hidden = true;
        } else {
          element.hidden = false;
          element.style.left = `${placement.left}px`;
          element.style.top = `${placement.top}px`;
          element.style.transform = `translate(-50%, -50%) rotate(${placement.rotationDeg}deg)`;
        }
      }
      animationFrameId = window.requestAnimationFrame(update);
    };

    animationFrameId = window.requestAnimationFrame(update);
    return () => {
      mounted = false;
      window.cancelAnimationFrame(animationFrameId);
      element.hidden = true;
    };
  }, [actorsRef, enabled, paused]);

  return (
    <div ref={elementRef} className="controlled-player-edge-indicator" aria-hidden="true" hidden>
      <svg viewBox="0 0 32 32" focusable="false">
        <path className="controlled-player-edge-indicator__outline" d="M16 2 30 27H2L16 2Z" />
        <path className="controlled-player-edge-indicator__fill" d="M16 6 26.5 24H5.5L16 6Z" />
        <path className="controlled-player-edge-indicator__accent" d="M16 22v-9m0 0-3.2 3.2M16 13l3.2 3.2" />
      </svg>
    </div>
  );
}
