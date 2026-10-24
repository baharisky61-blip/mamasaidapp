// Mama's voice switch. Set MAMA_VOICE_ON to true when ElevenLabs credits are available.
window.MAMA_VOICE_ON = true;
window.MAMA_AGENT_ID = 'agent_5601m50qpec0exstzb42a0cqp2yp';
(function () {
  if (window.MAMA_VOICE_ON) {
    document.documentElement.classList.add('voice-on');
    // Tap Mama's face to talk (mama-talk.js). The old ElevenLabs corner box is no longer used.
    var script = document.createElement('script');
    script.src = 'mama-talk.js?v=2';
    script.defer = true;
    document.head.appendChild(script);
  } else {
    document.documentElement.classList.add('voice-off');
  }
  var style = document.createElement('style');
  style.textContent = '.voice-off .voice-only{display:none!important}.voice-on .voice-soon{display:none!important}.voice-off [data-talk-to-mama]{cursor:default}';
  document.head.appendChild(style);
})();
