import { eq } from "drizzle-orm";
import { pricesTable, profileTable } from "../../db/schema";
import { db } from "../../db";

export const getPrices = async (locals: App.Locals): Promise<Price[]> => {
  const { user } = await locals.safeGetSession();

  if (!user) {
    return [];
  }

  const currentProfile = await db.query.profileTable.findFirst({
    where: eq(profileTable.id, user.id),
  });

  if (!currentProfile) {
    console.error("No profile found for user:", user.id);
    return [];
  }

  const prices = await db.query.pricesTable.findMany({
    where: eq(pricesTable.tariff, currentProfile?.octopusTariff || ""),
  });

  return prices;
};
