export interface FishingLocation {
  id: string;
  name: string;
  coords: [number, number];
  type: 'river' | 'lake' | 'pond' | 'private_pond' | 'maritime';
  description: string;
  county: string;
  region: string;
  species: string[];
  facilities: string[];
  access: 'usor' | 'moderat' | 'dificil';
  parking: boolean;
  camping: boolean;
  recordCount: number;
  lastRecord?: string;
  imageUrl?: string;
}

export interface FishingZone {
  id: string;
  name: string;
  coords: [number, number][];
  color: string;
  description: string;
  protected: boolean;
}

export interface FishingShop {
  id: string;
  name: string;
  coords: [number, number];
  address: string;
  city: string;
  county: string;
  phone?: string;
  website?: string;
  description: string;
}

// Locații optimizate cu coordonate corecte
export const fishingLocations: FishingLocation[] = [
  // === DUNĂREA - 20 locații ===
  { id: '1', name: "Dunărea - Baziaș", coords: [44.8167, 21.3833], type: "river", description: "Intrarea Dunării în România", county: "CS", region: "Banat", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 15 },
  { id: '2', name: "Dunărea - Moldova Nouă", coords: [44.7333, 21.6667], type: "river", description: "Zonă cu apă adâncă", county: "CS", region: "Banat", species: ["Som", "Crap", "Șalău"], facilities: ["chei", "restaurante"], access: "moderat", parking: true, camping: true, recordCount: 12 },
  { id: '3', name: "Dunărea - Orșova", coords: [44.7167, 22.4000], type: "river", description: "Aval de baraj", county: "MH", region: "Oltenia", species: ["Som", "Crap", "Știucă", "Avat"], facilities: ["chei", "hoteluri"], access: "usor", parking: true, camping: false, recordCount: 28 },
  { id: '4', name: "Dunărea - Drobeta", coords: [44.6306, 22.6564], type: "river", description: "Porțile de Fier", county: "MH", region: "Oltenia", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "muzee"], access: "usor", parking: true, camping: false, recordCount: 35 },
  { id: '5', name: "Dunărea - Gruia", coords: [44.2167, 22.6500], type: "river", description: "Zonă cu golfuri", county: "MH", region: "Oltenia", species: ["Som", "Crap", "Biban"], facilities: ["chei", "restaurante"], access: "moderat", parking: true, camping: true, recordCount: 22 },
  { id: '6', name: "Dunărea - Calafat", coords: [43.9833, 22.9333], type: "river", description: "Mal cu vegetație bogată", county: "DJ", region: "Oltenia", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "hoteluri"], access: "usor", parking: true, camping: false, recordCount: 18 },
  { id: '7', name: "Dunărea - Bechet", coords: [43.7833, 23.9500], type: "river", description: "Zonă largă cu adâncimi", county: "DJ", region: "Oltenia", species: ["Som", "Crap", "Șalău"], facilities: ["chei", "parcări"], access: "moderat", parking: true, camping: true, recordCount: 25 },
  { id: '8', name: "Dunărea - Corabia", coords: [43.7667, 24.5000], type: "river", description: "Port dunărean", county: "OT", region: "Oltenia", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 31 },
  { id: '9', name: "Dunărea - Turnu Măgurele", coords: [43.7500, 24.8667], type: "river", description: "Zonă cu brațe", county: "TR", region: "Muntenia", species: ["Som", "Crap", "Biban"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: true, recordCount: 19 },
  { id: '10', name: "Dunărea - Zimnicea", coords: [43.6667, 25.3667], type: "river", description: "Mal înalt", county: "TR", region: "Muntenia", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "restaurante"], access: "moderat", parking: true, camping: false, recordCount: 26 },
  { id: '11', name: "Dunărea - Giurgiu", coords: [43.9037, 25.9699], type: "river", description: "Zonă portuară", county: "GR", region: "Muntenia", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "hoteluri"], access: "usor", parking: true, camping: false, recordCount: 33 },
  { id: '12', name: "Dunărea - Oltenița", coords: [44.0833, 26.6333], type: "river", description: "Confluență cu Argeș", county: "CL", region: "Muntenia", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "restaurante"], access: "usor", parking: true, camping: true, recordCount: 27 },
  { id: '13', name: "Dunărea - Călărași", coords: [44.2058, 27.3306], type: "river", description: "Braț principal", county: "CL", region: "Muntenia", species: ["Som", "Crap", "Știucă", "Șalău"], facilities: ["chei", "hoteluri"], access: "usor", parking: true, camping: false, recordCount: 42 },
  { id: '14', name: "Dunărea - Fetești", coords: [44.3833, 27.8333], type: "river", description: "Balta Ialomiței", county: "IL", region: "Muntenia", species: ["Som", "Crap", "Biban"], facilities: ["chei", "restaurante"], access: "moderat", parking: true, camping: true, recordCount: 29 },
  { id: '15', name: "Dunărea - Cernavodă", coords: [44.3333, 28.0333], type: "river", description: "Zonă cu canale", county: "CT", region: "Dobrogea", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 38 },
  { id: '16', name: "Dunărea - Hârșova", coords: [44.6833, 27.9500], type: "river", description: "Cotul Dunării", county: "CT", region: "Dobrogea", species: ["Som", "Crap", "Șalău"], facilities: ["chei", "restaurante"], access: "moderat", parking: true, camping: true, recordCount: 24 },
  { id: '17', name: "Dunărea - Brăila", coords: [45.2692, 27.9575], type: "river", description: "Port principal", county: "BR", region: "Muntenia", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "hoteluri"], access: "usor", parking: true, camping: false, recordCount: 45 },
  { id: '18', name: "Dunărea - Galați", coords: [45.4353, 28.0080], type: "river", description: "Confluență cu Siret", county: "GL", region: "Moldova", species: ["Som", "Crap", "Biban", "Șalău"], facilities: ["chei", "hoteluri"], access: "usor", parking: true, camping: false, recordCount: 51 },
  { id: '19', name: "Dunărea - Tulcea", coords: [45.1667, 28.8000], type: "river", description: "Începutul Deltei", county: "TL", region: "Dobrogea", species: ["Som", "Crap", "Știucă", "Roșioară"], facilities: ["chei", "ghizi", "hoteluri"], access: "usor", parking: true, camping: true, recordCount: 67 },
  { id: '20', name: "Dunărea - Sulina", coords: [45.1500, 29.6500], type: "river", description: "Brațul Sulina", county: "TL", region: "Dobrogea", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "ghizi"], access: "dificil", parking: false, camping: true, recordCount: 23 },

  // === MUREȘ - 15 locații ===
  { id: '21', name: "Mureș - Deva", coords: [45.8667, 22.9000], type: "river", description: "Sector montan", county: "HD", region: "Transilvania", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["trasee", "cabane"], access: "moderat", parking: true, camping: true, recordCount: 18 },
  { id: '22', name: "Mureș - Orăștie", coords: [45.8333, 23.2000], type: "river", description: "Zonă colinară", county: "HD", region: "Transilvania", species: ["Crap", "Biban", "Clean"], facilities: ["chei", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 25 },
  { id: '23', name: "Mureș - Sebeș", coords: [45.9500, 23.5667], type: "river", description: "Confluență cu Sebeș", county: "AB", region: "Transilvania", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: true, recordCount: 31 },
  { id: '24', name: "Mureș - Alba Iulia", coords: [46.0667, 23.5833], type: "river", description: "Zonă urbană", county: "AB", region: "Transilvania", species: ["Crap", "Știucă", "Biban"], facilities: ["chei", "hoteluri"], access: "usor", parking: true, camping: false, recordCount: 28 },
  { id: '25', name: "Mureș - Aiud", coords: [46.3167, 23.7167], type: "river", description: "Meandre largi", county: "AB", region: "Transilvania", species: ["Crap", "Biban", "Roșioară"], facilities: ["chei", "restaurante"], access: "moderat", parking: true, camping: true, recordCount: 22 },
  { id: '26', name: "Mureș - Ocna Mureș", coords: [46.3833, 23.8500], type: "river", description: "Zonă sărată", county: "AB", region: "Transilvania", species: ["Crap", "Caras", "Biban"], facilities: ["chei", "hoteluri"], access: "usor", parking: true, camping: false, recordCount: 19 },
  { id: '27', name: "Mureș - Târgu Mureș", coords: [46.5425, 24.5579], type: "river", description: "Centru urban major", county: "MS", region: "Transilvania", species: ["Crap", "Biban", "Roșioară"], facilities: ["chei", "hoteluri"], access: "usor", parking: true, camping: false, recordCount: 35 },
  { id: '28', name: "Mureș - Reghin", coords: [46.7833, 24.7000], type: "river", description: "Zonă montană", county: "MS", region: "Transilvania", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["trasee", "cabane"], access: "moderat", parking: true, camping: true, recordCount: 26 },
  { id: '29', name: "Mureș - Târnăveni", coords: [46.3333, 24.2833], type: "river", description: "Confluență cu Târnava", county: "MS", region: "Transilvania", species: ["Crap", "Biban", "Clean"], facilities: ["chei", "restaurante"], access: "usor", parking: true, camping: true, recordCount: 24 },
  { id: '30', name: "Mureș - Luduș", coords: [46.4833, 24.0833], type: "river", description: "Zonă lată", county: "MS", region: "Transilvania", species: ["Crap", "Știucă", "Biban"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 29 },
  { id: '31', name: "Mureș - Arad", coords: [46.1866, 21.3123], type: "river", description: "Sector inferior", county: "AR", region: "Banat", species: ["Știucă", "Biban", "Crap"], facilities: ["chei", "hoteluri"], access: "usor", parking: true, camping: false, recordCount: 32 },
  { id: '32', name: "Mureș - Lipova", coords: [46.0833, 21.6833], type: "river", description: "Zonă de câmpie", county: "AR", region: "Banat", species: ["Crap", "Som", "Biban"], facilities: ["chei", "restaurante"], access: "moderat", parking: true, camping: true, recordCount: 21 },
  { id: '33', name: "Mureș - Sântana", coords: [46.3333, 21.0333], type: "river", description: "Aproape de graniță", county: "AR", region: "Banat", species: ["Crap", "Știucă", "Biban"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 18 },
  { id: '34', name: "Mureș - Pecica", coords: [46.1667, 21.0500], type: "river", description: "Meandre mari", county: "AR", region: "Banat", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "restaurante"], access: "moderat", parking: true, camping: true, recordCount: 25 },
  { id: '35', name: "Mureș - Nădlac", coords: [46.1500, 20.7500], type: "river", description: "Vărsare în Tisa", county: "AR", region: "Banat", species: ["Som", "Crap", "Biban"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 16 },

  // === LACURI MARI - 25 locații ===
  { id: '36', name: "Lacul Vidraru", coords: [45.3539, 24.6367], type: "lake", description: "Lac de acumulare montan", county: "AG", region: "Muntenia", species: ["Păstrăv", "Crap", "Biban"], facilities: ["chei", "cabane", "hoteluri"], access: "moderat", parking: true, camping: true, recordCount: 42 },
  { id: '37', name: "Lacul Bicaz", coords: [46.9167, 25.9333], type: "lake", description: "Cel mai mare lac montan", county: "NT", region: "Moldova", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["chei", "cabane", "hoteluri"], access: "moderat", parking: true, camping: true, recordCount: 38 },
  { id: '38', name: "Lacul Snagov", coords: [44.7031, 26.1858], type: "lake", description: "Lac natural istoric", county: "IF", region: "Muntenia", species: ["Crap", "Som", "Știucă", "Biban"], facilities: ["chei", "restaurante", "hoteluri"], access: "usor", parking: true, camping: false, recordCount: 67 },
  { id: '39', name: "Lacul Cernica", coords: [44.4500, 26.2667], type: "lake", description: "Complex de lacuri", county: "IF", region: "Muntenia", species: ["Crap", "Caras", "Biban"], facilities: ["chei", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 45 },
  { id: '40', name: "Lacul Morii", coords: [44.4262, 26.0155], type: "lake", description: "Cel mai mare lac din București", county: "B", region: "Muntenia", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 53 },
  { id: '41', name: "Lacul Herăstrău", coords: [44.4795, 26.0834], type: "lake", description: "Lac urban amenajat", county: "B", region: "Muntenia", species: ["Crap", "Caras", "Roșioară"], facilities: ["chei", "restaurante", "parcări"], access: "usor", parking: true, camping: false, recordCount: 38 },
  { id: '42', name: "Lacul Floreasca", coords: [44.4833, 26.1000], type: "lake", description: "Parte din salba de lacuri", county: "B", region: "Muntenia", species: ["Crap", "Biban", "Roșioară"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 29 },
  { id: '43', name: "Lacul Tei", coords: [44.4667, 26.1167], type: "lake", description: "Lac urban pescuit sportiv", county: "B", region: "Muntenia", species: ["Crap", "Caras", "Biban"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 31 },
  { id: '44', name: "Lacul Plumbuita", coords: [44.4500, 26.1333], type: "lake", description: "Lac cu vegetație bogată", county: "B", region: "Muntenia", species: ["Crap", "Biban", "Roșioară"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 26 },
  { id: '45', name: "Lacul Fundeni", coords: [44.4333, 26.1500], type: "lake", description: "Lac de agrement", county: "B", region: "Muntenia", species: ["Crap", "Caras"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 24 },
  { id: '46', name: "Lacul Pantelimon", coords: [44.4167, 26.1667], type: "lake", description: "Zonă rezidențială", county: "B", region: "Muntenia", species: ["Crap", "Biban"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 19 },
  { id: '47', name: "Lacul Grozăvești", coords: [44.4333, 26.0667], type: "lake", description: "Lac mic urban", county: "B", region: "Muntenia", species: ["Caras", "Roșioară"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 16 },
  { id: '48', name: "Lacul Colentina", coords: [44.4583, 26.1250], type: "lake", description: "Pescuit sportiv", county: "B", region: "Muntenia", species: ["Crap", "Biban"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 28 },
  { id: '49', name: "Lacul Titan", coords: [44.4217, 26.1533], type: "lake", description: "Parc Titan", county: "B", region: "Muntenia", species: ["Crap", "Biban", "Roșioară"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 22 },
  { id: '50', name: "Lacul Văcărești", coords: [44.4000, 26.1333], type: "lake", description: "Delta urbană", county: "B", region: "Muntenia", species: ["Crap", "Știucă", "Biban"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 35 },
  { id: '51', name: "Lacul Buftea", coords: [44.5667, 25.9500], type: "lake", description: "Lac de agrement", county: "IF", region: "Muntenia", species: ["Crap", "Caras", "Biban"], facilities: ["chei", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 27 },
  { id: '52', name: "Lacul Căldărușani", coords: [44.6167, 26.3333], type: "lake", description: "Mănăstire istorică", county: "IF", region: "Muntenia", species: ["Crap", "Som", "Știucă"], facilities: ["chei", "hoteluri"], access: "usor", parking: true, camping: false, recordCount: 33 },
  { id: '53', name: "Lacul Pasărea", coords: [44.3500, 26.2333], type: "lake", description: "Zonă protejată", county: "IF", region: "Muntenia", species: ["Crap", "Biban"], facilities: ["chei", "parcări"], access: "moderat", parking: true, camping: true, recordCount: 21 },
  { id: '54', name: "Lacul Brănești", coords: [44.4667, 26.3333], type: "lake", description: "Pescuit sportiv", county: "IF", region: "Muntenia", species: ["Crap", "Caras"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 24 },
  { id: '55', name: "Lacul Dridu", coords: [44.7000, 26.4000], type: "lake", description: "Lac de acumulare mare", county: "IL", region: "Muntenia", species: ["Crap", "Som", "Știucă"], facilities: ["chei", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 38 },
  { id: '56', name: "Lacul Amara", coords: [44.6000, 26.7000], type: "lake", description: "Lac sărat terapeutic", county: "IL", region: "Muntenia", species: ["Crap", "Caras"], facilities: ["chei", "hoteluri"], access: "usor", parking: true, camping: false, recordCount: 19 },
  { id: '57', name: "Lacul Fundata", coords: [44.4833, 27.5667], type: "lake", description: "Lac de câmpie", county: "IL", region: "Muntenia", species: ["Crap", "Biban"], facilities: ["chei", "parcări"], access: "moderat", parking: true, camping: true, recordCount: 25 },
  { id: '58', name: "Lacul Strachina", coords: [44.5167, 27.0833], type: "lake", description: "Pescuit comercial", county: "IL", region: "Muntenia", species: ["Crap", "Som"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: false, recordCount: 31 },
  { id: '59', name: "Lacul Sărățuica", coords: [44.5500, 27.2000], type: "lake", description: "Lac sărat", county: "IL", region: "Muntenia", species: ["Crap", "Caras"], facilities: ["chei", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 18 },
  { id: '60', name: "Lacul Bâlea", coords: [45.6064, 24.6208], type: "lake", description: "Lac glaciar 2034m altitudine", county: "SB", region: "Transilvania", species: ["Păstrăv"], facilities: ["cabane", "trasee"], access: "dificil", parking: false, camping: true, recordCount: 12 },

  // === BĂLȚI ȘI ZONE UMEDE - 30 locații ===
  { id: '61', name: "Balta Comana", coords: [44.1736, 26.1531], type: "pond", description: "Rezervație naturală", county: "GR", region: "Muntenia", species: ["Crap", "Som", "Caras"], facilities: ["chei", "ghizi"], access: "moderat", parking: true, camping: true, recordCount: 28 },
  { id: '62', name: "Balta Greaca", coords: [44.0500, 26.5000], type: "pond", description: "Zonă protejată", county: "GR", region: "Muntenia", species: ["Crap", "Som", "Știucă"], facilities: ["chei", "parcări"], access: "moderat", parking: true, camping: true, recordCount: 22 },
  { id: '63', name: "Balta Ialomiței", coords: [44.5347, 27.3806], type: "pond", description: "Complex de bălți", county: "IL", region: "Muntenia", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 35 },
  { id: '64', name: "Balta Brăilei", coords: [45.2692, 27.9575], type: "pond", description: "Insulă mare", county: "BR", region: "Muntenia", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "ghizi"], access: "moderat", parking: true, camping: true, recordCount: 41 },
  { id: '65', name: "Balta Mică a Brăilei", coords: [45.2000, 27.8000], type: "pond", description: "Rezervație", county: "BR", region: "Muntenia", species: ["Som", "Crap"], facilities: ["chei", "parcări"], access: "moderat", parking: true, camping: true, recordCount: 19 },
  { id: '66', name: "Balta Albă", coords: [45.1667, 29.3333], type: "pond", description: "Delta Dunării", county: "TL", region: "Dobrogea", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "ghizi"], access: "dificil", parking: false, camping: true, recordCount: 26 },
  { id: '67', name: "Balta Râioasa", coords: [45.1500, 29.4000], type: "pond", description: "Delta sălbatică", county: "TL", region: "Dobrogea", species: ["Som", "Crap"], facilities: ["chei", "ghizi"], access: "dificil", parking: false, camping: true, recordCount: 18 },
  { id: '68', name: "Balta Matița", coords: [45.3000, 29.0000], type: "pond", description: "Complex deltaic", county: "TL", region: "Dobrogea", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "ghizi"], access: "moderat", parking: true, camping: true, recordCount: 32 },
  { id: '69', name: "Balta Merhei", coords: [45.2500, 29.1000], type: "pond", description: "Zonă pescărească", county: "TL", region: "Dobrogea", species: ["Som", "Crap"], facilities: ["chei", "ghizi"], access: "moderat", parking: true, camping: true, recordCount: 24 },
  { id: '70', name: "Balta Babina", coords: [45.3500, 29.0500], type: "pond", description: "Rezervație strictă", county: "TL", region: "Dobrogea", species: ["Som", "Crap", "Știucă"], facilities: ["chei", "ghizi"], access: "dificil", parking: false, camping: true, recordCount: 15 },

  // === BĂLȚI PRIVATE - 25 locații ===
  { id: '71', name: "Complex Șnagov Sat", coords: [44.6833, 26.1667], type: "private_pond", description: "Facilități premium", county: "IF", region: "Muntenia", species: ["Crap", "Som", "Sturion"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 89 },
  { id: '72', name: "Paradis Delta", coords: [44.6167, 26.1000], type: "private_pond", description: "Complex exclusivist", county: "IF", region: "Muntenia", species: ["Crap", "Som", "Știucă"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 76 },
  { id: '73', name: "Pescărușul Albastru", coords: [44.5000, 26.1667], type: "private_pond", description: "Pescuit nocturn", county: "IF", region: "Muntenia", species: ["Crap", "Som", "Amur"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 67 },
  { id: '74', name: "Lebăda Resort", coords: [44.7333, 26.2333], type: "private_pond", description: "Resort pescuit", county: "IF", region: "Muntenia", species: ["Crap", "Som"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 54 },
  { id: '75', name: "Crap Arena", coords: [44.5500, 26.0500], type: "private_pond", description: "Concursuri crap", county: "IF", region: "Muntenia", species: ["Crap", "Amur", "Som"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 92 },
  { id: '76', name: "Sălcioara Lake", coords: [44.6000, 26.2000], type: "private_pond", description: "Pescuit familial", county: "IF", region: "Muntenia", species: ["Crap", "Som"], facilities: ["chei", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 48 },
  { id: '77', name: "Tărâța Complex", coords: [44.4833, 26.3333], type: "private_pond", description: "Multiple bazine", county: "IF", region: "Muntenia", species: ["Crap", "Știucă"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 63 },
  { id: '78', name: "Mega Carp", coords: [44.5167, 25.9833], type: "private_pond", description: "Exemplare mari", county: "IF", region: "Muntenia", species: ["Crap", "Som"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 71 },
  { id: '79', name: "Fish Paradise", coords: [44.4500, 26.0333], type: "private_pond", description: "Pescuit sportiv", county: "IF", region: "Muntenia", species: ["Crap", "Amur"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 58 },
  { id: '80', name: "Royal Fish", coords: [44.7000, 26.1500], type: "private_pond", description: "Lux și pescuit", county: "IF", region: "Muntenia", species: ["Crap", "Som", "Sturion"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 83 },

  // === OLT - 15 locații ===
  { id: '81', name: "Olt - Râmnicu Vâlcea", coords: [45.1000, 24.3667], type: "river", description: "Sector montan cu peisaje spectaculoase", county: "VL", region: "Oltenia", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["chei", "cabane", "trasee"], access: "moderat", parking: true, camping: true, recordCount: 28 },
  { id: '82', name: "Olt - Călimănești", coords: [45.2333, 24.3167], type: "river", description: "Cheile Oltului - zonă protejată", county: "VL", region: "Oltenia", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["chei", "cabane", "trasee"], access: "moderat", parking: true, camping: true, recordCount: 35 },
  { id: '83', name: "Olt - Turnu Roșu", coords: [45.3500, 24.3000], type: "river", description: "Cheile Turnu Roșu", county: "SB", region: "Transilvania", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["chei", "cabane"], access: "dificil", parking: false, camping: true, recordCount: 22 },
  { id: '84', name: "Olt - Avrig", coords: [45.7167, 24.3833], type: "river", description: "Zonă colinară cu meandre", county: "SB", region: "Transilvania", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["chei", "parcări"], access: "moderat", parking: true, camping: true, recordCount: 19 },
  { id: '85', name: "Olt - Sibiu", coords: [45.8000, 24.1500], type: "river", description: "Centru urban cu pescuit sportiv", county: "SB", region: "Transilvania", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["chei", "restaurante", "hoteluri"], access: "usor", parking: true, camping: false, recordCount: 31 },
  { id: '86', name: "Olt - Făgăraș", coords: [45.8500, 24.9667], type: "river", description: "Zonă montană cu peisaje alpine", county: "BV", region: "Transilvania", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["chei", "cabane", "trasee"], access: "moderat", parking: true, camping: true, recordCount: 26 },
  { id: '87', name: "Olt - Breaza", coords: [45.7167, 25.0667], type: "river", description: "Sector cu adâncimi mari", county: "BV", region: "Transilvania", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["chei", "parcări"], access: "moderat", parking: true, camping: true, recordCount: 18 },
  { id: '88', name: "Olt - Predeal", coords: [45.5000, 25.5667], type: "river", description: "Zonă montană cu izvoare reci", county: "BV", region: "Transilvania", species: ["Păstrăv", "Lipan"], facilities: ["chei", "cabane"], access: "dificil", parking: false, camping: true, recordCount: 15 },
  { id: '89', name: "Olt - Bușteni", coords: [45.4000, 25.5333], type: "river", description: "Cheile Buzăului - zonă turistică", county: "PH", region: "Muntenia", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 33 },
  { id: '90', name: "Olt - Sinaia", coords: [45.3500, 25.5500], type: "river", description: "Stațiune montană cu facilități", county: "PH", region: "Muntenia", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 29 },
  { id: '91', name: "Olt - Comarnic", coords: [45.2500, 25.6333], type: "river", description: "Zonă de câmpie cu acces ușor", county: "PH", region: "Muntenia", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "parcări"], access: "usor", parking: true, camping: true, recordCount: 24 },
  { id: '92', name: "Olt - Ploiești", coords: [44.9500, 26.0167], type: "river", description: "Sector urban cu pescuit sportiv", county: "PH", region: "Muntenia", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 27 },
  { id: '93', name: "Olt - Mizil", coords: [45.0167, 26.4500], type: "river", description: "Zonă de câmpie cu meandre", county: "PH", region: "Muntenia", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "parcări"], access: "moderat", parking: true, camping: true, recordCount: 21 },
  { id: '94', name: "Olt - Urziceni", coords: [44.7167, 26.6333], type: "river", description: "Confluență cu Ialomița", county: "IL", region: "Muntenia", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 25 },
  { id: '95', name: "Olt - Slobozia", coords: [44.5667, 27.3667], type: "river", description: "Vărsare în Dunăre", county: "IL", region: "Muntenia", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "parcări"], access: "moderat", parking: true, camping: true, recordCount: 19 },

  // === SIRET - 10 locații ===
  { id: '96', name: "Siret - Suceava", coords: [47.6500, 26.2500], type: "river", description: "Sector montan cu peisaje spectaculoase", county: "SV", region: "Moldova", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["chei", "cabane", "trasee"], access: "moderat", parking: true, camping: true, recordCount: 31 },
  { id: '97', name: "Siret - Pașcani", coords: [47.2500, 26.7167], type: "river", description: "Zonă colinară cu meandre", county: "IS", region: "Moldova", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["chei", "restaurante"], access: "moderat", parking: true, camping: true, recordCount: 24 },
  { id: '98', name: "Siret - Roman", coords: [46.9167, 26.9167], type: "river", description: "Centru urban cu pescuit sportiv", county: "NT", region: "Moldova", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 28 },
  { id: '99', name: "Siret - Bacău", coords: [46.5667, 26.9167], type: "river", description: "Zonă de câmpie cu facilități", county: "BC", region: "Moldova", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 35 },
  { id: '100', name: "Siret - Adjud", coords: [46.1000, 27.1667], type: "river", description: "Sector cu adâncimi mari", county: "VN", region: "Moldova", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "parcări"], access: "moderat", parking: true, camping: true, recordCount: 22 },

  // === PRUT - 8 locații ===
  { id: '101', name: "Prut - Botoșani", coords: [47.7500, 26.6667], type: "river", description: "Sector montan cu peisaje naturale", county: "BT", region: "Moldova", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["chei", "cabane"], access: "moderat", parking: true, camping: true, recordCount: 19 },
  { id: '102', name: "Prut - Iași", coords: [47.1667, 27.6000], type: "river", description: "Centru urban cu pescuit sportiv", county: "IS", region: "Moldova", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 32 },
  { id: '103', name: "Prut - Ungheni", coords: [47.2167, 27.8000], type: "river", description: "Zonă de frontieră cu facilități", county: "IS", region: "Moldova", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "restaurante"], access: "moderat", parking: true, camping: true, recordCount: 18 },
  { id: '104', name: "Prut - Cahul", coords: [45.9000, 28.1833], type: "river", description: "Vărsare în Dunăre", county: "TL", region: "Dobrogea", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "ghizi"], access: "dificil", parking: false, camping: true, recordCount: 15 },

  // === ARGEȘ - 12 locații ===
  { id: '105', name: "Argeș - Câmpulung", coords: [45.2667, 25.0500], type: "river", description: "Sector montan cu peisaje alpine", county: "AG", region: "Muntenia", species: ["Păstrăv", "Lipan", "Biban"], facilities: ["chei", "cabane", "trasee"], access: "moderat", parking: true, camping: true, recordCount: 26 },
  { id: '106', name: "Argeș - Curtea de Argeș", coords: [45.1333, 24.6833], type: "river", description: "Zonă istorică cu facilități", county: "AG", region: "Muntenia", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 29 },
  { id: '107', name: "Argeș - Pitești", coords: [44.8667, 24.8667], type: "river", description: "Centru urban cu pescuit sportiv", county: "AG", region: "Muntenia", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 34 },
  { id: '108', name: "Argeș - Găești", coords: [44.7167, 25.3167], type: "river", description: "Zonă de câmpie cu meandre", county: "DB", region: "Muntenia", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "restaurante"], access: "moderat", parking: true, camping: true, recordCount: 22 },
  { id: '109', name: "Argeș - Târgoviște", coords: [44.9167, 25.4500], type: "river", description: "Centru istoric cu facilități", county: "DB", region: "Muntenia", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "hoteluri", "restaurante"], access: "usor", parking: true, camping: false, recordCount: 27 },
  { id: '110', name: "Argeș - Oltenița", coords: [44.0833, 26.6333], type: "river", description: "Confluență cu Dunărea", county: "CL", region: "Muntenia", species: ["Crap", "Biban", "Știucă"], facilities: ["chei", "restaurante"], access: "usor", parking: true, camping: true, recordCount: 31 }
];

// Magazine de pescuit
export const fishingShops: FishingShop[] = [
  { id: '1', name: "Pescărușul", coords: [44.4262, 26.0155], address: "Strada Pescărușului 15", city: "București", county: "B", phone: "021 123 4567", website: "https://pescarusul.ro", description: "Magazin specializat în echipamente de pescuit" },
  { id: '2', name: "Fish & Tackle", coords: [44.4795, 26.0834], address: "Bulevardul Herăstrău 45", city: "București", county: "B", phone: "021 234 5678", website: "https://fishandtackle.ro", description: "Echipamente profesionale de pescuit" },
  { id: '3', name: "Crap Master", coords: [44.7031, 26.1858], address: "Șoseaua Snagov 123", city: "Snagov", county: "IF", phone: "021 345 6789", website: "https://crapmaster.ro", description: "Specializat în pescuitul de crap" },
  { id: '4', name: "Pescuit Pro", coords: [45.3539, 24.6367], address: "Strada Lacului 67", city: "Călimănești", county: "AG", phone: "0248 456 7890", website: "https://pescuitpro.ro", description: "Echipamente pentru pescuit montan" },
  { id: '5', name: "Delta Fishing", coords: [45.1667, 28.8000], address: "Strada Deltei 89", city: "Tulcea", county: "TL", phone: "0240 567 8901", website: "https://deltafishing.ro", description: "Specializat în pescuitul din Delta Dunării" }
];

// Zone de pescuit
export const fishingZones: FishingZone[] = [
  { id: '1', name: 'Zona Marea Neagră', coords: [[43.5, 27.5], [43.5, 29.5], [45.5, 29.5], [45.5, 27.5]], color: '#3B82F6', description: 'Zona de pescuit maritim de la granița cu Bulgaria până la Delta Dunării', protected: false },
  { id: '2', name: 'Zona Delta Dunării', coords: [[44.5, 28.5], [44.5, 30.5], [46.5, 30.5], [46.5, 28.5]], color: '#10B981', description: 'Rezervația biosferei Delta Dunării cu canale și lacuri', protected: true }
];

// Funcții pentru filtrare și căutare
export const filterLocationsByType = (type: FishingLocation['type']) => {
  return fishingLocations.filter(location => location.type === type);
};

export const filterLocationsByCounty = (county: string) => {
  return fishingLocations.filter(location => location.county === county);
};

export const searchLocations = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return fishingLocations.filter(location => 
    location.name.toLowerCase().includes(lowerQuery) ||
    location.county.toLowerCase().includes(lowerQuery) ||
    location.region.toLowerCase().includes(lowerQuery) ||
    location.species.some(species => species.toLowerCase().includes(lowerQuery))
  );
};

export const getLocationById = (id: string) => {
  return fishingLocations.find(location => location.id === id);
};
