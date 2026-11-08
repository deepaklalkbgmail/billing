import { rupees } from './helpers.js';

export interface ReceiptData {
  branch: {
    name: string;
    code: string;
    address: string;
    phone: string;
    fssaiNo: string;
    gstin: string;
    receiptHeader: string;
    receiptFooter: string;
  };
  bill: {
    id: string;
    billNumber: string;
    orderType: string;
    status: string;
    tableName?: string;
    customerName?: string;
    customerPhone?: string;
    createdAt: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPriceRupees: number;
    discountRupees: number;
    gstRate: number;
    gstAmountRupees: number;
    totalRupees: number;
    notes?: string;
  }>;
  totals: {
    subtotalRupees: number;
    discountRupees: number;
    parcelChargesRupees: number;
    gstEnabled: boolean;
    cgstRupees: number;
    sgstRupees: number;
    totalGstRupees: number;
    roundOffRupees: number;
    netTotalRupees: number;
  };
  payments: Array<{
    method: string;
    amountRupees: number;
    reference?: string;
  }>;
}

export interface KOTData {
  kotNumber?: number;
  billNumber: string;
  orderType: string;
  tableName: string;
  createdAt: string;
  branchName: string;
  items: Array<{
    name: string;
    quantity: number;
    notes?: string;
  }>;
}

export interface PrinterConfig {
  printerType: 'none' | 'usb' | 'lan' | string;
  printerAddress?: string;
  printerWidth?: number; // 58 or 80 mm
}

export function formatReceipt(
  bill: any,
  branch: any,
  items: any[],
  payments: any[] = []
): ReceiptData {
  return {
    branch: {
      name: branch?.name || 'RestoPOS',
      code: branch?.code || '',
      address: branch?.address || '',
      phone: branch?.phone || '',
      fssaiNo: branch?.fssaiNo || '',
      gstin: branch?.gstin || '',
      receiptHeader: branch?.receiptHeader || '',
      receiptFooter: branch?.receiptFooter || 'Thank you! Visit again.',
    },
    bill: {
      id: bill.id,
      billNumber: bill.billNumber,
      orderType: bill.orderType,
      status: bill.status,
      tableName: bill.table?.name || undefined,
      customerName: bill.customerName || undefined,
      customerPhone: bill.customerPhone || undefined,
      createdAt: new Date(bill.createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    },
    items: (items || []).map((item) => ({
      name: item.itemName,
      quantity: item.quantity,
      unitPriceRupees: rupees(item.unitPrice),
      discountRupees: rupees(item.discountAmount || 0),
      gstRate: item.gstRate || 0,
      gstAmountRupees: rupees(item.gstAmount || 0),
      totalRupees: rupees(item.total),
      notes: item.notes || '',
    })),
    totals: {
      subtotalRupees: rupees(bill.subtotal || 0),
      discountRupees: rupees(bill.discountAmount || 0),
      parcelChargesRupees: rupees(bill.parcelCharges || 0),
      gstEnabled: !!bill.gstEnabled,
      cgstRupees: rupees(bill.cgstAmount || 0),
      sgstRupees: rupees(bill.sgstAmount || 0),
      totalGstRupees: rupees(bill.totalGst || 0),
      roundOffRupees: rupees(bill.roundOff || 0),
      netTotalRupees: rupees(bill.netTotal || 0),
    },
    payments: (payments || []).map((p) => ({
      method: p.method,
      amountRupees: rupees(p.amount),
      reference: p.reference || '',
    })),
  };
}

export function formatKOT(bill: any, items: any[], branch?: any): KOTData {
  const maxKotNumber = items.reduce(
    (max, i) => Math.max(max, i.kotNumber || 0),
    0
  );

  return {
    kotNumber: maxKotNumber > 0 ? maxKotNumber : undefined,
    billNumber: bill.billNumber,
    orderType: bill.orderType,
    tableName: bill.table?.name || 'Direct / Takeaway',
    createdAt: new Date().toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }),
    branchName: branch?.name || 'RestoPOS Kitchen',
    items: items.map((i) => ({
      name: i.itemName,
      quantity: i.quantity,
      notes: i.notes || '',
    })),
  };
}

export async function printToThermal(
  data: ReceiptData | KOTData,
  printerConfig: PrinterConfig
): Promise<{ success: boolean; message: string }> {
  if (!printerConfig || printerConfig.printerType === 'none' || !printerConfig.printerAddress) {
    return {
      success: false,
      message: 'No physical printer configured for this branch',
    };
  }

  try {
    const pkg = await import('node-thermal-printer');
    const ThermalPrinter = (pkg as any).ThermalPrinter || (pkg as any).default?.ThermalPrinter;
    const PrinterTypes = (pkg as any).PrinterTypes || (pkg as any).default?.PrinterTypes;

    if (!ThermalPrinter) {
      return { success: false, message: 'Thermal printer driver not available' };
    }

    const printer = new ThermalPrinter({
      type: PrinterTypes?.EPSON || 'epson',
      interface: printerConfig.printerAddress,
      width: printerConfig.printerWidth === 58 ? 32 : 48,
    });

    // Check if this is KOT or Receipt
    if ('kotNumber' in data || ('items' in data && !('totals' in data))) {
      const kot = data as KOTData;
      printer.alignCenter();
      printer.bold(true);
      printer.setTextDoubleHeight();
      printer.setTextDoubleWidth();
      printer.println('KITCHEN ORDER TICKET');
      printer.setTextNormal();
      printer.bold(false);
      printer.drawLine();

      printer.alignLeft();
      if (kot.kotNumber) printer.println(`KOT #: ${kot.kotNumber}`);
      printer.println(`Bill #: ${kot.billNumber}`);
      printer.println(`Order Type: ${kot.orderType}`);
      printer.println(`Table: ${kot.tableName}`);
      printer.println(`Time: ${kot.createdAt}`);
      printer.drawLine();

      printer.bold(true);
      printer.tableCustom([
        { text: 'Item', align: 'LEFT', width: 0.7 },
        { text: 'Qty', align: 'RIGHT', width: 0.3 },
      ]);
      printer.bold(false);
      printer.drawLine();

      for (const item of kot.items) {
        printer.tableCustom([
          { text: item.name, align: 'LEFT', width: 0.7 },
          { text: String(item.quantity), align: 'RIGHT', width: 0.3 },
        ]);
        if (item.notes) {
          printer.println(` * Note: ${item.notes}`);
        }
      }
      printer.drawLine();
      printer.cut();
    } else {
      const receipt = data as ReceiptData;
      printer.alignCenter();
      printer.bold(true);
      printer.println(receipt.branch.name);
      printer.bold(false);
      if (receipt.branch.address) printer.println(receipt.branch.address);
      if (receipt.branch.phone) printer.println(`Tel: ${receipt.branch.phone}`);
      if (receipt.branch.gstin) printer.println(`GSTIN: ${receipt.branch.gstin}`);
      if (receipt.branch.fssaiNo) printer.println(`FSSAI: ${receipt.branch.fssaiNo}`);
      if (receipt.branch.receiptHeader) {
        printer.println(receipt.branch.receiptHeader);
      }
      printer.drawLine();

      printer.alignLeft();
      printer.println(`Bill No: ${receipt.bill.billNumber}`);
      printer.println(`Date: ${receipt.bill.createdAt}`);
      printer.println(`Type: ${receipt.bill.orderType}`);
      if (receipt.bill.tableName) {
        printer.println(`Table: ${receipt.bill.tableName}`);
      }
      if (receipt.bill.customerName) {
        printer.println(`Customer: ${receipt.bill.customerName}`);
      }
      printer.drawLine();

      printer.bold(true);
      printer.tableCustom([
        { text: 'Item', align: 'LEFT', width: 0.5 },
        { text: 'Qty', align: 'CENTER', width: 0.15 },
        { text: 'Price', align: 'RIGHT', width: 0.15 },
        { text: 'Total', align: 'RIGHT', width: 0.2 },
      ]);
      printer.bold(false);
      printer.drawLine();

      for (const item of receipt.items) {
        printer.tableCustom([
          { text: item.name, align: 'LEFT', width: 0.5 },
          { text: String(item.quantity), align: 'CENTER', width: 0.15 },
          { text: item.unitPriceRupees.toFixed(2), align: 'RIGHT', width: 0.15 },
          { text: item.totalRupees.toFixed(2), align: 'RIGHT', width: 0.2 },
        ]);
        if (item.notes) {
          printer.println(`  Note: ${item.notes}`);
        }
      }
      printer.drawLine();

      printer.alignRight();
      printer.println(`Subtotal: Rs. ${receipt.totals.subtotalRupees.toFixed(2)}`);
      if (receipt.totals.discountRupees > 0) {
        printer.println(`Discount: -Rs. ${receipt.totals.discountRupees.toFixed(2)}`);
      }
      if (receipt.totals.parcelChargesRupees > 0) {
        printer.println(`Parcel Charges: Rs. ${receipt.totals.parcelChargesRupees.toFixed(2)}`);
      }
      if (receipt.totals.gstEnabled && receipt.totals.totalGstRupees > 0) {
        printer.println(`CGST: Rs. ${receipt.totals.cgstRupees.toFixed(2)}`);
        printer.println(`SGST: Rs. ${receipt.totals.sgstRupees.toFixed(2)}`);
      }
      if (receipt.totals.roundOffRupees !== 0) {
        printer.println(`Round Off: Rs. ${receipt.totals.roundOffRupees.toFixed(2)}`);
      }
      printer.bold(true);
      printer.println(`NET PAYABLE: Rs. ${receipt.totals.netTotalRupees.toFixed(2)}`);
      printer.bold(false);
      printer.drawLine();

      if (receipt.payments && receipt.payments.length > 0) {
        printer.alignLeft();
        printer.println('PAYMENT DETAILS:');
        for (const p of receipt.payments) {
          printer.println(`  ${p.method}: Rs. ${p.amountRupees.toFixed(2)} ${p.reference ? '(' + p.reference + ')' : ''}`);
        }
        printer.drawLine();
      }

      printer.alignCenter();
      printer.println(receipt.branch.receiptFooter || 'Thank you! Visit again.');
      printer.cut();
    }

    await printer.execute();
    return { success: true, message: 'Print job sent successfully' };
  } catch (error: any) {
    console.warn('Thermal print warning (handled):', error?.message || error);
    return {
      success: false,
      message: `Failed to print to thermal printer: ${error?.message || error}`,
    };
  }
}

export function generateReceiptHTML(receipt: ReceiptData): string {
  const itemRows = receipt.items
    .map(
      (item) => `
    <tr>
      <td style="text-align: left; padding: 4px 0;">
        ${item.name}
        ${item.notes ? `<div style="font-size: 10px; color: #666;">Note: ${item.notes}</div>` : ''}
      </td>
      <td style="text-align: center; padding: 4px 0;">${item.quantity}</td>
      <td style="text-align: right; padding: 4px 0;">₹${item.unitPriceRupees.toFixed(2)}</td>
      <td style="text-align: right; padding: 4px 0;">₹${item.totalRupees.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const paymentRows = (receipt.payments || [])
    .map(
      (p) => `
    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
      <span>${p.method} ${p.reference ? `(${p.reference})` : ''}</span>
      <span>₹${p.amountRupees.toFixed(2)}</span>
    </div>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${receipt.bill.billNumber}</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; }
      @page { margin: 0; }
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      line-height: 1.3;
      max-width: 320px;
      margin: 0 auto;
      padding: 12px;
      color: #000;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { border-bottom: 1px dashed #000; padding: 4px 0; }
    .totals-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .net-total { font-size: 16px; font-weight: bold; margin-top: 6px; padding-top: 4px; border-top: 1px solid #000; border-bottom: 1px solid #000; }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="bold" style="font-size: 16px;">${receipt.branch.name}</div>
    ${receipt.branch.address ? `<div>${receipt.branch.address}</div>` : ''}
    ${receipt.branch.phone ? `<div>Tel: ${receipt.branch.phone}</div>` : ''}
    ${receipt.branch.gstin ? `<div>GSTIN: ${receipt.branch.gstin}</div>` : ''}
    ${receipt.branch.fssaiNo ? `<div>FSSAI: ${receipt.branch.fssaiNo}</div>` : ''}
    ${receipt.branch.receiptHeader ? `<div style="margin-top: 4px;">${receipt.branch.receiptHeader.replace(/\n/g, '<br/>')}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div>
    <div><strong>Bill No:</strong> ${receipt.bill.billNumber}</div>
    <div><strong>Date:</strong> ${receipt.bill.createdAt}</div>
    <div><strong>Order Type:</strong> ${receipt.bill.orderType}</div>
    ${receipt.bill.tableName ? `<div><strong>Table:</strong> ${receipt.bill.tableName}</div>` : ''}
    ${receipt.bill.customerName ? `<div><strong>Customer:</strong> ${receipt.bill.customerName}</div>` : ''}
    ${receipt.bill.customerPhone ? `<div><strong>Phone:</strong> ${receipt.bill.customerPhone}</div>` : ''}
  </div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align: left;">Item</th>
        <th style="text-align: center; width: 35px;">Qty</th>
        <th style="text-align: right; width: 60px;">Price</th>
        <th style="text-align: right; width: 65px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="divider"></div>

  <div>
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>₹${receipt.totals.subtotalRupees.toFixed(2)}</span>
    </div>
    ${
      receipt.totals.discountRupees > 0
        ? `<div class="totals-row"><span>Discount:</span><span>-₹${receipt.totals.discountRupees.toFixed(2)}</span></div>`
        : ''
    }
    ${
      receipt.totals.parcelChargesRupees > 0
        ? `<div class="totals-row"><span>Parcel Charges:</span><span>₹${receipt.totals.parcelChargesRupees.toFixed(2)}</span></div>`
        : ''
    }
    ${
      receipt.totals.gstEnabled && receipt.totals.totalGstRupees > 0
        ? `
        <div class="totals-row"><span>CGST:</span><span>₹${receipt.totals.cgstRupees.toFixed(2)}</span></div>
        <div class="totals-row"><span>SGST:</span><span>₹${receipt.totals.sgstRupees.toFixed(2)}</span></div>
        `
        : ''
    }
    ${
      receipt.totals.roundOffRupees !== 0
        ? `<div class="totals-row"><span>Round Off:</span><span>${receipt.totals.roundOffRupees > 0 ? '+' : ''}₹${receipt.totals.roundOffRupees.toFixed(2)}</span></div>`
        : ''
    }
    <div class="totals-row net-total">
      <span>NET PAYABLE:</span>
      <span>₹${receipt.totals.netTotalRupees.toFixed(2)}</span>
    </div>
  </div>

  ${
    paymentRows
      ? `
    <div class="divider"></div>
    <div class="bold" style="font-size: 12px; margin-bottom: 4px;">Payment Mode:</div>
    ${paymentRows}
  `
      : ''
  }

  <div class="divider"></div>

  <div class="text-center" style="margin-top: 8px;">
    <div>${receipt.branch.receiptFooter.replace(/\n/g, '<br/>')}</div>
  </div>
</body>
</html>
  `.trim();
}
