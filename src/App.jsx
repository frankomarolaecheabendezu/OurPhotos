import { useState, useRef, useEffect, useMemo } from 'react';
import './App.css';

const LAYOUTS = {
  1: { label: '1 Foto', slots: 1, className: 'grid-1' },
  2: { label: '2 Fotos', slots: 2, className: 'grid-2' },
  3: { label: 'Editorial 3', slots: 3, className: 'grid-3-editorial' },
  4: { label: '4 Fotos', slots: 4, className: 'grid-4' },
  6: { label: 'Collage 6', slots: 6, className: 'grid-6' },
};

const FORMATS = {
  landscape: { label: 'A4 / A3 Horizontal', ratio: '297 / 210', bookW: 360, bookH: 255 },
  square: { label: 'Cuadrado (20x20 / 30x30)', ratio: '1 / 1', bookW: 300, bookH: 300 },
  portrait: { label: 'A4 / A3 Vertical', ratio: '210 / 297', bookW: 255, bookH: 360 },
};

const BG_THEMES = [
  { id: 'white', label: 'Blanco', color: '#ffffff', text: '#262626', spine: '#e5e5e5' },
  { id: 'cream', label: 'Papel Crema', color: '#f6f1e7', text: '#4a4339', spine: '#e4dac8' },
  { id: 'warm', label: 'Gris Galería', color: '#e8e6e1', text: '#2c2c2c', spine: '#d2cfc7' },
  { id: 'dark', label: 'Negro Mate', color: '#141518', text: '#f3f4f6', spine: '#0b0c0e' },
];

const FILTERS = [
  { id: 'none', label: 'Original', css: 'none' },
  { id: 'bw', label: 'B&N', css: 'grayscale(100%) contrast(1.08)' },
  { id: 'warm', label: 'Cálido', css: 'sepia(25%) saturate(1.15)' },
];

const TEXT_STYLES = [
  { id: 'quote', label: 'Cita', className: 'text-style-quote' },
  { id: 'title', label: 'Título', className: 'text-style-title' },
  { id: 'story', label: 'Historia', className: 'text-style-story' },
  { id: 'minimal', label: 'Minimal', className: 'text-style-minimal' },
];

const COVER_STYLES = [
  { id: 'classic', label: 'Clásica' },
  { id: 'split', label: 'Dividida' },
  { id: 'overlay', label: 'Superpuesta' },
  { id: 'window-v', label: 'Ventana V' },
  { id: 'square', label: 'Cuadrada' },
  { id: 'window-h', label: 'Panorámica' },
  { id: 'top-script', label: 'Cielo' },
  { id: 'editorial-2', label: 'Editorial 2' },
  { id: 'magazine', label: 'Revista' },
];

const FONT_FAMILIES = [
  { id: 'default', label: 'Fuente: Auto', css: undefined },
  { id: 'sans', label: 'Moderna (Sans)', css: "'Inter', system-ui, sans-serif" },
  { id: 'serif', label: 'Editorial (Garamond)', css: "'Cormorant Garamond', Georgia, serif" },
  { id: 'playfair', label: 'Clásica (Playfair)', css: "'Playfair Display', Georgia, serif" },
  { id: 'script', label: 'Caligráfica (Brush)', css: "'Alex Brush', cursive" },
  { id: 'mono', label: 'Minimal (Mono)', css: "'Courier New', monospace" },
];

// Extrae dos iniciales del título para el panel derecho del estilo "Editorial 2"
function getMonogramLetters(title) {
  const clean = (title || 'A & R').replace(/[^a-zA-ZÁÉÍÓÚÑáéíóúñ\s]/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return [words[0][0].toUpperCase(), words[words.length - 1][0].toUpperCase()];
  }
  if (words.length === 1 && words[0].length >= 2) {
    return [words[0][0].toUpperCase(), words[0][1].toUpperCase()];
  }
  return ['O', 'P'];
}

function PhotoSlot({
                     slot,
                     slotIdx,
                     selectedPhoto,
                     onPlacePhoto,
                     onPlaceText,
                     onClearPhoto,
                     onUpdateSlot,
                     readOnly = false,
                     placeholderText,
                   }) {
  const slotRef = useRef(null);
  const editorRef = useRef(null);
  const dragRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const isText = slot?.type === 'text';
  const isPhoto = Boolean(slot && !isText);

  useEffect(() => {
    if (isText && !readOnly && editorRef.current) {
      if (editorRef.current.innerHTML !== (slot.content || '')) {
        editorRef.current.innerHTML = slot.content || '';
      }
    }
  }, [isText, readOnly, slotIdx]);

  useEffect(() => {
    const el = slotRef.current;
    if (!el || !isPhoto || readOnly) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const zoomStep = e.deltaY < 0 ? 0.12 : -0.12;
      const nextScale = Math.max(1, Math.min(3, Number((slot.scale + zoomStep).toFixed(2))));
      onUpdateSlot({ scale: nextScale });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [slot, isPhoto, onUpdateSlot, readOnly]);

  const handlePointerDown = (e) => {
    if (readOnly || !isPhoto || e.target.closest('button')) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();

    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: slot.x,
      startY: slot.y,
      width: rect.width,
      height: rect.height,
      scale: slot.scale,
    };
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    const { startClientX, startClientY, startX, startY, width, height, scale } = dragRef.current;

    const dx = ((e.clientX - startClientX) / (width * scale)) * 100;
    const dy = ((e.clientY - startClientY) / (height * scale)) * 100;

    const newX = Math.max(0, Math.min(100, startX - dx));
    const newY = Math.max(0, Math.min(100, startY - dy));

    onUpdateSlot({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    if (!dragRef.current) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  };

  const handleDrop = (e) => {
    if (readOnly) return;
    e.preventDefault();
    setIsDragOver(false);
    const droppedUrl = e.dataTransfer.getData('text/plain');
    if (droppedUrl) {
      onPlacePhoto(droppedUrl);
    }
  };

  const cycleFilter = (e) => {
    e.stopPropagation();
    const currentIdx = FILTERS.findIndex((f) => f.id === (slot.filter || 'none'));
    const nextFilter = FILTERS[(currentIdx + 1) % FILTERS.length].id;
    onUpdateSlot({ filter: nextFilter });
  };

  const cycleTextStyle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const currentIdx = TEXT_STYLES.findIndex((t) => t.id === (slot.style || 'quote'));
    const nextStyle = TEXT_STYLES[(currentIdx + 1) % TEXT_STYLES.length].id;
    onUpdateSlot({ style: nextStyle });
  };

  const applyTextFormat = (e, command) => {
    e.preventDefault();
    e.stopPropagation();
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !editor.contains(sel.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    document.execCommand(command, false, null);
    onUpdateSlot({ content: editor.innerHTML });
  };

  const activeFilterObj = FILTERS.find((f) => f.id === (slot?.filter || 'none')) || FILTERS[0];
  const activeTextStyle = TEXT_STYLES.find((t) => t.id === (slot?.style || 'quote')) || TEXT_STYLES[0];
  const activeFontObj = FONT_FAMILIES.find((f) => f.id === (slot?.font || 'default')) || FONT_FAMILIES[0];

  return (
      <div
          ref={slotRef}
          className={`slot ${isPhoto ? 'filled' : ''} ${isText ? 'text-slot' : ''} ${
              isDragOver ? 'drag-over' : ''
          } ${readOnly ? 'readonly' : ''}`}
          onClick={() => !readOnly && !slot && selectedPhoto && onPlacePhoto(selectedPhoto)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={() => !readOnly && isPhoto && onUpdateSlot({ x: 50, y: 50, scale: 1 })}
          onDragOver={(e) => {
            if (readOnly) return;
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
      >
        {isPhoto ? (
            <>
              <img
                  src={slot.url}
                  alt={`Foto ${slotIdx + 1}`}
                  draggable={false}
                  style={{
                    objectPosition: `${slot.x}% ${slot.y}%`,
                    ...(slot.scale > 1 && {
                      transform: `scale(${slot.scale})`,
                      transformOrigin: `${slot.x}% ${slot.y}%`,
                    }),
                    ...(activeFilterObj.id !== 'none' && {
                      filter: activeFilterObj.css,
                    }),
                  }}
              />
              {!readOnly && (
                  <div className="slot-toolbar no-print">
                    <button
                        className="slot-action-btn"
                        onClick={cycleFilter}
                        title="Cambiar filtro (Original / B&N / Cálido)"
                    >
                      {activeFilterObj.label}
                    </button>
                    {slot.scale > 1 && <span className="zoom-pill">{slot.scale.toFixed(1)}x</span>}
                    <button
                        className="slot-action-btn danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearPhoto();
                        }}
                        title="Quitar foto"
                    >
                      ×
                    </button>
                  </div>
              )}
            </>
        ) : isText ? (
            <>
              {readOnly ? (
                  <div
                      className={`slot-text-display ${activeTextStyle.className}`}
                      style={{ fontFamily: activeFontObj.css }}
                      dangerouslySetInnerHTML={{ __html: slot.content || '' }}
                  />
              ) : (
                  <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      className={`slot-rich-editor ${activeTextStyle.className}`}
                      style={{ fontFamily: activeFontObj.css }}
                      data-placeholder="Escribe tu texto aquí..."
                      onInput={(e) => onUpdateSlot({ content: e.currentTarget.innerHTML })}
                  />
              )}
              {!readOnly && (
                  <div className="slot-toolbar no-print">
                    <button
                        className="slot-action-btn"
                        onMouseDown={(e) => applyTextFormat(e, 'bold')}
                        title="Negrita (a la selección o a todo)"
                    >
                      <strong>B</strong>
                    </button>
                    <button
                        className="slot-action-btn"
                        onMouseDown={(e) => applyTextFormat(e, 'italic')}
                        title="Cursiva (a la selección o a todo)"
                    >
                      <em>I</em>
                    </button>
                    <button
                        className="slot-action-btn"
                        onMouseDown={cycleTextStyle}
                        title="Cambiar estilo (Cita / Título / Historia / Minimal)"
                    >
                      {activeTextStyle.label}
                    </button>
                    <select
                        className="slot-font-select"
                        value={slot.font || 'default'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onUpdateSlot({ font: e.target.value })}
                        title="Cambiar tipografía"
                    >
                      {FONT_FAMILIES.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                      ))}
                    </select>
                    <button
                        className="slot-action-btn danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearPhoto();
                        }}
                        title="Quitar texto"
                    >
                      ×
                    </button>
                  </div>
              )}
            </>
        ) : (
            !readOnly && (
                <>
            <span className="slot-placeholder no-print">
              {isDragOver
                  ? 'Suelta aquí'
                  : placeholderText || (selectedPhoto ? 'Clic o arrastra una foto' : 'Arrastra una foto aquí')}
            </span>
                  {onPlaceText && (
                      <div className="slot-toolbar no-print">
                        <button
                            className="slot-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlaceText();
                            }}
                            title="Usar este espacio para escribir texto"
                        >
                          + Texto
                        </button>
                      </div>
                  )}
                </>
            )
        )}
      </div>
  );
}

/* VISOR 3D 360° TIPO LIBRO */
function Book3DModal({ coverPage, backCoverPage, albumTitle, format, pageCount, onClose }) {
  const [rot, setRot] = useState({ x: -12, y: -28 });
  const [autoSpin, setAutoSpin] = useState(false);
  const dragRef = useRef(null);

  const fmt = FORMATS[format];
  const frontTheme = BG_THEMES.find((t) => t.id === coverPage.bg) || BG_THEMES[3];
  const backTheme = BG_THEMES.find((t) => t.id === backCoverPage.bg) || BG_THEMES[3];

  const depth = Math.min(64, Math.max(28, 22 + pageCount * 3));

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!autoSpin) return;
    let rafId;
    const tick = () => {
      setRot((prev) => ({ ...prev, y: prev.y + 0.45 }));
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [autoSpin]);

  const handlePointerDown = (e) => {
    setAutoSpin(false);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, rotX: rot.x, rotY: rot.y };
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setRot({
      x: Math.max(-65, Math.min(65, dragRef.current.rotX - dy * 0.45)),
      y: dragRef.current.rotY + dx * 0.55,
    });
  };

  const handlePointerUp = (e) => {
    if (dragRef.current && e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  };

  const render3DCoverFace = (page, isBack = false) => {
    const styleId = page.coverStyle || 'classic';
    const isEditorial2 = styleId === 'editorial-2';
    const slotsToRender = isEditorial2 ? [page.slots[0], page.slots[1] || null] : [page.slots[0]];
    const hasPhoto = slotsToRender.some(Boolean);
    const hasText = page.showCoverText && Boolean(page.coverTitle || page.coverSubtitle);
    const coverFontCss = FONT_FAMILIES.find((f) => f.id === (page.coverFont || 'default'))?.css;

    if (isBack && !hasPhoto && !hasText) {
      return <span className="back-colophon">OURPHOTOS EDITION</span>;
    }

    const [m1, m2] = getMonogramLetters(page.coverTitle || albumTitle);

    return (
        <div
            className={`book-front-inner cover-style-${styleId} ${page.borderless ? 'borderless' : ''}`}
        >
          <div className={`book-cover-photo ${isEditorial2 ? 'editorial-2-photos' : ''}`}>
            {slotsToRender.map((slot, idx) => {
              const filterObj = FILTERS.find((f) => f.id === (slot?.filter || 'none')) || FILTERS[0];
              return (
                  <div key={idx} className="book-cover-photo-item">
                    {slot ? (
                        <img
                            src={slot.url}
                            alt={isBack ? 'Contraportada' : 'Portada'}
                            draggable={false}
                            style={{
                              objectPosition: `${slot.x}% ${slot.y}%`,
                              transform: `scale(${slot.scale})`,
                              transformOrigin: `${slot.x}% ${slot.y}%`,
                              filter: filterObj.css,
                            }}
                        />
                    ) : (
                        <div className="book-empty-cover">Sin foto</div>
                    )}
                  </div>
              );
            })}
          </div>

          {hasText && (
              <div className="book-cover-texts">
                {page.coverTitle && <h3 style={{ fontFamily: coverFontCss }}>{page.coverTitle}</h3>}
                {page.coverSubtitle && <p style={{ fontFamily: coverFontCss }}>{page.coverSubtitle}</p>}
              </div>
          )}

          {isEditorial2 && (
              <div className="editorial-2-aside">
                <div className="editorial-monogram">
                  <span className="mono-top">{m1}</span>
                  <span className="mono-line" />
                  <span className="mono-bottom">{m2}</span>
                </div>
                {page.showCoverText && page.coverSubtitle && (
                    <span className="editorial-vertical-date">{page.coverSubtitle}</span>
                )}
              </div>
          )}
        </div>
    );
  };

  return (
      <div className="preview-overlay no-print" onClick={onClose}>
        <div className="preview-header" onClick={(e) => e.stopPropagation()}>
          <div>
            <strong>Vista 3D 360° — Tapa Dura</strong>
            <span className="subtitle" style={{ marginLeft: 10 }}>
            Arrastra para girar el libro en cualquier dirección
          </span>
          </div>
          <div className="topbar-actions">
            <button className="btn ghost" onClick={() => { setAutoSpin(false); setRot({ x: -12, y: -28 }); }}>
              Portada
            </button>
            <button className="btn ghost" onClick={() => { setAutoSpin(false); setRot({ x: -5, y: 90 }); }}>
              Lomo
            </button>
            <button className="btn ghost" onClick={() => { setAutoSpin(false); setRot({ x: -10, y: 180 }); }}>
              Contraportada
            </button>
            <button
                className={`btn ${autoSpin ? 'primary' : 'ghost'}`}
                onClick={() => setAutoSpin((s) => !s)}
            >
              {autoSpin ? 'Pausar giro' : 'Auto-girar 360°'}
            </button>
            <button className="btn ghost" onClick={onClose}>
              Cerrar (ESC)
            </button>
          </div>
        </div>

        <div
            className="book3d-stage"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
          <div
              className="book3d"
              style={{
                '--book-w': `${fmt.bookW}px`,
                '--book-h': `${fmt.bookH}px`,
                '--book-d': `${depth}px`,
                transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
              }}
          >
            <div
                className="book-face book-front"
                style={{ backgroundColor: frontTheme.color, color: frontTheme.text }}
            >
              <div className="book-crease" />
              {render3DCoverFace(coverPage, false)}
            </div>

            <div
                className="book-face book-back"
                style={{ backgroundColor: backTheme.color, color: backTheme.text }}
            >
              {render3DCoverFace(backCoverPage, true)}
            </div>

            <div
                className="book-face book-spine"
                style={{ backgroundColor: frontTheme.spine, color: frontTheme.text }}
            >
              <span>{coverPage.showCoverText ? coverPage.coverTitle || albumTitle : ''}</span>
            </div>

            <div className="book-face book-pages-right" />
            <div className="book-face book-pages-top" />
            <div className="book-face book-pages-bottom" />
          </div>
        </div>
      </div>
  );
}

/* VISOR 3D PÁGINA POR PÁGINA (FLIPBOOK) */
function Flipbook3DModal({ pages, albumTitle, format, gapSize, onClose }) {
  const [flippedCount, setFlippedCount] = useState(0);
  const fmt = FORMATS[format];

  const leaves = useMemo(() => {
    const backCover = pages.find((p) => p.isBackCover);
    const contentPages = pages.filter((p) => !p.isBackCover);

    const result = [];
    for (let i = 0; i < contentPages.length; i += 2) {
      result.push({
        front: contentPages[i],
        back: contentPages[i + 1] || null,
      });
    }
    if (result.length > 0 && result[result.length - 1].back !== null) {
      result.push({ front: null, back: backCover || 'BACK_COVER' });
    } else if (result.length > 0) {
      result[result.length - 1].back = backCover || 'BACK_COVER';
    }
    return result;
  }, [pages]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setFlippedCount((c) => Math.min(leaves.length, c + 1));
      if (e.key === 'ArrowLeft') setFlippedCount((c) => Math.max(0, c - 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [leaves.length, onClose]);

  const coverTheme = BG_THEMES.find((t) => t.id === pages[0].bg) || BG_THEMES[3];

  const renderFaceContent = (page) => {
    if (page === 'BACK_COVER') {
      return (
          <div
              className="flip-sheet back-cover-face"
              style={{ backgroundColor: coverTheme.color, color: coverTheme.text }}
          >
            <span className="back-colophon">OURPHOTOS EDITION</span>
          </div>
      );
    }

    if (!page) {
      return (
          <div className="flip-sheet endpaper-face">
            <span>Fin del álbum</span>
          </div>
      );
    }

    const theme = BG_THEMES.find((t) => t.id === page.bg) || BG_THEMES[0];

    if (page.isCover || page.isBackCover) {
      const styleId = page.coverStyle || 'classic';
      const isEditorial2 = styleId === 'editorial-2';
      const hasPhoto = page.slots.some(Boolean);
      const hasText = page.showCoverText && Boolean(page.coverTitle || page.coverSubtitle);
      const coverFontCss = FONT_FAMILIES.find((f) => f.id === (page.coverFont || 'default'))?.css;

      if (page.isBackCover && !hasPhoto && !hasText) {
        return (
            <div
                className="flip-sheet back-cover-face"
                style={{ backgroundColor: theme.color, color: theme.text }}
            >
              <span className="back-colophon">OURPHOTOS EDITION</span>
            </div>
        );
      }

      const [m1, m2] = getMonogramLetters(page.coverTitle || albumTitle);

      return (
          <div
              className={`flip-sheet cover-sheet cover-style-${styleId} ${
                  page.borderless ? 'borderless' : ''
              }`}
              style={{ backgroundColor: theme.color, color: theme.text }}
          >
            {(!page.isBackCover || hasPhoto) && (
                <div className={`cover-photo-wrap ${isEditorial2 ? 'editorial-2-photos' : ''}`}>
                  <PhotoSlot slot={page.slots[0]} slotIdx={0} readOnly />
                  {isEditorial2 && <PhotoSlot slot={page.slots[1] || null} slotIdx={1} readOnly />}
                </div>
            )}
            {hasText && (
                <div className="cover-meta-inputs">
                  {page.coverTitle && (
                      <div
                          className="cover-title-input"
                          style={{ color: theme.text, fontFamily: coverFontCss }}
                      >
                        {page.coverTitle}
                      </div>
                  )}
                  {page.coverSubtitle && (
                      <div
                          className="cover-subtitle-input"
                          style={{ color: theme.text, fontFamily: coverFontCss }}
                      >
                        {page.coverSubtitle}
                      </div>
                  )}
                </div>
            )}
            {isEditorial2 && (
                <div className="editorial-2-aside">
                  <div className="editorial-monogram">
                    <span className="mono-top">{m1}</span>
                    <span className="mono-line" />
                    <span className="mono-bottom">{m2}</span>
                  </div>
                  {page.showCoverText && page.coverSubtitle && (
                      <span className="editorial-vertical-date">{page.coverSubtitle}</span>
                  )}
                </div>
            )}
          </div>
      );
    }

    return (
        <div
            className={`flip-sheet ${page.borderless ? 'borderless' : ''}`}
            style={{ backgroundColor: theme.color, color: theme.text }}
        >
          <div
              className={`sheet-grid ${LAYOUTS[page.layout].className}`}
              style={{ gap: page.borderless ? 0 : `${Math.max(4, gapSize * 0.6)}px` }}
          >
            {page.slots.map((slot, idx) => (
                <PhotoSlot key={idx} slot={slot} slotIdx={idx} readOnly />
            ))}
          </div>
          {!page.borderless && page.showCaption && (
              <div className="page-caption readonly-caption" style={{ fontSize: '0.72rem' }}>
                {page.caption || '\u00A0'}
              </div>
          )}
        </div>
    );
  };

  const shiftX =
      flippedCount === 0 ? '0%' : flippedCount === leaves.length ? '100%' : '50%';

  return (
      <div className="preview-overlay no-print" onClick={onClose}>
        <div className="preview-header" onClick={(e) => e.stopPropagation()}>
          <div>
            <strong>Vista Previa 3D — {albumTitle}</strong>
            <span className="subtitle" style={{ marginLeft: 10 }}>
            {flippedCount === 0
                ? 'Portada'
                : flippedCount === leaves.length
                    ? 'Contraportada'
                    : `Pliego ${flippedCount} de ${leaves.length - 1}`}
          </span>
          </div>
          <div className="topbar-actions">
            <button
                className="btn ghost"
                disabled={flippedCount === 0}
                onClick={() => setFlippedCount(0)}
            >
              Ir a Portada
            </button>
            <button className="btn ghost" onClick={onClose}>
              Cerrar (ESC)
            </button>
          </div>
        </div>

        <div className="flipbook-stage" onClick={(e) => e.stopPropagation()}>
          <button
              className="nav-arrow"
              disabled={flippedCount === 0}
              onClick={() => setFlippedCount((c) => Math.max(0, c - 1))}
              title="Página anterior"
          >
            ‹
          </button>

          <div className="flipbook-scene">
            <div
                className="flipbook-book"
                style={{
                  '--leaf-w': `${Math.round(fmt.bookW * 1.35)}px`,
                  '--leaf-h': `${Math.round(fmt.bookH * 1.35)}px`,
                  transform: `rotateX(10deg) translateX(${shiftX})`,
                }}
            >
              {leaves.map((leaf, idx) => {
                const isFlipped = idx < flippedCount;
                const zIndex = isFlipped ? idx + 1 : leaves.length - idx;
                return (
                    <div
                        key={idx}
                        className={`flip-leaf ${isFlipped ? 'flipped' : ''}`}
                        style={{ zIndex }}
                        onClick={() => setFlippedCount(isFlipped ? idx : idx + 1)}
                    >
                      <div className="flip-face flip-front">
                        {renderFaceContent(leaf.front)}
                        <div className="spine-shadow-left" />
                      </div>
                      <div className="flip-face flip-back">
                        {renderFaceContent(leaf.back)}
                        <div className="spine-shadow-right" />
                      </div>
                    </div>
                );
              })}
            </div>
          </div>

          <button
              className="nav-arrow"
              disabled={flippedCount === leaves.length}
              onClick={() => setFlippedCount((c) => Math.min(leaves.length, c + 1))}
              title="Página siguiente"
          >
            ›
          </button>
        </div>

        <div className="stage-hint" style={{ paddingBottom: 18 }}>
          Haz clic sobre cualquier página o usa las flechas ← / → del teclado para pasar las hojas
        </div>
      </div>
  );
}

export default function App() {
  const [albumTitle, setAlbumTitle] = useState('Mi PhotoBook Editorial');
  const [format, setFormat] = useState('landscape');
  const [borderless, setBorderless] = useState(false);
  const [gapSize, setGapSize] = useState(12);
  const [hideUsed, setHideUsed] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [preview3D, setPreview3D] = useState(false);

  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const [pages, setPages] = useState([
    {
      id: 'cover',
      isCover: true,
      layout: 1,
      slots: [null],
      coverTitle: 'MI PHOTOBOOK',
      coverSubtitle: 'Colección 2026',
      coverStyle: 'classic',
      coverFont: 'default',
      showCoverText: true,
      borderless: false,
      bg: 'dark',
    },
    {
      id: 1,
      isCover: false,
      layout: 2,
      slots: [null, null],
      caption: '',
      showCaption: false,
      borderless: false,
      bg: 'white',
    },
    {
      id: 'back-cover',
      isBackCover: true,
      layout: 1,
      slots: [null],
      coverTitle: '',
      coverSubtitle: 'OURPHOTOS EDITION',
      coverStyle: 'classic',
      coverFont: 'default',
      showCoverText: true,
      borderless: false,
      bg: 'dark',
    },
  ]);
  const [activePageId, setActivePageId] = useState('cover');

  const coverPage = pages.find((p) => p.isCover) || pages[0];
  const backCoverPage = pages.find((p) => p.isBackCover) || pages[pages.length - 1];
  const activePage = pages.find((p) => p.id === activePageId) || pages[0];
  const isCoverLike = Boolean(activePage.isCover || activePage.isBackCover);
  const interiorCount = pages.filter((p) => !p.isCover && !p.isBackCover).length;

  const usedUrls = useMemo(() => {
    const set = new Set();
    pages.forEach((p) => p.slots.forEach((s) => s && s.url && set.add(s.url)));
    return set;
  }, [pages]);

  const visiblePhotos = hideUsed ? photos.filter((p) => !usedUrls.has(p.url)) : photos;

  const handleUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      name: file.name,
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
    if (!selectedPhoto && newPhotos.length > 0) {
      setSelectedPhoto(newPhotos[0].url);
    }
  };

  const deletePhoto = (e, photoToDelete) => {
    e.stopPropagation();
    setPhotos((prev) => prev.filter((p) => p.id !== photoToDelete.id));
    if (selectedPhoto === photoToDelete.url) {
      setSelectedPhoto(null);
    }
    setPages((prev) =>
        prev.map((page) => ({
          ...page,
          slots: page.slots.map((s) => (s && s.url === photoToDelete.url ? null : s)),
        }))
    );
    URL.revokeObjectURL(photoToDelete.url);
  };

  const addPage = (layout = 2) => {
    const nextId = Date.now() + Math.random();
    const slotCount = LAYOUTS[layout].slots;
    const newPage = {
      id: nextId,
      isCover: false,
      layout,
      slots: Array(slotCount).fill(null),
      caption: '',
      showCaption: false,
      borderless,
      bg: 'white',
    };
    setPages((prev) => {
      const back = prev.find((p) => p.isBackCover);
      const withoutBack = prev.filter((p) => !p.isBackCover);
      return back ? [...withoutBack, newPage, back] : [...prev, newPage];
    });
    setActivePageId(nextId);
  };

  const deletePage = (pageId) => {
    const target = pages.find((p) => p.id === pageId);
    if (!target || target.isCover || target.isBackCover || interiorCount <= 1) return;
    const idx = pages.findIndex((p) => p.id === pageId);
    const remaining = pages.filter((p) => p.id !== pageId);
    setPages(remaining);
    if (activePageId === pageId) {
      setActivePageId(remaining[Math.max(0, idx - 1)].id);
    }
  };

  const changeLayout = (pageId, newLayout) => {
    const slotCount = LAYOUTS[newLayout].slots;
    setPages((prev) =>
        prev.map((page) => {
          if (page.id !== pageId || page.isCover || page.isBackCover) return page;
          const updatedSlots = Array.from({ length: slotCount }, (_, i) => page.slots[i] || null);
          return { ...page, layout: newLayout, slots: updatedSlots };
        })
    );
  };

  const changePageField = (pageId, field, value) => {
    setPages((prev) =>
        prev.map((p) => {
          if (p.id !== pageId) return p;
          if (field === 'coverStyle' && value === 'editorial-2' && p.slots.length < 2) {
            return { ...p, [field]: value, slots: [p.slots[0] || null, null] };
          }
          return { ...p, [field]: value };
        })
    );
  };

  const toggleAllBorderless = (checked) => {
    setBorderless(checked);
    setPages((prev) =>
        prev.map((p) => (p.isCover || p.isBackCover ? p : { ...p, borderless: checked }))
    );
  };

  const placePhoto = (pageId, slotIndex, url) => {
    setPages((prev) =>
        prev.map((page) => {
          if (page.id !== pageId) return page;
          const updatedSlots = [...page.slots];
          updatedSlots[slotIndex] = { url, x: 50, y: 50, scale: 1, filter: 'none' };
          return { ...page, slots: updatedSlots };
        })
    );
  };

  const placeText = (pageId, slotIndex) => {
    setPages((prev) =>
        prev.map((page) => {
          if (page.id !== pageId) return page;
          const updatedSlots = [...page.slots];
          updatedSlots[slotIndex] = { type: 'text', content: '', style: 'quote', font: 'default' };
          return { ...page, slots: updatedSlots };
        })
    );
  };

  const clearSlot = (pageId, slotIndex) => {
    setPages((prev) =>
        prev.map((page) => {
          if (page.id !== pageId) return page;
          const updatedSlots = [...page.slots];
          updatedSlots[slotIndex] = null;
          return { ...page, slots: updatedSlots };
        })
    );
  };

  const updateSlot = (pageId, slotIndex, patch) => {
    setPages((prev) =>
        prev.map((page) => {
          if (page.id !== pageId) return page;
          const updatedSlots = [...page.slots];
          if (!updatedSlots[slotIndex]) return page;
          updatedSlots[slotIndex] = { ...updatedSlots[slotIndex], ...patch };
          return { ...page, slots: updatedSlots };
        })
    );
  };

  const autoFillAlbum = () => {
    const unused = photos.filter((p) => !usedUrls.has(p.url));
    if (unused.length === 0) return;

    let remainingPhotos = [...unused];
    let updatedCover = coverPage;

    if (!updatedCover.slots[0] && remainingPhotos.length > 0) {
      const first = remainingPhotos.shift();
      updatedCover = {
        ...updatedCover,
        slots: [
          { url: first.url, x: 50, y: 50, scale: 1, filter: 'none' },
          ...updatedCover.slots.slice(1),
        ],
      };
    }

    const newPages = [];
    let i = 0;
    while (i < remainingPhotos.length) {
      const rem = remainingPhotos.length - i;
      const layout = rem >= 3 ? 3 : rem === 2 ? 2 : 1;
      const chunk = remainingPhotos.slice(i, i + layout);
      newPages.push({
        id: Date.now() + Math.random() + i,
        isCover: false,
        layout,
        slots: chunk.map((photo) => ({
          url: photo.url,
          x: 50,
          y: 50,
          scale: 1,
          filter: 'none',
        })),
        caption: '',
        showCaption: false,
        borderless,
        bg: 'white',
      });
      i += layout;
    }

    const interiorPages = pages.filter((p) => !p.isCover && !p.isBackCover);
    const isSingleEmptyInterior =
        interiorPages.length === 1 && interiorPages[0].slots.every((s) => s === null);

    if (isSingleEmptyInterior && newPages.length > 0) {
      setPages([updatedCover, ...newPages, backCoverPage]);
      setActivePageId(newPages[0].id);
    } else {
      setPages([updatedCover, ...interiorPages, ...newPages, backCoverPage]);
      if (newPages.length > 0) setActivePageId(newPages[0].id);
    }
  };

  const currentTheme = BG_THEMES.find((t) => t.id === activePage.bg) || BG_THEMES[0];
  const activeCoverStyle = activePage.coverStyle || 'classic';
  const activeCoverFontCss = FONT_FAMILIES.find(
      (f) => f.id === (activePage.coverFont || 'default')
  )?.css;
  const isActiveEditorial2 = isCoverLike && activeCoverStyle === 'editorial-2';
  const [activeM1, activeM2] = getMonogramLetters(activePage.coverTitle || albumTitle);

  return (
      <>
        <div className="studio-shell no-print">
          <header className="topbar">
            <div className="brand">
              <div className="logo-mark">OP</div>
              <div>
                <input
                    type="text"
                    className="album-title-input"
                    value={albumTitle}
                    onChange={(e) => setAlbumTitle(e.target.value)}
                    placeholder="Nombre del álbum..."
                />
                <span className="subtitle">
                Portada + {interiorCount} {interiorCount === 1 ? 'hoja' : 'hojas'} + Contraportada ·{' '}
                  {usedUrls.size}/{photos.length} fotos usadas
              </span>
              </div>
            </div>

            <div className="topbar-center">
              <select
                  className="studio-select"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
              >
                {Object.entries(FORMATS).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                ))}
              </select>

              <label className="studio-toggle" title="Aplicar a todas las hojas interiores">
                <input
                    type="checkbox"
                    checked={borderless}
                    onChange={(e) => toggleAllBorderless(e.target.checked)}
                />
                <span>Sin márgenes (todas)</span>
              </label>

              {!activePage.borderless && (
                  <div className="gap-control" title="Espaciado entre fotos">
                    <span>Espacio</span>
                    <input
                        type="range"
                        min="0"
                        max="28"
                        value={gapSize}
                        onChange={(e) => setGapSize(Number(e.target.value))}
                    />
                  </div>
              )}
            </div>

            <div className="topbar-actions">
              <button className="btn ghost" onClick={() => setPreview3D(true)}>
                Vista 3D 360°
              </button>
              <button className="btn ghost" onClick={() => setPreviewMode(true)}>
                Vista Previa
              </button>
              <button className="btn primary" onClick={() => window.print()}>
                Exportar PDF
              </button>
            </div>
          </header>

          <div className="studio-body">
            <aside className="sidebar">
              <div className="sidebar-header">
                <label className="upload-btn">
                  + Importar Fotos
                  <input type="file" multiple accept="image/*" onChange={handleUpload} hidden />
                </label>

                {photos.length > 0 && (
                    <button
                        className="btn autofill-btn"
                        onClick={autoFillAlbum}
                        disabled={usedUrls.size === photos.length}
                    >
                      ✦ Auto-llenar ({photos.length - usedUrls.size})
                    </button>
                )}

                <label className="filter-check">
                  <input
                      type="checkbox"
                      checked={hideUsed}
                      onChange={(e) => setHideUsed(e.target.checked)}
                  />
                  <span>Ocultar fotos usadas</span>
                </label>
              </div>

              <div className="gallery">
                {visiblePhotos.length === 0 ? (
                    <div className="empty-state">
                      <p>{photos.length === 0 ? 'Sube tus fotos para comenzar' : 'Todas las fotos están en uso'}</p>
                      <span>Arrastra las imágenes directo al lienzo o haz clic para colocarlas.</span>
                    </div>
                ) : (
                    visiblePhotos.map((photo) => {
                      const isUsed = usedUrls.has(photo.url);
                      return (
                          <div
                              key={photo.id}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData('text/plain', photo.url)}
                              className={`thumb ${selectedPhoto === photo.url ? 'selected' : ''} ${
                                  isUsed ? 'used' : ''
                              }`}
                              onClick={() => setSelectedPhoto(photo.url)}
                          >
                            <img src={photo.url} alt={photo.name} />
                            <button
                                className="delete-thumb-btn"
                                onClick={(e) => deletePhoto(e, photo)}
                                title="Eliminar foto de la galería"
                            >
                              ×
                            </button>
                            {isUsed && <span className="used-badge">✓</span>}
                          </div>
                      );
                    })
                )}
              </div>
            </aside>

            <main className="stage">
              <div className="stage-toolbar">
                {isCoverLike ? (
                    <div className="layout-pills">
                  <span className="cover-tag">
                    {activePage.isCover ? 'PORTADA' : 'CONTRAPORTADA'}
                  </span>
                      {COVER_STYLES.map((st) => (
                          <button
                              key={st.id}
                              className={`pill ${activeCoverStyle === st.id ? 'active' : ''}`}
                              onClick={() => changePageField(activePage.id, 'coverStyle', st.id)}
                          >
                            {st.label}
                          </button>
                      ))}
                    </div>
                ) : (
                    <div className="layout-pills">
                      <span className="toolbar-label">Diseño:</span>
                      {Object.entries(LAYOUTS).map(([key, cfg]) => (
                          <button
                              key={key}
                              className={`pill ${activePage.layout === Number(key) ? 'active' : ''}`}
                              onClick={() => changeLayout(activePage.id, Number(key))}
                          >
                            {cfg.label}
                          </button>
                      ))}
                    </div>
                )}

                <div className="bg-pills">
                  {isCoverLike ? (
                      <>
                        <label className="studio-toggle" style={{ marginRight: 10 }}>
                          <input
                              type="checkbox"
                              checked={Boolean(activePage.borderless)}
                              onChange={(e) =>
                                  changePageField(activePage.id, 'borderless', e.target.checked)
                              }
                          />
                          <span>Sin márgenes</span>
                        </label>

                        <label className="studio-toggle" style={{ marginRight: 10 }}>
                          <input
                              type="checkbox"
                              checked={Boolean(activePage.showCoverText)}
                              onChange={(e) =>
                                  changePageField(activePage.id, 'showCoverText', e.target.checked)
                              }
                          />
                          <span>Título y subtítulo</span>
                        </label>

                        {activePage.showCoverText && (
                            <select
                                className="studio-select"
                                style={{ marginRight: 10, padding: '4px 8px', fontSize: '0.78rem' }}
                                value={activePage.coverFont || 'default'}
                                onChange={(e) => changePageField(activePage.id, 'coverFont', e.target.value)}
                                title="Tipografía de portada"
                            >
                              {FONT_FAMILIES.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.label}
                                  </option>
                              ))}
                            </select>
                        )}
                      </>
                  ) : (
                      <>
                        <label className="studio-toggle" style={{ marginRight: 10 }}>
                          <input
                              type="checkbox"
                              checked={Boolean(activePage.borderless)}
                              onChange={(e) =>
                                  changePageField(activePage.id, 'borderless', e.target.checked)
                              }
                          />
                          <span>Sin márgenes</span>
                        </label>

                        {!activePage.borderless && (
                            <label className="studio-toggle" style={{ marginRight: 10 }}>
                              <input
                                  type="checkbox"
                                  checked={Boolean(activePage.showCaption)}
                                  onChange={(e) =>
                                      changePageField(activePage.id, 'showCaption', e.target.checked)
                                  }
                              />
                              <span>Pie de página</span>
                            </label>
                        )}
                      </>
                  )}
                  <span className="toolbar-label">{isCoverLike ? 'Tapa:' : 'Papel:'}</span>
                  {BG_THEMES.map((theme) => (
                      <button
                          key={theme.id}
                          className={`color-dot ${activePage.bg === theme.id ? 'active' : ''}`}
                          style={{ backgroundColor: theme.color }}
                          onClick={() => changePageField(activePage.id, 'bg', theme.id)}
                          title={theme.label}
                      />
                  ))}
                </div>
              </div>

              <div className="canvas-viewport">
                {isCoverLike ? (
                    /* LIENZO DE PORTADA / CONTRAPORTADA */
                    <div
                        className={`sheet cover-sheet cover-style-${activeCoverStyle} ${
                            activePage.borderless ? 'borderless' : ''
                        }`}
                        style={{
                          aspectRatio: FORMATS[format].ratio,
                          backgroundColor: currentTheme.color,
                          color: currentTheme.text,
                        }}
                    >
                      <div className={`cover-photo-wrap ${isActiveEditorial2 ? 'editorial-2-photos' : ''}`}>
                        <PhotoSlot
                            key={`${activePage.id}-0`}
                            slot={activePage.slots[0]}
                            slotIdx={0}
                            selectedPhoto={selectedPhoto}
                            placeholderText={
                              activePage.isCover
                                  ? 'Arrastra o haz clic para tu foto de portada'
                                  : 'Arrastra o haz clic para tu foto de contraportada (opcional)'
                            }
                            onPlacePhoto={(url) => placePhoto(activePage.id, 0, url)}
                            onClearPhoto={() => clearSlot(activePage.id, 0)}
                            onUpdateSlot={(patch) => updateSlot(activePage.id, 0, patch)}
                        />
                        {isActiveEditorial2 && (
                            <PhotoSlot
                                key={`${activePage.id}-1`}
                                slot={activePage.slots[1] || null}
                                slotIdx={1}
                                selectedPhoto={selectedPhoto}
                                placeholderText="Segunda foto de portada"
                                onPlacePhoto={(url) => placePhoto(activePage.id, 1, url)}
                                onClearPhoto={() => clearSlot(activePage.id, 1)}
                                onUpdateSlot={(patch) => updateSlot(activePage.id, 1, patch)}
                            />
                        )}
                      </div>

                      {activePage.showCoverText && (
                          <div className="cover-meta-inputs">
                      <textarea
                          rows={1}
                          className="cover-title-input"
                          style={{ color: currentTheme.text, fontFamily: activeCoverFontCss }}
                          value={activePage.coverTitle}
                          onChange={(e) => changePageField(activePage.id, 'coverTitle', e.target.value)}
                          onInput={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          placeholder={
                            activePage.isCover ? 'TÍTULO DE LA PORTADA' : 'TÍTULO DE LA CONTRAPORTADA'
                          }
                      />
                            <textarea
                                rows={1}
                                className="cover-subtitle-input"
                                style={{ color: currentTheme.text, fontFamily: activeCoverFontCss }}
                                value={activePage.coverSubtitle}
                                onChange={(e) => changePageField(activePage.id, 'coverSubtitle', e.target.value)}
                                onInput={(e) => {
                                  e.target.style.height = 'auto';
                                  e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                placeholder="Subtítulo o fecha (ej. 07.05.26)"
                            />
                          </div>
                      )}

                      {isActiveEditorial2 && (
                          <div className="editorial-2-aside">
                            <div className="editorial-monogram">
                              <span className="mono-top">{activeM1}</span>
                              <span className="mono-line" />
                              <span className="mono-bottom">{activeM2}</span>
                            </div>
                            {activePage.showCoverText && activePage.coverSubtitle && (
                                <span className="editorial-vertical-date">{activePage.coverSubtitle}</span>
                            )}
                          </div>
                      )}
                    </div>
                ) : (
                    /* LIENZO DE HOJA INTERIOR */
                    <div
                        className={`sheet ${activePage.borderless ? 'borderless' : ''}`}
                        style={{
                          aspectRatio: FORMATS[format].ratio,
                          backgroundColor: currentTheme.color,
                          color: currentTheme.text,
                        }}
                    >
                      <div
                          className={`sheet-grid ${LAYOUTS[activePage.layout].className}`}
                          style={{ gap: activePage.borderless ? 0 : `${gapSize}px` }}
                      >
                        {activePage.slots.map((slot, slotIdx) => (
                            <PhotoSlot
                                key={`${activePage.id}-${slotIdx}`}
                                slot={slot}
                                slotIdx={slotIdx}
                                selectedPhoto={selectedPhoto}
                                onPlacePhoto={(url) => placePhoto(activePage.id, slotIdx, url)}
                                onPlaceText={() => placeText(activePage.id, slotIdx)}
                                onClearPhoto={() => clearSlot(activePage.id, slotIdx)}
                                onUpdateSlot={(patch) => updateSlot(activePage.id, slotIdx, patch)}
                            />
                        ))}
                      </div>

                      {!activePage.borderless && activePage.showCaption && (
                          <input
                              type="text"
                              className="page-caption"
                              style={{ color: currentTheme.text }}
                              value={activePage.caption}
                              onChange={(e) => changePageField(activePage.id, 'caption', e.target.value)}
                              placeholder="Añadir pie de página..."
                          />
                      )}
                    </div>
                )}
              </div>

              <div className="stage-hint">
                Arrastra para reencuadrar · Rueda del mouse para Zoom · Doble clic para restablecer
              </div>
            </main>
          </div>

          <footer className="filmstrip">
            <div className="filmstrip-scroll">
              {pages.map((page, index) => {
                const theme = BG_THEMES.find((t) => t.id === page.bg) || BG_THEMES[0];
                const label = page.isCover
                    ? 'Portada'
                    : page.isBackCover
                        ? 'Contraportada'
                        : `Hoja ${index}`;

                return (
                    <div
                        key={page.id}
                        className={`page-thumb-card ${page.id === activePage.id ? 'active' : ''}`}
                        onClick={() => setActivePageId(page.id)}
                    >
                      <div
                          className="mini-sheet"
                          style={{ backgroundColor: theme.color, aspectRatio: FORMATS[format].ratio }}
                      >
                        <div className={`mini-grid ${LAYOUTS[page.layout].className}`}>
                          {page.slots.slice(0, page.isCover || page.isBackCover ? 1 : page.slots.length).map((s, idx) => (
                              <div key={idx} className="mini-slot">
                                {s && (s.type === 'text' ? <span className="mini-text-icon">T</span> : <img src={s.url} alt="" />)}
                              </div>
                          ))}
                        </div>
                      </div>
                      <div className="page-thumb-meta">
                        <span>{label}</span>
                        {!page.isCover && !page.isBackCover && interiorCount > 1 && (
                            <button
                                className="mini-delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePage(page.id);
                                }}
                                title="Eliminar hoja"
                            >
                              ×
                            </button>
                        )}
                      </div>
                    </div>
                );
              })}

              <button className="add-page-card" onClick={() => addPage(2)}>
                <span>+</span>
                <small>Nueva Hoja</small>
              </button>
            </div>
          </footer>
        </div>

        {/* MODAL VISTA 3D 360° */}
        {preview3D && (
            <Book3DModal
                coverPage={coverPage}
                backCoverPage={backCoverPage}
                albumTitle={albumTitle}
                format={format}
                pageCount={interiorCount}
                onClose={() => setPreview3D(false)}
            />
        )}

        {/* MODAL VISTA PREVIA 3D PÁGINA POR PÁGINA */}
        {previewMode && (
            <Flipbook3DModal
                pages={pages}
                albumTitle={albumTitle}
                format={format}
                gapSize={gapSize}
                onClose={() => setPreviewMode(false)}
            />
        )}

        {/* ÁREA DE IMPRESIÓN PDF */}
        <div className="print-area">
          {pages.map((page) => {
            const theme = BG_THEMES.find((t) => t.id === page.bg) || BG_THEMES[0];
            if (page.isCover || page.isBackCover) {
              const styleId = page.coverStyle || 'classic';
              const isEditorial2 = styleId === 'editorial-2';
              const hasPhoto = page.slots.some(Boolean);
              const hasText = page.showCoverText && Boolean(page.coverTitle || page.coverSubtitle);
              const coverFontCss = FONT_FAMILIES.find((f) => f.id === (page.coverFont || 'default'))?.css;
              const [m1, m2] = getMonogramLetters(page.coverTitle || albumTitle);

              return (
                  <div key={page.id} className="print-page-break">
                    <div
                        className={`sheet cover-sheet print-sheet cover-style-${styleId} ${
                            page.borderless ? 'borderless' : ''
                        }`}
                        style={{
                          aspectRatio: FORMATS[format].ratio,
                          backgroundColor: theme.color,
                          color: theme.text,
                        }}
                    >
                      {(!page.isBackCover || hasPhoto) && (
                          <div className={`cover-photo-wrap ${isEditorial2 ? 'editorial-2-photos' : ''}`}>
                            <PhotoSlot slot={page.slots[0]} slotIdx={0} readOnly />
                            {isEditorial2 && <PhotoSlot slot={page.slots[1] || null} slotIdx={1} readOnly />}
                          </div>
                      )}
                      {hasText && (
                          <div className="cover-meta-inputs">
                            {page.coverTitle && (
                                <div
                                    className="cover-title-input"
                                    style={{ color: theme.text, fontFamily: coverFontCss }}
                                >
                                  {page.coverTitle}
                                </div>
                            )}
                            {page.coverSubtitle && (
                                <div
                                    className="cover-subtitle-input"
                                    style={{ color: theme.text, fontFamily: coverFontCss }}
                                >
                                  {page.coverSubtitle}
                                </div>
                            )}
                          </div>
                      )}
                      {isEditorial2 && (
                          <div className="editorial-2-aside">
                            <div className="editorial-monogram">
                              <span className="mono-top">{m1}</span>
                              <span className="mono-line" />
                              <span className="mono-bottom">{m2}</span>
                            </div>
                            {page.showCoverText && page.coverSubtitle && (
                                <span className="editorial-vertical-date">{page.coverSubtitle}</span>
                            )}
                          </div>
                      )}
                    </div>
                  </div>
              );
            }
            return (
                <div key={page.id} className="print-page-break">
                  <div
                      className={`sheet print-sheet ${page.borderless ? 'borderless' : ''}`}
                      style={{
                        aspectRatio: FORMATS[format].ratio,
                        backgroundColor: theme.color,
                        color: theme.text,
                      }}
                  >
                    <div
                        className={`sheet-grid ${LAYOUTS[page.layout].className}`}
                        style={{ gap: page.borderless ? 0 : `${gapSize}px` }}
                    >
                      {page.slots.map((slot, idx) => (
                          <PhotoSlot key={idx} slot={slot} slotIdx={idx} readOnly />
                      ))}
                    </div>
                    {!page.borderless && page.showCaption && (
                        <div className="page-caption readonly-caption">{page.caption || '\u00A0'}</div>
                    )}
                  </div>
                </div>
            );
          })}
        </div>
      </>
  );
}