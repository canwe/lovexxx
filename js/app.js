const ZOOM_MS = 600;
const HOVER_CLEAR_MS = 750;
/** love.js contact.flashKickOff interval */
const FLASH_MS = 100;

const state = {
  portals: [],
  activeId: null,
  zoomed: false,
  zooming: false,
  orientation: null,
  hoverTrack: [],
  hoverTimer: null,
  justTapped: null,
  flashTimer: null,
  flashCount: 0,
  stopItBound: false,
};

const el = {
  preloader: document.getElementById("preloader"),
  labels: document.getElementById("portal-labels"),
  images: document.getElementById("portal-images"),
  stage: document.getElementById("portal-stage"),
  stageImages: document.getElementById("stage-images"),
  stageText: document.getElementById("stage-text"),
  stageTitle: document.getElementById("stage-title"),
  back: document.getElementById("back"),
};

/** plugins.min.js $.shuffle */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length; i; ) {
    const j = Math.floor(Math.random() * i);
    i -= 1;
    const x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

/** plugins.min.js $.fn.shuffle */
function shuffleChildren(parent) {
  parent.replaceChildren(...shuffleArray([...parent.children]));
}

function isPortrait() {
  // Match CSS `@media (orientation: portrait)` used by original style.css
  if (window.matchMedia) {
    return window.matchMedia("(orientation: portrait)").matches;
  }
  return window.innerWidth / window.innerHeight <= 1;
}

function getPosition(index) {
  if (!isPortrait()) {
    const row = Math.floor(index / 3) === 0 ? "top" : "bottom";
    const col = ["left", "center", "right"][index % 3];
    return `${row}-${col}`;
  }
  const row = ["top", "center", "bottom"][Math.floor(index / 2)];
  const col = index % 2 === 0 ? "left" : "right";
  return `${row}-${col}`;
}

function refreshPositions() {
  const next = isPortrait() ? "portrait" : "landscape";
  const orientationChanged = state.orientation !== next;
  state.orientation = next;

  [...el.labels.children].forEach((section, i) => {
    section.dataset.position = getPosition(i);
  });

  if (state.zoomed && state.activeId) {
    const active = el.labels.querySelector(`#${CSS.escape(state.activeId)}`);
    const origin = active?.dataset.position || "";
    el.labels.className = `portals portals-type zoom ${origin}`;
    el.images.className = `portals portals-images zoom ${origin}`;
    applyZoomTransforms(!orientationChanged);
  }
}

function titleSrc(id) {
  return `./assets/svg/${id}.svg`;
}

function buildPortal(portal, index) {
  const label = document.createElement("section");
  label.id = portal.id;
  label.dataset.index = String(index);
  label.style.backgroundColor = portal.color;
  label.dataset.position = getPosition(index);

  const title = document.createElement("img");
  title.className = "title";
  title.alt = "";
  title.draggable = false;
  title.src = titleSrc(portal.id);
  label.appendChild(title);

  const imageSection = document.createElement("section");
  imageSection.dataset.portal = portal.id;
  const imagesWrap = document.createElement("div");
  imagesWrap.className = "images";

  portal.images.forEach((url, i) => {
    const span = document.createElement("span");
    span.className = i === 0 ? "home-image" : "home-image is-hidden";
    span.style.backgroundImage = `url("${url}")`;
    imagesWrap.appendChild(span);
  });

  imageSection.appendChild(imagesWrap);
  el.labels.appendChild(label);
  el.images.appendChild(imageSection);
  state.hoverTrack[index] = 0;
}

function preloadImages(urls) {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = url;
        }),
    ),
  );
}

/**
 * love.home.cycleImages / love.contact.cycleImages
 * first-child hide → next show → append first to end
 */
function cycleChildren(wrap, childSelector) {
  const first =
    wrap.querySelector(`${childSelector}:first-child`) || wrap.firstElementChild;
  if (!first) return;
  const next = first.nextElementSibling;
  first.classList.add("is-hidden");
  if (next) next.classList.remove("is-hidden");
  else if (wrap.firstElementChild) wrap.firstElementChild.classList.remove("is-hidden");
  wrap.appendChild(first);
}

function onPortalHoverEnter(label) {
  if (state.zoomed || state.zooming) return;
  const index = Number(label.dataset.index);
  const pair = el.images.children[index];
  if (!pair) return;

  clearActive();
  label.classList.add("hover");
  pair.classList.add("hover");

  clearTimeout(state.hoverTimer);
  state.hoverTimer = setTimeout(() => {
    label.classList.remove("hover");
    pair.classList.remove("hover");
  }, HOVER_CLEAR_MS);

  const imagesWrap = pair.querySelector(".images");
  const imageCount = imagesWrap.children.length;
  cycleChildren(imagesWrap, ".home-image");
  state.hoverTrack[index] += 1;
  if (state.hoverTrack[index] === imageCount) {
    shuffleChildren(imagesWrap);
    [...imagesWrap.children].forEach((node, i) => {
      node.classList.toggle("is-hidden", i !== 0);
    });
    state.hoverTrack[index] = 0;
  }
}

function onPortalHoverLeave(label) {
  if (state.zoomed || state.zooming) return;
  const index = Number(label.dataset.index);
  label.classList.remove("hover");
  el.images.children[index]?.classList.remove("hover");
}

function clearActive() {
  el.labels.querySelectorAll(".active, .hover").forEach((n) => {
    n.classList.remove("active", "hover");
  });
  el.images.querySelectorAll(".active, .hover").forEach((n) => {
    n.classList.remove("active", "hover");
  });
}

function zoomScale() {
  return isPortrait() ? "scale(2, 3)" : "scale(3, 2)";
}

function applyZoomTransforms(instant = false) {
  const duration = instant ? "0ms" : `${ZOOM_MS}ms`;
  el.labels.style.transition = `transform ${duration} ease-in-out`;
  el.images.style.transition = `transform ${duration} ease-in-out`;

  if (!state.zoomed) {
    el.labels.style.transform = "";
    el.images.style.transform = "";
    return;
  }

  const scale = zoomScale();
  el.labels.style.transform = scale;
  el.images.style.transform = scale;
}

function clearFlashTimer() {
  if (state.flashTimer != null) {
    clearInterval(state.flashTimer);
    state.flashTimer = null;
  }
}

/**
 * love.home.flashImages (archived behavior) — NOT contact's endless loop.
 * Every 100ms: cycle once; after a full pass stop on the current frame.
 *
 *   count = total == count ? 0 : count + 1
 *   if (total - 1 == count) clearInterval → settle
 */
function flashImagesTick(total) {
  cycleChildren(el.stageImages, ".stage-image");
  state.flashCount = state.flashCount === total ? 0 : state.flashCount + 1;
  if (state.flashCount === total - 1) {
    clearFlashTimer();
    // One image selected and shown — drop title overlay like settling the view
    el.stageText.classList.add("is-clear");
  }
}

/** One-pass 100ms blink, then settle (home.flashImages). */
function flashKickOff() {
  clearFlashTimer();
  state.flashCount = 0;
  el.stageText.classList.remove("is-clear");
  const total = el.stageImages.children.length;
  if (total <= 1) {
    el.stageText.classList.add("is-clear");
    return;
  }
  state.flashTimer = setInterval(() => flashImagesTick(total), FLASH_MS);
}

/**
 * While still blinking, press freezes early on the current frame (settle now).
 * After settle, press is a no-op for flashing.
 */
function bindStopIt() {
  if (state.stopItBound) return;
  state.stopItBound = true;

  const settleNow = (ev) => {
    if (!state.zoomed || el.stage.hidden) return;
    if (ev.target === el.back || el.back.contains(ev.target)) return;
    if (state.flashTimer == null) return;
    clearFlashTimer();
    el.stageText.classList.add("is-clear");
  };

  document.addEventListener("mousedown", settleNow);
  document.addEventListener("touchstart", settleNow, { passive: true });
}

function openStage(portal) {
  clearFlashTimer();
  state.flashCount = 0;
  el.stageImages.replaceChildren();
  el.stageText.classList.remove("is-clear");
  el.stageTitle.src = titleSrc(portal.id);

  // Same cover technique as home tiles (background-image), flash cycle unchanged.
  portal.images.forEach((url, i) => {
    const span = document.createElement("span");
    span.className = i === 0 ? "stage-image" : "stage-image is-hidden";
    span.style.backgroundImage = `url("${url}")`;
    el.stageImages.appendChild(span);
  });

  document.documentElement.style.backgroundColor = portal.color;
  el.stage.hidden = false;
  requestAnimationFrame(() => el.stage.classList.add("is-open"));

  // Original: preloader fades out on portal preload-complete so content is visible.
  // We were leaving preloader up (z-index 5000) and it hid the 100ms blink.
  el.preloader.className = "preloader is-done";

  // Shuffle once on enter so the settled frame varies (hover/contact shuffle idea)
  shuffleChildren(el.stageImages);
  [...el.stageImages.children].forEach((node, i) => {
    node.classList.toggle("is-hidden", i !== 0);
  });

  flashKickOff();
  bindStopIt();
}

function closeStage() {
  clearFlashTimer();
  state.flashCount = 0;
  el.stage.classList.remove("is-open");
  el.stageText.classList.remove("is-clear");
  window.setTimeout(() => {
    if (!state.zoomed) {
      el.stage.hidden = true;
      el.stageImages.replaceChildren();
    }
  }, 300);
}

function zoomIn(portal, label) {
  if (state.zoomed || state.zooming) return;
  const index = Number(label.dataset.index);
  const pair = el.images.children[index];
  const origin = label.dataset.position;

  state.zooming = true;
  state.activeId = portal.id;
  clearActive();
  label.classList.add("active");
  pair?.classList.add("active");
  document.documentElement.style.backgroundColor = portal.color;

  el.preloader.className = `preloader ${portal.id}`;
  el.labels.classList.add(origin, "zooming");
  el.images.classList.add(origin, "zooming");
  state.zoomed = true;
  applyZoomTransforms(false);

  window.setTimeout(() => {
    el.labels.classList.remove("zooming");
    el.images.classList.remove("zooming");
    el.labels.classList.add("zoom");
    el.images.classList.add("zoom");
    state.zooming = false;
    openStage(portal);
    el.back.classList.remove("hider");
  }, ZOOM_MS);
}

function zoomOut(ev) {
  if (ev) ev.preventDefault();
  if (!state.zoomed || state.zooming) return;
  state.zooming = true;
  closeStage();
  el.back.classList.add("hider");
  el.preloader.className = "preloader is-done";

  el.labels.classList.add("zooming");
  el.images.classList.add("zooming");
  el.labels.classList.remove("zoom");
  el.images.classList.remove("zoom");

  const current = zoomScale();
  el.labels.style.transition = "none";
  el.images.style.transition = "none";
  el.labels.style.transform = current;
  el.images.style.transform = current;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.labels.style.transition = `transform ${ZOOM_MS}ms ease-in-out`;
      el.images.style.transition = `transform ${ZOOM_MS}ms ease-in-out`;
      el.labels.style.transform = "";
      el.images.style.transform = "";
    });
  });

  state.zoomed = false;

  window.setTimeout(() => {
    el.labels.className = "portals portals-type";
    el.images.className = "portals portals-images";
    clearActive();
    state.activeId = null;
    state.zooming = false;
    document.documentElement.style.backgroundColor = "#000";
    el.labels.style.transition = "";
    el.images.style.transition = "";
    el.labels.style.transform = "";
    el.images.style.transform = "";
    el.stage.hidden = true;
    el.stageImages.replaceChildren();
  }, ZOOM_MS);
}

function bindInteractions() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;

  [...el.labels.children].forEach((label) => {
    const portal = state.portals[Number(label.dataset.index)];

    if (!coarse) {
      label.addEventListener("pointerenter", () => onPortalHoverEnter(label));
      label.addEventListener("pointerleave", () => onPortalHoverLeave(label));
      label.addEventListener("click", () => zoomIn(portal, label));
      return;
    }

    label.addEventListener("click", () => {
      if (state.zoomed || state.zooming) return;
      if (state.justTapped === portal.id) {
        state.justTapped = null;
        zoomIn(portal, label);
      } else {
        state.justTapped = portal.id;
        onPortalHoverEnter(label);
      }
    });
  });

  el.back.addEventListener("click", (e) => {
    e.preventDefault();
    zoomOut();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") zoomOut();
  });
  window.addEventListener("resize", () => refreshPositions());
  if (window.matchMedia) {
    const mql = window.matchMedia("(orientation: portrait)");
    const onOrient = () => refreshPositions();
    if (mql.addEventListener) mql.addEventListener("change", onOrient);
    else if (mql.addListener) mql.addListener(onOrient);
  }
}

async function boot() {
  const res = await fetch("./content.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load content.json (${res.status})`);
  const data = await res.json();

  document.title = data.site?.title || "<3";
  state.portals = data.portals || [];

  refreshPositions();
  state.portals.forEach((portal, i) => buildPortal(portal, i));

  const firstWave = state.portals.flatMap((p) => p.images.slice(0, 2));
  await preloadImages(firstWave);

  el.preloader.classList.add("is-done");
  bindInteractions();
  preloadImages(state.portals.flatMap((p) => p.images));
}

boot().catch((err) => {
  console.error(err);
  const mark = el.preloader.querySelector(".preloader-mark");
  if (mark) mark.textContent = "err";
});

// Expose for UI tests
window.__love = {
  state,
  FLASH_MS,
  ZOOM_MS,
  HOVER_CLEAR_MS,
  shuffleArray,
  shuffleChildren,
  flashImagesTick,
  getPosition,
  refreshPositions,
  isPortrait,
};
