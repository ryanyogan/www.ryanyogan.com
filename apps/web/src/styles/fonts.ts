// The font files worth fetching before the stylesheet asks for them: the interface face
// (header, headings, labels) and the body roman. The body semibold and italic come after the
// first paint (the script at the foot of this file). See fonts.css. `pnpm perf:budget` holds
// this list to 70 KB and three files on every page type (it is 53.5 KB).
import hankenRoman from "./fonts/hanken-grotesk-latin-wght-normal.woff2?url";
import sourceSerifRoman from "./fonts/source-serif-4-latin-400-normal.woff2?url";
import serifItalic from "./fonts/source-serif-4-latin-400-italic.woff2?url";
import serifItalicExt from "./fonts/source-serif-4-latin-ext-400-italic.woff2?url";
import serifSemibold from "./fonts/source-serif-4-latin-600-normal.woff2?url";
import serifSemiboldExt from "./fonts/source-serif-4-latin-ext-600-normal.woff2?url";

export const fontPreloads = [hankenRoman, sourceSerifRoman].map((href) => ({
  rel: "preload",
  as: "font",
  type: "font/woff2",
  href,
  // Fonts are fetched in CORS mode even from the same origin; without this the preload
  // is not reused.
  crossOrigin: "anonymous" as const,
}));

// The body semibold and italic, which no first screen uses (e2e/reload.spec.ts holds that) and
// the preload budget has no room for. They have no @font-face rule: the script below, which
// the document carries inline (routes/__root.tsx), loads them and adds them to the page.

// The unicode-range of each subset, as in fonts.css.
const LATIN =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT =
  "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";

/** The two Latin files first: those are fetched, the other two only if a page needs them. */
const lateFaces = [
  [serifItalic, "italic", "400", LATIN],
  [serifSemibold, "normal", "600", LATIN],
  [serifItalicExt, "italic", "400", LATIN_EXT],
  [serifSemiboldExt, "normal", "600", LATIN_EXT],
];

/** Where the script notes that this build's two files are in the browser's cache. */
export const LATE_FONTS_KEY = "fonts";

/**
 * Text never changes face while a reader can see it, so these faces are added only when
 * nothing they would redraw has been shown: before the first frame, or when no serif italic
 * or semibold text is at or above the bottom of the window. Otherwise the page keeps what it
 * drew (the roman, slanted or thickened by the browser) until the next full load.
 *
 * And they join only a page drawn in the web roman. The roman is `optional`: if it missed the
 * first paint the page is in the fallback face for the visit and these stay out of it.
 * `roman()` asks the layout which face it uses, and the answer is not settled while the roman
 * is on its way, so the script waits for the roman, as it does for its own two files, before
 * it asks.
 *
 * On a first visit the files are fetched after the load event, clear of the first paint. Once
 * they are cached (noted in localStorage, by file name, so a new build starts over) they are
 * asked for at once, and so is the roman's Latin face (`rf`; its file is preloaded). No browser
 * holds the first frame for any of this. Measured in CI (PR #32):
 * - Chromium has all three from the cache before the first frame on an ordinary load, and the
 *   italic and semibold are in that frame.
 * - WebKit runs its first frame while the roman is still on its way (it leaves that text blank
 *   until it has the face), so there the question is asked after it: a page with such text on
 *   its first screen keeps the browser's slant and weight, one without gets the faces.
 * - With the roman held back and the script not asking, Chromium drew all four beside the
 *   fallback roman: e2e/first-load.spec.ts holds that case.
 * - `document.fonts.ready` and `document.fonts.load()` are no use for the wait: the first
 *   comes after the first frame even when every file was there before it, the second long
 *   after it in WebKit. Nor is a later "first frame" for WebKit (the first that finds the
 *   roman's face settled): the semibold was seen to change on screen.
 * (The two files are `optional` only when cached: WebKit gives up on such a face unless it is
 * there at once, and if it does the note is dropped and the next load starts over.)
 */
export const lateFontsScript = `(function(F){
if(!window.FontFace||!document.fonts)return;
var family="Source Serif 4",key=F[0][0]+F[1][0],warm=false,framed=false,rf;
try{warm=localStorage.getItem("${LATE_FONTS_KEY}")===key}catch(e){}
var faces=F.map(function(f,i){return new FontFace(family,'url("'+f[0]+'") format("woff2")',{style:f[1],weight:f[2],unicodeRange:f[3],display:warm||i>1?"optional":"swap"})});
requestAnimationFrame(function(){framed=true});
function roman(){
var s=document.createElement("span");
s.style.cssText="position:absolute;visibility:hidden;white-space:nowrap;font:100px monospace";
s.textContent="The quick brown fox";
document.body.appendChild(s);
var a=s.offsetWidth;s.style.fontFamily='"'+family+'",monospace';var b=s.offsetWidth;
s.remove();return a!==b}
function seen(){
var all=document.body.getElementsByTagName("*");
for(var i=0;i<all.length;i++){var el=all[i],text=false;
for(var n=el.firstChild;n&&!text;n=n.nextSibling)text=n.nodeType===3&&/\\S/.test(n.data);
if(!text)continue;
var s=getComputedStyle(el);
if(s.fontFamily.indexOf(family)<0||(s.fontStyle!=="italic"&&s.fontWeight<600))continue;
var r=el.getBoundingClientRect();
if(r.width&&r.top<innerHeight)return true}
return false}
function go(){
var R=document.fonts.ready;
if(warm){
document.fonts.forEach(function(f){if(f.family.replace(/["']/g,"")===family&&/^U\\+0+-/i.test(f.unicodeRange))rf=f});
if(rf)R=rf.load().then(0,function(){})}
Promise.all([faces[0].load(),faces[1].load(),R]).then(function(){
try{localStorage.setItem("${LATE_FONTS_KEY}",key)}catch(e){}
if(!roman()||(framed&&seen()))return;
faces.forEach(function(f){document.fonts.add(f)})},function(){try{localStorage.removeItem("${LATE_FONTS_KEY}")}catch(e){}})}
if(warm)go();else if(document.readyState==="complete")setTimeout(go);else addEventListener("load",function(){setTimeout(go)})
}(${JSON.stringify(lateFaces)}))`;
