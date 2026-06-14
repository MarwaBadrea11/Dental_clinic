import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/** Sanitize a string for use in a downloaded filename. */
export function sanitizePdfFilename(name: string): string {
  return name
    .trim()
    .replace(/[^\w\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60) || 'Patient'
}

/**
 * Capture an HTML element with html2canvas and save as a multi-page A4 PDF.
 * Browser-rendered Arabic/RTL text is preserved because we snapshot the DOM.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (doc) => {
      const cloned = doc.getElementById(element.id)
      if (cloned) {
        cloned.style.display = 'block'
        cloned.style.position = 'static'
        cloned.style.left = 'auto'
        cloned.style.top = 'auto'
        cloned.style.width = '794px' // ~A4 width at 96dpi
      }
    },
  })

  const imgData = canvas.toDataURL('image/png', 1.0)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 8
  const printableWidth = pageWidth - margin * 2
  const printableHeight = pageHeight - margin * 2
  const imgHeight = (canvas.height * printableWidth) / canvas.width

  let heightLeft = imgHeight
  let position = margin

  pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight)
  heightLeft -= printableHeight

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft)
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight)
    heightLeft -= printableHeight
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
