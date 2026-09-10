export interface VerificationResult {
  status: "verified" | "failed" | "pending";
  referenceId?: string;
  method?: string;
  reason?: string;
}

export async function startVerification({
  data,
}: {
  data: { testId: string; consent: boolean; userId: string };
}): Promise<VerificationResult> {
  const { testId } = data;

  if (testId === "DEMO-FAIL-000") {
    return {
      status: "failed",
      reason: "Demo verification test failed (simulated mismatch).",
    };
  }

  return {
    status: "verified",
    referenceId: testId || "DEMO-ARTISAN-001",
    method: "Aadhaar e-KYC (Demo Mode)",
  };
}

export async function skipVerification({
  data: _data,
}: {
  data: { userId: string };
}): Promise<{ success: boolean }> {
  return { success: true };
}
