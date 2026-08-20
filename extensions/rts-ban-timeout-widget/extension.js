(function(){
  const btn=document.getElementById('copyImport');
  const code=document.getElementById('importCode');
  const overlayBtn=document.getElementById('copyOverlayUrl');
  const importUrl={{ site.data.rts_ban_timeout_import.filename | relative_url | jsonify }};
  const overlayUrl=new URL('overlay/',window.location.href).href;
  function setCopied(button,label,icon){
    button.innerHTML='COPIED <span class="'+icon+'">✓</span>';
    button.classList.add('copied');
    setTimeout(function(){
      button.innerHTML=label+' <span class="'+icon+'">⧉</span>';
      button.classList.remove('copied');
    },1600);
  }
  if(btn&&code){
    fetch(importUrl).then(r=>{if(!r.ok)throw new Error('Import file unavailable');return r.text()}).then(text=>{code.textContent=text}).catch(()=>{code.textContent='Unable to load the current import code. Use the versioned download link below.'});
    btn.addEventListener('click',async()=>{
      try{
        await navigator.clipboard.writeText(code.textContent.trim());
        setCopied(btn,'COPY IMPORT','copy-icon');
      }catch(e){
        const range=document.createRange();range.selectNodeContents(code);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
        try{document.execCommand('copy');setCopied(btn,'COPY IMPORT','copy-icon')}catch(_){sel.removeAllRanges()}
        sel.removeAllRanges();
      }
    });
  }
  if(overlayBtn){
    overlayBtn.addEventListener('click',async()=>{
      try{
        await navigator.clipboard.writeText(overlayUrl);
        setCopied(overlayBtn,'COPY OVERLAY URL','button-icon');
      }catch(e){
        try{
          const input=document.createElement('textarea');input.value=overlayUrl;input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();document.execCommand('copy');input.remove();
          setCopied(overlayBtn,'COPY OVERLAY URL','button-icon');
        }catch(_){
          overlayBtn.innerHTML='COPY FAILED <span class="button-icon">!</span>';
          setTimeout(function(){overlayBtn.innerHTML='COPY OVERLAY URL <span class="button-icon">⧉</span>'},1600);
        }
      }
    });
  }
  document.querySelectorAll('.collapse-toggle').forEach(toggle=>{
    toggle.addEventListener('click',()=>{
      const target=document.getElementById(toggle.dataset.toggle);if(!target)return;
      const collapsed=target.classList.toggle('is-collapsed');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.textContent=collapsed?'Expand':'Collapse';
    });
  });
})();
