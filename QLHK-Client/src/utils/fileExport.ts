import { isTauri } from "@tauri-apps/api/core";
import * as XLSX from "xlsx";

export interface FileExportResult {
	success: boolean;
	filePath?: string;
	fileName: string;
	cancelled?: boolean;
	error?: string;
}

export async function exportExcelWithDialog(
	workbook: XLSX.WorkBook,
	defaultFilename: string,
): Promise<FileExportResult> {
	if (typeof window !== "undefined" && isTauri()) {
		try {
			const { save } = await import("@tauri-apps/plugin-dialog");
			const { writeFile } = await import("@tauri-apps/plugin-fs");

			const selectedPath = await save({
				defaultPath: defaultFilename,
				filters: [
					{ name: "File Excel (*.xlsx)", extensions: ["xlsx"] },
					{ name: "Tất cả các tệp", extensions: ["*"] },
				],
			});

			if (!selectedPath) {
				return { success: false, fileName: defaultFilename, cancelled: true };
			}

			const arrayBuffer = XLSX.write(workbook, {
				bookType: "xlsx",
				type: "array",
			});
			await writeFile(selectedPath, new Uint8Array(arrayBuffer));

			return {
				success: true,
				filePath: selectedPath,
				fileName: selectedPath.split(/[/\\]/).pop() || defaultFilename,
			};
		} catch (err: any) {
			console.warn("[fileExport] Tauri save error, falling back:", err);
		}
	}

	if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
		try {
			const handle = await (window as any).showSaveFilePicker({
				suggestedName: defaultFilename,
				types: [
					{
						description: "File Excel (*.xlsx)",
						accept: {
							"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
								".xlsx",
							],
						},
					},
				],
			});

			const writable = await handle.createWritable();
			const arrayBuffer = XLSX.write(workbook, {
				bookType: "xlsx",
				type: "array",
			});
			await writable.write(new Uint8Array(arrayBuffer));
			await writable.close();

			return {
				success: true,
				filePath: handle.name || defaultFilename,
				fileName: handle.name || defaultFilename,
			};
		} catch (err: any) {
			if (err?.name === "AbortError") {
				return { success: false, fileName: defaultFilename, cancelled: true };
			}
			console.warn(
				"[fileExport] showSaveFilePicker failed, falling back to XLSX.writeFile:",
				err,
			);
		}
	}

	try {
		XLSX.writeFile(workbook, defaultFilename);
		return {
			success: true,
			filePath: defaultFilename,
			fileName: defaultFilename,
		};
	} catch (err: any) {
		return {
			success: false,
			fileName: defaultFilename,
			error: err?.message || String(err),
		};
	}
}
