export default function calculateInitialTransform(
	element,
	offsetDistance = 250,
	maxRotation = 300,
	maxZTranslation = 2000
) {
	const viewportCenter = {
		width: window.innerWidth / 2,
		height: window.innerHeight / 2,
	};
	const elementCenter = {
		x: element.offsetLeft + element.offsetWidth / 2,
		y: element.offsetTop + element.offsetHeight / 2,
	};

	// Calculate the angle between the center of the element and the center of the viewport
	const angleX = Math.abs(viewportCenter.width - elementCenter.x);
	const angleY = Math.abs(viewportCenter.height - elementCenter.y);
	const angle = Math.atan2(angleY, angleX);

	// Calculate the x and y translation based on the angle and distance
	const translateX = Math.cos(angle) * offsetDistance;
	const translateY = Math.sin(angle) * offsetDistance;

	// Calculate the maximum possible distance from the center (diagonal of the viewport)
	const maxDistance = Math.sqrt(
		Math.pow(viewportCenter.width, 2) + Math.pow(viewportCenter.height, 2)
	);

	// Calculate the current distance from the center
	const currentDistance = Math.sqrt(
		Math.pow(viewportCenter.width - elementCenter.x, 2) +
			Math.pow(viewportCenter.height - elementCenter.y, 2)
	);

	// Scale rotation and Z-translation based on distance from the center (closer elements rotate/translate less, farther ones rotate/translate more)
	const distanceFactor = Math.min(currentDistance / maxDistance, 1);

	// Calculate the rotation values based on the position relative to the center
	const rotationX =
		(elementCenter.y < viewportCenter.height ? -1 : 1) *
		(translateY / offsetDistance) *
		maxRotation *
		distanceFactor;
	const rotationY =
		(elementCenter.x < viewportCenter.width ? 1 : -1) *
		(translateX / offsetDistance) *
		maxRotation *
		distanceFactor;

	// Calculate the Z-axis translation (depth) based on the distance from the center
	const translateZ = maxZTranslation * distanceFactor;

	// Return transformed values, considering the element's position relative to the viewport center
	return {
		x: elementCenter.x < viewportCenter.width ? -translateX : translateX,
		y: elementCenter.y < viewportCenter.height ? -translateY : translateY,
		z: translateZ,
		rotateX: rotationX,
		rotateY: rotationY,
	};
}
