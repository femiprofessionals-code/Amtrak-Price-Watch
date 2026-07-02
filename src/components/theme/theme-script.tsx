/**
 * Inline script that applies the saved (or system) theme before first paint
 * to prevent a flash of the wrong theme.
 */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
