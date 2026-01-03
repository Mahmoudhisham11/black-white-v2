"use client";
// Utility for printing invoices

export const printInvoice = (invoice) => {
  if (!invoice) return;

  const printWindow = window.open("", "", "width=800,height=600");
  if (!printWindow) {
    return { success: false, message: "يرجى السماح بفتح النوافذ المنبثقة" };
  }

  const invoiceHTML = `
<html>
<head>
  <title>فاتورة</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      direction: rtl; 
      margin: 0;
      padding: 20px;
    }
    .invoice { 
      max-width: 100%; 
      margin: auto; 
      padding: 20px; 
      font-size: 14px; 
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header img {
      width: 200px;
      height: 120px;
      object-fit: cover;
      margin-bottom: 10px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0;
    }
    th, td { 
      border: 1px solid #ddd; 
      padding: 8px 12px; 
      text-align: right; 
      font-size: 12px; 
    }
    th {
      background-color: #1976d2;
      color: white;
      font-weight: 600;
    }
    tfoot td { 
      font-weight: bold; 
      border-top: 2px solid #000; 
      background-color: #f5f5f5;
    }
    .info {
      margin: 10px 0;
      font-size: 13px;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <img id="invoiceLogo" src="${
        typeof window !== "undefined" ? window.location.origin : ""
      }/images/logo.png" alt="Logo" />
      <h2>بوابة الالف مسكن</h2>
    </div>
    
    <h3 style="text-align: center;">فاتورة مبيعات</h3>
    
    <div class="info">
      <p><strong>التاريخ:</strong> ${new Date(invoice.date).toLocaleDateString("ar-EG")}</p>
      <p><strong>رقم الفاتورة:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>العميل:</strong> ${invoice.clientName || "بدون اسم"}</p>
      <p><strong>الهاتف:</strong> ${invoice.phone || "-"}</p>
      ${invoice.employee ? `<p><strong>الموظف:</strong> ${invoice.employee}</p>` : ""}
    </div>
    
    <table>
      <thead>
        <tr>
          <th>الكود</th>
          <th>المنتج</th>
          <th>الكمية</th>
          <th>السعر</th>
          <th>الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.cart
          .map(
            (item) => `
          <tr>
            <td>${item.code || "-"}</td>
            <td>${item.name} ${item.color ? ` - ${item.color}` : ""} ${
              item.size ? ` - ${item.size}` : ""
            }</td>
            <td>${item.quantity}</td>
            <td>${item.sellPrice} ج.م</td>
            <td>${item.total || item.sellPrice * item.quantity} ج.م</td>
          </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="text-align: left;"><strong>الإجمالي:</strong></td>
          <td><strong>${invoice.total} ج.م</strong></td>
        </tr>
        ${invoice.discount > 0 ? `
        <tr>
          <td colspan="4" style="text-align: left;"><strong>الخصم:</strong></td>
          <td><strong>${invoice.discount} ج.م</strong></td>
        </tr>
        ` : ""}
      </tfoot>
    </table>
    
    <p style="text-align: center; margin-top: 20px;">
      <strong>عدد الأصناف:</strong> ${invoice.cart.length}
    </p>
    
    <div class="footer">
      <p>البضاعة المباعة لا ترد</p>
      <p>ولكن تستبدل خلال ثلاث ايام</p>
      <p><strong>تم التوجيه بواسطة: Devoria</strong></p>
    </div>
  </div>

  <script>
    const logo = document.getElementById('invoiceLogo');
    if (logo.complete) {
      setTimeout(() => {
        window.print();
        window.onafterprint = () => window.close();
      }, 500);
    } else {
      logo.onload = () => {
        setTimeout(() => {
          window.print();
          window.onafterprint = () => window.close();
        }, 500);
      };
    }
  </script>
</body>
</html>
  `;

  printWindow.document.write(invoiceHTML);
  printWindow.document.close();
  printWindow.focus();

  return { success: true };
};
