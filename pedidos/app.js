(function () {
  var d = new Date();
  var s = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  var w = (function (x) { x = new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())); var day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - day); var y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return Math.ceil(((x - y) / 86400000 + 1) / 7); })(d);
  document.getElementById('hoy').textContent = s.charAt(0).toUpperCase() + s.slice(1) + ' · Semana ' + w;
  var last = null; try { last = localStorage.getItem('pedidos-ultima'); } catch (e) {}
  if (last && document.getElementById(last)) document.querySelector('#' + last + ' .last').hidden = false;
  function ir(id) { try { localStorage.setItem('pedidos-ultima', id); } catch (e) {} location.href = document.getElementById(id).href; }
  ['caf', 'talgo'].forEach(function (id) { document.getElementById(id).addEventListener('click', function () { try { localStorage.setItem('pedidos-ultima', id); } catch (e) {} }); });
  document.addEventListener('keydown', function (e) { if (e.ctrlKey || e.metaKey || e.altKey) return; if (e.key === '1') ir('caf'); if (e.key === '2') ir('talgo'); });
  var q = new URLSearchParams(location.search).get('ir'); if (q === 'caf' || q === 'talgo') ir(q);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { scope: './' }).catch(function () {});
})();
