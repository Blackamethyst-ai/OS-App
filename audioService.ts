
// Sovereign OS // Neural Audio Core
// Procedural Sound Synthesis for UI Feedback

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazy initialization handled in play methods
  }

  private init() {
    if (typeof window !== 'undefined' && !this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.15; // Base volume
      this.masterGain.connect(this.ctx.destination);
    }
  }

  private ensureContext() {
    this.init();
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playTone(freq: number, type: OscillatorType, duration: number, delayed = 0) {
    this.ensureContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delayed);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime + delayed);
    gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + delayed + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + delayed + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime + delayed);
    osc.stop(this.ctx.currentTime + delayed + duration + 0.1);
  }

  // --- SFX Presets ---

  public playClick() {
    // High-tech blip
    this.playTone(800, 'sine', 0.05);
    this.playTone(1200, 'triangle', 0.02, 0.01);
  }

  public playHover() {
    // Subtle flutter
    this.playTone(400, 'sine', 0.02);
  }

  public playTransition() {
    // Warp sweep
    this.ensureContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  public playSuccess() {
    // Positive triad
    this.playTone(440, 'sine', 0.2); // A4
    this.playTone(554, 'sine', 0.2, 0.1); // C#5
    this.playTone(659, 'sine', 0.4, 0.2); // E5
  }

  public playError() {
    // Negative buzz
    this.playTone(150, 'sawtooth', 0.3);
    this.playTone(140, 'sawtooth', 0.3, 0.05);
  }
}

export const audio = new AudioService();
