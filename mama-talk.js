// Talk with Mama: tap Mama's face to start a voice conversation, tap again to say goodbye.
// Replaces the ElevenLabs corner box. A consent notice must be accepted first; the talking library only loads after that.
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
    error: "Mama couldn't come to the phone just now. Please try again.",
    declined: "That's alright, baby. Tap Mama's face if you change your mind."
  };
  var conversation = null, starting = false, library = null, targets = [], statusEls = [];
  // Visitors must tap Agree before the microphone or Mama starts. Bump CONSENT_VERSION if the notice changes.
  var CONSENT_KEY = 'mamaSaidConsent', CONSENT_VERSION = '2026-11-07';
  var consentGiven = false, consentBox = null;

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
    '.mama-consent{position:fixed;inset:0;margin:auto;height:fit-content;border:0;border-radius:22px;padding:0;max-width:min(30em,calc(100vw - 32px));background:#FFFCF5;color:#15394A;box-shadow:0 20px 60px #072f4366;font-size:18px;line-height:1.5}',
    '.mama-consent::backdrop{background:#072f43b3}',
    '.mama-consent .mc-in{padding:24px 24px 20px;max-height:80vh;overflow:auto}',
    '.mama-consent img{width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #E3CAA0;display:block;margin:0 auto 10px}',
    '.mama-consent h2{margin:0 0 10px;text-align:center;color:#0B4057;font-size:24px}',
    '.mama-consent p{margin:0 0 10px}',
    '.mama-consent a{color:#14788A;font-weight:700}',
    '.mama-consent .mc-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:16px}',
    '.mama-consent button{font:inherit;font-weight:700;border-radius:999px;padding:12px 26px;cursor:pointer;border:2px solid #0B4057}',
    '.mama-consent .mc-agree{background:#0B4057;color:#FFFCF5}',
    '.mama-consent .mc-no{background:transparent;color:#0B4057}',
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

  function hasConsent() {
    if (consentGiven) return true;
    try { return localStorage.getItem(CONSENT_KEY) === CONSENT_VERSION; } catch (e) { return false; }
  }

  function saveConsent() {
    consentGiven = true;
    try { localStorage.setItem(CONSENT_KEY, CONSENT_VERSION); } catch (e) {}
  }

  // Shows the notice and calls done(true) only when the visitor taps Agree.
  function askConsent(done) {
    if (!consentBox) {
      consentBox = document.createElement('dialog');
      consentBox.className = 'mama-consent';
      consentBox.setAttribute('aria-labelledby', 'mama-consent-title');
      consentBox.innerHTML =
        '<div class="mc-in"><img src="mama.jpg" alt="">' +
        '<h2 id="mama-consent-title">Before we talk, baby</h2>' +
        '<p>Welcome to Mama Said! Here\'s a little information about your privacy.</p>' +
        '<p>Mama Said uses AI technology powered by ElevenLabs. When you talk with Mama, your voice conversation is recorded, processed and stored to provide this service.</p>' +
        '<p>By tapping <strong>Agree</strong>, you consent to this as described in our <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</p>' +
        '<p>If you prefer not to have your conversation recorded, tap <strong>No thanks</strong>. You can still make cards without talking to Mama.</p>' +
        '<div class="mc-btns"><button type="button" class="mc-no">No thanks</button><button type="button" class="mc-agree">Agree</button></div></div>';
      document.body.appendChild(consentBox);
    }
    var agree = consentBox.querySelector('.mc-agree'), no = consentBox.querySelector('.mc-no');
    function finish(ok) {
      agree.onclick = no.onclick = null; consentBox.oncancel = null;
      if (consentBox.open) consentBox.close();
      done(ok);
    }
    agree.onclick = function () { saveConsent(); finish(true); };
    no.onclick = function () { finish(false); };
    consentBox.oncancel = function (e) { e.preventDefault(); finish(false); };
    if (consentBox.showModal) consentBox.showModal(); else consentBox.setAttribute('open', '');
    agree.focus();
  }

  function onTap() {
    if (conversation || starting || hasConsent()) { toggle(); return; }
    askConsent(function (ok) {
      if (ok) toggle();
      else setState('idle', WORDS.declined);
    });
  }

  async function toggle() {
    if (starting) return;
    if (conversation) {
      var ending = conversation; conversation = null;
      setState('idle', WORDS.goodbye);
      try { await ending.endSession(); } catch (e) {}
      return;
    }
    if (!hasConsent()) return; // never start without Agree
    starting = true;
    setState('connecting', WORDS.connecting);
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(function (track) { track.stop(); });
      var client = await loadLibrary();
      conversation = await client.Conversation.startSession({
        agentId: AGENT_ID,
        connectionType: 'websocket',
        // These tools run only in the card designer; other pages return a safe message.
        // Names must match Client tools configured in the ElevenLabs agent.
        clientTools: Object.fromEntries([
          'get_card_options', 'guide_card_step', 'select_card_style',
          'select_card_picture', 'write_card_message'
        ].map(function (name) {
          return [name, function (params) {
            var actions = window.MamaSaidCardTools;
            if (!actions || typeof actions[name] !== 'function')
              return {ok:false,message:'Open the card designer first to use this action.'};
            return actions[name](params || {});
          }];
        })),
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
    targets.forEach(function (target) { target.addEventListener('click', onTap); });
    setState('idle', WORDS.idle);
    window.addEventListener('pagehide', function () { if (conversation) conversation.endSession(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setUp);
  else setUp();
})();
