/* ===================================================================
   STATE MANAGEMENT — localStorage + Sample Data
   =================================================================== */

// Global variables for universal compatibility
var defaultCategories = ["Kedi", "Köpek", "Kuş / Kemirgen", "Açık Mama", "Kum / Kozmetik", "Kampanyalar", "elekli paspas"];
var categories = [...defaultCategories];
var selectedCategory = "TÜMÜ";
window.defaultCategories = defaultCategories;
window.categories = categories;
window.selectedCategory = selectedCategory;

var catalogProducts = (typeof window !== "undefined" && window.catalogProducts && window.catalogProducts.length > 0)
  ? window.catalogProducts
  : ((typeof catalogProducts !== "undefined" && Array.isArray(catalogProducts)) ? catalogProducts : []);

const sampleProducts = catalogProducts;

var products = (catalogProducts && catalogProducts.length > 0) ? [...catalogProducts] : [];
window.products = products;
var suppliers = [];
var customers = [];
var bundles = [];
var wasteRecords = [];
var orders = [];
var platformPendingOrders = [];
var deliveredOrders = [];
var salesHistory = [];
var expenses = [];
var manualDeficits = [];
var heldCarts = [];
var cart = [];
var dailyCloseRecords = [];
window.dailyCloseRecords = dailyCloseRecords;

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4ue2uUwGkZUju68CFkaV6fSUZr1zOb57Q08rsVaeA__a1j214ShzK0H5_a6GOOyl_/exec";

const sampleBundles = [];
const sampleSuppliers = [];
const sampleCustomers = [];
const sampleWaste = [];

// ── Unified Sample Expenses ──
const sampleExpenses = [
    {
        "id":  1789310812182,
        "date":  "13.09.2026",
        "time":  "17:46",
        "mainCategory":  "Genel Dükkân / Sarf",
        "subType":  "su",
        "category":  "Genel Dükkân / Sarf",
        "desc":  "su",
        "amount":  100,
        "vatRate":  20,
        "vatAmount":  16.67,
        "deductibleVat":  16.67,
        "paymentMethod":  "Kasa (Nakit)",
        "source":  "Kasa (Nakit)",
        "hasInvoice":  true,
        "isInvoice":  true,
        "invoiceStatus":  "🧾 Faturalı",
        "taxDeduction":  83.33,
        "kkeg":  0,
        "withholdingTax":  0,
        "expenseType":  "daily"
    },
    {
        "id":  1789304730746,
        "date":  "13.09.2026",
        "time":  "16:05",
        "mainCategory":  "Genel Dükkân / Sarf",
        "subType":  "nişan için",
        "category":  "Genel Dükkân / Sarf",
        "desc":  "nişan için",
        "amount":  1300,
        "vatRate":  20,
        "vatAmount":  216.67,
        "deductibleVat":  216.67,
        "paymentMethod":  "Kasa (Nakit)",
        "source":  "Kasa (Nakit)",
        "hasInvoice":  true,
        "isInvoice":  true,
        "invoiceStatus":  "🧾 Faturalı",
        "taxDeduction":  1083.33,
        "kkeg":  0,
        "withholdingTax":  0,
        "expenseType":  "daily"
    },
    {
        "id":  1789221302921,
        "date":  "12.09.2026",
        "time":  "16:55",
        "mainCategory":  "Genel Dükkân / Sarf",
        "subType":  "kepenk anahtar pil",
        "category":  "Genel Dükkân / Sarf",
        "desc":  "kepenk anahtar pil",
        "amount":  175,
        "vatRate":  20,
        "vatAmount":  29.17,
        "deductibleVat":  29.17,
        "paymentMethod":  "Kasa (Nakit)",
        "source":  "Kasa (Nakit)",
        "hasInvoice":  true,
        "isInvoice":  true,
        "invoiceStatus":  "🧾 Faturalı",
        "taxDeduction":  145.83,
        "kkeg":  0,
        "withholdingTax":  0,
        "expenseType":  "daily"
    },
    {
        "id":  1789221119951,
        "date":  "12.09.2026",
        "time":  "16:51",
        "mainCategory":  "Genel Dükkân / Sarf",
        "subType":  "süt",
        "category":  "Genel Dükkân / Sarf",
        "desc":  "süt",
        "amount":  30,
        "vatRate":  20,
        "vatAmount":  5,
        "deductibleVat":  5,
        "paymentMethod":  "Kasa (Nakit)",
        "source":  "Kasa (Nakit)",
        "hasInvoice":  true,
        "isInvoice":  true,
        "invoiceStatus":  "🧾 Faturalı",
        "taxDeduction":  25,
        "kkeg":  0,
        "withholdingTax":  0,
        "expenseType":  "daily"
    },
    {
        "id":  1789221100946,
        "date":  "12.09.2026",
        "time":  "16:51",
        "mainCategory":  "Genel Dükkân / Sarf",
        "subType":  "ova fırın",
        "category":  "Genel Dükkân / Sarf",
        "desc":  "ova fırın",
        "amount":  350,
        "vatRate":  20,
        "vatAmount":  58.33,
        "deductibleVat":  58.33,
        "paymentMethod":  "Kasa (Nakit)",
        "source":  "Kasa (Nakit)",
        "hasInvoice":  true,
        "isInvoice":  true,
        "invoiceStatus":  "🧾 Faturalı",
        "taxDeduction":  291.67,
        "kkeg":  0,
        "withholdingTax":  0,
        "expenseType":  "daily"
    },
    {
        "id":  1789221083523,
        "date":  "12.09.2026",
        "time":  "16:51",
        "mainCategory":  "Genel Dükkân / Sarf",
        "subType":  "bağkur ara ödeme",
        "category":  "Genel Dükkân / Sarf",
        "desc":  "bağkur ara ödeme",
        "amount":  5000,
        "vatRate":  20,
        "vatAmount":  833.33,
        "deductibleVat":  833.33,
        "paymentMethod":  "Kasa (Nakit)",
        "source":  "Kasa (Nakit)",
        "hasInvoice":  true,
        "isInvoice":  true,
        "invoiceStatus":  "🧾 Faturalı",
        "taxDeduction":  4166.67,
        "kkeg":  0,
        "withholdingTax":  0,
        "expenseType":  "daily"
    }
];

// ── Unified Sample Sales History ──
const sampleSalesHistory = [
    {
        "id":  1789317851929,
        "date":  "13.09.2026",
        "time":  "19:44",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x NutriCanin Tahılsız Kuzu ve Sığır Etli Köpek Konserve Maması (400 gr) (240.00 ₺)",
        "soldItems":  [
                          {
                              "id":  108,
                              "name":  "NutriCanin Tahılsız Kuzu ve Sığır Etli Köpek Konserve Maması (400 gr)",
                              "category":  "Köpek",
                              "price":  240,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  240
                          }
                      ],
        "total":  240,
        "vatTotal":  40,
        "paymentType":  "Nakit",
        "splitCash":  240,
        "splitCard":  0,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789317666080,
        "date":  "13.09.2026",
        "time":  "19:41",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x AÇIK Felicia Yetişkin Tavuk 1 kg (350.00 ₺), 1x Göğüs Tasması (Saran) (375.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788868001791,
                              "name":  "AÇIK Felicia Yetişkin Tavuk 1 kg",
                              "category":  "Açık Mama",
                              "price":  350,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  350
                          },
                          {
                              "id":  1789317323780,
                              "name":  "Göğüs Tasması (Saran)",
                              "category":  "Köpek",
                              "price":  275,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  375
                          }
                      ],
        "total":  725,
        "vatTotal":  120.83,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  725,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789317582963,
        "date":  "13.09.2026",
        "time":  "19:39",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x AÇIK Bono kitten (220.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789317572118,
                              "name":  "AÇIK Bono kitten",
                              "category":  "Köpek",
                              "price":  220,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  220
                          }
                      ],
        "total":  220,
        "vatTotal":  36.67,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  220,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789317509794,
        "date":  "13.09.2026",
        "time":  "19:38",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x proplan puppy medium (2000.00 ₺), 1x Gezdirme tasması deri (1500.00 ₺), 1x Mama \u0026 su kabı (1800.00 ₺), 1x Göğüs Tasması (Saran) (200.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789317085273,
                              "name":  "proplan puppy medium",
                              "category":  "Köpek",
                              "price":  2000,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  2000
                          },
                          {
                              "id":  1789317242804,
                              "name":  "Gezdirme tasması deri",
                              "category":  "Köpek",
                              "price":  1800,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  1500
                          },
                          {
                              "id":  1789317187458,
                              "name":  "Mama \u0026 su kabı",
                              "category":  "Köpek",
                              "price":  1800,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  1800
                          },
                          {
                              "id":  1789317323780,
                              "name":  "Göğüs Tasması (Saran)",
                              "category":  "Köpek",
                              "price":  275,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  200
                          }
                      ],
        "total":  5500,
        "vatTotal":  916.67,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  5500,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789316938154,
        "date":  "13.09.2026",
        "time":  "19:28",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Purina Gourmet Gold Hindi Etli Kıyılmış Yaş Kedi Maması (65.00 ₺)",
        "soldItems":  [
                          {
                              "id":  42,
                              "name":  "Purina Gourmet Gold Hindi Etli Kıyılmış Yaş Kedi Maması",
                              "category":  "Kedi",
                              "price":  65,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  65
                          }
                      ],
        "total":  65,
        "vatTotal":  10.83,
        "paymentType":  "Nakit",
        "splitCash":  65,
        "splitCard":  0,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789316853237,
        "date":  "13.09.2026",
        "time":  "19:27",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Şiş peti (300.00 ₺), 1x Şiş alıştırma sprey (100.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789316813911,
                              "name":  "Şiş peti",
                              "category":  "Açık Mama",
                              "price":  300,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  300
                          },
                          {
                              "id":  1789316786199,
                              "name":  "Şiş alıştırma sprey",
                              "category":  "Açık Mama",
                              "price":  100,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  100
                          }
                      ],
        "total":  400,
        "vatTotal":  66.67,
        "paymentType":  "Nakit",
        "splitCash":  400,
        "splitCard":  0,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789316692543,
        "date":  "13.09.2026",
        "time":  "19:24",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x AÇIK Royal Canin Kısır 1 kg (600.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788856842402,
                              "name":  "AÇIK Royal Canin Kısır 1 kg",
                              "category":  "Açık Mama",
                              "price":  600,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  600
                          }
                      ],
        "total":  600,
        "vatTotal":  100,
        "paymentType":  "Nakit",
        "splitCash":  600,
        "splitCard":  0,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789316627790,
        "date":  "13.09.2026",
        "time":  "19:23",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Motto Kedi Yaş Mama 3 Tane (160.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788881627839,
                              "name":  "Motto Kedi Yaş Mama 3 Tane",
                              "category":  "Kedi",
                              "price":  160,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  160
                          }
                      ],
        "total":  160,
        "vatTotal":  26.67,
        "paymentType":  "Nakit",
        "splitCash":  160,
        "splitCard":  0,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789313177488,
        "date":  "13.09.2026",
        "time":  "18:26",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x AÇIK Royal Canin Sensible 1 kg (600.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788883571561,
                              "name":  "AÇIK Royal Canin Sensible 1 kg",
                              "category":  "Açık Mama",
                              "price":  600,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  600
                          }
                      ],
        "total":  600,
        "vatTotal":  100,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  600,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789313037989,
        "date":  "13.09.2026",
        "time":  "18:23",
        "customerName":  "Tezgâh",
        "itemsSummary":  "4x Felix Yaş Mama 4 lü (130.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789313014268,
                              "name":  "Felix Yaş Mama 4 lü",
                              "category":  "Kedi",
                              "price":  130,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  4,
                              "customPrice":  130
                          }
                      ],
        "total":  520,
        "vatTotal":  86.67,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  520,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789312208816,
        "date":  "13.09.2026",
        "time":  "18:10",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Taşıma çantası yan (1400.00 ₺), 1x AÇIK Royal Canın kitten 1 kg (620.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789312176356,
                              "name":  "Taşıma çantası yan",
                              "category":  "Kedi",
                              "price":  1400,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  1400
                          },
                          {
                              "id":  1789142185625,
                              "name":  "AÇIK Royal Canın kitten 1 kg",
                              "category":  "Açık Mama",
                              "price":  620,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  620
                          }
                      ],
        "total":  2020,
        "vatTotal":  336.67,
        "paymentType":  "Havale / IBAN",
        "splitCash":  0,
        "splitCard":  0,
        "splitTransfer":  2020,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789310696594,
        "date":  "13.09.2026",
        "time":  "17:44",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x reflex kısır somon 10 kg kısır (2400.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789310689344,
                              "name":  "reflex kısır somon 10 kg kısır",
                              "category":  "Kedi",
                              "price":  2400,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  2400
                          }
                      ],
        "total":  2400,
        "vatTotal":  400,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  2400,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789310646441,
        "date":  "13.09.2026",
        "time":  "17:44",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Motto Kedi Yaş Mama 3 Tane (160.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788881627839,
                              "name":  "Motto Kedi Yaş Mama 3 Tane",
                              "category":  "Kedi",
                              "price":  160,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  160
                          }
                      ],
        "total":  160,
        "vatTotal":  26.67,
        "paymentType":  "Nakit",
        "splitCash":  160,
        "splitCard":  0,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789310638983,
        "date":  "13.09.2026",
        "time":  "17:43",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x AÇIK Royal Canin Kısır 1 kg (600.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788856842402,
                              "name":  "AÇIK Royal Canin Kısır 1 kg",
                              "category":  "Açık Mama",
                              "price":  600,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  600
                          }
                      ],
        "total":  600,
        "vatTotal":  100,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  600,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789305383786,
        "date":  "13.09.2026",
        "time":  "16:16",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x AÇIK proplan kısır somon 1 kg (600.00 ₺), 1x wanpy köpek maması 1.5 kilo biftek (850.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788935718224,
                              "name":  "AÇIK proplan kısır somon 1 kg",
                              "category":  "Açık Mama",
                              "price":  600,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  600
                          },
                          {
                              "id":  1789305376071,
                              "name":  "wanpy köpek maması 1.5 kilo biftek",
                              "category":  "Köpek",
                              "price":  850,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  850
                          }
                      ],
        "total":  1450,
        "vatTotal":  241.67,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  1450,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789304700113,
        "date":  "13.09.2026",
        "time":  "16:05",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Pro Plan kısır somon 1.5 kg (1425.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789304689846,
                              "name":  "Pro Plan kısır somon 1.5 kg",
                              "category":  "Kedi",
                              "price":  1425,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  1425
                          }
                      ],
        "total":  1425,
        "vatTotal":  237.5,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  1425,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789304655617,
        "date":  "13.09.2026",
        "time":  "16:04",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Nutri Canin Doğal Kuzu Etli Küp Köpek Ödülü (0.00 ₺)",
        "soldItems":  [
                          {
                              "id":  168,
                              "name":  "Nutri Canin Doğal Kuzu Etli Küp Köpek Ödülü",
                              "category":  "Köpek",
                              "price":  0,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  1,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  0
                          }
                      ],
        "total":  0,
        "vatTotal":  0,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  0,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789304643607,
        "date":  "13.09.2026",
        "time":  "16:04",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x AÇIK proplan köpek kuzu 1 kg (480.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788957875508,
                              "name":  "AÇIK proplan köpek kuzu 1 kg",
                              "category":  "Açık Mama",
                              "price":  480,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  480
                          }
                      ],
        "total":  480,
        "vatTotal":  80,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  480,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789304544512,
        "date":  "13.09.2026",
        "time":  "16:02",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Nutri Canin Doğal Ördekli ve Pres Derili Yüksek Proteinli Köpek Ödülü (240.00 ₺)",
        "soldItems":  [
                          {
                              "id":  122,
                              "name":  "Nutri Canin Doğal Ördekli ve Pres Derili Yüksek Proteinli Köpek Ödülü",
                              "category":  "Köpek",
                              "price":  0,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  240
                          }
                      ],
        "total":  240,
        "vatTotal":  40,
        "paymentType":  "Nakit",
        "splitCash":  240,
        "splitCard":  0,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789304521645,
        "date":  "13.09.2026",
        "time":  "16:02",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Nutri Köpek yaş mama 400 gr (270.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789233619229,
                              "name":  "Nutri Köpek yaş mama 400 gr",
                              "category":  "Köpek",
                              "price":  270,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  270
                          }
                      ],
        "total":  270,
        "vatTotal":  45,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  270,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789234267035,
        "date":  "12.09.2026",
        "time":  "20:31",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Royal Canın karışık (4070.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789234248822,
                              "name":  "Royal Canın karışık",
                              "category":  "Köpek",
                              "price":  4070,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  4070
                          }
                      ],
        "total":  4070,
        "vatTotal":  678.33,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  4070,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789234071508,
        "date":  "12.09.2026",
        "time":  "20:27",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Motto Kedi Yaş Mama 3 Tane (150.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788881627839,
                              "name":  "Motto Kedi Yaş Mama 3 Tane",
                              "category":  "Kedi",
                              "price":  160,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  150
                          }
                      ],
        "total":  150,
        "vatTotal":  25,
        "paymentType":  "Nakit",
        "splitCash":  150,
        "splitCard":  0,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789234014399,
        "date":  "12.09.2026",
        "time":  "20:26",
        "customerName":  "Tezgâh",
        "itemsSummary":  "6x Motto Köpek yaş mama 400gr (55.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789233694327,
                              "name":  "Motto Köpek yaş mama 400gr",
                              "category":  "Köpek",
                              "price":  60,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  6,
                              "customPrice":  55
                          }
                      ],
        "total":  330,
        "vatTotal":  55,
        "paymentType":  "Nakit",
        "splitCash":  330,
        "splitCard":  0,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789233957679,
        "date":  "12.09.2026",
        "time":  "20:25",
        "customerName":  "Tezgâh",
        "itemsSummary":  "3x Motto Köpek yaş mama 400gr (60.00 ₺), 1x wanpy kemik 7 li (250.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789233694327,
                              "name":  "Motto Köpek yaş mama 400gr",
                              "category":  "Köpek",
                              "price":  60,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  3,
                              "customPrice":  60
                          },
                          {
                              "id":  1789233944278,
                              "name":  "wanpy kemik 7 li",
                              "category":  "Köpek",
                              "price":  250,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  250
                          }
                      ],
        "total":  430,
        "vatTotal":  71.67,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  430,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789233812105,
        "date":  "12.09.2026",
        "time":  "20:23",
        "customerName":  "Tezgâh",
        "itemsSummary":  "3x Motto Köpek yaş mama 400gr (60.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789233694327,
                              "name":  "Motto Köpek yaş mama 400gr",
                              "category":  "Köpek",
                              "price":  60,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  3,
                              "customPrice":  60
                          }
                      ],
        "total":  180,
        "vatTotal":  30,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  180,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789233759600,
        "date":  "12.09.2026",
        "time":  "20:22",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x AÇIK Royal Canin Kısır 1 kg (600.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788856842402,
                              "name":  "AÇIK Royal Canin Kısır 1 kg",
                              "category":  "Açık Mama",
                              "price":  600,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  600
                          }
                      ],
        "total":  600,
        "vatTotal":  100,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  600,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789233721698,
        "date":  "12.09.2026",
        "time":  "20:22",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Motto Köpek yaş mama 400gr (60.00 ₺), 1x Nutri Köpek yaş mama 400 gr (270.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789233694327,
                              "name":  "Motto Köpek yaş mama 400gr",
                              "category":  "Köpek",
                              "price":  60,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  60
                          },
                          {
                              "id":  1789233619229,
                              "name":  "Nutri Köpek yaş mama 400 gr",
                              "category":  "Köpek",
                              "price":  270,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  270
                          }
                      ],
        "total":  330,
        "vatTotal":  55,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  330,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789222354910,
        "date":  "12.09.2026",
        "time":  "17:12",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Reflex Plus Jöleli Somonlu ve Ton Balıklı Yetişkin Kedi Konservesi (45.00 ₺)",
        "soldItems":  [
                          {
                              "id":  67,
                              "name":  "Reflex Plus Jöleli Somonlu ve Ton Balıklı Yetişkin Kedi Konservesi",
                              "category":  "Kedi",
                              "price":  0,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  45
                          }
                      ],
        "total":  45,
        "vatTotal":  7.5,
        "paymentType":  "Nakit",
        "splitCash":  45,
        "splitCard":  0,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789221014433,
        "date":  "12.09.2026",
        "time":  "16:50",
        "customerName":  "Tezgâh",
        "itemsSummary":  "8x wampy tekli hüptürük (25.00 ₺), 5x nutri feline TonBalığı\u0026tavuk\u0026ciğer yaş mama (65.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788935901980,
                              "name":  "wampy tekli hüptürük",
                              "category":  "Kedi",
                              "price":  25,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  8,
                              "customPrice":  25
                          },
                          {
                              "id":  1789111205953,
                              "name":  "nutri feline TonBalığı\u0026tavuk\u0026ciğer yaş mama",
                              "category":  "Kedi",
                              "price":  65,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  5,
                              "customPrice":  65
                          }
                      ],
        "total":  525,
        "vatTotal":  87.5,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  525,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789220954814,
        "date":  "12.09.2026",
        "time":  "16:49",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x AÇIK Micho 1 kg (165.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788868067469,
                              "name":  "AÇIK Micho 1 kg",
                              "category":  "Açık Mama",
                              "price":  165,
                              "cost":  116,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  165
                          }
                      ],
        "total":  165,
        "vatTotal":  27.5,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  165,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789218308330,
        "date":  "12.09.2026",
        "time":  "16:05",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x AÇIK proplan kısır somon 1 kg (600.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788935718224,
                              "name":  "AÇIK proplan kısır somon 1 kg",
                              "category":  "Açık Mama",
                              "price":  600,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  600
                          }
                      ],
        "total":  600,
        "vatTotal":  100,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  600,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789216728144,
        "date":  "12.09.2026",
        "time":  "15:38",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x AÇIK mito tavuk 1 kg (160.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788973827325,
                              "name":  "AÇIK mito tavuk 1 kg",
                              "category":  "Açık Mama",
                              "price":  155,
                              "cost":  100,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  160
                          }
                      ],
        "total":  160,
        "vatTotal":  26.67,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  160,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789213462635,
        "date":  "12.09.2026",
        "time":  "14:44",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Akkum Kalın Kokusuz 10 kg (340.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788867786593,
                              "name":  "Akkum Kalın Kokusuz 10 kg",
                              "category":  "Kum / Kozmetik",
                              "price":  340,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  340
                          }
                      ],
        "total":  340,
        "vatTotal":  56.67,
        "paymentType":  "Nakit",
        "splitCash":  340,
        "splitCard":  0,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789212604856,
        "date":  "12.09.2026",
        "time":  "14:30",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Kiki Excellent Yasemin Kokulu Kedi Kumu Koku Giderici (35.00 ₺)",
        "soldItems":  [
                          {
                              "id":  144,
                              "name":  "Kiki Excellent Yasemin Kokulu Kedi Kumu Koku Giderici",
                              "category":  "Kum / Kozmetik",
                              "price":  0,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  35
                          }
                      ],
        "total":  35,
        "vatTotal":  5.83,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  35,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789212580168,
        "date":  "12.09.2026",
        "time":  "14:29",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Loi Life Aktif Karbonlu Yeni Nesil Topaklanan Kedi Kumu (350.00 ₺)",
        "soldItems":  [
                          {
                              "id":  174,
                              "name":  "Loi Life Aktif Karbonlu Yeni Nesil Topaklanan Kedi Kumu",
                              "category":  "Kum / Kozmetik",
                              "price":  350,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  350
                          }
                      ],
        "total":  350,
        "vatTotal":  58.33,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  350,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789212570479,
        "date":  "12.09.2026",
        "time":  "14:29",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Akkum İnce Kokusuz 10 kg (340.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788867546787,
                              "name":  "Akkum İnce Kokusuz 10 kg",
                              "category":  "Kum / Kozmetik",
                              "price":  340,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  340
                          }
                      ],
        "total":  340,
        "vatTotal":  56.67,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  340,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789210380380,
        "date":  "12.09.2026",
        "time":  "13:53",
        "customerName":  "Tezgâh",
        "itemsSummary":  "12x Royal Canın \u0027\u0027s\u0027\u0027 mini yaş mama (80.00 ₺), 9x Enjoy Soslu Kuzu Parçalı Yetişkin Kedi Konservesi (85 gr) (35.00 ₺), 1x Pro Plan köpek hindili 400 gr konserve (25.00 ₺), 4x Royal Canin Maxi Yetişkin Büyük Irk Köpek Maması (15 Ay Üzeri) (230.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789210002102,
                              "name":  "Royal Canın \u0027\u0027s\u0027\u0027 mini yaş mama",
                              "category":  "Kedi",
                              "price":  80,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  12,
                              "customPrice":  80
                          },
                          {
                              "id":  164,
                              "name":  "Enjoy Soslu Kuzu Parçalı Yetişkin Kedi Konservesi (85 gr)",
                              "category":  "Kedi",
                              "price":  0,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  9,
                              "customPrice":  35
                          },
                          {
                              "id":  1789210117673,
                              "name":  "Pro Plan köpek hindili 400 gr konserve",
                              "category":  "Köpek",
                              "price":  250,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  25
                          },
                          {
                              "id":  186,
                              "name":  "Royal Canin Maxi Yetişkin Büyük Irk Köpek Maması (15 Ay Üzeri)",
                              "category":  "Köpek",
                              "price":  0,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  4,
                              "customPrice":  230
                          }
                      ],
        "total":  2220,
        "vatTotal":  370,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  2220,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789205669111,
        "date":  "12.09.2026",
        "time":  "12:34",
        "customerName":  "Tezgâh",
        "itemsSummary":  "2x Dreamies Ördekli Kedi Ödülü (75.00 ₺)",
        "soldItems":  [
                          {
                              "id":  2,
                              "name":  "Dreamies Ördekli Kedi Ödülü",
                              "category":  "Kedi",
                              "price":  75,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  2,
                              "customPrice":  75
                          }
                      ],
        "total":  150,
        "vatTotal":  25,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  150,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789203687020,
        "date":  "12.09.2026",
        "time":  "12:01",
        "customerName":  "Tezgâh",
        "itemsSummary":  "10x Tekli Kemik (10.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788880048112,
                              "name":  "Tekli Kemik",
                              "category":  "Köpek",
                              "price":  10,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  10,
                              "customPrice":  10
                          }
                      ],
        "total":  100,
        "vatTotal":  16.67,
        "paymentType":  "Nakit",
        "splitCash":  100,
        "splitCard":  0,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  false
    },
    {
        "id":  1789203670636,
        "date":  "12.09.2026",
        "time":  "12:01",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x crocus 30 lu karışık kedi ödülü (680.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789203654555,
                              "name":  "crocus 30 lu karışık kedi ödülü",
                              "category":  "Kedi",
                              "price":  680,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  680
                          }
                      ],
        "total":  680,
        "vatTotal":  113.33,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  680,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789148043556,
        "date":  "11.09.2026",
        "time":  "20:34",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Akkum İnce Sabun Kokulu 10 kg (340.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788867570255,
                              "name":  "Akkum İnce Sabun Kokulu 10 kg",
                              "category":  "Kum / Kozmetik",
                              "price":  340,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  1,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  340
                          }
                      ],
        "total":  340,
        "vatTotal":  56.67,
        "paymentType":  "Nakit",
        "splitCash":  340,
        "splitCard":  0,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789146670718,
        "date":  "11.09.2026",
        "time":  "20:11",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x AÇIK Royal Canın kitten 1 kg (620.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789142185625,
                              "name":  "AÇIK Royal Canın kitten 1 kg",
                              "category":  "Açık Mama",
                              "price":  620,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  620
                          }
                      ],
        "total":  620,
        "vatTotal":  103.33,
        "paymentType":  "Nakit",
        "splitCash":  620,
        "splitCard":  0,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789146266758,
        "date":  "11.09.2026",
        "time":  "20:04",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x AÇIK mito tavuk 1 kg (155.00 ₺), 1x AÇIK Micho 1 kg (165.00 ₺), 1x Motto Kedi Yaş Mama 3 Tane (160.00 ₺), 1x AÇIK mito mix 1 kg (160.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788973827325,
                              "name":  "AÇIK mito tavuk 1 kg",
                              "category":  "Açık Mama",
                              "price":  155,
                              "cost":  100,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  155
                          },
                          {
                              "id":  1788868067469,
                              "name":  "AÇIK Micho 1 kg",
                              "category":  "Açık Mama",
                              "price":  165,
                              "cost":  116,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  165
                          },
                          {
                              "id":  1788881627839,
                              "name":  "Motto Kedi Yaş Mama 3 Tane",
                              "category":  "Kedi",
                              "price":  160,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  160
                          },
                          {
                              "id":  1788973852251,
                              "name":  "AÇIK mito mix 1 kg",
                              "category":  "Açık Mama",
                              "price":  160,
                              "cost":  110,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  160
                          }
                      ],
        "total":  640,
        "vatTotal":  106.67,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  640,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789145052922,
        "date":  "11.09.2026",
        "time":  "19:44",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x AÇIK proplan kısır somon 1 kg (600.00 ₺), 2x Garden Mix Kristal Kedi Kumu (275.00 ₺), 1x GimCat Malt-Soft Extra Profesyonel Tüy Yumağı Önleyici Kedi Macunu (650.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1788935718224,
                              "name":  "AÇIK proplan kısır somon 1 kg",
                              "category":  "Açık Mama",
                              "price":  600,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  600
                          },
                          {
                              "id":  32,
                              "name":  "Garden Mix Kristal Kedi Kumu",
                              "category":  "Kum / Kozmetik",
                              "price":  275,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  2,
                              "customPrice":  275
                          },
                          {
                              "id":  48,
                              "name":  "GimCat Malt-Soft Extra Profesyonel Tüy Yumağı Önleyici Kedi Macunu",
                              "category":  "Kedi",
                              "price":  650,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  650
                          }
                      ],
        "total":  1800,
        "vatTotal":  300,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  1800,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789144923875,
        "date":  "11.09.2026",
        "time":  "19:42",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x AÇIK N\u0026D kuzu kısır (1kg) (650.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789137388956,
                              "name":  "AÇIK N\u0026D kuzu kısır (1kg)",
                              "category":  "Açık Mama",
                              "price":  650,
                              "cost":  0,
                              "stock":  10,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  650
                          }
                      ],
        "total":  650,
        "vatTotal":  108.33,
        "paymentType":  "Havale / IBAN",
        "splitCash":  0,
        "splitCard":  0,
        "splitTransfer":  650,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789144597131,
        "date":  "11.09.2026",
        "time":  "19:36",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Royal Canın Kısır 2 kg (1500.00 ₺)",
        "soldItems":  [
                          {
                              "id":  1789144585642,
                              "name":  "Royal Canın Kısır 2 kg",
                              "category":  "Kedi",
                              "price":  1500,
                              "cost":  0,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  1500
                          }
                      ],
        "total":  1500,
        "vatTotal":  250,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  1500,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789144538781,
        "date":  "11.09.2026",
        "time":  "19:35",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Garden Mix Kristal Kedi Kumu (275.00 ₺)",
        "soldItems":  [
                          {
                              "id":  32,
                              "name":  "Garden Mix Kristal Kedi Kumu",
                              "category":  "Kum / Kozmetik",
                              "price":  275,
                              "cost":  0,
                              "supplier":  "-",
                              "vatRate":  20,
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  275
                          }
                      ],
        "total":  275,
        "vatTotal":  45.83,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  275,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    },
    {
        "id":  1789143187697,
        "date":  "11.09.2026",
        "time":  "19:13",
        "customerName":  "Tezgâh",
        "itemsSummary":  "1x Loi Life Aktif Karbonlu Yeni Nesil Topaklanan Kedi Kumu (350.00 ₺)",
        "soldItems":  [
                          {
                              "id":  174,
                              "name":  "Loi Life Aktif Karbonlu Yeni Nesil Topaklanan Kedi Kumu",
                              "category":  "Kum / Kozmetik",
                              "price":  350,
                              "cost":  0,
                              "vatRate":  20,
                              "stock":  0,
                              "supplier":  "-",
                              "batches":  [

                                          ],
                              "qty":  1,
                              "customPrice":  350
                          }
                      ],
        "total":  350,
        "vatTotal":  58.33,
        "paymentType":  "Kredi Kartı",
        "splitCash":  0,
        "splitCard":  350,
        "splitTransfer":  0,
        "splitCredit":  0,
        "isOfficial":  true
    }
];

const TURKISH_MONTHS = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];

function getMonthYearHeader(dateStr) {
  if (dateStr && typeof dateStr === "string" && dateStr.includes(".")) {
    const parts = dateStr.split(".");
    const m = parseInt(parts[1], 10) - 1;
    const y = parts[2];
    if (m >= 0 && m < 12) return `${TURKISH_MONTHS[m]} ${y}`;
  }
  const d = new Date();
  return `${TURKISH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Load from localStorage or use samples ──
function loadState() {
  const raw = k => {
    try {
      const v = localStorage.getItem(k);
      return (v && v !== "undefined" && v !== "null") ? JSON.parse(v) : null;
    } catch (e) {
      console.warn("Storage parse error:", k, e);
      return null;
    }
  };

  const CURRENT_CATALOG_VERSION = "2026_09_v13_aybars_all_products_297";
  const savedVer = localStorage.getItem("ps_catalog_version");
  let prods = raw("ps_products");

  const catalogSource = (window.catalogProducts && Array.isArray(window.catalogProducts) && window.catalogProducts.length > 0)
    ? window.catalogProducts
    : ((typeof catalogProducts !== "undefined" && Array.isArray(catalogProducts) && catalogProducts.length > 0)
      ? catalogProducts
      : (typeof sampleProducts !== "undefined" && Array.isArray(sampleProducts) ? sampleProducts : []));

  if (savedVer !== CURRENT_CATALOG_VERSION || !Array.isArray(prods) || prods.length < 100) {
    window.products = JSON.parse(JSON.stringify(catalogSource));
    window.products.forEach(p => {
      p.stock = (p.stock !== undefined && !isNaN(Number(p.stock))) ? Number(p.stock) : 0;
      p.vatRate = (p.vatRate !== undefined && !isNaN(Number(p.vatRate))) ? Number(p.vatRate) : 20;
      p.cost = Number(p.cost) || 0;
      p.price = Number(p.price) || 0;
      if (!Array.isArray(p.batches)) p.batches = [];
    });

    window.categories = [...defaultCategories];
    window.suppliers = [];
    window.customers = [];
    window.orders = [];
    window.platformPendingOrders = [];
    window.deliveredOrders = [];
    window.salesHistory = JSON.parse(JSON.stringify(sampleSalesHistory));
    window.expenses = JSON.parse(JSON.stringify(sampleExpenses));
    window.manualDeficits = [];
    window.heldCarts = [];
    window.bundles = [];
    window.wasteRecords = [];

    localStorage.setItem("ps_categories", JSON.stringify(window.categories));
    localStorage.setItem("ps_products", JSON.stringify(window.products));
    localStorage.setItem("ps_suppliers", JSON.stringify(window.suppliers));
    localStorage.setItem("ps_customers", JSON.stringify(window.customers));
    localStorage.setItem("ps_orders", JSON.stringify(window.orders));
    localStorage.setItem("ps_platform_pending", JSON.stringify(window.platformPendingOrders));
    localStorage.setItem("ps_delivered_orders", JSON.stringify(window.deliveredOrders));
    localStorage.setItem("ps_sales_history", JSON.stringify(window.salesHistory));
    localStorage.setItem("ps_expenses", JSON.stringify(window.expenses));
    localStorage.setItem("ps_deficits", JSON.stringify(window.manualDeficits));
    localStorage.setItem("ps_held_carts", JSON.stringify(window.heldCarts));
    localStorage.setItem("ps_bundles", JSON.stringify(window.bundles));
    localStorage.setItem("ps_waste_records", JSON.stringify(window.wasteRecords));
    localStorage.setItem("ps_catalog_version", CURRENT_CATALOG_VERSION);
  } else {
    window.products = (prods && prods.length > 0) ? prods : JSON.parse(JSON.stringify(catalogSource));
    const currentIdSet = new Set(window.products.map(p => String(p.id)));
    let hasNewInjected = false;
    catalogSource.forEach(cp => {
      if (!currentIdSet.has(String(cp.id))) {
        window.products.push(JSON.parse(JSON.stringify(cp)));
        currentIdSet.add(String(cp.id));
        hasNewInjected = true;
      }
    });
    if (hasNewInjected) {
      localStorage.setItem("ps_products", JSON.stringify(window.products));
    }
  }

  let cats = raw("ps_categories");
  window.categories = (Array.isArray(cats) && cats.length > 0) ? cats : [...defaultCategories];
  categories = window.categories;

  // Ensure product integrity & default values
  window.products.forEach(p => {
    if (p.vatRate === undefined || p.vatRate === null) p.vatRate = 20;
    else p.vatRate = Number(p.vatRate);
    if (!Array.isArray(p.batches)) p.batches = [];
    if (p.cost === undefined || p.cost === null) p.cost = 0;
    else p.cost = Number(p.cost);
    if (p.price === undefined || p.price === null) p.price = 0;
    else p.price = Number(p.price);
    if (p.stock === undefined || p.stock === null || isNaN(Number(p.stock))) p.stock = 0;
    else p.stock = Number(p.stock);
  });
  products = window.products;

  let sups = raw("ps_suppliers");
  window.suppliers = Array.isArray(sups) ? sups : [...sampleSuppliers];

  let custs = raw("ps_customers");
  window.customers = Array.isArray(custs) ? custs : [...sampleCustomers];

  let bnds = raw("ps_bundles");
  window.bundles = Array.isArray(bnds) ? bnds : [...sampleBundles];

  let waste = raw("ps_waste_records");
  window.wasteRecords = Array.isArray(waste) ? waste : [...sampleWaste];

  window.orders = raw("ps_orders") || [];
  window.platformPendingOrders = raw("ps_platform_pending") || [];
  window.deliveredOrders = raw("ps_delivered_orders") || [];

  let sls = raw("ps_sales_history");
  window.salesHistory = Array.isArray(sls) ? sls : [...sampleSalesHistory];

  let exp = raw("ps_expenses");
  window.expenses = Array.isArray(exp) ? exp : [...sampleExpenses];

  window.manualDeficits = raw("ps_deficits") || [];
  window.heldCarts = raw("ps_held_carts") || [];
  window.dailyCloseRecords = raw("ps_daily_closes") || [];

  // Runtime state
  window.cart = [];
  window.selectedCategory = "TÜMÜ";
  window.activeCollectCustId = null;
  window.activeHistorySupplierId = null;
  window.currentInvoiceBase64 = null;
  window.tempBundleItems = [];

  // Synchronize global variables
  categories = window.categories;
  products = window.products;
  suppliers = window.suppliers;
  customers = window.customers;
  bundles = window.bundles;
  wasteRecords = window.wasteRecords;
  orders = window.orders;
  platformPendingOrders = window.platformPendingOrders;
  deliveredOrders = window.deliveredOrders;
  salesHistory = window.salesHistory;
  expenses = window.expenses;
  manualDeficits = window.manualDeficits;
  heldCarts = window.heldCarts;
  dailyCloseRecords = window.dailyCloseRecords;
  cart = window.cart;
}

function saveData() {
  const pList = window.products || products || [];
  const cList = window.categories || categories || defaultCategories;
  const supList = window.suppliers || suppliers || [];
  const custList = window.customers || customers || [];
  const bndList = window.bundles || bundles || [];
  const wstList = window.wasteRecords || wasteRecords || [];
  const ordList = window.orders || orders || [];
  const pltList = window.platformPendingOrders || platformPendingOrders || [];
  const dlvList = window.deliveredOrders || deliveredOrders || [];
  const slsList = window.salesHistory || salesHistory || [];
  const expList = window.expenses || expenses || [];
  const defList = window.manualDeficits || manualDeficits || [];
  const hldList = window.heldCarts || heldCarts || [];
  const dclList = window.dailyCloseRecords || dailyCloseRecords || [];

  // Keep global sync
  products = pList;
  categories = cList;
  suppliers = supList;
  customers = custList;
  bundles = bndList;
  wasteRecords = wstList;
  orders = ordList;
  platformPendingOrders = pltList;
  deliveredOrders = dlvList;
  salesHistory = slsList;
  expenses = expList;
  manualDeficits = defList;
  heldCarts = hldList;
  dailyCloseRecords = dclList;

  localStorage.setItem("ps_categories", JSON.stringify(cList));
  localStorage.setItem("ps_products", JSON.stringify(pList));
  localStorage.setItem("ps_customers", JSON.stringify(custList));
  localStorage.setItem("ps_orders", JSON.stringify(ordList));
  localStorage.setItem("ps_platform_pending", JSON.stringify(pltList));
  localStorage.setItem("ps_delivered_orders", JSON.stringify(dlvList));
  localStorage.setItem("ps_sales_history", JSON.stringify(slsList));
  localStorage.setItem("ps_expenses", JSON.stringify(expList));
  localStorage.setItem("ps_deficits", JSON.stringify(defList));
  localStorage.setItem("ps_suppliers", JSON.stringify(supList));
  localStorage.setItem("ps_held_carts", JSON.stringify(hldList));
  localStorage.setItem("ps_bundles", JSON.stringify(bndList));
  localStorage.setItem("ps_waste_records", JSON.stringify(wstList));
  localStorage.setItem("ps_daily_closes", JSON.stringify(dclList));
}

function isDayClosed(dateStr) {
  const d = dateStr || nowDate();
  const list = window.dailyCloseRecords || dailyCloseRecords || [];
  return list.some(r => r.date === d);
}

function getTodayDailyCloseRecord(dateStr) {
  const d = dateStr || nowDate();
  const list = window.dailyCloseRecords || dailyCloseRecords || [];
  return list.find(r => r.date === d) || null;
}

if (typeof window !== "undefined") {
  window.isDayClosed = isDayClosed;
  window.getTodayDailyCloseRecord = getTodayDailyCloseRecord;
}

function sendToGoogleSheets(payload) {
  if (payload && !payload.supplierDebts && Array.isArray(window.suppliers)) {
    payload.supplierDebts = window.suppliers
      .filter(s => (s.balance || 0) > 0)
      .map(s => ({ name: s.name, balance: Number(s.balance || 0) }));
  }
  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(err => console.warn("Sheets sync error:", err));
}

// ── Global Resilient Product Finder (Supports Turkish casing, Barcodes, IDs, Substrings) ──
function findMatchingProduct(query) {
  if (!query || !Array.isArray(window.products)) return null;
  const q = String(query).trim();
  if (!q) return null;
  const qTr = q.toLocaleLowerCase('tr-TR');
  const qStd = q.toLowerCase();

  // 1. Exact match by name (Turkish locale)
  let found = window.products.find(p => p.name && p.name.trim().toLocaleLowerCase('tr-TR') === qTr);
  if (found) return found;

  // 2. Exact match by name (Standard locale fallback)
  found = window.products.find(p => p.name && p.name.trim().toLowerCase() === qStd);
  if (found) return found;

  // 3. Exact match by barcode
  found = window.products.find(p => p.barcode && String(p.barcode).trim() === q);
  if (found) return found;

  // 4. Exact match by ID
  found = window.products.find(p => p.id && String(p.id).trim() === q);
  if (found) return found;

  // 5. Query contains product name or product name contains query
  found = window.products.find(p => {
    if (!p.name) return false;
    const pTr = p.name.trim().toLocaleLowerCase('tr-TR');
    return (pTr.length >= 3 && qTr.length >= 3) && (qTr === pTr || qTr.startsWith(pTr) || pTr.startsWith(qTr));
  });
  if (found) return found;

  // 6. Barcode substring
  found = window.products.find(p => p.barcode && q.includes(String(p.barcode).trim()));
  if (found) return found;

  return null;
}

// ── Reset catalog to default 222 items helper ──
function forceReload222Products() {
  localStorage.removeItem("ps_products");
  localStorage.removeItem("ps_catalog_version");
  window.products = JSON.parse(JSON.stringify(catalogProducts));
  saveData();
  location.reload();
}

function resetToDefaultCatalog() {
  if (confirm("Tüm ürün listesini 222 ürünlük varsayılan orijinal listeye sıfırlamak istiyor musunuz?\n\n(DİKKAT: Sonradan girdiğiniz özel fiyat ve stoklar sıfırlanacaktır)")) {
    window.products = JSON.parse(JSON.stringify(sampleProducts));
    saveData();
    if (typeof renderCatalog === "function") renderCatalog();
    if (typeof renderInventoryTable === "function") renderInventoryTable();
    if (typeof renderQuickPricingTable === "function") renderQuickPricingTable();
    if (typeof toast === "function") toast("✅ Ürün kataloğu 222 ürünlük varsayılan listeye sıfırlandı!");
  }
}

// ── Helper to calculate Cash, Card, Transfer (Havale/IBAN) and Credit portions ──
function getSalePaymentBreakdown(sale) {
  if (!sale) return { cash: 0, card: 0, transfer: 0, credit: 0 };
  const total = Number(sale.total) || 0;

  if (typeof sale.splitCash === "number" || typeof sale.splitCard === "number" || typeof sale.splitTransfer === "number" || typeof sale.splitCredit === "number") {
    return {
      cash: Number(sale.splitCash) || 0,
      card: Number(sale.splitCard) || 0,
      transfer: Number(sale.splitTransfer) || 0,
      credit: Number(sale.splitCredit) || 0
    };
  }

  const pType = (sale.paymentType || "").toLowerCase();
  
  if (pType.includes("parçalı")) {
    let cash = 0, card = 0, transfer = 0;
    const cashMatch = pType.match(/([\d.,]+)\s*₺?\s*nakit/i);
    const cardMatch = pType.match(/([\d.,]+)\s*₺?\s*kart/i);
    const transferMatch = pType.match(/([\d.,]+)\s*₺?\s*(?:havale|eft|iban)/i);

    if (cashMatch) cash = parseFloat(cashMatch[1].replace(",", ".")) || 0;
    if (cardMatch) card = parseFloat(cardMatch[1].replace(",", ".")) || 0;
    if (transferMatch) transfer = parseFloat(transferMatch[1].replace(",", ".")) || 0;

    if (cash === 0 && card === 0 && transfer === 0) {
      card = total;
    }
    return { cash, card, transfer, credit: 0 };
  }

  if (pType.includes("nakit")) {
    return { cash: total, card: 0, transfer: 0, credit: 0 };
  }
  if (pType.includes("havale") || pType.includes("eft") || pType.includes("iban") || pType.includes("banka")) {
    return { cash: 0, card: 0, transfer: total, credit: 0 };
  }
  if (pType.includes("veresiye")) {
    return { cash: 0, card: 0, transfer: 0, credit: total };
  }
  if (pType.includes("platform") || pType.includes("online") || pType.includes("getir") || pType.includes("yemeksepeti")) {
    return { cash: 0, card: 0, transfer: 0, credit: 0, platform: total };
  }
  return { cash: 0, card: total, transfer: 0, credit: 0 };
}

/**
 * Ürünler ve kategoriler DIŞINDAKİ tüm operasyonel verileri sıfırlar:
 * - Müşteriler ve Veresiye Kayıtları
 * - Tedarikçiler ve Toptancı Borçları
 * - Satış Geçmişi, Ciro ve Siparişler
 * - Gider Defteri ve Harcamalar
 * - Gün Sonu Kasa Mutabakatları
 * - Askıdaki Sepetler ve Zayi Kayıtları
 */
function resetTransactionsKeepProducts() {
  const confirmed = confirm(
    "⚠️ DİKKAT: ÜRÜNLER (222 ÜRÜN) VE KATEGORİLER KORUNACAK!\n\n" +
    "Aşağıdaki tüm veriler tamamen sıfırlanacaktır:\n" +
    "• Müşteriler ve Veresiye Kayıtları\n" +
    "• Tedarikçiler ve Toptancı Borçları\n" +
    "• Satış Geçmişi, Ciro ve Siparişler\n" +
    "• Gider Defteri ve Harcamalar\n" +
    "• Gün Sonu Kasa Mutabakatları\n" +
    "• Askıdaki Sepetler ve Zayi Kayıtları\n\n" +
    "Bu sıfırlamayı onaylıyor musunuz?"
  );
  if (!confirmed) return;

  // 1. Müşteri & Veresiye sıfırla
  window.customers = [];
  customers = [];

  // 2. Tedarikçi & Toptancı borçları sıfırla
  window.suppliers = [];
  suppliers = [];

  // 3. Satışlar & Gelir geçmişi sıfırla
  window.salesHistory = [];
  salesHistory = [];

  // 4. Siparişler & Teslimatlar sıfırla
  window.orders = [];
  orders = [];
  window.platformPendingOrders = [];
  platformPendingOrders = [];
  window.deliveredOrders = [];
  deliveredOrders = [];

  // 5. Giderler & Alımlar sıfırla
  window.expenses = [];
  expenses = [];
  window.manualDeficits = [];
  manualDeficits = [];

  // 6. Gün Sonu Mutabakatları & Askıdaki sepetler sıfırla
  window.dailyCloseRecords = [];
  dailyCloseRecords = [];
  window.heldCarts = [];
  heldCarts = [];
  window.wasteRecords = [];
  wasteRecords = [];
  window.bundles = [];
  bundles = [];
  window.cart = [];
  cart = [];

  // 7. Aktif iş gününü sıfırla
  localStorage.removeItem("ps_active_business_date");

  // 8. Kalıcı depolamaya kaydet (Ürünler ve kategoriler aynen korunur)
  saveData();

  // 9. E-Tablo Mali Raporu sıfır gönder
  if (typeof syncTaxReportToSheets === "function") {
    syncTaxReportToSheets();
  }

  alert("✅ Tüm müşteri, tedarikçi, gelir, gider ve kasa kayıtları başarıyla sıfırlandı!\n\nÜrünler ve kategoriler eksiksiz olarak korundu.");
  location.reload();
}
window.resetTransactionsKeepProducts = resetTransactionsKeepProducts;


