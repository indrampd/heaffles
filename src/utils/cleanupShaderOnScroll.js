export function cleanupShaderOnScroll() {
	// Find all canvas elements created by the shader
	const canvases = document.querySelectorAll(
		'canvas[style*="position: absolute"]'
	);
	canvases.forEach((canvas) => {
		// Dispose of Three.js resources
		const gl = canvas.getContext("webgl") || canvas.getContext("webgl2");
		if (gl) {
			const numTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
			for (let unit = 0; unit < numTextureUnits; ++unit) {
				gl.activeTexture(gl.TEXTURE0 + unit);
				gl.bindTexture(gl.TEXTURE_2D, null);
				gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
			}
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		}
		// Remove the canvas element
		canvas.remove();
	});

	// Reset parent positions if they were modified
	document.querySelectorAll('[data-webgl-media="true"]').forEach((media) => {
		const parent = media.parentNode;
		if (parent && parent.style.position === "relative") {
			const computedStyle = window.getComputedStyle(parent);
			if (
				computedStyle.position === "relative" &&
				!parent.hasAttribute("data-original-position")
			) {
				parent.style.position = "";
			}
		}
	});

	console.log("Shader resources cleaned up");
}
