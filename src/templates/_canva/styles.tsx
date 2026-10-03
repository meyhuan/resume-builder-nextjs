export function ReferenceStyles() {
  return <style>{`
    .canva-template-root { --canva-accent: #334155; background: white; }
    .canva-page { box-sizing: border-box; position: relative; }
    .canva-page *, .canva-page *::before, .canva-page *::after { box-sizing: border-box; }
    .canva-page h1, .canva-page h2, .canva-page p { margin-top: 0; }
    .canva-page h1, .canva-page h2, .canva-page h3 { break-after: avoid; }
    .canva-page .canva-rich p { margin: 0; }
    .canva-page .canva-rich ul, .canva-page .canva-rich ol { margin: 0; padding-left: 1.3em; }
    .canva-page .canva-rich li { margin: .08em 0; }
    .canva-page .canva-rich, .canva-page .canva-base-fields { overflow-wrap: anywhere; }
    .canva-page .canva-rich a { text-decoration: underline; }
    .canva-page .canva-heading-label { position: relative; }
    .canva-page .canva-heading-line { flex: 1 1 25px; }
    .canva-page .canva-heading-dotted .canva-heading-line,
    .canva-page .canva-heading-plane .canva-heading-line,
    .canva-page .canva-heading-folded .canva-heading-line,
    .canva-page .canva-heading-triangle .canva-heading-line { border-top: 1px dotted var(--canva-accent); }
    .canva-page .canva-heading-ruled { border-bottom: 1px solid var(--canva-accent); padding-bottom: 5px; }
    .canva-page .canva-heading-ruled .canva-heading-english { margin-left: auto; order: 3; }
    .canva-page .canva-heading-ruled .canva-heading-line { display: none; }
    .canva-page .canva-heading-hexagon .canva-heading-icon { border: 1px solid var(--canva-accent); border-radius: 6px; transform: rotate(30deg); padding: 4px; }
    .canva-page .canva-heading-hexagon .canva-heading-icon svg { transform: rotate(-30deg); }
    .canva-page .canva-heading-icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .canva-page .canva-heading-square,
    .canva-page .canva-heading-solid-icon { border-bottom: 1px solid #777; padding-bottom: 4px; }
    .canva-page .canva-heading-square .canva-heading-icon { background: var(--canva-soft); padding: 3px; }
    .canva-page .canva-heading-solid-icon .canva-heading-icon { background: var(--canva-accent); color: var(--canva-on-accent); padding: 5px; border-radius: 5px; }
    .canva-page .canva-heading-pill .canva-heading-label { background: var(--canva-accent); color: var(--canva-on-accent); border-radius: 30px; padding: 3px 17px; }
    .canva-page .canva-heading-pill .canva-heading-line { border-top: 1px solid var(--canva-accent); }
    .canva-page .canva-heading-pill.canva-heading-dark .canva-heading-label { background: var(--canva-soft); color: #172b3d; }
    .canva-page .canva-heading-folded .canva-heading-label { background: var(--canva-accent); color: var(--canva-on-accent); padding: 5px 18px 5px 10px; clip-path: polygon(0 0, 100% 0, 94% 100%, 0 100%); }
    .canva-page .canva-heading-slant { background: #eee; }
    .canva-page .canva-heading-slant .canva-heading-label { background: var(--canva-accent); color: var(--canva-on-accent); padding: 4px 26px 4px 10px; clip-path: polygon(0 0, 100% 0, calc(100% - 15px) 100%, 0 100%); }
    .canva-page .canva-heading-plane .canva-heading-icon { background: var(--canva-accent); color: var(--canva-on-accent); width: 27px; height: 27px; border-radius: 50%; }
    .canva-page .canva-heading-flag .canva-heading-label { background: var(--canva-accent); color: var(--canva-on-accent); padding: 4px 22px 4px 12px; clip-path: polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%); }
    .canva-page .canva-heading-flag .canva-heading-line { border-top: 1px solid var(--canva-accent); }
    .canva-page .canva-heading-bubble { background: var(--canva-soft); border-radius: 25px; padding: 3px 8px; color: #183945; }
    .canva-page .canva-heading-bubble .canva-heading-icon { background: var(--canva-accent); color: var(--canva-on-accent); width: 29px; height: 29px; border-radius: 50%; position: relative; }
    .canva-page .canva-heading-bubble .canva-heading-icon:after { content: ''; position: absolute; bottom: 1px; right: -2px; border: 5px solid transparent; border-bottom-color: var(--canva-accent); transform: rotate(30deg); }
    .canva-page .canva-heading-tape .canva-heading-label { color: #282d34; padding: 4px 20px; clip-path: polygon(2% 0, 98% 2%, 100% 94%, 0 100%); }
    .canva-page .canva-heading-tape .canva-heading-english { display: none; }
    .canva-page .canva-heading-tab { border-bottom: 1px solid var(--canva-accent); gap: 16px !important; }
    .canva-page .canva-heading-tab .canva-heading-label { background: var(--canva-accent); color: var(--canva-on-accent); padding: 4px 20px 4px 12px; clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 100%, 0 100%); }
    .canva-page .canva-heading-triangle .canva-heading-marker { width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-left: 10px solid var(--canva-accent); }
    .canva-page .canva-heading-outline-icon .canva-heading-icon { border: 1px solid #666; border-radius: 4px; padding: 4px; }
    .canva-page .canva-heading-two-tone { background: var(--canva-soft); }
    .canva-page .canva-heading-two-tone .canva-heading-label { background: var(--canva-accent); color: var(--canva-on-accent); padding: 5px 13px; }
    .canva-page .canva-heading-capsule .canva-heading-icon { background: var(--canva-accent); color: var(--canva-on-accent); width: 26px; height: 26px; border-radius: 50%; }
    .canva-page .canva-heading-capsule .canva-heading-label { background: var(--canva-accent); color: var(--canva-on-accent); padding: 3px 18px; border-radius: 30px; }
    .canva-page .canva-heading-capsule .canva-heading-line { border-top: 1px solid var(--canva-accent); position: relative; }
    .canva-page .canva-heading-capsule .canva-heading-line:after { content: ''; position: absolute; right: 0; top: -3px; width: 5px; height: 5px; background: var(--canva-accent); border-radius: 50%; }
    .canva-page .canva-heading-flat { background: #eee; padding: 4px 10px; color: #252525; border-bottom: 1px solid var(--canva-accent); }
    .canva-page .canva-heading-flat .canva-heading-english { margin-left: auto; order: 3; }
    .canva-page .canva-heading-caps-rule { border-bottom: 1px solid #999; letter-spacing: .12em; padding-bottom: 7px; }
    .canva-page .canva-heading-caps-rule .canva-heading-label:after { content: ''; position: absolute; left: 0; right: 0; bottom: -8px; border-bottom: 3px solid currentColor; }
    .canva-page .canva-heading-rounded-bar { background: var(--canva-accent); color: var(--canva-on-accent); border-radius: 25px; padding: 4px 15px; }
    .canva-page .canva-heading-rounded-bar .canva-heading-english { color: inherit !important; margin-left: auto; order: 3; }
    .canva-page .canva-heading-arrow { background: #eee; padding: 5px 24px 5px 10px; clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%); }
    .canva-page .canva-heading-arrow .canva-heading-icon { color: var(--canva-accent); }
    .canva-page .canva-heading-bullet .canva-heading-marker { width: 6px; height: 6px; border-radius: 50%; background: var(--canva-accent); }
    .canva-page .canva-heading-thin { border-bottom: 1px solid #9ca3af; padding-bottom: 2px; min-height: 24px !important; }
    .canva-page .canva-heading-thin .canva-heading-english { display: none; }
    .canva-page .canva-heading-dark.canva-heading-flat { background: #666; color: white; }
    .canva-page .canva-masthead { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 20px; margin-bottom: 20px; break-inside: avoid; }
    .canva-page .canva-masthead-cn { font-size: 2.2em; font-weight: 800; line-height: 1.3; }
    .canva-page .canva-masthead-en { font-size: .9em; letter-spacing: .1em; }
    .canva-page .canva-dots { display: inline-flex; gap: 8px; }
    .canva-page .canva-dots i { width: 16px; height: 16px; border: 2px solid #777; border-radius: 50%; }
    .canva-page .canva-dots-solid i { width: 9px; height: 9px; background: #777; border: 0; }
    .canva-page .canva-segmented { justify-content: flex-start; gap: 8px 12px; }
    .canva-page .canva-segmented-band { width: 100%; height: 14px; background: #ede7dc; position: relative; }
    .canva-page .canva-segmented-band span { display: block; width: 56%; height: 100%; background: var(--canva-accent); clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 100%, 0 100%); }
    .canva-page .canva-photo-tape { position: absolute; top: -10px; left: 28%; width: 48%; height: 22px; background: #d9cba9d9; transform: rotate(4deg); }
    .canva-page .canva-notched { text-align: center; background: var(--canva-accent); color: var(--canva-on-accent); letter-spacing: .1em; padding: 10px 24px; clip-path: polygon(0 0, 100% 0, calc(100% - 16px) 100%, 16px 100%); margin-bottom: 22px; }
    .canva-page .canva-rail { position: relative; min-width: 0; }
    .canva-page .canva-main { min-width: 0; }
    .canva-page .canva-date-track-header { display: grid; grid-template-columns: 9.5em minmax(0, 1fr); gap: 0 1em; margin-bottom: 4px; }
    .canva-page .canva-date-track-header > div:first-child { grid-column: 2; grid-row: 1; }
    .canva-page .canva-date-track-date { grid-column: 1; grid-row: 1; font-weight: 700; min-width: 0; }
    .canva-page .canva-date-track-block:has(.canva-date-track-header) > div:last-child { margin-left: 10.5em; }
    .canva-page .canva-ledger-header { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto; gap: 4px 12px; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; margin-bottom: 5px; }
    .canva-page .canva-ledger-header > div:first-child, .canva-page .canva-ledger-header h3 { display: contents; }
    .canva-page .canva-ledger-header h3 > span:first-child { grid-column: 1; grid-row: 1; min-width: 0; }
    .canva-page .canva-ledger-header h3 > span:last-child:not(:first-child) { grid-column: 2; grid-row: 1; min-width: 0; }
    .canva-page .canva-ledger-header h3 > span.mx-1 { display: none; }
    .canva-page .canva-ledger-date { grid-column: 3; grid-row: 1; }
    .canva-page .canva-column-grid { display: grid; align-items: start; }
    .canva-page .canva-dark-rail { background: var(--canva-accent); color: var(--canva-on-accent); }
    .canva-page .canva-dark-rail .canva-rich { color: var(--canva-on-accent) !important; }
    .canva-page.canva-beige-circles:before,
    .canva-page.canva-beige-circles:after { content: ''; position: absolute; width: 180px; height: 180px; background: #f3eadc; border-radius: 50%; pointer-events: none; }
    .canva-page.canva-beige-circles:before { top: 0; right: 0; clip-path: inset(0 0 35% 40%); }
    .canva-page.canva-beige-circles:after { bottom: 0; left: 0; clip-path: inset(45% 35% 0 0); }
    .canva-page .canva-column-grid, .canva-page .canva-header { position: relative; }
    @media print {
      .canva-template-root, .canva-page { min-height: 0 !important; overflow: visible !important; }
      .canva-page { padding-top: 0 !important; padding-bottom: 0 !important; }
      /* Outlines repeat across printed fragments and can paint over a continuation
         line. A sliced in-flow border reserves space only at the real ends. */
      .canva-page.canva-outer-frame {
        outline: none !important;
        border: 6px solid var(--canva-accent);
        box-decoration-break: slice;
        -webkit-box-decoration-break: slice;
      }
      .canva-section { break-inside: auto; }
      .canva-heading { break-inside: avoid; break-after: avoid; }
      .canva-header { break-inside: avoid; }
      .canva-page .canva-column-grid { display: block !important; min-height: 0 !important; }
      .canva-page .canva-rail { height: auto !important; }
      .canva-page .canva-column-grid:after { content: ''; display: block; clear: both; }
      .canva-page .canva-column-grid > .canva-physical-left { float: left; width: var(--canva-left-width); }
      .canva-page .canva-column-grid > .canva-physical-right { float: right; width: var(--canva-right-width); }
    }
  `}</style>
}
