import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  andersenChargeTimespanTable,
  andersenConfigTable,
} from "../../db/schema";
import { getOrCreateCarConfig } from "../carConfig";
import { error } from "@sveltejs/kit";
import { getPrices } from "../prices";

export const getCarChargeTimespan = async (
  locals: App.Locals,
): Promise<AndersenChargeTimespan[]> => {
  const { user } = await locals.safeGetSession();

  if (!user) {
    console.error("User not found when accessing timespans");
    return [];
  }

  const carChargeTimespans = await db.query.andersenChargeTimespanTable
    .findMany({
      where: eq(andersenConfigTable.userId, user.id),
    });

  if (!carChargeTimespans) {
    return [];
  }

  return carChargeTimespans;
};

export const createNewChargeTimespans = async (
  locals: App.Locals,
  toTime: Date,
  percentCharge: number,
) => {
  const { user } = await locals.safeGetSession();

  if (!user) {
    return null;
  }

  await db.delete(andersenChargeTimespanTable).where(
    eq(andersenChargeTimespanTable.userId, user.id),
  );

  const config = await getOrCreateCarConfig(locals);
  if (!config) {
    error(500, "Failed to get car charging configuration");
  }
  const prices = await getPrices(locals);

  const newTimespans = generateCarChargeTimespans(
    config,
    toTime,
    percentCharge,
    prices,
  );
  if (newTimespans.error) {
    error(500, newTimespans.error);
  }

  if (newTimespans!.chargeTimespans!.length === 0) {
    return [];
  }

  await db.insert(andersenChargeTimespanTable).values(
    newTimespans.chargeTimespans!.map((timespan) => ({
      userId: timespan.userId,
      startTime: timespan.startTime,
      endTime: timespan.endTime,
      averagePrice: timespan.averagePrice,
    })),
  );
  return newTimespans.chargeTimespans;
};

const generateCarChargeTimespans = (
  chargeConfig: AndersenChargeConfig,
  endDateTime: Date,
  percentCharge: number,
  prices: Price[],
): {
  error: string | undefined;
  chargeTimespans: AndersenChargeTimespan[] | undefined;
} => {
  const chargeTimespans: AndersenChargeTimespan[] = [];
  const slots = calculateNoSlots(
    chargeConfig.batterySize,
    chargeConfig.chargeRate,
    percentCharge,
  );

  if (slots === 0) return { error: undefined, chargeTimespans: [] };

  const availablePrices = filterPrices(prices, endDateTime).sort((a, b) =>
    a.price - b.price
  );

  if (slots > availablePrices.length) {
    return {
      error: "Not enough slots available",
      chargeTimespans: [{
        userId: chargeConfig.userId,
        startTime: prices.sort((a, b) =>
          a.start.getTime() - b.start.getTime()
        )[0].start,
        endTime: endDateTime,
        averagePrice: 0,
      }],
    };
  }
  const selectedPrices = availablePrices
    .slice(0, slots)
    .sort((a, b) => a.start!.getTime() - b.start!.getTime());

  let currentTimespan: AndersenChargeTimespan | undefined;
  let slotCount = 0;
  for (let i = 0; i < selectedPrices.length; i++) {
    const currentPrice = selectedPrices[i];
    const nextPrice = selectedPrices[i + 1];
    slotCount++;
    if (!currentTimespan) {
      currentTimespan = {
        userId: chargeConfig.userId,
        startTime: currentPrice.start,
        averagePrice: currentPrice.price,
        endTime: currentPrice.end,
      };
    } else {
      currentTimespan.averagePrice =
        (currentTimespan.averagePrice * (slotCount - 1) + currentPrice.price) /
        slotCount;
    }

    if (
      i === selectedPrices.length - 1 ||
      (nextPrice && !equalWithFuzziness(nextPrice.start, currentPrice.end, 1))
    ) {
      currentTimespan.endTime = currentPrice.end;
      currentTimespan.averagePrice =
        Math.round(currentTimespan.averagePrice * 10) / 10;
      chargeTimespans.push({ ...currentTimespan });
      currentTimespan = undefined;
      slotCount = 0;
    }
  }
  return { chargeTimespans, error: undefined };
};

const calculateNoSlots = (
  batterySize: number,
  chargeRate: number,
  percentCharge: number,
) => {
  const kwhRequired = (batterySize / 100) * percentCharge;
  const kwhPerSlot = chargeRate / 2;
  const slots = Math.ceil(kwhRequired / kwhPerSlot);
  return slots;
};

const filterPrices = (prices: Price[], endTime: Date) =>
  prices
    .filter((price) => price.start >= new Date())
    .filter((price) => price.end <= endTime)
    .reverse()
    .map((price) => ({
      start: price.start,
      end: price.end,
      price: price.price,
    })); // Deep copy

const equalWithFuzziness = (
  date1: Date | undefined,
  date2: Date | undefined,
  fuzzinessInMinutes: number,
) => {
  if (!date1 && !date2) return true;
  if (!date1 || !date2) return false;
  const timeDifference = Math.abs(date1.getTime() - date2.getTime());
  const fuzzinessInMilliseconds = fuzzinessInMinutes * 60 * 1000;

  return timeDifference <= fuzzinessInMilliseconds;
};
