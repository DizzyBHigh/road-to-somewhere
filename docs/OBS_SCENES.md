# DBH OBS Scene Specification v1

Target canvas: **1920 × 1080**.

The design is intentionally built from independent sources. Use transparent PNGs for artwork and OBS text sources for editable copy whenever possible.

## Shared source naming

```text
DBH - Shared - Logo
DBH - Shared - Crown
DBH - Shared - Route Line
DBH - Shared - Brush Blue 01
DBH - Shared - Brush Gold 01
DBH - Shared - X Blue 01
DBH - Shared - Map Pin
DBH - Shared - Socials
```

## 1. DBH - STARTING

```text
01 BG - Sky
02 BG - Environment
03 BG - Road
04 World - Vehicle
05 World - Route Sign
06 World - Destination Sign
07 FX - Clouds
08 FX - Route Line
09 FX - Brush Blue
10 FX - X Marks
11 Brand - Logo
12 Brand - Crown
13 Text - Tagline
14 Text - Main Title
15 Text - Subtitle
16 Socials
```

Copy:
- `ON THE ROAD TO SOMEWHERE`
- `STARTING SOON`
- `BUCKLE UP. THE JOURNEY IS ABOUT TO BEGIN.`

## 2. DBH - BRB PIT STOP

The BRB scene has a **live game display** mounted inside a stylized roadside screen/billboard.

```text
01 BG - Sky
02 BG - Environment
03 BG - Road
04 World - Diner
05 World - Vehicle
06 World - Gas Pump
07 Screen - Frame
08 Screen - Glow
09 LIVE - Game Capture        <-- OBS Game Capture / Window Capture
10 Screen - Reflection
11 Screen - Header
12 Screen - Footer
13 World - Pit Stop Sign
14 World - Destination Sign
15 Brand - Logo
16 Brand - Crown
17 Text - Main Title
18 Text - Accent
19 Text - Subtitle
20 FX - Route Line
21 FX - Brush Blue
22 FX - Brush Gold
23 Socials
```

Copy:
- `CURRENT GAME` (screen header)
- `BE RIGHT BACK`
- `PIT STOP.`
- `I'LL BE BACK ON THE ROAD SOON!`
- Optional screen footer: `ENJOY THE RIDE!`

### Live game display implementation

The game capture must remain a separate live OBS source placed behind the screen frame and reflection. Never bake a screenshot into the frame asset.

Recommended source hierarchy:

```text
Screen - Glow
Screen - Frame
Screen - Header
Screen - Footer
LIVE - Game Capture
Screen - Reflection
```

This allows Move to animate the frame/glow while the live game remains uninterrupted.

## 3. DBH - PAUSE

```text
01 BG - Map
02 BG - Texture
03 Brand - Logo
04 Brand - Crown
05 Pause - Ring
06 Pause - Symbol
07 World - Destination Sign
08 FX - Route Line
09 FX - Map Pin
10 FX - X Marks
11 Text - Main Title
12 Text - Subtitle
13 Socials
```

Copy:
- `PAUSE`
- `I'LL BE BACK WHEN THE ROAD CALLS AGAIN.`
- `UNKNOWN ROADS...`

## 4. DBH - ENDING

```text
01 BG - Sunset
02 BG - Mountains
03 BG - Road
04 World - Vehicle
05 World - Somewhere Sign
06 FX - Clouds
07 FX - Route Line
08 FX - Brush Blue
09 FX - Brush Gold
10 Brand - Logo
11 Brand - Crown
12 Text - Tagline
13 Text - Main Title
14 Text - Subtitle
15 Socials
```

Copy:
- `ON THE ROAD TO SOMEWHERE`
- `STREAM ENDING`
- `ANOTHER MILE DOWN.`
- `THANKS FOR RIDING ALONG!`
- Sign: `SOMEWHERE / SEE YOU NEXT TIME!`

## 5. DBH - NEXT STOP

A reusable game-change card. Replace the destination/game text without replacing the artwork.

Suggested text structure:

```text
NEXT STOP
[GAME / DESTINATION]
ROUTE DBH // [OPTIONAL CODE]
```

Examples:
- `LOS SANTOS`
- `VALENTINE`
- `NIGHT CITY`
- `STANTON SYSTEM`

## 6. DBH - TRANSITION

Reusable transition language:

```text
Route line enters
→ brush sweep
→ DBH logo flash
→ next scene
```

Keep the transition assets separate so Move Transition / Move Source can animate them.
