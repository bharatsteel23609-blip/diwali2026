/* Gives the scoring app the same "db" interface it uses inside Claude,
   but stores everything through /api/db (Neon Postgres). Polls every 2.5 s. */
(function () {
  var API = '/api/db', pending = 0, writeSeq = 0, subs = [], state = null, lastStr = {}, timer = null, inflight = false;
  var COLS = ['games', 'entries', 'config', 'tambola', 'ootd'];

  function getJSON() {
    return fetch(API, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    });
  }
  function snap(col) {
    var m = (state && state[col]) || {};
    return { docs: Object.keys(m).map(function (id) { return { id: id, data: function () { return m[id]; } }; }) };
  }
  function deliver(force) {
    subs.forEach(function (s) {
      var str = JSON.stringify((state && state[s.col]) || {});
      if (force || s.last !== str) { s.last = str; try { s.cb(snap(s.col)); } catch (e) {} }
    });
  }
  function poll() {
    if (inflight) return;
    inflight = true;
    var seq = writeSeq;
    getJSON().then(function (st) {
      inflight = false;
      if (pending > 0 || seq !== writeSeq) { return; } // a write happened meanwhile: ignore stale read
      state = st; deliver(false);
    }, function () {
      inflight = false;
      subs.forEach(function (s) { if (s.err) s.err(); });
    });
  }
  function write(body) {
    pending++;
    return fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (x) { pending--; writeSeq++; setTimeout(poll, 150); return x; },
            function (e) { pending--; throw e; });
  }
  var db = {
    collection: function (col) {
      return {
        doc: function (id) {
          return {
            set: function (data) { return write({ op: 'set', col: col, id: id, data: data }); },
            update: function (data) { return write({ op: 'update', col: col, id: id, data: data }); },
            delete: function () { return write({ op: 'delete', col: col, id: id }); }
          };
        },
        onSnapshot: function (cb, err) {
          var s = { col: col, cb: cb, err: err, last: null };
          subs.push(s);
          if (state) setTimeout(function () { s.last = JSON.stringify(state[col] || {}); cb(snap(col)); }, 0);
          return function () { subs = subs.filter(function (x) { return x !== s; }); };
        }
      };
    }
  };
  window.claude = window.claude || {};
  window.claude.use = function (name) {
    if (name !== 'db') return Promise.resolve(null);
    return getJSON().then(function (st) {
      state = st;
      if (!timer) {
        timer = setInterval(poll, 2500);
        document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
        window.addEventListener('online', poll);
      }
      return db;
    });
  };
})();
