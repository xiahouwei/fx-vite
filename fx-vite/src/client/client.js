;window.process = window.process || {}
;window.process.env = window.process.env || {}
;window.process.env.NODE_ENV = __MODE__

console.log('[vite] connecting...')
const socketProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
const socketHost = `${location.hostname}:${__HMR_PORT__}`;
const socket = new WebSocket(`${socketProtocol}://${socketHost}`, 'vite-hmr');

function warnFailedFetch(err, path) {
  if (!err.message.match('fetch')) {
    console.error(err)
  }
  console.error(
    `[hmr] Failed to reload ${path}. ` +
      `This could be due to syntax errors or importing non-existent ` +
      `modules. (see errors above)`
  )
}

socket.addEventListener('message', async ({ data }) => {
  const payload = JSON.parse(data);
  if (payload.type === 'multi') {
      payload.updates.forEach(handleMessage);
  }
  else {
      handleMessage(payload);
  }
});

async function handleMessage(payload) {
  const { path, changeSrcPath, timestamp } = payload;
  switch (payload.type) {
      case 'connected':
        console.log(`[vite] connected.`);
        break;
      case 'vue-reload':
        queueUpdate(import(`${path}?t=${timestamp}`)
            .catch((err) => warnFailedFetch(err, path))
            .then((m) => () => {
              __VUE_HMR_RUNTIME__.reload(path, m.default);
              console.log(`[vite] ${path} reloaded.`)
            }));
        break;
      case 'vue-rerender':
        const templatePath = `${path}?type=template`;
        import(`${templatePath}&t=${timestamp}`).then((m) => {
            __VUE_HMR_RUNTIME__.rerender(path, m.render);
            console.log(`[vite] ${path} template updated.`);
        });
        break;
      case 'style-update':
        // check if this is referenced in html via <link>
        const el = document.querySelector(`link[href*='${path}']`);
        if (el) {
            el.setAttribute('href', `${path}${path.includes('?') ? '&' : '?'}t=${timestamp}`);
            break;
        }
        // imported CSS
        const importQuery = path.includes('?') ? '&import' : '?import';
        await import(`${path}${importQuery}&t=${timestamp}`);
        console.log(`[vite] ${path} updated.`);
        break;
      case 'style-remove':
        removeStyle(payload.id);
        break;
      case 'js-update':
        queueUpdate(updateModule(path, changeSrcPath, timestamp));
        break;
      case 'custom':
        // const cbs = customUpdateMap.get(payload.id);
        // if (cbs) {
        //     cbs.forEach((cb) => cb(payload.customData));
        // }
        break;
      case 'full-reload':
        if (path.endsWith('.html')) {
            // if html file is edited, only reload the page if the browser is
            // currently on that page.
            const pagePath = location.pathname;
            if (pagePath === path ||
                (pagePath.endsWith('/') && pagePath + 'index.html' === path)) {
                location.reload();
            }
            return;
        }
        else {
            location.reload();
        }
        break
  }
}


let pending = false
let queued = []
/**
 * buffer multiple hot updates triggered by the same src change
 * so that they are invoked in the same order they were sent.
 * (otherwise the order may be inconsistent because of the http request round trip)
 */
async function queueUpdate(p) {
  queued.push(p);
  if (!pending) {
      pending = true;
      await Promise.resolve();
      pending = false;
      const loading = [...queued];
      queued = [];
      (await Promise.all(loading)).forEach((fn) => fn && fn());
  }
}
// ping server
socket.addEventListener('close', () => {
  console.log(`[vite] server connection lost. polling for restart...`);
  setInterval(() => {
      fetch('/')
          .then(() => {
          location.reload();
      })
          .catch((e) => {
          /* ignore */
      });
  }, 1000);
});
// https://wicg.github.io/construct-stylesheets
const supportsConstructedSheet = (() => {
    try {
        new CSSStyleSheet()
        return true
    } catch (e) {}
    return false
})()
const sheetsMap = new Map()
export function updateStyle(id, content) {
  let style = sheetsMap.get(id)
  if (supportsConstructedSheet && !content.includes('@import')) {
    if (style && !(style instanceof CSSStyleSheet)) {
      removeStyle(id)
      style = undefined
    }

    if (!style) {
      style = new CSSStyleSheet()
      style.replaceSync(content)
      // @ts-ignore
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, style]
    } else {
      style.replaceSync(content)
    }
  } else {
    if (style && !(style instanceof HTMLStyleElement)) {
      removeStyle(id)
      style = undefined
    }

    if (!style) {
      style = document.createElement('style')
      style.setAttribute('type', 'text/css')
      style.innerHTML = content
      document.head.appendChild(style)
    } else {
      style.innerHTML = content
    }
  }
  sheetsMap.set(id, style)
}
function removeStyle(id) {
  let style = sheetsMap.get(id);
  if (style) {
      if (style instanceof CSSStyleSheet) {
          // @ts-ignore
          const index = document.adoptedStyleSheets.indexOf(style);
          // @ts-ignore
          document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== style);
      }
      else {
          document.head.removeChild(style);
      }
      sheetsMap.delete(id);
  }
}