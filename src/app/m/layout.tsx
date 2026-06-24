import { type ReactElement, type ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import MobileDebugTools from './_components/mobile-debug-tools'
import WechatJssdkLoader from './_components/wechat-jssdk-loader'
import MobilePageTransition from './_components/mobile-page-transition'

const MOBILE_DIAGNOSTICS_SCRIPT = `
(function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get('diag') !== '1') return;

  var state = window.__AIJIANLI_M_DIAG = {
    startedAt: Date.now(),
    reactHydrated: false,
    events: [],
    errors: [],
    snapshots: []
  };

  function safeText(value) {
    return String(value == null ? '' : value).replace(/\\s+/g, ' ').slice(0, 140);
  }

  function describeElement(element) {
    if (!element) return 'null';
    var id = element.id ? '#' + element.id : '';
    var className = typeof element.className === 'string'
      ? '.' + element.className.trim().replace(/\\s+/g, '.')
      : '';
    var text = element.innerText ? ' "' + safeText(element.innerText).slice(0, 32) + '"' : '';
    return element.tagName.toLowerCase() + id + className + text;
  }

  function styleInfo(element) {
    if (!element || !window.getComputedStyle) return {};
    var style = window.getComputedStyle(element);
    return {
      pointerEvents: style.pointerEvents,
      position: style.position,
      zIndex: style.zIndex,
      opacity: style.opacity
    };
  }

  function rectInfo(element) {
    if (!element || !element.getBoundingClientRect) return null;
    var rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      w: Math.round(rect.width),
      h: Math.round(rect.height)
    };
  }

  function elementStackAt(x, y) {
    if (!document.elementsFromPoint) return [];
    return document.elementsFromPoint(x, y).slice(0, 8).map(function (element) {
      return {
        element: describeElement(element),
        style: styleInfo(element),
        rect: rectInfo(element)
      };
    });
  }

  function getConnectionInfo() {
    var connection = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
    if (!connection) return null;
    return {
      effectiveType: connection.effectiveType || '',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      saveData: Boolean(connection.saveData)
    };
  }

  function getStorageFlags() {
    function read(storage, key) {
      try {
        return storage.getItem(key) || '';
      } catch (error) {
        return 'unavailable';
      }
    }
    return {
      sessionMini: read(window.sessionStorage, 'aijianli_in_mini_program'),
      sessionMiniVersion: read(window.sessionStorage, 'aijianli_mini_version'),
      mobileDebug: read(window.localStorage, 'mobile_debug'),
      hydrationReloadReason: read(window.sessionStorage, 'aijianli_m_hydration_reload_reason')
    };
  }

  function shortUrl(value) {
    var text = safeText(value);
    var idx = text.indexOf('/_next/');
    return idx >= 0 ? text.slice(idx) : text.slice(-120);
  }

  function getScriptInfo() {
    return Array.prototype.slice.call(document.scripts).map(function (script) {
      return {
        src: script.src ? shortUrl(script.src) : 'inline',
        type: script.type || '',
        async: Boolean(script.async),
        defer: Boolean(script.defer),
        dataset: script.dataset ? Object.assign({}, script.dataset) : {}
      };
    }).filter(function (item) {
      return item.src === 'inline'
        || item.src.indexOf('/_next/') !== -1
        || item.src.indexOf('jweixin') !== -1;
    }).slice(-40);
  }

  function getResourceInfo() {
    if (!performance || !performance.getEntriesByType) return [];
    return performance.getEntriesByType('resource').filter(function (entry) {
      return entry.name.indexOf('/_next/static/') !== -1
        || entry.name.indexOf('jweixin') !== -1;
    }).slice(-50).map(function (entry) {
      return {
        name: shortUrl(entry.name),
        initiatorType: entry.initiatorType || '',
        duration: Math.round(entry.duration || 0),
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        decodedBodySize: entry.decodedBodySize || 0,
        responseStatus: entry.responseStatus || 0
      };
    });
  }

  function collectSnapshot(label) {
    var doc = document.documentElement;
    var visual = window.visualViewport;
    var metaViewport = document.querySelector('meta[name="viewport"]');
    var snapshot = {
      label: label,
      t: Date.now() - state.startedAt,
      readyState: document.readyState,
      visibilityState: document.visibilityState,
      hidden: document.hidden,
      online: navigator.onLine,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      url: window.location.href,
      referrer: document.referrer,
      viewport: {
        inner: window.innerWidth + 'x' + window.innerHeight,
        client: doc.clientWidth + 'x' + doc.clientHeight,
        screen: window.screen.width + 'x' + window.screen.height,
        devicePixelRatio: window.devicePixelRatio || 1,
        visual: visual ? Math.round(visual.width) + 'x' + Math.round(visual.height) + '@' + Math.round(visual.offsetTop) : ''
      },
      scroll: {
        x: Math.round(window.scrollX || doc.scrollLeft || 0),
        y: Math.round(window.scrollY || doc.scrollTop || 0)
      },
      wxEnvironment: window.__wxjs_environment || '',
      hasWxMiniProgram: Boolean(window.wx && window.wx.miniProgram),
      metaViewport: metaViewport ? metaViewport.getAttribute('content') : '',
      htmlStyle: styleInfo(document.documentElement),
      bodyStyle: styleInfo(document.body),
      connection: getConnectionInfo(),
      storageFlags: getStorageFlags(),
      scripts: getScriptInfo(),
      resources: getResourceInfo()
    };
    state.snapshots.push(snapshot);
    trimList(state.snapshots);
    return snapshot;
  }

  function getPoint(event) {
    var touch = event.touches && event.touches[0] || event.changedTouches && event.changedTouches[0];
    return {
      x: Math.round((touch ? touch.clientX : event.clientX) || 0),
      y: Math.round((touch ? touch.clientY : event.clientY) || 0)
    };
  }

  function trimList(list) {
    while (list.length > 20) list.shift();
  }

  function updatePanel() {
    var panel = document.getElementById('aijianli-diag-panel');
    if (!panel) return;
    var last = state.events[state.events.length - 1];
    var summary = [
      'diag=1',
      'react: ' + (state.reactHydrated ? 'hydrated' : 'not-hydrated'),
      'wxenv: ' + safeText(window.__wxjs_environment || ''),
      'wxmp: ' + Boolean(window.wx && window.wx.miniProgram),
      'ready: ' + document.readyState + ' / ' + document.visibilityState,
      'last: ' + (last ? last.type + ' ' + last.x + ',' + last.y : '-'),
      'hit: ' + (last ? last.hit : '-'),
      'closest: ' + (last ? last.closest : '-'),
      'errors: ' + state.errors.length
    ].join('\\n');
    panel.querySelector('[data-diag-body]').textContent = summary;
  }

  function record(type, detail) {
    var item = Object.assign({
      type: type,
      t: Date.now() - state.startedAt,
      path: window.location.pathname + window.location.search,
      hydrated: state.reactHydrated,
      viewport: window.innerWidth + 'x' + window.innerHeight,
      visualViewport: window.visualViewport ? Math.round(window.visualViewport.width) + 'x' + Math.round(window.visualViewport.height) : '',
      scrollY: Math.round(window.scrollY || document.documentElement.scrollTop || 0),
      readyState: document.readyState
    }, detail || {});
    if (type === 'error') {
      state.errors.push(item);
      trimList(state.errors);
    } else {
      state.events.push(item);
      trimList(state.events);
    }
    console.log('[aijianli diag]', item);
    updatePanel();
  }

  function handleInput(event) {
    var point = getPoint(event);
    var hit = document.elementFromPoint(point.x, point.y);
    var target = event.target;
    var closest = target && target.closest
      ? target.closest('a,button,input,textarea,select,[role="button"],[data-clickable]')
      : null;
    record(event.type, {
      x: point.x,
      y: point.y,
      cancelable: Boolean(event.cancelable),
      defaultPrevented: Boolean(event.defaultPrevented),
      isTrusted: Boolean(event.isTrusted),
      eventPhase: event.eventPhase,
      target: describeElement(target),
      hit: describeElement(hit),
      closest: describeElement(closest),
      targetStyle: styleInfo(target),
      hitStyle: styleInfo(hit),
      targetRect: rectInfo(target),
      hitRect: rectInfo(hit),
      closestRect: rectInfo(closest),
      elementStack: elementStackAt(point.x, point.y)
    });
    if (event.type === 'click') {
      window.setTimeout(function () {
        record('click-after', {
          x: point.x,
          y: point.y,
          defaultPrevented: Boolean(event.defaultPrevented),
          activeElement: describeElement(document.activeElement),
          location: window.location.href
        });
      }, 0);
    }
  }

  ['touchstart', 'pointerdown', 'click'].forEach(function (type) {
    window.addEventListener(type, handleInput, true);
  });

  window.addEventListener('aijianli:react-hydrated', function () {
    state.reactHydrated = true;
    record('react-hydrated', {});
  });

  window.addEventListener('error', function (event) {
    var source = event.filename || (event.target && (event.target.src || event.target.href)) || '';
    record('error', {
      message: safeText(event.message || 'resource error'),
      source: safeText(source),
      line: event.lineno || 0,
      column: event.colno || 0
    });
  }, true);

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    record('error', {
      message: safeText(reason && (reason.stack || reason.message) || reason || 'unhandled rejection'),
      source: 'unhandledrejection'
    });
  });

  function copyDiagnostics() {
    var latestSnapshot = collectSnapshot('copy');
    var payload = JSON.stringify({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      url: window.location.href,
      reactHydrated: state.reactHydrated,
      wxEnvironment: window.__wxjs_environment || '',
      hasWxMiniProgram: Boolean(window.wx && window.wx.miniProgram),
      snapshot: latestSnapshot,
      snapshots: state.snapshots,
      events: state.events,
      errors: state.errors
    }, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload).then(function () {
        record('diag-copy-ok', {});
      }).catch(function () {
        window.prompt('Copy diagnostics', payload);
      });
    } else {
      window.prompt('Copy diagnostics', payload);
    }
  }

  function createPanel() {
    if (document.getElementById('aijianli-diag-panel')) return;
    var panel = document.createElement('div');
    panel.id = 'aijianli-diag-panel';
    panel.style.cssText = [
      'position:fixed',
      'left:8px',
      'right:8px',
      'bottom:calc(env(safe-area-inset-bottom,0px) + 8px)',
      'z-index:2147483647',
      'background:rgba(15,23,42,.92)',
      'color:#fff',
      'font:12px/1.45 -apple-system,BlinkMacSystemFont,sans-serif',
      'border-radius:10px',
      'padding:8px',
      'box-shadow:0 8px 24px rgba(0,0,0,.25)',
      'white-space:pre-wrap'
    ].join(';');
    panel.innerHTML = '<div data-diag-body>diag loading...</div><div style="display:flex;gap:6px;margin-top:6px"><button data-native-test style="flex:1;height:30px;border:0;border-radius:7px;background:#7c3aed;color:white">native tap</button><button data-copy style="flex:1;height:30px;border:0;border-radius:7px;background:#334155;color:white">copy</button></div>';
    document.body.appendChild(panel);
    panel.querySelector('[data-native-test]').onclick = function (event) {
      event.stopPropagation();
      record('native-button-click', {
        x: 0,
        y: 0,
        target: 'diag native button',
        hit: 'diag native button',
        closest: 'button',
        snapshot: collectSnapshot('native-button-click')
      });
    };
    panel.querySelector('[data-copy]').onclick = function (event) {
      event.stopPropagation();
      copyDiagnostics();
    };
    updatePanel();
    collectSnapshot('panel-created');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createPanel);
  } else {
    createPanel();
  }
})();
`;

export const metadata: Metadata = {
  title: {
    default: '智简简历',
    template: '%s',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

/**
 * Root layout for all mobile (/m/*) pages. Ships the on-device debug panel
 * (vConsole) conditionally; see MobileDebugTools for activation rules.
 * Also injects WeChat JSSDK so wx.miniProgram API is available in webview.
 */
export default function MobileRootLayout(
  { children }: { readonly children: ReactNode },
): ReactElement {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: MOBILE_DIAGNOSTICS_SCRIPT }} />
      <WechatJssdkLoader />
      <MobileDebugTools />
      <MobilePageTransition>{children}</MobilePageTransition>
    </>
  )
}
