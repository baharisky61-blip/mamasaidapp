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
    $('image-status').textContent = draft.image ? `${draft.imageName} is on your card.` : 'No image selected.';
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
  $('show-mama').addEventListener('change',event => {draft.mama = event.target.checked;save();});
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
  downloadButton.addEventListener('click', async () => {
    downloadButton.disabled = true;
    downloadStatus.textContent = 'Getting your card ready…';
    try {
      await loadPictureLibrary();
      await document.fonts.ready;
      const canvas = await window.html2canvas($('card-preview'), { scale: 2, backgroundColor: null, useCORS: true });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw Error('No picture');
      const link = document.createElement('a');
      const name = (draft.title.trim() || 'mama-said-card').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'mama-said-card';
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
