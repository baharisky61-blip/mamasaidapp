'use strict';
document.documentElement.classList.add('js');
(() => {
  // Retain editor references while its DOM is detached for the finished-card view.
  const editorElements = new Map([...document.querySelectorAll('[id]')].map(element => [element.id,element]));
  const $ = id => document.getElementById(id) || editorElements.get(id);
  const workspace = document.querySelector('.workspace');
  const editingWorkspace = document.querySelector('.editing-workspace');
  const navigationActions = document.querySelector('.step-actions');
  const finishedCard = $('finished-card-template').content.firstElementChild.cloneNode(true);
  function restoreEditingWorkspace() {
    if (!finishedCard.isConnected) return;
    editingWorkspace.querySelector('.preview-panel').insertBefore(finishedCard.querySelector('.preview-fit-area'),editingWorkspace.querySelector('.preview-note'));
    workspace.replaceChildren(editingWorkspace);
    workspace.after(navigationActions);
    $('card-preview').setAttribute('aria-labelledby','preview-heading');
  }
  function presentFinishedCard() {
    finishedCard.insertBefore(editingWorkspace.querySelector('.preview-fit-area'),finishedCard.querySelector('.finished-card-actions'));
    workspace.replaceChildren(finishedCard);
    navigationActions.remove();
    $('card-preview').setAttribute('aria-labelledby','finished-card-heading');
  }
  // Interface preference is separate from the card draft and its typography.
  const interfaceSizeKey = 'mama-said-interface-text-size';
  const interfaceSizes = ['normal','large','extra-large'];
  function applyInterfaceSize(value) {
    const size = interfaceSizes.includes(value) ? value : 'normal';
    document.documentElement.dataset.textSize = size;
    $('interface-text-size').value = size;
  }
  try { applyInterfaceSize(localStorage.getItem(interfaceSizeKey)); }
  catch { applyInterfaceSize('normal'); $('interface-size-status').textContent = 'Text size works here, but browser storage is unavailable.'; }
  $('interface-text-size').addEventListener('change',event => {
    applyInterfaceSize(event.target.value);
    try {
      localStorage.setItem(interfaceSizeKey,event.target.value);
      $('interface-size-status').textContent = '';
    } catch { $('interface-size-status').textContent = 'Text size changed for this page, but could not be saved for next time.'; }
  });

  const colors = ['ivory', 'blush', 'rosewood', 'gold', 'plum', 'ocean', 'turquoise', 'pearl', 'champagne'];
  const fonts = {serif:'Georgia, serif',sans:'system-ui, sans-serif',lora:'"Mama Lora", serif',bree:'"Mama Bree", serif',atkinson:'"Mama Atkinson", sans-serif',mono:'"Mama Mono", monospace',lato:'"Mama Lato", sans-serif'};
  const textColors = ['auto','#072F43','#15313F','#FFFCF5','#000000','#93601F','#C76D74'];
  const titleSizes = [18,20,24,28,32,34,36,40,44,48,56,64];
  const messageSizes = [18,20,24,28,32];
  const empty = () => ({ title: '', message: '', color: 'ivory', image: null, imageName: '', imageDescription: '', artwork: 'lotus', step: 1, fontFamily: 'serif', fontSize: 20, textColor: 'auto', alignment: 'left', typographyVersion:2, titleFontFamily:'serif',messageFontFamily:'serif',titleFontSize:36,messageFontSize:20,titleTextColor:'auto',messageTextColor:'auto',titleTextBacking:false,messageTextBacking:false, mama:true });
  let draft = empty();
  let db;
  let imageURL;
  let uploadVersion = 0;
  let uploading = false;
  let pending = 0;
  let revision = 0;
  let unsaved = false;
  let queue = Promise.resolve();
  const status = text => { if ($('save-status').textContent !== text) $('save-status').textContent = text; };
  const storageWarning = 'Draft not saved in this browser. Keep this page open; refreshing or leaving may lose your latest edits and image. Browser storage may be blocked or full.';
  const stepNames = ['Express Yourself', 'Design Your Card', 'Personalize', 'Finished Card'];
  const stepDescriptions = ['Begin with your own words. You can revise them at any time.', 'Choose the paper, artwork, or your own photo. Your message stays with you.', 'Make your words comfortable to read. You can also revise your message or add a saying.', 'Your finished card.'];
  const backgrounds = {ivory:'#FFF7F1',blush:'#F3D1D4',rosewood:'#C76D74',gold:'#D4A574',plum:'#5E2E45',ocean:'#0B4057',turquoise:'#14788A',pearl:'#FFFCF5',champagne:'#E3CAA0'};
  function contrast(a, b) {
    const luminance = hex => {
      const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255).map(n => n <= .04045 ? n/12.92 : ((n+.055)/1.055)**2.4);
      return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
    };
    const values = [luminance(a),luminance(b)].sort((x,y)=>x-y);
    return (values[1]+.05)/(values[0]+.05);
  }
  let fontRenderVersion = 0;
  const loadedFonts = new Map();
  function verifyFonts() {
    const version = ++fontRenderVersion;
    const choices = [...new Set([draft.titleFontFamily,draft.messageFontFamily])].filter(key=>!['serif','sans'].includes(key));
    if (!choices.length) { $('font-load-status').textContent = ''; return; }
    $('font-load-status').textContent = 'Loading your selected fonts…';
    Promise.all(choices.map(key=>{
      if (!loadedFonts.has(key)) {
        const family = fonts[key].split(',')[0];
        const promise = document.fonts.load(`20px ${family}`).then(faces=>{if (!faces.length) throw Error('Font unavailable');});
        loadedFonts.set(key,promise);
        promise.catch(()=>loadedFonts.delete(key));
      }
      return loadedFonts.get(key);
    })).then(()=>{if(version===fontRenderVersion) $('font-load-status').textContent='Selected fonts loaded.';})
      .catch(()=>{if(version===fontRenderVersion) $('font-load-status').textContent='A selected font could not load. A fallback is visible; your selection is saved. Refresh to retry.';});
  }
  function composite(backing, paper, opacity) {
    return '#'+[1,3,5].map(i=>Math.round(parseInt(backing.slice(i,i+2),16)*opacity+parseInt(paper.slice(i,i+2),16)*(1-opacity)).toString(16).padStart(2,'0')).join('');
  }

  function renderStep() {
    restoreEditingWorkspace();
    const step = draft.step;
    document.querySelectorAll('[data-step-content]').forEach(panel => {
      const available = panel.dataset.stepContent.split(' ').includes(String(step));
      if (panel.id === 'mama-sayings') {
        if (!available) { panel.hidden = true; $('sayings-button').setAttribute('aria-expanded','false'); }
      } else panel.hidden = !available;
    });
    document.querySelectorAll('[data-step]').forEach(button => {
      if (Number(button.dataset.step) === step) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    });
    document.querySelector('.workspace').dataset.currentStep = step;
    $('active-step-heading').textContent = `Step ${step} — ${stepNames[step-1]}`;
    $('active-step-description').textContent = stepDescriptions[step-1];
    $('controls-legend').textContent = ['Your words','Your design','Your personal touch','Your Finished Card'][step-1];
    $('step-help-text').textContent = `Step ${step}: ${stepDescriptions[step-1]} Take your time, baby. Your edits stay on your card.`;
    $('step-position').textContent = `Step ${step} of 4`;
    $('previous-step').disabled = step === 1;
    $('next-step').disabled = step === 4;
    $('next-step').textContent = step === 4 ? 'Finished Card' : `Next: ${stepNames[step]}`;
    document.querySelector('main').dataset.finished = String(step === 4);
    if (step === 4) presentFinishedCard();
  }

  // Ready-made cards in Mama's voice, built from Nelcea's own sayings. No holidays.
  const quickCards = [
    {group:'Encouragement', title:"You've Got This, Baby", color:'pearl', artwork:'lotus', message:"Honey, you got all that experience. There's got to be something in there you can do. Your brain already knows what you need. Go on, baby. I believe in you."},
    {group:'Encouragement', title:'Keep Going', color:'ocean', artwork:'none', message:"We don't fail, we just experience them. Then we look back and decide what to do different. Every day you wake up with new thoughts, so use them."},
    {group:'Appreciation', title:'I Appreciate You', color:'champagne', artwork:'none', message:"I appreciate you. You good peoples, and I see everything you do. Nobody can be mad at your gratitude, so here's mine."},
    {group:'Appreciation', title:'Thank You, Sistah', color:'blush', artwork:'none', message:"Thank you for the heart you pour into everything you do. I know that's right! I appreciate you more than you know."},
    {group:'Proud of You', title:'Let Your Light Shine', color:'gold', artwork:'none', message:"Let your light shine, baby! Look what you were able to do. I'm so proud of you, and I'm so thankful."},
    {group:'Proud of You', title:'Celebrate You', color:'turquoise', artwork:'none', message:"Let's get it! You did that. Celebrate you today, because you earned it."},
    {group:'New Beginnings', title:'A Fresh Start', color:'pearl', artwork:'lotus', message:"Every day you wake up with new thoughts, so use them. Piece by piece, you're building something beautiful."},
    {group:'New Beginnings', title:'Let It Go', color:'ocean', artwork:'none', message:"Let it go, baby. Move on. What's ahead of you is better than what's behind you, and I'll be there cheering you on."},
    {group:'Family', title:'Grandma Loves You', color:'ivory', artwork:'lotus', message:"Grandma loves you so much, baby. You make my heart so happy. I'll be there for you, always."},
    {group:'Family', title:'Family Is Everything', color:'champagne', artwork:'none', message:"My brother, my sister, my cousin. Family is everything. I appreciate you, and I'll be there."},
    {group:'Friendship', title:'You Good Peoples', color:'plum', artwork:'none', message:"Girl, you know you my sistah. You good peoples, and I appreciate you. I'll be there, always."},
    {group:'Friendship', title:"What's Going On?", color:'turquoise', artwork:'none', message:"What's going on? Talk to me about that. I'm here, and I'll be there."},
    {group:'Thinking of You', title:'Thinking of You', color:'blush', artwork:'lotus', message:"You were on my mind today, baby. I just wanted you to know somebody loves you."},
    {group:"You're Not Alone", title:"You're Not Alone", color:'pearl', artwork:'lotus', message:"Loneliness is part of life. But when you're sad, get around people. A walk in the mall, a funny podcast, dancing by yourself breaks the spell. And call me. I'll be there."},
    {group:'Just Because', title:'Just Because', color:'gold', artwork:'none', message:"No reason. Just because. I appreciate you, baby. Celebrate you."},
    {group:'Just Because', title:'Stay Humble', color:'ocean', artwork:'none', message:"Stay humble, keep your energy right, and protect your boundaries. You're doing better than you think."}
  ];
  quickCards.forEach(card => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-card';
    const swatch = document.createElement('span'); swatch.className = `quick-swatch ${card.color}`; swatch.setAttribute('aria-hidden','true');
    const text = document.createElement('span'); text.className = 'quick-text';
    const group = document.createElement('small'); group.textContent = card.group;
    const title = document.createElement('strong'); title.textContent = card.title;
    text.append(group, title); button.append(swatch, text);
    button.addEventListener('click', () => {
      if ((draft.title || draft.message) && !confirm('Use this Quick Card? It replaces the title and message you have now. Your photo stays.')) return;
      draft.title = card.title; draft.message = card.message; draft.color = card.color;
      if (!draft.image) draft.artwork = card.artwork;
      populate(); save(); showStep(4);
    });
    $('quick-card-list').append(button);
  });

  function showStep(step) {
    if (![1,2,3,4].includes(step) || $('card-controls').disabled) return;
    draft.step = step;
    renderStep();
    save();
    (step === 4 ? finishedCard.querySelector('h2') : $('active-step-heading')).focus();
    alignDesktopEditor();
  }

  function render() {
    $('preview-title-text').textContent = draft.title || 'A note for you';
    $('preview-message-text').textContent = draft.message || 'Your personal message will appear here.';
    $('card-preview').className = `card ${draft.color} art-${draft.artwork || 'none'}${draft.image ? ' has-personal-image' : ''}${draft.mama ? ' show-mama' : ''}`;
    $('preview-image').alt = draft.imageDescription || 'Your personal card image';
    const autoColor = contrast('#15313F',backgrounds[draft.color]) >= 4.5 ? '#15313F' : contrast('#24131C',backgrounds[draft.color]) >= 4.5 ? '#24131C' : '#FFFCF5';
    $('card-preview').style.color = autoColor;
    $('card-preview').style.textAlign = draft.alignment;
    for (const part of ['title','message']) {
      const element = $(`preview-${part}`);
      const color = draft[`${part}TextColor`] === 'auto' ? autoColor : draft[`${part}TextColor`];
      element.style.fontFamily = fonts[draft[`${part}FontFamily`]];
      element.style.fontSize = `${draft[`${part}FontSize`]}px`;
      element.style.color = color;
      const backing = draft[`${part}TextBacking`];
      const backingColor = contrast(color,'#000000') > contrast(color,'#FFFFFF') ? '#000000' : '#FFFFFF';
      const backingText = $(`preview-${part}-text`);
      backingText.classList.toggle('has-text-backing',backing);
      backingText.style.backgroundColor = backing ? (backingColor === '#000000' ? 'rgba(0,0,0,.94)' : 'rgba(255,255,255,.94)') : '';
      const ratio = contrast(color,backing ? composite(backingColor,backgrounds[draft.color],.94) : backgrounds[draft.color]);
      $(`${part}-contrast-status`).textContent = ratio < 4.5 ? `Low contrast (${ratio.toFixed(2)}:1). Your selected color is kept. Enable ${part} backing or choose a different color.` : backing ? `Translucent backing on (${ratio.toFixed(2)}:1 contrast). Your text color is unchanged.` : '';
    }
    $('text-style-status').textContent = 'Colors are kept as selected. Auto changes with paper only when chosen.';
    verifyFonts();
  }

  function renderImage() {
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = draft.image ? URL.createObjectURL(draft.image) : null;
    const image = $('preview-image');
    image.hidden = !imageURL;
    if (imageURL) image.src = imageURL;
    else image.removeAttribute('src');
    $('remove-image').disabled = !draft.image;
    $('image-status').textContent = draft.image ? `${draft.imageName} is on your card.${$('image-status').dataset.mamaNote ? ' Mama stepped aside for your photo; turn her back on above if you like.' : ''}` : 'No image selected.';
    delete $('image-status').dataset.mamaNote;
    render();
  }

  function populate() {
    $('card-title').value = draft.title;
    $('card-message').value = draft.message;
    $('image-description').value = draft.imageDescription;
    document.querySelector(`input[name=background][value=${draft.color}]`).checked = true;
    $('card-image').value = '';
    document.querySelector(`input[name=artwork][value=${draft.artwork || 'none'}]`).checked = true;
    for (const part of ['title','message']) {
      const prefix = part === 'title' ? 'title-' : '';
      $(`${prefix}font-family`).value = draft[`${part}FontFamily`];
      $(`${prefix}font-size`).value = String(draft[`${part}FontSize`]);
      $(`${prefix}text-color`).value = draft[`${part}TextColor`];
      $(`${part}-text-backing`).checked = draft[`${part}TextBacking`];
    }
    $('text-alignment').value = draft.alignment;
    $('show-mama').checked = draft.mama;
    finishedCard.querySelector('#toggle-mama-finished').textContent = draft.mama ? 'Remove Mama' : 'Put Mama on Card';
    renderStep();
    renderImage();
  }

  function readDraft() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const request = tx.objectStore('drafts').get('current');
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error || Error('Read failed'));
    });
  }

  function writeDraft(snapshot) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').put(snapshot, 'current');
      // A request success event alone does not guarantee the transaction committed.
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () => reject(tx.error || Error('Save failed'));
    });
  }

  function save() {
    render();
    unsaved = true;
    const currentRevision = ++revision;
    const snapshot = { ...draft };
    if (!db) { status(storageWarning); return; }
    status('Saving your draft and image in this browser…');
    pending++;
    // Serialize whole-draft writes so an older image or text cannot overwrite a newer edit.
    queue = queue.then(async () => {
      try {
        await writeDraft(snapshot);
        if (currentRevision === revision) {
          unsaved = false;
          status(uploading ? 'Preparing your image. Keep this page open until it is saved.' : 'Draft saved in this browser, including your image if selected.');
        }
      } catch {
        if (currentRevision === revision) status(storageWarning);
      } finally { pending--; }
    });
  }

  function validateStored(value) {
    if (!value || typeof value !== 'object' || typeof value.title !== 'string' || value.title.length > 200 || typeof value.message !== 'string' || value.message.length > 10000 || !colors.includes(value.color) || typeof value.imageName !== 'string' || typeof value.imageDescription !== 'string' || value.imageDescription.length > 300) throw Error('Unreadable draft');
    if (value.image !== null && (!(value.image instanceof Blob) || value.image.size > 10 * 1024 * 1024 || !['image/jpeg','image/png','image/webp','image/gif'].includes(value.image.type))) throw Error('Unreadable image');
    if (value.artwork === undefined) value.artwork = 'none';
    if (value.mama === undefined) value.mama = true;
    if (typeof value.mama !== 'boolean') throw Error('Unreadable Mama setting');
    if (!['none', 'lotus'].includes(value.artwork)) throw Error('Unreadable artwork');
    for (const property of ['step','fontFamily','fontSize','textColor','alignment']) if (value[property] === undefined) value[property] = empty()[property];
    if (![1,2,3,4].includes(value.step) || !Object.hasOwn(fonts,value.fontFamily) || !messageSizes.includes(value.fontSize) || !textColors.includes(value.textColor) || !['left','center','right'].includes(value.alignment)) throw Error('Unreadable text settings');
    // Add independent settings without changing text, images, or previous stored records on load.
    // Old title sizes were message size + 16; preserve that appearance exactly.
    const previous = {titleFontFamily:value.fontFamily,messageFontFamily:value.fontFamily,titleFontSize:value.fontSize+16,messageFontSize:value.fontSize,titleTextColor:value.textColor,messageTextColor:value.textColor,titleTextBacking:false,messageTextBacking:false};
    for (const [key,setting] of Object.entries(previous)) if (value[key] === undefined) value[key] = setting;
    for (const part of ['title','message']) {
      if (!Object.hasOwn(fonts,value[`${part}FontFamily`]) || !(part==='title'?titleSizes:messageSizes).includes(value[`${part}FontSize`]) || !textColors.includes(value[`${part}TextColor`]) || typeof value[`${part}TextBacking`] !== 'boolean') throw Error('Unreadable independent text settings');
    }
    value.typographyVersion = 2;
    return value;
  }

  async function initialize() {
    try {
      db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('mama-said-card-designer', 1);
        let settled = false;
        const timer = setTimeout(() => { settled = true; reject(Error('Storage timeout')); }, 5000);
        request.onupgradeneeded = () => request.result.createObjectStore('drafts');
        request.onsuccess = () => {
          clearTimeout(timer);
          if (settled) { request.result.close(); return; }
          resolve(request.result);
        };
        request.onerror = request.onblocked = () => { clearTimeout(timer); settled = true; reject(Error('Storage unavailable')); };
      });
      db.onversionchange = () => { db.close(); db = null; status('Browser draft storage changed in another tab. Refresh before editing further.'); };
      const stored = await readDraft();
      if (stored !== undefined) {
        draft = validateStored(stored);
        status('Your saved card was restored, including your image if selected.');
      } else status('Ready to create. Your draft will save in this browser as you edit.');
    } catch {
      if (db) db.close();
      db = null;
      status('A saved draft could not be opened. It has not been overwritten. New edits will stay on this page only; browser storage is unavailable.');
    } finally {
      populate();
      $('card-controls').disabled = false;
      document.querySelectorAll('[data-step]').forEach(button => {button.disabled = false;});
      requestAnimationFrame(alignDesktopEditor);
    }
  }

  // Private controller: future adapters can reuse validated operations here without a global API.
  const editorController = Object.freeze({
    setCardTitle(text) { if (typeof text !== 'string' || text.length > 200) return false; draft.title = text; $('card-title').value = text; save(); return true; },
    setCardMessage(text) { if (typeof text !== 'string' || text.length > 10000) return false; draft.message = text; $('card-message').value = text; save(); return true; },
    setCardBackground(color) { if (!colors.includes(color)) return false; draft.color = color; document.querySelector(`input[name=background][value=${color}]`).checked = true; save(); return true; },
    changeTextColor(color,part='message') { if (!['title','message'].includes(part) || !textColors.includes(color)) return false; draft[`${part}TextColor`] = color; if(part==='message') draft.textColor=color; $(`${part==='title'?'title-':''}text-color`).value = color; save(); return true; },
    changeFontSize(size,part='message') { if (!['title','message'].includes(part) || !(part==='title'?titleSizes:messageSizes).includes(size)) return false; draft[`${part}FontSize`] = size; if(part==='message') draft.fontSize=size; $(`${part==='title'?'title-':''}font-size`).value = size; save(); return true; },
    changeFontFamily(font,part='message') { if (!['title','message'].includes(part) || !Object.hasOwn(fonts,font)) return false; draft[`${part}FontFamily`] = font; if(part==='message') draft.fontFamily=font; $(`${part==='title'?'title-':''}font-family`).value = font; save(); return true; },
    changeTextBacking(enabled,part='message') { if (!['title','message'].includes(part) || typeof enabled!=='boolean') return false; draft[`${part}TextBacking`] = enabled; save(); return true; },
    changeTextAlignment(alignment) { if (!['left','center','right'].includes(alignment)) return false; draft.alignment = alignment; $('text-alignment').value = alignment; save(); return true; },
    selectCardTemplate(id) {
      if (!['lotus','classic'].includes(id)) return false;
      if (!confirm('Apply this starter layout? Paper and artwork will change. Your title, message, personal image, and font settings will stay.')) return false;
      draft.artwork = id === 'lotus' ? 'lotus' : 'none';
      draft.color = id === 'lotus' ? 'pearl' : 'ivory';
      populate(); save(); return true;
    }
  });
  $('card-title').addEventListener('input',event => editorController.setCardTitle(event.target.value));
  $('card-message').addEventListener('input',event => editorController.setCardMessage(event.target.value));
  $('image-description').addEventListener('input',event => {draft.imageDescription = event.target.value;save();});
  const mamaToggleFinished = finishedCard.querySelector('#toggle-mama-finished');
  function setMama(on) { draft.mama = on; $('show-mama').checked = on; mamaToggleFinished.textContent = on ? 'Remove Mama' : 'Put Mama on Card'; save(); }
  $('show-mama').addEventListener('change',event => setMama(event.target.checked));
  mamaToggleFinished.addEventListener('click',() => setMama(!draft.mama));
  for (const part of ['title','message']) {
    const prefix = part==='title'?'title-':'';
    $(`${prefix}font-family`).addEventListener('change',event => editorController.changeFontFamily(event.target.value,part));
    $(`${prefix}font-size`).addEventListener('change',event => editorController.changeFontSize(Number(event.target.value),part));
    $(`${prefix}text-color`).addEventListener('change',event => editorController.changeTextColor(event.target.value,part));
    $(`${part}-text-backing`).addEventListener('change',event => editorController.changeTextBacking(event.target.checked,part));
  }
  $('text-alignment').addEventListener('change',event => editorController.changeTextAlignment(event.target.value));
  document.querySelectorAll('[data-template]').forEach(button => button.addEventListener('click',()=>editorController.selectCardTemplate(button.dataset.template)));
  document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click',()=>showStep(Number(button.dataset.step))));
  $('next-step').addEventListener('click',()=>showStep(draft.step+1));
  $('previous-step').addEventListener('click',()=>showStep(draft.step-1));
  finishedCard.querySelector('#edit-finished-card').addEventListener('click',()=>showStep(3));
  document.querySelectorAll('input[name=background]').forEach(input => input.addEventListener('change', () => editorController.setCardBackground(input.value)));
  document.querySelectorAll('input[name=artwork]').forEach(input => input.addEventListener('change', () => { draft.artwork = input.value; save(); }));

  $('card-image').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    const version = ++uploadVersion;
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      uploading = false;
      $('image-status').textContent = 'Please choose a JPEG, PNG, WebP, or GIF of 10 MB or less. Your existing image is unchanged.';
      status(pending ? 'Saving your current card in this browser…' : unsaved ? storageWarning : 'Image was not added. Your previous card is unchanged.');
      event.target.value = '';
      return;
    }
    uploading = true;
    $('image-status').textContent = 'Checking your image…';
    status('Preparing your image. Keep this page open until it is saved.');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (version !== uploadVersion) return;
      draft.image = file;
      draft.imageName = file.name;
      // A personal photo takes Mama's place; she can be turned back on in Design.
      if (draft.mama) { draft.mama = false; $('show-mama').checked = false; finishedCard.querySelector('#toggle-mama-finished').textContent = 'Put Mama on Card'; $('image-status').dataset.mamaNote = '1'; }
      uploading = false;
      renderImage();
      save();
    } catch {
      if (version === uploadVersion) {
        uploading = false;
        $('image-status').textContent = 'This image could not be read. Please choose another. Your existing image is unchanged.';
        status(unsaved ? storageWarning : 'Image was not added. Your previous card is unchanged.');
      }
    } finally { URL.revokeObjectURL(url); event.target.value = ''; }
  });

  // Mama Said picture library (assets/cards). A chosen picture is stored like a personal photo.
  const cardPictures = [
    {file:'lotus-grandma', name:'Lotus grandma', description:'A smiling grandmother with silver curls, chin on her hand, among white lotus flowers'},
    {file:'family-smiles', name:'Family smiles', description:'A smiling father with his two daughters'},
    {file:'sunset-family', name:'Sunset family', description:'A family sitting together by the water at sunset'},
    {file:'candlelight-couple', name:'Candlelight couple', description:'A couple smiling at each other by candlelight'},
    {file:'candlelit-table', name:'Candlelit table', description:'A dinner table set with candles and greenery'},
    {file:'cookout', name:'Cookout', description:'Barbecue ribs with potatoes and fries at a cookout'},
    {file:'grandparents-couch', name:'Grandparents', description:'Grandparents sitting on a couch with their grandson'},
    {file:'three-generations', name:'Three generations', description:'A great-grandmother, grandmother, and granddaughter smiling together'},
    {file:'comfort-embrace', name:'Comfort', description:'A couple holding each other close in an autumn forest'},
    {file:'white-lilies', name:'White lilies', description:'Soft white lilies in gentle light'},
    {file:'peaceful-beach', name:'Peaceful beach', description:'Calm turquoise waves on a quiet sandy beach'},
    {file:'cozy-fireplace', name:'Cozy fireplace', description:'A warm fireplace in a cozy wood-paneled room'},
    {file:'cozy-couch', name:'Cozy couch', description:'A cozy couch with warm tea by the window'},
    {file:'sunny-living-room', name:'Sunny living room', description:'A sunny living room with plants and a cup of tea'},
    {file:'garden-retreat', name:'Garden retreat', description:'A peaceful glass house in a misty garden'},
    {file:'candle-branch', name:'Candle and branch', description:'A glowing candle and a branch in a vase'},
    {file:'candle-window', name:'Candle by the window', description:'A candle and a vase in soft window light'},
    {file:'bride-roses', name:'Bride in roses', description:'A Black bride in a long veil among white roses'},
    {file:'bride-garden', name:'Bride in the garden', description:'A bride in a long veil in a sunlit garden'},
    {file:'flower-arch', name:'White flower arch', description:'A white flower arch in a garden'},
    {file:'wedding-cake', name:'Wedding cake', description:'A white tiered wedding cake with roses'},
    {file:'candlelit-canopy', name:'Candlelit canopy', description:'A candlelit dinner table under a flower canopy'},
    {file:'garden-party-lights', name:'Garden party', description:'An outdoor celebration under glowing lanterns'},
    {file:'golden-hour-beauty', name:'Golden hour beauty', description:'A smiling Black woman with an afro and gold hoops'},
    {file:'golden-mermaid', name:'Golden mermaid', description:'A Black grandmother mermaid with golden locs and a golden tail'},
    {file:'silver-mermaid', name:'Silver mermaid', description:'A Black grandmother mermaid with silver locs and a blue tail'},
    {file:'space-queen', name:'Space queen', description:'A smiling Black woman with an afro in a golden space suit'},
    {file:'cuddle-candlelight', name:'Cuddle by candlelight', description:'A couple cuddled up by warm candlelight'},
    {file:'flowers-for-you', name:'Flowers for you', description:'A smiling couple with a bouquet of flowers'},
    {file:'i-love-you-roses', name:'I love you roses', description:'"I love you with all my heart" framed in pink roses'},
    {file:'wildflower-path', name:'Wildflower path', description:'A sunlit path through a meadow of daisies'},
    {file:'happy-friends', name:'Happy friends', description:'Colorful smiling friends jumping for joy'},
    {file:'jelly-buddies', name:'Jelly buddies', description:'Cheerful jelly-bean friends dancing'},
    {file:'just-checking-in', name:'Just checking in', description:'A smiling man by a river with the words Just Checking In'},
    {file:'grandma-tea-window', name:'Grandma with tea', description:'A grandmother with a warm cup of tea by a snowy window'},
    {file:'tea-with-friends', name:'Tea with friends', description:'Two friends laughing over tea with a smiling mug'},
    {file:'warm-tea-hands', name:'Warm tea', description:'Hands holding a warm cup of tea in a cozy sweater'},
    {file:'held-in-comfort', name:'Held in comfort', description:'A woman being held and comforted in a heavenly light'},
    {file:'helping-hand', name:'Helping hand', description:'A glowing hand lifting a smiling woman to safety'},
    {file:'royal-blue-couple', name:'Royal blue couple', description:'A smiling couple in royal blue holding hands at a celebration'},
    {file:'elegant-evening', name:'Elegant evening', description:'A smiling couple in black holding hands under golden lights'},
    {file:'glowing-rose', name:'Glowing rose', description:'A glowing rose surrounded by soft hearts'},
    {file:'golden-goddess', name:'Golden goddess', description:'A smiling woman with long braids in white and gold jewels'},
    {file:'royal-couple', name:'Royal couple', description:'A king and queen in blue and gold crowns among blue and white flowers'},
    {file:'golden-years-love', name:'Golden years love', description:'An older couple holding hands and smiling together'},
    {file:'slow-dance', name:'Slow dance', description:'A couple slow dancing by a record player'},
    {file:'sunset-embrace', name:'Sunset embrace', description:'A couple embracing in a flower field at sunset'},
    {file:'paris-evening', name:'Paris evening', description:'A couple embracing on a balcony with the Eiffel Tower'},
    {file:'lantern-walk', name:'Lantern walk', description:'A couple walking hand in hand down a path of lights'},
    {file:'golden-field-walk', name:'Golden field walk', description:'A couple walking together into a golden field'},
    {file:'starry-camp', name:'Starry campout', description:'A couple wrapped in a blanket by a glowing tent under the stars'},
    {file:'candlelit-bath', name:'Candlelit bath', description:'A couple relaxing in a candlelit bubble bath'},
    {file:'doves-birdbath', name:'Doves in love', description:'Two white doves kissing on a birdbath with roses'},
    {file:'doves-branch', name:'Doves on a branch', description:'Two white doves touching beaks on a branch'},
    {file:'doves-lantern', name:'Doves by lantern', description:'Two white doves by a glowing lantern and roses'},
    {file:'red-roses', name:'Red roses', description:'A bouquet of red roses in warm light'},
    {file:'ring-box', name:'Ring box', description:'A sparkling ring in a soft velvet box'},
    {file:'two-mugs', name:'Two mugs', description:'Two warm mugs side by side in morning light'},
    {file:'porch-rockers', name:'Porch rockers', description:'Two rocking chairs on a porch at sunset'},
    {file:'sistas-laughing', name:'Sistas laughing', description:'Two women hugging and laughing together'},
    {file:'morning-park', name:'Morning park', description:'A mother and child by the water at sunrise'},
    {file:'golden-afro-combs', name:'Golden afro combs', description:'Three golden afro combs under a starry night sky'},
    {file:'golden-bloom', name:'Golden bloom', description:'A glowing golden flower of light'},
    {file:'jeweled-mandala', name:'Jeweled mandala', description:'A jeweled blue and gold mandala'},
    {file:'starry-night', name:'Starry night', description:'A starry night sky with a crescent moon'},
    {file:'football-field', name:'Football field', description:'A football field under stadium lights'},
    {file:'stadium-lights', name:'Stadium lights', description:'A football stadium glowing at night'},
    {file:'baseball-diamond', name:'Baseball diamond', description:'A sunny baseball diamond surrounded by trees'},
    {file:'ballpark-grass', name:'Ballpark', description:'Fresh ballpark grass and the baseline on a sunny day'},
    {file:'basketball-sunset', name:'Basketball sunset', description:'A basketball hoop glowing at sunset'},
    {file:'neighborhood-court', name:'Neighborhood court', description:'A neighborhood basketball court in golden light'},
    {file:'star-gold', name:'Gold star', description:'A glowing gold star burst'},
    {file:'star-silver', name:'Silver star', description:'A glowing silver star burst'},
    {file:'star-pink', name:'Pink star', description:'A glowing pink star burst'},
    {file:'star-soft-pink', name:'Soft pink star', description:'A soft light pink star burst'},
    {file:'star-red', name:'Red star', description:'A glowing red star burst'},
    {file:'star-purple', name:'Purple star', description:'A glowing purple star burst'},
    {file:'star-blue', name:'Blue star', description:'A glowing blue star burst'},
    {file:'star-sky-blue', name:'Sky blue star', description:'A soft light blue star burst'},
    {file:'star-green', name:'Green star', description:'A glowing green star burst'}
  ];
  cardPictures.forEach(picture => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'card-picture';
    button.setAttribute('aria-label', `Use the ${picture.name} picture`);
    const thumb = document.createElement('img');
    thumb.src = `assets/cards/${picture.file}.jpg`; thumb.alt = ''; thumb.loading = 'lazy';
    const label = document.createElement('span'); label.textContent = picture.name;
    button.append(thumb, label);
    button.addEventListener('click', async () => {
      const version = ++uploadVersion;
      $('card-picture-status').textContent = 'Putting the picture on your card…';
      try {
        const response = await fetch(`assets/cards/${picture.file}.jpg`);
        if (!response.ok) throw Error('missing');
        const blob = await response.blob();
        if (version !== uploadVersion) return;
        draft.image = new Blob([blob], {type:'image/jpeg'});
        draft.imageName = picture.name;
        draft.imageDescription = picture.description;
        $('image-description').value = picture.description;
        if (draft.mama) { draft.mama = false; $('show-mama').checked = false; finishedCard.querySelector('#toggle-mama-finished').textContent = 'Put Mama on Card'; }
        renderImage(); save();
        $('card-picture-status').textContent = `${picture.name} is on your card. Mama stepped aside; turn her back on above if you like.`;
      } catch { $('card-picture-status').textContent = 'That picture could not load. Please try again.'; }
    });
    $('card-picture-list').append(button);
  });

  $('remove-image').addEventListener('click', () => {
    uploadVersion++;
    uploading = false;
    draft.image = null;
    draft.imageName = '';
    draft.imageDescription = '';
    $('image-description').value = '';
    $('card-image').value = '';
    renderImage();
    save();
  });

  const closeHelp = () => {
    $('mama-help').hidden = true;
    $('help-button').setAttribute('aria-expanded', 'false');
    $('help-button').focus();
  };
  $('help-button').addEventListener('click', () => {
    if (draft.step === 4) showStep(3);
    if (!$('mama-help').hidden) { closeHelp(); return; }
    $('mama-help').hidden = false;
    $('help-button').setAttribute('aria-expanded', 'true');
    $('help-title').focus({ preventScroll: true });
    $('mama-help').scrollIntoView({ block: 'nearest' });
  });
  $('close-help').addEventListener('click', closeHelp);
  $('help-assist-button').addEventListener('click', () => { if ($('mama-help').hidden) $('help-button').click(); else $('help-title').focus(); });
  $('return-from-help').addEventListener('click', () => {
    closeHelp();
    (draft.step === 1 || draft.step === 3 ? $('card-message') : $('active-step-heading')).focus();
  });
  $('mama-help').addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closeHelp(); } });

  let sayings = null;
  let sayingsMetadata = [];
  let loadingSayings = false;
  function displaySayings() {
    const query = $('sayings-search').value.toLocaleLowerCase();
    const matches = sayings.map((text, index) => ({ text, index })).filter(entry => `${entry.index+1} ${entry.text} ${sayingsMetadata[entry.index]?.spellingNote || ''}`.toLocaleLowerCase().includes(query));
    const fragment = document.createDocumentFragment();
    for (const { text, index } of matches) {
      const item = document.createElement('li');
      const expression = document.createElement('p');
      const number = document.createElement('span');
      number.className = 'saying-number';
      number.textContent = `${index+1}.`;
      expression.id = `saying-${index}`;
      expression.className = 'saying-text';
      expression.textContent = text;
      const add = document.createElement('button');
      add.type = 'button';
      add.textContent = 'Add to Card';
      add.setAttribute('aria-describedby', expression.id);
      add.addEventListener('click', () => {
        const next = draft.message + (draft.message ? '\n\n' : '') + text;
        if (next.length > $('card-message').maxLength) {
          $('sayings-add-status').textContent = 'Your message is too long to add this saying. Shorten the message first; your card is unchanged.';
          return;
        }
        editorController.setCardMessage(next);
        $('sayings-add-status').textContent = `Added expression ${index + 1} to your message. You can edit or remove it in Personal message.`;
      });
      item.append(number, expression);
      const note = sayingsMetadata[index]?.spellingNote;
      if (note) {
        const metadata = document.createElement('p');
        metadata.className = 'spelling-note';
        metadata.textContent = `Note: ${note}`;
        metadata.id = `saying-note-${index}`;
        item.append(metadata);
        add.setAttribute('aria-describedby', `${expression.id} ${metadata.id}`);
      }
      item.append(add);
      fragment.append(item);
    }
    $('sayings-results').replaceChildren(fragment);
    $('sayings-status').textContent = matches.length ? `${matches.length} of ${sayings.length} sayings shown.` : 'No sayings match your search. Try different words.';
  }

  async function loadSayings() {
    if (sayings) { displaySayings(); return; }
    if (loadingSayings) return;
    loadingSayings = true;
    $('sayings-status').textContent = 'Opening the sayings collection…';
    try {
      const response = await fetch('sayings.json', { cache: 'no-cache', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error('Collection unavailable');
      const collection = await response.json();
      if (collection.sourceStatus === 'missing') {
        $('sayings-status').textContent = 'The original collection of 99 sayings has not been supplied yet. No replacement sayings have been added. Your card is unchanged.';
        return;
      }
      if (!Array.isArray(collection.sayings) || collection.sayings.length !== 99 || !collection.sayings.every(text => typeof text === 'string' && text.length > 0)) throw Error('Incomplete collection');
      // Preserve the original text, ordering, duplicates, spellings, and variants.
      if (collection.metadata !== undefined && (!Array.isArray(collection.metadata) || collection.metadata.length !== 99 || !collection.metadata.every((entry,index)=>entry.number===index+1 && (entry.spellingNote===undefined || typeof entry.spellingNote==='string')))) throw Error('Invalid collection metadata');
      sayings = collection.sayings;
      sayingsMetadata = collection.metadata || [];
      $('sayings-search').disabled = false;
      displaySayings();
    } catch {
      $('sayings-status').textContent = 'The complete original collection could not be loaded. Close and reopen this panel to retry. Your card is unchanged.';
    } finally { loadingSayings = false; }
  }

  const closeSayings = (resumeEditing = false) => {
    $('mama-sayings').hidden = true;
    $('sayings-button').setAttribute('aria-expanded', 'false');
    (resumeEditing ? $('card-message') : $('sayings-button')).focus();
  };
  $('sayings-button').addEventListener('click', () => {
    if (!$('mama-sayings').hidden) { closeSayings(); return; }
    $('mama-sayings').hidden = false;
    $('sayings-button').setAttribute('aria-expanded', 'true');
    $('sayings-title').focus();
    loadSayings();
  });
  $('sayings-assist-button').addEventListener('click', () => { if ($('mama-sayings').hidden) $('sayings-button').click(); else $('sayings-title').focus(); });
  $('close-sayings').addEventListener('click', () => closeSayings());
  let chosenWords = '';
  document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => {
    $('inspiration-prompt').textContent = button.dataset.prompt;
    chosenWords = button.dataset.words || '';
    $('inspiration-words').textContent = chosenWords;
    $('inspiration-offer').hidden = !chosenWords;
    $('inspiration-add-status').textContent = '';
    document.querySelectorAll('[data-prompt]').forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
  }));
  $('add-inspiration').addEventListener('click', () => {
    if (!chosenWords) return;
    const next = draft.message + (draft.message ? '\n\n' : '') + chosenWords;
    if (next.length > $('card-message').maxLength) { $('inspiration-add-status').textContent = 'Your message is too long to add these words. Shorten it first; your card is unchanged.'; return; }
    editorController.setCardMessage(next);
    $('inspiration-add-status').textContent = 'Added to your card. You can change the words in Your message.';
  });
  $('return-from-sayings').addEventListener('click', () => closeSayings(true));
  $('sayings-search').addEventListener('input', displaySayings);
  $('mama-sayings').addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closeSayings(); } });

  function startOver() {
    if (!window.confirm('Start over? This clears your card title, message, color choice, and image. This cannot be undone.')) return;
    restoreEditingWorkspace();
    uploadVersion++;
    uploading = false;
    draft = empty();
    populate();
    save();
    $('card-title').focus();
  }
  $('start-over').addEventListener('click',startOver);
  finishedCard.querySelector('#restart-finished-card').addEventListener('click',startOver);

  // Download the finished card as a PNG picture. The drawing library loads only when needed.
  let pictureLibrary = null;
  function loadPictureLibrary() {
    if (window.html2canvas) return Promise.resolve();
    if (!pictureLibrary) pictureLibrary = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'assets/html2canvas.min.js';
      script.onload = resolve;
      script.onerror = () => { pictureLibrary = null; reject(Error('Library unavailable')); };
      document.head.append(script);
    });
    return pictureLibrary;
  }
  // Mama reads the card out loud. Audio is kept for the same words so replaying costs nothing extra.
  const voiceStatus = finishedCard.querySelector('#voice-status');
  const hearButton = finishedCard.querySelector('#hear-mama');
  const saveVoiceButton = finishedCard.querySelector('#download-voice');
  let voiceCache = { text: '', blob: null };
  let player = null;
  const cardWords = () => [draft.title.trim(), draft.message.trim()].filter(Boolean).join('. ');
  async function getMamaVoice() {
    const text = cardWords();
    if (!text) throw Error('Write a message first, baby.');
    if (voiceCache.text === text && voiceCache.blob) return voiceCache.blob;
    const response = await fetch('/api/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(45000) });
    if (!response.ok) {
      let message = "Mama couldn't speak just now. Please try again.";
      try { message = (await response.json()).message || message; } catch {}
      throw Error(message);
    }
    const blob = await response.blob();
    voiceCache = { text, blob };
    return blob;
  }
  hearButton.addEventListener('click', async () => {
    if (player && !player.paused) { player.pause(); hearButton.textContent = '▶ Hear Mama Say It'; voiceStatus.textContent = ''; return; }
    hearButton.disabled = true; saveVoiceButton.disabled = true;
    voiceStatus.textContent = 'Mama is getting ready to speak…';
    try {
      const blob = await getMamaVoice();
      if (player) URL.revokeObjectURL(player.src);
      player = new Audio(URL.createObjectURL(blob));
      player.addEventListener('ended', () => { hearButton.textContent = '▶ Hear Mama Say It'; voiceStatus.textContent = ''; });
      await player.play();
      hearButton.textContent = '■ Stop';
      voiceStatus.textContent = 'Mama is reading your card.';
    } catch (error) { voiceStatus.textContent = error.message; }
    finally { hearButton.disabled = false; saveVoiceButton.disabled = false; }
  });
  saveVoiceButton.addEventListener('click', async () => {
    hearButton.disabled = true; saveVoiceButton.disabled = true;
    voiceStatus.textContent = 'Getting Mama’s voice ready to save…';
    try {
      const blob = await getMamaVoice();
      const link = document.createElement('a');
      const name = (draft.title.trim() || 'mama-said-card').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'mama-said-card';
      link.download = `${name}-mama-voice.mp3`;
      link.href = URL.createObjectURL(blob);
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      voiceStatus.textContent = 'Mama’s voice was saved. Look in your Downloads folder.';
    } catch (error) { voiceStatus.textContent = error.message; }
    finally { hearButton.disabled = false; saveVoiceButton.disabled = false; }
  });
  const downloadButton = finishedCard.querySelector('#download-finished-card');
  const downloadStatus = finishedCard.querySelector('#download-status');
  // Phones and tablets save pictures through the Share menu or press-and-hold, not a Downloads folder.
  const isPhone = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  function showPhoneSave(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const isApple = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
    const overlay = document.createElement('div');
    overlay.className = 'phone-save';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Save your card');
    overlay.innerHTML = `<div class="phone-save-box">
      <h2>Save your card</h2>
      <button type="button" class="phone-save-share">Save or Send My Card</button>
      <p class="phone-save-help"></p>
      <img alt="Your finished Mama Said card">
      <button type="button" class="phone-save-close">Done</button>
    </div>`;
    overlay.querySelector('img').src = url;
    const file = new File([blob], fileName, {type: 'image/png'});
    const shareButton = overlay.querySelector('.phone-save-share');
    const canShare = !!(navigator.canShare && navigator.canShare({files: [file]}));
    if (!canShare) shareButton.hidden = true;
    const holdHelp = isApple ? 'press and hold the picture, then tap "Save to Photos."' : 'press and hold the picture, then tap "Download image."';
    overlay.querySelector('.phone-save-help').textContent = canShare
      ? (isApple ? 'Tap the button above, then choose "Save Image" to put it in your Photos. Or ' : 'Tap the button above to save or send it. Or ') + holdHelp
      : holdHelp.charAt(0).toUpperCase() + holdHelp.slice(1);
    shareButton.addEventListener('click', async () => {
      try { await navigator.share({files: [file], title: 'My Mama Said card'}); }
      catch (error) { if (error.name !== 'AbortError') overlay.querySelector('.phone-save-help').textContent = 'Press and hold the picture, then choose save.'; }
    });
    const close = () => { overlay.remove(); URL.revokeObjectURL(url); downloadButton.focus(); };
    overlay.querySelector('.phone-save-close').addEventListener('click', close);
    overlay.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
    document.body.append(overlay);
    (shareButton.hidden ? overlay.querySelector('.phone-save-close') : shareButton).focus();
  }
  downloadButton.addEventListener('click', async () => {
    downloadButton.disabled = true;
    downloadStatus.textContent = 'Getting your card ready…';
    try {
      await loadPictureLibrary();
      await document.fonts.ready;
      const canvas = await window.html2canvas($('card-preview'), { scale: 2, backgroundColor: null, useCORS: true });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw Error('No picture');
      const name = (draft.title.trim() || 'mama-said-card').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'mama-said-card';
      if (isPhone()) {
        // Phones: show the finished picture with a Save / Share button and press-and-hold help.
        showPhoneSave(blob, `${name}.png`);
        downloadStatus.textContent = 'Your card is ready to save to your phone.';
        return;
      }
      const link = document.createElement('a');
      link.download = `${name}.png`;
      link.href = URL.createObjectURL(blob);
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      downloadStatus.textContent = 'Your card was downloaded. Look in your Downloads folder.';
    } catch {
      downloadStatus.textContent = 'The download did not work. Check your internet connection and try again. Your card is unchanged.';
    } finally { downloadButton.disabled = false; }
  });
  window.addEventListener('beforeunload', event => {
    if (pending || unsaved || uploading) { event.preventDefault(); event.returnValue = ''; }
  });
  const controlsPanel = document.querySelector('.controls-panel');
  const previewFitArea = document.querySelector('.preview-fit-area');
  let lastEditingField = null;
  let cardViewReturn = null;
  // CSS owns viewport sizing. Page scrolling never scales card typography.
  function alignDesktopEditor() { controlsPanel.scrollTop = 0; }
  controlsPanel.addEventListener('focusin',event => { lastEditingField = event.target; });
  function revealWriting(part) {
    if (!matchMedia('(min-width:900px)').matches || document.body.classList.contains('card-full-view')) return;
    const target = $(`preview-${part}`);
    const area = previewFitArea.getBoundingClientRect();
    const text = target.getBoundingClientRect();
    if (text.top < area.top || text.bottom > area.bottom) {
      previewFitArea.scrollTop += text.top - area.top - 12;
    }
  }
  ['title-font-family','title-font-size','title-text-color','title-text-backing'].forEach(id => $(id).addEventListener('change',() => revealWriting('title')));
  ['font-family','font-size','text-color','message-text-backing'].forEach(id => $(id).addEventListener('change',() => revealWriting('message')));
  $('card-title').addEventListener('input',() => revealWriting('title'));
  $('card-message').addEventListener('input',() => revealWriting('message'));

  function openCardView() {
    cardViewReturn = {scrollY:window.scrollY,controlsScroll:controlsPanel.scrollTop,previewScroll:previewFitArea.scrollTop,focus:lastEditingField};
    document.body.classList.add('card-full-view');
    $('close-card-view').hidden = false;
    $('preview-heading').focus();
    window.scrollTo(0,0);
  }
  function closeCardView() {
    if (!document.body.classList.contains('card-full-view')) return;
    document.body.classList.remove('card-full-view');
    $('close-card-view').hidden = true;
    controlsPanel.scrollTop = cardViewReturn?.controlsScroll || 0;
    (cardViewReturn?.focus || $('card-controls')).focus({preventScroll:true});
    window.scrollTo(0,cardViewReturn?.scrollY || 0);
    previewFitArea.scrollTop = cardViewReturn?.previewScroll || 0;
  }
  $('view-card-button').addEventListener('click',openCardView);
  $('close-card-view').addEventListener('click',closeCardView);
  document.addEventListener('keydown',event => {if(event.key === 'Escape' && document.body.classList.contains('card-full-view')) {event.preventDefault();closeCardView();}});
  initialize();
})();
