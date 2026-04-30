import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, X } from 'lucide-react';

const statutLabels = {
  EN_ATTENTE: 'En Attente',
  APPROUVE: 'Approuvé',
  EN_COURS: 'En Cours',
  EXPOSE: 'Exposé',
};

/**
 * PrintableSheet — renders via createPortal directly on document.body.
 * This makes it a sibling of #root, so @media print can hide #root
 * and show only the fiche.
 */
const PrintableSheet = ({ sheet, project, onClose }) => {
  const printRef = useRef(null);

  const handlePrint = () => window.print();

  const handleExportPDF = async () => {
    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas').then(m => m.default),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = (canvas.height * pageW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH);
      pdf.save(`${sheet?.numeroFiche || 'fiche'}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    }
  };

  const items = sheet?.items || [];
  const membresNoms = project?.membresNoms || [];

  const content = (
    <div id="squadlab-print-portal">
      {/* Injected styles: on print, hide #root and toolbar; show only the fiche */}
      <style>{`
        /* Screen: overlay the app */
        #squadlab-print-portal {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: white;
          overflow-y: auto;
          font-family: 'Inter', sans-serif;
        }
        /* Print: hide everything except the fiche */
        @media print {
          #root { display: none !important; }
          #squadlab-print-portal { position: static !important; overflow: visible !important; }
          #squadlab-print-toolbar { display: none !important; }
          body { margin: 0; }
        }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div id="squadlab-print-toolbar" className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-700 text-white text-sm font-semibold rounded-lg hover:bg-indigo-800 transition-colors"
          >
            <Printer className="w-4 h-4" /> Imprimer
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Download className="w-4 h-4" /> Exporter PDF
          </button>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Printable fiche */}
      <div ref={printRef} style={{ maxWidth: 800, margin: '32px auto', padding: '40px 48px', background: 'white', color: '#111' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1a1a1a', paddingBottom: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Fiche de Décharge</h1>
            <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>SquadLab — Gestion des Composants Électroniques</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#777' }}>N° Fiche</div>
            <div style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700 }}>{sheet?.numeroFiche || '—'}</div>
            <div style={{ fontSize: 11, marginTop: 4 }}><b>Fiche :</b> {statutLabels[sheet?.statut] || sheet?.statut}</div>
            <div style={{ fontSize: 11 }}><b>Projet :</b> {statutLabels[project?.statut] || project?.statut}</div>
          </div>
        </div>

        {/* Project info */}
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#555', borderBottom: '1px solid #ddd', paddingBottom: 4, marginBottom: 10 }}>
            Informations du Projet
          </h2>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 0', fontWeight: 600, color: '#555', width: 130 }}>Titre</td>
                <td style={{ padding: '3px 0' }}>{project?.titre}</td>
                <td style={{ padding: '3px 0', fontWeight: 600, color: '#555', width: 100 }}>Type</td>
                <td style={{ padding: '3px 0' }}>{project?.type === 'PFE' ? 'PFE' : 'Mini Projet'}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0', fontWeight: 600, color: '#555' }}>Laboratoire</td>
                <td style={{ padding: '3px 0' }}>{project?.labNom}</td>
                <td style={{ padding: '3px 0', fontWeight: 600, color: '#555' }}>Date création</td>
                <td style={{ padding: '3px 0' }}>{sheet?.dateCreation ? new Date(sheet.dateCreation).toLocaleDateString('fr-DZ') : '—'}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Encadrant */}
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#555', borderBottom: '1px solid #ddd', paddingBottom: 4, marginBottom: 10 }}>
            Encadrant
          </h2>
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
            {project?.encadrant ? `${project.encadrant.prenom} ${project.encadrant.nom}` : '—'}
          </p>
        </section>

        {/* Team */}
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#555', borderBottom: '1px solid #ddd', paddingBottom: 4, marginBottom: 10 }}>
            Membres du Groupe
          </h2>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ textAlign: 'left', padding: '6px 12px', borderBottom: '1px solid #ccc' }}>Nom &amp; Prénom</th>
                <th style={{ textAlign: 'left', padding: '6px 12px', borderBottom: '1px solid #ccc' }}>Rôle</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '6px 12px', fontWeight: 600 }}>★ {project?.chefGroupeNom}</td>
                <td style={{ padding: '6px 12px', color: '#555' }}>Chef de groupe</td>
              </tr>
              {membresNoms.map((name, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px 12px' }}>{name}</td>
                  <td style={{ padding: '6px 12px', color: '#777' }}>Membre</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Components */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#555', borderBottom: '1px solid #ddd', paddingBottom: 4, marginBottom: 10 }}>
            Liste des Composants{sheet?.isRefresh ? ' (Renouvellement)' : ''}
          </h2>
          {items.length === 0 ? (
            <p style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>Aucun composant</p>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', border: '1px solid #ccc' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  {['N°', 'Nom du composant', 'Qté dem.', 'Qté acc.', 'Emplacement'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 12px', borderBottom: '1px solid #ccc', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 12px', color: '#777' }}>{item.componentNumero ?? idx + 1}</td>
                    <td style={{ padding: '6px 12px', fontWeight: 500 }}>{item.componentNom}</td>
                    <td style={{ padding: '6px 12px', textAlign: 'center' }}>{item.quantiteDemandee}</td>
                    <td style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 600, color: '#166534' }}>{item.quantiteAccordee}</td>
                    <td style={{ padding: '6px 12px', color: '#777', fontSize: 11 }}>
                      {item.componentArmoire} › C{item.componentCasier}
                      {item.componentBanque ? ` › B${item.componentBanque}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Signatures */}
        <section style={{ marginTop: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Signature de l'Encadrant</p>
              <div style={{ borderBottom: '1px solid #666', height: 64, marginBottom: 6 }} />
              <p style={{ fontSize: 11, color: '#555' }}>
                {project?.encadrant ? `${project.encadrant.prenom} ${project.encadrant.nom}` : ''}
              </p>
              <p style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
                Date : {sheet?.dateApprobation ? new Date(sheet.dateApprobation).toLocaleDateString('fr-DZ') : '___/___/______'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Signature Admin Lab</p>
              <div style={{ borderBottom: '1px solid #666', height: 64, marginBottom: 6 }} />
              <p style={{ fontSize: 11, color: '#555' }}>Administrateur du laboratoire</p>
              <p style={{ fontSize: 11, color: '#888', marginTop: 8 }}>Date : ___/___/______</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa' }}>
          <span>SquadLab — Système de gestion des composants</span>
          <span>Imprimé le {new Date().toLocaleDateString('fr-DZ')}</span>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default PrintableSheet;
