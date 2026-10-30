import assert from 'node:assert/strict';
import test from 'node:test';
import { playGoalCelebrationAudio, prepareMatchAudio } from './matchAudio.js';
import { setGameAudioEnabled } from './audioSettings.js';

test('SIUU ceremony audio preloads, replays, respects mute, and fails safely', async () => {
  const previousWindow = globalThis.window;
  const calls = [];
  let rejectNextPlay = false;

  class AudioMock {
    constructor(src) {
      this.src = src;
      this.currentTime = 4;
      this.preload = '';
      this.muted = false;
      this.loads = 0;
      this.plays = 0;
    }
    load() { this.loads += 1; }
    pause() {}
    play() {
      this.plays += 1;
      calls.push({ src: this.src, currentTime: this.currentTime });
      if (rejectNextPlay) {
        rejectNextPlay = false;
        return Promise.reject(new Error('Autoplay blocked'));
      }
      return Promise.resolve();
    }
  }

  try {
    setGameAudioEnabled(true);
    globalThis.window = { Audio: AudioMock };
    prepareMatchAudio();

    assert.equal(await playGoalCelebrationAudio('siuuu'), true);
    assert.deepEqual(calls.at(-1), {
      src: '/audio/celebrations/siuuu.mp3',
      currentTime: 0,
    });

    assert.equal(await playGoalCelebrationAudio('takeTheL'), true);
    assert.deepEqual(calls.at(-1), {
      src: '/audio/celebrations/take-the-l.mp3',
      currentTime: 0,
    });
    assert.equal(await playGoalCelebrationAudio('slickback'), true);
    assert.deepEqual(calls.at(-1), {
      src: '/audio/celebrations/slickback-a-pimp-named-slickback.mp3',
      currentTime: 0,
    });
    assert.equal(await playGoalCelebrationAudio('rko'), true);
    assert.deepEqual(calls.at(-1), {
      src: '/audio/celebrations/rko.mp3',
      currentTime: 0,
    });
    assert.equal(await playGoalCelebrationAudio('siuuu'), true);
    assert.equal(calls.filter(({ src }) => src === '/audio/celebrations/siuuu.mp3').length, 2);
    assert.equal(await playGoalCelebrationAudio('moonwalk'), false);

    setGameAudioEnabled(false);
    assert.equal(await playGoalCelebrationAudio('siuuu'), false);
    setGameAudioEnabled(true);
    rejectNextPlay = true;
    assert.equal(await playGoalCelebrationAudio('siuuu'), false);

    globalThis.window = {};
    assert.equal(await playGoalCelebrationAudio('unavailable'), false);
  } finally {
    setGameAudioEnabled(true);
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
