class AudioEngine {
    constructor() {
        this.ctx = null;
        this.nodes = {};
        this.masterLimiter = null;
        this.dcBlocker = null;
        this.initAudioContext();
        this.watchInterruptions();
    }

    // iPad / iPhone: switching to another app puts the sound in an 'interrupted' state
    // (not 'suspended'), so it must be woken up again when the page comes back.
    isAsleep() {
        return !!this.ctx && this.ctx.state !== 'running' && this.ctx.state !== 'closed';
    }

    wake() {
        if (this.isAsleep()) this.ctx.resume().catch(() => {});
    }

    watchInterruptions() {
        const onReturn = () => {
            if (document.visibilityState !== 'visible') return;
            this.wake();
            // Safari only lets sound restart from a tap: if it is still off, say so.
            setTimeout(() => {
                if (this.hasPlayed && this.isAsleep() && document.visibilityState === 'visible' &&
                    window.synthApp && typeof window.synthApp.showNotification === 'function') {
                    window.synthApp.showNotification('Tap anywhere to turn the sound back on.');
                }
            }, 700);
        };
        document.addEventListener('visibilitychange', onReturn);
        window.addEventListener('pageshow', onReturn);
        // Every tap, click or key press wakes the sound if it is asleep (cheap when it is running).
        ['pointerdown', 'touchend', 'keydown'].forEach(type => {
            window.addEventListener(type, () => this.wake(), { capture: true, passive: true });
        });
    }

    initAudioContext() {
        const unlockAudio = () => {
            if (this.ctx) {
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume().then(() => {
                        if (this.ctx.state === 'running') {
                            removeListeners();
                        }
                    }).catch(() => {});
                } else if (this.ctx.state === 'running') {
                    removeListeners();
                }
            } else {
                this.getContext();
            }
        };

        const removeListeners = () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('mousedown', unlockAudio);
        };

        document.addEventListener('click', unlockAudio);
        document.addEventListener('keydown', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);
        document.addEventListener('mousedown', unlockAudio);
    }

    // מקור יחיד לסביבת השמע עבור כל המודולים באפליקציה
    getContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
            // Remember that sound has started once, so the "tap to turn the sound back on" note
            // only appears after an interruption, never on the first visit.
            this.hasPlayed = this.ctx.state === 'running';
            this.ctx.addEventListener('statechange', () => {
                if (this.ctx.state === 'running') this.hasPlayed = true;
            });
            this.setupMasterProtection();
        }
        
        this.wake();

        return this.ctx;
    }

    setupMasterProtection() {
        if (!this.ctx) return;

        // 1. High-Pass Filter / DC Blocker (סינון רכיבי DC ותדרים מתחת ל-20Hz)
        this.dcBlocker = this.ctx.createBiquadFilter();
        this.dcBlocker.type = 'highpass';
        this.dcBlocker.frequency.setValueAtTime(20, this.ctx.currentTime);
        this.dcBlocker.Q.setValueAtTime(0.707, this.ctx.currentTime);

        // 2. Brickwall Limiter (הגנה מפני עומס יתר וקפיצות ווליום)
        this.masterLimiter = this.ctx.createDynamicsCompressor();
        this.masterLimiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
        this.masterLimiter.knee.setValueAtTime(0.0, this.ctx.currentTime);
        this.masterLimiter.ratio.setValueAtTime(20.0, this.ctx.currentTime);
        this.masterLimiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.masterLimiter.release.setValueAtTime(0.1, this.ctx.currentTime);

        // חיבור השרשרת ל-destination הסופי
        this.dcBlocker.connect(this.masterLimiter);
        this.masterLimiter.connect(this.ctx.destination);
    }

    getMasterInput() {
        this.getContext();
        return this.dcBlocker;
    }

    async resume() {
        const ctx = this.getContext();
        if (this.isAsleep()) {
            await ctx.resume();
        }
        return ctx;
    }
}

window.audioEngine = new AudioEngine();