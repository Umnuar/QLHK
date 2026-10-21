import { useCallback, useRef } from "react";

export const MAX_UNDO = 50;
export const STORAGE_PREFIX = "undo_stack_";

export interface UndoEntry {
	action: string;
	timestamp: number;
	undoData: any;
	redoData: any;
}

export function loadStack(type: string): UndoEntry[] {
	try {
		const raw = localStorage.getItem(STORAGE_PREFIX + type);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

export function saveStack(type: string, stack: UndoEntry[]): void {
	try {
		localStorage.setItem(
			STORAGE_PREFIX + type,
			JSON.stringify(stack.slice(-MAX_UNDO)),
		);
	} catch {
		console.error("Failed to save undo stack");
	}
}

export function loadRedoStack(type: string): UndoEntry[] {
	try {
		const raw = localStorage.getItem(STORAGE_PREFIX + "redo_" + type);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

export function saveRedoStack(type: string, stack: UndoEntry[]): void {
	try {
		localStorage.setItem(
			STORAGE_PREFIX + "redo_" + type,
			JSON.stringify(stack),
		);
	} catch {
		console.error("Failed to save redo stack");
	}
}

export function useUndo<T = any>(profileType: "chuctho" | "htxh") {
	const undoStack = useRef<UndoEntry[]>(loadStack(profileType));
	const redoStack = useRef<UndoEntry[]>(loadRedoStack(profileType));

	const pushUndo = useCallback(
		(action: string, undoData: T, redoData: T) => {
			const entry: UndoEntry = {
				action,
				timestamp: Date.now(),
				undoData,
				redoData,
			};
			undoStack.current.push(entry);
			if (undoStack.current.length > MAX_UNDO) {
				undoStack.current = undoStack.current.slice(-MAX_UNDO);
			}
			redoStack.current = [];
			saveRedoStack(profileType, []);
			saveStack(profileType, undoStack.current);
		},
		[profileType],
	);

	const undo = useCallback((): UndoEntry | null => {
		const entry = undoStack.current.pop();
		if (!entry) return null;
		redoStack.current.push(entry);
		saveStack(profileType, undoStack.current);
		saveRedoStack(profileType, redoStack.current);
		return entry;
	}, [profileType]);

	const redo = useCallback((): UndoEntry | null => {
		const entry = redoStack.current.pop();
		if (!entry) return null;
		undoStack.current.push(entry);
		saveStack(profileType, undoStack.current);
		saveRedoStack(profileType, redoStack.current);
		return entry;
	}, [profileType]);

	const canUndo = undoStack.current.length > 0;
	const canRedo = redoStack.current.length > 0;

	return {
		pushUndo,
		undo,
		redo,
		canUndo,
		canRedo,
		undoCount: undoStack.current.length,
		redoCount: redoStack.current.length,
	};
}
