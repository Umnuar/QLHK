import { isTauri } from "@tauri-apps/api/core";

export const loadXlsx = async () => await import("xlsx");

export interface FileExportResult {
	success: boolean;
	filePath?: string;
	fileName: string;
	cancelled?: boolean;
	error?: string;
}

export async function exportExcelWithDialog(
	workbook: any,
	defaultFilename: string,
): Promise<FileExportResult> {
	let arrayBuffer: ArrayBuffer;
	if (typeof Blob !== "undefined" && workbook instanceof Blob) {
		arrayBuffer = await workbook.arrayBuffer();
	} else if (workbook instanceof ArrayBuffer) {
		arrayBuffer = workbook;
	} else if (typeof Uint8Array !== "undefined" && workbook instanceof Uint8Array) {
		arrayBuffer = workbook.buffer as ArrayBuffer;
	} else {
		const XLSX = await loadXlsx();
		arrayBuffer = XLSX.write(workbook, {
			bookType: "xlsx",
			type: "array",
		});
	}

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
		if (typeof Blob !== "undefined" && workbook instanceof Blob) {
			const url = URL.createObjectURL(workbook);
			const a = document.createElement("a");
			a.href = url;
			a.download = defaultFilename;
			a.click();
			URL.revokeObjectURL(url);
		} else if (
			workbook instanceof ArrayBuffer ||
			(typeof Uint8Array !== "undefined" && workbook instanceof Uint8Array)
		) {
			const blob = new Blob([arrayBuffer], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = defaultFilename;
			a.click();
			URL.revokeObjectURL(url);
		} else {
			const XLSX = await loadXlsx();
			XLSX.writeFile(workbook, defaultFilename);
		}
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
