export function setBusy(form, busy) {
  for (const control of form.elements || []) control.disabled = busy;
  form.classList.toggle("busy", busy);
  form.setAttribute("aria-busy", String(busy));
}
export function createNavigationButtons(tabs, activeId, onSelect) {
  return tabs.map(([id, label, icon]) => {
    const button = document.createElement("button"); button.type = "button";
    button.className = id === activeId ? "nav-item active" : "nav-item";
    button.setAttribute("aria-current", id === activeId ? "page" : "false");
    const mark = document.createElement("span"); mark.setAttribute("aria-hidden", "true"); mark.textContent = icon;
    const text = document.createElement("strong"); text.textContent = label; button.append(mark, text);
    button.addEventListener("click", () => onSelect(id)); return button;
  });
}
export function createFeatureCard({ heading, description, actionLabel = "Open", onAction }) {
  const article = document.createElement("article"); article.className = "feature-card";
  const mark = document.createElement("div"); mark.className = "card-mark";
  const title = document.createElement("h3"); title.textContent = heading;
  const body = document.createElement("p"); body.textContent = description;
  const button = document.createElement("button"); button.type = "button"; button.textContent = actionLabel;
  const arrow = document.createElement("span"); arrow.setAttribute("aria-hidden", "true"); arrow.textContent = " →"; button.append(arrow);
  button.addEventListener("click", onAction); article.append(mark, title, body, button); return article;
}
export function announce(message) {
  let region = document.querySelector("#fieldwise-announcer");
  if (!region) { region=document.createElement("div"); region.id="fieldwise-announcer"; region.className="fw-visually-hidden"; region.setAttribute("role", "status"); region.setAttribute("aria-live", "polite"); document.body.append(region); }
  region.textContent = ""; requestAnimationFrame(() => { region.textContent=String(message); });
}
