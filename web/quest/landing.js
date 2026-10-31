// Landing page for the Quest app. Checks for immersive AR, prefetches the
// eulogy if a device was named, and starts either the headset or the preview.

import { App } from "./main.js";

const btnEnter = document.getElementById("btn-enter");
const btnPreview = document.getElementById("btn-preview");
const status = document.getElementById("status");
const inputName = document.getElementById("input-name");
const landing = document.getElementById("landing");
const previewUi = document.getElementById("preview-ui");

try {
  const last = localStorage.getItem("pm-last-buried");
  if (last) inputName.value = last;
} catch (err) {
  // Storage blocked. Leave the field empty.
}

async function checkSupport() {
  if (!navigator.xr || !navigator.xr.isSessionSupported) {
    status.textContent = "No headset here. Open this page in the Quest 3 browser, or watch the preview.";
    btnEnter.textContent = "Headset needed";
    return;
  }
  try {
    const ok = await navigator.xr.isSessionSupported("immersive-ar");
    btnEnter.disabled = !ok;
    btnEnter.textContent = ok ? "Enter the house" : "Headset needed";
    if (!ok) status.textContent = "This browser cannot do passthrough. Open this page in the Quest 3 browser.";
  } catch (err) {
    btnEnter.textContent = "Headset needed";
  }
}

async function prepareFuneral() {
  const name = inputName.value.trim();
  if (!name) return null;
  try {
    localStorage.setItem("pm-last-buried", name);
  } catch (err) {
    // Ignore.
  }
  try {
    const res = await fetch("/api/eulogy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: name }),
    });
    const data = await res.json();
    return { name, text: data.text };
  } catch (err) {
    return { name, text: "" };
  }
}

btnEnter.addEventListener("click", async () => {
  btnEnter.disabled = true;
  const funeralPromise = prepareFuneral();
  const app = new App({ funeral: null });
  app.onExit = () => {
    document.body.classList.remove("presenting");
    btnEnter.disabled = false;
  };
  try {
    document.body.classList.add("presenting");
    await app.enterXR();
    app.ctx.funeral = await funeralPromise;
  } catch (err) {
    document.body.classList.remove("presenting");
    status.textContent = "The headset would not open the door. " + (err && err.message ? err.message : "");
    btnEnter.disabled = false;
  }
});

btnPreview.addEventListener("click", async () => {
  landing.hidden = true;
  previewUi.hidden = false;
  document.body.classList.add("previewing");
  const app = new App({ preview: true });
  window.postMortemApp = app;
  await app.enterPreview();
});

document.getElementById("btn-exit-preview").addEventListener("click", () => {
  location.reload();
});

checkSupport();
