import { error } from "@sveltejs/kit";
import {
  createNewChargeTimespans,
  getCarChargeTimespan,
} from "../lib/data/carChargeTimespan";
import { getOrCreateCarConfig } from "../lib/data/carConfig";

import type { PageServerLoad } from "./$types";
import { zfd } from "zod-form-data";
import { getPrices } from "../lib/data/prices";

export const load: PageServerLoad = async ({ locals }) => {
  const { session } = await locals.safeGetSession();

  if (!session) {
    return {
      prices: [],
      carChargeTimespans: [],
      carChargeConfig: null,
    };
  }

  return {
    prices: await getSortedPrices(locals),
    carChargeTimespans: await getCarChargeTimespan(locals),
    carChargeConfig: await getOrCreateCarConfig(locals),
  };
};

const floorToNearest30Minutes = (date: Date): Date => {
  const floored = new Date(date);
  const minutes = floored.getMinutes();
  const flooredMinutes = minutes < 30 ? 0 : 30;
  floored.setMinutes(flooredMinutes, 0, 0); // set minutes, seconds, milliseconds to 0
  return floored;
};

const getSortedPrices = async (locals: App.Locals): Promise<Price[]> => {
  return [
    ...((await getPrices(locals)).filter((price) =>
      price.start >= floorToNearest30Minutes(new Date())
    ) || []),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());
};

export const actions = {
  default: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    console.info("Car charging request received");
    const carChargingConfig = await getOrCreateCarConfig(locals);
    if (!carChargingConfig) {
      console.error("Car charging config not found");
      error(401, "Unauthorized");
    }

    const schema = zfd.formData({
      chargePercent: zfd.numeric(),
      endTime: zfd.text().refine(
        (val) => !isNaN(Date.parse(val)),
        { message: "Invalid date/time string" },
      ),
    });

    const { data, error: parseError } = schema.safeParse(
      await request.formData(),
    );
    if (parseError) {
      console.error("Error parsing car charging schema");
      error(400, parseError?.message);
    }

    const endDateTime = new Date(data.endTime);

    try {
      console.log("end date time is: ", data.endTime);
      const timespans = await createNewChargeTimespans(
        locals,
        endDateTime,
        data.chargePercent,
      );
      console.info("Updated car charging config in database", user?.id, data);
      return { success: true, timespans };
    } catch (e) {
      console.error("Error creating new charge timespans", e);
      error(500, "Failed to create new charge timespans");
    }
  },
};
