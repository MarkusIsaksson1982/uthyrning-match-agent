import type { Listing } from "../domain.js";

export const listings: Listing[] = [
  {
    id: "L-1001",
    address: "Storgatan 12, 111 22 Stockholm",
    areaKvm: 62,
    rooms: 2,
    floor: 3,
    monthlyRentSek: 11500,
    availableFrom: "2026-01-01",
    householdSizeMax: 3,
    incomeRequirementSek: 34500,
    guarantorAllowed: true,
  },
  {
    id: "L-1002",
    address: "Björkvägen 7, 703 45 Örebro",
    areaKvm: 88,
    rooms: 4,
    floor: 1,
    monthlyRentSek: 14200,
    availableFrom: "2026-02-01",
    householdSizeMax: 5,
    incomeRequirementSek: 42600,
    guarantorAllowed: false,
  },
  {
    id: "L-1003",
    address: "Kungsgatan 45, 411 15 Göteborg",
    areaKvm: 35,
    rooms: 1,
    floor: 6,
    monthlyRentSek: 8200,
    availableFrom: "2026-03-01",
    householdSizeMax: 2,
    incomeRequirementSek: 24600,
    guarantorAllowed: true,
  },
];

export function findListing(id: string): Listing | undefined {
  return listings.find((listing) => listing.id === id);
}
