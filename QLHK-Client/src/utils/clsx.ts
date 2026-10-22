export function clsx(...classes: any[]): string {
	return classes.flat().filter(Boolean).join(" ");
}

export default clsx;
