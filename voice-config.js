// Mama's voice switch. Set MAMA_VOICE_ON to true when ElevenLabs credits are available.
window.MAMA_VOICE_ON = true;
(function () {
  if (window.MAMA_VOICE_ON) {
    document.documentElement.classList.add('voice-on');
    var widget = document.createElement('elevenlabs-convai');
    widget.setAttribute('agent-id', 'agent_5601m50qpec0exstzb42a0cqp2yp');
    // Words on Mama's talk box (instead of ElevenLabs' "Need help? / Start a call").
    widget.setAttribute('action-text', 'Talk with Mama');
    widget.setAttribute('start-call-text', "Say what's on your heart");
    widget.setAttribute('end-call-text', 'Goodbye for now');
    document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(widget); });
    var script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    document.head.appendChild(script);
  } else {
    document.documentElement.classList.add('voice-off');
  }
  var style = document.createElement('style');
  style.textContent = '.voice-off .voice-only{display:none!important}.voice-on .voice-soon{display:none!important}';
  document.head.appendChild(style);
})();
