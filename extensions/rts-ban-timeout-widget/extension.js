(function(){
  const btn=document.getElementById('copyImport');
  const code=document.getElementById('importCode');
  const overlayBtn=document.getElementById('copyOverlayUrl');
  const versionEl=document.querySelector('.release-line .version');
  const versionMatch=versionEl&&versionEl.textContent.match(/v([0-9]+\.[0-9]+\.[0-9]+)/i);
  const version=versionMatch?versionMatch[1]:null;
  const importUrl=version?new URL('../RTS%20Ban%20Timeout%20Widget%20v'+encodeURIComponent(version)+'%20-%20Import%20Code.txt',window.location.href).href:null;
  const overlayUrl=new URL('overlay/',window.location.href).href;
  function setCopied(button,label,icon){
    button.innerHTML='COPIED <span class="'+icon+'">✓</span>';
    button.classList.add('copied');
    setTimeout(function(){button.innerHTML=label+' <span class="'+icon+'">⧉</span>';button.classList.remove('copied')},1600);
  }
  async function copyText(text){
    if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return}
    const input=document.createElement('textarea');input.value=text;input.setAttribute('readonly','');input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();if(!document.execCommand('copy')){input.remove();throw new Error('Copy failed')}input.remove();
  }
  if(btn&&code){
    if(!importUrl){code.textContent='Unable to determine the current release version.'}
    else fetch(importUrl).then(r=>{if(!r.ok)throw new Error('Import file unavailable');return r.text()}).then(text=>{code.textContent=text}).catch(()=>{code.textContent='Unable to load the current import code. Use the versioned download link below.'});
    btn.addEventListener('click',async()=>{try{await copyText(code.textContent.trim());setCopied(btn,'COPY IMPORT','copy-icon')}catch(e){btn.innerHTML='COPY FAILED <span class="copy-icon">!</span>';setTimeout(()=>{btn.innerHTML='COPY IMPORT <span class="copy-icon">⧉</span>'},1600)}})
  }
  if(overlayBtn){overlayBtn.addEventListener('click',async()=>{try{await copyText(overlayUrl);setCopied(overlayBtn,'COPY OVERLAY URL','button-icon')}catch(e){overlayBtn.innerHTML='COPY FAILED <span class="button-icon">!</span>';setTimeout(()=>{overlayBtn.innerHTML='COPY OVERLAY URL <span class="button-icon">⧉</span>'},1600)}})}
  document.querySelectorAll('.collapse-toggle').forEach(toggle=>{toggle.addEventListener('click',()=>{const target=document.getElementById(toggle.dataset.toggle);if(!target)return;const collapsed=target.classList.toggle('is-collapsed');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.textContent=collapsed?'Expand':'Collapse'})})
})();
