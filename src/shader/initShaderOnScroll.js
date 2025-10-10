import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import * as THREE from "three";

import { resizeThreeCanvas } from "../utils/resizeThreeCanvas";
import { calcFov } from "../utils/calcFov";
import { debounce } from "../utils/debounce";
import { lerp } from "../utils/lerp";

import baseVertex from "./baseVertex.glsl";
import baseFragment from "./baseFragment.glsl";
import effectVertex from "./effectVertex.glsl";
import effectFragment from "./effectFragment.glsl";

let shaderInitialized = false;
let shaderRenderLoop = null;

function initShaderOnScroll() {
	// Prevent duplicate initialization
	if (shaderInitialized) {
		console.log("Shader already initialized, skipping...");
		return;
	}

	// Check if required elements exist
	const mediaElements = document.querySelectorAll(
		"[data-webgl-media='true']"
	);

	if (mediaElements.length === 0) {
		console.warn(
			"ShaderOnScroll: No elements with [data-webgl-media='true'] attribute found. Lenis smooth scroll is still active."
		);
		return;
	}

	// Mark as initialized
	shaderInitialized = true;

	// Constants
	const CAMERA_POS = 500;

	// cursor position
	let cursorPos = {
		current: { x: 0.5, y: 0.5 },
		target: { x: 0.5, y: 0.5 },
	};

	let cursorRaf;

	const lerpCursorPos = () => {
		const x = lerp(cursorPos.current.x, cursorPos.target.x, 0.05);
		const y = lerp(cursorPos.current.y, cursorPos.target.y, 0.05);

		cursorPos.current.x = x;
		cursorPos.current.y = y;

		const delta = Math.sqrt(
			(cursorPos.target.x - cursorPos.current.x) ** 2 +
				(cursorPos.target.y - cursorPos.current.y) ** 2
		);

		if (delta < 0.001 && cursorRaf) {
			cancelAnimationFrame(cursorRaf);
			cursorRaf = null;
			return;
		}

		cursorRaf = requestAnimationFrame(lerpCursorPos);
	};

	const handleMouseMove = (event) => {
		cursorPos.target.x = event.clientX / window.innerWidth;
		cursorPos.target.y = event.clientY / window.innerHeight;

		if (!cursorRaf) {
			cursorRaf = requestAnimationFrame(lerpCursorPos);
		}
	};

	window.addEventListener("mousemove", handleMouseMove);

	// helper for image-to-webgl and uniform updates
	const handleMouseEnter = (index) => {
		if (!mediaStore[index]) return;
		gsap.to(mediaStore[index], {
			mouseEnter: 1,
			duration: 0.6,
			ease: CustomEase.create("custom", "0.4, 0, 0.2, 1"),
		});
	};

	const handleMousePos = (e, index) => {
		if (!mediaStore[index]) return;
		const bounds = mediaStore[index].media.getBoundingClientRect();
		const x = e.offsetX / bounds.width;
		const y = e.offsetY / bounds.height;

		mediaStore[index].mouseOverPos.target.x = x;
		mediaStore[index].mouseOverPos.target.y = y;
	};

	const handleMouseLeave = (index) => {
		if (!mediaStore[index]) return;
		gsap.to(mediaStore[index], {
			mouseEnter: 0,
			duration: 0.6,
			ease: CustomEase.create("custom", "0.4, 0, 0.2, 1"),
		});
		gsap.to(mediaStore[index].mouseOverPos.target, {
			x: 0.5,
			y: 0.5,
			duration: 0.6,
			ease: CustomEase.create("custom", "0.4, 0, 0.2, 1"),
		});
	};

	// this gets all image html tags and creates individual canvas and renderer for each
	const setMediaStore = (scrollY) => {
		const media = [
			...document.querySelectorAll("[data-webgl-media='true']"),
		];

		mediaStore = media
			.map((media, i) => {
				observer.observe(media);

				media.dataset.index = String(i);
				media.addEventListener("mouseenter", () => handleMouseEnter(i));
				media.addEventListener("mousemove", (e) =>
					handleMousePos(e, i)
				);
				media.addEventListener("mouseleave", () => handleMouseLeave(i));

				const bounds = media.getBoundingClientRect();

				let canvas = media.nextElementSibling;
				if (!canvas || canvas.tagName !== "CANVAS") {
					canvas = document.createElement("canvas");
					canvas.style.position = "absolute";
					canvas.style.top = "0";
					canvas.style.left = "0";
					canvas.style.width = "100%";
					canvas.style.height = "100%";
					canvas.style.pointerEvents = "none";
					canvas.style.zIndex = "0";

					const parent = media.parentNode;
					const parentStyle = getComputedStyle(parent);
					if (parentStyle.position === "static") {
						parent.style.position = "relative";
					}

					media.parentNode.insertBefore(canvas, media.nextSibling);
				}

				if (!canvas) {
					console.error(`Canvas is null for image ${i}!`);
					return null;
				}

				const individualScene = new THREE.Scene();
				const camera = new THREE.PerspectiveCamera(
					50,
					bounds.width / bounds.height,
					10,
					1000
				);
				camera.position.z = CAMERA_POS;
				camera.fov = calcFov(CAMERA_POS);
				camera.updateProjectionMatrix();

				try {
					const renderer = new THREE.WebGLRenderer({
						canvas: canvas,
						alpha: true,
						antialias: true,
					});
					renderer.setSize(bounds.width, bounds.height);
					renderer.setPixelRatio(
						Math.min(window.devicePixelRatio, 2)
					);
					renderer.setClearColor(0x000000, 0);

					const imageMaterial = material.clone();
					const imageMesh = new THREE.Mesh(geometry, imageMaterial);

					let texture = null;

					const createTexture = (imageElement) => {
						const tex = new THREE.Texture(imageElement);
						tex.wrapS = THREE.ClampToEdgeWrapping;
						tex.wrapT = THREE.ClampToEdgeWrapping;
						tex.minFilter = THREE.LinearFilter;
						tex.magFilter = THREE.LinearFilter;
						tex.generateMipmaps = false;
						tex.needsUpdate = true;
						return tex;
					};

					if (media.src && media.tagName.toLowerCase() === "img") {
						const img = new Image();
						img.crossOrigin = "anonymous";

						img.onload = () => {
							texture = createTexture(img);
							imageMaterial.uniforms.uTexture.value = texture;
							imageMaterial.uniforms.uTextureSize.value.x =
								img.naturalWidth || 1;
							imageMaterial.uniforms.uTextureSize.value.y =
								img.naturalHeight || 1;
						};

						img.onerror = () => {
							console.warn(
								"CORS loading failed for image, using original:",
								media.src
							);
							texture = createTexture(media);
							imageMaterial.uniforms.uTexture.value = texture;
							imageMaterial.uniforms.uTextureSize.value.x =
								media.naturalWidth || 1;
							imageMaterial.uniforms.uTextureSize.value.y =
								media.naturalHeight || 1;
						};

						img.src = media.src;
					} else {
						texture = createTexture(media);
						imageMaterial.uniforms.uTexture.value = texture;
						imageMaterial.uniforms.uTextureSize.value.x =
							media.naturalWidth || 1;
						imageMaterial.uniforms.uTextureSize.value.y =
							media.naturalHeight || 1;
					}

					imageMaterial.uniforms.uQuadSize.value.x = bounds.width;
					imageMaterial.uniforms.uQuadSize.value.y = bounds.height;
					imageMaterial.uniforms.uBorderRadius.value =
						getComputedStyle(media).borderRadius.replace("px", "");

					const fov = camera.fov * (Math.PI / 180);
					const distance = camera.position.z;
					const height = 2 * Math.tan(fov / 2) * distance;
					const width = height * camera.aspect;

					imageMesh.scale.set(width, height, 1);
					imageMesh.position.set(0, 0, 0);

					individualScene.add(imageMesh);

					const hoverOnly =
						media.getAttribute("data-webgl-hover-only") === "true";

					return {
						media,
						canvas,
						scene: individualScene,
						camera,
						renderer,
						material: imageMaterial,
						mesh: imageMesh,
						width: bounds.width,
						height: bounds.height,
						top: bounds.top + scrollY,
						left: bounds.left,
						isInView:
							bounds.top >= -500 &&
							bounds.top <= window.innerHeight + 500,
						mouseEnter: 0,
						hoverOnly,
						mouseOverPos: {
							current: {
								x: 0.5,
								y: 0.5,
							},
							target: {
								x: 0.5,
								y: 0.5,
							},
						},
					};
				} catch (error) {
					console.error(
						`Failed to create WebGL renderer for image ${i}:`,
						error
					);
					return null;
				}
			})
			.filter(Boolean);
	};

	// Shader setup
	let observer;
	let mediaStore;
	let geometry;
	let material;

	observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				const index = entry.target.dataset.index;

				if (index && mediaStore[parseInt(index)]) {
					mediaStore[parseInt(index)].isInView = entry.isIntersecting;
				}
			});
		},
		{ rootMargin: "500px 0px 500px 0px" }
	);

	geometry = new THREE.PlaneGeometry(1, 1, 100, 100);
	material = new THREE.ShaderMaterial({
		uniforms: {
			uResolution: {
				value: new THREE.Vector2(window.innerWidth, window.innerHeight),
			},
			uTime: { value: 0 },
			uCursor: { value: new THREE.Vector2(0.5, 0.5) },
			uScrollVelocity: { value: 0 },
			uTexture: { value: null },
			uTextureSize: { value: new THREE.Vector2(100, 100) },
			uQuadSize: { value: new THREE.Vector2(100, 100) },
			uBorderRadius: { value: 0 },
			uMouseEnter: { value: 0 },
			uMouseOverPos: { value: new THREE.Vector2(0.5, 0.5) },
		},
		vertexShader: effectVertex,
		fragmentShader: effectFragment,
		glslVersion: THREE.GLSL3,
	});

	const render = (time = 0) => {
		time /= 1000;

		if (!mediaStore || mediaStore.length === 0) {
			shaderRenderLoop = requestAnimationFrame(render);
			return;
		}

		mediaStore.forEach((object) => {
			if (!object) return;

			if (object.isInView) {
				object.mouseOverPos.current.x = lerp(
					object.mouseOverPos.current.x,
					object.mouseOverPos.target.x,
					0.05
				);
				object.mouseOverPos.current.y = lerp(
					object.mouseOverPos.current.y,
					object.mouseOverPos.target.y,
					0.05
				);

				object.material.uniforms.uResolution.value.x = object.width;
				object.material.uniforms.uResolution.value.y = object.height;
				object.material.uniforms.uTime.value = time;
				object.material.uniforms.uCursor.value.x = cursorPos.current.x;
				object.material.uniforms.uCursor.value.y = cursorPos.current.y;
				object.material.uniforms.uScrollVelocity.value =
					object.hoverOnly ? 0 : scroll.scrollVelocity;
				object.material.uniforms.uMouseOverPos.value.x =
					object.mouseOverPos.current.x;
				object.material.uniforms.uMouseOverPos.value.y =
					object.mouseOverPos.current.y;
				object.material.uniforms.uMouseEnter.value = object.mouseEnter;

				object.renderer.render(object.scene, object.camera);
			}
		});

		shaderRenderLoop = requestAnimationFrame(render);
	};

	const handleResize = debounce(() => {
		if (!mediaStore) return;

		mediaStore.forEach((object) => {
			if (!object) return;

			const bounds = object.media.getBoundingClientRect();

			object.renderer.setSize(bounds.width, bounds.height);

			object.camera.aspect = bounds.width / bounds.height;
			object.camera.fov = calcFov(CAMERA_POS);
			object.camera.updateProjectionMatrix();

			const fov = object.camera.fov * (Math.PI / 180);
			const distance = object.camera.position.z;
			const height = 2 * Math.tan(fov / 2) * distance;
			const width = height * object.camera.aspect;

			object.mesh.scale.set(width, height, 1);
			object.width = bounds.width;
			object.height = bounds.height;
			object.top = bounds.top + scroll.scrollY;
			object.left = bounds.left;
			object.isInView =
				bounds.top >= -500 && bounds.top <= window.innerHeight + 500;

			object.material.uniforms.uResolution.value.x = bounds.width;
			object.material.uniforms.uResolution.value.y = bounds.height;
			object.material.uniforms.uTextureSize.value.x =
				object.media.naturalWidth || 1;
			object.material.uniforms.uTextureSize.value.y =
				object.media.naturalHeight || 1;
			object.material.uniforms.uQuadSize.value.x = bounds.width;
			object.material.uniforms.uQuadSize.value.y = bounds.height;
			object.material.uniforms.uBorderRadius.value = getComputedStyle(
				object.media
			).borderRadius.replace("px", "");
		});
	});

	window.addEventListener("resize", handleResize);

	// Initialize media store and start render loop
	setMediaStore(scroll.scrollY);
	shaderRenderLoop = requestAnimationFrame(render);
}

// // Main initialization function that runs when DOM is ready
// function initShaderOnScroll() {
// 	if (shaderInitialized) {
// 		console.log("Shader already initialized, skipping...");
// 		return;
// 	}
// 	// Check if required elements exist
// 	const mediaElements = document.querySelectorAll(
// 		"[data-webgl-media='true']"
// 	);

// 	if (mediaElements.length === 0) {
// 		console.warn(
// 			"ShaderOnScroll: No elements with [data-webgl-media='true'] attribute found. Lenis smooth scroll is still active."
// 		);
// 		return;
// 	}

// 	shaderInitialized = true;

// 	// Constants
// 	const CAMERA_POS = 500;

// 	// cursor position
// 	let cursorPos = {
// 		current: { x: 0.5, y: 0.5 },
// 		target: { x: 0.5, y: 0.5 },
// 	};

// 	let cursorRaf;

// 	const lerpCursorPos = () => {
// 		const x = lerp(cursorPos.current.x, cursorPos.target.x, 0.05);
// 		const y = lerp(cursorPos.current.y, cursorPos.target.y, 0.05);

// 		cursorPos.current.x = x;
// 		cursorPos.current.y = y;

// 		const delta = Math.sqrt(
// 			(cursorPos.target.x - cursorPos.current.x) ** 2 +
// 				(cursorPos.target.y - cursorPos.current.y) ** 2
// 		);

// 		if (delta < 0.001 && cursorRaf) {
// 			cancelAnimationFrame(cursorRaf);
// 			cursorRaf = null;
// 			return;
// 		}

// 		cursorRaf = requestAnimationFrame(lerpCursorPos);
// 	};

// 	window.addEventListener("mousemove", (event) => {
// 		cursorPos.target.x = event.clientX / window.innerWidth;
// 		cursorPos.target.y = event.clientY / window.innerHeight;

// 		if (!cursorRaf) {
// 			cursorRaf = requestAnimationFrame(lerpCursorPos);
// 		}
// 	});

// 	// helper for image-to-webgl and uniform updates
// 	// this lerps when entering the texture with cursor
// 	const handleMouseEnter = (index) => {
// 		gsap.to(mediaStore[index], {
// 			mouseEnter: 1,
// 			duration: 0.6,
// 			ease: CustomEase.create("custom", "0.4, 0, 0.2, 1"),
// 		});
// 	};

// 	// this updates the cursor position uniform on the texture
// 	const handleMousePos = (e, index) => {
// 		const bounds = mediaStore[index].media.getBoundingClientRect();
// 		const x = e.offsetX / bounds.width;
// 		const y = e.offsetY / bounds.height;

// 		mediaStore[index].mouseOverPos.target.x = x;
// 		mediaStore[index].mouseOverPos.target.y = y;
// 	};

// 	// this lerps when leaving the texture with cursor
// 	const handleMouseLeave = (index) => {
// 		gsap.to(mediaStore[index], {
// 			mouseEnter: 0,
// 			duration: 0.6,
// 			ease: CustomEase.create("custom", "0.4, 0, 0.2, 1"),
// 		});
// 		gsap.to(mediaStore[index].mouseOverPos.target, {
// 			x: 0.5,
// 			y: 0.5,
// 			duration: 0.6,
// 			ease: CustomEase.create("custom", "0.4, 0, 0.2, 1"),
// 		});
// 	};

// 	// this gets all image html tags and creates individual canvas and renderer for each
// 	const setMediaStore = (scrollY) => {
// 		const media = [
// 			...document.querySelectorAll("[data-webgl-media='true']"),
// 		];

// 		// console.log(
// 		// 	`Found ${media.length} images with data-webgl-media="true"`
// 		// );

// 		mediaStore = media
// 			.map((media, i) => {
// 				// console.log(`Processing image ${i}:`, media);
// 				observer.observe(media);

// 				media.dataset.index = String(i);
// 				media.addEventListener("mouseenter", () => handleMouseEnter(i));
// 				media.addEventListener("mousemove", (e) =>
// 					handleMousePos(e, i)
// 				);
// 				media.addEventListener("mouseleave", () => handleMouseLeave(i));

// 				const bounds = media.getBoundingClientRect();

// 				// Create individual canvas for this image
// 				let canvas = media.nextElementSibling;
// 				if (!canvas || canvas.tagName !== "CANVAS") {
// 					canvas = document.createElement("canvas");
// 					canvas.style.position = "absolute";
// 					canvas.style.top = "0";
// 					canvas.style.left = "0";
// 					canvas.style.width = "100%";
// 					canvas.style.height = "100%";
// 					canvas.style.pointerEvents = "none";
// 					canvas.style.zIndex = "0";

// 					// Make parent relative if not already positioned
// 					const parent = media.parentNode;
// 					const parentStyle = getComputedStyle(parent);
// 					if (parentStyle.position === "static") {
// 						parent.style.position = "relative";
// 					}

// 					// Insert canvas as next sibling to media element
// 					media.parentNode.insertBefore(canvas, media.nextSibling);
// 					// console.log(`Canvas created for image ${i}`, canvas);
// 				} else {
// 					console.log(`Canvas already exists for image ${i}`, canvas);
// 				}

// 				// Verify canvas is properly referenced
// 				if (!canvas) {
// 					console.error(`Canvas is null for image ${i}!`);
// 					return null;
// 				}

// 				// Create individual scene and renderer for this image
// 				const individualScene = new THREE.Scene();
// 				const camera = new THREE.PerspectiveCamera(
// 					50,
// 					bounds.width / bounds.height,
// 					10,
// 					1000
// 				);
// 				camera.position.z = CAMERA_POS;
// 				camera.fov = calcFov(CAMERA_POS);
// 				camera.updateProjectionMatrix();

// 				try {
// 					const renderer = new THREE.WebGLRenderer({
// 						canvas: canvas,
// 						alpha: true,
// 						antialias: true,
// 					});
// 					renderer.setSize(bounds.width, bounds.height);
// 					renderer.setPixelRatio(
// 						Math.min(window.devicePixelRatio, 2)
// 					);
// 					// Set clear color to transparent
// 					renderer.setClearColor(0x000000, 0);

// 					const imageMaterial = material.clone();
// 					const imageMesh = new THREE.Mesh(geometry, imageMaterial);

// 					let texture = null;

// 					// Create texture with proper CORS and WebGL handling
// 					const createTexture = (imageElement) => {
// 						const tex = new THREE.Texture(imageElement);
// 						tex.wrapS = THREE.ClampToEdgeWrapping;
// 						tex.wrapT = THREE.ClampToEdgeWrapping;
// 						tex.minFilter = THREE.LinearFilter;
// 						tex.magFilter = THREE.LinearFilter;
// 						tex.generateMipmaps = false;
// 						tex.needsUpdate = true;
// 						return tex;
// 					};

// 					// Try to load image with CORS handling
// 					if (media.src && media.tagName.toLowerCase() === "img") {
// 						const img = new Image();
// 						img.crossOrigin = "anonymous";

// 						img.onload = () => {
// 							texture = createTexture(img);
// 							imageMaterial.uniforms.uTexture.value = texture;
// 							imageMaterial.uniforms.uTextureSize.value.x =
// 								img.naturalWidth || 1;
// 							imageMaterial.uniforms.uTextureSize.value.y =
// 								img.naturalHeight || 1;
// 						};

// 						img.onerror = () => {
// 							// Fallback: use original image without CORS
// 							console.warn(
// 								"CORS loading failed for image, using original:",
// 								media.src
// 							);
// 							texture = createTexture(media);
// 							imageMaterial.uniforms.uTexture.value = texture;
// 							imageMaterial.uniforms.uTextureSize.value.x =
// 								media.naturalWidth || 1;
// 							imageMaterial.uniforms.uTextureSize.value.y =
// 								media.naturalHeight || 1;
// 						};

// 						img.src = media.src;
// 					} else {
// 						// Fallback for non-image elements or images without src
// 						texture = createTexture(media);
// 						imageMaterial.uniforms.uTexture.value = texture;
// 						imageMaterial.uniforms.uTextureSize.value.x =
// 							media.naturalWidth || 1;
// 						imageMaterial.uniforms.uTextureSize.value.y =
// 							media.naturalHeight || 1;
// 					}

// 					imageMaterial.uniforms.uQuadSize.value.x = bounds.width;
// 					imageMaterial.uniforms.uQuadSize.value.y = bounds.height;
// 					imageMaterial.uniforms.uBorderRadius.value =
// 						getComputedStyle(media).borderRadius.replace("px", "");

// 					// Calculate proper scale to fill viewport while maintaining proper deformation
// 					const fov = camera.fov * (Math.PI / 180);
// 					const distance = camera.position.z;
// 					const height = 2 * Math.tan(fov / 2) * distance;
// 					const width = height * camera.aspect;

// 					// Scale to fill viewport for proper rendering
// 					imageMesh.scale.set(width, height, 1);
// 					imageMesh.position.set(0, 0, 0);

// 					individualScene.add(imageMesh);

// 					// Check for hover-only mode using dedicated attribute
// 					const hoverOnly =
// 						media.getAttribute("data-webgl-hover-only") === "true";

// 					return {
// 						media,
// 						canvas,
// 						scene: individualScene,
// 						camera,
// 						renderer,
// 						material: imageMaterial,
// 						mesh: imageMesh,
// 						width: bounds.width,
// 						height: bounds.height,
// 						top: bounds.top + scrollY,
// 						left: bounds.left,
// 						isInView:
// 							bounds.top >= -500 &&
// 							bounds.top <= window.innerHeight + 500,
// 						mouseEnter: 0,
// 						hoverOnly, // Store the hover-only setting
// 						mouseOverPos: {
// 							current: {
// 								x: 0.5,
// 								y: 0.5,
// 							},
// 							target: {
// 								x: 0.5,
// 								y: 0.5,
// 							},
// 						},
// 					};
// 				} catch (error) {
// 					console.error(
// 						`Failed to create WebGL renderer for image ${i}:`,
// 						error
// 					);
// 					return null;
// 				}
// 			})
// 			.filter(Boolean); // Remove any null entries
// 	};

// 	// Shader setup
// 	let observer;
// 	let mediaStore;
// 	let geometry;
// 	let material;

// 	// create intersection observer to only render in view elements
// 	observer = new IntersectionObserver(
// 		(entries) => {
// 			entries.forEach((entry) => {
// 				const index = entry.target.dataset.index;

// 				if (index) {
// 					mediaStore[parseInt(index)].isInView = entry.isIntersecting;
// 				}
// 			});
// 		},
// 		{ rootMargin: "500px 0px 500px 0px" }
// 	);

// 	// geometry and material template (will be cloned for each image)
// 	geometry = new THREE.PlaneGeometry(1, 1, 100, 100);
// 	material = new THREE.ShaderMaterial({
// 		uniforms: {
// 			uResolution: {
// 				value: new THREE.Vector2(window.innerWidth, window.innerHeight),
// 			},
// 			uTime: { value: 0 },
// 			uCursor: { value: new THREE.Vector2(0.5, 0.5) },
// 			uScrollVelocity: { value: 0 },
// 			uTexture: { value: null },
// 			uTextureSize: { value: new THREE.Vector2(100, 100) },
// 			uQuadSize: { value: new THREE.Vector2(100, 100) },
// 			uBorderRadius: { value: 0 },
// 			uMouseEnter: { value: 0 },
// 			uMouseOverPos: { value: new THREE.Vector2(0.5, 0.5) },
// 		},
// 		vertexShader: effectVertex,
// 		fragmentShader: effectFragment,
// 		glslVersion: THREE.GLSL3,
// 	});

// 	// render loop - now renders each individual canvas
// 	const render = (time = 0) => {
// 		time /= 1000;

// 		if (!mediaStore || mediaStore.length === 0) {
// 			requestAnimationFrame(render);
// 			return;
// 		}

// 		mediaStore.forEach((object) => {
// 			if (!object) return; // Skip null objects

// 			if (object.isInView) {
// 				object.mouseOverPos.current.x = lerp(
// 					object.mouseOverPos.current.x,
// 					object.mouseOverPos.target.x,
// 					0.05
// 				);
// 				object.mouseOverPos.current.y = lerp(
// 					object.mouseOverPos.current.y,
// 					object.mouseOverPos.target.y,
// 					0.05
// 				);

// 				object.material.uniforms.uResolution.value.x = object.width;
// 				object.material.uniforms.uResolution.value.y = object.height;
// 				object.material.uniforms.uTime.value = time;
// 				object.material.uniforms.uCursor.value.x = cursorPos.current.x;
// 				object.material.uniforms.uCursor.value.y = cursorPos.current.y;
// 				// Apply scroll velocity only if not hover-only mode
// 				object.material.uniforms.uScrollVelocity.value =
// 					object.hoverOnly ? 0 : scroll.scrollVelocity;
// 				object.material.uniforms.uMouseOverPos.value.x =
// 					object.mouseOverPos.current.x;
// 				object.material.uniforms.uMouseOverPos.value.y =
// 					object.mouseOverPos.current.y;
// 				object.material.uniforms.uMouseEnter.value = object.mouseEnter;

// 				// Render this individual canvas
// 				object.renderer.render(object.scene, object.camera);
// 			}
// 		});

// 		shaderRenderLoop = requestAnimationFrame(render);
// 	};

// 	const handleResize = debounce(() => {
// 		mediaStore.forEach((object) => {
// 			const bounds = object.media.getBoundingClientRect();

// 			// Update canvas size
// 			object.renderer.setSize(bounds.width, bounds.height);

// 			// Update camera aspect ratio
// 			object.camera.aspect = bounds.width / bounds.height;
// 			object.camera.fov = calcFov(CAMERA_POS);
// 			object.camera.updateProjectionMatrix();

// 			// Recalculate scale to fill viewport
// 			const fov = object.camera.fov * (Math.PI / 180);
// 			const distance = object.camera.position.z;
// 			const height = 2 * Math.tan(fov / 2) * distance;
// 			const width = height * object.camera.aspect;

// 			object.mesh.scale.set(width, height, 1);
// 			object.width = bounds.width;
// 			object.height = bounds.height;
// 			object.top = bounds.top + scroll.scrollY;
// 			object.left = bounds.left;
// 			object.isInView =
// 				bounds.top >= -500 && bounds.top <= window.innerHeight + 500;

// 			// Update material uniforms
// 			object.material.uniforms.uResolution.value.x = bounds.width;
// 			object.material.uniforms.uResolution.value.y = bounds.height;
// 			object.material.uniforms.uTextureSize.value.x =
// 				object.media.naturalWidth || 1;
// 			object.material.uniforms.uTextureSize.value.y =
// 				object.media.naturalHeight || 1;
// 			object.material.uniforms.uQuadSize.value.x = bounds.width;
// 			object.material.uniforms.uQuadSize.value.y = bounds.height;
// 			object.material.uniforms.uBorderRadius.value = getComputedStyle(
// 				object.media
// 			).borderRadius.replace("px", "");
// 		});
// 	});

// 	window.addEventListener("resize", handleResize);

// 	// Add the preloader logic
// 	// media details
// 	setMediaStore(scroll.scrollY);

// 	shaderRenderLoop = requestAnimationFrame(render);
// }

// // Initialize when DOM is ready
// if (document.readyState === "loading") {
// 	document.addEventListener("DOMContentLoaded", initShaderOnScroll);
// } else {
// 	// DOM is already ready
// 	initShaderOnScroll();
// }

export { initShaderOnScroll };
