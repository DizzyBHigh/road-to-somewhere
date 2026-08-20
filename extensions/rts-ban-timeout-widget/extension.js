(function(){
  const btn=document.getElementById('copyImport');
  const code=document.getElementById('importCode');
  const overlayBtn=document.getElementById('copyOverlayUrl');
  const importUrl="{{ site.data.rts_ban_timeout_import.filename | relative_url }}";
  const overlayUrl=new URL('overlay/',window.location.href).href;
  function setCopied(button,label,icon){
    button.innerHTML='COPIED <span class="'+icon+'">✓</span>';
    button.classList.add('copied');
    setTimeout(function(){
      button.innerHTML=label+' <span class="'+icon+'">⧉</span>';
      button.classList.remove('copied');
    },1600);
  }
  async function copyText(text){
    if(navigator.clipboard && window.isSecureContext){
      await navigator.clipboard.writeText(text);
      return true;
    }
    const input=document.createElement('textarea');
    input.value=text;input.setAttribute('readonly','');input.style.position='fixed';input.style.opacity='0';
    document.body.appendChild(input);input.select();
    const ok=document.execCommand('copy');input.remove();
    if(!ok) throw new Error('Copy failed');
    return true;
  }
  if(btn&&code){
    fetch(importUrl).then(r=>{if(!r.ok)throw new Error('Import file unavailable');return r.text()}).then(text=>{code.textContent=text}).catch(()=>{code.textContent='Unable to load the current import code. Use the versioned download link below.'});
    btn.addEventListener('click',async()=>{
      try{await copyText(code.textContent.trim());setCopied(btn,'COPY IMPORT','copy-icon')}
      catch(e){btn.innerHTML='COPY FAILED <span class="copy-icon">!</span>';setTimeout(()=>{btn.innerHTML='COPY IMPORT <span class="copy-icon">⧉</span>'},1600)}
    });
  }
  if(overlayBtn){
    overlayBtn.addEventListener('click',async()=>{
      try{await copyText(overlayUrl);setCopied(overlayBtn,'COPY OVERLAY URL','button-icon')}
      catch(e){overlayBtn.innerHTML='COPY FAILED <span class="button-icon">!</span>';setTimeout(()=>{overlayBtn.innerHTML='COPY OVERLAY URL <span class="button-icon">⧉</span>'},1600)}
    });
  }
  document.querySelectorAll('.collapse-toggle').forEach(toggle=>{
    toggle.addEventListener('click',()=>{
      const target=document.getElementById(toggle.dataset.toggle);if(!target)return;
      const collapsed=target.classList.toggle('is-collapsed');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.textContent=collapsed?'Expand':'Collapse';
    });
  });
})();
