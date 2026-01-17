"use client";

let audioEl: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let osc: OscillatorNode | null = null;
let gain: GainNode | null = null;

export function startRingtone() {
  // Try mp3 first
  try {
    if (!audioEl) {
      audioEl = new Audio("/sounds/ringtone.mp3");
      audioEl.loop = true;
      audioEl.volume = 0.65;
    }
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {
      // fallback below
      stopRingtone();
      startBeepFallback();
    });
    return;
  } catch {
    // fallback below
  }
  startBeepFallback();
}

function startBeepFallback() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!audioCtx) return;

    stopBeepFallback();

    osc = audioCtx.createOscillator();
    gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.0;

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();

    // ring pattern
    let on = false;
    const tick = () => {
      if (!osc || !gain) return;
      on = !on;
      gain.gain.setValueAtTime(on ? 0.08 : 0.0, audioCtx!.currentTime);
      setTimeout(tick, on ? 650 : 350);
    };
    tick();
  } catch {}
}

function stopBeepFallback() {
  try {
    if (osc) osc.stop();
  } catch {}
  try {
    osc?.disconnect();
    gain?.disconnect();
  } catch {}
  osc = null;
  gain = null;
}

export function stopRingtone() {
  try {
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
  } catch {}
  stopBeepFallback();
}
