import { loadLocation, locationDisplayLabel } from "./location.js";

/** @param {string | undefined} iso */
function formatScanDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "—";
  }
}

/** @param {import("./storage.js").ApplianceRecord[]} appliances */
function sortForReport(appliances) {
  return [...appliances].sort((a, b) => {
    const roomCmp = (a.room || "Other").localeCompare(b.room || "Other", undefined, { sensitivity: "base" });
    if (roomCmp !== 0) return roomCmp;
    return (a.nickname || "").localeCompare(b.nickname || "", undefined, { sensitivity: "base" });
  });
}

/** @param {import("./storage.js").ApplianceRecord[]} appliances */
function sortByItemName(appliances) {
  return [...appliances].sort((a, b) =>
    (a.nickname || "").localeCompare(b.nickname || "", undefined, { sensitivity: "base" })
  );
}

/** @param {import("./storage.js").ApplianceRecord[]} appliances */
function repairContractorRows(appliances) {
  return sortByItemName(appliances)
    .filter((item) => item.repairCompany?.name?.trim())
    .map((item) => {
      const company = item.repairCompany;
      return [
        item.nickname || "—",
        company?.name?.trim() || "—",
        company?.phone?.trim() || "—",
        company?.website?.trim() || "—",
        company?.notes?.trim() || "—",
      ];
    });
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {typeof import("jspdf-autotable").default} autoTable
 * @param {import("./storage.js").ApplianceRecord[]} appliances
 * @param {number} margin
 */
function addRepairContractorsPage(doc, autoTable, appliances, margin) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const rows = repairContractorRows(appliances);

  doc.addPage();
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(30, 41, 59);
  doc.text("Saved Repair Contractors", margin, y);

  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 90, 110);

  if (rows.length === 0) {
    const emptyNote =
      "No repair contractors have been saved yet. Open an appliance in HomePassportAI and add a repair company on its detail page.";
    const lines = doc.splitTextToSize(emptyNote, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    return y + lines.length * 12;
  }

  const intro =
    "Trusted repair shops saved for each appliance, sorted alphabetically by inventory item.";
  const introLines = doc.splitTextToSize(intro, pageWidth - margin * 2);
  doc.text(introLines, margin, y);
  y += introLines.length * 12 + 10;

  autoTable(doc, {
    startY: y,
    head: [["Inventory item", "Repair company", "Phone", "Website", "Notes"]],
    body: rows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 5, overflow: "linebreak" },
    headStyles: { fillColor: [29, 111, 216], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 247, 252] },
    columnStyles: {
      0: { cellWidth: 78 },
      1: { cellWidth: 88 },
      2: { cellWidth: 70 },
      3: { cellWidth: 80 },
    },
  });

  return doc.lastAutoTable?.finalY ?? y;
}

/** @param {import("./storage.js").ApplianceRecord[]} appliances */
export async function generateInsurancePdf(appliances) {
  if (appliances.length === 0) {
    throw new Error("No appliances to include in the report");
  }

  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("https://esm.sh/jspdf@2.5.2"),
    import("https://esm.sh/jspdf-autotable@3.8.4"),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(29, 111, 216);
  doc.text("HomePassportAI", margin, y);

  y += 26;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(15);
  doc.text("Home Appliance Inventory Report", margin, y);

  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 90, 110);

  const reportDate = new Date().toLocaleDateString(undefined, { dateStyle: "long" });
  doc.text(`Generated: ${reportDate}`, margin, y);
  y += 14;

  const location = loadLocation();
  const locLabel = locationDisplayLabel(location);
  if (locLabel) {
    doc.text(`Property location: ${locLabel}`, margin, y);
    y += 14;
  }

  doc.text(`Total appliances documented: ${appliances.length}`, margin, y);
  y += 22;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  const intro =
    "Inventory of home appliances for insurance and property records. Model and serial numbers were captured from manufacturer labels where available.";
  const introLines = doc.splitTextToSize(intro, pageWidth - margin * 2);
  doc.text(introLines, margin, y);
  y += introLines.length * 12 + 8;

  const sorted = sortForReport(appliances);
  const inventoryRows = sorted.map((item) => [
    item.nickname || "—",
    item.room || "—",
    item.applianceType || "—",
    item.brand || "—",
    item.modelNumber || "—",
    item.serialNumber || "—",
    item.colorDescription || "—",
    item.dimensionsDescription || "—",
    formatScanDate(item.scannedAt),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Item", "Room", "Type", "Brand", "Model", "Serial", "Color", "Size", "Documented"]],
    body: inventoryRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 5, overflow: "linebreak" },
    headStyles: { fillColor: [29, 111, 216], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 247, 252] },
    columnStyles: {
      0: { cellWidth: 64 },
      4: { cellWidth: 52 },
      5: { cellWidth: 52 },
      6: { cellWidth: 48 },
      7: { cellWidth: 48 },
    },
  });

  const repairEnd = addRepairContractorsPage(doc, autoTable, appliances, margin);
  let noteY = repairEnd + 28;

  doc.setFontSize(8);
  doc.setTextColor(100, 110, 125);
  const disclaimer =
    "This report was generated by HomePassportAI for personal insurance and property documentation. " +
    "Verify all model and serial numbers against physical appliance labels before submitting to an insurer. " +
    "Photos of each appliance are stored in the HomePassportAI app on your device.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - margin * 2);

  if (noteY + disclaimerLines.length * 10 > pageHeight - margin) {
    doc.addPage();
    noteY = margin;
  }
  doc.text(disclaimerLines, margin, noteY);

  const filename = `homepassportai-insurance-${new Date().toISOString().slice(0, 10)}.pdf`;
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
