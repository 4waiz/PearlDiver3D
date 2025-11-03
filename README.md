# Pearl Diver 3D — UAE Heritage (Three.js)

A first‑person **3D pearl‑diving** game you can run in the browser. Swim under the sea,
collect pearls, avoid jellyfish, resurface at the dhow to bank your haul and refill oxygen.
Timer is **5 minutes**; includes a start menu, SFX (WebAudio), and a **local leaderboard**.

## How to run (VS Code)
1) Install the **Live Server** extension (or run any static web server).
2) Open the folder in VS Code and open `index.html`.
3) Click **Go Live** (bottom-right) to launch in the browser.

> You can also serve via Python:
> ```bash
> python -m http.server 8000
> # then open http://localhost:8000/
> ```

## Controls
- **W A S D** — swim forward/left/back/right
- **Space** — ascend  •  **Ctrl** — descend
- **Shift** — swim boost
- **E** — collect nearby pearl
- **P** — pause
- **M** — mute/unmute
- **F** — toggle fullscreen

## Notes
- Uses **Three.js** from a CDN, so you need an internet connection the first time.
- Leaderboard is stored in `localStorage` (persists in your browser).
- Designed for ~5 minutes of play. Tweak `GAME_LENGTH_SECONDS` in `main.js` to adjust.
