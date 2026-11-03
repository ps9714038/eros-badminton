/* ERos official photo gallery. Reads persistent, versioned data only. No browser-local uploads. */
(() => {
  'use strict';
  const grid = document.getElementById('photoGrid');
  if (!grid) return;
  const count = document.getElementById('galleryCount');
  const tabs = document.getElementById('galleryTabs');
  const status = document.getElementById('photoStatus');
  const more = document.getElementById('galleryLoadMore');
  const data = Array.isArray(window.EROS_PHOTOS) ? window.EROS_PHOTOS : [];
  const photos = data.filter(item => item && typeof item.src === 'string' && item.src.startsWith('photos/') && !item.src.includes('..'))
                     .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')) || String(b.id).localeCompare(String(a.id)));
  const names = ['全部', ...new Set(photos.map(p=>String(p.album||'球場日常')))];
  let active = '全部';
  let visible = 12;
  const text = (tag, cls, val) => { const el=document.createElement(tag); if(cls)el.className=cls; el.textContent=val; return el; };
  function card(p) {
    const fig = document.createElement('figure'); fig.className='photo-item';
    const link = document.createElement('a'); link.href=p.src; link.target='_blank'; link.rel='noopener noreferrer';
    link.setAttribute('aria-label','開啟照片：'+String(p.title||'ERos 球團照片'));
    const img = document.createElement('img'); img.loading='lazy'; img.decoding='async';
    img.src=p.thumb || p.src; img.alt=String(p.alt||p.title||'ERos 羽球團團體照');
    link.append(img); fig.append(link);
    const cap = document.createElement('figcaption');
    cap.append(text('span','',String(p.title||'ERos 球團回憶')));
    if (p.date) cap.append(text('span','date',String(p.date)));
    if (p.note) cap.append(text('span','date',String(p.note)));
    fig.append(cap); return fig;
  }
  function renderTabs() {
    tabs.replaceChildren();
    if (names.length < 3) return;
    names.forEach(name=>{
      const b=text('button','album-filter',name); b.type='button'; b.setAttribute('aria-pressed',String(name===active));
      b.addEventListener('click',()=>{active=name;visible=12;renderTabs();render();});tabs.append(b);
    });
  }
  function render() {
    if(!photos.length){
      count.textContent='0 張正式照片・等待第一張團體照';
      status.textContent='照片將以正式檔案保存於網站，日後新增不影響已刊登的照片。';
      more.hidden=true; return;
    }
    const selected=photos.filter(p=>active==='全部'||String(p.album||'球場日常')===active);
    grid.replaceChildren(...selected.slice(0,visible).map(card));
    count.textContent=`共 ${photos.length} 張照片${active==='全部'?'':'・'+active+' '+selected.length+' 張'}`;
    status.textContent='所有照片由球團管理員審核後發布；照片存在網站專案內，不會因重新開啟網頁而消失。';
    more.hidden=selected.length<=visible;
  }
  more.addEventListener('click',()=>{visible+=12;render();});
  renderTabs();render();
})();
