/*
 * Tiny embeddable chat widget.
 * <script src="https://your-api.example.com/widget.js"
 *         data-api="https://your-api.example.com" data-title="Ask us anything" defer></script>
 */
(function () {
  var script = document.currentScript;
  var api = (script && script.dataset.api) || '';
  var title = (script && script.dataset.title) || 'Ask a question';

  var css =
    '#rag-bubble{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;border:0;background:#2563eb;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:99999}' +
    '#rag-panel{position:fixed;right:20px;bottom:88px;width:340px;max-width:calc(100vw - 40px);height:460px;max-height:70vh;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.2);display:none;flex-direction:column;font:14px/1.45 system-ui,sans-serif;z-index:99999;overflow:hidden}' +
    '#rag-panel.open{display:flex}#rag-head{background:#2563eb;color:#fff;padding:12px 14px;font-weight:600}' +
    '#rag-log{flex:1;overflow-y:auto;padding:12px}.rag-msg{margin:0 0 10px;padding:8px 10px;border-radius:8px;white-space:pre-wrap;word-wrap:break-word}' +
    '.rag-user{background:#e0e7ff;margin-left:40px}.rag-bot{background:#f3f4f6;margin-right:20px}.rag-src{display:block;font-size:12px;margin-top:6px}' +
    '#rag-form{display:flex;border-top:1px solid #e5e7eb}#rag-input{flex:1;border:0;padding:12px;font:inherit;outline:none}' +
    '#rag-send{border:0;background:none;color:#2563eb;font-weight:600;padding:0 14px;cursor:pointer}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var bubble = document.createElement('button');
  bubble.id = 'rag-bubble';
  bubble.setAttribute('aria-label', title);
  bubble.textContent = '💬';

  var panel = document.createElement('div');
  panel.id = 'rag-panel';
  panel.setAttribute('role', 'dialog');
  panel.innerHTML =
    '<div id="rag-head"></div><div id="rag-log" aria-live="polite"></div>' +
    '<form id="rag-form"><input id="rag-input" maxlength="500" placeholder="Type your question…" autocomplete="off"/>' +
    '<button id="rag-send" type="submit">Send</button></form>';
  panel.querySelector('#rag-head').textContent = title;

  document.body.appendChild(panel);
  document.body.appendChild(bubble);

  var log = panel.querySelector('#rag-log');
  var form = panel.querySelector('#rag-form');
  var input = panel.querySelector('#rag-input');

  bubble.addEventListener('click', function () {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) input.focus();
  });

  function safeUrl(u) {
    try {
      var url = new URL(u);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
    } catch (e) {
      return null;
    }
  }

  // All text is inserted with textContent, so answers can't inject HTML.
  function addMessage(text, who, sources) {
    var div = document.createElement('div');
    div.className = 'rag-msg rag-' + who;
    div.textContent = text;
    var seen = {};
    (sources || []).forEach(function (s) {
      var href = safeUrl(s.url);
      if (!href || seen[href]) return;
      seen[href] = true;
      var a = document.createElement('a');
      a.className = 'rag-src';
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = '[' + s.n + '] ' + (s.title || href);
      div.appendChild(a);
    });
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) return;
    input.value = '';
    addMessage(q, 'user');
    var pending = addMessage('…', 'bot');

    fetch(api + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        pending.remove();
        if (data.error) {
          addMessage(data.error + (data.bookingUrl ? ' ' + data.bookingUrl : ''), 'bot');
        } else {
          addMessage(data.answer, 'bot', data.sources);
        }
      })
      .catch(function () {
        pending.remove();
        addMessage('Sorry, something went wrong. Please try again.', 'bot');
      });
  });
})();
