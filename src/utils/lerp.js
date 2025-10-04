export const lerp = (start, end, damping) =>
	start * (1 - damping) + end * damping;
