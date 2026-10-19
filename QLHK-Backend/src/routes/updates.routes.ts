import { Router, type Request, type Response } from "express";

const router = Router();

router.get("/latest", (req: Request, res: Response) => {
	const currentVersion = req.query.current_version as string | undefined;

	if (currentVersion === "1.0.1") {
		return res.status(204).end();
	}

	const updatePayload = {
		version: "1.0.1",
		notes:
			"- Tự động cập nhật phần mềm chuẩn mực Tauri v2\n- Tối ưu hóa hiệu năng hiển thị danh sách hộ gia đình\n- Nâng cấp độ tin cậy và đồng bộ giao diện",
		pub_date: "2026-10-14T03:00:00.000Z",
		platforms: {
			"windows-x86_64": {
				signature:
					"dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUldScFBGRzhrdlhzVjY0eHJFUnhRNEpLbXNCZlJKa2NVRm9Nc2dzWUV1N3ZrNk5HZkw2SUFmNUIK",
				url: "http://localhost:5002/releases/qlhk-1.0.1-setup.nsis.zip",
			},
		},
	};

	res.setHeader("Content-Type", "application/json");
	res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
	return res.json(updatePayload);
});

router.get("/:target/:current_version", (req: Request, res: Response) => {
	const { current_version } = req.params;

	if (current_version === "1.0.1") {
		return res.status(204).end();
	}

	const updatePayload = {
		version: "1.0.1",
		notes:
			"- Tự động cập nhật phần mềm chuẩn mực Tauri v2\n- Tối ưu hóa hiệu năng hiển thị danh sách hộ gia đình\n- Nâng cấp độ tin cậy và đồng bộ giao diện",
		pub_date: "2026-10-14T03:00:00.000Z",
		platforms: {
			"windows-x86_64": {
				signature:
					"dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUldScFBGRzhrdlhzVjY0eHJFUnhRNEpLbXNCZlJKa2NVRm9Nc2dzWUV1N3ZrNk5HZkw2SUFmNUIK",
				url: "http://localhost:5002/releases/qlhk-1.0.1-setup.nsis.zip",
			},
		},
	};

	res.setHeader("Content-Type", "application/json");
	res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
	return res.json(updatePayload);
});

export default router;
