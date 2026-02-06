const ensureReportHtml = (session) => {
  if (!session) return '';
  if (!session.reportHtml) {
    session.reportHtml = buildReportHtml(session);
  }
  return session.reportHtml;
};

const buildEvolutionSvg = (series) => {
  const points = (series || []).map((entry, index) => ({
    x: Number.isFinite(entry.x) ? entry.x : index,
    y: Number.isFinite(entry.y) ? entry.y : entry.value,
  }));

  return svgLineChart(points, { width: 320, height: 140 });
};

const buildReportHtml = (session) => {
  const evolutionSvg = buildEvolutionSvg(session?.evolution || []);
  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Relatório MEDLUX</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-top: 0; }
        </style>
      </head>
      <body>
        <h1>Relatório</h1>
        <div>${evolutionSvg}</div>
      </body>
    </html>
  `;
};

const openReport = (session, options = {}) => {
  const html = ensureReportHtml(session);
  const standalone = options.standalone || window.matchMedia('(display-mode: standalone)').matches;

  if (standalone) {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    if (options.print) {
      win.focus();
      win.print();
    }
    return;
  }

  const viewer = document.getElementById('reportViewer');
  if (!viewer) return;

  viewer.hidden = false;
  viewer.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.className = 'report-frame';
  viewer.appendChild(iframe);

  iframe.addEventListener('load', () => {
    if (options.print) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  });

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();
};

const bindReportActions = () => {
  $$('.report-open').forEach((button) => {
    button.addEventListener('click', () => {
      const session = button.reportSession || {};
      openReport(session, { print: false });
    });
  });

  $$('.report-print').forEach((button) => {
    button.addEventListener('click', () => {
      const session = button.reportSession || {};
      openReport(session, { print: true });
    });
  });
};

window.ensureReportHtml = ensureReportHtml;
window.openReport = openReport;
window.buildEvolutionSvg = buildEvolutionSvg;
window.bindReportActions = bindReportActions;
