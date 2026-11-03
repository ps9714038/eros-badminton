/* ERos event albums: one cover per event; open to view all photos. */
(() => {
  'use strict';
  const grid = document.getElementById('photoGrid');
  if (!grid) return;
  const count = document.getElementById('galleryCount');
  const tabs = document.getElementById('galleryTabs');
  const status = document.getElementById('photoStatus');
  const more = document.getElementById('galleryLoadMore');
  const photos = (Array.isArray(window.EROS_PHOTOS) ? window.EROS_PHOTOS : [])
    .filter(p => p && typeof p.src === 'string' && !p.src.includes('..') && !/^https?:/i.test(p.src))
    .sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')) || String(a.id || '').localeCompare(String(b.id || '')));
  const albums = new Map();
  photos.forEach(p => {
    const key = String(p.album || p.date || '球場日常');
    if (!albums.has(key)) albums.set(key, []);
    albums.get(key).push(p);
  });
  let currentAlbum = null;
  let visible = 12;
  const el = (tag, className, textValue) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textValue !== undefined) node.textContent = textValue;
    return node;
  };
  const imagePath = p => p.thumb || p.src;
  const img = (p) => {
    const image = document.createElement('img');
    image.src = imagePath(p);
    image.alt = String(p.alt || p.title || 'ERos 羽球團照片');
    image.loading = 'lazy';
    image.decoding = 'async';
    image.onerror = () => { if (image.src !== new URL(p.src, location.href).href) image.src = p.src; };
    return image;
  };
  const styles = document.createElement('style');
  styles.textContent = `
    #photoGrid.eros-albums {grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
    #photoGrid .eros-album {display:block;width:100%;padding:0;border:1px solid #e5e7dc;background:#fffdf8;overflow:hidden;border-radius:23px;text-align:left;cursor:pointer;box-shadow:0 10px 26px rgba(28,65,51,.055);transition:transform .2s,box-shadow .2s;color:inherit}
    #photoGrid .eros-album:hover {transform:translateY(-4px);box-shadow:0 17px 32px rgba(28,65,51,.13)}
    #photoGrid .eros-album img {display:block;width:100%;height:260px;object-fit:cover}
    #photoGrid .eros-album-info {display:flex;justify-content:space-between;gap:12px;align-items:center;padding:17px 19px}
    #photoGrid .eros-album-info strong {display:block;color:#19483c;font-size:17px;line-height:1.5}
    #photoGrid .eros-album-info small {display:block;color:#70877a;font-size:13px;margin-top:4px}
    #photoGrid .eros-album-arrow {flex-shrink:0;width:37px;height:37px;border-radius:50%;display:grid;place-items:center;background:#edf3e7;color:#245b45;font-size:21px}
    #galleryTabs .eros-back {display:inline-flex;align-items:center;gap:7px;border-radius:100px;background:#235445;color:#fff;border:0;padding:10px 17px;font-weight:800;cursor:pointer}
    #photoGrid .photo-item img {display:block;max-height:none}
    @media(max-width:800px){#photoGrid.eros-albums{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:560px){#photoGrid.eros-albums{grid-template-columns:1fr}#photoGrid .eros-album img{height:220px}}
  `;
  document.head.appendChild(styles);
  function drawOverview() {
    currentAlbum = null;
    grid.classList.add('eros-albums');
    grid.replaceChildren();
    tabs.replaceChildren();
    more.hidden = true;
    if (!photos.length) {
      count.textContent = '0 本相簿・等待第一張活動照片';
      status.textContent = '未來的活動照片將依場次保存，點選相簿就能查看當天照片。';
      return;
    }
    for (const [name, items] of albums) {
      const cover = el('button','eros-album');
      cover.type='button';
      cover.append(img(items[0]));
      const info=el('div','eros-album-info');
      const meta=el('div');
      meta.append(el('strong','',name),el('small','',items.length+' 張照片 · 點擊查看'));
      info.append(meta,el('span','eros-album-arrow','→'));
      cover.append(info);
      cover.addEventListener('click',()=>{ currentAlbum=name; visible=12; drawAlbum(); });
      grid.append(cover);
    }
    count.textContent = '共 '+albums.size+' 本活動相簿・'+photos.length+' 張照片';
    status.textContent = '點選活動封面即可瀏覽該場照片；新增其他場次後會自動建立新的相簿。';
  }
  function drawAlbum() {
    const items=albums.get(currentAlbum)||[];
    grid.classList.remove('eros-albums');
    grid.replaceChildren();
    tabs.replaceChildren();
    const back=el('button','eros-back','← 返回活動相簿');
    back.type='button';
    back.addEventListener('click',drawOverview);
    tabs.append(back);
    count.textContent = currentAlbum+' · 共 '+items.length+' 張照片';
    for(const p of items.slice(0,visible)){
      const fig=el('figure','photo-item');
      const link=document.createElement('a');
      link.href=p.src;link.target='_blank';link.rel='noopener noreferrer';
      link.setAttribute('aria-label','開啟照片：'+String(p.title||'ERos 羽球團照片'));
      link.append(img(p));fig.append(link);
      const cap=el('figcaption');
      cap.append(el('span','',String(p.title||'ERos 球團回憶')));
      if(p.date)cap.append(el('span','date',String(p.date)));
      fig.append(cap);grid.append(fig);
    }
    more.hidden = items.length <= visible;
    status.textContent='點擊照片可開啟原圖。';
  }
  more.addEventListener('click',()=>{visible+=12;if(currentAlbum)drawAlbum();});
  drawOverview();
})();