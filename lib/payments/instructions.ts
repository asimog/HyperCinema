import { JobDocument } from "@/lib/types/domain";
import {
  lamportsToSol,
  solToLamports,
} from "@/lib/payments/solana-pay";

export interface PaymentInstructions {
  paymentAddress: string;
  requiredLamports: number;
  receivedLamports: number;
  remainingLamports: number;
  amountSol: number;
  receivedSol: number;
  remainingSol: number;
}

export function buildPaymentInstructions(job: JobDocument): PaymentInstructions {
  const paymentAddress = job.paymentAddress;
  const requiredLamports = job.requiredLamports ?? solToLamports(job.priceSol);
  const receivedLamports = Math.max(0, job.receivedLamports ?? 0);
  const remainingLamports = Math.max(requiredLamports - receivedLamports, 0);
  const remainingSol = lamportsToSol(remainingLamports);
  const amountSol = lamportsToSol(requiredLamports);
  const receivedSol = lamportsToSol(receivedLamports);

  return {
    paymentAddress,
    requiredLamports,
    receivedLamports,
    remainingLamports,
    amountSol,
    receivedSol,
    remainingSol,
  };
}
