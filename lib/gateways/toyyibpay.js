// ToyyibPay adapter — Malaysian payment gateway (FPX / cards).
// Docs referenced: https://toyyibpay.com/apireference/ (createBill, callback payload, return URL params).
// Ready to activate the moment TOYYIBPAY_SECRET_KEY + TOYYIBPAY_CATEGORY_CODE are set in .env.
// Until then, PAYMENT_GATEWAY stays "sandbox" and this file is never called.
const crypto = require('crypto');
const querystring = require('querystring');
const https = require('https');
const { URL } = require('url');

function isConfigured() {
  return !!(process.env.TOYYIBPAY_SECRET_KEY && process.env.TOYYIBPAY_CATEGORY_CODE);
}

function sanitizeBillField(str, maxLen) {
  // ToyyibPay: "Max N alphanumeric characters, space and '_' only"
  return String(str || '').replace(/[^a-zA-Z0-9 _]/g, '').slice(0, maxLen);
}

function postForm(baseUrl, path, fields) {
  return new Promise((resolve, reject) => {
    const body = querystring.stringify(fields);
    const target = new URL(path, baseUrl);
    const req = https.request(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Creates one bill per installment payment. orderId + installmentNumber are packed into
// billExternalReferenceNo ("ORDERID#N") so the callback can be routed back to the right installment.
async function createBill({ orderId, installmentNumber, amount, customerName, email, phone, returnUrl, callbackUrl }) {
  if (!isConfigured()) {
    throw new Error('ToyyibPay belum dikonfigurasi. Sila isikan TOYYIBPAY_SECRET_KEY dan TOYYIBPAY_CATEGORY_CODE dalam .env selepas akaun ToyyibPay sedia.');
  }
  if (!email) {
    // ToyyibPay WAJIBKAN billEmail — tanpa email pelanggan sebenar dari tempahan, bill tidak boleh dicipta.
    throw new Error('Email pelanggan tiada pada tempahan ini. Sila pastikan borang tempahan diisi dengan email yang sah.');
  }
  const baseUrl = process.env.TOYYIBPAY_BASE_URL || 'https://dev.toyyibpay.com';
  const fields = {
    userSecretKey: process.env.TOYYIBPAY_SECRET_KEY,
    categoryCode: process.env.TOYYIBPAY_CATEGORY_CODE,
    billName: sanitizeBillField(`Biskut Raya ${orderId}`, 30),
    billDescription: sanitizeBillField(`Tempahan Biskut Raya Jijah Bake4U 2027 ${orderId} bayaran ${installmentNumber}`, 100),
    billPriceSetting: 1,
    billPayorInfo: 1,
    billAmount: Math.round(amount * 100), // cents
    billReturnUrl: returnUrl,
    billCallbackUrl: callbackUrl,
    billExternalReferenceNo: `${orderId}#${installmentNumber}`,
    billTo: customerName || 'Pelanggan Jijah Bake4U',
    billEmail: email,
    billPhone: phone || '',
    billPaymentChannel: 2, // FPX + Credit Card
    billExpiryDays: 3,
  };
  const result = await postForm(baseUrl, '/index.php/api/createBill', fields);
  const billCode = Array.isArray(result) && result[0] ? result[0].BillCode : null;
  if (!billCode) {
    // Cuba dapatkan mesej ralat sebenar dari ToyyibPay (tanpa dedah Secret Key) supaya senang diagnosis.
    const rawMsg = Array.isArray(result) && result[0] && result[0].msg
      ? result[0].msg
      : (typeof result === 'string' ? result.slice(0, 300) : JSON.stringify(result).slice(0, 300));
    console.error('[ToyyibPay] createBill gagal — respons penuh dari ToyyibPay:', JSON.stringify(result));
    throw new Error(`ToyyibPay tidak mengembalikan BillCode. Mesej ToyyibPay: ${rawMsg || '(tiada mesej — semak log server)'}`);
  }
  return { billCode, paymentUrl: `${baseUrl}/${billCode}` };
}

// Verify the MD5 hash ToyyibPay attaches to the server-side callback.
// Formula (per ToyyibPay docs): MD5(userSecretKey + status + order_id + refno + "ok")
function verifyCallback(payload) {
  if (!isConfigured()) return false;
  const { status, order_id, refno, hash } = payload;
  if (!hash) return false;
  const expected = crypto.createHash('md5')
    .update(`${process.env.TOYYIBPAY_SECRET_KEY}${status}${order_id}${refno}ok`)
    .digest('hex');
  return expected === hash;
}

function mapStatus(toyyibStatus) {
  const s = String(toyyibStatus);
  if (s === '1') return 'PAID';
  if (s === '2') return 'PENDING';
  return 'FAILED';
}

// order_id was packed as "ORDERID#N" when the bill was created — unpack it here.
function parseExternalRef(orderIdField) {
  const [orderId, installmentNumber] = String(orderIdField || '').split('#');
  return { orderId, installmentNumber: parseInt(installmentNumber, 10) };
}

module.exports = { isConfigured, createBill, verifyCallback, mapStatus, parseExternalRef };
