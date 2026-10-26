'use strict';
// Mama Said card designer — one page (Oct 2026).
// Everything a customer makes stays in their own browser (IndexedDB): words, picture, sound, and My Cards.
(() => {
  const $ = id => document.getElementById(id);
  const card = $('card');

  /* ---------- Data ---------- */
  const styles = [
    {id:'lotus', name:'Lotus on water', bg:"url('assets/lotus-water.png')", ink:'dark', full:false},
    {id:'pearl', name:'Pearl silk', bg:'linear-gradient(135deg,#fffaf2 0%,#efe2cf 38%,#fffdf8 62%,#e7d6bf 100%)', ink:'dark', full:true},
    {id:'ocean', name:'Deep ocean', bg:'radial-gradient(circle at 28% 18%,#2a8199 0%,#0b4057 52%,#06283a 100%)', ink:'light', full:true},
    {id:'gold', name:'Soft gold', bg:'linear-gradient(135deg,#b4843f 0%,#f0d49a 38%,#c4954f 68%,#f6e4bb 100%)', ink:'dark', full:true},
    {id:'ivory', name:'Ivory white', bg:'radial-gradient(circle at 50% 40%,#ffffff 0%,#f6f1e9 60%,#ebe2d4 100%)', ink:'dark', full:true},
    {id:'royal', name:'Royal blue', bg:'radial-gradient(circle at 72% 62%,#8dbbff 0%,#2350b9 45%,#0c2163 100%)', ink:'light', full:true}
  ];
  const cardPictures = [
    ['lotus-grandma-card','Lotus grandma',true],['family-smiles','Family smiles'],['sunset-family','Sunset family'],['candlelight-couple','Candlelight couple'],['candlelit-table','Candlelit table'],['cookout','Cookout'],['grandparents-couch','Grandparents'],['three-generations','Three generations'],['comfort-embrace','Comfort'],['white-lilies','White lilies'],['peaceful-beach','Peaceful beach'],['cozy-fireplace','Cozy fireplace'],['cozy-couch','Cozy couch'],['sunny-living-room','Sunny living room'],['garden-retreat','Garden retreat'],['candle-branch','Candle and branch'],['candle-window','Candle by the window'],['bride-roses','Bride in roses'],['bride-garden','Bride in the garden'],['flower-arch','White flower arch'],['wedding-cake','Wedding cake'],['candlelit-canopy','Candlelit canopy'],['garden-party-lights','Garden party'],['golden-hour-beauty','Golden hour beauty'],['golden-mermaid','Golden mermaid'],['silver-mermaid','Silver mermaid'],['space-queen','Space queen'],['cuddle-candlelight','Cuddle by candlelight'],['flowers-for-you','Flowers for you'],['i-love-you-roses','I love you roses'],['wildflower-path','Wildflower path'],['happy-friends','Happy friends'],['jelly-buddies','Jelly buddies'],['just-checking-in','Just checking in'],['grandma-tea-window','Grandma with tea'],['tea-with-friends','Tea with friends'],['warm-tea-hands','Warm tea'],['held-in-comfort','Held in comfort'],['helping-hand','Helping hand'],['royal-blue-couple','Royal blue couple'],['elegant-evening','Elegant evening'],['glowing-rose','Glowing rose'],['golden-goddess','Golden goddess'],['royal-couple','Royal couple'],['golden-years-love','Golden years love'],['slow-dance','Slow dance'],['sunset-embrace','Sunset embrace'],['paris-evening','Paris evening'],['lantern-walk','Lantern walk'],['golden-field-walk','Golden field walk'],['starry-camp','Starry campout'],['candlelit-bath','Candlelit bath'],['doves-birdbath','Doves in love'],['doves-branch','Doves on a branch'],['doves-lantern','Doves by lantern'],['red-roses','Red roses'],['ring-box','Ring box'],['two-mugs','Two mugs'],['porch-rockers','Porch rockers'],['sistas-laughing','Sistas laughing'],['morning-park','Morning park'],['golden-afro-combs','Golden afro combs'],['golden-bloom','Golden bloom'],['jeweled-mandala','Jeweled mandala'],['starry-night','Starry night'],['football-field','Football field'],['stadium-lights','Stadium lights'],['baseball-diamond','Baseball diamond'],['ballpark-grass','Ballpark'],['basketball-sunset','Basketball sunset'],['neighborhood-court','Neighborhood court'],['star-gold','Gold star'],['star-silver','Silver star'],['star-pink','Pink star'],['star-soft-pink','Soft pink star'],['star-red','Red star'],['star-purple','Purple star'],['star-blue','Blue star'],['star-sky-blue','Sky blue star'],['star-green','Green star']
  ].map(([file,name,art]) => ({file,name,art:!!art}));
  // Ready-made cards in Mama's voice, built from Nelcea's own sayings. No holidays.
  const quickCards = [
    {group:'Encouragement', title:"You've Got This, Baby", message:"Honey, you got all that experience. There's got to be something in there you can do. Your brain already knows what you need. Go on, baby. I believe in you."},
    {group:'Encouragement', title:'Keep Going', message:"We don't fail, we just experience them. Then we look back and decide what to do different. Every day you wake up with new thoughts, so use them."},
    {group:'Appreciation', title:'I Appreciate You', message:"I appreciate you. You good peoples, and I see everything you do. Nobody can be mad at your gratitude, so here's mine."},
    {group:'Appreciation', title:'Thank You, Sistah', message:"Thank you for the heart you pour into everything you do. I know that's right! I appreciate you more than you know."},
    {group:'Proud of You', title:'Let Your Light Shine', message:"Let your light shine, baby! Look what you were able to do. I'm so proud of you, and I'm so thankful."},
    {group:'Proud of You', title:'Celebrate You', message:"Let's get it! You did that. Celebrate you today, because you earned it."},
    {group:'New Beginnings', title:'A Fresh Start', message:"Every day you wake up with new thoughts, so use them. Piece by piece, you're building something beautiful."},
    {group:'New Beginnings', title:'Let It Go', message:"Let it go, baby. Move on. What's ahead of you is better than what's behind you, and I'll be there cheering you on."},
    {group:'Family', title:'Grandma Loves You', message:"Grandma loves you so much, baby. You make my heart so happy. I'll be there for you, always."},
    {group:'Family', title:'Family Is Everything', message:"My brother, my sister, my cousin. Family is everything. I appreciate you, and I'll be there."},
    {group:'Friendship', title:'You Good Peoples', message:"Girl, you know you my sistah. You good peoples, and I appreciate you. I'll be there, always."},
    {group:'Friendship', title:"What's Going On?", message:"What's going on? Talk to me about that. I'm here, and I'll be there."},
    {group:'Thinking of You', title:'Thinking of You', message:"You were on my mind today, baby. I just wanted you to know somebody loves you."},
    {group:"You're Not Alone", title:"You're Not Alone", message:"Loneliness is part of life. But when you're sad, get around people. A walk in the mall, a funny podcast, dancing by yourself breaks the spell. And call me. I'll be there."},
    {group:'Just Because', title:'Just Because', message:"No reason. Just because. I appreciate you, baby. Celebrate you."},
    {group:'Just Because', title:'Stay Humble', message:"Stay humble, keep your energy right, and protect your boundaries. You're doing better than you think."}
  ];
  const suggestions = [
    {name:'Encouragement', words:"Honey, you got all that experience. There's got to be something in there you can do. Your brain already knows what you need. But first, you have to accept that you need it."},
    {name:'Proud of You', words:"Let your light shine, baby! Look what you were able to do. I'm so proud of you, and I'm so thankful."},
    {name:'New Beginnings', words:"We don't fail, we just experience them. Then we look back and decide what to do different. Every day you wake up with new thoughts, so use them."},
    {name:'Just Because', words:"No reason. Just because. I appreciate you, baby. Celebrate you."},
    {name:'Thinking of You', words:"You were on my mind today, baby. When you're feeling low, get around people. A walk in the mall, a funny podcast, dancing by yourself breaks the spell."},
    {name:"You're Not Alone", words:"Loneliness is part of life. But when you're sad, get around people. And call me. I'll be there."},
    {name:'Gratitude', words:"I appreciate you. Nobody can be mad at your gratitude, so here's mine."},
    {name:'Family', words:"I was thinking about my family today, and you came right to my heart. I appreciate you, and I'll be there."},
    {name:'Friendship', words:"What's going on? Talk to me about that. You good peoples, and I'll be there."},
    {name:'Good News', words:"Let your light shine, baby! Look what you were able to do. I'm so thankful, and I'm celebrating you."}
  ];

  /* ---------- Draft ---------- */
  const fresh = () => ({version:3, title:'A note for you', message:'', style:'lotus', image:null, imageName:'', pictureIndex:-1, art:false, ink:'dark', size:'normal', place:'bottom', mama:false, sound:null, soundName:'', soundKind:''});
  let draft = fresh();
  let db = null;
  const MAX_IMAGE = 10 * 1024 * 1024, MAX_SOUND = 15 * 1024 * 1024;
  const say = (id, text) => { const el = $(id); if (el.textContent !== text) el.textContent = text; };

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('mama-said-card-designer', 2);
      const timer = setTimeout(() => reject(Error('timeout')), 5000);
      request.onupgradeneeded = () => {
        const store = request.result;
        if (!store.objectStoreNames.contains('drafts')) store.createObjectStore('drafts');
        if (!store.objectStoreNames.contains('saved')) store.createObjectStore('saved', {keyPath:'id'});
      };
      request.onsuccess = () => { clearTimeout(timer); resolve(request.result); };
      request.onerror = request.onblocked = () => { clearTimeout(timer); reject(Error('unavailable')); };
    });
  }
  const tx = (store, mode, work) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode); const result = work(t.objectStore(store));
    t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
    t.onerror = t.onabort = () => reject(t.error || Error('failed'));
  });

  // Older drafts (the four-step designer) keep their words, picture, and Mama setting.
  function readStored(value) {
    if (!value || typeof value !== 'object') return null;
    const d = fresh();
    if (typeof value.title === 'string') d.title = value.title.slice(0, 80);
    if (typeof value.message === 'string') d.message = value.message.slice(0, 500);
    if (value.image instanceof Blob && value.image.size <= MAX_IMAGE) { d.image = value.image; d.imageName = typeof value.imageName === 'string' ? value.imageName : 'Your picture'; }
    if (typeof value.mama === 'boolean') d.mama = value.version === 3 ? value.mama : false;
    if (value.version === 3) {
      if (styles.some(s => s.id === value.style)) d.style = value.style;
      if (Number.isInteger(value.pictureIndex)) d.pictureIndex = value.pictureIndex;
      d.art = !!value.art && !!d.image;
      if (['dark','light'].includes(value.ink)) d.ink = value.ink;
      if (['normal','large'].includes(value.size)) d.size = value.size;
      if (['left','right','bottom'].includes(value.place)) d.place = value.place;
      if (value.sound instanceof Blob && value.sound.size <= MAX_SOUND) { d.sound = value.sound; d.soundName = String(value.soundName || 'Your sound'); d.soundKind = value.soundKind === 'voice' ? 'voice' : 'music'; }
    } else {
      const map = {ocean:'ocean', turquoise:'ocean', plum:'royal', gold:'gold', champagne:'gold', pearl:'pearl', ivory:'ivory', blush:'pearl', rosewood:'gold'};
      d.style = value.artwork === 'lotus' ? 'lotus' : (map[value.color] || 'lotus');
      d.ink = styles.find(s => s.id === d.style).ink;
    }
    return d;
  }

  let saveTimer = null, saving = Promise.resolve();
  function save() {
    render();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!db) { say('save-status', 'Your card is on this page only. This browser is not saving drafts.'); return; }
      const snapshot = {...draft};
      saving = saving.then(() => tx('drafts', 'readwrite', s => s.put(snapshot, 'current')))
        .then(() => say('save-status', 'Draft saved in this browser.'))
        .catch(() => say('save-status', 'Your draft could not be saved in this browser. Keep this page open.'));
    }, 250);
  }

  /* ---------- Drawing the card ---------- */
  let imageURL = null, soundURL = null;
  function splitTitle(title) {
    const words = title.trim().split(/\s+/).filter(Boolean);
    if (words.length < 3) return ['', words.join(' ')];
    const cut = Math.floor(words.length / 2);
    return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
  }
  function render() {
    const style = styles.find(s => s.id === draft.style) || styles[0];
    const picture = !!draft.image;
    const [top, script] = splitTitle(draft.title || 'A note for you');
    $('card-top').textContent = top;
    $('card-script').textContent = script;
    $('card-message-text').textContent = draft.message || 'Your message will appear here, right on the card.';
    $('card-message-text').classList.toggle('placeholder', !draft.message);
    card.style.backgroundImage = picture ? `url("${imageURL}")` : style.bg;
    card.className = ['card', `ink-${draft.ink}`, `size-${draft.size}`, `place-${draft.place}`, !picture && style.full ? 'full-style' : '', picture ? 'has-picture' : '', picture && draft.art ? 'art-card' : ''].join(' ').replace(/\s+/g, ' ').trim();
    $('card-mama').hidden = !draft.mama;
    $('card-sound-chip').hidden = !draft.sound;
    updateSendHint();
    $('show-mama').checked = draft.mama;
    document.querySelectorAll('.style-tile').forEach(tile => tile.setAttribute('aria-checked', String(!picture && tile.dataset.style === draft.style)));
    document.querySelectorAll('.picture-tile').forEach(tile => tile.setAttribute('aria-pressed', String(picture && Number(tile.dataset.index) === draft.pictureIndex)));
    document.querySelectorAll('[data-ink]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ink === draft.ink)));
    document.querySelectorAll('[data-size]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === draft.size)));
    document.querySelectorAll('[data-place]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.place === draft.place)));
    say('title-count', `${draft.title.length}/80`);
    say('message-count', `${draft.message.length}/500`);
    say('image-name', draft.image && draft.pictureIndex < 0 ? draft.imageName : 'No file chosen');
    card.setAttribute('aria-label', `Card preview: ${draft.title || 'A note for you'}. ${draft.message}`);
    fitWords();
  }
  // Long messages get a little smaller so every word stays on the card.
  function fitWords() {
    const words = card.querySelector('.card-words'), message = $('card-message-text');
    message.style.fontSize = '';
    let size = parseFloat(getComputedStyle(message).fontSize), floor = card.clientWidth * 0.022;
    while (words.scrollHeight > words.clientHeight + 1 && size > floor) { size -= 0.5; message.style.fontSize = `${size}px`; }
  }
  let imageWide = false;
  // When a new photo goes on the card, pick light or dark words to match the picture where the words sit.
  function setImageURL(chooseInk = false) {
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = draft.image ? URL.createObjectURL(draft.image) : null;
    imageWide = false;
    if (imageURL) { const probe = new Image(); const url = imageURL; probe.onload = () => {
      if (url !== imageURL) return;
      imageWide = probe.naturalWidth / probe.naturalHeight > 8 / 7;
      if (chooseInk && !draft.art) {
        try {
          const c = document.createElement('canvas'); c.width = 40; c.height = 35; const g = c.getContext('2d');
          g.drawImage(probe, 0, 0, 40, 35);
          const area = draft.place === 'bottom' ? [0, 22, 40, 13] : draft.place === 'right' ? [20, 0, 20, 35] : [0, 0, 20, 35];
          const d = g.getImageData(...area).data; let sum = 0;
          for (let i = 0; i < d.length; i += 4) sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
          draft.ink = sum / (d.length / 4) < 0.58 ? 'light' : 'dark'; save();
        } catch {}
      }
      render(); }; probe.src = url; }
  }
  function setSound() {
    if (soundURL) URL.revokeObjectURL(soundURL);
    soundURL = draft.sound ? URL.createObjectURL(draft.sound) : null;
    $('sound-box').hidden = !draft.sound;
    if (draft.sound) { $('sound-player').src = soundURL; say('sound-name', `${draft.soundKind === 'voice' ? '🎙 Your voice' : '♪ Your music'}: ${draft.soundName}`); }
    else $('sound-player').removeAttribute('src');
  }
  function populate() {
    $('card-title').value = draft.title;
    $('card-message').value = draft.message;
    setImageURL(); setSound(); render();
  }

  /* ---------- Controls ---------- */
  $('card-title').addEventListener('input', e => { draft.title = e.target.value; save(); });
  $('card-message').addEventListener('input', e => { draft.message = e.target.value; save(); });
  $('show-mama').addEventListener('change', e => { draft.mama = e.target.checked; save(); });
  document.querySelectorAll('[data-ink]').forEach(b => b.addEventListener('click', () => { draft.ink = b.dataset.ink; save(); }));
  document.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => { draft.size = b.dataset.size; save(); }));
  document.querySelectorAll('[data-place]').forEach(b => b.addEventListener('click', () => { draft.place = b.dataset.place; if (draft.image && !draft.art) setImageURL(true); save(); }));

  styles.forEach(style => {
    const tile = document.createElement('button');
    tile.type = 'button'; tile.className = 'style-tile'; tile.dataset.style = style.id;
    tile.setAttribute('role', 'radio'); tile.setAttribute('aria-label', style.name); tile.title = style.name;
    tile.style.backgroundImage = style.bg;
    tile.addEventListener('click', () => { draft.style = style.id; draft.image = null; draft.imageName = ''; draft.pictureIndex = -1; draft.art = false; draft.ink = style.ink; setImageURL(); save(); });
    $('style-tiles').append(tile);
  });

  function pictureButton(picture, index) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'picture-tile'; button.dataset.index = index;
    button.setAttribute('aria-label', `Use the ${picture.name} picture`);
    const img = document.createElement('img'); img.src = `assets/cards/${picture.file}.jpg`; img.alt = ''; img.loading = 'lazy';
    const label = document.createElement('span'); label.textContent = picture.name;
    button.append(img, label);
    button.addEventListener('click', () => usePicture(index));
    return button;
  }
  let pictureVersion = 0;
  async function usePicture(index, quiet = false) {
    const picture = cardPictures[(index + cardPictures.length) % cardPictures.length];
    index = cardPictures.indexOf(picture);
    const version = ++pictureVersion;
    try {
      const response = await fetch(`assets/cards/${picture.file}.jpg`);
      if (!response.ok) throw Error('missing');
      const blob = await response.blob();
      if (version !== pictureVersion) return;
      draft.image = new Blob([blob], {type:'image/jpeg'}); draft.imageName = picture.name; draft.pictureIndex = index; draft.art = picture.art; draft.ink = 'dark';
      setImageURL(true); save();
      if (!quiet) say('card-status', `${picture.name} is on your card.`);
    } catch { if (!quiet) say('card-status', 'That picture could not load. Please try again.'); }
  }
  cardPictures.slice(0, 6).forEach((picture, index) => $('picture-grid').append(pictureButton(picture, index)));
  $('previous-picture').addEventListener('click', () => usePicture(draft.pictureIndex < 0 ? cardPictures.length - 1 : draft.pictureIndex - 1));
  $('next-picture').addEventListener('click', () => usePicture(draft.pictureIndex < 0 ? 0 : draft.pictureIndex + 1));

  $('card-image').addEventListener('change', async e => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size > MAX_IMAGE) { say('card-status', 'Please choose a JPEG, PNG, WebP, or GIF picture of 10 MB or less.'); return; }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      pictureVersion++;
      draft.image = file; draft.imageName = file.name; draft.pictureIndex = -1; draft.art = false;
      setImageURL(true); save(); say('card-status', 'Your picture is on your card.');
    } catch { say('card-status', 'That picture could not be read. Please choose another.'); }
    finally { URL.revokeObjectURL(url); }
  });

  /* ---------- Sound: their own music or their own voice ---------- */
  $('card-sound').addEventListener('change', e => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const isAudio = file.type.startsWith('audio/') || ['mp3','m4a','aac','wav','ogg','oga','flac','aif','aiff','caf','mp4'].includes(ext);
    if (!isAudio) { say('sound-status', 'That file is not music. Please choose a song file (like .mp3 or .m4a).'); return; }
    if (file.size > MAX_SOUND) { say('sound-status', 'That song is too big. Please choose one that is 15 MB or less.'); return; }
    draft.sound = file; draft.soundName = file.name; draft.soundKind = 'music';
    setSound(); save(); say('sound-status', 'Your music is on your card.');
  });
  (function () {
    const chip = $('card-sound-chip'), player = $('sound-player');
    const label = () => { chip.textContent = player.paused ? '\u25B6 Play sound' : '\u275A\u275A Pause'; };
    chip.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (!player.src) return;
      if (player.paused) player.play().catch(() => {}); else player.pause();
    });
    ['play','pause','ended','emptied'].forEach(ev => player.addEventListener(ev, label));
  })();
  let recorder = null, recordTimer = null;
  $('record-voice').addEventListener('click', async () => {
    const button = $('record-voice');
    if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
    if (!window.MediaRecorder || !navigator.mediaDevices) { say('sound-status', 'This browser cannot record. Try Chrome or Safari, or upload a sound instead.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const type = ['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '';
      const chunks = [];
      recorder = new MediaRecorder(stream, type ? {mimeType:type} : undefined);
      recorder.ondataavailable = ev => { if (ev.data.size) chunks.push(ev.data); };
      recorder.onstop = () => {
        clearInterval(recordTimer); stream.getTracks().forEach(t => t.stop());
        button.classList.remove('recording'); button.textContent = '● Record My Voice';
        const blob = new Blob(chunks, {type: recorder.mimeType || 'audio/webm'});
        if (!blob.size) { say('sound-status', 'Nothing was recorded. Please try again.'); return; }
        const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
        draft.sound = blob; draft.soundName = `my-voice.${ext}`; draft.soundKind = 'voice';
        setSound(); save(); say('sound-status', 'Your voice is on your card. Press play to listen.');
      };
      recorder.start();
      let seconds = 0;
      button.classList.add('recording'); button.textContent = '■ Stop Recording';
      say('sound-status', 'Recording… speak from your heart. Tap Stop Recording when you are done.');
      recordTimer = setInterval(() => { seconds++; say('sound-status', `Recording… ${seconds} seconds. Tap Stop Recording when you are done.`); if (seconds >= 120) recorder.stop(); }, 1000);
    } catch { say('sound-status', 'Please allow the microphone to record your voice, then try again.'); }
  });
  $('remove-sound').addEventListener('click', () => { draft.sound = null; draft.soundName = ''; draft.soundKind = ''; setSound(); save(); say('sound-status', 'Sound removed.'); });
  const fileName = (suffix = '') => ((draft.title.trim() || 'mama-said-card').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'mama-said-card') + suffix;
  function downloadBlob(blob, name) {
    const link = document.createElement('a'); link.download = name; link.href = URL.createObjectURL(blob);
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  }
  const soundFile = () => draft.sound ? new File([draft.sound], `${fileName(draft.soundKind === 'voice' ? '-my-voice' : '-music')}.${(draft.soundName.split('.').pop() || 'mp3').toLowerCase()}`, {type: draft.sound.type || 'audio/mpeg'}) : null;
  $('save-sound').addEventListener('click', () => { const file = soundFile(); if (file) { downloadBlob(file, file.name); say('sound-status', 'Your sound was saved. Look in your Downloads folder.'); } });

  /* ---------- Mama's Suggestions ---------- */
  let chosen = '';
  suggestions.forEach(s => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'suggestion'; button.textContent = s.name; button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => offer(s, button));
    $('suggestion-list').append(button);
  });
  function offer(s, button) {
    chosen = s.words; $('suggestion-words').textContent = s.words; $('suggestion-offer').hidden = false;
    document.querySelectorAll('.suggestion').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  }
  function addWords(words, where = 'card-status') {
    const next = draft.message + (draft.message ? '\n\n' : '') + words;
    if (next.length > 500) { say(where, 'Your message is full. Shorten it first, then add more.'); return false; }
    draft.message = next; $('card-message').value = next; save(); say(where, 'Added to your card. You can change any word.');
    return true;
  }
  $('add-suggestion').addEventListener('click', () => { if (chosen) addWords(chosen); });
  $('get-inspiration').addEventListener('click', () => {
    const buttons = [...document.querySelectorAll('.suggestion')];
    const pick = Math.floor(Math.random() * suggestions.length);
    offer(suggestions[pick], buttons[pick]);
    $('suggestion-offer').scrollIntoView({block:'nearest', behavior:'smooth'});
  });

  /* ---------- Drawers: Sayings, Occasions, Pictures, My Cards, Search ---------- */
  const drawer = $('drawer');
  let sayings = null, sayingsMeta = [];
  async function loadSayings() {
    if (sayings) return sayings;
    const response = await fetch('sayings.json', {cache:'no-cache'});
    const data = await response.json();
    if (!Array.isArray(data.sayings) || data.sayings.length !== 99) throw Error('incomplete');
    sayings = data.sayings; sayingsMeta = Array.isArray(data.metadata) ? data.metadata : [];
    return sayings;
  }
  function item(html) { const li = document.createElement('li'); li.className = 'drawer-item'; li.innerHTML = html; return li; }
  const esc = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function sayingItem(text, index) {
    const note = sayingsMeta[index]?.spellingNote;
    const li = item(`<small>Saying ${index + 1}${note ? ` · Note: ${esc(note)}` : ''}</small><p>${esc(text)}</p><button type="button" class="primary">Add to Card</button><span class="status" role="status"></span>`);
    li.querySelector('button').addEventListener('click', () => { const ok = addWords(text, 'card-status'); li.querySelector('.status').textContent = ok ? 'Added to your card.' : 'Your message is full.'; });
    return li;
  }
  function quickItem(q) {
    const li = item(`<small>${esc(q.group)}</small><h3>${esc(q.title)}</h3><p>${esc(q.message)}</p><button type="button" class="primary">Use This Card</button>`);
    li.querySelector('button').addEventListener('click', () => {
      if ((draft.message || (draft.title && draft.title !== 'A note for you')) && !confirm('Use this card? It replaces your title and message. Your picture stays.')) return;
      draft.title = q.title; draft.message = q.message; populate(); save(); closeDrawer(); say('card-status', `"${q.title}" is on your card.`);
    });
    return li;
  }
  const views = {
    async sayings(body) {
      body.innerHTML = '<label for="sayings-search">Search Mama\'s Sayings</label><input id="sayings-search" type="search" autocomplete="off"><p class="status" id="sayings-count" role="status"></p><ul class="drawer-list" id="sayings-list"></ul>';
      try {
        await loadSayings();
        const show = () => {
          const q = $('sayings-search').value.toLowerCase();
          const list = $('sayings-list'); list.replaceChildren();
          sayings.forEach((text, i) => { if (`${i + 1} ${text}`.toLowerCase().includes(q)) list.append(sayingItem(text, i)); });
          $('sayings-count').textContent = `${list.children.length} of 99 sayings`;
        };
        $('sayings-search').addEventListener('input', show); show();
      } catch { body.innerHTML = '<p class="empty-note">Mama\'s Sayings could not open just now. Please close and try again.</p>'; }
      return "Mama's Sayings";
    },
    occasions(body) {
      const list = document.createElement('ul'); list.className = 'drawer-list';
      let group = '';
      quickCards.forEach(q => { if (q.group !== group) { group = q.group; const h = document.createElement('li'); h.className = 'drawer-group'; h.textContent = group; list.append(h); } list.append(quickItem(q)); });
      body.replaceChildren(list);
      return 'Occasions';
    },
    pictures(body) {
      const grid = document.createElement('div'); grid.className = 'picture-grid';
      cardPictures.forEach((p, i) => { const b = pictureButton(p, i); b.addEventListener('click', closeDrawer); grid.append(b); });
      body.replaceChildren(grid); render();
      return `Card Pictures (${cardPictures.length})`;
    },
    async 'my-cards'(body) {
      if (!db) { body.innerHTML = '<p class="empty-note">This browser is not saving cards, so My Cards is empty.</p>'; return 'My Cards'; }
      const cards = (await tx('saved', 'readonly', s => s.getAll())).sort((a, b) => b.savedAt - a.savedAt);
      if (!cards.length) { body.innerHTML = '<p class="empty-note">No saved cards yet. Tap "Save to My Cards" under your card to keep it here.</p>'; return 'My Cards'; }
      const list = document.createElement('ul'); list.className = 'drawer-list';
      cards.forEach(saved => {
        const li = item(`<div class="saved-card"><span class="thumb"></span><div><h3>${esc(saved.draft.title || 'A note for you')}</h3><small>Saved ${new Date(saved.savedAt).toLocaleDateString()}</small><div class="actions"><button type="button" class="primary">Open</button><button type="button" class="outline">Delete</button></div></div></div>`);
        const thumb = li.querySelector('.thumb');
        if (saved.draft.image) { const u = URL.createObjectURL(saved.draft.image); thumb.style.backgroundImage = `url("${u}")`; }
        else thumb.style.backgroundImage = (styles.find(s => s.id === saved.draft.style) || styles[0]).bg;
        const [open, remove] = li.querySelectorAll('button');
        open.addEventListener('click', () => { draft = readStored(saved.draft) || fresh(); populate(); save(); closeDrawer(); say('card-status', `"${draft.title}" is open.`); });
        remove.addEventListener('click', async () => { if (!confirm('Delete this saved card? This cannot be undone.')) return; await tx('saved', 'readwrite', s => s.delete(saved.id)); li.remove(); });
        list.append(li);
      });
      body.replaceChildren(list);
      return 'My Cards';
    },
    async search(body, query) {
      const q = query.trim().toLowerCase();
      const list = document.createElement('ul'); list.className = 'drawer-list';
      const heading = text => { const h = document.createElement('li'); h.className = 'drawer-group'; h.textContent = text; list.append(h); };
      const occ = quickCards.filter(c => `${c.group} ${c.title} ${c.message}`.toLowerCase().includes(q));
      if (occ.length) { heading('Occasions'); occ.forEach(c => list.append(quickItem(c))); }
      const pics = cardPictures.map((p, i) => [p, i]).filter(([p]) => p.name.toLowerCase().includes(q));
      if (pics.length) { heading('Pictures'); const grid = document.createElement('li'); grid.className = 'picture-grid'; pics.forEach(([p, i]) => { const b = pictureButton(p, i); b.addEventListener('click', closeDrawer); grid.append(b); }); list.append(grid); }
      try { await loadSayings(); const found = sayings.map((t, i) => [t, i]).filter(([t]) => t.toLowerCase().includes(q)); if (found.length) { heading("Mama's Sayings"); found.forEach(([t, i]) => list.append(sayingItem(t, i))); } } catch {}
      if (!list.children.length) body.innerHTML = '<p class="empty-note">Nothing matched. Try other words, like "family" or "proud".</p>';
      else { body.replaceChildren(list); render(); }
      return `Search: "${query.trim()}"`;
    }
  };
  let lastOpener = null;
  async function openDrawer(name, arg, opener) {
    lastOpener = opener || document.activeElement;
    const body = $('drawer-body'); body.replaceChildren();
    $('drawer-title').textContent = 'Opening…';
    if (!drawer.open) drawer.showModal();
    $('drawer-title').textContent = await views[name](body, arg);
    (body.querySelector('input') || $('close-drawer')).focus();
  }
  function closeDrawer() { if (drawer.open) drawer.close(); }
  drawer.addEventListener('close', () => { if (lastOpener && lastOpener.focus) lastOpener.focus(); });
  drawer.addEventListener('click', e => { if (e.target === drawer) closeDrawer(); });
  $('close-drawer').addEventListener('click', closeDrawer);
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openDrawer(b.dataset.open, null, b)));
  $('search-form').addEventListener('submit', e => { e.preventDefault(); const q = $('site-search').value; if (q.trim()) openDrawer('search', q, $('site-search')); });

  $('save-to-my-cards').addEventListener('click', async () => {
    if (!db) { say('card-status', 'This browser is not saving cards. Download your card instead.'); return; }
    try {
      const all = await tx('saved', 'readonly', s => s.getAll());
      if (all.length >= 30) { say('card-status', 'My Cards is full (30 cards). Delete one first.'); return; }
      await tx('saved', 'readwrite', s => s.put({id: `${Date.now()}`, savedAt: Date.now(), draft: {...draft}}));
      say('card-status', 'Saved to My Cards.');
    } catch { say('card-status', 'Your card could not be saved. Please try again.'); }
  });

  /* ---------- Zoom and Fit ---------- */
  function setZoom(on) { document.body.classList.toggle('zoomed', on); $('zoom-card').setAttribute('aria-pressed', String(on)); requestAnimationFrame(fitWords); }
  $('zoom-card').addEventListener('click', () => setZoom(!document.body.classList.contains('zoomed')));
  $('fit-card').addEventListener('click', () => { setZoom(false); $('card-stage').scrollIntoView({block:'center', behavior:'smooth'}); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('zoomed')) setZoom(false); });
  window.addEventListener('resize', () => requestAnimationFrame(fitWords));

  /* ---------- Download (phones get the Save or Send screen) ---------- */
  let pictureLibrary = null;
  const loadPictureLibrary = () => window.html2canvas ? Promise.resolve() : (pictureLibrary ||= new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = 'assets/html2canvas.min.js'; s.onload = resolve; s.onerror = () => { pictureLibrary = null; reject(Error('library')); }; document.head.append(s);
  }));
  const isPhone = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  async function cardPicture() {
    await loadPictureLibrary(); await document.fonts.ready;
    const zoomed = document.body.classList.contains('zoomed');
    if (zoomed) setZoom(false);
    card.classList.add('exporting');
    try {
      const canvas = await window.html2canvas(card, {scale: 1600 / card.clientWidth, backgroundColor: null, useCORS: true, logging: false});
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw Error('no picture');
      return blob;
    } finally { card.classList.remove('exporting'); if (zoomed) setZoom(true); }
  }
  const phoneSave = $('phone-save');
  let phoneFiles = [], phoneURL = null;
  function showPhoneSave(blob, video = false) {
    const ext = video ? (blob.type.includes('mp4') ? 'mp4' : 'webm') : 'png';
    const main = new File([blob], `${fileName(video ? '-video' : '')}.${ext}`, {type: blob.type || (video ? 'video/mp4' : 'image/png')});
    const sound = video ? null : soundFile();
    phoneFiles = sound && navigator.canShare && navigator.canShare({files:[main, sound]}) ? [main, sound] : [main];
    const canShare = !!(navigator.canShare && navigator.canShare({files: phoneFiles}));
    if (phoneURL) URL.revokeObjectURL(phoneURL);
    phoneURL = URL.createObjectURL(blob);
    $('phone-save-image').hidden = video; $('phone-save-video').hidden = !video;
    if (video) { $('phone-save-video').src = phoneURL; $('phone-save-image').removeAttribute('src'); }
    else { $('phone-save-image').src = phoneURL; $('phone-save-video').removeAttribute('src'); }
    $('phone-save-title').textContent = video ? 'Your video card is ready' : 'Save your card';
    $('phone-share').textContent = video ? 'Save or Send My Video' : 'Save or Send My Card';
    $('phone-share').hidden = !canShare;
    const apple = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
    const hold = video ? 'press play to watch it.' : (apple ? 'press and hold the picture, then tap "Save to Photos."' : 'press and hold the picture, then tap "Download image."');
    $('phone-save-help').textContent = canShare ? `Tap the button to save or send it${phoneFiles.length > 1 ? ' with your sound' : ''}. Or ${hold}` : hold[0].toUpperCase() + hold.slice(1);
    phoneSave.showModal();
  }
  $('phone-share').addEventListener('click', async () => {
    try { await navigator.share({files: phoneFiles, title: 'My Mama Said card'}); }
    catch (e) { if (e.name !== 'AbortError') $('phone-save-help').textContent = 'Press and hold the picture, then choose save.'; }
  });
  $('phone-save-done').addEventListener('click', () => { $('phone-save-video').pause(); phoneSave.close(); });
  $('download-card').addEventListener('click', async () => {
    const button = $('download-card'); button.disabled = true; say('card-status', 'Getting your card ready…');
    try {
      const blob = await cardPicture();
      if (isPhone()) { showPhoneSave(blob); say('card-status', 'Your card is ready to save to your phone.'); return; }
      downloadBlob(blob, `${fileName()}.png`);
      say('card-status', draft.sound ? 'Your card was downloaded. Tap "Save My Sound" to keep your sound too.' : 'Your card was downloaded. Look in your Downloads folder.');
    } catch { say('card-status', 'The download did not work. Please try again.'); }
    finally { button.disabled = false; }
  });

  /* ---------- Mama reads the card (uses ElevenLabs credits, so the same words are kept and reused) ---------- */
  let voiceCache = {text:'', blob:null}, player = null;
  const cardWords = () => [draft.title.trim(), draft.message.trim()].filter(Boolean).join('. ');
  async function getMamaVoice() {
    const text = cardWords();
    if (!draft.message.trim()) throw Error('Write your message first, baby.');
    if (voiceCache.text === text && voiceCache.blob) return voiceCache.blob;
    const response = await fetch('/api/speak', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text}), signal: AbortSignal.timeout(45000)});
    if (!response.ok) { let m = "Mama couldn't speak just now. Please try again."; try { m = (await response.json()).message || m; } catch {} throw Error(m); }
    const blob = await response.blob(); voiceCache = {text, blob}; updateSendHint(); return blob;
  }
  $('hear-mama').addEventListener('click', async () => {
    const label = $('hear-mama-label');
    if (player && !player.paused) { player.pause(); label.textContent = 'Hear Mama'; say('card-status', ''); return; }
    $('hear-mama').disabled = true; say('card-status', 'Mama is getting ready to read your card…');
    try {
      const blob = await getMamaVoice();
      if (player) URL.revokeObjectURL(player.src);
      player = new Audio(URL.createObjectURL(blob));
      player.addEventListener('ended', () => { label.textContent = 'Hear Mama'; say('card-status', ''); });
      await player.play(); label.textContent = 'Stop'; say('card-status', 'Mama is reading your card.');
    } catch (e) { say('card-status', e.message); }
    finally { $('hear-mama').disabled = false; }
  });
  $('save-mama-voice').addEventListener('click', async () => {
    say('card-status', 'Getting Mama\'s voice ready to save…');
    try { const blob = await getMamaVoice(); downloadBlob(blob, `${fileName('-mama-voice')}.mp3`); say('card-status', "Mama's voice was saved. Look in your Downloads folder."); }
    catch (e) { say('card-status', e.message); }
  });

  /* ---------- Start over, text size, start up ---------- */
  $('start-over').addEventListener('click', () => {
    if (!confirm('Start over? This clears your words, picture, and sound. Saved cards in My Cards stay.')) return;
    draft = fresh(); populate(); usePicture(0, true); $('card-title').focus();
  });
  const sizeKey = 'mama-said-interface-text-size';
  const applySize = v => { const s = ['normal','large','extra-large'].includes(v) ? v : 'normal'; document.documentElement.dataset.textSize = s; $('interface-text-size').value = s; requestAnimationFrame(fitWords); };
  try { applySize(localStorage.getItem(sizeKey)); } catch { applySize('normal'); }
  $('interface-text-size').addEventListener('change', e => { applySize(e.target.value); try { localStorage.setItem(sizeKey, e.target.value); } catch {} });
  window.addEventListener('beforeunload', e => { if (recorder && recorder.state === 'recording') { e.preventDefault(); e.returnValue = ''; } });

  (async () => {
    let restored = null;
    try { db = await openDatabase(); restored = readStored(await tx('drafts', 'readonly', s => s.get('current'))); }
    catch { db = null; say('save-status', 'This browser is not saving drafts. Your card stays on this page.'); }
    if (restored) { draft = restored; populate(); }
    else { populate(); await usePicture(0, true); } // First visit: the lotus grandma, like the design picture.
    document.fonts.ready.then(fitWords);
  })();

  /* ---------- Video card: the card picture plus the card's sound (and Mama's voice if she already read it) ---------- */
  const VIDEO_MAX = 60;
  function videoType() {
    if (!window.MediaRecorder) return null;
    return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1,mp4a','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']
      .find(t => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) || null;
  }
  function mamaReady() { return !!(voiceCache.blob && voiceCache.text === cardWords() && cardWords()); }
  function updateSendHint() {
    const hint = $('send-hint'); if (!hint) return;
    const music = !!draft.sound; let mama = false; try { mama = mamaReady(); } catch {}
    hint.textContent = music && mama ? "Sends a video with your music and Mama's voice."
      : music ? (window.MAMA_VOICE_ON ? "Sends a video with your music. Tap Hear Mama first to add her voice." : 'Sends a video with your music.')
      : mama ? "Sends a video with Mama's voice."
      : (window.MAMA_VOICE_ON ? 'Sends your card as a picture. Add music or tap Hear Mama to send a video.' : 'Sends your card as a picture. Add music to send a video.');
  }
  async function makeVideo(button) {
    const type = videoType();
    const canvasOK = !!HTMLCanvasElement.prototype.captureStream;
    if (!type || !canvasOK) { say('card-status', 'This browser cannot make videos. Please try Chrome or Safari.'); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const audio = new Ctx(); // made right on the tap so phones allow sound
    button.disabled = true; say('card-status', 'Getting your video card ready…');
    let timer = null, drawTimer = null;
    try {
      await audio.resume();
      const music = draft.sound ? await audio.decodeAudioData(await draft.sound.arrayBuffer()) : null;
      const textNow = cardWords();
      const mama = (voiceCache.blob && voiceCache.text === textNow) ? await audio.decodeAudioData(await voiceCache.blob.arrayBuffer()).catch(() => null) : null;
      if (!music && !mama) throw Error('nothing');
      const seconds = Math.min(VIDEO_MAX, Math.max(music ? music.duration : 0, mama ? mama.duration + 1.5 : 0));
      const pic = await cardPicture();
      const img = await createImageBitmap(pic);
      const width = 1080, height = Math.round(width * img.height / img.width / 2) * 2;
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const c2 = canvas.getContext('2d');
      const draw = () => c2.drawImage(img, 0, 0, width, height);
      draw(); drawTimer = setInterval(draw, 100);
      const out = audio.createMediaStreamDestination();
      const musicGain = audio.createGain(); musicGain.gain.value = 1;
      let m = null; if (music) { m = audio.createBufferSource(); m.buffer = music; m.connect(musicGain).connect(out); }
      const end = audio.currentTime + 0.3 + seconds;
      musicGain.gain.setValueAtTime(1, end - 1.5); musicGain.gain.linearRampToValueAtTime(0, end);
      let v = null;
      if (mama) {
        musicGain.gain.setValueAtTime(0.35, audio.currentTime + 0.3);
        musicGain.gain.setValueAtTime(0.35, audio.currentTime + 0.3 + mama.duration);
        musicGain.gain.linearRampToValueAtTime(1, audio.currentTime + 0.3 + mama.duration + 1);
        musicGain.gain.setValueAtTime(1, end - 1.5); musicGain.gain.linearRampToValueAtTime(0, end);
        v = audio.createBufferSource(); v.buffer = mama; v.connect(out);
      }
      const stream = new MediaStream([...canvas.captureStream(10).getVideoTracks(), ...out.stream.getAudioTracks()]);
      const rec = new MediaRecorder(stream, {mimeType: type, videoBitsPerSecond: 2500000, audioBitsPerSecond: 128000});
      const chunks = []; rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      const done = new Promise(resolve => { rec.onstop = resolve; });
      rec.start(1000);
      const t0 = audio.currentTime + 0.3; if (m) m.start(t0, 0, seconds); if (v) v.start(t0);
      let left = Math.ceil(seconds);
      say('card-status', `Making your video card… ${left} seconds left. Please keep this page open.`);
      timer = setInterval(() => { left = Math.max(0, left - 1); say('card-status', `Making your video card… ${left} seconds left. Please keep this page open.`); }, 1000);
      await new Promise(resolve => setTimeout(resolve, (seconds + 0.6) * 1000));
      rec.stop(); await done;
      const blob = new Blob(chunks, {type: type.split(';')[0]});
      if (!blob.size) throw Error('empty');
      if (isPhone()) { showPhoneSave(blob, true); say('card-status', 'Your video card is ready.'); }
      else { downloadBlob(blob, `${fileName('-video')}.${type.includes('mp4') ? 'mp4' : 'webm'}`); say('card-status', 'Your video card was downloaded. Look in your Downloads folder.'); }
    } catch (e) {
      say('card-status', 'The video did not work. Please try again, or try a different song.');
    } finally {
      clearInterval(timer); clearInterval(drawTimer); audio.close().catch(() => {}); button.disabled = false;
    }
  }
  $('send-card').addEventListener('click', async () => {
    const button = $('send-card');
    if (draft.sound || mamaReady()) return makeVideo(button);
    button.disabled = true; say('card-status', 'Getting your card ready…');
    try {
      const blob = await cardPicture();
      if (isPhone()) { showPhoneSave(blob); say('card-status', ''); }
      else { downloadBlob(blob, `${fileName()}.png`); say('card-status', 'Your card was downloaded. Look in your Downloads folder.'); }
    } catch { say('card-status', 'That did not work. Please try again.'); }
    finally { button.disabled = false; }
  });
  updateSendHint();
})();
