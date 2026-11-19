import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import './style.css';
import { dateIn, food, readFoodLabel, readReceipt, suggestedExpiry } from './receipt.js';

const icons = { plus: '09f88', fridge: '0ac36', close: '17cf6', calendar: '6020c', search: '865af', clock: '8e4c9', check: 'e48e7' };
const storageKey = 'swiper-fridge-v1';
const starter = [
  { ...food('Chicken Pasta', dateIn(0)), category: 'Produce', id: 'pasta' },
  { ...food('Garlic Bread', dateIn(0), true), id: 'garlic-bread' },
  { ...food('Spinach', dateIn(1), true), id: 'spinach' },
  { ...food('Yogurt', dateIn(2)), id: 'yogurt', owner: 'Varsha' },
  { ...food('Strawberries', dateIn(7)), id: 'strawberries' },
  { ...food('Milk'), id: 'milk' },
  { ...food('Cream Cheese'), id: 'cream-cheese' },
  { ...food('Shredded Cheese'), id: 'cheese' },
];

function initialItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved)) {
      if (!saved.some(item => Object.hasOwn(item, 'photo'))) return saved;
      const items = saved.map(({ photo, ...details }) => details);
      try {
        localStorage.setItem(storageKey, JSON.stringify(items));
      } catch {}
      return items;
    }
  } catch {}
  return starter;
}

const actionIcons = {
  receipt: 'M5 3l2 1 2-1 3 1 3-1 2 1 2-1v18l-2-1-2 1-3-1-3 1-2-1-2 1z M8 8h8 M8 12h8 M8 16h5',
  camera: 'M3 7h4l2-3h6l2 3h4v14H3z M16 13a4 4 0 1 0-8 0 4 4 0 0 0 8 0z',
  edit: 'M3 21l1-5L16 4a3 3 0 0 1 4 4L8 20l-5 1z',
  remove: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  utensils: 'M4 3v6a3 3 0 0 0 6 0V3 M7 3v18 M17 21V3c-2 2-3 5-3 9h3',
  tick: 'm5 12 4 4L19 6',
  warning: 'M12 8v5 M12 16v.2 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
};

function Icon({ name }) {
  if (actionIcons[name]) return <svg className="icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={actionIcons[name]} /></svg>;
  return <img className="icon" alt="" src={`${import.meta.env.BASE_URL}icons/${icons[name]}.svg`} />;
}

function expiryLabel(expiry) {
  if (!expiry) return 'No expiry set';
  if (expiry < dateIn(0)) return 'Expired';
  if (expiry === dateIn(0)) return 'Expires today';
  if (expiry === dateIn(1)) return '1 day';
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(`${expiry}T00:00:00`));
}

function SwipeFood({ item, urgency, tags, details, open, onToggle, onResolve }) {
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const [dragWidth, setDragWidth] = useState(null);
  const actionWidth = 140;

  function start(event) {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, delta: 0, dragging: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event) {
    const swipe = gesture.current;
    if (swipe?.id !== event.pointerId) return;
    const delta = event.clientX - swipe.x;
    const vertical = Math.abs(event.clientY - swipe.y);
    if (!swipe.dragging && (Math.abs(delta) < 10 || Math.abs(delta) <= vertical)) return;
    swipe.dragging = true;
    swipe.delta = delta;
    setDragWidth(Math.max(0, Math.min(actionWidth, (open ? actionWidth : 0) - delta)));
  }

  function finish(event) {
    const swipe = gesture.current;
    if (swipe?.id !== event.pointerId) return;
    gesture.current = null;
    setDragWidth(null);
    if (event.type === 'pointercancel' || !swipe.dragging) return;
    suppressClick.current = true;
    if (swipe.delta < -40) onToggle(true);
    if (swipe.delta > 40) onToggle(false);
  }

  const days = Array.from({ length: 7 }, (_, index) => index + 1).find(day => item.expiry === dateIn(day));
  const width = dragWidth ?? (open ? actionWidth : 0);
  return <div className={`swipe-food ${dragWidth !== null ? 'dragging' : ''} ${open ? 'open' : ''}`} style={{ '--reveal': `${width}px` }}>
    <button className="food-card compact" aria-label={`Actions for ${item.name}`} aria-expanded={open}
      onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}
      onClick={event => {
        if (event.detail && suppressClick.current) return;
        onToggle(!open);
      }}
      onKeyDown={event => { if (event.key === 'Escape' && open) onToggle(false); }}>
      <span className={`dot ${urgency}`} />
      <span className="compact-details">{details}<span className="compact-meta">{tags}{days && <span className="expiry">{days} {days === 1 ? 'day' : 'days'} left</span>}</span></span>
      <span className="swipe-arrow" aria-hidden="true">‹</span>
    </button>
    <div className="swipe-actions" aria-hidden={!open}>
      <button className="ate" tabIndex={open ? 0 : -1} onClick={() => onResolve('eaten')}><Icon name="tick" />Ate</button>
      <button className="tossed" tabIndex={open ? 0 : -1} onClick={() => onResolve('tossed')}><Icon name="remove" />Tossed</button>
    </div>
  </div>;
}

function FoodCard({ item, compact, open, onToggle, onResolve }) {
  const urgency = item.expiry && item.expiry <= dateIn(0) ? 'urgent' : item.expiry && item.expiry <= dateIn(2) ? 'soon' : '';
  const tags = <>
    {item.shared && <span className="tag shared">Shared</span>}
    {item.owner && !compact && <span className="tag">{item.owner}</span>}
    {item.fresh && !compact && <span className="tag fresh">New</span>}
  </>;
  const details = <span className="food-name">{item.name}{item.quantity > 1 && <span className="quantity"> ×{item.quantity}</span>}</span>;
  if (compact) return <SwipeFood item={item} urgency={urgency} tags={tags} details={details} open={open} onToggle={onToggle} onResolve={onResolve} />;
  return <article className={`food-card ${item.fresh ? 'new' : ''}`}>
    <div className="card-tags"><span className={`dot ${urgency}`} />{tags}</div>
    <div>{details}<div className="expiry">{item.expirySource === 'suggested' && 'Suggested · '}{expiryLabel(item.expiry)}</div></div>
  </article>;
}

function Sheet({ title, onClose, children, full = false }) {
  return <div className="backdrop" onClick={onClose}>
    <section className={`sheet ${full ? 'full-sheet' : ''}`} role="dialog" aria-modal="true" aria-labelledby="sheet-title"
      onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
      {!full && <div className="handle" />}
      <div className="sheet-title">
        <h2 id="sheet-title">{title}</h2>
        <button autoFocus type="button" className="icon-button" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </div>
      {children}
    </section>
  </div>;
}

function ItemForm({ item, suggested, onSave, onRemove, onAddAnother, queued = 0 }) {
  const [name, setName] = useState(item?.name ?? suggested?.name ?? '');
  const [chosenExpiry, setChosenExpiry] = useState(() =>
    item ? (item.expirySource === 'suggested' || (item.unreadable && !item.expiry) ? null : item.expiry) : suggested?.expiry || null
  );
  const expiry = chosenExpiry ?? suggestedExpiry(name);
  const expiryIsSuggested = chosenExpiry === null && Boolean(expiry);
  const [shared, setShared] = useState(item?.shared ?? false);
  const [quantity, setQuantity] = useState(item?.quantity ?? suggested?.quantity ?? '');
  function createItem() {
    return {
      ...food(name.trim(), expiry, shared),
      ...(item && { id: item.id }),
      quantity: Number(quantity) || 1,
      expirySource: expiryIsSuggested ? 'suggested' : undefined,
    };
  }
  return <form className="item-form" onSubmit={event => {
    event.preventDefault();
    if (name.trim() || queued) onSave(name.trim() ? createItem() : null);
  }}>
    {suggested && <p className="photo-hint">{suggested?.name ? 'Check the suggested details before saving.' : 'Food name unclear. Enter a name before saving.'}{suggested?.expiry ? ' Check the printed date on the package.' : ''}</p>}
    <label>Name<input required={!queued} maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="ex. cottage cheese" /></label>
    <label>Quantity<input type="number" min="1" max="999" step="1" inputMode="numeric" placeholder="select quantity" value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
    <label>Expiry<span className="date-field"><input type="date" value={expiry} onChange={event => setChosenExpiry(event.target.value)} /><Icon name="calendar" /></span>
      {expiryIsSuggested && <small className="expiry-hint">Suggested reminder · edit to match your food</small>}
    </label>
    {item && <label className="checkbox"><input type="checkbox" checked={shared} onChange={event => setShared(event.target.checked)} />{shared && <Icon name="check" />}Shared in the fridge</label>}
    {queued > 0 && <p className="queued" role="status">{queued} {queued === 1 ? 'item' : 'items'} ready to save</p>}
    <div className="form-actions">
      {onRemove && <button className="light outline" type="button" onClick={onRemove}>Remove item</button>}
      {onAddAnother && <button className="light outline" type="button" disabled={!name.trim()} onClick={event => {
        if (event.currentTarget.form.reportValidity()) onAddAnother(createItem());
      }}>Add another +</button>}
      <button className="light" disabled={!name.trim() && !queued} type="submit">Save</button>
    </div>
  </form>;
}

function stopStream(stream) {
  stream?.getTracks().forEach(track => track.stop());
}

function cameraMessage(error) {
  if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
    return 'Camera access is blocked. Allow it in your browser settings or upload a picture.';
  }
  if (error.name === 'NotFoundError') return 'No camera was found. You can upload a picture instead.';
  return 'Could not start the camera. Check if another app is using it, or upload a picture.';
}

function Capture({ receipt, active, error, progress, onFile, onManual }) {
  const video = useRef(null);
  const stream = useRef(null);
  const request = useRef(0);
  const [camera, setCamera] = useState('closed');
  const [ready, setReady] = useState(false);
  const [encoding, setEncoding] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const busy = active || encoding;

  useEffect(() => () => {
    request.current += 1;
    stopStream(stream.current);
  }, []);

  function closeCamera() {
    request.current += 1;
    stopStream(stream.current);
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setCamera('closed');
    setReady(false);
  }

  async function openCamera() {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(window.isSecureContext
        ? 'Live camera is unavailable in this browser. You can upload a picture.'
        : 'Open the HTTPS site to use the live camera, or upload a picture.');
      return;
    }
    const id = ++request.current;
    setCamera('opening');
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (id !== request.current) {
        stopStream(media);
        return;
      }
      stream.current = media;
      const player = video.current;
      player.srcObject = media;
      media.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (id !== request.current) return;
        closeCamera();
        setCameraError('Camera disconnected. Reopen it or upload a picture.');
      }, { once: true });
      setCamera('live');
      await player.play();
      if (id === request.current) setReady(Boolean(player.videoWidth && player.videoHeight));
    } catch (failure) {
      if (id !== request.current) return;
      closeCamera();
      setCameraError(cameraMessage(failure));
    }
  }

  function takePicture() {
    const player = video.current;
    if (!ready || !player.videoWidth || !player.videoHeight || busy) return;
    const frame = document.createElement('canvas');
    frame.width = player.videoWidth;
    frame.height = player.videoHeight;
    const drawing = frame.getContext('2d');
    if (!drawing) return;
    drawing.drawImage(player, 0, 0, frame.width, frame.height);
    closeCamera();
    const id = request.current;
    setEncoding(true);
    frame.toBlob(file => {
      if (id !== request.current) return;
      setEncoding(false);
      if (file) onFile(file);
      else setCameraError('Could not take a picture. Reopen the camera or upload a picture.');
    }, 'image/jpeg', 0.95);
  }

  function select(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    closeCamera();
    setCameraError('');
    onFile(file);
  }

  return <div className="camera-view">
    <div className="camera-stage">
      <video ref={video} autoPlay muted playsInline hidden={camera === 'closed'} aria-label="Live camera preview"
        onLoadedData={event => {
          const player = event.currentTarget;
          if (player.srcObject === stream.current && player.videoWidth) setReady(true);
        }} />
      {camera === 'closed' && <div className="camera-guide">
        <Icon name={receipt ? 'receipt' : 'camera'} />
        <p>{receipt ? 'Fit the whole receipt in the photo' : 'Take a photo of the food'}</p>
      </div>}
    </div>
    {camera === 'opening' && <p className="scan-message" role="status">Waiting for camera access…</p>}
    {busy && <p className="scan-message" role="status">{!receipt ? 'Identifying food…' : progress == null ? 'Preparing image…' : `Reading receipt… ${progress}%`}</p>}
    {cameraError && <p className="scan-message" role="alert">{cameraError}</p>}
    {error && !busy && !cameraError && <p className="scan-message" role="alert">{error}</p>}
    <div className="camera-controls">
      {camera === 'closed' && <button className="capture-manual" disabled={busy} onClick={openCamera}>Open camera</button>}
      {camera === 'live' && <button className="shutter" aria-label="Take a picture" disabled={!ready || busy} onClick={takePicture} />}
      {camera !== 'closed' && <button className="capture-manual" onClick={closeCamera}>Close camera</button>}
      {cameraError && <label className="file-button upload native-camera">Use phone camera<input type="file" accept="image/*" capture="environment" disabled={busy} onChange={select} /></label>}
      <label className="file-button upload">Upload a picture<input type="file" accept="image/*" disabled={busy} onChange={select} /></label>
      {(error || cameraError) && !busy && <button className="capture-manual" onClick={onManual}>Manually enter</button>}
    </div>
  </div>;
}

function ReviewRow({ item, onUpdate, onEdit, onRemove }) {
  const edit = () => onEdit(item);
  const remove = () => onRemove(item.id);
  if (item.needsConfirmation) return <li className="confirmation-card">
    <div className="confirmation-heading"><Icon name="warning" /><div>
      <h2>{item.unreadable ? 'Unreadable item' : `Is this ${item.name}?`}</h2>
      <p>{item.unreadable ? 'Enter the food name or remove this line.' : <>Receipt says <strong>{item.receiptName}</strong></>}</p>
    </div></div>
    <div className="confirmation-actions">
      {!item.unreadable && <button className="confirm-yes" onClick={() => onUpdate(item.id, { needsConfirmation: false })}><Icon name="tick" />Yes</button>}
      <button onClick={edit}><Icon name="edit" />{item.unreadable ? 'Enter name' : 'Rename'}</button>
      <button className="remove" onClick={remove}><Icon name="remove" />Remove</button>
    </div>
  </li>;
  return <li className="review-row">
    <button className="review-name" onClick={edit}>{item.name}<small>Qty {item.quantity ?? 1} · {item.expirySource === 'suggested' && 'Suggested · '}{item.expiry ? expiryLabel(item.expiry) : 'Enter expiry'}</small></button>
    <button className="share-button" aria-label={`Share ${item.name}`} aria-pressed={item.shared} onClick={() => onUpdate(item.id, { shared: !item.shared })}>{item.shared ? 'Shared' : 'Share +'}</button>
    <button className="review-icon" aria-label={`Edit ${item.name}`} onClick={edit}><Icon name="edit" /></button>
    <button className="review-icon remove" aria-label={`Remove ${item.name}`} onClick={remove}><Icon name="remove" /></button>
  </li>;
}

function App() {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState('soon');
  const [overlay, setOverlay] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState([]);
  const [suggested, setSuggested] = useState(null);
  const [reviewOrigin, setReviewOrigin] = useState('soon');
  const [foundCount, setFoundCount] = useState(0);
  const [scan, setScan] = useState({ active: false, progress: null, error: '' });
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState(null);
  const [openSwipe, setOpenSwipe] = useState(null);
  const [resolved, setResolved] = useState(null);
  const scanRequest = useRef(0);

  useEffect(() => {
    if (!resolved) return;
    const timeout = window.setTimeout(() => setResolved(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [resolved]);

  useEffect(() => {
    if (!notice?.duration) return;
    const timeout = window.setTimeout(() => setNotice(null), notice.duration);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function close() {
    scanRequest.current += 1;
    setOverlay(null);
  }

  async function scanImage(file) {
    const request = ++scanRequest.current;
    setScan({ active: true, progress: null, error: '' });
    try {
      const extracted = await readReceipt(file, progress => {
        if (request === scanRequest.current) setScan(previous => ({ ...previous, progress }));
      });
      if (request !== scanRequest.current) return;
      if (!extracted.length) {
        setScan({ active: false, progress: null, error: 'No line items found. Try a well-lit, close-up photo or add an item manually.' });
        return;
      }
      setDrafts(extracted);
      setFoundCount(extracted.length);
      if (page !== 'review') setReviewOrigin(page);
      setOverlay(null);
      setPage('review');
    } catch {
      if (request === scanRequest.current) {
        setScan({ active: false, progress: null, error: 'Could not read this image. Try another photo, or add an item manually.' });
      }
    }
  }

  function openCapture(mode) {
    setScan({ active: false, progress: null, error: '' });
    setOverlay(mode);
  }

  function openManual() {
    setSuggested(null);
    setPending([]);
    setOverlay('manual');
  }

  async function takeFoodPhoto(file) {
    const request = ++scanRequest.current;
    setScan({ active: true, progress: null, error: '' });
    const [vision, label] = await Promise.allSettled([
      import('./food-vision.js').then(module => module.identifyFood(file)),
      readFoodLabel(file),
    ]);
    if (request !== scanRequest.current) return;
    if (vision.status === 'rejected' && label.status === 'rejected') {
      setScan({ active: false, progress: null, error: 'Could not read this photo. Try a JPEG or PNG.' });
      return;
    }
    const details = label.status === 'fulfilled' ? label.value : { name: '', expiry: '', quantity: 1 };
    openManual();
    setSuggested({ ...details, name: details.name || (vision.status === 'fulfilled' ? vision.value : '') });
  }

  function updateDraft(id, changes) {
    setDrafts(previous => previous.map(item => item.id === id ? { ...item, ...changes } : item));
  }

  function removeDraft(id) {
    setDrafts(previous => previous.filter(item => item.id !== id));
  }


  function persistItems(next, message, duration) {
    setItems(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setNotice(message ? { message, duration } : null);
    } catch {
      setNotice({ message: 'Changes apply for this session. Browser storage is unavailable.' });
    }
  }

  function saveItems(additions) {
    const next = [...additions.map(item => ({ ...item, fresh: true })), ...items.map(item => ({ ...item, fresh: false }))];
    persistItems(next, `${additions.length} ${additions.length === 1 ? 'item' : 'items'} added to your fridge.`);
    setOverlay(null);
    setDrafts([]);
    setOpenSwipe(null);
    setQuery('');
    setFilter('All');
    setPage('fridge');
  }

  function resolveItem(item, action) {
    const index = items.findIndex(entry => entry.id === item.id);
    if (index < 0) return;
    setResolved({ item, index, action });
    setOpenSwipe(null);
    persistItems(items.filter(entry => entry.id !== item.id), '');
  }

  function undoResolution() {
    const { item, index } = resolved;
    const next = [...items];
    next.splice(index, 0, item);
    persistItems(next, `${item.name} restored.`, 10000);
    setResolved(null);
  }

  const visibleItems = items.filter(item => (page !== 'fridge' || item.name.toLowerCase().includes(query.trim().toLowerCase()))
    && (filter !== 'Shared' || item.shared) && (filter !== 'Mine' || (!item.shared && !item.owner)));
  const groups = page === 'soon'
    ? [['Expires today', visibleItems.filter(item => item.expiry && item.expiry <= dateIn(0))],
       ['Next 2 days', visibleItems.filter(item => item.expiry > dateIn(0) && item.expiry <= dateIn(2))],
       ['This week', visibleItems.filter(item => item.expiry > dateIn(2) && item.expiry <= dateIn(7))]]
    : ['Produce', 'Dairy', 'Meat & seafood', 'Other'].map(category => [category, visibleItems.filter(item => item.category === category)]);
  const dateHeading = new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  return <div className="app">
    <main className={page === 'review' ? 'review-page' : ''} inert={overlay ? '' : undefined}>
      {page === 'review' ? <>
        <h1>Confirm items</h1>
        <p className="subtitle">Receipt scanned - {foundCount} {foundCount === 1 ? 'item' : 'items'} found</p>
        {!drafts.length && <p className="empty" role="status">No items left. Scan again or add an item manually.</p>}
        <ul className="review-list">{drafts.map(item => <ReviewRow key={item.id} item={item} onUpdate={updateDraft} onRemove={removeDraft}
          onEdit={entry => { setEditing(entry); setOverlay('edit'); }} />)}</ul>
        <div className="review-actions">
          <button className="primary" disabled={!drafts.length || drafts.some(item => item.needsConfirmation)} onClick={() => saveItems(drafts)}>Add {drafts.length} {drafts.length === 1 ? 'item' : 'items'}</button>
          <div className="review-secondary">
            <button className="text-button" onClick={() => openCapture('receipt')}>Scan again</button>
            <button className="text-button" onClick={() => setOverlay('add-review')}>Add missing item</button>
            <button className="text-button" onClick={() => { setPage(reviewOrigin); setDrafts([]); }}>Cancel</button>
          </div>
        </div>
      </> : <>
        <h1>{page === 'soon' ? 'Eat Soon' : 'Fridge'}</h1>
        {page === 'soon'
          ? <p className="today-date">{dateHeading}</p>
          : <label className="search"><Icon name="search" /><input type="search" aria-label="Search your fridge" placeholder="Search your fridge" value={query} onChange={event => setQuery(event.target.value)} /></label>}
        <div className="filters" aria-label={page === 'soon' ? 'Filter Eat Soon' : 'Filter fridge'}>{(page === 'soon' ? ['All', 'Shared', 'Mine'] : ['All', 'Mine', 'Shared']).map(option =>
          <button key={option} aria-pressed={filter === option} onClick={() => { setFilter(option); setOpenSwipe(null); }}>{option}</button>)}</div>
        <div className={notice ? "inventory-notice" : "visually-hidden"} role="status">{notice?.message}</div>
        {!groups.some(([, group]) => group.length) && <p className="empty">No matching items.</p>}
        {groups.map(([title, group]) => group.length > 0 && <section className="group" key={title}>
          <h2 className={title === 'Expires today' ? 'urgent-heading' : undefined}>{page === 'fridge' ? title.toUpperCase() : title}
            {page === 'soon' && <span>{group.length} {group.length === 1 ? 'item' : 'items'}</span>}</h2>
          <div className={page === 'fridge' ? 'grid' : 'list'}>{group.map(item => <FoodCard key={item.id} item={item} compact={page === 'soon'}
            open={openSwipe === item.id} onToggle={open => setOpenSwipe(open ? item.id : null)}
            onResolve={action => resolveItem(item, action)} />)}</div>
        </section>)}
        {page === 'soon' && resolved && <div className={`resolution-toast ${resolved.action}`}>
          <Icon name={resolved.action === 'eaten' ? 'utensils' : 'remove'} />
          <span role="status">{resolved.item.name} {resolved.action}</span>
          <button onClick={undoResolution}>Undo</button>
        </div>}
        <div className="bottom-bar">
          <nav aria-label="Main navigation">
            <button aria-current={page === 'soon' ? 'page' : undefined} onClick={() => { setPage('soon'); setFilter('All'); }}><Icon name="clock" />Eat soon</button>
            <button aria-current={page === 'fridge' ? 'page' : undefined} onClick={() => { setPage('fridge'); setFilter('All'); setOpenSwipe(null); }}><Icon name="fridge" />Fridge</button>
          </nav>
          <button className="add-button" aria-label="Add food" onClick={() => { setOpenSwipe(null); setOverlay('menu'); }}><Icon name="plus" /></button>
        </div>
      </>}
    </main>
    {overlay === 'menu' && <Sheet title="Add Food" onClose={close}>
      <div className="menu-actions">
        <button className="light" onClick={() => openCapture('receipt')}><Icon name="receipt" />Scan Receipt</button>
        <button className="light" onClick={() => openCapture('photo')}><Icon name="camera" />Take photo</button>
        <span>or</span>
        <button className="light outline" onClick={openManual}><Icon name="edit" />Manually enter</button>
      </div>
    </Sheet>}
    {(overlay === 'receipt' || overlay === 'photo') && <Sheet title={overlay === 'receipt' ? 'Receipt' : 'Photo'} onClose={close} full>
      <Capture key={overlay} receipt={overlay === 'receipt'} active={scan.active} error={scan.error} progress={scan.progress}
        onFile={overlay === 'receipt' ? scanImage : takeFoodPhoto}
        onManual={() => page === 'review' ? setOverlay('add-review') : openManual()} />
    </Sheet>}
    {overlay === 'manual' && <Sheet title={suggested ? "Review food" : "Manually enter"} onClose={close}>
      <ItemForm key={pending.length} suggested={suggested} queued={pending.length} onAddAnother={item => { setPending([...pending, item]); setSuggested(null); }}
        onSave={item => saveItems(item ? [...pending, item] : pending)} />
    </Sheet>}
    {overlay === 'add-review' && <Sheet title="Manually enter" onClose={close}>
      <ItemForm onSave={item => { setDrafts(previous => [...previous, item]); close(); }} />
    </Sheet>}
    {overlay === 'edit' && <Sheet title="Edit item" onClose={close}>
      <ItemForm item={editing} onSave={item => { updateDraft(item.id, { ...item, needsConfirmation: false, unreadable: false }); close(); }}
        onRemove={() => { removeDraft(editing.id); close(); }} />
    </Sheet>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
