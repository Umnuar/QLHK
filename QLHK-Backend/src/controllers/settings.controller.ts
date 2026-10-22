import type { Request, Response } from "express";
import { prisma } from "../config/prisma";

export const getSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const list = await prisma.settings.findMany();
    const data: Record<string, string> = {};
    for (const item of list) {
      data[item.key] = item.value;
    }
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: "Lỗi máy chủ khi lấy cấu hình" });
  }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== "object") {
      res.status(400).json({ error: "Dữ liệu cấu hình không hợp lệ" });
      return;
    }
    for (const [key, value] of Object.entries(updates)) {
      await prisma.settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    res.json({ message: "Cập nhật cấu hình thành công" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi máy chủ khi cập nhật cấu hình" });
  }
};
