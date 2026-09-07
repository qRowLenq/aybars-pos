/* ===================================================================
   STATE MANAGEMENT — localStorage + Sample Data
   =================================================================== */

// Global variables for universal compatibility
var defaultCategories = ["Kedi", "Köpek", "Kuş / Kemirgen", "Açık Mama", "Kum / Kozmetik", "Kampanyalar"];
var categories = [...defaultCategories];
var products = [];
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

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx_l1PLYUVmHL6dqnholoKke2JsTx56FScjd4qa6veqcoK49ztzLqggwp9M7uze10sU/exec";

// ── Products Database (222 Ürünlük Güncel Liste) ──
const catalogProducts = [
  { id: 1, name: "Royalist Puppy Shampoo Yavru Köpek Şampuanı (Pudra Kokulu)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 2, name: "Dreamies Kabartan Ördekli Kedi Ödülü", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 3, name: "Muhabbet Kuşu Yemi (500 gr)", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 4, name: "Doğal Kuru Yonca (350 gr)", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 5, name: "BioFeline Derma Paste Prebiotic", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 6, name: "Royalist Disposable Köpek Külotu (XS - Extra Small)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 7, name: "NutriSuper Bird Multi Vitamin", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 8, name: "Garden Mix Deri Burgu Çubuk Köpek Ödülü (5-100 adet)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 9, name: "Garden Mix Somon Ezmeli Kedi Ödülü (Tasty Paste)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 10, name: "LuckyPaw Air Mesh Harness (Göğüs Tasması)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 11, name: "Royal Canin Kitten Kuru Kedi Maması", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 12, name: "Garden Mix Kurutulmuş Köpek Ödülü Dana İşkembe (100 gr)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 13, name: "Garden Mix Paraketler İçin Tam Yem (500 gr)", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 14, name: "Garden Mix Cennet & Sultan Papağan Yemi (500 gr)", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 15, name: "Kiki Excellent Multi Vitamin Paste Professional", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 16, name: "Garden Mix Karides Ezmeli Kedi Ödülü (Tasty Paste)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 17, name: "Felicia Hypoallergenic Adult Skin & Coat Support Salmon (Deneme Ürünü)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 18, name: "Crocus Cat Cream Somonlu & Karidesli Krema Kedi Ödülü", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 19, name: "Crocus Cat Cream Yengeçli Krema Kedi Ödülü", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 20, name: "BioFeline Kitten Derma Paste Prebiotic", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 21, name: "BioFeline Malt Paste Prebiyotik Tüy Yumağı Atılımı Destekleyici", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 22, name: "Advance Active Defense Sterilized Adult Cat Food (Turkey)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 23, name: "Garden Mix Kuzu Eti Ezmeli Köpek Ödülü (Tasty Paste)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 24, name: "Serypet Pet Hair Remover", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 25, name: "Garden Mix Somonlu Dolgulu Çıtır Kedi Ödülü", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 26, name: "High-Protein Knotted Bone Düğüm Kemik (36 cm, 15 adet)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 27, name: "High-Protein Pressed Bone Preslenmiş Kemik (22 cm)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 28, name: "Royal Canin Starter Mother & Babydog (1-2 months) Mousse", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 29, name: "Garden Mix Ton Balığı Ezmeli Kedi Ödülü (Tasty Paste)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 30, name: "Garden Mix Kanaryalar İçin Tam Yem (500 gr)", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 31, name: "Crocus Cat Cream Ton Balıklı Krema Kedi Ödülü", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 32, name: "Garden Mix Crystal Litter Kristal Kedi Kumu", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 33, name: "NaturaPel by Trope Cat & Dog Cleaning Wet Wipes (100 adet)", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 34, name: "BioFeline Move Tablet Glucosamine", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 35, name: "BioFeline Microbi Liquid Probiotic", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 36, name: "Royalist Disposable Köpek Külotu (M - Medium / L - Large)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 37, name: "High-Protein White Bone XL Preslenmiş Kemik (27 cm)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 38, name: "Advance Active Defense Sterilized Cat Food (Salmon)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 39, name: "Hill's Science Diet Sensitive Care Digestive Wellbeing", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 40, name: "Advance Active Defense Adult Mini Dog Food (Chicken, 1-10 kg)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 41, name: "Garden Mix Sığır Derisi Halka (Cowhide Rings)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 42, name: "Purina Gourmet Gold Hindi Etli Kıyılmış Yaş Kedi Maması", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 43, name: "Garden Mix Stick Crackers Budgies Muhabbet Kuşu Krakeri", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 44, name: "Purina Pro Plan Small & Mini Adult Sensitive Skin Salmon", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 45, name: "Pedigree Biscrok Multi Mix Köpek Bisküvisi", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 46, name: "Garden Mix Hamsterlar İçin Tam Yem (1000 gr)", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 47, name: "Büyük Tavşan Yemi (750 gr)", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 48, name: "GimCat Malt-Soft Extra Professional Pasta Anti-Hairball", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 49, name: "GimCat Multi-Vitamin Professional Pasta", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 50, name: "SupraVet Hairball Anti Malt Soft Paste", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 51, name: "Garden Mix Yetişkin Muhabbet Kuşları İçin Tam Yem (500 gr)", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 52, name: "Purina Pro Plan All Size Everyday Nutrition Turkey in Jelly", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 53, name: "Advance Active Defense Sensitive Care Mini Dog Food (Salmon, 1-10 kg)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 54, name: "Garden Mix Tavşanlar İçin Tam Yem (1000 gr)", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 55, name: "My Cat Original Natural Çam Pelleti Kedi Kumu", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 56, name: "Advance Active Defense Hairball Weight Control Cat Food", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 57, name: "Purina Gourmet Gold Ton Balıklı Kıyılmış Yaş Kedi Maması", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 58, name: "Reflex Kitten Cat Food With Chicken Chunks in Gravy (400 gr)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 59, name: "Quik Freshwater Salt", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 60, name: "Quik Terry Derma Bit Spreyi (200 ml)", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 61, name: "Quik Banyo Spreyi", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 62, name: "Garden Mix Ton Balıklı & Tavuklu Dolgulu Çıtır Kedi Ödülü", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 63, name: "Felicia Chunks in Gravy Kedi Maması", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 64, name: "Garden Mix Tavuklu Dolgulu Çıtır Kedi Ödülü", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 65, name: "Pro Line Baby Powder %100 Natural Bentonit Clumping Cat Litter", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 66, name: "Nutri Super Bird Multi Vitamin", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 67, name: "Reflex Plus Chunks in Jelly With Salmon & Tuna Adult Cat Food", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 68, name: "Reflex Meaty Sticks With Game & Goose", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 69, name: "Reflex Meaty Sticks With Chicken", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 70, name: "Crocus Cat Cream Karidesli Krema Kedi Ödülü", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 71, name: "Reflex Plus Meaty Sticks With Lamb Grain Free Adult Dog Treat", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 72, name: "Wanpy Meaty Sticks", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 73, name: "Royal Canin Hair & Skin Care Cat Food", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 74, name: "BioFeline Fish Oil Omega 3 ve Omega 6", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 75, name: "BioFeline Sterile Paste Prebiyotik Kısırlaştırılmış Kediler İçin Macun", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 76, name: "Reflex Plus Meaty Sticks for Adult Dogs with Beef", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 77, name: "Fresh Paty Health Indicator Kedi Kumu Deodorantı", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 78, name: "Royal Canin Chihuahua Adult Dog Food", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 79, name: "Royal Canin Yorkshire Terrier Adult Dog Food", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 80, name: "Garden Mix Somonlu & Ördekli Dolgulu Çıtır Kedi Ödülü", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 81, name: "Dreamies Nefis Somon Aromalı Kedi Ödülü", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 82, name: "High-Protein Knotted Bone %100 Sığır Doğal Düğüm Kemik", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 83, name: "Les Repas Plaisir Care Urinary Support Kedi Maması", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 84, name: "Purina Gourmet Gold Tavuklu Kıyılmış Konserve Kedi Maması", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 85, name: "Garden Mix Ton Balıklı Dolgulu Çıtır Kedi Ödülü", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 86, name: "Kiki Excellent Pudra Kokulu Koku Giderici (Odor Remover)", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 87, name: "Wanpy Wet Food Tasty Meat Paste Tuna, Chicken & Carrot", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 88, name: "Dreamies Kabartan Ördekli Kedi Ödülü (Mavi Paket)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 89, name: "Garden Mix Ördekli Dolgulu Çıtır Kedi Ödülü", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 90, name: "Reflex Plus Chunks in Gravy With White Fish Adult Cat Food", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 91, name: "Reflex Plus Chunks in Jelly With Tuna & Trout Adult Cat Food", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 92, name: "Reflex Plus Chunks in Gravy With Lamb Adult Cat Food", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 93, name: "Dreamies Lezzetli Somon Aromalı ve Enfes Peynirli Kedi Ödülü", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 94, name: "Pedigree Dentastix Daily Oral Care (10-25 kg)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 95, name: "Royal Canin Starter Mother & Babydog Mini Adult (Up to 10 kg)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 96, name: "Akyar Ameliyat Sonrası Kedi Kıyafeti", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 97, name: "Reflex Plus Chunks in Gravy With Chicken Adult Cat Food", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 98, name: "SupraVet Professional Anti Hairball Malt Soft Paste", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 99, name: "Advance Active Defense Sensitive Care Medium-Maxi Dog Food (Salmon, +10 kg)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 100, name: "Pikare Chunks in Gravy Kuzu Etli Yetişkin Köpek Maması", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 101, name: "Reflex Plus Sterilised Chunks in Jelly With Beef Adult Cat Food", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 102, name: "Reflex Plus Meaty Sticks With Duck & Geese Grain Free", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 103, name: "Felicia Starter Care & Starter Support Kitten Chicken", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 104, name: "Purina Pro Plan Hydra Care Feline Hydration", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 105, name: "Reflex Puppy Food Lamb (Kuzu Etli Yavru Köpek Maması, 1 kg)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 106, name: "Reflex Compact Unscented Cat Litter (10 kg)", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 107, name: "Matth Yetişkin Kedi Maması Tavuklu Chunks in Gravy", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 108, name: "NutriCanin Grain Free Lamb & Beef Complete Food for Dogs (400 gr)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 109, name: "Garden Mix Ördekli Kedi Çorbası (Cat Soup, 40 gr)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 110, name: "Kitten Genius Rewards Grain Free Chicken and Pomegranate Recipe", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 111, name: "NutriCanin Grain Free Wild Boar Hypoallergenic Adult Dog Food", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 112, name: "Advance Active Defense Adult Cat Food (Chicken, 1-10 years)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 113, name: "Reflex Chunks in Gravy Kitten Food With Lamb (185 gr)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 114, name: "Advance Active Defense Kitten Food (Chicken, 2-12 months)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 115, name: "Purina Pro Plan Medium Sensitive Skin Puppy Food", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 116, name: "Kiki Excellent Lavanta Kokulu Koku Giderici (Odor Remover)", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 117, name: "Wanpy Grain-Free Complete Food Chicken with Oven Baked Bites (1.5 kg)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 118, name: "Dreamies Shakeups Multivitamin Meeresfrüchte Kedi Ödülü", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 119, name: "Pedigree Dentastix Daily Oral Care (Large Dog, 5-10 kg)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 120, name: "Fresh Paty Indicator pH Göstergeli Kedi Kumu", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 121, name: "Quik Extra Calcium Cuttlefish Bone (Mürekkep Balığı Kemiği)", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 122, name: "Nutri canin All Natural Duck & Rawhide Rich in Protein Dog Treat", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 123, name: "Wanpy Creamy Treat Tuna & Shrimp", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 124, name: "Garden Mix Tavuklu Kedi Çorbası (Cat Soup, 40 gr)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 125, name: "Purina Pro Plan Small & Mini Adult Sensitive Digestion", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 126, name: "Garden Mix Somonlu Kedi Çorbası (Cat Soup, 40 gr)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 127, name: "Super Premium Qualität Kitten Mit Frischem Lachs (2 kg)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 128, name: "Wanpy Creamy Treat Duck & Chicken (5 Pack)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 129, name: "Wanpy Creamy Treat Salmon & Chicken (5 Pack)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 130, name: "Nutri Feline Natural Cat Snack Salmon (50 gr)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 131, name: "Advance Active Defense Light Medium Satiating Effect (10-30 kg)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 132, name: "Wanpy Wet Food Lamb, Chicken, Duck, Carrot & Pea Tasty Meat Paste", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 133, name: "BioFeline Plus+B Multivitamin + Biotin Anti Hair Loss Support", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 134, name: "Garden Mix Pick Stone Tüm Kuşlar İçin Gaga Taşı", category: "Kuş / Kemirgen", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 135, name: "BioFeline Probio Liquid Probiotic Digestive System Support", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 136, name: "Quik Natural Grass Kedi Çimi (Koruyucu File Hediyeli)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 137, name: "Wanpy Creamy Treat Codfish & Chicken Hairball Control", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 138, name: "Nutri Feline Natural Cat Snack Lamb + Catnip Added", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 139, name: "Nutri Canin All Natural Lamb & Rawhide Immunity Support", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 140, name: "Motta Yetişkin Köpek Maması Dana Etli Chunks in Gravy", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 141, name: "Kiki Excellent Okyanus Esintisi Koku Giderici", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 142, name: "Purina Pro Plan Medium Puppy Sensitive Digestion Lamb", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 143, name: "Reflex Plus Meaty Sticks With Salmon", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 144, name: "Kiki Excellent Yasemin Kokulu Koku Giderici", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 145, name: "Matth Yetişkin Kedi Maması Kuzu Etli Chunks in Gravy", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 146, name: "Nutri Feline Natural Cat Snack Chicken & Fish Sandwich (50 gr)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 147, name: "Acana Indoor Entrée Adult Indoor Cat / Sterilized (Chicken with Herring)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 148, name: "SupraVet Professional Pet Care Training Pads (60 x 90 cm, 30 Piece)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 149, name: "Slim Cat Litter Lavender Scented", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 150, name: "Purina Gourmet Gold Sığır Etli Pelerinli/Soslu Yaş Kedi Maması", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 151, name: "Wanpy Creamy Treat Tuna & Shrimp (5 Pack)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 152, name: "Enjoy Chunks in Gravy Chicken Adult Cat Food (85 gr)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 153, name: "Wanpy Urinary Care Creamy Treat Duck & Chicken", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 154, name: "Nutri Canin Lamb & Collagen Stick (80 gr)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 155, name: "Nutri Canin Duck & Collagen Stick (80 gr)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 156, name: "Felicia Derma+ Care Skin & Coat Support Adult Salmon & Potato", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 157, name: "Felicia Adult Hypoallergenic Kuzu Etli Kedi Maması (1 kg)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 158, name: "Nutri Canin Grain Free Beef Hypoallergenic Adult Dog Food", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 159, name: "Reflex Plus Chunks in Gravy With Duck & Rabbit Adult Cat Food", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 160, name: "Royal Canin Mother & Babycat (1-4 months) Ultra Soft Mousse", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 161, name: "Royalist Perfume For Pets", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 162, name: "SupraVet Professional Pupil Biotine + Zinc Omega 3", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 163, name: "Les Repas Plaisir Chat Adulte & Stérilisé Au Cabillaud (with Cod)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 164, name: "Enjoy Chunks in Gravy With Lamb Adult Cat Food (85 gr)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 165, name: "Wanpy Soft Oven-Roasted Salmon & Fish Skin Dog Treat", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 166, name: "Nutri Canin Beef & Rawhide Immunity Support + Calcium Dog Treat", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 167, name: "Nutri canin Hypoallergenic Puppy Dog Grain Free Lamb", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 168, name: "Nutri Complementary Foods for Dogs Natural Dog Snack Lamb Cubes", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 169, name: "Wanpy Wet Food Tasty Meat Paste Duck, Chicken, Carrot & Pea", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 170, name: "Wanpy Wet Food Tasty Meat Paste Salmon, Chicken & Carrot", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 171, name: "Felicia Digestive System Support Adult Chicken", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 172, name: "Felicia Urinary System Support Sterilised Cat Food", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 173, name: "Ultra Premium Performance Low Grain Adult Sterilised Urinary Care Lamb & Salmon", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 174, name: "Loi Life Origin Ingredient New Generation Clumping Cat Litter Activated Carbon", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 175, name: "Wanpy Wet Food Tasty Meat Paste Tuna, Chicken & Carrot", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 176, name: "Wanpy Wet Food Tasty Meat Paste Duck & Pumpkin", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 177, name: "Wanpy Wet Food Tasty Meat Paste Chicken & Carrot", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 178, name: "Nutri In Complementary Foods for Dogs Beef & Collagen Stick", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 179, name: "Ranova Pet Treat Lollipop Freeze-Dried Chicken Recipe Pumpkin Flavor", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 180, name: "Royal Canin Mini Adult Loaf Mousse Morbido Paté (195 gr)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 181, name: "Garden Mix Dog Treat Tasty Meat Paste Duck, Carrot & Pea", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 182, name: "Eastland Matatabi Toys for Cats", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 183, name: "Hill's Science Plan Sterilised Kitten Development Support (Chicken)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 184, name: "Royal Canin Kitten Chunks in Gravy (85 gr)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 185, name: "Ranova Lollipop Freeze-Dried Pet Treat Mixed Flavor", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 186, name: "Royal Canin Size Health Nutrition Maxi Adult (Dogs over 15 months)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 187, name: "Royalist Pure Paws Paw Cleaner Foam For Pets With Aloe Vera", category: "Kum / Kozmetik", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 188, name: "Wanpy Creamy Treat Joint Support Beef (5 Pack)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 189, name: "Nutri Canin Duck & Collagen Stick Vitamin E Added", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 190, name: "Royal Canin Size Up To 10 kg Mini Adult Gravy", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 191, name: "Pedigree Jumbone Mini Sigir ve Kus Etli Dog Treat", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 192, name: "Royal Canin Sterilised Thin Slices in Gravy for Adult Cats", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 193, name: "Wanpy Skin & Coat Creamy Treat Tuna & Salmon (5 Pack)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 194, name: "Royal Canin Care Light Weight Thin Slices in Gravy", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 195, name: "Royal Canin Sterilised All Sizes Canine Care Nutrition Loaf", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 196, name: "Royal Canin Breed Health Nutrition Chihuahua Adult Mousse", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 197, name: "Ranova Pet Treat Lollipop Freeze-Dried Chicken Recipe Cranberry Flavor", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 198, name: "Felicia Sterilised With Chicken Adult Cat Food Grain Free", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 199, name: "Nutri Canin Lamb & Collagen Enriched with Pure Tendon Soft Stick", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 200, name: "Les Repas Plaisir Chien Adulte Au Poulet (with Chicken)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 201, name: "Ranova Pet Treat Lollipop Freeze-Dried Chicken Recipe Goat Milk Flavor", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 202, name: "Nutri canin Natural Dog Snack Duck Meat (80 gr)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 203, name: "Flexi Tape Style Medium (5 Meter, max. 25 kg) Otomatik Köpek Tasması", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 204, name: "Nutri Canin Natural Dog Snack Lamb Stripes (80 gr)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 205, name: "Les Repas Plaisir Care Intestinal Comfort Émincés au Poulet en Sauce", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 206, name: "Nutri Canin Dental Twist Lamb Vitamin E + Calcium Added", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 207, name: "Wanpy Crunchy Pockets Chicken with Soft Filling (60 gr)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 208, name: "Reflex Crunchy Bubbles Adult Cat Food Lamb", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 209, name: "Wanpy Grain-Free Complete Food Lamb with Oven Baked Bites", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 210, name: "Wanpy Kidney Health Creamy Treat Chicken & Veggies", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 211, name: "Nutri Canin Natural Dog Snack Beef Meat (80 gr)", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 212, name: "Wanpy Wet Food Tasty Meat Paste Lamb, Carrot & Pea", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 213, name: "Nutri Canin Duck & Collagen Grain Free Premium Quality Stick", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 214, name: "Felicia Kitten With Lamb In Jelly Grain Free", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 215, name: "Felicia Sterilised With Salmon In Jelly Grain Free", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 216, name: "Adult Dog Food Coat No Gluten Grain-Free Beef", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 217, name: "Les Repas Plaisir Chaton Kitten Au Poulet (with Chicken)", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 218, name: "Nutri Canin Dental Twist Beef + Catnip Added Grain Free", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 219, name: "Nutri Canin Dental Twist Duck Grain Free Dental Care", category: "Köpek", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 220, name: "Felicia Adult Grain Free With Salmon In Jelly", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 221, name: "Wanpy Kitten Food 100% Real Meat Stew Chicken & Duck in Gravy", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] },
  { id: 222, name: "Felicia Adult Grain Free With Lamb In Jelly", category: "Kedi", price: 0, cost: 0, vatRate: 20, stock: 1, supplier: "-", batches: [] }
];

const sampleProducts = catalogProducts;

const sampleBundles = [];

const sampleSuppliers = [
  { id: 201, name: "Marmara Pet Toptan", phone: "0532 100 2030", notes: "30 Gün vadeli çalışılır. Salı ve Perşembe sevkiyat.", balance: 5400, transactions: [{ id: 1001, date: "02.09.2026", time: "11:30", type: "Alım", item: "5 Koli Reflex Mama + 2 Çuval Açık Mama", amount: 5400, vatRate: 20, vatAmount: 900, status: "Açık Hesap (Borç)", invoiceImg: null }] },
  { id: 202, name: "Anadolu Mama Dağıtım", phone: "0544 200 4050", notes: "Royal Canin ve Pro Plan yetkili bayisi. 15 gün vade.", balance: 3200, transactions: [{ id: 1002, date: "01.09.2026", time: "14:15", type: "Alım", item: "Royal Canin Mini Adult + Fit 32 Paketleri", amount: 3200, vatRate: 20, vatAmount: 533.33, status: "Açık Hesap (Borç)", invoiceImg: null }] },
  { id: 203, name: "Ege Pet Depo", phone: "0533 300 5060", notes: "Kum ve kozmetik toptancısı. Peşinde %5 indirim.", balance: 0, transactions: [{ id: 1003, date: "28.08.2026", time: "16:00", type: "Alım", item: "30 Adet Reflex & Sanicat Kedi Kumu", amount: 4100, vatRate: 20, vatAmount: 683.33, status: "Peşin Ödendi", invoiceImg: null }] },
  { id: 204, name: "Kuzey Kuş & Pet", phone: "0536 400 6070", notes: "Kuş yemleri ve kemirgen ürünleri.", balance: 850, transactions: [{ id: 1004, date: "03.09.2026", time: "09:45", type: "Alım", item: "Kuş Yemleri ve Kemirgen Talaşları", amount: 850, vatRate: 20, vatAmount: 141.67, status: "Açık Hesap (Borç)", invoiceImg: null }] },
  { id: 205, name: "Balkan Akvaryum & Yem", phone: "0538 500 7080", notes: "Balık yemleri, akvaryum motorları.", balance: 0, transactions: [] },
  { id: 206, name: "Boğaziçi Tasma & Aksesuar", phone: "0530 600 8090", notes: "Deri tasmalar, kedi oyuncakları.", balance: 0, transactions: [] },
  { id: 207, name: "Lider Pet Dağıtım", phone: "0542 700 9010", notes: "Yaş mama ve konserve toptancısı.", balance: 0, transactions: [] },
  { id: 208, name: "İstanbul Vitamin & Sağlık", phone: "0546 800 1020", notes: "Malt macunları, eklem takviyeleri.", balance: 0, transactions: [] },
  { id: 209, name: "Trakya Çuval & Poşet", phone: "0552 900 2030", notes: "Dükkân sarf malzemeleri.", balance: 0, transactions: [] },
  { id: 210, name: "Güven Kedi & Köpek Yatakları", phone: "0535 010 3040", notes: "Peluş yataklar ve taşıma çantaları.", balance: 0, transactions: [] }
];

const sampleCustomers = [
  { id: 301, name: "Mehmet Demir", phone: "0535 999 8877", address: "İnönü Mah. Çiçek Sok. No:12 D:4", pet: "Tekir Kedi (Mişa)", balance: 380, purchaseHistory: [{ date: "03.09.2026", time: "15:20", items: "1x Reflex Kum + 2kg Açık Mama", total: 380, payment: "Veresiye" }] },
  { id: 302, name: "Ayşe Kaya", phone: "0555 444 3322", address: "Atatürk Cad. Lale Apt. No:5", pet: "Golden Retriever (Max)", balance: 0, purchaseHistory: [{ date: "04.09.2026", time: "18:00", items: "1x Royal Canin Mini Adult 8kg", total: 1450, payment: "Kredi Kartı" }] },
  { id: 303, name: "Ahmet Yıldız", phone: "0542 111 2233", address: "Cumhuriyet Mah. Menekşe Sok. No:8", pet: "British Shorthair (Pamuk)", balance: 250, purchaseHistory: [] },
  { id: 304, name: "Fatma Şahin", phone: "0536 222 3344", address: "Göztepe Cad. Palmiye Sitesi B Blok", pet: "Muhabbet Kuşu (Maviş)", balance: 0, purchaseHistory: [] },
  { id: 305, name: "Emre Can", phone: "0530 333 4455", address: "Bağdat Cad. No:45 D:2", pet: "Pomeranian (Gofret)", balance: 420, purchaseHistory: [] },
  { id: 306, name: "Selin Öztürk", phone: "0553 444 5566", address: "Fahrettin Kerim Gökay Cad. No:12", pet: "Van Kedisi (Duman)", balance: 0, purchaseHistory: [] },
  { id: 307, name: "Burak Yılmaz", phone: "0545 555 6677", address: "Moda Cad. No:78 D:6", pet: "Scottish Fold (Zeytin)", balance: 0, purchaseHistory: [] },
  { id: 308, name: "Zeynep Aydın", phone: "0537 666 7788", address: "Zühtüpaşa Mah. Koru Sok. No:3", pet: "Terrier (Baron)", balance: 180, purchaseHistory: [] },
  { id: 309, name: "Mustafa Çelik", phone: "0543 777 8899", address: "Acıbadem Mah. Ihlamur Sok. No:9", pet: "Sultan Papağanı (Çiko)", balance: 0, purchaseHistory: [] },
  { id: 310, name: "Derya Korkmaz", phone: "0539 888 9900", address: "Koşuyolu Mah. Asma Sok. No:14", pet: "Chihuahua (Bella)", balance: 0, purchaseHistory: [] }
];

const sampleWaste = [
  { id: 501, date: "04.09.2026", time: "10:15", productName: "Reflex Aktif Karbonlu Topaklanan Kedi Kumu 10L", qty: 1, unitCost: 120, totalLoss: 120, reason: "Ambalaj Yırtıldı / Patladı", note: "İçeri taşırken palet köşesine takıldı" }
];

// ── Unified Sample Expenses (11-Column Schema) ──
const sampleExpenses = [
  {
    id: 601,
    date: "01.09.2026",
    time: "09:30",
    mainCategory: "Sabit Kira / Stopaj",
    subType: "Dükkân Kirası",
    desc: "Eylül Ayı Dükkân Kirası (Net Ödeme)",
    amount: 12000,
    vatRate: 0,
    vatAmount: 0,
    paymentMethod: "Banka Hesabı",
    invoiceStatus: "🧾 Stopajlı (%20 Stopaj)",
    hasInvoice: true,
    taxDeduction: 15000, // Brütleştirilmiş kira matrah indirimi (12.000 / 0.80)
    kkeg: 0,
    withholdingTax: 3000,
    expenseType: "major"
  },
  {
    id: 602,
    date: "02.09.2026",
    time: "11:30",
    mainCategory: "Toptancı Alımı",
    subType: "Mal Alımı",
    desc: "5 Koli Reflex Mama + 2 Çuval Açık Mama (Marmara Pet)",
    amount: 5400,
    vatRate: 20,
    vatAmount: 900,
    paymentMethod: "Açık Hesap (Borç)",
    invoiceStatus: "🧾 Faturalı",
    hasInvoice: true,
    taxDeduction: 4500, // KDV hariç matrah
    kkeg: 0,
    supplierName: "Marmara Pet Toptan",
    expenseType: "procurement",
    status: "Açık Hesap (Borç)"
  },
  {
    id: 603,
    date: "03.09.2026",
    time: "14:20",
    mainCategory: "Binek Taşıt & Akaryakıt",
    subType: "Servis Aracı Mazot",
    desc: "Kurye / Servis Aracı Mazot Alımı",
    amount: 1200,
    vatRate: 20,
    vatAmount: 200,
    paymentMethod: "Kasa (Nakit)",
    invoiceStatus: "🧾 Faturalı (%70 Mahsup)",
    hasInvoice: true,
    taxDeduction: 700, // %70 matrah indirimi (KDV hariç 1000 TL * 0.70)
    kkeg: 300, // %30 KKEG
    expenseType: "major"
  },
  {
    id: 604,
    date: "04.09.2026",
    time: "16:10",
    mainCategory: "Banka & POS Komisyon Kesintisi",
    subType: "POS Komisyonu",
    desc: "Haftalık POS Slipleri Komisyon Kesintisi",
    amount: 420,
    vatRate: 0,
    vatAmount: 0,
    paymentMethod: "Banka Hesabı",
    invoiceStatus: "🧾 Banka Dekontu",
    hasInvoice: true,
    taxDeduction: 420, // %100 Finansman gideri matrah indirimi
    kkeg: 0,
    expenseType: "major"
  },
  {
    id: 605,
    date: "05.09.2026",
    time: "12:45",
    mainCategory: "Genel Dükkân / Sarf",
    subType: "Poşet / Temizlik",
    desc: "Baskılı Poşet ve Dükkân Temizlik Sarfı",
    amount: 350,
    vatRate: 20,
    vatAmount: 58.33,
    paymentMethod: "Kasa (Nakit)",
    invoiceStatus: "🧾 Faturalı",
    hasInvoice: true,
    taxDeduction: 291.67,
    kkeg: 0,
    expenseType: "daily"
  },
  {
    id: 606,
    date: "06.09.2026",
    time: "10:15",
    mainCategory: "Genel Dükkân / Sarf",
    subType: "Yemek / Çay",
    desc: "Personel Öğle Yemeği & Kasa İkramı",
    amount: 180,
    vatRate: 10,
    vatAmount: 16.36,
    paymentMethod: "Kasa (Nakit)",
    invoiceStatus: "🧾 Fişli",
    hasInvoice: true,
    taxDeduction: 163.64,
    kkeg: 0,
    expenseType: "daily"
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

  let cats = raw("ps_categories");
  window.categories = (Array.isArray(cats) && cats.length > 0) ? cats : [...defaultCategories];

  const CURRENT_CATALOG_VERSION = "2026_09_v8_stock1_all";
  const savedVer = localStorage.getItem("ps_catalog_version");
  let prods = raw("ps_products");

  if (savedVer !== CURRENT_CATALOG_VERSION || !Array.isArray(prods) || prods.length < 50) {
    // 222 yeni ürün kataloğuna otomatik geçiş yap (hepsi 1 stok ile)
    window.products = JSON.parse(JSON.stringify(sampleProducts));
    window.products.forEach(p => {
      p.stock = 1;
      p.vatRate = 20;
      if (p.cost === undefined) p.cost = 0;
      if (p.price === undefined) p.price = 0;
    });
    localStorage.setItem("ps_products", JSON.stringify(window.products));
    localStorage.setItem("ps_catalog_version", CURRENT_CATALOG_VERSION);
  } else {
    window.products = (prods && prods.length > 0) ? prods : JSON.parse(JSON.stringify(sampleProducts));
  }
  
  // Ensure product integrity & default stock 1 across all products
  window.products.forEach(p => {
    if (p.vatRate === undefined || p.vatRate === null) p.vatRate = 20;
    else p.vatRate = Number(p.vatRate);
    if (!Array.isArray(p.batches)) p.batches = [];
    if (p.cost === undefined || p.cost === null) p.cost = 0;
    else p.cost = Number(p.cost);
    if (p.price === undefined || p.price === null) p.price = 0;
    else p.price = Number(p.price);
    
    // Bütün ürünlere en az 1 stok vererek listelenmeme/boş kalma sorununu kesin çözelim
    if (p.stock === undefined || p.stock === null || Number(p.stock) <= 0) {
      p.stock = 1;
    } else {
      p.stock = Number(p.stock);
    }
  });

  let sups = raw("ps_suppliers");
  window.suppliers = (sups && sups.length > 0) ? sups : [...sampleSuppliers];

  let custs = raw("ps_customers");
  window.customers = (custs && custs.length > 0) ? custs : [...sampleCustomers];

  let bnds = raw("ps_bundles");
  window.bundles = (bnds && bnds.length > 0) ? bnds : [...sampleBundles];

  let waste = raw("ps_waste_records");
  window.wasteRecords = (waste && waste.length > 0) ? waste : [...sampleWaste];

  window.orders = raw("ps_orders") || [];
  window.platformPendingOrders = raw("ps_platform_pending") || [];
  window.deliveredOrders = raw("ps_delivered_orders") || [];
  window.salesHistory = raw("ps_sales_history") || [];
  
  let exp = raw("ps_expenses");
  window.expenses = (exp && exp.length > 0) ? exp : [...sampleExpenses];
  
  window.manualDeficits = raw("ps_deficits") || [];
  window.heldCarts = raw("ps_held_carts") || [];

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


