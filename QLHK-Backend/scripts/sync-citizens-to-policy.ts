import { syncCitizensToPolicy } from "../src/services/policySync.service";
import { prisma } from "../src/config/prisma";

async function main() {
  try {
    const calcYear = new Date().getFullYear();
    const result = await syncCitizensToPolicy(calcYear);
    console.log(`Sync completed successfully for year ${calcYear}:`);
    console.log(`- Chúc Thọ profiles synced: ${result.chucthoCount}`);
    console.log(`- HTXH profiles synced: ${result.htxhCount}`);
  } catch (error) {
    console.error("Sync failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
