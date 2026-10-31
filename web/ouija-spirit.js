// Peripheral spirit flashes. Never in the center. Never often.

const Spirits = (() => {
  const layer = document.getElementById("whisper-layer");
  const anchors = [
    { left: "4%", top: "30%" },
    { right: "5%", top: "34%" },
    { left: "8%", bottom: "18%" },
    { right: "7%", bottom: "22%" },
  ];
  let lastAt = 0;

  function flash() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const now = performance.now();
    if (now - lastAt < 40000) return;
    lastAt = now;

    const anchor = anchors[Math.floor(Math.random() * anchors.length)];
    const el = document.createElement("div");
    el.className = "spirit";
    if (anchor.left) el.style.left = anchor.left;
    if (anchor.right) el.style.right = anchor.right;
    if (anchor.top) el.style.top = anchor.top;
    if (anchor.bottom) el.style.bottom = anchor.bottom;
    layer.appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity = "0.22";
    });

    const hold = 1000 + Math.random() * 2000;
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 900);
    }, hold);
  }

  function schedule() {
    const delay = 40000 + Math.random() * 50000;
    setTimeout(() => {
      flash();
      schedule();
    }, delay);
  }

  schedule();

  return { flash };
})();
