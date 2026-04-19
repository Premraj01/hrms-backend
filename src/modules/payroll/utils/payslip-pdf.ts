/**
 * Self-contained multi-font payslip PDF builder.
 * Produces a valid single-page PDF 1.4 document using mixed Helvetica/Courier
 * fonts and drawn horizontal rules, matching the Azul Arc payslip layout.
 */

export interface PayslipLineItem {
  label: string;
  amount: number;
}

export interface PayslipPdfInput {
  companyName?: string;
  employeeName: string;
  employeeCode?: string | null;
  department?: string | null;
  designation?: string | null;
  location?: string | null;
  joiningDate?: string | null; // formatted DD/MM/YYYY
  month: number;
  year: number;
  currency: string;
  basicSalary: number;
  earnings: PayslipLineItem[];
  deductions: PayslipLineItem[];
  netSalary: number;
  leaveDays?: number;
  daysWorked?: number;
}

const escapePdf = (s: string): string =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '')
    .replace(/\n/g, ' ');

const formatIndian = (n: number): string =>
  Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const monthName = (month: number, year: number): string =>
  new Date(year, month - 1).toLocaleString('default', { month: 'long' });

// Approximate average character widths in PDF units per 1pt font size.
const CHAR_WIDTH: Record<string, number> = {
  F1: 0.5, // Helvetica
  F2: 0.56, // Helvetica-Bold
  F3: 0.6, // Courier (monospaced)
  F4: 0.6, // Courier-Bold
};

const textWidth = (font: string, size: number, text: string): number =>
  (CHAR_WIDTH[font] ?? 0.55) * size * text.length;

// ----------------------------------------------------------------------------
// PDF content-stream operator builders
// ----------------------------------------------------------------------------

const textAt = (
  x: number,
  y: number,
  font: string,
  size: number,
  text: string,
): string => `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdf(text)}) Tj ET`;

const textCenter = (
  pageWidth: number,
  y: number,
  font: string,
  size: number,
  text: string,
): string => {
  const w = textWidth(font, size, text);
  const x = (pageWidth - w) / 2;
  return textAt(x, y, font, size, text);
};

const line = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width = 0.5,
): string => `${width} w ${x1} ${y1} m ${x2} ${y2} l S`;

const doubleLine = (
  x1: number,
  y: number,
  x2: number,
  width = 0.6,
): string =>
  [line(x1, y + 1.5, x2, y + 1.5, width), line(x1, y - 1.5, x2, y - 1.5, width)].join(
    ' ',
  );

// Right-align text ending at a given x coordinate.
const textRight = (
  xEnd: number,
  y: number,
  font: string,
  size: number,
  text: string,
): string => textAt(xEnd - textWidth(font, size, text), y, font, size, text);

// ----------------------------------------------------------------------------
// PDF document assembler — supports multiple font resources.
// ----------------------------------------------------------------------------

const FONT_OBJECTS = [
  { id: 'F1', base: 'Helvetica' },
  { id: 'F2', base: 'Helvetica-Bold' },
  { id: 'F3', base: 'Courier' },
  { id: 'F4', base: 'Courier-Bold' },
];

function assemblePdf(contentStream: string): Buffer {
  const contentBuf = Buffer.from(contentStream, 'latin1');
  const fontsDict = FONT_OBJECTS.map((f, i) => `/${f.id} ${5 + i} 0 R`).join(' ');
  const fontObjects = FONT_OBJECTS.map(
    (f, i) =>
      `${5 + i} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /${f.base} >>\nendobj\n`,
  );

  const objects: string[] = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << ${fontsDict} >> >> >>\nendobj\n`,
    `4 0 obj\n<< /Length ${contentBuf.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    ...fontObjects,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${off.toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}

// ----------------------------------------------------------------------------
// Payslip layout — reproduces the Azul Arc payslip format.
// ----------------------------------------------------------------------------

export function buildPayslipPdf(input: PayslipPdfInput): Buffer {
  const page = { w: 595, h: 842 };
  const table = { left: 150, right: 470 };
  const colEarningsRight = 395;
  const colDeductionsRight = 470;

  const companyName =
    input.companyName ?? 'Azul Arc India Interactive Pvt. Ltd.';
  const title = `PAYSLIP FOR ${monthName(input.month, input.year).toUpperCase()} ${input.year}`;

  const ops: string[] = [];

  // Logo placeholder (stylised text in bold).
  ops.push(textAt(70, 790, 'F2', 28, 'azularc'));

  // Company name + payslip period (centered, bold).
  ops.push(textCenter(page.w, 690, 'F2', 11, companyName));
  ops.push(textCenter(page.w, 672, 'F2', 11, title));

  // Top divider (double rule).
  ops.push(doubleLine(table.left, 660, table.right));

  // Header info — left column.
  const lh = 13;
  let y = 648;
  const lblL = (label: string, value: string) =>
    ops.push(textAt(table.left, y, 'F3', 9, `${label.padEnd(12)}: ${value}`));

  lblL('Name', input.employeeName);
  ops.push(
    textAt(340, y, 'F3', 9, `Leave Days  : ${input.leaveDays ?? 0} Days`),
  );
  y -= lh;
  lblL('Location', input.location ?? '-');
  ops.push(
    textAt(340, y, 'F3', 9, `Days Worked : ${input.daysWorked ?? 0} Days`),
  );
  y -= lh;
  lblL('Joining Dt.', input.joiningDate ?? '-');
  y -= lh;
  lblL('Department', input.department ?? '-');
  y -= lh;
  lblL('Designation', input.designation ?? '-');
  y -= lh + 2;

  // Divider above table header.
  ops.push(line(table.left, y + 4, table.right, y + 4));
  y -= 4;

  // Table header.
  ops.push(textAt(table.left, y, 'F3', 9, 'Particulars'));
  ops.push(textRight(colEarningsRight, y, 'F3', 9, 'Earnings'));
  ops.push(textRight(colDeductionsRight, y, 'F3', 9, 'Deductions'));
  y -= lh + 2;
  ops.push(line(table.left, y + 6, table.right, y + 6));
  y -= 2;

  // Earnings rows: Basic + configured earnings.
  const earningItems: PayslipLineItem[] = [
    { label: 'Basic', amount: input.basicSalary },
    ...input.earnings,
  ];
  for (const item of earningItems) {
    ops.push(textAt(table.left, y, 'F3', 9, item.label));
    ops.push(textRight(colEarningsRight, y, 'F3', 9, formatIndian(item.amount)));
    y -= lh;
  }

  y -= 4;

  // Deductions rows.
  for (const item of input.deductions) {
    ops.push(textAt(table.left, y, 'F3', 9, item.label));
    ops.push(
      textRight(colDeductionsRight, y, 'F3', 9, formatIndian(item.amount)),
    );
    y -= lh;
  }

  y -= 2;
  ops.push(line(table.left + 10, y + 6, table.right, y + 6));
  y -= 2;

  // TOTAL row.
  const totalEarnings =
    input.basicSalary + input.earnings.reduce((s, e) => s + e.amount, 0);
  const totalDeductions = input.deductions.reduce((s, d) => s + d.amount, 0);
  ops.push(textAt(table.left + 10, y, 'F3', 9, 'TOTAL'));
  ops.push(
    textRight(colEarningsRight, y, 'F3', 9, formatIndian(totalEarnings)),
  );
  ops.push(
    textRight(colDeductionsRight, y, 'F3', 9, formatIndian(totalDeductions)),
  );
  y -= lh;

  // Double rule separating totals from net salary.
  ops.push(doubleLine(table.left, y + 4, table.right));
  y -= lh;

  // Net Salary row.
  ops.push(textAt(table.left + 10, y, 'F3', 9, 'Net Salary'));
  ops.push(textRight(colEarningsRight, y, 'F3', 9, formatIndian(input.netSalary)));
  y -= lh;

  // Bottom double rule.
  ops.push(doubleLine(table.left, y + 6, table.right));

  // Footer note (italic-like small print centered near page bottom).
  ops.push(
    textCenter(
      page.w,
      90,
      'F1',
      10,
      '*This is computer generated pay slip. Does not require any sign and stamp*',
    ),
  );

  return assemblePdf(ops.join('\n'));
}
