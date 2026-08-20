(function(){
  const btn=document.getElementById('copyImport');
  const code=document.getElementById('importCode');
  const overlayBtn=document.getElementById('copyOverlayUrl');
  const importUrl={{ site.data.rts_ban_timeout_import.filename | relative_url | jsonify }};
  const overlayUrl=new URL('overlay/',window.location.href).href;
  function restoreCopyImport(){btn.innerHTML='Copy Import <span class="copy-icon">⧉</span>';btn.classList.remove('copied')}
  function restoreOverlay(){overlayBtn.innerHTML='Copy Overlay URL <span class="button-icon">⧉</span>';overlayBtn.classList.remove('copied')}
  if(btn&&code){
    fetch(importUrl).then(r=>{if(!r.ok)throw new Error('Import file unavailable');return r.text()}).then(text=>{code.textContent=text}).catch(()=>{code.textContent='Unable to load the current import code. Use the versioned download link below.'});
    btn.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(code.textContent.trim());btn.innerHTML='Copied <span class="copy-icon">✓</span>';btn.classList.add('copied');setTimeout(restoreCopyImport,1600)}
      catch(e){const range=document.createRange();range.selectNodeContents(code);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);document.execCommand?.('copy');sel.removeAllRanges();btn.innerHTML='Copied <span class="copy-icon">✓</span>';btn.classList.add('copied');setTimeout(restoreCopyImport,1600)}
    });
  }
  if(overlayBtn){
    overlayBtn.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(overlayUrl);overlayBtn.innerHTML='Copied <span class="button-icon">✓</span>';overlayBtn.classList.add('copied');setTimeout(restoreOverlay,1600)}
      catch(e){overlayBtn.innerHTML='Copy Failed <span class="button-icon">⧉</span>';setTimeout(restoreOverlay,1600)}
    });
  }
  document.querySelectorAll('.collapse-toggle').forEach(toggle=>{
    toggle.addEventListener('click',()=>{
      const target=document.getElementById(toggle.dataset.toggle);if(!target)return;
      const collapsed=target.classList.toggle('is-collapsed');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.textContent=collapsed?'Expand':'Collapse';
    });
  });
})();
