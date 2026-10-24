// Talk with Mama: tap Mama's face to start a voice conversation, tap again to say goodbye.
// Replaces the ElevenLabs corner box. The talking library only loads on the first tap.
(function () {
  'use strict';
  var AGENT_ID = window.MAMA_AGENT_ID;
  var LIBRARY = 'https://cdn.jsdelivr.net/npm/@elevenlabs/client@1.27.0/dist/lib.iife.js';
  var WORDS = {
    idle: "Tap Mama's face to talk with her",
    connecting: 'Mama is coming to the phone…',
    listening: "Mama is listening. Tap her face to say goodbye.",
    speaking: 'Mama is talking…',
    goodbye: 'Goodbye for now, baby. Tap her face anytime.',
    mic: 'Mama needs your microphone. Tap Allow, then tap her face again.',
    error: "Mama couldn't come to the phone just now. Please try again."
  };
  var conversation = null, starting = false, library = null, targets = [], statusEls = [];

  var style = document.createElement('style');
  style.textContent = [
    '[data-talk-to-mama]{cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '[data-talk-to-mama]{transition:box-shadow .4s,filter .4s}',
    '[data-talk-state=connecting]{animation:mamaTalkWait 1.2s ease-in-out infinite}',
    '[data-talk-state=listening]{box-shadow:0 0 0 6px #14788acc,0 0 40px 12px #14788a66!important}',
    '[data-talk-state=speaking]{animation:mamaTalkGlow 1s ease-in-out infinite;box-shadow:0 0 0 6px #e3caa0,0 0 50px 18px #f4c542aa!important}',
    '@keyframes mamaTalkWait{50%{filter:brightness(1.15)}}',
    '@keyframes mamaTalkGlow{50%{box-shadow:0 0 0 8px #e3caa0,0 0 80px 30px #f4c542cc}}',
    '@media (prefers-reduced-motion:reduce){[data-talk-to-mama]{animation:none!important}}',
    '.mama-talk-status{text-align:center;font-weight:700;color:#0B4057;margin:14px auto 0;max-width:22em;background:#fffcf5eb;padding:6px 16px;border-radius:999px;box-shadow:0 4px 14px #072f431f}',
    '.mama-talk-button{display:inline-flex;align-items:center;gap:8px;border-radius:999px!important;padding:4px 14px 4px 4px!important;background:#0B4057!important;color:#FFFCF5!important;border-color:#0B4057!important}',
    '.mama-talk-button img{width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #E3CAA0}',
    '.mama-talk-button[data-talk-state=listening],.mama-talk-button[data-talk-state=speaking]{background:#93601F!important;border-color:#93601F!important}'
  ].join('\n');
  document.head.appendChild(style);

  function loadLibrary() {
    if (window.ElevenLabsClient) return Promise.resolve(window.ElevenLabsClient);
    if (!library) library = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = LIBRARY;
      script.onload = function () { resolve(window.ElevenLabsClient); };
      script.onerror = function () { library = null; reject(new Error('library')); };
      document.head.appendChild(script);
    });
    return library;
  }

  function setState(state, words) {
    targets.forEach(function (target) {
      target.dataset.talkState = state;
      target.setAttribute('aria-pressed', state === 'listening' || state === 'speaking' ? 'true' : 'false');
      var label = target.querySelector('.mama-talk-label');
      if (label) label.textContent = state === 'idle' ? 'Talk with Mama' : (state === 'connecting' ? 'Mama is coming…' : 'Tap to say goodbye');
    });
    statusEls.forEach(function (el) { el.textContent = words; });
  }

  async function toggle() {
    if (starting) return;
    if (conversation) {
      var ending = conversation; conversation = null;
      setState('idle', WORDS.goodbye);
      try { await ending.endSession(); } catch (e) {}
      return;
    }
    starting = true;
    setState('connecting', WORDS.connecting);
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(function (track) { track.stop(); });
      var client = await loadLibrary();
      conversation = await client.Conversation.startSession({
        agentId: AGENT_ID,
        connectionType: 'websocket',
        onConnect: function () { setState('listening', WORDS.listening); },
        onDisconnect: function () { if (conversation) { conversation = null; setState('idle', WORDS.goodbye); } },
        onError: function () { conversation = null; setState('idle', WORDS.error); },
        onModeChange: function (change) {
          if (!conversation) return;
          if (change.mode === 'speaking') setState('speaking', WORDS.speaking);
          else setState('listening', WORDS.listening);
        }
      });
    } catch (error) {
      conversation = null;
      setState('idle', error && (error.name === 'NotAllowedError' || error.name === 'NotFoundError') ? WORDS.mic : WORDS.error);
    } finally { starting = false; }
  }

  function setUp() {
    targets = Array.prototype.slice.call(document.querySelectorAll('[data-talk-to-mama]'));
    // Pages without Mama's big picture (like the card designer) get a small Talk with Mama button in the top menu.
    if (!targets.length) {
      var nav = document.querySelector('.designer-header .header-tools') || document.querySelector('.designer-header nav');
      if (!nav) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'mama-talk-button';
      button.setAttribute('data-talk-to-mama', '');
      button.innerHTML = '<img src="mama.jpg" alt=""><span class="mama-talk-label">Talk with Mama</span>';
      nav.appendChild(button);
      var live = document.createElement('span');
      live.className = 'visually-hidden';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      nav.appendChild(live);
      targets = [button];
    }
    statusEls = Array.prototype.slice.call(document.querySelectorAll('[data-talk-status]'));
    if (!statusEls.length) statusEls = Array.prototype.slice.call(document.querySelectorAll('.designer-header [role=status]'));
    targets.forEach(function (target) { target.addEventListener('click', toggle); });
    setState('idle', WORDS.idle);
    window.addEventListener('pagehide', function () { if (conversation) conversation.endSession(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setUp);
  else setUp();
})();
