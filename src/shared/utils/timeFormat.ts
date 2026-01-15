export function formatPlayTime(milliseconds: number): string {
	if (!milliseconds || milliseconds <= 0) return '0s';
	const totalSeconds = Math.floor(milliseconds / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		// Show hours, minutes, and seconds if any are non-zero
		const parts: string[] = [`${hours}h`];
		if (minutes > 0) parts.push(`${minutes}m`);
		if (seconds > 0) parts.push(`${seconds}s`);
		return parts.join(' ');
	}
	if (minutes > 0) {
		// Show minutes and seconds if seconds > 0
		if (seconds > 0) return `${minutes}m ${seconds}s`;
		return `${minutes}m`;
	}
	return `${seconds}s`;
}
