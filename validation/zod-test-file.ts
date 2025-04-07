import { hpPumpSchema } from "@/validation/configuration/hp-pump-schema";
import { waterSupplySchema } from "@/validation/configuration/water-supply-schema";

// console.log(
//   hpPumpSchema.parse({
//     has_15kw_pump: true,
//     // pump_outlet_1_15kw: undefined,
//     pump_outlet_2_15kw: "CHASSIS_WASH",
//   })
// );

// export const inverterPumpSchema = z.object({
//   inv_pump_outlet_dosatron_qty: z.coerce.number().min(0).max(2),
//   inv_pump_outlet_pw_qty: z.coerce.number().min(0).max(2),
// });

console.log(
  waterSupplySchema.parse({
    water_1_type: "NETWORK",
    water_1_pump: "BOOST_15KW",
    water_2_type: null,
    water_2_pump: null,
    has_antifreeze: false,
    inv_pump_outlet_dosatron_qty: 0,
    inv_pump_outlet_pw_qty: 2,
  })
);
