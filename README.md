# Heritage Pearl Quest 3D — “Innovate Your Heritage Game”

A professional-looking **first‑person 3D** browser game built with **Three.js**.  
Two modes:
1) **Story Mode** (3 short chapters) — revive Emirati pearling heritage through goals & artifacts.
2) **Adventure (Free Dive)** — 5‑minute score attack with leaderboard.

Credits panel includes **Awaiz Ahmed**. Menus, pause, music/SFX, HUD, fullscreen, settings.

## Run in VS Code
1. Install the **Live Server** extension.
2. Open this folder, right‑click `index.html` → **Open with Live Server**.

(Or run `python -m http.server` and open http://localhost:8000/.)

## Controls
- **W A S D** move • **Space** ascend • **Ctrl** descend • **Shift** boost
- **E** interact/collect • **P** pause • **M** mute • **F** fullscreen
- **Mouse** look (click window to lock pointer)

## Tech
- Single‑page ES module: `main.js`
- No build tools or external assets required (CDN Three.js + WebAudio tones)
- Leaderboard & story progress saved to `localStorage`

Good luck!