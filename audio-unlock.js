(() => {
  const NativeAudioContext = window.AudioContext || window.webkitAudioContext;
  const gate = document.getElementById('audioGate');
  const button = document.getElementById('enableSound');
  const status = document.getElementById('audioStatus');
  const isTouchDevice = matchMedia('(pointer: coarse)').matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (!NativeAudioContext) {
    if (gate) gate.remove();
    return;
  }

  let sharedContext = null;
  function getContext() {
    if (!sharedContext) sharedContext = new NativeAudioContext();
    return sharedContext;
  }

  // Make the game use the same AudioContext that we explicitly unlock here.
  function SharedAudioContext() { return getContext(); }
  SharedAudioContext.prototype = NativeAudioContext.prototype;
  try { Object.setPrototypeOf(SharedAudioContext, NativeAudioContext); } catch (_) {}
  window.AudioContext = SharedAudioContext;
  window.webkitAudioContext = SharedAudioContext;

  async function unlockAudio() {
    if (!button) return;
    button.disabled = true;
    button.textContent = 'STARTING SOUND…';
    if (status) status.textContent = 'Turning on game audio';

    try {
      const ctx = getContext();

      // Schedule a tiny audible confirmation and call resume during the same
      // direct tap/click. This is intentionally done before awaiting anything.
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 660;
      gain.gain.value = 0.035;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.stop(ctx.currentTime + 0.09);

      const resumePromise = ctx.state === 'running' ? Promise.resolve() : ctx.resume();
      await resumePromise;

      if (ctx.state === 'running') {
        if (status) status.textContent = 'Sound is on!';
        setTimeout(() => gate?.remove(), 180);
      } else {
        throw new Error('Audio context did not start');
      }
    } catch (err) {
      console.warn('Splashy Seas audio unlock failed:', err);
      button.disabled = false;
      button.textContent = 'TAP TO TRY SOUND AGAIN';
      if (status) status.textContent = 'Your browser blocked sound. Tap again.';
    }
  }

  button?.addEventListener('click', unlockAudio, { passive: true });

  // Desktop browsers already work reliably; only show the extra unlock screen
  // on touchscreen/mobile devices.
  if (!isTouchDevice) gate?.remove();
})();
