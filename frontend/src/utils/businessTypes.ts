export interface BusinessTypeConfig {
  id: string
  name: string
  nameEn?: string
  nameHi?: string
  nameMr: string
  icon: string
  defaultUnit: string
  units: string[]
  sampleCategories: string[]
  sampleCategoriesEn?: string[]
  sampleCategoriesHi?: string[]
  sampleCategoriesMr?: string[]
  sampleProducts?: { name: string; category: string; price: number; stock: number; unit: string; image?: string }[]
  sampleProductsEn?: { name: string; category: string; price: number; stock: number; unit: string; image?: string }[]
  sampleProductsHi?: { name: string; category: string; price: number; stock: number; unit: string; image?: string }[]
  sampleProductsMr?: { name: string; category: string; price: number; stock: number; unit: string; image?: string }[]
  checkoutHint: string
  checkoutHintEn?: string
  checkoutHintHi?: string
  checkoutHintMr?: string
  customFieldLabel?: string
  customFieldPlaceholder?: string
}

export const BUSINESS_TYPES: BusinessTypeConfig[] = [
  {
    id: 'GENERAL',
    name: 'General Store / Multi-Product',
    nameMr: 'सर्वसाधारण मल्टी-प्रॉडक्ट दुकान',
    icon: '🏪',
    defaultUnit: 'Pc',
    units: ['Pc', 'Pack', 'Box', 'Set', 'Kg', 'Gm', 'Litre', 'Day'],
    sampleCategories: ['जनरल प्रॉडक्ट्स', 'ऑफर आयटम्स', 'नवीन आगमन (New Arrivals)', 'घरगुती सामान', 'डेली युझ आयटम्स'],
    sampleProducts: [
      { name: 'मल्टी-पर्पज होम क्लीनर 500ml', category: 'घरगुती सामान', price: 199, stock: 40, unit: 'Bottle', image: 'cleaner.jpg, cleaner-back.jpg' },
      { name: 'स्टेनलेस स्टील वॉटर बॉटल 1L', category: 'डेली युझ आयटम्स', price: 349, stock: 30, unit: 'Pc', image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8' },
      { name: 'प्रीमियम बॅटरी संच (4 Pcs)', category: 'जनरल प्रॉडक्ट्स', price: 120, stock: 50, unit: 'Pack', image: 'battery-pack.jpg' },
    ],
    checkoutHint: 'Standard Delivery & Contact Details',
  },
  {
    id: 'KIRANA',
    name: 'Kirana & Grocery',
    nameMr: 'किराणा व धान्य दुकान',
    icon: '🛒',
    defaultUnit: 'Kg',
    units: ['Kg', 'Gm', 'Litre', 'Ml', 'Pack', 'Packet', 'Pc'],
    sampleCategories: ['धान्य व डाळी', 'तेल व तूप', 'मसाले व ड्रायफ्रूट्स', 'स्नॅक्स व बिस्किट्स', 'पर्सनल केअर व सोप', 'डेअरी व बेव्हरेजेस'],
    sampleProducts: [
      { name: 'साखर (Pure White Sugar)', category: 'धान्य व डाळी', price: 42, stock: 100, unit: 'Kg', image: 'sugar.jpg, sugar-pack.jpg' },
      { name: 'बास्मती तांदूळ (Premium Basmati)', category: 'धान्य व डाळी', price: 110, stock: 50, unit: 'Kg', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c' },
      { name: 'रिफाईंड सोयाबीन तेल (1 Litre)', category: 'तेल व तूप', price: 135, stock: 40, unit: 'Litre', image: 'oil.jpg, oil-back.jpg' },
      { name: 'पारले-जी बिस्कीट (Family Pack)', category: 'स्नॅक्स व बिस्किट्स', price: 30, stock: 80, unit: 'Pack', image: 'parleg.jpg' },
    ],
    checkoutHint: 'Home Delivery Address & Quantity (Kg/Gm)',
    customFieldLabel: 'Delivery Instructions / Landmark',
    customFieldPlaceholder: 'e.g. Leave near doorstep / Call before arrival',
  },
  {
    id: 'PHOTO_STUDIO',
    name: 'Photo Studio & Photography Services',
    nameMr: 'फोटो स्टुडिओ व फोटोग्राफी सर्व्हिसेस',
    icon: '📸',
    defaultUnit: 'Day',
    units: ['Day', 'Hour', 'Event', 'Shoot', 'Nag', 'Pc', 'Album', 'Frame'],
    sampleCategories: ['वेडिंग फोटोग्राफी पॅकेजेस', 'प्री-वेडिंग व रील्स शुट', 'वाढदिवस व इव्हेंट शुट', 'फोटो फ्रेम व अल्बम्स', 'कस्टम प्रिंटेड भेटवस्तू'],
    sampleProducts: [
      { name: 'वेडिंग फोटोग्राफी पूर्ण दिवस पॅकेज', category: 'वेडिंग फोटोग्राफी पॅकेजेस', price: 15000, stock: 10, unit: 'Event', image: 'wedding-shoot-1.jpg, wedding-shoot-2.jpg' },
      { name: 'कनव्हासा फोटो फ्रेम 12x18 Inches', category: 'फोटो फ्रेम व अल्बम्स', price: 750, stock: 25, unit: 'Frame', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38' },
      { name: 'कस्टम प्रिंटेड फोटो कॉफी मग', category: 'कस्टम प्रिंटेड भेटवस्तू', price: 299, stock: 40, unit: 'Pc', image: 'photo-mug.jpg' },
    ],
    checkoutHint: 'Booking Date, Event Location & Event Hours',
    customFieldLabel: 'Event / Shoot Date & Location Details',
    customFieldPlaceholder: 'e.g. Shoot Date: 15th Oct 2026 | Hall Name & City',
  },
  {
    id: 'HOTEL_RESTAURANT',
    name: 'Hotel, Restaurant & Bakery',
    nameMr: 'हॉटेल, रेस्टॉरंट व बेकरी',
    icon: '🍔',
    defaultUnit: 'Plate',
    units: ['Plate', 'Half', 'Full', 'Portion', 'Pc', 'Box', 'Kg'],
    sampleCategories: ['थाळी व मेन कोर्स', 'स्टार्टर्स व स्नॅक्स', 'चायनीज व फास्टफूड', 'केक्स व बेकरी पॅक', 'पेये व ज्यूस'],
    sampleProducts: [
      { name: 'विशेष व्हेज थाळी (Special Veg Thali)', category: 'थाळी व मेन कोर्स', price: 160, stock: 50, unit: 'Plate', image: 'veg-thali.jpg, thali-full.jpg' },
      { name: 'दम चिकन बिर्याणी (Chicken Biryani)', category: 'थाळी व मेन कोर्स', price: 180, stock: 40, unit: 'Full', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8' },
      { name: 'पनीर बटर मसाला (Paneer Butter Masala)', category: 'थाळी व मेन कोर्स', price: 210, stock: 30, unit: 'Portion', image: 'paneer-masala.jpg' },
      { name: 'ब्लॅक फॉरेस्ट केक (Fresh Cake 500g)', category: 'केक्स व बेकरी पॅक', price: 350, stock: 15, unit: 'Pc', image: 'blackforest.jpg' },
    ],
    checkoutHint: 'Order Type (Dine-in / Parcel / Delivery) & Cooking Instructions',
    customFieldLabel: 'Cooking / Table Instructions',
    customFieldPlaceholder: 'e.g. Make less spicy / Table No. 4 / Parcel Packing',
  },
  {
    id: 'GARMENTS',
    name: 'Clothing, Garments & Fashion',
    nameMr: 'कपडे, फॅशन व गारमेंट्स',
    icon: '👗',
    defaultUnit: 'Pc',
    units: ['Pc', 'Pair', 'Set', 'Size S', 'Size M', 'Size L', 'Size XL', 'Size XXL'],
    sampleCategories: ['मेन्स वेअर (शर्ट, टी-शर्ट)', 'लेडीज वेअर (साडी, कुर्ती)', 'किड्स वेअर (लहान मुलांचे कपडे)', 'फूटवेअर व चप्पल', 'ॲक्सेसरीज (बेल्ट, पर्स, सॉक्स)'],
    sampleProducts: [
      { name: 'कॉटन कॅज्युअल मेन्स शर्ट (Size L)', category: 'मेन्स वेअर (शर्ट, टी-शर्ट)', price: 699, stock: 30, unit: 'Pc', image: 'shirt-front.jpg, shirt-back.jpg' },
      { name: 'डिजिटल प्रिंट पैठणी साडी', category: 'लेडीज वेअर (साडी, कुर्ती)', price: 1499, stock: 20, unit: 'Pc', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c' },
      { name: 'स्पोर्ट्स रनिंग शूज (Size 8)', category: 'फूटवेअर व चप्पल', price: 999, stock: 15, unit: 'Pair', image: 'shoes-pair.jpg' },
    ],
    checkoutHint: 'Select Size, Color & Delivery Address',
    customFieldLabel: 'Size & Color Confirmation',
    customFieldPlaceholder: 'e.g. Size L, Blue color preferred',
  },
  {
    id: 'HARDWARE',
    name: 'Hardware, Plumbing & Building Tools',
    nameMr: 'हार्डवेअर, प्लंबिंग व टूल्स',
    icon: '🔨',
    defaultUnit: 'Pc',
    units: ['Pc', 'Box', 'Meter', 'Set', 'Bundle', 'Kg', 'Pack', 'Litre'],
    sampleCategories: ['प्लंबिंग व पाईप फिटिंग्स', 'हार्डवेअर फिटिंग्स व स्क्रू', 'टूल्स व पेंट', 'नट, बोल्ट व वॉशर', 'सीमेंट व बांधकाम साहित्य'],
    sampleProducts: [
      { name: 'PVC पाईप 1 इंच (Length 10ft)', category: 'प्लंबिंग व पाईप फिटिंग्स', price: 180, stock: 50, unit: 'Meter', image: 'pvc-pipe.jpg' },
      { name: 'स्क्रू ड्रायव्हर व टूल संच (Screw Driver Set)', category: 'टूल्स व पेंट', price: 290, stock: 20, unit: 'Set', image: 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c' },
      { name: 'स्टेनलेस स्टील डोअर हिंजेस सेट (Door Hinges)', category: 'हार्डवेअर फिटिंग्स व स्क्रू', price: 150, stock: 35, unit: 'Pair', image: 'door-hinge.jpg' },
    ],
    checkoutHint: 'Delivery Address & Specification Notes',
    customFieldLabel: 'Product Size / Specification Note',
    customFieldPlaceholder: 'e.g. 2 inch size / Galvanized coating',
  },
  {
    id: 'ELECTRONICS',
    name: 'Electronics, Mobiles & Accessories',
    nameEn: 'Electronics, Mobiles & Accessories',
    nameHi: 'इलेक्ट्रॉनिक्स, मोबाइल एवं एक्सेसरीज़',
    nameMr: 'इलेक्ट्रॉनिक्स, मोबाईल व ॲक्सेसरीज',
    icon: '🔌',
    defaultUnit: 'Pc',
    units: ['Pc', 'Set', 'Box', 'Pack', 'Pair'],
    sampleCategories: [
      '📱 मोबाईल व स्मार्टफोन्स',
      '🛡️ मोबाईल कव्हर्स, टेम्पर्ड ग्लास व स्किन',
      '⚡ चार्जर, केबल्स व पॉवर बँक',
      '🎧 इयरफोन, नेकबँड व ब्लूटूथ स्पीकर',
      '⌚ स्मार्टवॉच व मोबाईल ॲक्सेसरीज',
      '📺 होम व किचन अप्लायन्सेस'
    ],
    sampleCategoriesEn: [
      '📱 Mobile Phones & Smartphones',
      '🛡️ Mobile Covers, Tempered Glass & Skins',
      '⚡ Fast Chargers, Cables & Power Banks',
      '🎧 Earphones, Neckbands & Bluetooth Speakers',
      '⌚ Smartwatches & Mobile Accessories',
      '📺 Home & Kitchen Appliances'
    ],
    sampleCategoriesHi: [
      '📱 मोबाइल एवं स्मार्टफोन्स',
      '🛡️ मोबाइल कवर्स, टेम्पर्ड ग्लास एवं स्किन',
      '⚡ चार्जर्स, केबल्स एवं पावर बैंक',
      '🎧 ईयरफोन, नेकबैंड एवं ब्लूटूथ स्पीकर्स',
      '⌚ स्मार्टवॉच एवं मोबाइल एक्सेसरीज़',
      '📺 होम एवं किचन अप्लायंसेज'
    ],
    sampleCategoriesMr: [
      '📱 मोबाईल व स्मार्टफोन्स',
      '🛡️ मोबाईल कव्हर्स, टेम्पर्ड ग्लास व स्किन',
      '⚡ चार्जर, केबल्स व पॉवर बँक',
      '🎧 इयरफोन, नेकबँड व ब्लूटूथ स्पीकर',
      '⌚ स्मार्टवॉच व मोबाईल ॲक्सेसरीज',
      '📺 होम व किचन अप्लायन्सेस'
    ],
    sampleProducts: [
      { name: 'सिलिकॉन ट्रान्सपरंट बॅक कव्हर (All Models)', category: '🛡️ मोबाईल कव्हर्स, टेम्पर्ड ग्लास व स्किन', price: 149, stock: 100, unit: 'Pc', image: 'phone-cover.jpg, cover-back.jpg' },
      { name: '11D मॅट टेम्पर्ड ग्लास स्क्रीन गार्ड', category: '🛡️ मोबाईल कव्हर्स, टेम्पर्ड ग्लास व स्किन', price: 99, stock: 150, unit: 'Pc', image: 'tempered-glass.jpg' },
      { name: 'फास्ट 20W टाइप-C चार्जर अडॅप्टर', category: '⚡ चार्जर, केबल्स व पॉवर बँक', price: 499, stock: 40, unit: 'Pc', image: 'charger-adapter.jpg' },
      { name: 'टाइप-C फास्ट charge डेटा केबल (1.5m)', category: '⚡ चार्जर, केबल्स व पॉवर बँक', price: 199, stock: 80, unit: 'Pc', image: 'data-cable.jpg' },
      { name: 'ब्लूटूथ वायरलेस इयरफोन (Neckband)', category: '🎧 इयरफोन, नेकबँड व ब्लूटूथ स्पीकर', price: 899, stock: 25, unit: 'Pc', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e' },
      { name: 'स्मार्ट फिटनेस वॉच (Heart Rate & SpO2)', category: '⌚ स्मार्टवॉच व मोबाईल ॲक्सेसरीज', price: 1499, stock: 15, unit: 'Pc', image: 'smartwatch.jpg' },
    ],
    sampleProductsEn: [
      { name: 'Transparent Silicon Back Cover (All Models)', category: '🛡️ Mobile Covers, Tempered Glass & Skins', price: 149, stock: 100, unit: 'Pc', image: 'phone-cover.jpg, cover-back.jpg' },
      { name: '11D Matte Tempered Glass Screen Guard', category: '🛡️ Mobile Covers, Tempered Glass & Skins', price: 99, stock: 150, unit: 'Pc', image: 'tempered-glass.jpg' },
      { name: 'Fast 20W Type-C Charger Adapter', category: '⚡ Fast Chargers, Cables & Power Banks', price: 499, stock: 40, unit: 'Pc', image: 'charger-adapter.jpg' },
      { name: 'Type-C Fast Charging Data Cable (1.5m)', category: '⚡ Fast Chargers, Cables & Power Banks', price: 199, stock: 80, unit: 'Pc', image: 'data-cable.jpg' },
      { name: 'Bluetooth Wireless Earphones (Neckband)', category: '🎧 Earphones, Neckbands & Bluetooth Speakers', price: 899, stock: 25, unit: 'Pc', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e' },
      { name: 'Smart Fitness Watch (Heart Rate & SpO2)', category: '⌚ Smartwatches & Mobile Accessories', price: 1499, stock: 15, unit: 'Pc', image: 'smartwatch.jpg' },
    ],
    sampleProductsHi: [
      { name: 'सिलिकॉन ट्रांसपैरेंट बैक कवर (All Models)', category: '🛡️ मोबाइल कवर्स, टेम्पर्ड ग्लास एवं स्किन', price: 149, stock: 100, unit: 'Pc', image: 'phone-cover.jpg, cover-back.jpg' },
      { name: '11D मैट टेम्पर्ड ग्लास स्क्रीन गार्ड', category: '🛡️ मोबाइल कवर्स, टेम्पर्ड ग्लास एवं स्किन', price: 99, stock: 150, unit: 'Pc', image: 'tempered-glass.jpg' },
      { name: 'फास्ट 20W टाइप-C चार्जर एडेप्टर', category: '⚡ चार्जर्स, केबल्स एवं पावर बैंक', price: 499, stock: 40, unit: 'Pc', image: 'charger-adapter.jpg' },
      { name: 'टाइप-C फास्ट चार्जिंग डेटा केबल (1.5m)', category: '⚡ चार्जर्स, केबल्स एवं पावर बैंक', price: 199, stock: 80, unit: 'Pc', image: 'data-cable.jpg' },
      { name: 'ब्लूटूथ वायरलेस ईयरफोन (Neckband)', category: '🎧 ईयरफोन, नेकबैंड एवं ब्लूटूथ स्पीकर्स', price: 899, stock: 25, unit: 'Pc', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e' },
      { name: 'स्मार्ट फिटनेस वॉच (Heart Rate & SpO2)', category: '⌚ स्मार्टवॉच एवं मोबाइल एक्सेसरीज़', price: 1499, stock: 15, unit: 'Pc', image: 'smartwatch.jpg' },
    ],
    sampleProductsMr: [
      { name: 'सिलिकॉन ट्रान्सपरंट बॅक कव्हर (All Models)', category: '🛡️ मोबाईल कव्हर्स, टेम्पर्ड ग्लास व स्किन', price: 149, stock: 100, unit: 'Pc', image: 'phone-cover.jpg, cover-back.jpg' },
      { name: '11D मॅट टेम्पर्ड ग्लास स्क्रीन गार्ड', category: '🛡️ मोबाईल कव्हर्स, टेम्पर्ड ग्लास व स्किन', price: 99, stock: 150, unit: 'Pc', image: 'tempered-glass.jpg' },
      { name: 'फास्ट 20W टाइप-C चार्जर अडॅप्टर', category: '⚡ चार्जर, केबल्स व पॉवर बँक', price: 499, stock: 40, unit: 'Pc', image: 'charger-adapter.jpg' },
      { name: 'टाइप-C फास्ट चार्जिंग डेटा केबल (1.5m)', category: '⚡ चार्जर, केबल्स व पॉवर बँक', price: 199, stock: 80, unit: 'Pc', image: 'data-cable.jpg' },
      { name: 'ब्लूटूथ वायरलेस इयरफोन (Neckband)', category: '🎧 इयरफोन, नेकबँड व ब्लूटूथ स्पीकर', price: 899, stock: 25, unit: 'Pc', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e' },
      { name: 'स्मार्ट फिटनेस वॉच (Heart Rate & SpO2)', category: '⌚ स्मार्टवॉच व मोबाईल ॲक्सेसरीज', price: 1499, stock: 15, unit: 'Pc', image: 'smartwatch.jpg' },
    ],
    checkoutHint: 'Model Confirmation, Color & Delivery Address',
    checkoutHintEn: 'Mobile Model, Preferred Color & Delivery Address',
    checkoutHintHi: 'मोबाइल मॉडल, मनपसंद कलर एवं डिलीवरी पता',
    checkoutHintMr: 'मोबाईल मॉडेल, आवडता रंग व डिलिव्हरी पत्ता',
    customFieldLabel: 'Product Specification',
    customFieldPlaceholder: 'e.g. Mobile Model: Redmi Note 12 Pro / Color: Black / Specification details',
  },
  {
    id: 'AUTOMOBILE',
    name: 'Automobile, Bikes & Spares',
    nameMr: 'ऑटोमोबाईल, कार/बाइक व सर्व्हिसिंग',
    icon: '🚗',
    defaultUnit: 'Pc',
    units: ['Pc', 'Set', 'Pair', 'Service', 'Litre', 'Bottle', 'Box', 'Pack', 'Hour'],
    sampleCategories: ['बाइक स्पेयर पार्ट्स (टू-व्हीलर)', 'कार ॲक्सेसरीज व सीट कव्हर', 'इंजिन ऑईल, कुलंट व ल्युब', 'हेल्मेट व रायडिंग गिअर', 'वॉशिंग व फुल सर्व्हिसिंग पॅकेजेस'],
    sampleProducts: [
      { name: '4T इंजिन ऑईल 20W40 (1 Litre Bottle)', category: 'इंजिन ऑईल, कुलंट व ल्युब', price: 380, stock: 25, unit: 'Litre', image: 'engine-oil.jpg, oil-back.jpg' },
      { name: 'स्टायलिश फुल-फेस हेल्मेट (Full Face Helmet)', category: 'हेल्मेट व रायडिंग गिअर', price: 1250, stock: 10, unit: 'Pc', image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc, https://images.unsplash.com/photo-1558981806-ec527fa84c39' },
      { name: 'टू-व्हीलर क्लच प्लेट सेट (Clutch Assembly)', category: 'बाइक स्पेयर पार्ट्स (टू-व्हीलर)', price: 650, stock: 15, unit: 'Set', image: 'clutch-plate.jpg' },
      { name: 'बाइक फोम वॉशिंग व ऑईल सर्व्हिस पॅकेज', category: 'वॉशिंग व फुल सर्व्हिसिंग पॅकेजेस', price: 250, stock: 100, unit: 'Service', image: 'bike-wash.jpg' },
    ],
    checkoutHint: 'Vehicle Model & Service Slot Booking',
    customFieldLabel: 'Vehicle Model & Registration No',
    customFieldPlaceholder: 'e.g. Honda Activa 6G / MH12 AB 1234',
  },
  {
    id: 'PHARMACY',
    name: 'Medical & Pharmacy Store',
    nameMr: 'मेडिकल, फार्मसी व हेल्थकेअर',
    icon: '💊',
    defaultUnit: 'Strip',
    units: ['Strip', 'Bottle', 'Box', 'Pc', 'Pack'],
    sampleCategories: ['ओव्हर-द-काउंटर औषधे (OTC)', 'हेल्थ व व्हिटॅमिन सप्लीमेंट्स', 'मेडिकल डिव्हाइसेस', 'बेबी केअर व डायपर्स', 'पर्सनल हायजीन व स्किनकेअर'],
    sampleProducts: [
      { name: 'पॅरासिटामॉल 650mg (Paracetamol Strip 15 Tab)', category: 'ओव्हर-द-काउंटर औषधे (OTC)', price: 32, stock: 100, unit: 'Strip', image: 'paracetamol.jpg, paracetamol-back.jpg' },
      { name: 'व्हिटॅमिन सी व झिंक गोळ्या (Vitamin C Tablets)', category: 'हेल्थ व व्हिटॅमिन सप्लीमेंट्स', price: 120, stock: 50, unit: 'Bottle', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae' },
      { name: 'डिजिटल थर्मामीटर (Digital Thermometer)', category: 'मेडिकल डिव्हाइसेस', price: 249, stock: 20, unit: 'Pc', image: 'thermometer.jpg' },
    ],
    checkoutHint: 'Upload Prescription / Note Medicine Names',
    customFieldLabel: 'Doctor Prescription / Medicine Details',
    customFieldPlaceholder: 'e.g. Note doctor instructions or prescription details',
  },
  {
    id: 'GIFT_TOYS',
    name: 'Gift Shop, Toys & Novelties',
    nameMr: 'गिफ्ट शॉप, खेळणी व वस्तू',
    icon: '🎁',
    defaultUnit: 'Pc',
    units: ['Pc', 'Set', 'Box', 'Pack', 'Pair'],
    sampleCategories: ['कस्टम भेटवस्तू (Gifts)', 'खेळणी व टॉईज (Toys)', 'ग्रीटिंग कार्ड्स व फोटो फ्रेम', 'पार्टी डेकोरेशन व फुगे', 'सरप्राईज गिफ्ट बॉक्सेस'],
    sampleProducts: [
      { name: 'लहान मुलांची रिमोट कंट्रोल कार (RC Car)', category: 'खेळणी व टॉईज (Toys)', price: 599, stock: 15, unit: 'Pc', image: 'rc-car.jpg, rc-car-box.jpg' },
      { name: 'कस्टम फोटो लाकडी फ्रेम 8x12', category: 'ग्रीटिंग कार्ड्स व फोटो फ्रेम', price: 399, stock: 20, unit: 'Frame', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38' },
      { name: 'सरप्राईज वाढदिवस गिफ्ट हॅम्पर बॉक्स', category: 'सरप्राईज गिफ्ट बॉक्सेस', price: 899, stock: 10, unit: 'Box', image: 'gift-hamper.jpg' },
    ],
    checkoutHint: 'Gift Note & Custom Name Request',
    customFieldLabel: 'Gift Message / Custom Name Note',
    customFieldPlaceholder: 'e.g. Write "Happy Birthday Rahul" on card',
  },
  {
    id: 'DAIRY_SWEETS',
    name: 'Dairy, Milk & Sweet Mart',
    nameMr: 'डेअरी, दूध व मिठाई दुकान',
    icon: '🥛',
    defaultUnit: 'Kg',
    units: ['Kg', 'Gm', 'Litre', 'Ml', 'Pc', 'Box', 'Pack'],
    sampleCategories: ['ताजे दूध, ताक व लस्सी', 'पनीर, खवा व बटर', 'ताजी मिठाई व पेढे', 'नमकीन, फरसाण व शेव', 'डेअरी प्रॉडक्ट्स व आईस्क्रीम'],
    sampleProducts: [
      { name: 'ताजे म्हैशीचे दूध (Fresh Buffalo Milk 1L)', category: 'ताजे दूध, ताक व लस्सी', price: 66, stock: 60, unit: 'Litre', image: 'milk-pouch.jpg' },
      { name: 'ताजी केशर पेढा (Keshar Pedha 250g)', category: 'ताजी मिठाई व पेढे', price: 140, stock: 30, unit: 'Gm', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28' },
      { name: 'मऊ फ्रेश पनीर (Fresh Paneer 500g)', category: 'पनीर, खवा व बटर', price: 180, stock: 25, unit: 'Kg', image: 'paneer-pack.jpg' },
    ],
    checkoutHint: 'Morning/Evening Slot & Weight',
    customFieldLabel: 'Delivery Timing Preference',
    customFieldPlaceholder: 'e.g. Deliver before 8:00 AM',
  },
  {
    id: 'STATIONERY',
    name: 'Books, Stationery & Office',
    nameMr: 'पुस्तके, स्टेशनरी व ऑफिस साहित्य',
    icon: '📚',
    defaultUnit: 'Pc',
    units: ['Pc', 'Set', 'Box', 'Pack', 'Bundle'],
    sampleCategories: ['शालेय व कॉलेज पुस्तके', 'नोटबुक्स, वह्या व डायरी', 'पेन, पेन्सिल व स्टेशनरी', 'ऑफिस व फाईल सप्लाय', 'आर्ट, क्राफ्ट व ड्रॉइंग'],
    sampleProducts: [
      { name: 'क्लासमेट वही 200 पेज (Classmate Long Notebook)', category: 'नोटबुक्स, वह्या व डायरी', price: 65, stock: 100, unit: 'Pc', image: 'notebook.jpg, notebook-pages.jpg' },
      { name: 'ब्लू जेल पेन बॉक्स (Box of 10 Pcs)', category: 'पेन, पेन्सिल व स्टेशनरी', price: 100, stock: 40, unit: 'Box', image: 'pen-box.jpg' },
    ],
    checkoutHint: 'Standard Delivery & Contact Details',
  },
  {
    id: 'BEAUTY_JEWELLERY',
    name: 'Jewellery, Cosmetics & Beauty',
    nameMr: 'दागिने, कॉस्मेटिक्स व सौंदर्यप्रसाधने',
    icon: '💎',
    defaultUnit: 'Pc',
    units: ['Pc', 'Set', 'Pair', 'Box', 'Gm', 'Pack'],
    sampleCategories: ['इमिटेशन ज्वेलरी व नेकलेस', 'कॉस्मेटिक्स व मेकअप किट', 'स्किनकेअर क्रीम व वॉश', 'हेअर केअर व ऑईल', 'ब्रांडेड परफ्यूम व सुगंध'],
    sampleProducts: [
      { name: 'गोल्डन इमिटेशन नेकलेस सेट (Bridal Necklace)', category: 'इमिटेशन ज्वेलरी व नेकलेस', price: 799, stock: 15, unit: 'Set', image: 'necklace-set.jpg, necklace-box.jpg' },
      { name: 'मॅट लिपस्टिक (Matte Longwear Lipstick)', category: 'कॉस्मेटिक्स व मेकअप किट', price: 299, stock: 30, unit: 'Pc', image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa' },
    ],
    checkoutHint: 'Select Design, Color & Delivery Address',
  },
]

export const UNIT_LABEL_MAP: Record<string, { label: string; hint: string }> = {
  Kg: { label: 'Kg (किलो)', hint: 'धान्य, साखर, डाळी (वजन)' },
  Gm: { label: 'Gm (ग्रॅम)', hint: 'मसाले, ड्रायफ्रूट्स (ग्रॅम वजन)' },
  Litre: { label: 'Litre (लीटर)', hint: 'दूध, तेल, ज्यूस (द्रवपदार्थ)' },
  Ml: { label: 'Ml (मिली)', hint: 'तेल, ज्यूस, लिक्विड (मिली)' },
  Pack: { label: 'Pack / Packet (पॅक/पाकीट)', hint: 'बिस्कीट, वेफर्स, मसाले (पॅकबंद वस्तू)' },
  Packet: { label: 'Packet (पाकीट)', hint: 'वेफर्स, मॅगी, पाकीट' },
  Pc: { label: 'Pieces (नग / पीसेस)', hint: 'साबण, पेन, कपडे, मोबाईल ॲक्सेसरीज (नग)' },
  Box: { label: 'Box (बॉक्स)', hint: 'बॉक्स पॅकिंग आयटम्स' },
  Nag: { label: 'Nag (नग)', hint: 'नगाने विकल्या जाणाऱ्या गोष्टी' },
  Day: { label: 'Day (दिवस)', hint: 'फोटो स्टुडिओ / रेंटल सर्व्हिस' },
  Shoot: { label: 'Shoot (फोटो शूट)', hint: 'फोटोग्राफी सर्व्हिस' },
  Hour: { label: 'Hour (तास)', hint: 'तासानुसार सर्व्हिस' },
  Event: { label: 'Event (कार्यक्रम)', hint: 'इव्हेंट / कार्यक्रम पॅकेज' },
  Plate: { label: 'Plate (प्लेट)', hint: 'हॉटेल डिश / थाळी' },
  Half: { label: 'Half (हाफ)', hint: 'हाफ डिश' },
  Full: { label: 'Full (फुल)', hint: 'फुल डिश' },
  Portion: { label: 'Portion (पोर्शन)', hint: 'एक पोर्शन डिश' },
  Strip: { label: 'Strip (स्ट्रिप)', hint: 'औषध गोळ्यांची पट्टी' },
  Bottle: { label: 'Bottle (बाटली)', hint: 'सिरप / बाटली' },
  Pair: { label: 'Pair (जोडी)', hint: 'चप्पल, सॉक्स (जोडी)' },
  Set: { label: 'Set (सेट)', hint: 'कपडे / भांडी सेट' },
  Album: { label: 'Album (अल्बम)', hint: 'फोटो अल्बम' },
  Frame: { label: 'Frame (फ्रेम)', hint: 'फोटो फ्रेम' },
  Bundle: { label: 'Bundle (बंडल)', hint: 'बंडल पॅकिंग' },
  Meter: { label: 'Meter (मीटर)', hint: 'कापड / वायर मीटर' },
  Service: { label: 'Service (सर्व्हिस)', hint: 'ऑटो / बाईक सर्व्हिस पॅकेज' },
}

export function formatUnitDisplay(unit?: string): string {
  if (!unit) return ''
  const trimmed = unit.trim()
  if (trimmed === 'Pc' || trimmed === 'pc' || trimmed === 'PC' || trimmed === 'Pcs') {
    return 'Pieces'
  }
  return trimmed
}

export function getUnitHint(unit: string, businessTypeId?: string): string {
  const bType = businessTypeId?.toUpperCase() || ''

  if (bType === 'AUTOMOBILE') {
    switch (unit) {
      case 'Pc':
      case 'Pieces': return 'स्पेयर पार्ट, हेल्मेट, ऑइल फिल्टर, स्पार्क प्लग, टायर, ट्यूब, बेअरिंग (नग)'
      case 'Set': return 'टूलकिट, इंडिकेटर सेट, क्लच प्लेट सेट, ब्रेक पॅड सेट, चेन-स्प्राॅकेट (सेट)'
      case 'Pair': return 'साइड मिरर जोडी, ब्रेक लेव्हर जोडी, वायपर ब्लेड जोडी, इंडिकेटर जोडी'
      case 'Service': return 'फुल सर्व्हिसिंग, कार/बाइक वॉशिंग, फोम वॉश, ऑईल चेंज पॅकेज'
      case 'Litre': return 'इंजिन ऑईल (1L/3.5L), कुलंट, गिअर ऑईल, ब्रेक फ्लुइड (लीटर)'
      case 'Bottle': return 'चेन ल्युब, कार पॉलिश, ग्रीस स्प्रे, कुलंट बाटली'
      case 'Box': return 'स्पार्क प्लग बॉक्स, बल्ब बॉक्स, फ्युज बॉक्स, ब्रेक पॅड बॉक्स'
      case 'Pack': return 'मायक्रोफायबर क्लॉथ पॅक, कार वॉश शॅम्पू पॅक'
      case 'Hour': return 'मेकॅनिक लेबर चार्जेस, सर्व्हिस वेळ (तास)'
    }
  }
  
  if (bType === 'HOTEL_RESTAURANT' || bType === 'RESTAURANT') {
    switch (unit) {
      case 'Kg': return 'केक, मिठाई, बिर्याणी, फॅमिली पॅक (वजन)'
      case 'Gm': return 'स्वीट्स, ड्रायफ्रूट्स पॅक (ग्रॅम)'
      case 'Pack': return 'बेकरी पॅक, स्नॅक्स पॅक'
      case 'Packet': return 'स्नॅक्स पाकीट'
      case 'Pc':
      case 'Pieces': return 'बर्गर, पेस्ट्री, समोसा, पॅटीस, रोल्स (नग)'
      case 'Box': return 'मिठाई बॉक्स, केक बॉक्स, कॉम्बो पार्सल'
      case 'Plate': return 'हॉटेल थाळी, डिश किंवा प्लेट'
      case 'Half': return 'हाफ पोर्शन / डिश'
      case 'Full': return 'फुल पोर्शन / डिश'
      case 'Portion': return 'एक पोर्शन डिश'
      case 'Litre': return 'लस्सी, ड्रिंक्स, ग्रेव्ही (लीटर)'
      case 'Bottle': return 'ज्यूस, कोल्डड्रिंक, सॉस बाटली'
    }
  }

  if (bType === 'PHOTO_STUDIO' || bType === 'SERVICES') {
    switch (unit) {
      case 'Day': return 'कॅमेरा / स्टुडिओ रेंटल (दिवसानुसार)'
      case 'Shoot': return 'फोटोग्राफी / व्हिडिओ शूट पॅकेज'
      case 'Hour': return 'तासानुसार सर्व्हिस बुकिंग'
      case 'Event': return 'लग्न / इव्हेंट बुकिंग पॅकेज'
      case 'Nag': return 'फोटो कॉपी / प्रिंट्स (नग)'
      case 'Album': return 'फोटो अल्बम'
      case 'Frame': return 'फोटो फ्रेम'
      case 'Pc':
      case 'Pieces': return 'प्रिंट्स, फोटो कव्हर, गिफ्ट आयटम्स (नग)'
    }
  }

  if (bType === 'GARMENTS' || bType === 'FASHION') {
    switch (unit) {
      case 'Pc':
      case 'Pieces': return 'टी-शर्ट, शर्ट, ड्रेस, जीन्स, साडी (नग)'
      case 'Pair': return 'शूज, सॉक्स, चप्पल, सँडल (जोडी)'
      case 'Set': return 'कपड्यांचा सेट / मॅचिंग सुट'
      case 'Box': return 'गिफ्ट बॉक्स / शूज बॉक्स'
      case 'Meter': return 'कापड मीटर'
    }
  }

  if (bType === 'HARDWARE' || bType === 'ELECTRONICS') {
    switch (unit) {
      case 'Pc':
      case 'Pieces': return 'टीव्ही, फ्रिज, वॉशिंग मशीन, मोबाईल, स्विचेस, टूल्स (नग)'
      case 'Set': return 'होम थिएटर, डिश टीव्ही सेट, टूल सेट, सॉकेट सेट'
      case 'Box': return 'स्क्रू बॉक्स, स्विचेस बॉक्स, सील बॉक्स आयटम'
      case 'Meter': return 'वायर, केबल, पाईप (मीटर)'
      case 'Bundle': return 'वायर / पाईप / केबल बंडल'
      case 'Kg': return 'कीळ, हार्डवेअर सामान (वजन)'
      case 'Pack': return 'इलेक्ट्रीकल / इलेक्ट्रॉनिक पॅक'
    }
  }

  if (bType === 'PHARMACY') {
    switch (unit) {
      case 'Strip': return 'औषध गोळ्यांची पट्टी (स्ट्रिप)'
      case 'Bottle': return 'सिरप / टॉनिक बाटली'
      case 'Box': return 'मेडिकल बॉक्स'
      case 'Pc':
      case 'Pieces': return 'मेडिकल इक्विपमेंट / सिरिंज (नग)'
      case 'Pack': return 'कॉटन / बँडेज पॅक'
    }
  }

  if (bType === 'ELECTRONICS') {
    switch (unit) {
      case 'Pc':
      case 'Pieces': return 'मोबाईल, हेडफोन, चार्जर, ॲक्सेसरीज (नग)'
      case 'Set': return 'होम थिएटर / कॉम्बो सेट'
      case 'Box': return 'सील बॉक्स आयटम'
    }
  }

  if (bType === 'GIFT_TOYS') {
    switch (unit) {
      case 'Pc':
      case 'Pieces': return 'टेडी बेअर, फोटो फ्रेम, कप, शोपीस, खेळणी (नग)'
      case 'Set': return 'गिफ्ट सेट, वॉच सेट, कंपास सेट'
      case 'Box': return 'गिफ्ट बॉक्स, सरप्राईज बॉक्स, चॉकलेट बॉक्स'
      case 'Pack': return 'पार्टी फुगे पॅक, डेकोरेशन पॅक'
      case 'Pair': return 'कपल कप / शोपीस (जोडी)'
    }
  }

  if (bType === 'DAIRY_SWEETS') {
    switch (unit) {
      case 'Kg': return 'पेढे, बर्फी, गुलाबजामून, पनीर, खवा (वजन)'
      case 'Gm': return 'केशर पेढे, काजू कतली (ग्रॅम)'
      case 'Litre': return 'दूध, ताक, लस्सी, बासुंदी (लीटर)'
      case 'Ml': return 'फ्रेश क्रीम, तूप पॅक (मिली)'
      case 'Pc':
      case 'Pieces': return 'रसगुल्ला, चमचम, केक्स (नग)'
      case 'Box': return 'मिठाई बॉक्स, गिफ्ट हॅम्पर'
      case 'Pack': return 'पनीर पॅक, दही पॅकेट'
    }
  }

  if (bType === 'STATIONERY') {
    switch (unit) {
      case 'Pc':
      case 'Pieces': return 'पुस्तक, नोटबुक, पेन, फाईल, रुलर (नग)'
      case 'Set': return 'कलर पेन सेट, ड्रॉइंग सेट, वॉटरकलर सेट'
      case 'Box': return 'पेन बॉक्स, चॉक बॉक्स, पिन बॉक्स'
      case 'Pack': return 'रिम पेपर पॅक, स्टिकर्स पॅक'
      case 'Bundle': return 'वही बंडल, बुक्स बंडल'
    }
  }

  if (bType === 'BEAUTY_JEWELLERY') {
    switch (unit) {
      case 'Pc':
      case 'Pieces': return 'नेकलेस, रिंग, लिपस्टिक, क्रीम, परफ्यूम (नग)'
      case 'Set': return 'ब्रायडल ज्वेलरी सेट, मेकअप किट सेट'
      case 'Pair': return 'कानफुली (Earrings) जोडी, बांगड्या जोडी'
      case 'Box': return 'ज्वेलरी बॉक्स, मेकअप बॉक्स'
      case 'Gm': return 'चांदी / सोनं वस्तू (ग्रॅम)'
      case 'Pack': return 'फेस मास्क पॅक, बिंदी पॅक'
    }
  }

  // Fallback to Kirana / General Store hints
  return UNIT_LABEL_MAP[unit]?.hint || 'योग्य विक्री युनिट निवडा'
}

export function getUnitDisplayLabel(unit: string, businessTypeId?: string): string {
  const label = UNIT_LABEL_MAP[unit]?.label || formatUnitDisplay(unit)
  const hint = getUnitHint(unit, businessTypeId)
  return `${label} — ${hint}`
}

export function getBusinessType(typeId?: string): BusinessTypeConfig {
  const found = BUSINESS_TYPES.find(b => b.id === typeId?.toUpperCase())
  return found || BUSINESS_TYPES[0]
}

export function getBusinessTypeTitle(b: BusinessTypeConfig, lang: string = 'mr'): string {
  const currentLang = (lang || 'mr').toLowerCase()
  if (currentLang.startsWith('en')) return b.nameEn || b.name
  if (currentLang.startsWith('hi')) return b.nameHi || b.name
  return b.nameMr || b.name
}

export function getBusinessTypeCategories(b: BusinessTypeConfig, lang: string = 'mr'): string[] {
  const currentLang = (lang || 'mr').toLowerCase()
  if (currentLang.startsWith('en')) return b.sampleCategoriesEn || b.sampleCategories
  if (currentLang.startsWith('hi')) return b.sampleCategoriesHi || b.sampleCategories
  return b.sampleCategoriesMr || b.sampleCategories
}

export function getBusinessTypeProducts(b: BusinessTypeConfig, lang: string = 'mr') {
  const currentLang = (lang || 'mr').toLowerCase()
  if (currentLang.startsWith('en')) return b.sampleProductsEn || b.sampleProducts || []
  if (currentLang.startsWith('hi')) return b.sampleProductsHi || b.sampleProducts || []
  return b.sampleProductsMr || b.sampleProducts || []
}

export function getBusinessTypeCheckoutHint(b: BusinessTypeConfig, lang: string = 'mr'): string {
  const currentLang = (lang || 'mr').toLowerCase()
  if (currentLang.startsWith('en')) return b.checkoutHintEn || b.checkoutHint
  if (currentLang.startsWith('hi')) return b.checkoutHintHi || b.checkoutHint
  return b.checkoutHintMr || b.checkoutHint
}

export function getStockLabel(businessTypeId?: string, lang: string = 'mr'): string {
  const bType = (businessTypeId || '').toUpperCase()
  const currentLang = (lang || 'mr').toLowerCase()
  if (bType === 'PHOTO_STUDIO' || bType === 'SERVICES') {
    if (currentLang.startsWith('en')) return 'Booking Slots Capacity'
    if (currentLang.startsWith('hi')) return 'बुकिंग स्लॉट्स (Booking Slots)'
    return 'बुकिंग स्लॉट्स (Booking Slots)'
  }
  if (currentLang.startsWith('en')) return 'Stock Quantity'
  if (currentLang.startsWith('hi')) return 'स्टॉक संख्या (Stock Qty)'
  return 'शिल्लक स्टॉक संख्या (Stock Qty)'
}

export function getStockHint(businessTypeId?: string, lang: string = 'mr'): string {
  const bType = (businessTypeId || '').toUpperCase()
  const currentLang = (lang || 'mr').toLowerCase()
  if (bType === 'PHOTO_STUDIO' || bType === 'SERVICES') {
    if (currentLang.startsWith('en')) return 'Number of shoot bookings/slots available (e.g. 1000 for unlimited)'
    if (currentLang.startsWith('hi')) return 'उपलब्ध बुकिंग स्लॉट्स: कितने शूट/ऑर्डर स्वीकार कर सकते हैं (उदा. 1000 अनलिमिटेड के लिए)'
    return 'उपलब्ध बुकिंग स्लॉट्स: तुम्ही किती शुट्स किंवा ऑर्डर्स स्वीकारू शकता (उदा. 1000 unlimited साठी)'
  }
  if (currentLang.startsWith('en')) return 'Stock quantity available for sale'
  if (currentLang.startsWith('hi')) return 'दुकान में उपलब्ध स्टॉक (0 होने पर आउट ऑफ स्टॉक)'
  return 'दुकानात विक्रीसाठी उपलब्ध माल (0 झाल्यावर आउट ऑफ स्टॉक होईल)'
}
