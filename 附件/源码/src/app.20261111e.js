/* ============================================================
   回声 Echo — 应用逻辑
   纯静态 · 零依赖 · 零后端 · 音乐为 WebAudio 实时合成
   ============================================================ */

(() => {
  'use strict';

  /* ============================================
     1. 音乐引擎：WebAudio 实时合成氛围音
     无音频文件下载 → 服务器不承担任何带宽/内存
     ============================================ */
  const Music = {
    ctx: null,
    master: null,
    reverb: null,
    playing: false,
    timers: [],
    startTime: 0,

    // 五声音阶（D 大调五声）：温暖、无半音冲突，适合长时间聆听
    scale: [293.66, 329.63, 369.99, 440.00, 493.88, 587.33, 659.25, 739.99, 880.00],

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;

      this.ctx = new AC();
      const ctx = this.ctx;

      // 主音量
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(ctx.destination);

      // 卷积混响：用程序生成的脉冲响应，模拟大空间
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this.makeImpulse(3.6, 2.4);
      const revGain = ctx.createGain();
      revGain.gain.value = 0.55;
      this.reverb.connect(revGain);
      revGain.connect(this.master);

      // 温湿度滤波：柔化高频，避免刺耳
      this.lp = ctx.createBiquadFilter();
      this.lp.type = 'lowpass';
      this.lp.frequency.value = 2600;
      this.lp.Q.value = 0.6;
      this.lp.connect(this.master);
      this.lp.connect(this.reverb);

      // 呼吸音专用总线（干声为主、少量混响）
      this.initPlacement();

      // 缓慢呼吸的低音垫
      this.startPad();
    },

    makeImpulse(duration, decay) {
      const ctx = this.ctx;
      const rate = ctx.sampleRate;
      const len = Math.floor(rate * duration);
      const buf = ctx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          const t = i / len;
          // 前 8ms 遮掉直通，做出空间感
          const pre = i < rate * 0.008 ? 0 : 1;
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * pre;
        }
      }
      return buf;
    },

    // 低频氛围垫：两个略微失谐的正弦，产生缓慢的相位涌动
    startPad() {
      const ctx = this.ctx;
      const padGain = ctx.createGain();
      padGain.gain.value = 0.075;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      filter.Q.value = 1.2;

      const freqs = [73.42, 110.00, 146.83]; // D2 / A2 / D3
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f * (1 + (i - 1) * 0.0016); // 微失谐
        const g = ctx.createGain();
        g.gain.value = 0.32 / (i + 1);
        osc.connect(g);
        g.connect(filter);
        osc.start();

        // 每个音自己的缓慢起伏
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.035 + i * 0.017;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.10 / (i + 1);
        lfo.connect(lfoGain);
        lfoGain.connect(g.gain);
        lfo.start();
      });

      filter.connect(padGain);
      padGain.connect(this.lp);
      padGain.connect(this.reverb);
    },

    // 弹一个音符：正弦 + 三角波叠加，长衰减
    note(freq, when, dur = 4.5, vol = 0.16) {
      const ctx = this.ctx;
      const t = when;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.035);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      const oscA = ctx.createOscillator();
      oscA.type = 'sine';
      oscA.frequency.value = freq;

      const oscB = ctx.createOscillator();
      oscB.type = 'triangle';
      oscB.frequency.value = freq * 2.002; // 八度泛音，极轻
      const gB = ctx.createGain();
      gB.gain.value = 0.12;

      oscA.connect(g);
      oscB.connect(gB);
      gB.connect(g);
      g.connect(this.lp);
      g.connect(this.reverb);

      oscA.start(t); oscB.start(t);
      oscA.stop(t + dur + 0.1); oscB.stop(t + dur + 0.1);
    },

    // 排程：每隔几秒随机挑音阶里的音，形成不重复的旋律
    schedule() {
      const ctx = this.ctx;
      let next = ctx.currentTime + 0.4;

      const tick = () => {
        if (!this.playing) return;
        // 一次排 3 个音，避免定时器抖动
        for (let i = 0; i < 3; i++) {
          const idx = Math.floor(Math.random() * this.scale.length);
          const f = this.scale[idx];
          const octaveUp = Math.random() < 0.18 ? 2 : 1;
          this.note(f * octaveUp, next + i * (2.2 + Math.random() * 1.4),
                    4.0 + Math.random() * 3.0, 0.10 + Math.random() * 0.07);
        }
        next += 3 * (2.2 + Math.random() * 1.4);
        const delay = Math.max(2800, (next - ctx.currentTime - 4) * 1000);
        this.timers.push(setTimeout(tick, delay));
      };
      tick();
    },

    // ================================================
    // 呼吸声系统：让声音真正跟随吸气/屏息/呼气的物理过程
    // 不是"每个阶段响一下"，而是持续铺满整个呼吸周期
    // ================================================

    /**
     * 生成气声噪声源（柔和版）
     *
     * 关键改进：用「粉红噪声」替代白噪声。
     * 白噪声各频率能量均等，听感是"嘶嘶"的电流声/收音机噪声；
     * 粉红噪声低频能量更多（-3dB/oct），更接近自然风声与真实呼吸。
     *
     * @param {number} dur 持续时间（秒）
     * @param {number} centerHz 带通中心频率
     * @param {number} q 带宽质量因子（越小越宽、越柔和）
     */
    makeBreathNoise(dur, centerHz, q) {
      const ctx = this.ctx;
      const rate = ctx.sampleRate;
      const len = Math.floor(rate * dur);
      const buf = ctx.createBuffer(1, len, rate);
      const data = buf.getChannelData(0);

      // --- 粉红噪声：用 Voss-McCartney 简化版（多个八度采样叠加）---
      // 比白噪声柔和得多，没有刺耳的高频毛刺
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        // 混合并归一化，避免削波
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.09;
        b6 = white * 0.115926;
      }

      // 首尾做淡入淡出，消除爆音（"咔哒"声）
      const fadeLen = Math.min(Math.floor(rate * 0.06), Math.floor(len / 4));
      for (let i = 0; i < fadeLen; i++) {
        const k = i / fadeLen;
        data[i] *= k;
        data[len - 1 - i] *= k;
      }

      const src = ctx.createBufferSource();
      src.buffer = buf;

      // 带通：Q 值降低到 0.5~0.8 区间，声音宽而柔，没有"哨音"感
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = centerHz;
      bp.Q.value = q;

      // 低通再收一道高频，彻底去掉尖锐的"嘶"感
      const lp2 = ctx.createBiquadFilter();
      lp2.type = 'lowpass';
      lp2.frequency.value = centerHz * 1.8;
      lp2.Q.value = 0.6;

      // 高通切掉低频隆隆声，只保留"气流"频段
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = centerHz * 0.35;
      hp.Q.value = 0.5;

      src.connect(bp);
      bp.connect(lp2);
      lp2.connect(hp);
      return { src, out: hp };
    },

    /**
     * 一次完整的"吸气"：气流由弱到强再收住
     * 听感定位：明亮、向上、略轻（像把空气"吸进来"）
     */
    breathIn(dur) {
      if (!this.placementCtx) return;
      const ctx = this.ctx;
      const t0 = ctx.currentTime + 0.03;
      const t1 = t0 + dur;

      // --- 气声层：中心频率降低、Q 值调低，声音宽而柔 ---
      const { src, out } = this.makeBreathNoise(dur, 560, 0.75);
      const ng = ctx.createGain();
      // 吸气轮廓：缓起 → 中后段最饱满 → 末端柔和收住
      ng.gain.setValueAtTime(0.0001, t0);
      ng.gain.linearRampToValueAtTime(0.070, t0 + dur * 0.28);
      ng.gain.linearRampToValueAtTime(0.125, t0 + dur * 0.66);
      ng.gain.linearRampToValueAtTime(0.0001, t1 - 0.10);
      out.connect(ng);
      ng.connect(this.placement);
      src.start(t0);
      src.stop(t1 + 0.05);

      // --- 音高层：极轻的低频托底，只做"空气在动"的暗示，不喧宾夺主 ---
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const f0 = 146.83;  // D3，比之前更低沉
      osc.frequency.setValueAtTime(f0, t0);
      osc.frequency.linearRampToValueAtTime(f0 * 1.18, t1);  // 轻微上行，不刺耳

      // 用一个低通把正弦磨圆，去掉任何可能的"电子感"
      const soft = ctx.createBiquadFilter();
      soft.type = 'lowpass';
      soft.frequency.value = 400;
      soft.Q.value = 0.4;

      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t0);
      og.gain.linearRampToValueAtTime(0.028, t0 + dur * 0.35);
      og.gain.linearRampToValueAtTime(0.042, t0 + dur * 0.72);
      og.gain.linearRampToValueAtTime(0.0001, t1);

      osc.connect(soft);
      soft.connect(og);
      og.connect(this.placement);
      osc.start(t0);
      osc.stop(t1 + 0.02);
    },

    /**
     * 一次完整的"呼气"：气流由强渐弱，像叹气一样松开
     * 听感定位：低沉、向下、略重（像把气"放出去"）
     */
    breathOut(dur) {
      if (!this.placementCtx) return;
      const ctx = this.ctx;
      const t0 = ctx.currentTime + 0.03;
      const t1 = t0 + dur;

      // --- 气声层：更低沉、更散，像自然的叹气 ---
      const { src, out } = this.makeBreathNoise(dur, 340, 0.65);
      const ng = ctx.createGain();
      // 呼气轮廓：柔和地起来 → 长长地散掉
      ng.gain.setValueAtTime(0.0001, t0);
      ng.gain.linearRampToValueAtTime(0.135, t0 + dur * 0.18);
      ng.gain.linearRampToValueAtTime(0.105, t0 + dur * 0.45);
      ng.gain.linearRampToValueAtTime(0.058, t0 + dur * 0.74);
      ng.gain.linearRampToValueAtTime(0.0001, t1 - 0.12);
      out.connect(ng);
      ng.connect(this.placement);
      src.start(t0);
      src.stop(t1 + 0.05);

      // --- 音高层：极轻的下行托底，像叹息落地 ---
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const f0 = 174.61;  // F3，比之前低一档
      osc.frequency.setValueAtTime(f0, t0);
      osc.frequency.linearRampToValueAtTime(f0 * 0.72, t1);  // 平缓下行

      const soft = ctx.createBiquadFilter();
      soft.type = 'lowpass';
      soft.frequency.value = 380;
      soft.Q.value = 0.4;

      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t0);
      og.gain.linearRampToValueAtTime(0.024, t0 + dur * 0.2);
      og.gain.linearRampToValueAtTime(0.0001, t1 - 0.1);

      osc.connect(soft);
      soft.connect(og);
      og.connect(this.placement);
      osc.start(t0);
      osc.stop(t1 + 0.02);
    },

    /**
     * "屏息"：几乎无气声，只剩一个悬停的微弱音
     * 让 2 秒的停顿有存在感，而不是纯静音
     * 频率降到 D3 并加低通，避免任何明亮感打断平静
     */
    breathHold(dur) {
      if (!this.placementCtx) return;
      const ctx = this.ctx;
      const t0 = ctx.currentTime + 0.03;
      const t1 = t0 + dur;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(146.83, t0);   // D3，低而稳
      osc.frequency.linearRampToValueAtTime(146.83 * 1.01, t1);

      const soft = ctx.createBiquadFilter();
      soft.type = 'lowpass';
      soft.frequency.value = 320;
      soft.Q.value = 0.4;

      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t0);
      og.gain.linearRampToValueAtTime(0.012, t0 + dur * 0.35);
      og.gain.linearRampToValueAtTime(0.0001, t1);

      osc.connect(soft);
      soft.connect(og);
      og.connect(this.placement);
      osc.start(t0);
      osc.stop(t1 + 0.02);
    },

    /**
     * 统一入口：按阶段派发
     * @param {'inhale'|'hold'|'exhale'} phase
     * @param {number} seconds 该阶段时长
     */
    cue(phase, seconds) {
      if (!this.playing || !this.ctx) return;
      const d = Math.max(0.6, seconds || 3);

      // 呼吸时让背景音乐让位（侧链式闪避），呼吸声才听得清
      this.duckBackground(true, d);

      if (phase === 'inhale') this.breathIn(d);
      else if (phase === 'exhale') this.breathOut(d);
      else this.breathHold(d);
    },

    /**
     * 背景音乐闪避：呼吸进行时降低背景音量，结束后恢复
     * @param {boolean} on
     * @param {number} holdSec 预计持续时间
     */
    duckBackground(on, holdSec) {
      if (!this.ctx || !this.master) return;
      const t = this.ctx.currentTime;
      const target = on ? 0.42 : 0.85;   // 压低到 42%
      const ramp = on ? 0.35 : 1.4;

      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(target, t + ramp);

      // 呼吸结束后自动恢复
      if (on) {
        clearTimeout(this._duckTimer);
        this._duckTimer = setTimeout(() => {
          if (!this.ctx) return;
          const t2 = this.ctx.currentTime;
          this.master.gain.cancelScheduledValues(t2);
          this.master.gain.setValueAtTime(this.master.gain.value, t2);
          this.master.gain.linearRampToValueAtTime(0.85, t2 + 1.6);
        }, Math.max(600, holdSec * 1000 - 300));
      }
    },

    /**
     * 呼吸音专用总线：独立于背景音乐的干湿比
     * 呼吸声要更"近"（干声多）、混响少，才像自己的呼吸
     * 注意：gain 需要足够大，否则会被背景音乐完全盖住
     */
    initPlacement() {
      if (this.placement) return;
      const ctx = this.ctx;

      // 干声为主，抬高以压过背景音乐
      // 粉红噪声能量比白噪声低，故增益比之前的 6.5 再高一些
      this.placement = ctx.createGain();
      this.placement.gain.value = 7.8;

      // 少量混响，制造空间感但不飘
      const revSend = ctx.createGain();
      revSend.gain.value = 0.28;

      this.placement.connect(this.master);
      this.placement.connect(revSend);
      revSend.connect(this.reverb);

      this.placementCtx = true;
    },

    /** 呼吸结束后收掉残留 */
    stopBreathSound() {
      // 各声音都是一次性的，天然自然衰减；此处仅作占位以便未来扩展
    },

    // 完成音：一串上行琶音
    chime() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime + 0.05;
      const notes = [440, 587.33, 739.99, 880];
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        const g = ctx.createGain();
        const st = t + i * 0.13;
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.13, st + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 2.6);
        osc.connect(g);
        g.connect(this.lp);
        g.connect(this.reverb);
        osc.start(st); osc.stop(st + 2.8);
      });
    },

    async toggle() {
      this.init();
      if (!this.ctx) return false;

      if (this.ctx.state === 'suspended') await this.ctx.resume();

      if (this.playing) {
        this.stop();
        return false;
      }
      this.playing = true;
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setValueAtTime(this.master.gain.value, this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0.85, this.ctx.currentTime + 2.5);
      this.schedule();
      return true;
    },

    stop() {
      if (!this.ctx) return;
      this.playing = false;
      this.timers.forEach(clearTimeout);
      this.timers = [];
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(0, t + 1.2);
    },

    // 场景切换时的音色明暗变化
    setMood(brightness) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.lp.frequency.cancelScheduledValues(t);
      this.lp.frequency.setValueAtTime(this.lp.frequency.value, t);
      this.lp.frequency.linearRampToValueAtTime(1800 + brightness * 2200, t + 2.5);
    }
  };

  /* ============================================
     2. 情绪数据
     ============================================ */
  const MOODS = [
    {
      id: 'tired', name: '疲惫', en: 'Weary',
      color: '#C8A96A', tint: 'rgba(200,169,106,0.16)', brightness: 0.35,
      echoes: [
        '累了就停一下，你已经走了很远。',
        '今天的你，已经做得够多了。',
        '休息不是偷懒，是给明天留一口气。',
        '允许自己什么都不做，也是一种本事。'
      ]
    },
    {
      id: 'anxious', name: '焦虑', en: 'Anxious',
      color: '#7FD1C0', tint: 'rgba(127,209,192,0.16)', brightness: 0.7,
      echoes: [
        '你担心的那件事，多数不会发生。',
        '先把呼吸放慢，其他事等一下再说。',
        '你不需要现在就解决所有问题。',
        '此刻的你，是安全的。'
      ]
    },
    {
      id: 'lonely', name: '孤独', en: 'Lonely',
      color: '#9B8BD9', tint: 'rgba(155,139,217,0.18)', brightness: 0.5,
      echoes: [
        '想被人接住，这件事本身就值得被理解。',
        '你和很多人一样，今晚也在等一句问候。',
        '孤独不代表你不值得被喜欢。',
        '这里有人听见你了，就在刚才。'
      ]
    },
    {
      id: 'sad', name: '低落', en: 'Low',
      color: '#D98BA0', tint: 'rgba(217,139,160,0.16)', brightness: 0.4,
      echoes: [
        '难过不需要理由，也不需要被纠正。',
        '你可以在这里待一会儿，没人催你。',
        '情绪会过去，你不必急着变好。',
        '今天的雨，明天也许就停了。'
      ]
    },
    {
      id: 'calm', name: '平静', en: 'Calm',
      color: '#A8C7A0', tint: 'rgba(168,199,160,0.16)', brightness: 0.85,
      echoes: [
        '保持这份平静，它很珍贵。',
        '你现在的节奏，刚刚好。',
        '把这一刻记住，以后会用得上。',
        '很好，就这样待着。'
      ]
    },
    {
      id: 'numb', name: '麻木', en: 'Numb',
      color: '#8FA3B8', tint: 'rgba(143,163,184,0.14)', brightness: 0.25,
      echoes: [
        '什么都感觉不到，也是一种感觉。',
        '不用逼自己振作，先在这个状态里待着。',
        '麻木是身体在保护你，它在替你撑着。',
        '等你想感受的时候，感受会回来的。'
      ]
    }
  ];

  /* ============================================
     3. 状态与 DOM
     ============================================ */
  const state = {
    mood: null,
    breathRunning: false,
    breathing: null,
    userEcho: '',
    finalText: ''
  };

  const $ = (sel) => document.querySelector(sel);
  const scenes = {
    intro: $('#scene-intro'),
    mood: $('#scene-mood'),
    breathe: $('#scene-breathe'),
    echo: $('#scene-echo'),
    final: $('#scene-final')
  };

  function goTo(name) {
    Object.entries(scenes).forEach(([key, el]) => {
      el.classList.toggle('scene--active', key === name);
    });
    // 重新触发入场动画
    const active = scenes[name];
    if (active) {
      active.querySelectorAll('.reveal').forEach((el) => {
        el.style.animation = 'none';
        void el.offsetHeight;
        el.style.animation = '';
      });
      active.scrollTop = 0;
    }
  }

  /* ============================================
     4. 呼吸引导
     ============================================ */
  const BREATH_PATTERN = [
    { phase: 'inhale', label: '吸气', ms: 4000, text: '慢慢吸气' },
    { phase: 'hold',   label: '停',   ms: 2000, text: '轻轻停住' },
    { phase: 'exhale', label: '呼气', ms: 6000, text: '缓缓呼气' }
  ];
  const TOTAL_ROUNDS = 4;

  function startBreathing() {
    if (state.breathRunning) return;
    state.breathRunning = true;

    const orb = $('#orb');
    const label = $('#breathLabel');
    const phaseEl = $('#breathPhase');
    const countEl = $('#orbCount');
    const startBtn = $('#startBreathBtn');

    startBtn.disabled = true;
    startBtn.textContent = '呼吸中…';

    let round = 0;
    let stepIdx = 0;

    const runStep = () => {
      if (!state.breathRunning) return;

      if (stepIdx === 0 && round >= TOTAL_ROUNDS) {
        finishBreathing();
        return;
      }

      const step = BREATH_PATTERN[stepIdx];

      orb.classList.remove('is-inhale', 'is-hold', 'is-exhale');
      orb.classList.add(`is-${step.phase}`);

      label.textContent = step.text;
      label.style.opacity = '1';
      phaseEl.textContent = step.label;

      // 倒计时数字
      const totalSec = Math.round(step.ms / 1000);
      countEl.classList.add('is-visible');
      let left = totalSec;
      countEl.textContent = left;

      // 声音跟随这一阶段的真实时长：吸气 4s / 屏息 2s / 呼气 6s
      Music.cue(step.phase, step.ms / 1000);

      const cd = setInterval(() => {
        left -= 1;
        if (left <= 0) {
          clearInterval(cd);
          countEl.classList.remove('is-visible');
        } else {
          countEl.textContent = left;
        }
      }, 1000);

      state.breathing = setTimeout(() => {
        clearInterval(cd);
        countEl.classList.remove('is-visible');
        stepIdx += 1;
        if (stepIdx >= BREATH_PATTERN.length) {
          stepIdx = 0;
          round += 1;
        }
        runStep();
      }, step.ms);
    };

    runStep();
  }

  function finishBreathing() {
    state.breathRunning = false;
    clearTimeout(state.breathing);
    const orb = $('#orb');
    orb.classList.remove('is-inhale', 'is-hold', 'is-exhale');
    orb.classList.add('is-inhale');
    $('#breathLabel').textContent = '做得好。现在，把想说的写下来。';
    $('#breathPhase').textContent = '完成';
    $('#orbCount').classList.remove('is-visible');
    Music.chime();
    setTimeout(() => goTo('echo'), 1400);
  }

  function stopBreathing() {
    state.breathRunning = false;
    clearTimeout(state.breathing);
    const orb = $('#orb');
    orb.classList.remove('is-inhale', 'is-hold', 'is-exhale');
    const startBtn = $('#startBreathBtn');
    if (startBtn) { startBtn.disabled = false; startBtn.textContent = '开始呼吸'; }
  }

  /* ============================================
     5. 渲染情绪卡
     ============================================ */
  function renderMoods() {
    const grid = $('#moodGrid');
    grid.innerHTML = '';
    MOODS.forEach((m) => {
      const btn = document.createElement('button');
      btn.className = 'mood-card';
      btn.type = 'button';
      btn.style.setProperty('--mood-color', m.color);
      btn.style.setProperty('--mood-tint', m.tint);
      btn.setAttribute('aria-label', `选择情绪：${m.name}`);
      btn.innerHTML = `
        <span class="mood-card__dot"></span>
        <span class="mood-card__name">${m.name}</span>
        <span class="mood-card__en">${m.en}</span>
      `;
      btn.addEventListener('click', () => selectMood(m));
      grid.appendChild(btn);
    });
  }

  function selectMood(m) {
    state.mood = m;
    $('#breathMoodLabel').textContent = m.name;
    Music.setMood(m.brightness);
    // 让呼吸球的颜色随情绪变化
    document.documentElement.style.setProperty('--orb-tint', m.color);
    goTo('breathe');
    // 自动开始
    setTimeout(() => {
      const btn = $('#startBreathBtn');
      if (btn && !state.breathRunning) btn.focus({ preventScroll: true });
    }, 600);
  }

  /* ============================================
     6. 回声文案
     ============================================ */
  function buildFinalText() {
    const m = state.mood || MOODS[0];
    if (state.userEcho.trim()) {
      // 用户写了话：以用户的话为主体，回响作为尾注
      return { main: state.userEcho.trim(), echo: m.echoes[Math.floor(Math.random() * m.echoes.length)] };
    }
    return { main: m.echoes[Math.floor(Math.random() * m.echoes.length)], echo: '' };
  }

  function showFinal() {
    const { main, echo } = buildFinalText();
    state.finalText = main;

    const qEl = $('#finalQuote');
    const noteEl = $('#finalNote');

    qEl.textContent = '';
    qEl.style.opacity = '0';

    // 逐字出现
    let i = 0;
    const type = () => {
      if (i <= main.length) {
        qEl.textContent = main.slice(0, i);
        i += 1;
        setTimeout(type, 90);
      } else if (echo) {
        qEl.innerHTML = '';
        const span = document.createElement('span');
        span.textContent = main;
        qEl.appendChild(span);
        const br = document.createElement('br');
        qEl.appendChild(br);
        const em = document.createElement('em');
        em.textContent = echo;
        em.style.fontSize = '0.68em';
        em.style.opacity = '0.85';
        em.style.display = 'inline-block';
        em.style.marginTop = '0.5em';
        qEl.appendChild(em);
      }
      qEl.style.opacity = '1';
    };
    type();

    noteEl.textContent = '这段回声已被风带走，没有被保存。';
    goTo('final');
    Music.chime();
  }

  /* ============================================
     7. 生成回声卡（Canvas 本地绘制）
     ============================================ */
  function drawCard() {
    const canvas = $('#cardCanvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;   // 1080
    const H = canvas.height;  // 1440

    // 底色渐变
    const g = ctx.createLinearGradient(0, 0, W * 0.6, H);
    g.addColorStop(0, '#161E33');
    g.addColorStop(1, '#080C16');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 光晕 1
    let rg = ctx.createRadialGradient(W * 0.3, H * 0.16, 0, W * 0.3, H * 0.16, W * 0.7);
    rg.addColorStop(0, 'rgba(200,169,106,0.20)');
    rg.addColorStop(1, 'rgba(200,169,106,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    // 光晕 2
    rg = ctx.createRadialGradient(W * 0.82, H * 0.88, 0, W * 0.82, H * 0.88, W * 0.6);
    rg.addColorStop(0, 'rgba(155,139,217,0.18)');
    rg.addColorStop(1, 'rgba(155,139,217,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    // 内描边框
    ctx.strokeStyle = 'rgba(200,169,106,0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(52, 52, W - 104, H - 104);
    ctx.strokeStyle = 'rgba(200,169,106,0.10)';
    ctx.lineWidth = 1;
    ctx.strokeRect(64, 64, W - 128, H - 128);

    // 品牌
    ctx.fillStyle = 'rgba(200,169,106,0.95)';
    ctx.font = '500 26px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '0px';
    ctx.fillText('E C H O  ·  回 声', W / 2, 168);

    // 装饰短线
    ctx.strokeStyle = 'rgba(200,169,106,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 34, 208);
    ctx.lineTo(W / 2 + 34, 208);
    ctx.stroke();

    // 正文：自动换行
    const maxW = W - 240;
    const fontSize = state.finalText.length > 28 ? 58 : 72;
    ctx.font = `300 ${fontSize}px "Noto Serif SC", serif`;
    ctx.fillStyle = '#F2EFE9';

    const chars = state.finalText.split('');
    const lines = [];
    let cur = '';
    for (const ch of chars) {
      if (ctx.measureText(cur + ch).width > maxW && cur) {
        lines.push(cur);
        cur = ch;
      } else {
        cur += ch;
      }
    }
    if (cur) lines.push(cur);

    const lineH = fontSize * 1.75;
    // 视觉重心放在黄金分割位（约 42% 处），避免居中的空洞感
    const centerY = H * 0.44;
    const startY = centerY - ((lines.length - 1) * lineH) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, W / 2, startY + i * lineH);
    });

    // 正文下方的分隔短线
    const tailY = startY + (lines.length - 1) * lineH + fontSize * 1.5;
    ctx.strokeStyle = 'rgba(200,169,106,0.32)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 40, tailY);
    ctx.lineTo(W / 2 + 40, tailY);
    ctx.stroke();

    // 日期
    const d = new Date();
    const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    ctx.fillStyle = 'rgba(242,239,233,0.42)';
    ctx.font = '300 24px "Manrope", sans-serif';
    ctx.fillText(dateStr, W / 2, H - 220);

    ctx.fillStyle = 'rgba(242,239,233,0.28)';
    ctx.font = '300 20px "Manrope", sans-serif';
    ctx.fillText('给情绪一个回响的地方', W / 2, H - 150);

    return canvas;
  }

  /* ============================================
     8. 事件绑定
     ============================================ */
  function bind() {
    // 声音
    const soundBtn = $('#soundToggle');
    soundBtn.addEventListener('click', async () => {
      const on = await Music.toggle();
      soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      soundBtn.querySelector('.sound-toggle__label').textContent = on ? '静音' : '声音';
    });

    // 进入
    $('#enterBtn').addEventListener('click', async () => {
      // 用户手势里启动音乐（浏览器要求）
      if (!Music.playing) {
        const on = await Music.toggle();
        soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        soundBtn.querySelector('.sound-toggle__label').textContent = on ? '静音' : '声音';
      }
      goTo('mood');
    });

    // 关于
    $('#aboutBtn').addEventListener('click', () => {
      $('#aboutModal').hidden = false;
    });

    // 呼吸
    $('#startBreathBtn').addEventListener('click', startBreathing);
    $('#skipToEndBtn').addEventListener('click', () => {
      stopBreathing();
      goTo('echo');
    });

    // 写一句话
    const input = $('#echoInput');
    const count = $('#echoCount');
    input.addEventListener('input', () => {
      count.textContent = input.value.length;
    });
    // Ctrl/Cmd + Enter 提交
    input.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        submitEcho();
      }
    });

    function submitEcho() {
      state.userEcho = input.value.trim();
      showFinal();
    }

    $('#submitEchoBtn').addEventListener('click', submitEcho);
    $('#skipEchoBtn').addEventListener('click', () => {
      state.userEcho = '';
      showFinal();
    });

    // 生成卡片
    $('#shareBtn').addEventListener('click', () => {
      drawCard();
      $('#cardQuote').textContent = state.finalText;
      const d = new Date();
      $('#cardDate').textContent =
        `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      $('#cardModal').hidden = false;
    });

    // 保存卡片
    $('#saveCardBtn').addEventListener('click', () => {
      const canvas = drawCard();
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `echo-${Date.now()}.png`;
      a.click();
    });

    // 重来
    $('#restartBtn').addEventListener('click', () => {
      state.mood = null;
      state.userEcho = '';
      state.finalText = '';
      input.value = '';
      count.textContent = '0';
      $('#breathLabel').textContent = '准备好时，跟着圆点呼吸';
      $('#breathPhase').textContent = '准备';
      stopBreathing();
      goTo('intro');
    });

    // 返回
    document.querySelectorAll('[data-back]').forEach((el) => {
      el.addEventListener('click', () => goTo(el.dataset.back));
    });

    // 关闭弹层
    document.querySelectorAll('[data-close-modal]').forEach((el) => {
      el.addEventListener('click', () => {
        $('#aboutModal').hidden = true;
        $('#cardModal').hidden = true;
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $('#aboutModal').hidden = true;
        $('#cardModal').hidden = true;
      }
    });

    // 页面隐藏时暂停呼吸，避免回来时错乱
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.breathRunning) {
        stopBreathing();
      }
    });

    /* ---------- 移动端：键盘遮挡处理 ---------- */
    const isTouch = window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;
    if (isTouch) {
      const echoInput = $('#echoInput');

      // iOS 键盘弹出后，浏览器视口高度会变。滚动输入框到可视区。
      echoInput.addEventListener('focus', () => {
        setTimeout(() => {
          const scene = scenes.echo;
          const rect = echoInput.getBoundingClientRect();
          const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
          if (rect.bottom > vh - 20) {
            scene.scrollTo({
              top: echoInput.offsetTop - 120,
              behavior: 'smooth'
            });
          }
        }, 320);
      });

      // visualViewport 变化（键盘弹起/收起）时修正布局
      if (window.visualViewport) {
        const vv = window.visualViewport;
        const fixViewport = () => {
          document.documentElement.style.setProperty('--vvh', `${vv.height}px`);
        };
        vv.addEventListener('resize', fixViewport);
        vv.addEventListener('scroll', fixViewport);
        fixViewport();
      }

      // 双击缩放屏蔽（iOS 的 300ms 延迟与手势缩放）
      let lastTouch = 0;
      document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouch <= 300) e.preventDefault();
        lastTouch = now;
      }, { passive: false });
    }
  }

  /* ============================================
     9. 启动
     ============================================ */
  function init() {
    renderMoods();
    bind();
    // 预置第一屏动画
    goTo('intro');

    // 版本标记：便于排查"手机加载了旧版"的问题
    window.__ECHO_VERSION__ = '2026-11-11-breath-audio';

    // 调试/截图用：?scene=mood
    const q = new URLSearchParams(location.search).get('scene');
    if (q && scenes[q]) {
      if (q === 'breathe') {
        state.mood = MOODS[0];
        $('#breathMoodLabel').textContent = MOODS[0].name;
      } else if (q === 'final') {
        state.mood = MOODS[0];
        state.userEcho = '今天已经很努力了。';
      }
      goTo(q);
      if (q === 'final') {
        state.finalText = state.userEcho;
        $('#finalQuote').innerHTML = state.userEcho +
          '<br><em style="font-size:0.68em;opacity:.85;display:inline-block;margin-top:.5em">累了就停一下，你已经走了很远。</em>';
      }
    }

    // 强制刷新参数：?v=xxx 时清掉可能的旧缓存提示
    checkStaleCache();
  }

  /**
   * 检测页面是否可能来自旧缓存
   * 若 app.js 的版本与 HTML 中的版本参数不一致，说明资源混用了
   */
  function checkStaleCache() {
    try {
      const src = document.querySelector('script[src*="app.js"]')?.src || '';
      const m = src.match(/[?&]v=([^&]+)/);
      if (!m) return;                      // 无版本参数，不判断
      const expected = m[1];
      const actual = '20261111c';          // 与 HTML 中写入的版本保持一致
      if (expected !== actual) {
        console.warn('[Echo] 资源版本不一致，可能存在缓存：', expected, '≠', actual);
      }
    } catch (e) { /* 忽略 */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
