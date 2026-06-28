import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportCsv(filename: string, columns: string[], rows: (string | number)[][]) {
  const csv = Papa.unparse({ fields: columns, data: rows })
  download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`)
}

export function exportPdf(
  title: string,
  filename: string,
  columns: string[],
  rows: (string | number)[][],
) {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text(title, 14, 15)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(new Date().toLocaleString(), 14, 21)

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 26,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [60, 100, 60] },
  })

  doc.save(`${filename}.pdf`)
}
