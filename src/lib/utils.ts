import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names.
 * @param inputs The class values to merge.
 * @returns The merged class names.
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}


/**
 * Check if a string has Unicode characters.
 * @param text The string to check.
 * @returns True if the string has Unicode characters, false otherwise.
 */
export function hasUnicode(text: string): boolean {
	return /[^\u0000-\u007F]/.test(text);
}


/**
 * Encode an ID.
 * @param text The text to encode.
 * @returns The encoded ID.
 */
export function encodeId(text: string): string {
	// First normalize Unicode characters to composed form
	const composed = text.normalize("NFC");

	// Then lowercase and handle spaces/punctuation
	const normalized = composed
		.toLowerCase()
		.replace(/[^a-z0-9\u0080-\uffff]+/g, "-")
		.replace(/^-+|-+$/g, "");

	if (!hasUnicode(normalized)) {
		return normalized;
	}

	// Then encode Unicode characters
	return normalized
		.split("")
		.map((char) => (/[a-z0-9-]/.test(char) ? char : encodeURIComponent(char)))
		.join("");
}
