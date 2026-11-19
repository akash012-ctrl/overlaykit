# Prompt: TM-01 and test cards as an offline iPad web page

Status: written 2026-11-19 (D-034). Paste the block below into Claude or another code assistant. Save its output as `test-fixtures/tm-01/web/index.html` in this repo so it can be checked and versioned.

The strings in the prompt are the ground truth. TM-01 strings come from `FIXTURE.md` §3 and §6. The CARD-EN lines are new. The CARD-HI and CARD-KN lines are drafts written by Kiro (AI), not checked by a fluent speaker, so they are **unreviewed** (D-031). CARD-KN is expected to give the unsupported-script or no-text state, because ML Kit Text Recognition v2 reads Latin, Chinese, Devanagari, Japanese and Korean scripts only (D-005).

## The prompt

````text
Build a single self-contained HTML file, index.html, that shows test scenes on an iPad for a camera text-recognition app. A phone camera photographs the iPad screen and reads the text. Exact text, sharp flat rendering and no extra on-screen text matter more than looks.

HARD RULES
1. One file. All CSS and JavaScript inline. No external resources: no CDN, web font, remote image, icon set, iframe or analytics. No fetch, XMLHttpRequest, WebSocket, EventSource, service worker, localStorage, sessionStorage, IndexedDB or cookies. It must keep working with the network off after it loads.
2. Use every string below exactly, character for character. Do not fix, translate, shorten, re-case or add punctuation. U+200C (zero-width non-joiner) appears in two Kannada lines, written as \u200C; keep it.
3. No visible text in a scene other than the strings listed for that scene: no titles, scene names, page numbers, hints, watermarks or button labels.
4. Scenes change only when the operator taps or swipes. No timers that change what is shown, no auto-advance, no animations, transitions, blinking or hover effects.
5. Fixed flat colours as given. Ignore dark mode. No gradients, shadows, textures, blur or transparency (they cause glare and moire on camera).
6. System fonts only:
   - Latin: -apple-system, "Helvetica Neue", Arial, sans-serif.
   - Hindi: "Kohinoor Devanagari", "Devanagari Sangam MN", sans-serif. Set lang="hi".
   - Kannada: "Kannada Sangam MN", "Noto Sans Kannada", sans-serif. Set lang="kn".
   Hindi and Kannada text needs a line-height of at least 1.6 and no overflow clipping, so marks above and below the line are always fully visible.
7. iPad, portrait, full screen. Viewport meta: width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover. Add apple-mobile-web-app-capable=yes and apple-mobile-web-app-status-bar-style=black so "Add to Home Screen" opens it full screen. Disable text selection, the long-press callout, double-tap zoom (touch-action: manipulation), scrolling and overscroll bounce.

LAYOUT
Every scene is drawn inside a "panel": a rectangle with a fixed 3:4 aspect ratio (width:height), as large as fits the screen, centred on a black #000000 page. All boxes below are fractions of the panel: x and y from its top-left corner, w and h of its width and height. Make the panel a CSS size container and size fonts in container units (cqh), so the layout is the same on every iPad.
Each text element is an absolutely positioned box (box-sizing: border-box) at exactly its x, y, w, h. Its text sits on one line, centred horizontally and vertically, never wraps, with a font size of about 70% of the box height. If a string would overflow its box, reduce only that element's font size until it fits.

SCENES, in this order. The page opens on TM01-S01.
TM01-S01, TM01-S02, TM01-S03, TM01-S04, TM01-S05, TM01-S06, CARD-EN, CARD-HI, CARD-KN, BLANK, GRID

1) TM01-S01 to TM01-S06: a simulated ticket machine panel (not a real machine)
All six use the same panel drawing. Only the text on the screen changes.
Panel body: flat #9AA3AD with a border 1% of the panel width thick in #5F6872.
Labels: black #000000 text, weight 600, on a light plate #F4F4F2 that fills the label's box.
Component graphics are simple flat shapes with no text.

Id        | Element                   | x    | y    | w    | h    | Content
L01       | header label              | 0.25 | 0.03 | 0.50 | 0.05 | TICKET MACHINE
C-SCREEN  | screen                    | 0.10 | 0.08 | 0.80 | 0.42 | flat #0B2545, holds the screen lines below
C-CARD    | card reader               | 0.05 | 0.55 | 0.28 | 0.07 | #2B2F33 rounded rectangle with a thin horizontal black slot across its middle
L03       | label                     | 0.05 | 0.62 | 0.28 | 0.04 | Insert Card
C-COIN    | coin slot                 | 0.38 | 0.55 | 0.24 | 0.07 | #2B2F33 rounded rectangle with a short vertical black slot in the middle
L04       | label                     | 0.38 | 0.62 | 0.24 | 0.04 | Coins
C-NOTE    | note slot                 | 0.67 | 0.55 | 0.24 | 0.07 | #2B2F33 rounded rectangle with a wide horizontal black slot
L05       | label                     | 0.67 | 0.62 | 0.24 | 0.04 | Notes
C-CANCEL  | button                    | 0.05 | 0.74 | 0.22 | 0.06 | #C62828 rounded rectangle, no text
L06       | label                     | 0.05 | 0.80 | 0.22 | 0.04 | Cancel
C-CONFIRM | button                    | 0.29 | 0.74 | 0.22 | 0.06 | #2E7D32 rounded rectangle, no text
L07       | label                     | 0.29 | 0.80 | 0.22 | 0.04 | Confirm
C-HELP    | button                    | 0.53 | 0.74 | 0.22 | 0.06 | #1565C0 rounded rectangle, no text
L08       | label                     | 0.53 | 0.80 | 0.22 | 0.04 | Help
C-TRAY    | ticket tray               | 0.30 | 0.85 | 0.40 | 0.07 | #2B2F33 rounded rectangle with a #111111 inner opening
L09       | label                     | 0.30 | 0.92 | 0.40 | 0.04 | Ticket

Screen lines: white #FFFFFF text, weight 600, no plate, drawn over the screen. Line boxes are x 0.20, w 0.60, h 0.05, at y 0.10 (line 1), 0.17 (line 2), 0.24 (line 3) and 0.31 (line 4). Element ids S01-1, S01-2 and so on.
TM01-S01: Select Destination | Central Station | Airport | Harbour
TM01-S02: Single Journey | Return Journey | Day Pass
TM01-S03: Single Journey to Central Station | Total: 20 | Press Confirm
TM01-S04: Insert Card | Total: 20
TM01-S05: Printing | Please wait
TM01-S06: Collect your ticket | Thank you

2) CARD-EN, CARD-HI, CARD-KN: ten sign lines each
Panel background white #FFFFFF. Black #000000 text, left-aligned, weight 600 for English and normal weight for Hindi and Kannada. Line i (1 to 10) has the box x 0.08, w 0.84, h 0.06, y = 0.06 + (i - 1) * 0.09. Element ids CARD-EN-01 to CARD-EN-10, and the same for HI and KN.

CARD-EN:
1 Platform 2
2 Exit
3 Ticket Counter
4 Waiting Room
5 Drinking Water
6 Toilets
7 No Smoking
8 Emergency Exit
9 Lift to Platform 3
10 Please keep the station clean

CARD-HI:
1 प्लेटफॉर्म 2
2 निकास
3 टिकट काउंटर
4 प्रतीक्षालय
5 पीने का पानी
6 शौचालय
7 धूम्रपान निषेध
8 आपातकालीन निकास
9 प्लेटफॉर्म 3 के लिए लिफ्ट
10 कृपया स्टेशन साफ रखें

CARD-KN:
1 ಪ್ಲಾಟ್\u200Cಫಾರ್ಮ್ 2
2 ನಿರ್ಗಮನ
3 ಟಿಕೆಟ್ ಕೌಂಟರ್
4 ಕಾಯುವ ಕೊಠಡಿ
5 ಕುಡಿಯುವ ನೀರು
6 ಶೌಚಾಲಯ
7 ಧೂಮಪಾನ ನಿಷೇಧ
8 ತುರ್ತು ನಿರ್ಗಮನ
9 ಪ್ಲಾಟ್\u200Cಫಾರ್ಮ್ 3ಕ್ಕೆ ಲಿಫ್ಟ್
10 ದಯವಿಟ್ಟು ನಿಲ್ದಾಣವನ್ನು ಸ್ವಚ್ಛವಾಗಿಡಿ

3) BLANK
The whole panel flat grey #808080. Nothing else.

4) GRID: alignment check
White #FFFFFF panel with 35 black numbers, 1 to 35, weight 700, numbered row by row from the top left. Column centres at x = 0.10, 0.30, 0.50, 0.70, 0.90. Row centres at y = 0.07, 0.21, 0.36, 0.50, 0.64, 0.79, 0.93. Each number is centred in a box w 0.12, h 0.06 around its centre. Element ids G01 to G35. No lines or other marks.

NAVIGATION (no visible controls)
- Tap the right 20% of the screen, or swipe left: next scene. Tap the left 20%, or swipe right: previous scene. Stop at the first and last scene, with no wrap-around.
- Taps in the middle 60% do nothing.
- Three taps within 1 second inside a 100 x 100 CSS px square at the top-left corner of the screen open the menu.
- The menu is a full-screen overlay with one large button (at least 48 px tall) per scene id, plus "Measure" and "Close". Choosing a scene closes the menu and shows that scene. The menu and the Measure view are the only places where scene ids or other UI text may appear.

MEASURE VIEW (opened from the menu)
A white full-screen overlay with a scrollable monospace text block, a "Copy JSON" button and a "Close" button. The JSON contains:
- navigator.userAgent, screen.width, screen.height, window.devicePixelRatio, and the panel's size in CSS px and in device pixels;
- for every scene, its id and, for every text element, its element id, exact text and its box in panel fractions to 4 decimals. Measure the rendered text itself: wrap the text node in a DOM Range, call getBoundingClientRect, subtract the panel's top-left corner and divide by the panel's width and height. Render each scene into the panel in turn to measure it, then restore the scene that was showing.
"Copy JSON" uses navigator.clipboard.writeText. If that is refused, select the text so it can be copied by hand.

CODE SHAPE
- Keep all strings, colours and boxes in one const FIXTURE = { ... } object at the top of the script, so they are easy to edit and check.
- Plain HTML, CSS and JavaScript. No framework, no build step.
- First line of the file, as an HTML comment: OverlayKit test fixture TM-01 and test cards. First-party simulated ticket machine, not a real machine. Generated with <tool name and model> on <date>.

DELIVERABLE
Return the complete index.html in one code block. After it, list anything in these instructions you could not follow, and why.
````

## After the page is generated

1. Save it as `test-fixtures/tm-01/web/index.html`. Tell Kiro, which checks every string against this file, checks for network and storage APIs, and records the generator and date in `FIXTURE.md` §1.
2. Serve it to the iPad from the PC on the same Wi-Fi (for example `python -m http.server 8000` in that folder, run by Kiro). In Safari on the iPad open `http://<PC IP>:8000`, then Share → Add to Home Screen, and open it from the new icon so it runs full screen. The phone never opens this page.
3. iPad settings: brightness full, Auto-Lock never, Do Not Disturb on, True Tone and Night Shift off.
4. Open the menu, run Measure on the iPad, and send Kiro the JSON. It replaces the DRAFT boxes in `FIXTURE.md` (task 1.3).
5. Look at every scene for wrong or missing glyphs, especially the Hindi and Kannada cards. Record the check as unreviewed (D-031).
