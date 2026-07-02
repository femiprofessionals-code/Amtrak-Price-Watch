import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Major Amtrak stations. Codes are real Amtrak station codes. */
const STATIONS: Array<{ code: string; name: string; city: string; state: string }> = [
  { code: "NYP", name: "New York Moynihan Train Hall", city: "New York", state: "NY" },
  { code: "WAS", name: "Washington Union Station", city: "Washington", state: "DC" },
  { code: "PHL", name: "Philadelphia 30th Street", city: "Philadelphia", state: "PA" },
  { code: "BOS", name: "Boston South Station", city: "Boston", state: "MA" },
  { code: "BBY", name: "Boston Back Bay", city: "Boston", state: "MA" },
  { code: "BAL", name: "Baltimore Penn Station", city: "Baltimore", state: "MD" },
  { code: "NWK", name: "Newark Penn Station", city: "Newark", state: "NJ" },
  { code: "PVD", name: "Providence Station", city: "Providence", state: "RI" },
  { code: "NHV", name: "New Haven Union Station", city: "New Haven", state: "CT" },
  { code: "WIL", name: "Wilmington Station", city: "Wilmington", state: "DE" },
  { code: "RVR", name: "Richmond Staples Mill Road", city: "Richmond", state: "VA" },
  { code: "ALB", name: "Albany-Rensselaer", city: "Albany", state: "NY" },
  { code: "CHI", name: "Chicago Union Station", city: "Chicago", state: "IL" },
  { code: "MKE", name: "Milwaukee Intermodal", city: "Milwaukee", state: "WI" },
  { code: "STL", name: "St. Louis Gateway Station", city: "St. Louis", state: "MO" },
  { code: "MSP", name: "St. Paul Union Depot", city: "St. Paul", state: "MN" },
  { code: "DET", name: "Detroit Station", city: "Detroit", state: "MI" },
  { code: "CLE", name: "Cleveland Lakefront", city: "Cleveland", state: "OH" },
  { code: "PGH", name: "Pittsburgh Union Station", city: "Pittsburgh", state: "PA" },
  { code: "CIN", name: "Cincinnati Union Terminal", city: "Cincinnati", state: "OH" },
  { code: "IND", name: "Indianapolis Union Station", city: "Indianapolis", state: "IN" },
  { code: "KCY", name: "Kansas City Union Station", city: "Kansas City", state: "MO" },
  { code: "DEN", name: "Denver Union Station", city: "Denver", state: "CO" },
  { code: "SLC", name: "Salt Lake City Intermodal Hub", city: "Salt Lake City", state: "UT" },
  { code: "LAX", name: "Los Angeles Union Station", city: "Los Angeles", state: "CA" },
  { code: "SAN", name: "San Diego Santa Fe Depot", city: "San Diego", state: "CA" },
  { code: "SNA", name: "Santa Ana Regional Transportation Center", city: "Santa Ana", state: "CA" },
  { code: "SBA", name: "Santa Barbara Station", city: "Santa Barbara", state: "CA" },
  { code: "SJC", name: "San Jose Diridon", city: "San Jose", state: "CA" },
  { code: "EMY", name: "Emeryville Station (San Francisco)", city: "Emeryville", state: "CA" },
  { code: "SAC", name: "Sacramento Valley Station", city: "Sacramento", state: "CA" },
  { code: "PDX", name: "Portland Union Station", city: "Portland", state: "OR" },
  { code: "SEA", name: "Seattle King Street Station", city: "Seattle", state: "WA" },
  { code: "ATL", name: "Atlanta Peachtree Station", city: "Atlanta", state: "GA" },
  { code: "CLT", name: "Charlotte Gateway Station", city: "Charlotte", state: "NC" },
  { code: "RGH", name: "Raleigh Union Station", city: "Raleigh", state: "NC" },
  { code: "SAV", name: "Savannah Station", city: "Savannah", state: "GA" },
  { code: "JAX", name: "Jacksonville Station", city: "Jacksonville", state: "FL" },
  { code: "ORL", name: "Orlando Health/Amtrak Station", city: "Orlando", state: "FL" },
  { code: "TPA", name: "Tampa Union Station", city: "Tampa", state: "FL" },
  { code: "MIA", name: "Miami Station", city: "Miami", state: "FL" },
  { code: "NOL", name: "New Orleans Union Passenger Terminal", city: "New Orleans", state: "LA" },
  { code: "HOU", name: "Houston Station", city: "Houston", state: "TX" },
  { code: "DAL", name: "Dallas Union Station", city: "Dallas", state: "TX" },
  { code: "AUS", name: "Austin Station", city: "Austin", state: "TX" },
  { code: "SAS", name: "San Antonio Station", city: "San Antonio", state: "TX" },
  { code: "ABQ", name: "Albuquerque Alvarado Transportation Center", city: "Albuquerque", state: "NM" },
  { code: "FLG", name: "Flagstaff Station", city: "Flagstaff", state: "AZ" },
  { code: "TUS", name: "Tucson Station", city: "Tucson", state: "AZ" },
  { code: "PHX", name: "Phoenix (Maricopa) Station", city: "Maricopa", state: "AZ" },
];

async function main() {
  for (const s of STATIONS) {
    await prisma.station.upsert({
      where: { code: s.code },
      update: { name: s.name, city: s.city, state: s.state },
      create: s,
    });
  }
  console.log(`Seeded ${STATIONS.length} stations.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
