import { z } from "zod";

export const ReservationCreateSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(6).max(80),
  message: z.string().trim().max(5000).optional().default(""),
  guests: z.number().int().min(1).max(20),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.enum(["MXN", "USD"]),
  paymentMethod: z.enum(["bank_transfer", "cash_payment"]),
  contractAccepted: z.literal(true),
  locale: z.enum(["es", "en"]).optional(),
  website: z.string().optional().default(""),
});

export type ReservationCreateInput = z.infer<typeof ReservationCreateSchema>;

export type StayType = "short_stay" | "long_stay";
export type ContractType = "short_stay_contract" | "long_stay_contract";

export function classifyStay(nights: number): {
  stayType: StayType;
  contractType: ContractType;
} {
  if (nights >= 30) {
    return { stayType: "long_stay", contractType: "long_stay_contract" };
  }
  return { stayType: "short_stay", contractType: "short_stay_contract" };
}
