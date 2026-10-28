/**
 * BURGER UNIVERSITY - 225-FRAME SCROLLYTELLING ENGINE
 * Smooth canvas rendering, 30% header fade-out, procedural audio, and website integration.
 */

(function () {
  'use strict';

  // Environment guard: execute only in browser environments with DOM support
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  function initScrollytelling() {
    const canvas = document.getElementById('burger-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const TOTAL_FRAMES = 225;
    const images = [];
    let loadedCount = 0;
    let isLoaded = false;

    let currentFrame = 0;
    let targetFrame = 0;
    let isAutoPlaying = false;
    let autoPlaySpeed = 1.0;
    let lastRenderedFrame = -1;
    let sfxEnabled = true;
    let lastSfxFrame = -1;

    // Audio Context (Web Audio API)
    let audioCtx = null;

    function initAudio() {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioCtx = new AudioContext();
        }
      }
    }

    // Procedural sound effects using Web Audio API
    function playSound(type = 'tick') {
      if (!sfxEnabled) return;
      try {
        initAudio();
        if (!audioCtx || audioCtx.state === 'suspended') {
          audioCtx?.resume();
        }
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const now = audioCtx.currentTime;

        if (type === 'tick') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.04);
        } else if (type === 'thud') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
        } else if (type === 'sizzle') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(450, now);
          osc.frequency.exponentialRampToValueAtTime(280, now + 0.12);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        }
      } catch (e) {
        // Audio policy muted or restricted
      }
    }

    // Sound triggers on layer milestones
    const SOUND_MILESTONES = [1, 28, 58, 80, 115, 148, 178, 218];

    function checkSoundMilestone(frameIdx) {
      const rounded = Math.round(frameIdx);
      if (rounded !== lastSfxFrame) {
        if (SOUND_MILESTONES.includes(rounded)) {
          playSound('thud');
        } else if (rounded % 8 === 0) {
          playSound('tick');
        }
        lastSfxFrame = rounded;
      }
    }

    // -------------------------------------------------------------
    // PRELOADER & IMAGE ASSET PIPELINE
    // -------------------------------------------------------------
    const progressBar = document.getElementById('progress-bar');
    const loaderPercent = document.getElementById('loader-percent');
    const loaderStatus = document.getElementById('loader-status');
    const preloader = document.getElementById('preloader');

    const statusMessages = [
      { at: 0, text: 'Firing up the 450°F cast iron griddle...' },
      { at: 25, text: 'Toasting fresh potato brioche cushions...' },
      { at: 50, text: 'Searing double prime Angus patties...' },
      { at: 75, text: 'Steam-melting cave-aged cheddar...' },
      { at: 90, text: 'Cascading signature varsity sauce ribbon...' },
      { at: 98, text: 'Sprinkling toasted sesame seeds...' }
    ];

    function updatePreloaderStatus(pct) {
      if (!loaderStatus) return;
      let activeMsg = statusMessages[0].text;
      for (let s of statusMessages) {
        if (pct >= s.at) activeMsg = s.text;
      }
      loaderStatus.textContent = activeMsg;
    }

    function preloadFrames() {
      setTimeout(() => {
        if (!isLoaded && loadedCount > 20) {
          finishLoading();
        }
      }, 3500);

      for (let i = 1; i <= TOTAL_FRAMES; i++) {
        const img = new Image();
        const frameNumber = String(i).padStart(3, '0');
        img.src = `frames/ezgif-frame-${frameNumber}.jpg`;

        img.onload = () => {
          loadedCount++;
          const pct = Math.floor((loadedCount / TOTAL_FRAMES) * 100);
          if (progressBar) progressBar.style.width = `${pct}%`;
          if (loaderPercent) loaderPercent.textContent = `${pct}%`;
          updatePreloaderStatus(pct);

          if (loadedCount === 1) {
            renderFrame(0);
          }

          if (loadedCount === TOTAL_FRAMES) {
            setTimeout(finishLoading, 400);
          }
        };

        img.onerror = () => {
          loadedCount++;
          if (loadedCount === TOTAL_FRAMES) {
            setTimeout(finishLoading, 400);
          }
        };

        images.push(img);
      }
    }

    function finishLoading() {
      isLoaded = true;
      if (preloader) preloader.classList.add('fade-out');
      renderFrame(0);
    }

    // -------------------------------------------------------------
    // CANVAS RESIZE & DRAWING ENGINE
    // -------------------------------------------------------------
    let canvasWidth = window.innerWidth;
    let canvasHeight = window.innerHeight;

    function handleResize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasWidth = window.innerWidth;
      canvasHeight = window.innerHeight;

      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      ctx.scale(dpr, dpr);

      lastRenderedFrame = -1;
      renderFrame(currentFrame);
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    function renderFrame(frameIndex) {
      const idx = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.floor(frameIndex)));
      const img = images[idx];
      if (!img || !img.complete || img.naturalWidth === 0) return;

      const w = canvasWidth;
      const h = canvasHeight;

      const imgAspect = 1920 / 1080;
      const canvasAspect = w / h;

      let drawW, drawH, drawX, drawY;

      if (w <= 768) {
        drawW = w * 1.25;
        drawH = drawW / imgAspect;
        drawX = (w - drawW) / 2;
        drawY = (h - drawH) / 2 - 10;
      } else {
        if (canvasAspect > imgAspect) {
          drawH = h * 1.05;
          drawW = drawH * imgAspect;
          drawX = (w - drawW) / 2;
          drawY = (h - drawH) / 2;
        } else {
          drawW = w * 1.05;
          drawH = drawW / imgAspect;
          drawX = (w - drawW) / 2;
          drawY = (h - drawH) / 2;
        }
      }

      // Draw studio warm beige background fill
      ctx.fillStyle = '#f6e1c4';
      ctx.fillRect(0, 0, w, h);

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }

    // -------------------------------------------------------------
    // SCROLL SYNC & 30% HEADER FADE ENGINE
    // -------------------------------------------------------------
    const scrollContainer = document.getElementById('scroll-container');
    const scrubber = document.getElementById('frame-scrubber');
    const hudFrameCount = document.getElementById('hud-frame-count');
    const hudStepName = document.getElementById('hud-step-name');
    const scrollHeader = document.getElementById('scroll-header');

    function updateHeaderFade(progress) {
      if (!scrollHeader) return;
      // Fade away completely when user reaches 30% of scroll animation
      const FADE_LIMIT = 0.30;

      if (progress <= 0) {
        scrollHeader.style.opacity = '1';
        scrollHeader.style.transform = 'translateY(0)';
        scrollHeader.style.pointerEvents = 'auto';
      } else if (progress >= FADE_LIMIT) {
        scrollHeader.style.opacity = '0';
        scrollHeader.style.transform = 'translateY(-24px)';
        scrollHeader.style.pointerEvents = 'none';
      } else {
        const fadeRatio = 1 - (progress / FADE_LIMIT);
        scrollHeader.style.opacity = fadeRatio.toFixed(3);
        scrollHeader.style.transform = `translateY(-${((1 - fadeRatio) * 24).toFixed(1)}px)`;
        scrollHeader.style.pointerEvents = fadeRatio > 0.1 ? 'auto' : 'none';
      }
    }

    function onScroll() {
      if (isAutoPlaying || !scrollContainer) return;

      const rect = scrollContainer.getBoundingClientRect();
      const maxScroll = scrollContainer.scrollHeight - window.innerHeight;
      const currentScroll = -rect.top;

      let progress = currentScroll / maxScroll;
      progress = Math.max(0, Math.min(1, progress));

      targetFrame = progress * (TOTAL_FRAMES - 1);
      updateHeaderFade(progress);
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // Scrubber input
    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        if (isAutoPlaying) pauseAutoPlay();
        const targetVal = parseFloat(e.target.value);
        targetFrame = targetVal;

        if (scrollContainer) {
          const scrollContainerTop = scrollContainer.offsetTop;
          const maxScroll = scrollContainer.scrollHeight - window.innerHeight;
          const targetScrollY = scrollContainerTop + (targetVal / (TOTAL_FRAMES - 1)) * maxScroll;
          window.scrollTo({ top: targetScrollY, behavior: 'instant' });
        }

        const progress = targetVal / (TOTAL_FRAMES - 1);
        updateHeaderFade(progress);
      });
    }

    // Master requestAnimationFrame Loop with smooth lerp
    function animationLoop() {
      if (isAutoPlaying && scrollContainer) {
        targetFrame += 0.55 * autoPlaySpeed;
        if (targetFrame >= TOTAL_FRAMES - 1) {
          targetFrame = TOTAL_FRAMES - 1;
          pauseAutoPlay();
        }
        const scrollContainerTop = scrollContainer.offsetTop;
        const maxScroll = scrollContainer.scrollHeight - window.innerHeight;
        const autoScrollY = scrollContainerTop + (targetFrame / (TOTAL_FRAMES - 1)) * maxScroll;
        window.scrollTo({ top: autoScrollY, behavior: 'auto' });

        const progress = targetFrame / (TOTAL_FRAMES - 1);
        updateHeaderFade(progress);
      }

      const delta = targetFrame - currentFrame;
      currentFrame += delta * 0.12;

      if (Math.abs(delta) < 0.005) {
        currentFrame = targetFrame;
      }

      const roundedFrame = Math.round(currentFrame);
      if (roundedFrame !== lastRenderedFrame) {
        renderFrame(roundedFrame);
        if (scrubber) scrubber.value = roundedFrame;

        const pct = Math.round((roundedFrame / (TOTAL_FRAMES - 1)) * 100);
        if (hudFrameCount) {
          hudFrameCount.textContent = `FRAME ${String(roundedFrame + 1).padStart(3, '0')} / ${TOTAL_FRAMES}`;
        }
        if (hudStepName) {
          hudStepName.textContent = `${pct}% CRAFTED`;
        }

        checkSoundMilestone(roundedFrame);
        lastRenderedFrame = roundedFrame;
      }

      requestAnimationFrame(animationLoop);
    }

    requestAnimationFrame(animationLoop);

    // -------------------------------------------------------------
    // PLAY / PAUSE & HUD CONTROLS
    // -------------------------------------------------------------
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const speedBtn = document.getElementById('speed-btn');

    function startAutoPlay() {
      initAudio();
      if (scrollContainer) {
        const scrollContainerTop = scrollContainer.offsetTop;
        if (targetFrame >= TOTAL_FRAMES - 1 || window.scrollY < scrollContainerTop) {
          targetFrame = 0;
          currentFrame = 0;
          window.scrollTo({ top: scrollContainerTop, behavior: 'smooth' });
        }
      }
      isAutoPlaying = true;
      if (playIcon) playIcon.textContent = '⏸';
      if (playPauseBtn) playPauseBtn.setAttribute('title', 'Pause');
    }

    function pauseAutoPlay() {
      isAutoPlaying = false;
      if (playIcon) playIcon.textContent = '▶';
      if (playPauseBtn) playPauseBtn.setAttribute('title', 'Auto Play');
    }

    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        if (isAutoPlaying) {
          pauseAutoPlay();
        } else {
          startAutoPlay();
        }
      });
    }

    const speeds = [1.0, 1.5, 2.0];
    let speedIdx = 0;
    if (speedBtn) {
      speedBtn.addEventListener('click', () => {
        speedIdx = (speedIdx + 1) % speeds.length;
        autoPlaySpeed = speeds[speedIdx];
        speedBtn.textContent = `${autoPlaySpeed.toFixed(1)}x`;
        playSound('tick');
      });
    }

    const sfxBtn = document.getElementById('sfx-toggle');
    if (sfxBtn) {
      sfxBtn.addEventListener('click', () => {
        initAudio();
        sfxEnabled = !sfxEnabled;
        sfxBtn.textContent = sfxEnabled ? '🔊' : '🔇';
        sfxBtn.style.opacity = sfxEnabled ? '1' : '0.6';
        if (sfxEnabled) playSound('tick');
      });
    }

    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isAutoPlaying) pauseAutoPlay();
        else startAutoPlay();
      } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
        e.preventDefault();
        targetFrame = Math.min(TOTAL_FRAMES - 1, targetFrame + 4);
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
        e.preventDefault();
        targetFrame = Math.max(0, targetFrame - 4);
      }
    });

    // -------------------------------------------------------------
    // BURGER UNIVERSITY INTERACTIVE TOAST FEEDBACK
    // -------------------------------------------------------------
    document.querySelectorAll('.add-to-cart').forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        const itemName = this.getAttribute('data-item') || 'Item';
        const toast = document.getElementById('cart-toast');
        const toastText = document.getElementById('cart-toast-text');
        if (toast && toastText) {
          toastText.textContent = `${itemName} added to tray!`;
          toast.classList.remove('hidden');
          playSound('sizzle');
          setTimeout(() => {
            toast.classList.add('hidden');
          }, 2500);
        }
      });
    });

    // -------------------------------------------------------------
    // INITIALIZE
    // -------------------------------------------------------------
    preloadFrames();
  }

  // Ensure DOM is ready before initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollytelling);
  } else {
    initScrollytelling();
  }
})();
