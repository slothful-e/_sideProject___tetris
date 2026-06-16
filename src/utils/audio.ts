class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (!muted) {
      this.initContext();
    }
  }

  toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  getMuted() {
    return this.isMuted;
  }

  private createOscillator(
    type: OscillatorType,
    freq: number,
    duration: number,
    volumeStart: number,
    volumeEnd: number = 0.01,
    freqEnd?: number
  ) {
    this.initContext();
    if (this.isMuted || !this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (freqEnd !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(volumeStart, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(volumeEnd, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("AudioContext playback error:", e);
    }
  }

  playMove() {
    // Soft subtle low thud
    this.createOscillator('square', 120, 0.08, 0.08, 0.001, 80);
  }

  playRotate() {
    // Fun upward sweep
    this.createOscillator('triangle', 300, 0.12, 0.12, 0.001, 600);
  }

  playHold() {
    // Light futuristic chime
    this.createOscillator('sine', 440, 0.15, 0.15, 0.001, 880);
  }

  playDrop() {
    // Punchy click
    this.createOscillator('triangle', 180, 0.06, 0.15, 0.001, 100);
  }

  playLineClear(lines: number) {
    // Beautiful chiptune arpeggios depending on how many lines are cleared
    let base = 261.63; // C4
    if (lines === 4) {
      // TETRIS! Mega chord arpeggio
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.createOscillator('square', freq, 0.15, 0.12, 0.001, freq * 1.05);
        }, idx * 60);
      });
    } else {
      // 1 to 3 lines
      const notes = [261.63, 329.63, 392.00]; // Major triad
      for (let i = 0; i < lines; i++) {
        const freq = notes[i % 3] * (Math.floor(i / 3) + 1);
        setTimeout(() => {
          this.createOscillator('triangle', freq, 0.18, 0.15, 0.001, freq * 1.1);
        }, i * 100);
      }
    }
  }

  playLevelUp() {
    // Victorious retro fanfare
    const melody = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
    const originalDur = 0.15;
    melody.forEach((freq, idx) => {
      setTimeout(() => {
        this.createOscillator('square', freq, idx === melody.length - 1 ? 0.35 : originalDur, 0.15, 0.001);
      }, idx * 120);
    });
  }

  playGameOver() {
    // Disappointing descending sweep
    const notes = [440, 415.3, 392, 349.23];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.createOscillator('sawtooth', freq, 0.25, 0.12, 0.001, freq * 0.7);
      }, idx * 250);
    });
  }
}

export const sounds = new SoundManager();
