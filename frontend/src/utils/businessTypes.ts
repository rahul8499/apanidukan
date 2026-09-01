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
    sampleProducts: [],
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
    sampleProducts: [],
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
    sampleProducts: [],
    checkoutHint: 'Booking Date, Event Location & Event Hours',
    customFieldLabel: 'Event / Shoot Date & Location Details',
    customFieldPlaceholder: 'e.g. Shoot Date: 15th Oct 2026 | Hall Name & City',
  },
  {
    id: 'RESTAURANT',
    name: 'Hotel & Restaurant',
    nameMr: 'हॉटेल व रेस्टॉरंट',
    icon: '🍔',
    defaultUnit: 'Plate',
    units: ['Plate', 'Half', 'Full', 'Bowl', 'Pc', 'Kg', 'Litre', 'Glass'],
    sampleCategories: ['नाश्ता व स्नॅक्स', 'व्हेज डिशेस व थाळी', 'चिकन व मटण डिशेस', 'राइस आणि बिर्याणी', 'रोटी, चपाती व भाकरी', 'कोल्ड्रिंक्स व ताक'],
    sampleProducts: [],
    checkoutHint: 'Order Type (Dine-in / Parcel / Delivery) & Cooking Instructions',
    customFieldLabel: 'Cooking / Table Instructions',
    customFieldPlaceholder: 'e.g. Make less spicy / Table No. 4 / Parcel Packing',
  },
  {
    id: 'BAKERY_SWEETS',
    name: 'Bakery, Cakes & Sweets',
    nameMr: 'बेकरी, केक्स व मिठाई',
    icon: '🎂',
    defaultUnit: 'Kg',
    units: ['Kg', 'Half Kg', 'Quarter Kg', 'Gm', 'Pound', 'Pc', 'Box', 'Pack'],
    sampleCategories: ['कस्टम डिझाईन केक्स', 'ताजी मिठाई व पेढे', 'बेकरी स्नॅक्स (पफ, पॅटीस)', 'ब्रेड व टोस्ट पॅक', 'चॉकलेट्स व गिफ्ट पॅक'],
    sampleProducts: [],
    checkoutHint: 'Delivery Slot & Cake Note (if applicable)',
    customFieldLabel: 'Cake Message / Sweet Delivery Note',
    customFieldPlaceholder: 'e.g. Write "Happy Anniversary" on cake',
  },
  {
    id: 'GARMENTS',
    name: 'Clothing, Garments & Fashion',
    nameMr: 'कपडे, फॅशन व गारमेंट्स',
    icon: '👗',
    defaultUnit: 'Pc',
    units: ['Pc', 'Pair', 'Set', 'Size S', 'Size M', 'Size L', 'Size XL', 'Size XXL'],
    sampleCategories: ['पुरुषांचे कपडे (शर्ट, पॅन्ट, जीन्स)', 'महिलांचे कपडे (साडी, ड्रेस, कुर्ती)', 'लहान मुलांचे कपडे', 'चप्पल, बूट आणि शूज', 'परफ्यूम, बेल्ट व इतर ॲक्सेसरीज'],
    sampleProducts: [],
    checkoutHint: 'Select Size, Color & Delivery Address',
    customFieldLabel: 'Size & Color Confirmation',
    customFieldPlaceholder: 'e.g. Size L, Blue color preferred',
  },
  {
    id: 'HARDWARE_PLUMBING',
    name: 'Hardware, Plumbing & Tools',
    nameMr: 'हार्डवेअर, प्लंबिंग व टूल्स',
    icon: '🔧',
    defaultUnit: 'Pc',
    units: ['Pc', 'Box', 'Kg', 'Gm', 'Litre', 'Meter', 'Ft', 'Length', 'Set', 'Pack'],
    sampleCategories: ['प्लंबिंग साहित्य (पाइप, नळ, फिटिंग)', 'हार्डवेअर आणि नट-बोल्ट्स', 'कलर, पेंट आणि ब्रश', 'इलेक्ट्रिकल साहित्य (वायर, स्विच)', 'मशिनरी आणि टूल्स (पाने, हातोडी)'],
    sampleProducts: [],
    checkoutHint: 'Delivery Address & Specification Notes',
    customFieldLabel: 'Product Size / Specification Note',
    customFieldPlaceholder: 'e.g. 2 inch size / Galvanized coating',
  },
  {
    id: 'BUILDING_MATERIAL',
    name: 'Building Materials & Cement',
    nameMr: 'बांधकाम साहित्य व सिमेंट',
    icon: '🧱',
    defaultUnit: 'Bag',
    units: ['Bag', 'Brass', 'Trolley', 'Truck', 'Ton', 'Kg', 'Sqft', 'Box', 'Pc', 'Bundle', 'Litre'],
    sampleCategories: ['सिमेंट, पुट्टी आणि पीओपी', 'लोखंड, सळ्या आणि पत्रे', 'वाळू, खडी आणि विटा', 'टाईल्स आणि ग्रॅनाईट', 'वॉटरप्रूफिंग आणि केमिकल', 'हार्डवेअर आणि इतर साहित्य'],
    sampleProducts: [],
    checkoutHint: 'Delivery Address & Unloading Instructions',
    customFieldLabel: 'Site Address / Unloading Info',
    customFieldPlaceholder: 'e.g. Unload at site 2, near main gate',
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
    sampleProducts: [],
    sampleProductsEn: [],
    sampleProductsHi: [],
    sampleProductsMr: [],
    checkoutHint: 'Model Confirmation, Color & Delivery Address',
    checkoutHintEn: 'Mobile Model, Preferred Color & Delivery Address',
    checkoutHintHi: 'मोबाइल मॉडल, मनपसंद कलर एवं डिलीवरी पता',
    checkoutHintMr: 'मोबाईल मॉडेल, आवडता रंग व डिलिव्हरी पत्ता',
    customFieldLabel: 'Product Specification',
    customFieldPlaceholder: 'e.g. Mobile Model: Redmi Note 12 Pro / Color: Black / Specification details',
  },
  {
    id: 'AUTO_DEALER',
    name: '2-Wheeler / 4-Wheeler Showroom',
    nameMr: '२/४-व्हीलर शोरूम',
    icon: '🛵',
    defaultUnit: 'Bike',
    units: ['Bike', 'Scooter', 'Car', 'E-Bike', 'Tractor', 'Pc'],
    sampleCategories: ['नवीन टू-व्हीलर (New 2-Wheelers)', 'सेकंड हँड गाड्या (Used Vehicles)', 'इलेक्ट्रिक बाइक्स आणि स्कूटर (EV)', 'नवीन फोर-व्हीलर (New 4-Wheelers)', 'गाडीचे ॲक्सेसरीज (Accessories)'],
    sampleProducts: [],
    checkoutHint: 'Vehicle Model Inquiry & Booking Details',
    customFieldLabel: 'Test Drive / Booking Notes',
    customFieldPlaceholder: 'e.g. Want to schedule a test drive on Sunday',
  },
  {
    id: 'AUTO_SPARES',
    name: 'Spare Parts & Servicing',
    nameMr: 'स्पेयर पार्ट्स व सर्व्हिसिंग',
    icon: '🛠️',
    defaultUnit: 'Pc',
    units: ['Pc', 'Set', 'Pair', 'Service', 'Litre', 'Bottle', 'Box', 'Pack', 'Hour'],
    sampleCategories: ['बाइक स्पेयर पार्ट्स (टू-व्हीलर)', 'कार ॲक्सेसरीज व सीट कव्हर', 'इंजिन ऑईल, कुलंट व ल्युब', 'हेल्मेट व रायडिंग गिअर', 'वॉशिंग व फुल सर्व्हिसिंग पॅकेजेस'],
    sampleProducts: [],
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
    sampleProducts: [],
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
    sampleProducts: [],
    checkoutHint: 'Gift Note & Custom Name Request',
    customFieldLabel: 'Gift Message / Custom Name Note',
    customFieldPlaceholder: 'e.g. Write "Happy Birthday Rahul" on card',
  },

  {
    id: 'STATIONERY',
    name: 'Books, Stationery & Office',
    nameMr: 'पुस्तके, स्टेशनरी व ऑफिस साहित्य',
    icon: '📚',
    defaultUnit: 'Pc',
    units: ['Pc', 'Set', 'Box', 'Pack', 'Bundle'],
    sampleCategories: ['शालेय व कॉलेज पुस्तके', 'नोटबुक्स, वह्या व डायरी', 'पेन, पेन्सिल व स्टेशनरी', 'ऑफिस व फाईल सप्लाय', 'आर्ट, क्राफ्ट व ड्रॉइंग'],
    sampleProducts: [],
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
    sampleProducts: [],
    checkoutHint: 'Select Design, Color & Delivery Address',
  },
]

export const UNIT_LABEL_MAP: Record<string, { label: string; hint: string }> = {
  Kg: { label: 'Kg (किलो)', hint: 'धान्य, साखर, डाळी, मिठाई (किलो)' },
  'Half Kg': { label: 'Half Kg (अर्धा किलो)', hint: 'अर्धा किलो (500 Gm)' },
  'Quarter Kg': { label: 'Quarter Kg (पाव किलो)', hint: 'पाव किलो (250 Gm)' },
  Gm: { label: 'Gm (ग्रॅम)', hint: 'मसाले, ड्रायफ्रूट्स (ग्रॅम वजन)' },
  Pound: { label: 'Pound (पाऊंड)', hint: 'केकसाठी (पाऊंड)' },
  Litre: { label: 'Litre (लिटर)', hint: 'दूध, तेल, ज्यूस (द्रवपदार्थ)' },
  Ml: { label: 'Ml (मिली)', hint: 'तेल, ज्यूस, लिक्विड (मिली)' },
  Pack: { label: 'Pack (पॅक)', hint: 'बिस्कीट, वेफर्स, मसाले (पॅकबंद वस्तू)' },
  Packet: { label: 'Packet (पाकीट)', hint: 'वेफर्स, मॅगी, पाकीट' },
  Pc: { label: 'Pc (नग / पीस)', hint: 'साबण, पेन, कपडे, मोबाईल ॲक्सेसरीज (नग)' },
  Box: { label: 'Box (बॉक्स)', hint: 'बॉक्स पॅकिंग आयटम्स' },
  Nag: { label: 'Nag (नग)', hint: 'नगाने विकल्या जाणाऱ्या गोष्टी' },
  Day: { label: 'Day (दिवस)', hint: 'फोटो स्टुडिओ / रेंटल सर्व्हिस' },
  Shoot: { label: 'Shoot (शूट)', hint: 'फोटोग्राफी सर्व्हिस' },
  Hour: { label: 'Hour (तास)', hint: 'तासानुसार सर्व्हिस' },
  Event: { label: 'Event (इव्हेंट)', hint: 'इव्हेंट / कार्यक्रम पॅकेज' },
  Plate: { label: 'Plate (प्लेट/थाळी)', hint: 'हॉटेल डिश / थाळी' },
  Half: { label: 'Half (हाफ)', hint: 'हाफ डिश' },
  Full: { label: 'Full (फुल)', hint: 'फुल डिश' },
  Bowl: { label: 'Bowl (वाटी)', hint: 'वाटी (करी / उसळ / भाजी)' },
  Glass: { label: 'Glass (ग्लास)', hint: 'ग्लास (ताक / लस्सी / ज्यूस)' },
  Portion: { label: 'Portion (पोर्शन)', hint: 'एक पोर्शन डिश' },
  Strip: { label: 'Strip (पट्टी)', hint: 'औषध गोळ्यांची पट्टी' },
  Bottle: { label: 'Bottle (बाटली)', hint: 'सिरप / बाटली' },
  Pair: { label: 'Pair (जोडी)', hint: 'चप्पल, सॉक्स (जोडी)' },
  Set: { label: 'Set (सेट)', hint: 'कपडे / भांडी सेट' },
  Album: { label: 'Album (अल्बम)', hint: 'फोटो अल्बम' },
  Frame: { label: 'Frame (फ्रेम)', hint: 'फोटो फ्रेम' },
  Bundle: { label: 'Bundle (बंडल)', hint: 'बंडल पॅकिंग' },
  Meter: { label: 'Meter (मीटर)', hint: 'कापड / वायर मीटर' },
  Ft: { label: 'Ft (फूट)', hint: 'फूट (पाईप, वायर, नेट)' },
  Length: { label: 'Length (लेन्थ - 10/20ft)', hint: 'लेन्थ (10/20 फूट पाईप)' },
  Service: { label: 'Service (सर्व्हिस)', hint: 'ऑटो / बाईक सर्व्हिस पॅकेज' },
  Bag: { label: 'Bag (पोते / बॅग)', hint: 'सिमेंट, पुट्टी, खत (पोते)' },
  Ton: { label: 'Ton (टन)', hint: 'स्टील, वाळू, खडी (टन)' },
  Brass: { label: 'Brass (ब्रास)', hint: 'वाळू, खडी, विटा (ब्रास)' },
  Trolley: { label: 'Trolley (ट्रॉली)', hint: '१ ट्रॅक्टर ट्रॉली (वाळू/विटा/माती)' },
  Sqft: { label: 'Sqft (स्क्वेअर फूट)', hint: 'टाईल्स, ग्रॅनाईट, प्लायवुड' },
  Truck: { label: 'Truck (ट्रक)', hint: 'वाळू, विटा, माती (ट्रक)' },
  Vehicle: { label: 'Vehicle', hint: 'कोणतेही वाहन' },
  Bike: { label: 'Bike', hint: 'नवीन किंवा जुनी बाईक/मोटरसायकल' },
  Scooter: { label: 'Scooter', hint: 'स्कूटर, मोपेड किंवा ऍक्टिव्हा' },
  Car: { label: 'Car', hint: 'नवीन किंवा जुनी कार' },
  'E-Bike': { label: 'E-Bike', hint: 'इलेक्ट्रिक बाईक / स्कूटर' },
  Tractor: { label: 'Tractor', hint: 'ट्रॅक्टर किंवा शेतीचे वाहन' },
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

  if (bType === 'AUTO_DEALER') {
    switch (unit) {
      case 'Bike': return 'कोणतीही नवीन किंवा जुनी मोटरसायकल'
      case 'Scooter': return 'स्कूटर किंवा मोपेड'
      case 'Car': return 'चारचाकी वाहन'
      case 'E-Bike': return 'इलेक्ट्रिक बाईक किंवा स्कूटर'
      case 'Tractor': return 'शेतीसाठी ट्रॅक्टर'
      case 'Pc':
      case 'Pieces': return 'अतिरिक्त ॲक्सेसरीज (नग)'
    }
  }

  if (bType === 'AUTO_SPARES' || bType === 'AUTOMOBILE') {
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
      case 'Plate': return 'हॉटेल थाळी, डिश किंवा प्लेट'
      case 'Half': return 'हाफ पोर्शन / डिश'
      case 'Full': return 'फुल पोर्शन / डिश'
      case 'Portion': return 'एक पोर्शन डिश'
      case 'Pc':
      case 'Pieces': return 'बर्गर, पेस्ट्री, समोसा, पॅटीस, रोल्स, चपाती, रोटी (नग)'
      case 'Box': return 'कॉम्बो पार्सल बॉक्स'
      case 'Litre': return 'लस्सी, ड्रिंक्स, ग्रेव्ही (लीटर)'
      case 'Bottle': return 'ज्यूस, कोल्डड्रिंक, पाण्याची बाटली'
    }
  }

  if (bType === 'BAKERY_SWEETS') {
    switch (unit) {
      case 'Kg': return 'केक, मिठाई, फॅमिली पॅक (वजन)'
      case 'Gm': return 'स्वीट्स, ड्रायफ्रूट्स पॅक (ग्रॅम)'
      case 'Pack': return 'बेकरी पॅक, टोस्ट, खारी, स्नॅक्स पॅक'
      case 'Pc':
      case 'Pieces': return 'पेस्ट्री, पफ, पॅटीस, डोनट (नग)'
      case 'Box': return 'मिठाई बॉक्स, केक बॉक्स, गिफ्ट बॉक्स'
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

  if (bType === 'HARDWARE' || bType === 'HARDWARE_PLUMBING') {
    switch (unit) {
      case 'Pc':
      case 'Pieces': return 'स्विचेस, टूल्स, नट-बोल्ट, डोअर फिटिंग (नग)'
      case 'Set': return 'टूल सेट, स्क्रू ड्रायव्हर सेट, सॉकेट सेट'
      case 'Box': return 'स्क्रू बॉक्स, हार्डवेअर बॉक्स'
      case 'Meter': return 'वायर, पाईप (मीटर)'
      case 'Pair': return 'बिजागरी (Hinges), डोअर हँडल (जोडी)'
      case 'Kg': return 'खिळे, वायर (वजन)'
      case 'Pack': return 'पेंट्स, फेव्हिकॉल पॅक'
    }
  }

  if (bType === 'BUILDING_MATERIAL') {
    switch (unit) {
      case 'Bag': return 'सिमेंट, पुट्टी, वॉलकेअर पोते (बॅग)'
      case 'Ton': return 'स्टील, वाळू, खडी, सळई (टन)'
      case 'Brass': return 'वाळू, खडी (ब्रास)'
      case 'Sqft': return 'टाईल्स, ग्रॅनाईट, प्लायवुड, मार्बल (स्क्वेअर फूट)'
      case 'Pc':
      case 'Pieces': return 'रेडिमेड दरवाजे, पत्रा, सिमेंट शीट (नग)'
      case 'Bundle': return 'टीएमटी बार, वायर बंडल'
      case 'Litre': return 'पेंट्स, प्रायमर, वॉटरप्रूफिंग (लीटर)'
      case 'Truck': return 'वाळू, विटा, माती डंपर (ट्रक)'
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
      case 'Pieces': return 'स्मार्ट टीव्ही, लॅपटॉप, मोबाईल, फ्रिज, वॉशिंग मशीन, ॲक्सेसरीज (नग)'
      case 'Set': return 'होम थिएटर, कॉम्बो सेट, स्पीकर सेट'
      case 'Box': return 'सील बॉक्स आयटम, राउटर बॉक्स'
      case 'Pair': return 'वायरलेस इयरबड्स (TWS) जोडी'
      case 'Pack': return 'बॅटरी पॅक, केबल पॅक, स्क्रीन गार्ड पॅक'
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
  return label
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

export function getStockLabel(businessTypeId?: string, lang: string = 'mr', unit?: string): string {
  const bType = (businessTypeId || '').toUpperCase()
  const currentLang = (lang || 'mr').toLowerCase()

  const serviceUnits = ['Shoot', 'Event', 'Hour', 'Day', 'Service']
  const isService = (unit && serviceUnits.includes(unit)) || ((bType === 'SERVICES' || bType === 'PHOTO_STUDIO') && (!unit || serviceUnits.includes(unit)))

  if (isService && (unit === 'Shoot' || unit === 'Event' || unit === 'Hour' || unit === 'Day' || unit === 'Service' || !unit)) {
    // If unit is specifically Frame, Album, or Pc, it falls to the physical product label.
    if (unit && !serviceUnits.includes(unit)) {
      // do nothing, let it fall through
    } else {
      if (currentLang.startsWith('en')) return 'Max Bookings / Capacity'
      if (currentLang.startsWith('hi')) return 'आप कितनी बुकिंग ले सकते हैं?'
      return 'तुम्ही किती ऑर्डर्स / बुकिंग्स घेऊ शकता?'
    }
  }

  if (currentLang.startsWith('en')) return 'Available Quantity (In Shop)'
  if (currentLang.startsWith('hi')) return 'अभी दुकान में कितना माल है? (Available Qty)'
  return 'सध्या दुकानात किती माल उपलब्ध आहे? (Available Qty)'
}

export function getStockHint(businessTypeId?: string, lang: string = 'mr', unit?: string): string {
  const bType = (businessTypeId || '').toUpperCase()
  const currentLang = (lang || 'mr').toLowerCase()

  const serviceUnits = ['Shoot', 'Event', 'Hour', 'Day', 'Service']
  const isService = (unit && serviceUnits.includes(unit)) || ((bType === 'SERVICES' || bType === 'PHOTO_STUDIO') && (!unit || serviceUnits.includes(unit)))

  if (isService && (unit === 'Shoot' || unit === 'Event' || unit === 'Hour' || unit === 'Day' || unit === 'Service' || !unit)) {
    if (unit && !serviceUnits.includes(unit)) {
      // do nothing, let it fall through
    } else {
      if (currentLang.startsWith('en')) return 'Enter maximum orders you can accept (Enter 1000 for Unlimited)'
      if (currentLang.startsWith('hi')) return 'लिमिट सेट करें (अगर कोई लिमिट नहीं है, तो 1000 टाइप करें)'
      return 'लिमिट सेट करा (जर कोणतीही लिमिट नसेल, तर 1000 टाइप करा)'
    }
  }

  if (currentLang.startsWith('en')) return 'Enter the total items currently available for sale in your shop'
  if (currentLang.startsWith('hi')) return 'आपके पास बेचने के लिए कितने पीस/किलो रखे हैं? (0 होने पर आउट ऑफ स्टॉक दिखेगा)'
  return 'तुमच्याकडे विकण्यासाठी किती नग/किलो माल शिल्लक आहे? (0 झाल्यावर आउट ऑफ स्टॉक दिसेल)'
}
