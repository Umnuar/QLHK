import { describe, expect, it, vi } from "vitest";
import { createUser, getUsers, updateUser } from "../../src/controllers/users.controller";
import { getMe } from "../../src/controllers/auth.controller";
import { prisma } from "../../src/config/prisma";

vi.mock("../../src/config/prisma", () => ({
	prisma: {
		users: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
	},
}));

describe("User Module Permissions Controller", () => {
	const mockRes = () => {
		const res: any = {};
		res.status = vi.fn().mockReturnValue(res);
		res.json = vi.fn().mockReturnValue(res);
		return res;
	};

	it("getUsers returns module_access in each user object", async () => {
		(prisma.users.findMany as any).mockResolvedValue([
			{ id: "u-1", username: "admin", module_access: "all" },
			{ id: "u-2", username: "user_cs", module_access: "qlcs" },
		]);
		const res = mockRes();
		await getUsers({} as any, res);
		expect(res.json).toHaveBeenCalledWith({
			success: true,
			data: [
				expect.objectContaining({ username: "admin", module_access: "all" }),
				expect.objectContaining({ username: "user_cs", module_access: "qlcs" }),
			],
		});
	});

	it("createUser validates and saves module_access", async () => {
		(prisma.users.findUnique as any).mockResolvedValue(null);
		(prisma.users.create as any).mockResolvedValue({
			id: "u-3",
			username: "thon1",
			role: "user",
			module_access: "qlhk",
		});

		const req: any = {
			body: {
				username: "thon1",
				password: "password123",
				role: "user",
				module_access: "qlhk",
			},
		};
		const res = mockRes();
		await createUser(req, res);
		expect(prisma.users.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ module_access: "qlhk" }),
			}),
		);
		expect(res.status).toHaveBeenCalledWith(201);
	});

	it("updateUser updates module_access correctly", async () => {
		(prisma.users.findUnique as any).mockResolvedValue({
			id: "u-3",
			role: "user",
			module_access: "qlhk",
		});
		(prisma.users.update as any).mockResolvedValue({
			id: "u-3",
			module_access: "qlcs",
		});

		const req: any = {
			params: { id: "u-3" },
			body: { module_access: "qlcs" },
		};
		const res = mockRes();
		await updateUser(req, res);
		expect(prisma.users.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ module_access: "qlcs" }),
			}),
		);
	});

	it("getMe returns user profile with module_access", async () => {
		(prisma.users.findUnique as any).mockResolvedValue({
			id: "u-1",
			username: "admin",
			role: "admin",
			module_access: "all",
		});
		const req: any = { user: { id: "u-1" } };
		const res = mockRes();
		await getMe(req, res);
		expect(res.json).toHaveBeenCalledWith({
			user: expect.objectContaining({ module_access: "all" }),
		});
	});
});
