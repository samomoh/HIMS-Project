/**
 * Safely add realistic demo stock to the Pharmacy inventory.
 *
 * This seed is deliberately separate from `seed.ts`: it never clears users,
 * patients, prescriptions, or other hospital data. It is safe to rerun; existing
 * medicine names are left untouched. Prices are displayed in SLe throughout
 * the Pharmacy UI.
 *
 * Run with: npx tsx src/db/seed-pharmacy-inventory.ts
 */
import "dotenv/config";
import { db } from "./index";
import { inventory } from "./schema";
import { inArray } from "drizzle-orm";
import { getPool } from "./index";
import { assertSeedAllowed } from "./seed-safety";

const sampleInventory = [
  // Familiar prescriptions used in the demo flows; healthy stock
  { medicationName: "Lisinopril", stockLevel: 240, reorderLevel: 60, unitPrice: "0.45" },
  { medicationName: "Metformin 500mg", stockLevel: 360, reorderLevel: 100, unitPrice: "0.30" },
  { medicationName: "Amoxicillin 500mg", stockLevel: 180, reorderLevel: 50, unitPrice: "0.55" },
  { medicationName: "Ibuprofen 400mg", stockLevel: 420, reorderLevel: 100, unitPrice: "0.20" },
  { medicationName: "Paracetamol 500mg", stockLevel: 650, reorderLevel: 150, unitPrice: "0.15" },
  { medicationName: "Omeprazole 20mg", stockLevel: 145, reorderLevel: 40, unitPrice: "0.60" },
  { medicationName: "Atorvastatin 20mg", stockLevel: 95, reorderLevel: 30, unitPrice: "0.75" },
  { medicationName: "Metoprolol 50mg", stockLevel: 125, reorderLevel: 35, unitPrice: "0.40" },
  { medicationName: "Aspirin 81mg", stockLevel: 500, reorderLevel: 120, unitPrice: "0.10" },
  { medicationName: "Cetirizine 10mg", stockLevel: 210, reorderLevel: 50, unitPrice: "0.25" },
  { medicationName: "Hydrocortisone 1% cream", stockLevel: 64, reorderLevel: 20, unitPrice: "6.50" },

  // Emergency / inpatient medicines
  { medicationName: "Epinephrine 1mg/mL injection", stockLevel: 28, reorderLevel: 10, unitPrice: "18.00" },
  { medicationName: "Normal Saline 0.9% 1L", stockLevel: 74, reorderLevel: 25, unitPrice: "4.50" },
  { medicationName: "Ceftriaxone 1g injection", stockLevel: 42, reorderLevel: 15, unitPrice: "12.00" },
  { medicationName: "Salbutamol inhaler", stockLevel: 31, reorderLevel: 12, unitPrice: "28.50" },
  { medicationName: "Insulin regular 100 units/mL", stockLevel: 16, reorderLevel: 8, unitPrice: "95.00" },
  { medicationName: "Oral Rehydration Salts", stockLevel: 190, reorderLevel: 50, unitPrice: "1.25" },

  // Deliberate alerts to make the stock-monitoring workflow visible on first use
  { medicationName: "Artemether-Lumefantrine 20/120mg", stockLevel: 8, reorderLevel: 30, unitPrice: "2.80" },
  { medicationName: "Morphine 10mg/mL injection", stockLevel: 0, reorderLevel: 10, unitPrice: "22.00" },
  { medicationName: "Rapid malaria test kits", stockLevel: 11, reorderLevel: 25, unitPrice: "3.50" },
];

async function seed() {
  assertSeedAllowed();
  try {
    const inserted = await db
      .insert(inventory)
      .values(sampleInventory)
      .onConflictDoNothing({ target: inventory.medicationName })
      .returning({ id: inventory.id, medicationName: inventory.medicationName });

    const names = sampleInventory.map((item) => item.medicationName);
    const verified = await db
      .select({ id: inventory.id, medicationName: inventory.medicationName, stockLevel: inventory.stockLevel, reorderLevel: inventory.reorderLevel })
      .from(inventory)
      .where(inArray(inventory.medicationName, names));

    const missing = names.filter((name) => !verified.some((item) => item.medicationName === name));
    if (missing.length > 0) {
      throw new Error(`Inventory verification failed. Missing: ${missing.join(", ")}`);
    }

    const lowStock = verified.filter((item) => item.stockLevel > 0 && item.stockLevel <= item.reorderLevel);
    const outOfStock = verified.filter((item) => item.stockLevel === 0);

    console.log(`Pharmacy inventory ready: ${verified.length} sample items verified.`);
    console.log(`${inserted.length} new items added; existing named items were preserved.`);
    console.log(`${lowStock.length} items below reorder level; ${outOfStock.length} item(s) out of stock.`);
    console.log("Open Pharmacy → Medication Inventory to review the sample stock.");
  } finally {
    await getPool().end();
  }
}

seed().catch((error) => {
  console.error("Pharmacy inventory seed failed:", error);
  process.exitCode = 1;
});
