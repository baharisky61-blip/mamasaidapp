// Mama's voice switch. Set MAMA_VOICE_ON to true when ElevenLabs credits are available.
window.MAMA_VOICE_ON = true;
// "Mama Said APP copy" — the agent that has the five card tools.
window.MAMA_AGENT_ID = 'agent_1201m74jecrnfxcre6anfb5abbye';
(function () {
  if (window.MAMA_VOICE_ON) {
    document.documentElement.classList.add('voice-on');
    // Tap Mama's face to talk (mama-talk.js). The old ElevenLabs corner box is no longer used.
    var script = document.createElement('script');
    script.src = 'mama-talk.js?v=4';
    script.defer = true;
    document.head.appendChild(script);
  } else {
    document.documentElement.classList.add('voice-off');
  }
  var style = document.createElement('style');
  style.textContent = '.voice-off .voice-only{display:none!important}.voice-on .voice-soon{display:none!important}.voice-off [data-talk-to-mama]{cursor:default}';
  document.head.appendChild(style);
})();
