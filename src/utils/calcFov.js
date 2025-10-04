export const calcFov = (CAMERA_POS) =>
	(2 * Math.atan(window.innerHeight / 2 / CAMERA_POS) * 180) / Math.PI;
