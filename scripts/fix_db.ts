import { db, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function run() {
  try {
    console.log("Starting monorepo database settings category repair...");

    const rows = await db.select().from(appSettingsTable);
    let updatedCount = 0;

    for (const row of rows) {
      let correctCategory: string | null = null;
      const key = row.key;
      
      if (key.startsWith("landing_") || key.startsWith("footer_") || key.startsWith("suporte_") || key.startsWith("openai_")) {
        correctCategory = "portal";
      } else if (key.startsWith("clarity_")) {
        correctCategory = "clarity";
      }

      if (correctCategory && row.category !== correctCategory) {
        await db.update(appSettingsTable)
          .set({ category: correctCategory })
          .where(eq(appSettingsTable.id, row.id));
        console.log(`Repaired category for setting "${key}": "${row.category}" -> "${correctCategory}"`);
        updatedCount++;
      }
    }

    console.log(`Finished database settings category repair. Repaired ${updatedCount} rows.`);
    process.exit(0);
  } catch (err) {
    console.error("Database repair failed:", err);
    process.exit(1);
  }
}

run();
