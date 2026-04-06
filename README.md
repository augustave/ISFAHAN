# ISFAHAN — ANI-A1 Thermal Drone HUD

A zero-dependency, SVG-based military drone surveillance HUD rendered entirely in the browser.

**[Live Demo](https://augustave.github.io/ISFAHAN/)**

![ANI-A1 HUD](https://img.shields.io/badge/status-OPERATIONAL-red?style=flat-square) ![Lines](https://img.shields.io/badge/~580_lines-zero_deps-black?style=flat-square)

## Features

### Avionics
- **Compass bar** — heading indicator with cardinal/degree tick marks, sinusoidal drift
- **Altitude tape** — scrolling vertical instrument (left), 2000–3600 FT range
- **Airspeed tape** — scrolling vertical instrument (right), 80–180 KTS range
- **Roll/bank horizon** — tilting horizon line with aircraft symbol
- **Targeting reticle** — pulsing bracket system with inner/outer crosshairs

### Tactical Systems
- **Weapon status** — Hellfire missile count with fire capability
- **RWR (Radar Warning Receiver)** — mini radar display with randomized threat bearings
- **Target lock** — TGT LCK / HT SIG indicators with range readout
- **FLIR gimbal** — live zoom, pan, and tilt sensor readout

### Telemetry
- **GPS coordinates** — drifting DMS format
- **UTC clock** — real-time
- **System status** — SYS / TRK / WPN / LNK / FLT mode panels
- **Power** — percentage readout with vertical bar gauge

### Effects
- **Thermal noise grain** — SVG feTurbulence with animated seed
- **Scanline overlay** — vertical line texture
- **Vignette** — radial edge darkening
- **Thermal background** — layered CSS gradients with subtle drift animation
- **HUD flicker** — rapid opacity oscillation

## Controls

| Key | Action |
|-----|--------|
| **Click** | Reposition targeting reticle |
| **W / S** | Altitude +/- 20 FT |
| **A / D** | Heading +/- 2° |
| **Arrow Up/Down** | Altitude +/- 50 FT |
| **Arrow Left/Right** | Heading +/- 5° |
| **Space** | Fire weapon (screen flash, depletes Hellfire count) |

## Tech Stack

Pure browser technologies, no build step:

- **SVG** — all HUD vector elements, filters, clip paths
- **CSS** — thermal background, scanlines, animations (pulse, blink, sweep, flicker)
- **Vanilla JS** — telemetry drift, compass animation, tape instruments, interactivity

## Run Locally

```bash
# Any static server works
python3 -m http.server 8000
# Open http://localhost:8000
```

## Architecture

Three stacked full-viewport layers:

1. `div#thermal-bg` — CSS gradient thermal landscape
2. `svg#hud` — all HUD elements in a 1920x1080 viewBox
3. `div#scanlines` — vertical scanline texture + vignette

The SVG uses `preserveAspectRatio="xMidYMid meet"` to scale proportionally to any viewport.

## License

MIT
