export const C = {
  ink: "#1B2431", paper: "#FAFAF6", yellow: "#F5B700", yellowDark: "#8A6600",
  steel: "#5B6472", line: "#DEDBD1", green: "#2F6B4F", greenBg: "#E7F0EA", card: "#FFFFFF",
};
export const FONT_HEAD = "'Oswald', 'Arial Narrow', sans-serif";
export const FONT_BODY = "'Inter', system-ui, sans-serif";

export const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: CURRENT_YEAR + 1 - 1980 + 1 }, (_, i) => CURRENT_YEAR + 1 - i);
export const STATE_ABBR = { Alabama:"AL",Alaska:"AK",Arizona:"AZ",Arkansas:"AR",California:"CA",Colorado:"CO",Connecticut:"CT",Delaware:"DE","District of Columbia":"DC",Florida:"FL",Georgia:"GA",Hawaii:"HI",Idaho:"ID",Illinois:"IL",Indiana:"IN",Iowa:"IA",Kansas:"KS",Kentucky:"KY",Louisiana:"LA",Maine:"ME",Maryland:"MD",Massachusetts:"MA",Michigan:"MI",Minnesota:"MN",Mississippi:"MS",Missouri:"MO",Montana:"MT",Nebraska:"NE",Nevada:"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND",Ohio:"OH",Oklahoma:"OK",Oregon:"OR",Pennsylvania:"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD",Tennessee:"TN",Texas:"TX",Utah:"UT",Vermont:"VT",Virginia:"VA",Washington:"WA","West Virginia":"WV",Wisconsin:"WI",Wyoming:"WY" };

export const MAKE_COLORS = { Ford:"#2B4C7E",Toyota:"#7E2B2B",Honda:"#2B7E4C",Chevrolet:"#7E6A2B",Jeep:"#3E4D2B",Tesla:"#3A3A3A",Subaru:"#2B577E",Ram:"#5A2B7E",GMC:"#7E4B2B",Nissan:"#2B7E7A",BMW:"#2B3A7E",Dodge:"#7E2B4A",Hyundai:"#1F6B5E",Kia:"#7E1F5E",Mazda:"#8E2A2A",Volkswagen:"#2A5A8E",Lexus:"#5E5E2A",Audi:"#2A2A5E",Acura:"#4A2A6E",Cadillac:"#6E4A2A",Buick:"#3A5A5A","Mercedes-Benz":"#2A3A3A",Chrysler:"#5A2A2A",Mitsubishi:"#7E4A1F",Volvo:"#1F4A6E" };

export const BODY_SLUGS = { Sedan: "sedan", Coupe: "coupe", Hatchback: "hatchback", SUV: "suv", Truck: "truck", "Van/Minivan": "van-minivan", Convertible: "convertible" };
export const BODY_SLUGS_REVERSE = Object.fromEntries(Object.entries(BODY_SLUGS).map(([k, v]) => [v, k]));

export const LISTING_COLUMNS = "id,year,make,model,trim,price,mileage,city,state,fuel,trans,color,seller,verified,featured,body,condition,loan_status,loan_balance,damage_points,issues,description,phone,photos,created_at,status,price_updated_at,sold_at,source";

export const POPULAR_MAKES = ["Ford", "Toyota", "Honda", "Chevrolet", "Jeep", "Ram", "GMC", "Nissan", "Hyundai", "Kia", "Subaru", "Volkswagen", "BMW", "Mercedes-Benz", "Audi", "Lexus", "Mazda", "Dodge", "Chrysler", "Buick", "Cadillac", "Tesla", "Mitsubishi", "Volvo", "Acura"];

export const QR_SOURCES = [
  { key: "flyer-keywest", label: "Key West" },
  { key: "flyer-rockledge", label: "Rockledge" },
  { key: "flyer-orlando", label: "Orlando" },
  { key: "flyer-melbourne", label: "Melbourne" },
  { key: "flyer-cocoabeach", label: "Cocoa Beach" },
];

export const BODY_GUESS_RULES = [
  { body: "Truck", keywords: ["f-150", "f150", "f-250", "f250", "f-350", "f350", "silverado", "sierra", "1500", "2500", "3500", "tacoma", "tundra", "frontier", "titan", "ridgeline", "colorado", "canyon", "ranger", "maverick", "gladiator"] },
  { body: "Van/Minivan", keywords: ["odyssey", "sienna", "town and country", "grand caravan", "transit", "sprinter", "carnival", "pacifica"] },
  { body: "Coupe", keywords: ["mustang", "camaro", "challenger", "corvette", "brz", " 86", "supra", "370z", "miata", "mx-5"] },
  { body: "Convertible", keywords: ["convertible", "roadster", "spider", "cabriolet", "boxster"] },
  { body: "Hatchback", keywords: ["hatchback", "golf", "impreza", "veloster", " fit", "yaris"] },
  { body: "SUV", keywords: ["wrangler", "tahoe", "suburban", "yukon", "explorer", "expedition", "4runner", "highlander", "pilot", "cr-v", "crv", "rav4", "rogue", "murano", "pathfinder", "traverse", "equinox", "blazer", "grand cherokee", "cherokee", "durango", "telluride", "palisade", "santa fe", "tucson", "outback", "forester", "ascent", "atlas", "model x", "model y", "bronco", "escalade", "xt5", "xt6"] },
  { body: "Sedan", keywords: ["camry", "accord", "civic", "altima", "sentra", "corolla", "elantra", "sonata", "malibu", "impala", "fusion", "jetta", "passat", "3 series", "model 3", "model s", "a4", "a6", " es", " is"] },
];

export const selectStyle = { border: `1.5px solid ${C.line}`, borderRadius: 5, padding: "9px 12px", fontSize: 14.5, color: C.ink, background: "#fff", fontFamily: FONT_BODY, cursor: "pointer" };
export const inputStyle = { width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 5, padding: "11px 12px", fontSize: 15, color: C.ink, fontFamily: FONT_BODY, boxSizing: "border-box", background: "#fff" };

export let seed = [
  { year:2021, make:"Ford", model:"F-150", trim:"XLT SuperCrew", price:34900, mileage:28500, city:"Austin", state:"Texas", fuel:"Gas", trans:"Automatic", color:"Oxford White", seller:"Dealer", verified:true, posted:"2 days ago", body:"Truck", desc:"One-owner F-150 with tow package, backup camera, and clean Carfax.", featured:true },
  { year:2019, make:"Toyota", model:"Camry", trim:"SE", price:17200, mileage:41200, city:"Sacramento", state:"California", fuel:"Gas", trans:"Automatic", color:"Celestial Silver", seller:"Private", verified:false, posted:"5 hours ago", body:"Sedan", desc:"Well-maintained Camry, single owner, always garaged.", featured:false },
  { year:2022, make:"Honda", model:"Civic", trim:"Sport", price:21400, mileage:15300, city:"Orlando", state:"Florida", fuel:"Gas", trans:"Manual", color:"Rallye Red", seller:"Private", verified:true, posted:"1 day ago", body:"Sedan", desc:"Manual transmission Civic Sport, fun to drive and cheap on gas.", featured:false },
  { year:2020, make:"Chevrolet", model:"Silverado 1500", trim:"LT Trail Boss", price:32800, mileage:36700, city:"Buffalo", state:"New York", fuel:"Gas", trans:"Automatic", color:"Black", seller:"Dealer", verified:true, posted:"3 days ago", body:"Truck", desc:"Lifted Trail Boss trim, off-road package, tow hitch.", featured:true },
  { year:2018, make:"Jeep", model:"Wrangler", trim:"Rubicon", price:28900, mileage:52100, city:"Chicago", state:"Illinois", fuel:"Gas", trans:"Manual", color:"Firecracker Red", seller:"Private", verified:false, posted:"6 days ago", body:"SUV", desc:"Rubicon with soft top and hard top included.", featured:false },
  { year:2023, make:"Tesla", model:"Model 3", trim:"Long Range", price:38500, mileage:9800, city:"Columbus", state:"Ohio", fuel:"Electric", trans:"Automatic", color:"Pearl White", seller:"Private", verified:true, posted:"12 hours ago", body:"Sedan", desc:"Like-new Model 3 Long Range, full self-driving capable.", featured:false },
  { year:2019, make:"Subaru", model:"Outback", trim:"Premium", price:19700, mileage:47300, city:"Atlanta", state:"Georgia", fuel:"Gas", trans:"Automatic", color:"Wilderness Green", seller:"Private", verified:false, posted:"4 days ago", body:"Wagon", desc:"AWD Outback, great for road trips.", featured:false },
  { year:2021, make:"Ram", model:"1500", trim:"Big Horn", price:33200, mileage:24100, city:"Seattle", state:"Washington", fuel:"Gas", trans:"Automatic", color:"Granite Crystal", seller:"Dealer", verified:true, posted:"1 day ago", body:"Truck", desc:"Big Horn crew cab, leather seats, sunroof.", featured:false },
  { year:2020, make:"Honda", model:"CR-V", trim:"EX-L", price:24600, mileage:31500, city:"Phoenix", state:"Arizona", fuel:"Gas", trans:"Automatic", color:"Modern Steel", seller:"Dealer", verified:true, posted:"8 hours ago", body:"SUV", desc:"CR-V EX-L with leather, sunroof, and Honda Sensing.", featured:true },
  { year:2022, make:"Toyota", model:"RAV4", trim:"XLE", price:27800, mileage:18200, city:"Philadelphia", state:"Pennsylvania", fuel:"Hybrid", trans:"Automatic", color:"Blueprint", seller:"Private", verified:true, posted:"2 days ago", body:"SUV", desc:"Hybrid RAV4, excellent fuel economy.", featured:false },
  { year:2016, make:"Ford", model:"Mustang", trim:"GT Premium", price:23900, mileage:44800, city:"Charlotte", state:"North Carolina", fuel:"Gas", trans:"Manual", color:"Race Red", seller:"Private", verified:false, posted:"3 days ago", body:"Coupe", desc:"5.0 GT with manual gearbox.", featured:false },
  { year:2019, make:"Chevrolet", model:"Tahoe", trim:"LT", price:36700, mileage:39400, city:"Detroit", state:"Michigan", fuel:"Gas", trans:"Automatic", color:"Black", seller:"Dealer", verified:true, posted:"5 days ago", body:"SUV", desc:"Third-row Tahoe LT, tow package, captains chairs.", featured:false },
  { year:2018, make:"Nissan", model:"Altima", trim:"SV", price:15300, mileage:58600, city:"Nashville", state:"Tennessee", fuel:"Gas", trans:"Automatic", color:"Gun Metallic", seller:"Private", verified:false, posted:"4 days ago", body:"Sedan", desc:"Reliable commuter car, recent inspection.", featured:false },
  { year:2021, make:"BMW", model:"3 Series", trim:"330i", price:31900, mileage:22700, city:"Las Vegas", state:"Nevada", fuel:"Gas", trans:"Automatic", color:"Alpine White", seller:"Dealer", verified:true, posted:"6 hours ago", body:"Sedan", desc:"330i with premium package, heated seats.", featured:false },
  { year:2020, make:"Dodge", model:"Charger", trim:"R/T", price:29400, mileage:27900, city:"Portland", state:"Oregon", fuel:"Gas", trans:"Automatic", color:"Octane Red", seller:"Private", verified:false, posted:"2 days ago", body:"Sedan", desc:"5.7 HEMI Charger R/T, strong and quick.", featured:false },
];
seed = seed.map((c, i) => ({ ...c, id: i + 1 }));

export const QUIZ_STATEMENTS = [
  { key: "haul", text: "I need a car that can haul stuff." },
  { key: "speed", text: "Speed matters more to me than saving gas money." },
  { key: "fun", text: "Driving is fun for me." },
  { key: "people", text: "I like having people in the car with me." },
  { key: "dirt", text: "A little dirt never hurt." },
  { key: "identity", text: "My car feels like an extension of me." },
  { key: "notice", text: "I want people to notice my car." },
  { key: "whim", text: "I could buy a car on a whim." },
  { key: "tradehp", text: "I'd trade horsepower for better gas mileage." },
  { key: "opinion", text: "I'd be embarrassed showing up in a beat-up car." },
];

export const ARCHETYPE_PROFILES = {
  "Soccer Mom Mode": { haul: 5, speed: 1, fun: 2, people: 5, dirt: 4, identity: 2, notice: 1, whim: 1, tradehp: 4, opinion: 2 },
  "Midlife Crisis": { haul: 2, speed: 5, fun: 5, people: 2, dirt: 2, identity: 5, notice: 5, whim: 5, tradehp: 1, opinion: 4 },
  "Dad Truck Energy": { haul: 5, speed: 3, fun: 3, people: 3, dirt: 5, identity: 3, notice: 2, whim: 2, tradehp: 2, opinion: 2 },
  "Broke College Energy": { haul: 3, speed: 2, fun: 3, people: 4, dirt: 5, identity: 1, notice: 1, whim: 1, tradehp: 3, opinion: 1 },
  "Main Character Energy": { haul: 1, speed: 3, fun: 4, people: 3, dirt: 1, identity: 5, notice: 5, whim: 4, tradehp: 1, opinion: 5 },
  "Beach Cruiser": { haul: 3, speed: 1, fun: 4, people: 4, dirt: 5, identity: 2, notice: 1, whim: 3, tradehp: 4, opinion: 1 },
  "Frat Row Special": { haul: 2, speed: 4, fun: 5, people: 5, dirt: 5, identity: 3, notice: 4, whim: 4, tradehp: 1, opinion: 2 },
  "Grandma's Sunday Car": { haul: 2, speed: 1, fun: 1, people: 3, dirt: 1, identity: 2, notice: 1, whim: 1, tradehp: 5, opinion: 3 },
  "Pedal to the Metal": { haul: 1, speed: 5, fun: 5, people: 2, dirt: 2, identity: 3, notice: 2, whim: 4, tradehp: 1, opinion: 2 },
  "CEO Commute": { haul: 1, speed: 3, fun: 2, people: 1, dirt: 1, identity: 4, notice: 4, whim: 1, tradehp: 3, opinion: 3 },
};
export const ARCHETYPE_BLURBS = {
  "Soccer Mom Mode": "Hauls the kids, the gear, and the snacks, and doesn't care what it looks like doing it.",
  "Midlife Crisis": "Top down, radio up, making up for lost time.",
  "Dad Truck Energy": "Practical, proud of it, and always ready to tow something.",
  "Broke College Energy": "Runs on hope and duct tape, and that's fine by them.",
  "Main Character Energy": "The car's a whole personality, and it's playing the lead.",
  "Beach Cruiser": "Windows down, no rush, vibes over horsepower.",
  "Frat Row Special": "Loud, a little chaotic, always got a full car.",
  "Grandma's Sunday Car": "Barely driven, perfectly kept, zero drama.",
  "Pedal to the Metal": "Horsepower over everything, gas mileage be damned.",
  "CEO Commute": "Sleek, efficient, no time to waste getting there.",
};
// Loose body-style pairing per archetype, used only to surface relevant
// listings on the results page — not part of the scoring itself.
export const ARCHETYPE_BODY = {
  "Soccer Mom Mode": "Van/Minivan", "Midlife Crisis": "Convertible", "Dad Truck Energy": "Truck",
  "Broke College Energy": "Sedan", "Main Character Energy": "Coupe", "Beach Cruiser": "Convertible",
  "Frat Row Special": "SUV", "Grandma's Sunday Car": "Sedan", "Pedal to the Metal": "Coupe", "CEO Commute": "Sedan",
};
