// ===== API HELPERS =====
var API = window.API_URL;

function apiGet(action) {
  return fetch(API + '?action=' + encodeURIComponent(action))
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(json) {
      if (!json.ok) throw new Error(json.error || 'Error desconocido');
      return json.data;
    });
}

function apiPost(action, data) {
  return fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: action, data: data })
  })
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(json) {
      if (!json.ok) throw new Error(json.error || 'Error desconocido');
      return json.data;
    });
}

// ===== SISTEMA DE MODALES PERSONALIZADOS =====
function showModal(config) {
  var modal = document.getElementById('modalCustom');
  var icon = document.getElementById('modalIcon');
  var title = document.getElementById('modalTitle');
  var message = document.getElementById('modalMessage');
  var buttonsContainer = document.getElementById('modalButtons');

  icon.textContent = config.icon || '📋';
  title.textContent = config.title || 'Aviso';
  message.innerHTML = config.message || '';
  buttonsContainer.innerHTML = '';

  (config.buttons || []).forEach(function(btn) {
    var button = document.createElement('button');
    button.className = 'modal-btn ' + (btn.primary ? 'modal-btn-primary' : 'modal-btn-secondary');
    button.textContent = btn.text;
    button.onclick = function() {
      closeModal();
      if (btn.onClick) btn.onClick();
    };
    buttonsContainer.appendChild(button);
  });

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  var modal = document.getElementById('modalCustom');
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});
document.getElementById('modalCustom').addEventListener('click', function(e) {
  if (e.target.id === 'modalCustom') closeModal();
});

// ===== STATE =====
var reports = [];
var allReports = [];
var currentView = 'list';

// ===== UTILIDADES =====
function formatDate(date) {
  var d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Fecha invalida';
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== FILTROS =====
function populateMonthFilter() {
  var filter = document.getElementById('reportFilter');
  var months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  filter.innerHTML = '<option value="all">Todos los reportes</option>';

  if (!Array.isArray(allReports) || allReports.length === 0) return;

  var uniqueMonths = new Set();
  allReports.forEach(function(report) {
    var d = (report.date instanceof Date) ? report.date : new Date(report.date);
    var monthIndex = d.getMonth();
    if (!Number.isNaN(monthIndex)) uniqueMonths.add(monthIndex);
  });

  Array.from(uniqueMonths).sort(function(a,b){return a-b;}).forEach(function(monthIndex) {
    var option = document.createElement('option');
    option.value = monthIndex;
    var name = months[monthIndex];
    option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    filter.appendChild(option);
  });
}

function filterReports() {
  var filterVal = document.getElementById('reportFilter').value;
  if (filterVal === 'all') {
    reports = allReports.slice();
  } else {
    var month = parseInt(filterVal, 10);
    reports = allReports.filter(function(r) {
      var d = (r.date instanceof Date) ? r.date : new Date(r.date);
      return d.getMonth() === month;
    });
  }
  displayReports(reports);
}

// ===== DISPLAY REPORTES =====
function displayReports(list) {
  list = list || reports;
  var container = document.getElementById('reportsList');
  if (!list || list.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No hay reportes disponibles</h3><p>Los reportes apareceran aqui cuando se generen degustaciones</p></div>';
    return;
  }

  container.innerHTML = list.map(function(report) {
    return '<div class="report-card">' +
      '<div class="report-header">' +
        '<div class="report-title">Informe Degustacion - Tinto Banqueteria</div>' +
        '<div class="report-subtitle">Resultados Degustacion - ' + formatDate(report.date) + '</div>' +
      '</div>' +
      '<div class="participants-section">' +
        '<div class="participants-info">' +
          '<div class="participants-label">Participantes</div>' +
          '<div class="participants-count">' + (report.participants||[]).length + '</div>' +
        '</div>' +
        '<button class="submit-btn" onclick="showDetailedReport(\'' + report.id + '\')">Ver Reporte Completo</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function showDetailedReport(reportId) {
  var report = (allReports||[]).find(function(r) { return r.id === reportId; });
  if (!report) return;

  currentView = 'detail';
  document.getElementById('backButton').style.display = 'inline-block';
  document.getElementById('reportsList').style.display = 'none';

  var coctelesHtml = '<h3><span class="cocktail-icon">🍸</span>COCTELES</h3>' +
    '<h4>Cocteles Elegidos</h4><ul class="item-list">' +
    Object.entries(report.cocteles||{})
      .sort(function(a, b) { return Number(b[1]) - Number(a[1]); })
      .map(function(e) { return '<li>' + e[0] + ' - <span class="vote-count">' + e[1] + ' ' + (e[1] === 1 ? 'eleccion' : 'elecciones') + '</span></li>'; })
      .join('') +
    '</ul>';

  var comentariosCoctelHtml = '';
  if (report.comentarios && report.comentarios.coctel && report.comentarios.coctel.length) {
    comentariosCoctelHtml = '<div class="comments-section simple"><h3>💬 Comentarios de Coctel</h3>' +
      report.comentarios.coctel.map(function(c) {
        return '<div class="comment-item"><div class="comment-author">' + (c.author||'Anonimo') + '</div><div class="comment-text">' + String(c.text||'').replace(/\n/g,'<br>') + '</div></div>';
      }).join('') + '</div>';
  }

  var entradasHtml = '<h3>Entradas</h3><ul class="item-list">' +
    Object.entries(report.entradas||{})
      .sort(function(a, b) { return Number(b[1]) - Number(a[1]); })
      .map(function(e) { return '<li>' + e[0] + ' - <span class="vote-count">' + e[1] + ' ' + (e[1] === 1 ? 'eleccion' : 'elecciones') + '</span></li>'; })
      .join('') +
    '</ul>';

  var comentariosEntradaHtml = '';
  if (report.comentarios && report.comentarios.entrada && report.comentarios.entrada.length) {
    comentariosEntradaHtml = '<div class="comments-section simple"><h3>💬 Comentarios de Entradas</h3>' +
      report.comentarios.entrada.map(function(c) {
        return '<div class="comment-item"><div class="comment-author">' + (c.author||'Anonimo') + '</div><div class="comment-text">' + String(c.text||'').replace(/\n/g,'<br>') + '</div></div>';
      }).join('') + '</div>';
  }

  var proteHtml = '<h3>Proteinas</h3><ul class="item-list">' +
    Object.entries(report.proteinas||{})
      .sort(function(a, b) { return Number(b[1]) - Number(a[1]); })
      .map(function(e) { return '<li>' + e[0] + ' - <span class="vote-count">' + e[1] + ' ' + (e[1] === 1 ? 'eleccion' : 'elecciones') + '</span></li>'; })
      .join('') +
    '</ul>';

  var acompHtml = '<h3>Acompanamientos</h3><ul class="item-list">' +
    Object.entries(report.acompanamientos||{})
      .sort(function(a, b) { return Number(b[1]) - Number(a[1]); })
      .map(function(e) { return '<li>' + e[0] + ' - <span class="vote-count">' + e[1] + ' ' + (e[1] === 1 ? 'eleccion' : 'elecciones') + '</span></li>'; })
      .join('') +
    '</ul>';

  var comentariosFondoHtml = '';
  if (report.comentarios && report.comentarios.fondos && report.comentarios.fondos.length) {
    comentariosFondoHtml = '<div class="comments-section"><h3>💬 Comentarios sobre Platos de Fondo</h3>' +
      report.comentarios.fondos.map(function(c) {
        return '<div class="comment-item"><div class="comment-author">' + (c.author||'Anonimo') + '</div><div class="comment-text">' + String(c.text||'').replace(/\n/g,'<br>') + '</div></div>';
      }).join('') + '</div>';
  }

  var costosHtml = '';
  if (report.costos && report.costos.length) {
    var costosItems = report.costos.map(function(c) {
      return '<li style="margin:8px 0;"><strong>' + c.nombre + '</strong> (' + c.centro + ' - ' + c.fecha + '): <span style="color:#2a2a2a;font-weight:bold;">$' + c.total.toLocaleString('es-CL') + '</span></li>';
    }).join('');
    costosHtml = '<div class="report-document" style="margin-top:30px;"><h2>💰 COSTO PROMEDIO</h2><h3 style="margin-bottom:20px;font-weight:normal;font-size:16px;">Costo promedio por invitado al matrimonio</h3><ul class="item-list">' + costosItems + '</ul></div>';
  }

  var botonPdf = '<div style="margin: 0 0 16px 0; text-align:right"><button class="submit-btn" onclick="exportarPdf(\'' + report.id + '\')">Exportar a PDF</button></div>';

  var container = document.getElementById('detailedReport');
  container.innerHTML = botonPdf +
    '<div class="report-document">' +
    '<h1>Informe Degustacion - Tinto Banqueteria</h1>' +
    '<h2>Resultados Degustacion - ' + formatDate(report.date) + '</h2>' +
    coctelesHtml + comentariosCoctelHtml +
    entradasHtml + comentariosEntradaHtml +
    proteHtml + acompHtml + comentariosFondoHtml +
    '</div>' + costosHtml;

  container.style.display = 'block';
  container.scrollIntoView({ behavior: 'smooth' });
}

function goBack() {
  currentView = 'list';
  document.getElementById('backButton').style.display = 'none';
  document.getElementById('reportsList').style.display = 'grid';
  document.getElementById('detailedReport').style.display = 'none';
}

// ===== PROCESAMIENTO DE REPORTES =====
function procesarReportesRecibidos(reportes) {
  try {
    allReports = (reportes || []).map(function(r) {
      return {
        id: r.id,
        date: (r.date instanceof Date) ? r.date : new Date(r.date),
        participants: r.participants || [],
        cocteles: r.cocteles || {},
        entradas: r.entradas || {},
        proteinas: r.proteinas || {},
        acompanamientos: r.acompanamientos || {},
        comentarios: r.comentarios || { coctel: [], entrada: [], fondos: [] },
        costos: r.costos || []
      };
    });
    reports = allReports.slice();
    populateMonthFilter();
    displayReports(reports);
  } catch (error) {
    console.error('Error procesando reportes:', error);
    manejarErrorCarga(error);
  }
}

function manejarErrorCarga(error) {
  console.error('Error cargando reportes:', error);
  var container = document.getElementById('reportsList');
  container.innerHTML = '<div class="empty-state"><h3>❌ Error al cargar reportes</h3><p style="color:#d32f2f;margin:10px 0;">' + (error.message || error) + '</p><p style="font-size:14px;color:#666;">Revisa los logs en Apps Script o intenta recargar la pagina</p><button class="btn-secondary" onclick="location.reload()" style="margin-top:15px;">🔄 Recargar Pagina</button></div>';
}

// ===== CARGAR REPORTES (fetch) =====
function cargarReportesReales() {
  var container = document.getElementById('reportsList');
  container.innerHTML = '<div class="empty-state"><h3>⏳ Cargando reportes...</h3><p>Por favor espera, esto puede tomar unos segundos</p></div>';

  apiGet('consolidarReportesPorFecha')
    .then(procesarReportesRecibidos)
    .catch(manejarErrorCarga);
}

// ===== GENERAR REPORTE (fetch) =====
function generarAhora() {
  showModal({
    icon: '⚡',
    title: 'Generar Reporte Ahora',
    message: 'Esto generara un reporte con las respuestas mas recientes.<br><br>✅ Solo procesa columnas nuevas (rapido)<br>✅ Ideal si ya llegaron todas las respuestas<br><br>⏱️ Puede tomar hasta 2 minutos<br><br>¿Continuar?',
    buttons: [
      { text: 'Cancelar', primary: false, onClick: null },
      { text: 'Generar', primary: true, onClick: ejecutarGeneracionReporte }
    ]
  });
}

function ejecutarGeneracionReporte() {
  var btn = document.getElementById('generarAhoraBtn');
  var textoOriginal = btn.textContent;

  btn.disabled = true;
  btn.innerHTML = '<span style="display:inline-block;width:12px;height:12px;border:2px solid #fff;border-top:2px solid transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px;vertical-align:middle;"></span>Generando...';

  if (!document.getElementById('spinStyle')) {
    var style = document.createElement('style');
    style.id = 'spinStyle';
    style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }

  apiGet('generarReporteIncremental')
    .then(function(reportes) {
      btn.disabled = false;
      btn.innerHTML = textoOriginal;

      if (!reportes || reportes.length === 0) {
        alert('No hay respuestas nuevas para procesar.\n\nLos reportes actuales estan al dia.');
        return;
      }

      procesarReportesRecibidos(reportes);

      var mensaje = document.createElement('div');
      mensaje.style.cssText = 'position:fixed;top:20px;right:20px;background:#2ecc71;color:white;padding:15px 25px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:9999;font-family:Quicksand,sans-serif;font-weight:600;';
      mensaje.textContent = '✓ Reporte actualizado (' + reportes.length + ' total)';
      document.body.appendChild(mensaje);
      setTimeout(function() {
        mensaje.style.opacity = '0';
        mensaje.style.transition = 'opacity 0.3s';
        setTimeout(function() { mensaje.remove(); }, 300);
      }, 3000);
    })
    .catch(function(error) {
      btn.disabled = false;
      btn.innerHTML = textoOriginal;
      console.error('Error:', error);
      alert('Error al generar reporte:\n\n' + (error.message || error));
    });
}

// ===== EXPORTAR PDF (fetch) =====
function exportarPdf(reportId) {
  var btns = document.querySelectorAll('.submit-btn');
  btns.forEach(function(b) { b.disabled = true; });

  apiPost('exportarReportePDF', { reportId: reportId })
    .then(function(info) {
      try {
        var byteChars = atob(info.base64);
        var byteNumbers = new Array(byteChars.length);
        for (var i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
        var byteArray = new Uint8Array(byteNumbers);
        var blob = new Blob([byteArray], { type: 'application/pdf' });

        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = info.name || 'reporte.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } finally {
        btns.forEach(function(b) { b.disabled = false; });
      }
    })
    .catch(function(err) {
      console.error('Error exportando PDF:', err);
      showModal({
        icon: '❌',
        title: 'Error al Exportar',
        message: 'No se pudo generar el PDF.<br><br>' + escapeHtml(err.message || String(err)),
        buttons: [{ text: 'Cerrar', primary: false }]
      });
      btns.forEach(function(b) { b.disabled = false; });
    });
}

// ===== TABS =====
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });

  if (tabName === 'fondos') {
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
    document.getElementById('tabFondos').classList.add('active');
    if (!fondosLoaded) cargarFondos();
  } else {
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.getElementById('tabReportes').classList.add('active');
  }
}

// ===== REVISION DE FONDOS (fetch) =====
var fondosLoaded = false;
var fondosData = [];

function cargarFondos() {
  var container = document.getElementById('fondosContainer');
  container.innerHTML = '<div class="empty-state"><h3>⏳ Cargando fondos...</h3><p>Consultando datos de platos de fondo</p></div>';
  document.getElementById('fondosStats').style.display = 'none';

  apiGet('obtenerReporteFondos')
    .then(function(data) {
      fondosData = data || [];
      fondosLoaded = true;
      renderFondos(fondosData);
    })
    .catch(function(err) {
      container.innerHTML = '<div class="empty-state"><h3>❌ Error</h3><p>' + (err.message || err) + '</p><button class="btn-secondary" onclick="cargarFondos()" style="margin-top:15px;">🔄 Reintentar</button></div>';
    });
}

function renderFondos(data) {
  var container = document.getElementById('fondosContainer');
  var statsEl = document.getElementById('fondosStats');

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>🍽️ Sin datos</h3><p>No hay registros de fondos en la hoja Aux</p></div>';
    statsEl.style.display = 'none';
    return;
  }

  var totalEventos = data.length;
  var conAlertas = data.filter(function(d) { return d.alertas && d.alertas.length > 0; }).length;
  var conCambios = data.filter(function(d) { return d.alertas && d.alertas.some(function(a) { return a.tipo === 'cambio'; }); }).length;
  var conComentarios = data.filter(function(d) { return d.comentario; }).length;

  statsEl.style.display = 'flex';
  statsEl.innerHTML =
    '<div class="fondos-stat"><div class="fondos-stat-num">' + totalEventos + '</div><div class="fondos-stat-label">Eventos</div></div>' +
    '<div class="fondos-stat"><div class="fondos-stat-num" style="color:' + (conAlertas > 0 ? '#e67e22' : '#1e8449') + '">' + conAlertas + '</div><div class="fondos-stat-label">Con alertas</div></div>' +
    '<div class="fondos-stat"><div class="fondos-stat-num" style="color:' + (conCambios > 0 ? '#e67e22' : '#1e8449') + '">' + conCambios + '</div><div class="fondos-stat-label">Con cambios</div></div>' +
    '<div class="fondos-stat"><div class="fondos-stat-num">' + conComentarios + '</div><div class="fondos-stat-label">Con comentarios</div></div>';

  var html = '<table class="fondos-table"><thead><tr><th>Evento</th><th>Plato 1</th><th>Plato 2</th><th>Estado</th></tr></thead><tbody>';

  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    var hasAlerts = d.alertas && d.alertas.length > 0;

    html += '<tr>';

    // Evento
    html += '<td><div class="fondos-evento">' + escapeHtml(d.codigo) + '</div>';
    if (d.submissions > 1) html += ' <span class="badge badge-submissions">' + d.submissions + ' envios</span>';
    if (d.comentario) html += '<div class="fondos-comment">' + escapeHtml(d.comentario) + '</div>';
    html += '</td>';

    // Plato 1
    html += '<td class="fondos-plato">';
    if (d.proteina1) {
      html += '<span class="prot">' + escapeHtml(d.proteina1) + '</span>';
      if (d.acomp1) html += '<span class="sep">+</span><span class="acomp">' + escapeHtml(d.acomp1) + '</span>';
    } else {
      html += '<span style="color:#ccc">\u2014</span>';
    }
    html += '</td>';

    // Plato 2
    html += '<td class="fondos-plato">';
    if (d.mismoPlato) {
      html += '<span style="color:#999;font-size:12px">(Mismo plato)</span>';
    } else if (d.proteina2) {
      html += '<span class="prot">' + escapeHtml(d.proteina2) + '</span>';
      if (d.acomp2) html += '<span class="sep">+</span><span class="acomp">' + escapeHtml(d.acomp2) + '</span>';
    } else {
      html += '<span style="color:#ccc">\u2014</span>';
    }
    html += '</td>';

    // Estado
    html += '<td>';
    if (!hasAlerts) {
      html += '<span class="badge badge-ok">✓ OK</span>';
    } else {
      for (var a = 0; a < d.alertas.length; a++) {
        var alerta = d.alertas[a];
        var badgeClass = 'badge-warning';
        if (alerta.tipo === 'error') badgeClass = 'badge-error';
        else if (alerta.tipo === 'cambio') badgeClass = 'badge-cambio';
        html += '<span class="badge ' + badgeClass + '">' + escapeHtml(alerta.msg) + '</span>';
      }
    }
    html += '</td></tr>';
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}

// ===== INICIALIZACION =====
window.addEventListener('load', function() {
  cargarReportesReales();
});
