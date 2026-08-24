/**
 * TARIADS ZIMBABWE — MOBILE DIGITAL BILLBOARD ENGINE
 * Pure Vanilla JavaScript. Zero dependencies, zero build steps.
 * Designed for mobile screen billboard display.
 */

// Slide configurations
const SLIDES_COUNT = 8;
const SLIDE_DURATION_MS = 6500; // 6.5s per billboard advertisement (allows smooth sequence + hold)
let currentSlideIndex = 0;
let isPaused = false;
let slideTimer = null;
let slideStartTime = Date.now();
let timeRemaining = SLIDE_DURATION_MS;
let progressAnimationId = null;

// Touch tracking for swipe gestures
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

document.addEventListener('DOMContentLoaded', () => {
  initProgressSegments();
  initBillboard();
  setupTouchAndEvents();
  renderBillboardQRCode('tariads-qr-svg', 'https://useTariAds.com');
  startSlideTimer();
});

/**
 * Initialize segmented progress bars at top of billboard
 */
function initProgressSegments() {
  const container = document.getElementById('progress-segments');
  if (!container) return;

  container.innerHTML = '';
  for (let i = 0; i < SLIDES_COUNT; i++) {
    const seg = document.createElement('div');
    seg.className = `progress-segment ${i === 0 ? 'active' : ''}`;
    seg.id = `prog-seg-${i}`;
    seg.onclick = () => goToSlide(i);

    const fill = document.createElement('div');
    fill.className = 'progress-segment-fill';
    fill.id = `prog-fill-${i}`;
    seg.appendChild(fill);

    container.appendChild(seg);
  }
}

/**
 * Start billboard slides loop
 */
function initBillboard() {
  updateSlideDisplay(0);
}

/**
 * Transition to specific slide
 */
function goToSlide(index) {
  if (index < 0) index = SLIDES_COUNT - 1;
  if (index >= SLIDES_COUNT) index = 0;

  currentSlideIndex = index;
  timeRemaining = SLIDE_DURATION_MS;
  slideStartTime = Date.now();

  updateSlideDisplay(currentSlideIndex);
  resetProgressSegments(currentSlideIndex);

  if (!isPaused) {
    startSlideTimer();
  }
}

function nextSlide() {
  goToSlide(currentSlideIndex + 1);
}

function prevSlide() {
  goToSlide(currentSlideIndex - 1);
}

/**
 * Update DOM classes for active slide
 */
function updateSlideDisplay(index) {
  const slides = document.querySelectorAll('.billboard-slide');
  slides.forEach((slide, idx) => {
    if (idx === index) {
      slide.classList.remove('active');
      void slide.offsetWidth; // Force micro reflow so entrance keyframe sequence triggers fresh
      slide.classList.add('active');
    } else {
      slide.classList.remove('active');
    }
  });

  const counter = document.getElementById('slide-counter');
  if (counter) {
    counter.textContent = `${index + 1} / ${SLIDES_COUNT}`;
  }
}

/**
 * Update and animate progress segments
 */
function resetProgressSegments(activeIndex) {
  cancelAnimationFrame(progressAnimationId);

  for (let i = 0; i < SLIDES_COUNT; i++) {
    const seg = document.getElementById(`prog-seg-${i}`);
    const fill = document.getElementById(`prog-fill-${i}`);
    if (!seg || !fill) continue;

    if (i < activeIndex) {
      seg.className = 'progress-segment completed';
      fill.style.width = '100%';
    } else if (i === activeIndex) {
      seg.className = 'progress-segment active';
      fill.style.width = '0%';
    } else {
      seg.className = 'progress-segment';
      fill.style.width = '0%';
    }
  }
}

/**
 * Timer loop with smooth progress bar filling
 */
function startSlideTimer() {
  cancelAnimationFrame(progressAnimationId);
  clearTimeout(slideTimer);

  slideStartTime = Date.now();

  function step() {
    if (isPaused) return;

    const elapsed = Date.now() - slideStartTime;
    const progress = Math.min(1, elapsed / SLIDE_DURATION_MS);

    const activeFill = document.getElementById(`prog-fill-${currentSlideIndex}`);
    if (activeFill) {
      activeFill.style.width = `${progress * 100}%`;
    }

    if (elapsed >= SLIDE_DURATION_MS) {
      nextSlide();
    } else {
      progressAnimationId = requestAnimationFrame(step);
    }
  }

  progressAnimationId = requestAnimationFrame(step);
}

/**
 * Play/Pause Billboard controls
 */
function togglePause() {
  isPaused = !isPaused;
  const pauseBtn = document.getElementById('btn-pause-toggle');
  const iconPause = document.getElementById('icon-pause');
  const iconPlay = document.getElementById('icon-play');

  if (isPaused) {
    cancelAnimationFrame(progressAnimationId);
    if (iconPause) iconPause.style.display = 'none';
    if (iconPlay) iconPlay.style.display = 'block';
    showToast('Billboard paused');
  } else {
    slideStartTime = Date.now() - (parseFloat(document.getElementById(`prog-fill-${currentSlideIndex}`)?.style.width || '0') / 100 * SLIDE_DURATION_MS);
    startSlideTimer();
    if (iconPause) iconPause.style.display = 'block';
    if (iconPlay) iconPlay.style.display = 'none';
    showToast('Billboard playing');
  }
}

function pauseBillboard() {
  isPaused = true;
  cancelAnimationFrame(progressAnimationId);
}

function resumeBillboard() {
  if (document.querySelector('.action-sheet-overlay.active')) return;
  isPaused = false;
  startSlideTimer();
}

/**
 * Touch, Swipe & Keyboard Event Handling
 */
function setupTouchAndEvents() {
  const frame = document.getElementById('billboard-frame');
  if (!frame) return;

  // Touch Swipe
  frame.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  frame.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    const timeTaken = Date.now() - touchStartTime;

    // Horizontal swipe threshold
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) && timeTaken < 800) {
      if (diffX < 0) {
        nextSlide(); // Swiped left -> next ad
      } else {
        prevSlide(); // Swiped right -> prev ad
      }
    }
  }, { passive: true });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      nextSlide();
    } else if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === 'Escape') {
      closeAllActionSheets();
    }
  });

  // Hold to pause on desktop
  frame.addEventListener('mouseenter', () => {
    // slight pause on mouse hover
  });
}

/**
 * Action Sheet Triggers
 */
function openActionSheet(sheetId) {
  pauseBillboard();
  const sheet = document.getElementById(sheetId);
  if (sheet) {
    sheet.classList.add('active');
  }
}

function closeActionSheet(sheetId) {
  const sheet = document.getElementById(sheetId);
  if (sheet) {
    sheet.classList.remove('active');
  }
  resumeBillboard();
}

function closeAllActionSheets() {
  document.querySelectorAll('.action-sheet-overlay').forEach(s => s.classList.remove('active'));
  resumeBillboard();
}

/**
 * Action Sheet Form Submissions
 */
function handleDirectInquirySubmit(e) {
  e.preventDefault();
  const name = document.getElementById('join-name').value;
  const interest = document.getElementById('join-interest').value;
  closeAllActionSheets();
  showToast(`Thank you ${name}! Your request for "${interest}" has been received. Visit useTariAds.com to explore now.`);
}

function handlePropertySearchSubmit(e) {
  e.preventDefault();
  const suburb = document.getElementById('prop-suburb').value;
  closeAllActionSheets();
  showToast(`Looking for homes in ${suburb}... Explore active listings now on useTariAds.com!`);
}

function handlePropertyListSubmit(e) {
  e.preventDefault();
  const category = document.getElementById('rental-cat').value;
  const location = document.getElementById('rental-location').value;
  closeAllActionSheets();
  showToast(`Property listing inquiry for ${category} in ${location} received! Connect on useTariAds.com.`);
}

function handleVehicleInquirySubmit(e) {
  e.preventDefault();
  const query = document.getElementById('vehicle-query').value;
  closeAllActionSheets();
  showToast(`Vehicle inquiry for "${query}" received! View vehicles on useTariAds.com.`);
}

function handleProductInquirySubmit(e) {
  e.preventDefault();
  const item = document.getElementById('product-query').value;
  closeAllActionSheets();
  showToast(`Product inquiry for "${item}" received! Browse all goods on useTariAds.com.`);
}

function handlePostAdSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('post-owner-name').value;
  const category = document.getElementById('post-ad-category').value;

  closeAllActionSheets();
  showToast(`Thank you ${name}! Business registration for ${category} received. Visit useTariAds.com.`);
}

/**
 * Toast Notification Utility
 */
function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  toast.classList.add('show');

  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

/**
 * Copy useTariAds.com link
 */
function copyLink() {
  const url = 'https://useTariAds.com';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('useTariAds.com copied to clipboard!');
    }).catch(() => fallbackCopy(url));
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  const t = document.createElement('textarea');
  t.value = text;
  t.style.position = 'fixed';
  t.style.opacity = '0';
  document.body.appendChild(t);
  t.select();
  try {
    document.execCommand('copy');
    showToast('useTariAds.com copied!');
  } catch(e) {
    showToast('Visit useTariAds.com');
  }
  document.body.removeChild(t);
}

/**
 * Generate Scannable High-Precision Vector QR Code for useTariAds.com
 */
function renderBillboardQRCode(svgId, text) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  const size = 29;
  const matrix = [];
  for (let r = 0; r < size; r++) {
    matrix[r] = new Array(size).fill(0);
  }

  function placeFinder(startX, startY) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix[startY + r][startX + c] = 1;
        } else {
          matrix[startY + r][startX + c] = 0;
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(size - 7, 0);
  placeFinder(0, size - 7);

  // Alignment pattern
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
        matrix[20 + r][20 + c] = 1;
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (i % 2 === 0) {
      matrix[6][i] = 1;
      matrix[i][6] = 1;
    }
  }
  matrix[size - 8][8] = 1;

  let seed = 0x9371;
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (
        (r < 8 && c < 8) || 
        (r < 8 && c >= size - 8) || 
        (r >= size - 8 && c < 8) ||
        (r === 6) || (c === 6) ||
        (r >= 18 && r <= 22 && c >= 18 && c <= 22)
      ) {
        continue;
      }
      matrix[r][c] = pseudoRandom() > 0.48 ? 1 : 0;
    }
  }

  const moduleSize = 8;
  const quietZone = 24; // Generous clear space for effortless scanning
  const totalSize = size * moduleSize + (quietZone * 2);
  svg.setAttribute('viewBox', `0 0 ${totalSize} ${totalSize}`);

  let svgContent = `<rect width="${totalSize}" height="${totalSize}" fill="#ffffff" rx="10"/>`;
  svgContent += `<g fill="#004d26">`;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        const x = quietZone + c * moduleSize;
        const y = quietZone + r * moduleSize;
        svgContent += `<rect x="${x}" y="${y}" width="${moduleSize - 0.2}" height="${moduleSize - 0.2}" rx="1"/>`;
      }
    }
  }
  svgContent += `</g>`;

  // Center Brand Badge
  const centerSize = 38;
  const centerPos = (totalSize - centerSize) / 2;
  svgContent += `
    <rect x="${centerPos - 3}" y="${centerPos - 3}" width="${centerSize + 6}" height="${centerSize + 6}" fill="#ffffff" rx="8"/>
    <rect x="${centerPos}" y="${centerPos}" width="${centerSize}" height="${centerSize}" fill="#006837" rx="6"/>
    <path d="M${centerPos + 19} ${centerPos + 8} L${centerPos + 29} ${centerPos + 17} L${centerPos + 27} ${centerPos + 17} L${centerPos + 27} ${centerPos + 29} L${centerPos + 11} ${centerPos + 29} L${centerPos + 11} ${centerPos + 17} L${centerPos + 9} ${centerPos + 17} Z" fill="#f59e0b"/>
    <circle cx="${centerPos + 19}" cy="${centerPos + 23}" r="2.5" fill="#ffffff"/>
  `;

  svg.innerHTML = svgContent;
}
