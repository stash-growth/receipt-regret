// --- Tiny “mock API” and helpers (no backend needed) -----------------

function yearsBetween(startISO, endISO) {
    const ms = new Date(endISO) - new Date(startISO);
    return ms / (1000 * 60 * 60 * 24 * 365.25);
  }
  
function formatUSD(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

// Generate sparkline SVG
function generateSparkline(startAmount, endAmount, startDate, endDate, cagr = 0.07, cagrLabel = "Baseline 7%") {
  const numPoints = 24;
  const startTime = new Date(startDate).getTime();
  const endTime = new Date(endDate).getTime();
  const totalYears = yearsBetween(startDate, endDate);
  
  // Generate data points
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const progress = i / (numPoints - 1);
    const years = totalYears * progress;
    const value = startAmount * Math.pow(1 + cagr, years);
    points.push(value);
  }
  
  // SVG dimensions
  const width = 280;
  const height = 48;
  const padding = 4;
  
  // Calculate min/max for scaling
  const minValue = Math.min(...points);
  const maxValue = Math.max(...points);
  const valueRange = maxValue - minValue || 1; // avoid division by zero
  
  // Generate path
  const pathData = points.map((value, i) => {
    const x = padding + (i / (numPoints - 1)) * (width - padding * 2);
    const y = height - padding - ((value - minValue) / valueRange) * (height - padding * 2);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  
  return `
    <div class="sparkline-container">
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline">
        <path d="${pathData}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <div class="sparkline-caption">Hypothetical growth at ${cagrLabel} (illustrative)</div>
    </div>
  `;
}
  
  // Pretend this is POST /api/receipt-regret/analyze
  async function analyzeWhatIf({ amount, spendDate, merchant, cagr = 0.07, cagrLabel = "Baseline 7%" }) {
    const CAGR = cagr;
  
    // Guard: if date is today or future, just return no growth
    const todayISO = new Date().toISOString().slice(0, 10);
    const yrs = Math.max(0, yearsBetween(spendDate, todayISO));
    const todayValue = amount * Math.pow(1 + CAGR, yrs);
    const growthPct = amount > 0 ? ((todayValue / amount) - 1) * 100 : 0;
  
    // Simulate latency
    await new Promise(r => setTimeout(r, 300));
  
    return {
      ok: true,
      normalized: { amount, spendDate, merchant: merchant?.trim() || null },
      assumptions: { benchmark: `${cagrLabel} CAGR (illustrative)`, cagrLabel, startPriceDate: spendDate, endPriceDate: todayISO },
      estimates: { todayValue, growthPct }
    };
  }
  
  // Copy variants map
  const variants = {
    default: {
      name: "Demo",
      title: "Turn yesterday's spend into tomorrow's peace of mind.",
      subtitle: "See what a past purchase might be worth today—and automate the better choice going forward."
    },
    layla: {
      name: "Layla",
      title: "Less stress, more living.",
      subtitle: "See a past 'what-if' and automate a simple plan you don't have to babysit."
    },
    austin: {
      name: "Austin",
      title: "A calmer way to move forward.",
      subtitle: "Check the long-term hypothetical, then set a steady habit you control."
    }
  };

  // Theme management
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });

  // Get URL params for variant and pre-fill
  const params = new URLSearchParams(location.search);
  
  // Apply copy variant via ?v=layla|austin
  (function applyVariant(){
    const variantKey = (params.get("v") || "default").toLowerCase();
    const variant = variants[variantKey] || variants.default;
    
    // Update hero copy
    const heroTitle = document.getElementById("hero-title");
    const heroSub = document.getElementById("hero-sub");
    heroTitle.textContent = variant.title;
    heroSub.textContent = variant.subtitle;
    
    // Update document title
    document.title = `Receipt Regret — ${variant.name}`;
  })();
  
// --- Wire up the form -------------------------------------------------

const form = document.getElementById("regret-form");
const result = document.getElementById("result");
const resultBody = document.getElementById("result-body");
const ctaLink = document.getElementById("cta-link");
const submitButton = form.querySelector('button[type="submit"]');
const originalButtonText = submitButton.textContent;

const amountInput = document.getElementById("amount");
const dateInput = document.getElementById("date");
const amountError = document.getElementById("amount-error");
const dateError = document.getElementById("date-error");
const stickyCTABar = document.getElementById("sticky-cta-bar");
const stickyCTAButton = document.getElementById("sticky-cta-button");

// Set date input max to today
const today = new Date().toISOString().split('T')[0];
dateInput.max = today;

// Hide sticky bar when form is edited
function hideStickyCTA() {
  stickyCTABar.hidden = true;
}

function showStickyCTA() {
  stickyCTABar.hidden = false;
}

// Add listeners to form inputs to hide sticky bar
const merchantInput = document.getElementById("merchant");
[amountInput, dateInput, merchantInput].forEach(input => {
  input.addEventListener("input", hideStickyCTA);
});

// Share result functionality
const shareLink = document.getElementById("share-link");
const shareTooltip = document.getElementById("share-tooltip");

async function copyToClipboard(text) {
  // Try modern Clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("Clipboard API failed, falling back:", err);
    }
  }
  
  // Fallback for older browsers
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    document.body.removeChild(textarea);
    return false;
  }
}

function showTooltip() {
  shareTooltip.hidden = false;
  setTimeout(() => {
    shareTooltip.hidden = true;
  }, 2000);
}

// Lightweight confetti effect (~50 lines)
function triggerConfetti(x, y) {
  const c = document.createElement('canvas');
  Object.assign(c.style, {position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 9999});
  c.width = innerWidth; c.height = innerHeight;
  document.body.appendChild(c);
  const ctx = c.getContext('2d'), colors = ['#5fd0a5', '#06b6d4', '#a855f7', '#e7edf3', '#ff7a7a'];
  const particles = Array.from({length: 50}, () => ({
    x: x + (Math.random() - 0.5) * 100, y,
    vx: (Math.random() - 0.5) * 6, vy: Math.random() * -8 - 4,
    rot: Math.random() * 360, rotSpd: (Math.random() - 0.5) * 10,
    size: Math.random() * 8 + 4, color: colors[~~(Math.random() * colors.length)],
    isRect: Math.random() > 0.5
  }));
  const start = Date.now();
  (function draw() {
    const t = (Date.now() - start) / 800;
    if (t >= 1) return document.body.removeChild(c);
    ctx.clearRect(0, 0, c.width, c.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.rot += p.rotSpd;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.color;
      if (p.isRect) {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -p.size / 2);
        ctx.lineTo(p.size / 2, p.size / 2);
        ctx.lineTo(-p.size / 2, p.size / 2);
        ctx.fill();
      }
      ctx.restore();
    });
    requestAnimationFrame(draw);
  })();
}

// Pre-fill form from URL params and auto-run if params exist
(function preFillFromParams() {
  const amount = params.get("amount");
  const date = params.get("date");
  const merchant = params.get("merchant");
  const cagr = params.get("cagr");
  
  if (amount && date) {
    amountInput.value = amount;
    dateInput.value = date;
    if (merchant) merchantInput.value = merchant;
    
    // Set CAGR if provided
    if (cagr) {
      const cagrRadio = document.querySelector(`input[name="cagr"][value="${cagr}"]`);
      if (cagrRadio) cagrRadio.checked = true;
    }
    
    // Auto-submit the form after a brief delay
    setTimeout(() => {
      form.requestSubmit();
    }, 100);
  }
})();

// Helper to show/hide error messages
function showError(errorElement, message) {
  errorElement.textContent = message;
  errorElement.hidden = false;
}

function hideError(errorElement) {
  errorElement.hidden = true;
}

// Clear errors on input
amountInput.addEventListener("input", () => hideError(amountError));
dateInput.addEventListener("input", () => hideError(dateError));

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Clear previous errors
  hideError(amountError);
  hideError(dateError);

  const amount = Number(amountInput.value);
  const spendDate = dateInput.value;
  const merchant = document.getElementById("merchant").value;
  
  // Get selected CAGR
  const selectedCagr = document.querySelector('input[name="cagr"]:checked');
  const cagr = parseFloat(selectedCagr.value);
  const cagrLabel = selectedCagr.nextElementSibling.textContent;

  // Validate amount
  if (!amount || amount <= 0) {
    showError(amountError, "Please enter a valid amount greater than $0.");
    amountInput.focus();
    return;
  }

  // Validate date
  if (!spendDate) {
    showError(dateError, "Please select a purchase date.");
    dateInput.focus();
    return;
  }

  // Check if date is in the future
  if (spendDate > today) {
    showError(dateError, "Purchase date cannot be in the future.");
    dateInput.focus();
    return;
  }

  // Set loading state
  submitButton.disabled = true;
  submitButton.classList.add('loading');
  submitButton.textContent = "Calculating…";
  form.setAttribute('aria-busy', 'true');

  try {
    // "Analyze" (mock)
    const res = await analyzeWhatIf({ amount, spendDate, merchant, cagr, cagrLabel });

    if (!res.ok) { 
      showError(amountError, "Something went wrong. Please try again.");
      return; 
    }
  
    const a = res.normalized.amount;
    const tv = res.estimates.todayValue;
    const gp = res.estimates.growthPct;
  
    const delta = tv - a;
    const years = Math.max(0, (new Date().getTime() - new Date(spendDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    
    // Generate sparkline
    const todayISO = new Date().toISOString().slice(0, 10);
    const sparkline = generateSparkline(a, tv, spendDate, todayISO, cagr, cagrLabel);
    
    // Calculate default weekly amount (clamped between $5-$50)
    const defaultWeekly = Math.max(5, Math.min(50, Math.round(a)));
    const chipAmounts = [5, 10, 20, 50];
  
    resultBody.innerHTML = `
      <div class="kpi">
        <div class="label">You spent</div>
        <div class="value">${formatUSD(a)}</div>
      </div>
      <div class="kpi">
        <div class="label">If invested on ${spendDate}${merchant ? ` · (${merchant})` : ""}</div>
        <div class="value">${formatUSD(tv)}</div>
        ${sparkline}
      </div>
      <div class="kpi">
        <div class="label">Change over ~${years.toFixed(2)} years</div>
        <div class="value delta ${delta >= 0 ? "positive" : "negative"}">
          ${delta >= 0 ? "+" : "–"}${formatUSD(Math.abs(delta))} (${gp.toFixed(2)}%)
        </div>
      </div>
      <div class="suggested-habit">
        <div class="label">Suggested habit</div>
        <div class="chips">
          ${chipAmounts.map(amt => `
            <button class="chip" data-amount="${amt}" ${amt === defaultWeekly ? 'data-selected="true"' : ''} aria-label="Select $${amt} per week habit" aria-pressed="${amt === defaultWeekly}">
              $${amt}/week
            </button>
          `).join('')}
        </div>
      </div>
    `;
    
    // Helper to update both CTAs
    function updateCTAs(amount) {
      const url = `https://example.com/start?source=receipt-regret&weekly=${amount}`;
      const text = `Automate $${amount}/week`;
      const ariaLabel = `Automate weekly investment of $${amount}`;
      ctaLink.href = url;
      ctaLink.textContent = text;
      ctaLink.setAttribute('aria-label', ariaLabel);
      stickyCTAButton.href = url;
      stickyCTAButton.textContent = text;
      stickyCTAButton.setAttribute('aria-label', ariaLabel);
    }
    
    // Add confetti on CTA click
    function handleCTAClick(e) {
      const rect = e.target.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      triggerConfetti(x, y);
    }
    
    ctaLink.addEventListener('click', handleCTAClick);
    stickyCTAButton.addEventListener('click', handleCTAClick);
    
    // Set up chip click handlers
    const chips = resultBody.querySelectorAll('.chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const selectedAmount = parseInt(chip.dataset.amount);
        
        // Update chip selection and ARIA states
        chips.forEach(c => {
          c.removeAttribute('data-selected');
          c.setAttribute('aria-pressed', 'false');
        });
        chip.setAttribute('data-selected', 'true');
        chip.setAttribute('aria-pressed', 'true');
        
        // Update both CTAs
        updateCTAs(selectedAmount);
      });
    });
  
    // Initialize both CTAs with default weekly amount
    updateCTAs(defaultWeekly);
    
    // Set up share link
    shareLink.onclick = async (e) => {
      e.preventDefault();
      
      const shareUrl = new URL(window.location.href);
      shareUrl.search = ""; // Clear existing params
      const shareParams = new URLSearchParams();
      
      shareParams.set("amount", a);
      shareParams.set("date", spendDate);
      if (merchant) shareParams.set("merchant", merchant);
      shareParams.set("cagr", cagr);
      
      // Include variant if not default
      const currentVariant = params.get("v");
      if (currentVariant && currentVariant !== "default") {
        shareParams.set("v", currentVariant);
      }
      
      shareUrl.search = shareParams.toString();
      
      const success = await copyToClipboard(shareUrl.toString());
      if (success) {
        showTooltip();
      } else {
        alert("Could not copy to clipboard. Please copy manually: " + shareUrl.toString());
      }
    };
  
  result.hidden = false;
  showStickyCTA();

  // (Optional) simple console "events" to show instrumentation later
  const receiptImageInfo = currentFile ? {
    has_receipt_image: true,
    imageSize: currentFile.size,
    imageType: currentFile.type
  } : {
    has_receipt_image: false
  };
  
  console.log("rr_submit_inputs", { 
    amount: a, 
    ...receiptImageInfo 
  });
  console.log("rr_result_view", { todayValue: tv, growthPct: gp.toFixed(2), merchant: res.normalized.merchant });
  } catch (error) {
    console.error("Error during calculation:", error);
    showError(amountError, "An unexpected error occurred. Please try again.");
  } finally {
    // Restore button state
    submitButton.disabled = false;
    submitButton.classList.remove('loading');
    submitButton.textContent = originalButtonText;
    form.setAttribute('aria-busy', 'false');
  }
});

// --- Receipt Upload Dropzone ---
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const btnTakePhoto = document.getElementById("btn-take-photo");
const btnUpload = document.getElementById("btn-upload");
const preview = document.getElementById("preview");
const dropzoneError = document.getElementById("dropzone-error");
const scanStatus = document.getElementById("scan-status");

// Manual details and hint
const manualDetails = document.getElementById("manual-details");
const manualHint = document.getElementById("manual-hint");

let currentFile = null;

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropzone.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// Highlight dropzone when dragging over
['dragenter', 'dragover'].forEach(eventName => {
  dropzone.addEventListener(eventName, () => {
    dropzone.classList.add('dragover');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropzone.addEventListener(eventName, () => {
    dropzone.classList.remove('dragover');
  }, false);
});

// Handle dropped files
dropzone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;
  
  if (files.length > 0) {
    handleFile(files[0]);
  }
}, false);

// Button click handlers
btnUpload.addEventListener('click', () => {
  fileInput.click();
});

btnTakePhoto.addEventListener('click', () => {
  fileInput.click();
});

// File input change
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

// Handle paste from clipboard
window.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile();
      handleFile(blob);
      break;
    }
  }
});

// Handle file validation and preview
async function handleFile(file) {
  // Clear previous error
  dropzoneError.hidden = true;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    dropzoneError.textContent = 'Please select a valid image file.';
    dropzoneError.hidden = false;
    return;
  }
  
  // Validate file size (6MB max)
  const maxSize = 6 * 1024 * 1024; // 6MB in bytes
  if (file.size > maxSize) {
    dropzoneError.textContent = 'Image must be smaller than 6MB.';
    dropzoneError.hidden = false;
    return;
  }
  
  // If image > 3MB, compress it
  const compressionThreshold = 3 * 1024 * 1024; // 3MB
  let processedFile = file;
  
  if (file.size > compressionThreshold) {
    try {
      processedFile = await compressImage(file);
    } catch (error) {
      console.error('Compression failed:', error);
      dropzoneError.textContent = 'Failed to process image. Please try a different file.';
      dropzoneError.hidden = false;
      return;
    }
  }
  
  // Store current file (compressed or original)
  currentFile = processedFile;
  
  // Show preview
  showPreview(processedFile);
}

// Compress image client-side using canvas
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.onload = () => {
        // Calculate new dimensions (max 1600px on longest side)
        const maxDimension = 1600;
        let width = img.width;
        let height = img.height;
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob (JPEG with 0.85 quality for good compression)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create a new File object from the blob
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Canvas to blob conversion failed'));
            }
          },
          'image/jpeg',
          0.85
        );
      };
      
      img.onerror = () => reject(new Error('Image loading failed'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsDataURL(file);
  });
}

function showPreview(file) {
  const url = URL.createObjectURL(file);
  const fileName = file.name;
  const fileSize = formatFileSize(file.size);
  
  preview.innerHTML = `
    <img src="${url}" alt="Receipt preview" />
    <div class="preview-info">
      <div class="preview-filename">${escapeHtml(fileName)}</div>
      <div class="preview-size">${fileSize}</div>
      <a href="#" class="preview-remove" id="remove-preview">Remove</a>
    </div>
  `;
  
  preview.hidden = false;
  
  // Add remove handler
  document.getElementById('remove-preview').addEventListener('click', (e) => {
    e.preventDefault();
    clearPreview();
  });
  
  // Hide manual upload row since we have a receipt
  document.getElementById('manual-upload-row')?.setAttribute('hidden', '');
  
  // Start fake scanning
  startFakeScan(file);
}

function startFakeScan(file) {
  // Show scanning status
  scanStatus.hidden = false;
  
  // Wait ~1200ms then auto-fill form
  setTimeout(() => {
    scanStatus.hidden = true;
    autoFillFormFromReceipt(file);
  }, 1200);
}

function autoFillFormFromReceipt(file) {
  // Extract or generate amount
  const amount = extractAmountFromFilename(file.name);
  amountInput.value = amount.toFixed(2);
  
  // Generate random date (7-45 days ago)
  const daysAgo = Math.floor(Math.random() * (45 - 7 + 1)) + 7;
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const dateStr = date.toISOString().slice(0, 10);
  dateInput.value = dateStr;
  
  // Pick random merchant (or leave empty 30% of the time)
  const merchants = ["Starbucks", "Target", "CVS", "Uber", "DoorDash"];
  const useMerchant = Math.random() > 0.3;
  if (useMerchant) {
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    merchantInput.value = merchant;
  } else {
    merchantInput.value = '';
  }
  
  // Clear any previous errors
  hideError(amountError);
  hideError(dateError);
  
  // Collapse the manual details and show hint
  manualDetails?.removeAttribute('open');
  manualHint?.removeAttribute('hidden');
}

function extractAmountFromFilename(filename) {
  // Try to find 2-4 digit numbers in filename
  // Match patterns like: 12.99, 1299, 12-99, etc.
  const patterns = [
    /(\d{2,4}[.,]\d{2})/,  // 12.99 or 12,99
    /(\d{2,4})/             // 1299
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      let numStr = match[1].replace(',', '.');
      // If no decimal point, assume it's cents (e.g., 1299 -> 12.99)
      if (!numStr.includes('.')) {
        const num = parseInt(numStr, 10);
        if (num >= 100) {
          return num / 100;
        }
        return num;
      }
      return parseFloat(numStr);
    }
  }
  
  // If no match, pick a plausible random amount
  const plausibleAmounts = [8.95, 12.75, 18.99, 23.45, 28.50];
  return plausibleAmounts[Math.floor(Math.random() * plausibleAmounts.length)];
}

function clearPreview() {
  preview.hidden = true;
  preview.innerHTML = '';
  currentFile = null;
  fileInput.value = '';
  dropzoneError.hidden = true;
  scanStatus.hidden = true;
  
  // Show manual upload row again
  document.getElementById('manual-upload-row')?.removeAttribute('hidden');
  
  // Reopen manual details and hide hint
  manualDetails?.setAttribute('open', '');
  manualHint?.setAttribute('hidden', '');
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// --- Privacy Modal ---
const modal = document.getElementById('privacy-modal');
const closeBtn = document.getElementById('close-modal');
const privacyTipLink = document.getElementById('privacy-tip-link');

function openModal() {
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  if (closeBtn) closeBtn.focus();
}

function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  if (privacyTipLink) privacyTipLink.focus();
}

if (modal) {
  // Sync body state on load + bfcache restore
  document.body.classList.toggle('modal-open', !modal.hidden);
  window.addEventListener('pageshow', () => {
    if (modal.hidden) document.body.classList.remove('modal-open');
  });

  // Close controls
  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });
}

// Wire privacy tip link to open modal
if (privacyTipLink) {
  privacyTipLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
  });
}