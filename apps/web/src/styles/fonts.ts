// The font files worth fetching before the stylesheet asks for them: the three serif cuts
// (roman, bold and italic: masthead, headlines, body and the italic deck are all on a first
// screen). The agate comes after the first paint (the script at the foot of this file). See
// fonts.css. `pnpm perf:budget` holds this list to 70 KB and three files on every page type
// (it is 69.0 KB).
import serifRoman from "./fonts/newsreader-latin-400-normal.woff2?url";
import serifBold from "./fonts/newsreader-latin-700-normal.woff2?url";
import serifItalic from "./fonts/newsreader-latin-400-italic.woff2?url";
import agate from "./fonts/ibm-plex-sans-condensed-latin-600-normal.woff2?url";
import agateExt from "./fonts/ibm-plex-sans-condensed-latin-ext-600-normal.woff2?url";

export const fontPreloads = [serifRoman, serifBold, serifItalic].map((href) => ({
  rel: "preload",
  as: "font",
  type: "font/woff2",
  href,
  // Fonts are fetched in CORS mode even from the same origin; without this the preload
  // is not reused.
  crossOrigin: "anonymous" as const,
}));

// The agate (nav, labels, kickers, captions), which the preload budget has no room for. It
// has no @font-face rule: the script below, which the document carries inline
// (routes/__root.tsx), loads it and adds it to the page.

// The unicode-range of each subset, as in fonts.css.
const LATIN =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT =
  "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";

/** The Latin file first: that one is fetched, the other only if a page needs it. */
const lateFaces = [
  [agate, "normal", "600", LATIN],
  [agateExt, "normal", "600", LATIN_EXT],
];

/** Where the script notes that this build's file is in the browser's cache. */
export const LATE_FONTS_KEY = "fonts";

/**
 * Text never changes face while a reader can see it, so the agate is added only when nothing
 * it would redraw has been shown: before the first frame, or when no agate text is at or
 * above the bottom of the window (the skip link, parked above the top of the page, is not). Otherwise the page keeps what it drew (the fallback face in
 * fonts.css) until the next full load. The nav is agate and at the top of every page, so in
 * practice a first visit reads its labels in the fallback and every later one in the agate.
 *
 * And it joins only a page drawn in the web roman. The roman is `optional`: if it missed the
 * first paint the page is in the fallback faces for the visit and the agate stays out of it.
 * `roman()` asks the layout which face it uses, and the answer is not settled while the roman
 * is on its way, so the script waits for the roman, as it does for its own file, before it
 * asks.
 *
 * On a first visit the file is fetched after the load event, out of the way of what the first
 * paint needs. That is usually after the first frame, but not always: on a quick connection the
 * load event and the file can come before the browser has run one, and then the face is in
 * it (seen in CI, Chromium, a local server; e2e/first-load.spec.ts allows it). Once
 * it is cached (noted in localStorage, by file name, so a new build starts over) it is
 * asked for at once, and so is the roman's Latin face (`rf`; its file is preloaded). No browser
 * holds the first frame for any of this. Measured in CI (PR #32, when the late faces were a
 * serif italic and semibold; the script is the same):
 * - Chromium has every file from the cache before the first frame on an ordinary load, and the
 *   late faces are in that frame.
 * - WebKit runs its first frame while the roman is still on its way (it leaves that text blank
 *   until it has the face), so there the question is asked after it: a page with such text on
 *   its first screen keeps the fallback, one without gets the faces.
 * - With the roman held back and the script not asking, Chromium drew the late faces beside the
 *   fallback roman: e2e/first-load.spec.ts holds that case.
 * - `document.fonts.ready` and `document.fonts.load()` are no use for the wait: the first
 *   comes after the first frame even when every file was there before it, the second long
 *   after it in WebKit. Nor is a later "first frame" for WebKit (the first that finds the
 *   roman's face settled): the late text was seen to change on screen.
 * (The file is `optional` only when cached: WebKit gives up on such a face unless it is
 * there at once, and if it does the note is dropped and the next load starts over.)
 *
 * A known, accepted exception, for WebKit alone (`wk`): a cached file that is there before the
 * first frame is added to it without waiting for the roman or asking about it, because waiting
 * would cost every cached Safari visit the real agate. The price is that a cached roman which
 * misses its own block period leaves the agate beside the fallback roman for that visit: rare,
 * nothing changes on screen, and not seen in WebKit. After the first frame WebKit follows the
 * rule above like every other engine. `navigator.vendor` is "Apple Computer, Inc." in every
 * WebKit port, "Google Inc." in Chromium and empty in Firefox.
 */
export const lateFontsScript = `(function(F){
if(!window.FontFace||!document.fonts)return;
var family="IBM Plex Sans Condensed",serif="Newsreader",key=F[0][0],warm=false,framed=false,rf,wk=/Apple/.test(navigator.vendor);
try{warm=localStorage.getItem("${LATE_FONTS_KEY}")===key}catch(e){}
var faces=F.map(function(f,i){return new FontFace(family,'url("'+f[0]+'") format("woff2")',{style:f[1],weight:f[2],unicodeRange:f[3],display:warm||i?"optional":"swap"})});
requestAnimationFrame(function(){framed=true});
function roman(){
var s=document.createElement("span");
s.style.cssText="position:absolute;visibility:hidden;white-space:nowrap;font:100px monospace";
s.textContent="The quick brown fox";
document.body.appendChild(s);
var a=s.offsetWidth;s.style.fontFamily='"'+serif+'",monospace';var b=s.offsetWidth;
s.remove();return a!==b}
function seen(){
var all=document.body.getElementsByTagName("*");
for(var i=0;i<all.length;i++){var el=all[i],text=false;
for(var n=el.firstChild;n&&!text;n=n.nextSibling)text=n.nodeType===3&&/\\S/.test(n.data);
if(!text)continue;
var s=getComputedStyle(el);
if(s.fontFamily.indexOf(family)<0)continue;
var r=el.getBoundingClientRect();
if(r.width&&r.top<innerHeight&&r.bottom+scrollY>0)return true}
return false}
function go(){
var R=document.fonts.ready;
if(warm){
document.fonts.forEach(function(f){if(f.family.replace(/["']/g,"")===serif&&f.style==="normal"&&f.weight==="400"&&/^U\\+0+-/i.test(f.unicodeRange))rf=f});
if(rf)R=rf.load().then(0,function(){})}
function add(){faces.forEach(function(f){document.fonts.add(f)})}
faces[0].load().then(function(){
try{localStorage.setItem("${LATE_FONTS_KEY}",key)}catch(e){}
if(wk&&warm&&!framed)add();
else R.then(function(){if(roman()&&!(framed&&seen()))add()})},function(){try{localStorage.removeItem("${LATE_FONTS_KEY}")}catch(e){}})}
if(warm)go();else if(document.readyState==="complete")setTimeout(go);else addEventListener("load",function(){setTimeout(go)})
}(${JSON.stringify(lateFaces)}))`;
