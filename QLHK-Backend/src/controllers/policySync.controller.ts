import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { syncCitizensToPolicy } from "../services/policySync.service";

export const syncPolicyData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawCalcYear = req.body?.calculation_year || req.body?.calculationYear || req.query?.calculation_year || req.query?.calculationYear;
    const calcYear = rawCalcYear ? parseInt(String(rawCalcYear), 10) : undefined;
    const rawVillageId = req.body?.village_id || req.body?.villageId || req.query?.village_id || req.query?.villageId;
    const villageId = req.user?.role === "admin" ? (rawVillageId as string | undefined) : (req.user?.village_id ?? undefined);

    const result = await syncCitizensToPolicy(calcYear, villageId);
    res.json({
      success: true,
      message: "Đồng bộ dữ liệu chính sách thành công",
      ...result,
    });
  } catch (error) {
    res.status(500).json({ error: "Lỗi hệ thống khi đồng bộ chính sách" });
  }
};
