/**
 * ThemeScript — Server Component
 *
 * Injetado no <head> do layout raiz.
 * Executa ANTES do React hidratar, evitando flash de tema errado (FOUC).
 *
 * Estratégia de isolamento:
 * - Aplica classe `theme-dark` / `theme-light` no <html>
 * - O CSS dark mode usa o seletor `html.theme-dark .app-shell { ... }`
 *   garantindo que a landing page (sem .app-shell) NUNCA seja afetada.
 */
export default function ThemeScript() {
  const script = `
(function(){
  try{
    var t=localStorage.getItem('edacademy_theme');
    var p=t||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
    document.documentElement.classList.add('theme-'+p);
  }catch(e){}
})();
`
  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  )
}
