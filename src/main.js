import gsap from "gsap";
import Lenis from "lenis";
import Button from "./utils/button";
import calculateInitialTransform from "./utils/calculateInitialTransform";
import barba from "@barba/core";

import * as THREE from "three";

import { resizeThreeCanvas } from "./utils/resizeThreeCanvas";
import { calcFov } from "./utils/calcFov";
import { debounce } from "./utils/debounce";
import { lerp } from "./utils/lerp";

import { preloadImages } from "./utils/preloadImages.js";

import baseVertex from "./shader/baseVertex.glsl";
import baseFragment from "./shader/baseFragment.glsl";
import effectVertex from "./shader/effectVertex.glsl";
import effectFragment from "./shader/effectFragment.glsl";

gsap.registerPlugin(SplitText, CustomEase, ScrollTrigger);

CustomEase.create("cEase", "0.65, 0.05, 0, 1");
CustomEase.create("cEaseReverse", "1, 0, 0.35, 0.95");

gsap.defaults({
	ease: "cEase",
	duration: 1,
});

// Initialize Lenis smooth scroll globally (always runs)
let scroll = {
	scrollY: window.scrollY,
	scrollVelocity: 0,
};

const lenis = new Lenis();

lenis.on("scroll", (e) => {
	scroll.scrollY = window.scrollY;
	scroll.scrollVelocity = e.velocity;
});

function scrollRaf(time) {
	lenis.raf(time);
	requestAnimationFrame(scrollRaf);
}

requestAnimationFrame(scrollRaf);

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

function initSplit() {
	const lineTargets = document.querySelectorAll('[data-split="lines"]');
	const wordTargets = document.querySelectorAll('[data-split="words"]');
	const charTargets = document.querySelectorAll('[data-split="chars"]');

	let splitTextLines, splitTextWords, splitTextChars;

	if (splitTextLines) splitTextLines.revert();
	if (splitTextWords) splitTextWords.revert();
	if (splitTextChars) splitTextChars.revert();

	if (lineTargets.length) {
		splitTextLines = SplitText.create(lineTargets, {
			type: "lines",
			linesClass: "line",
			mask: "lines",
			propIndex: true,
		});
	}

	if (wordTargets.length) {
		splitTextWords = SplitText.create(wordTargets, {
			type: "lines, words",
			wordsClass: "word",
			linesClass: "line",
			mask: "lines",
			propIndex: true,
		});
	}

	if (charTargets.length) {
		splitTextChars = SplitText.create(charTargets, {
			type: "words, chars",
			charsClass: "char",
			wordsClass: "word",
			mask: "words",
			propIndex: true,
		});
	}
}

// Global
function buttonHoverSetup() {
	const buttons = gsap.utils.toArray(".btn_main_wrap");

	buttons.forEach((button) => {
		gsap.context(() => {
			const text = gsap.utils.toArray(".btn_main_text .char");

			const hoverAnim = gsap.to(text, {
				yPercent: -110,
				duration: 0.75,
				stagger: 0.02,
				paused: true,
			});

			button.addEventListener("mouseenter", () => {
				hoverAnim.play();
			});
			button.addEventListener("mouseleave", () => {
				hoverAnim.reverse();
			});
		}, button);
	});
}

function customCursor() {
	const cursorWrap = document.querySelector(".cursor_wrap");

	if (!cursorWrap) return;

	gsap.context(() => {
		const cursorDot = document.querySelector(".cursor_dot");
		const cursorOutline = document.querySelector(".cursor_outline");

		const dotX = gsap.quickSetter(cursorDot, "x", "px");
		const dotY = gsap.quickSetter(cursorDot, "y", "px");
		const outlineX = gsap.quickSetter(cursorOutline, "x", "px");
		const outlineY = gsap.quickSetter(cursorOutline, "y", "px");

		let mouseX = 0;
		let mouseY = 0;
		let isHovering = false;

		window.addEventListener("mousemove", (e) => {
			mouseX = e.clientX;
			mouseY = e.clientY;

			dotX(mouseX);
			dotY(mouseY);
		});

		gsap.ticker.add(() => {
			if (!isHovering) {
				const newOutlineX = gsap.utils.interpolate(
					cursorOutline._gsap.x,
					mouseX,
					0.1
				);
				const newOutlineY = gsap.utils.interpolate(
					cursorOutline._gsap.y,
					mouseY,
					0.1
				);
				outlineX(newOutlineX);
				outlineY(newOutlineY);
			}
		});

		const interactiveElements = document.querySelectorAll("a, button");

		interactiveElements.forEach((el) => {
			el.addEventListener("mouseover", () => {
				isHovering = true;
				gsap.to([cursorDot, cursorOutline], {
					autoAlpha: 0,
					scale: 0,
					duration: 0.4,
					ease: "power2",
				});
			});

			el.addEventListener("mouseout", () => {
				isHovering = false;
				gsap.to([cursorDot, cursorOutline], {
					autoAlpha: 1,
					scale: 1,
					duration: 0.4,
					ease: "power2",
				});
			});
		});
	}, cursorWrap);
}

function applySlowZoomEffect() {
	gsap.utils.toArray(".g_visual_wrap").forEach((visual) => {
		gsap.context(() => {
			gsap.utils.toArray('[data-visual-scrub="true"]').forEach((el) => {
				gsap.fromTo(
					el,
					{ scale: 1.3 },
					{
						scale: 1,
						scrollTrigger: {
							trigger: el,
							start: "clamp(top 90%)",
							end: "max",
							scrub: 1,
							markers: false,
							toggleActions: "play none none reverse",
						},
						ease: "none",
					}
				);
			});
		}, visual);
	});
}

function textCharsReveal() {
	gsap.utils.toArray("[data-chars-reveal=true]").forEach((char) => {
		if (!char) return;

		const chars = gsap.utils.toArray(".char", char);
		gsap.set(chars, {
			willChange: "visibility, opacity, filter, transform",
			perspective: 1000,
		});

		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: char,
				start: "clamp(top 80%)",
				end: "clamp(bottom 80%)",
				scrub: 1,
			},
			defaults: {
				ease: "none",
			},
		});

		tl.from(chars, {
			autoAlpha: 0.4,
			duration: 1,
			// rotateX: 45,
			stagger: 0.05,
		});
	});
}

function textWordsReveal() {
	gsap.utils.toArray("[data-words-reveal=true]").forEach((word) => {
		if (!word) return;

		const words = gsap.utils.toArray(".word", word);
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: word,
				start: "clamp(top 75%)",
				end: "clamp(bottom 75%)",
				toggleActions: "play none none none",
			},
		});

		tl.from(words, { yPercent: 120, duration: 1, stagger: 0.1 });
	});
}

function textLinesReveal() {
	gsap.utils.toArray("[data-lines-reveal=true]").forEach((line) => {
		if (!line) return;

		const lines = gsap.utils.toArray(".line", line);
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: line,
				start: "clamp(top 75%)",
				end: "clamp(bottom 75%)",
				toggleActions: "play none none none",
			},
		});

		tl.from(lines, { yPercent: 120, duration: 1, stagger: 0.05 });
	});
}

function footerLogoReveal() {
	const section = document.querySelector(".footer_3_wrap");

	if (!section) return;

	const logoWrap = section.querySelector(".footer_3_logo_wrap");
	const paths = gsap.utils.toArray(".footer_3_logo_wrap path");

	gsap.context(() => {
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: logoWrap,
				start: "clamp(top bottom)",
				end: "clamp(bottom center)",
				toggleActions: "play none none none",
				// scrub: true,
			},
		});

		tl.from(paths, {
			yPercent: 110,
			duration: 1.5,
			delay: 0.1,
			stagger: 0.05,
		});
	}, section);
}

function horizontalScrollSetup() {
	const section = document.querySelector(".horizontal_wrap");
	if (!section) return;
	gsap.context(() => {
		const track = document.querySelector(
			".horizontal_wrap > .horizontal_track"
		);
		const spacer = document.querySelector(
			".horizontal_wrap [data-trigger]"
		);
		const sections = gsap.utils.toArray(".horizontal_track section");

		const mm = gsap.matchMedia();

		mm.add("(min-width: 992px)", () => {
			function updateHeight() {
				spacer.style.height = window.innerWidth * sections.length;

				ScrollTrigger.refresh();
			}

			// Set initial height
			updateHeight();

			let scrollTween = gsap
				.timeline({
					scrollTrigger: {
						trigger: section,
						start: "top top",
						end: "bottom bottom",
						scrub: 1,
					},
				})
				.to(sections, {
					xPercent: -100 * (sections.length - 1),
					ease: "none",
				});

			sections.forEach((section) => {
				const targetLines = gsap.utils.toArray(
					"[data-split]:not([data-lines-reveal='true']) .line"
				);

				if (!targetLines.length) return;

				targetLines.forEach((line) => {
					gsap.timeline({
						scrollTrigger: {
							trigger: line,
							containerAnimation: scrollTween,
							start: "left right-=15%",
						},
					}).fromTo(
						line,
						{ yPercent: 100 },
						{
							yPercent: 0,
							stagger: 0.1,
							onComplete: () => {
								gsap.set(line, { clearProps: "transform" });
							},
						}
					);
				});
			});

			window.addEventListener("resize", updateHeight);
		});
	}, section);
}

// Homepage
function heroAnim() {
	const section = document.querySelector(".hero_main_wrap");

	if (!section) return;

	gsap.context(() => {
		const title = gsap.utils.toArray(".hero_main_title .char");
		const subtitle = gsap.utils.toArray(".hero_main_subtitle .word");
		const paragraph = gsap.utils.toArray(".hero_main_text .line");
		const visual = document.querySelector(
			".hero_main_visual_wrap .g_visual_wrap"
		);
		const btn = document.querySelector(".btn_main_wrap");
		const btnText = gsap.utils.toArray(".btn_main_text .char");

		const mm = gsap.matchMedia();

		gsap.set(btn, { pointerEvents: "none" });

		let tl = gsap.timeline({
			defaults: {
				duration: 1,
			},
			onComplete: () => {
				gsap.set(btn, { clearProps: "pointerEvents" });
			},
		});

		tl.fromTo(
			visual,
			{
				clipPath: "inset(0 0 100% 0)",
				scale: 1.2,
			},
			{
				clipPath: "inset(0 0 0% 0)",
				scale: 1,
				delay: 0.4,
			}
		)
			.from(
				title,
				{
					xPercent: 100,
					stagger: 0.01,
				},
				"<10%"
			)
			.from(subtitle, { yPercent: 100, stagger: 0.1 }, "<10%")
			.from(paragraph, { yPercent: 100, stagger: 0.1 }, "<10%")
			.fromTo(
				btn,
				{ "--stroke-radius": "0turn" },
				{ "--stroke-radius": "1turn" },
				0.4
			)
			.fromTo(
				btnText,
				{ yPercent: 110 },
				{ yPercent: 0, stagger: 0.01, clearProps: "transform" },
				"<"
			);
	}, section);
}

function menuAnim() {
	const section = document.querySelector(".menu_wrap");

	if (!section) return;

	gsap.context(() => {
		const triggerElements = section.querySelectorAll("[data-trigger]");
		const visualGroupFirst = document.querySelector(
			"[data-menu-visual=first-container]"
		);
		const visualGroupSecond = document.querySelector(
			"[data-menu-visual=second-container]"
		);

		const visualFirstItems = gsap.utils.toArray(
			"[data-menu-visual=item]",
			visualGroupFirst
		);
		const visualSecondItems = gsap.utils.toArray(
			"[data-menu-visual=item]",
			visualGroupSecond
		);
		// const tabLinks = gsap.utils.toArray(".menu_tab_link", section);
		const tabContents = gsap.utils.toArray(".menu_tab_content", section);

		triggerElements.forEach((trigger, index) => {
			if (index === 0) return;

			const itemIndex = index - 1;

			if (visualFirstItems[itemIndex]) {
				clipItem(visualFirstItems[itemIndex], trigger);
			}

			if (visualSecondItems[itemIndex]) {
				clipItem(visualSecondItems[itemIndex], trigger);
			}

			if (tabContents[itemIndex]) {
				tabLinkContent(tabContents[itemIndex], trigger);
			}
		});

		function tabLinkContent(content, trigger) {
			if (!content || !trigger) return;

			const currentContent = gsap.utils.toArray(".line", content);
			const nextContent = getNextContent(content);

			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: trigger,
					start: "clamp(top bottom)",
					end: "clamp(bottom bottom)",
					scrub: true,
				},
				defaults: {
					duration: 0.75,
				},
			});

			tl.fromTo(
				currentContent,
				{ yPercent: 0 },
				{
					yPercent: -110,
					stagger: 0.05,
				}
			);

			if (nextContent.length > 0) {
				tl.fromTo(
					nextContent,
					{ yPercent: 110, autoAlpha: 0 },
					{
						yPercent: 0,
						autoAlpha: 1,
						stagger: 0.05,
					},
					"<50%"
				);
			}
		}

		function clipItem(item, trigger) {
			if (!item || !trigger) return;

			gsap.context(() => {
				gsap.timeline({
					scrollTrigger: {
						trigger: trigger,
						start: "clamp(top bottom)",
						end: "clamp(bottom bottom)",
						scrub: true,
					},
					defaults: { ease: "none" },
				}).fromTo(
					item,
					{
						clipPath: "inset(0 0 0% 0)",
					},
					{
						clipPath: "inset(0 0 100% 0)",
					}
				);
			}, item);
		}

		function getNextContent(currentContent) {
			const nextContentElement = currentContent.nextElementSibling;
			return nextContentElement
				? gsap.utils.toArray(".line", nextContentElement)
				: [];
		}

		function scrollToTrigger(trigger) {
			if (!trigger) return;

			gsap.to(window, {
				duration: 1.5,
				scrollTo: {
					y: trigger,
					offsetY: 100,
				},
				ease: "power2.inOut",
			});
		}

		ScrollTrigger.create({
			trigger: ".shop_wrap",
			start: "clamp(top bottom)",
			end: "clamp(top top)",
			scrub: true,
			animation: gsap.to(".menu_layout", {
				filter: "blur(10px)",
				autoAlpha: 0.6,
				scale: 0.9,
				transformOrigin: "top center",
				ease: "none",
				duration: 1,
			}),
		});

		// Return public API for external control
		return {
			scrollToItem: (index) =>
				scrollToTrigger(triggerElements[index + 1]),
			refresh: () => ScrollTrigger.refresh(),
			destroy: () => ScrollTrigger.getAll().forEach((st) => st.kill()),
		};
	}, section);
}

function experienceAnim() {
	const section = document.querySelector(".experience_wrap");

	if (!section) return;

	const trigger = section.querySelector("[data-trigger]");
	const grid = section.querySelector("[data-scrub-animation='grid']");
	const gridItems = grid.querySelectorAll("[data-grid='grid-item']");

	gsap.context(() => {
		gridItems.forEach((item) => {
			const transform = calculateInitialTransform(item);

			if (grid) {
				gsap.set(grid, { perspective: 1000 });
				gsap.set(".experience_title .char", {
					autoAlpha: 0,
					yPercent: 110,
				});
			}

			gsap.timeline({
				scrollTrigger: {
					trigger: trigger,
					start: "top bottom",
					end: "bottom bottom",
					scrub: true,
					invalidateOnRefresh: true,
					defaults: {
						overwrite: "auto",
					},
				},
			})
				/* .to(".experience_title .char", {
				autoAlpha: 1,
				yPercent: 0,
				duration: 1,
				stagger: {
					each: 0.015,
					from: "start",
				},
				ease: "back.out(1.5)",
			})
			.to(".experience_title .char", {
				autoAlpha: 0,
				yPercent: -110,
				duration: 0.75,
				stagger: {
					each: 0.015,
					from: "start",
				},
				ease: "back.out(1)",
			}) */
				.to(".experience_title .char", {
					keyframes: {
						"0%": { autoAlpha: 0, yPercent: 100 },
						"50%": {
							autoAlpha: 1,
							yPercent: 0,
							ease: "back.out(1.5)",
						},
						"100%": {
							autoAlpha: 0,
							yPercent: -110,
							delay: 0.25,
							ease: "back.out(1.1)",
						},
					},
					duration: 1.75,
					stagger: {
						each: 0.015,
						from: "start",
					},
				})
				.fromTo(
					item,
					{
						x: () => transform.x,
						y: () => transform.y,
						z: () => transform.z,
						rotationX: () => transform.rotateX * 0.5,
						rotationY: () => transform.rotateY,
						autoAlpha: 0,
						scale: 0.7,
						willChange: "transform, opacity",
					},
					{
						x: 0,
						y: 0,
						z: 0,
						rotationX: 0,
						rotationY: 0,
						autoAlpha: 1,
						scale: 1,
						stagger: {
							amount: 0.8,
							from: "center",
							grid: "auto",
						},
					},
					"<50%"
				);
		});
	}, section);
}

function inspireAnim() {
	const section = document.querySelector(".inspire_wrap");

	if (!section) return;

	gsap.context(() => {
		gsap.set(".btn_main_wrap", { pointerEvents: "none" });
		const mm = gsap.matchMedia();

		mm.add("(min-width: 992px", () => {
			gsap.timeline({
				defaults: { duration: 1 },
				scrollTrigger: {
					trigger: ".inspire_title",
					start: "clamp(top center)",
					end: "clamp(bottom center)",
					toggleActions: "play none none none",
				},
				onComplete: () => {
					gsap.set(".btn_main_wrap", { clearProps: "pointerEvents" });
				},
			})
				.from(".inspire_span .char", {
					yPercent: 110,
					autoAlpha: 0,
					stagger: 0.01,
				})
				.to(
					".inspire_span:nth-child(3)",
					{
						autoAlpha: 1,
						color: "#ff3b30",
						stagger: 0.05,
					},
					"<80%"
				)
				.to(".inspire_span .char", {
					yPercent: -110,
					autoAlpha: 0,
					stagger: 0.01,
				})
				.fromTo(
					".btn_main_wrap",
					{ "--stroke-radius": "0turn" },
					{ "--stroke-radius": "1turn" },
					"<80%"
				)
				.fromTo(
					".btn_main_text .char",
					{ yPercent: 110 },
					{ yPercent: 0, stagger: 0.01, clearProps: "transform" },
					"<"
				);
		});

		const prevDelay = gsap.utils.distribute({
			base: 0,
			amount: 0.25,
			from: "start",
		});

		const activeDelay = gsap.utils.distribute({
			base: 0.35,
			amount: 0.25,
			from: "start",
		});

		const swiperThumb = new Swiper(".swiper.is-inspire-thumb", {
			slidesPerView: "auto",
			loop: true,
			slideToClickedSlide: true,
			watchSlidesProgress: true,
			keyboard: { enabled: true, pageUpDown: false },
			mousewheel: { enabled: true, forceToAxis: true },
			grabCursor: true,
			slideActiveClass: "is-active",
			slideThumbActiveClass: "is-active",
		});

		const swiperContent = new Swiper(".swiper.is-inspire", {
			slidesPerView: "auto",
			loop: true,
			effect: "fade",
			fadeEffect: {
				crossFade: true,
			},
			allowTouchMove: false,
			slideActiveClass: "is-active",
			on: {
				slideChange: (swiper) => {
					gsap.utils
						.toArray(".swiper-slide.is-inspire")
						.forEach((slide, index) => {
							const lines = slide.querySelectorAll(
								".inspire_cms_text .line"
							);
							const words = slide.querySelectorAll(
								".inspire_cms_name .word, .inspire_cms_category .word"
							);

							const isActive = index === swiper.activeIndex;

							const delay = isActive ? activeDelay : prevDelay;

							gsap.set([lines, words], {
								transitionDelay: delay,
							});
						});
				},
			},
		});

		swiperThumb.on("realIndexChange", (swiper) => {
			const prevIndex = swiper.previousIndex;
			const currentIndex = swiper.realIndex;

			const prevSlide = swiperContent.slides?.[prevIndex];
			const currentSlide = swiperContent.slides?.[currentIndex];

			swiperContent.slideToLoop(swiper.realIndex, 1200, false);
		});
	}, section);
}

function journalAnim() {
	const section = document.querySelector(".journal_wrap");
	if (!section) return;

	gsap.context(() => {
		const swiperEl = document.querySelector(".swiper.is-journal");
		const links = gsap.utils.toArray(".journal_item_link", section);

		const prevDelay = gsap.utils.distribute({
			base: 0,
			amount: 0.25,
			from: "start",
		});

		const activeDelay = gsap.utils.distribute({
			base: 0.35,
			amount: 0.25,
			from: "start",
		});

		let isTransitioning = false;

		const swiperInstance = new Swiper(swiperEl, {
			slidesPerView: "auto",
			effect: "fade",
			allowTouchMove: false,
			slideActiveClass: "is-active",
			fadeEffect: {
				crossFade: true,
			},
			speed: 1200,
			on: {
				slideChangeTransitionStart: () => {
					isTransitioning = true;
					links.forEach(
						(link) => (link.style.pointerEvents = "none")
					);
				},
				slideChangeTransitionEnd: () => {
					isTransitioning = false;
					links.forEach(
						(link) => (link.style.pointerEvents = "auto")
					);
				},
				slideChange: (swiper) => {
					gsap.utils
						.toArray(".swiper-slide.is-journal")
						.forEach((slide, index) => {
							const lines = slide.querySelectorAll(
								".journal_content_text .line"
							);

							const isActive = index === swiper.activeIndex;

							const delay = isActive ? activeDelay : prevDelay;

							gsap.set(lines, {
								transitionDelay: delay,
							});
						});
				},
			},
		});

		links.forEach((el, index) => {
			links[0].classList.add("is-active");
			el.addEventListener("click", () => {
				swiperInstance.slideTo(index);
				section.setAttribute("data-journal-swiper", index + 1);

				links.forEach((element) =>
					element.classList.remove("is-active")
				);

				el.classList.add("is-active");
			});
		});
	}, section);
}

// About page
function heroAboutAnim() {
	const section = document.querySelector(".hero_about_wrap");

	if (!section) return;

	gsap.context(() => {
		gsap.timeline({
			defaults: { duration: 1 },
		})
			.from(".hero_about_visual", {
				clipPath: "inset(0% 0% 100% 0%)",
				stagger: 0.1,
			})
			.from(".g_visual_wrap", { scale: 1.2, stagger: 0.1 }, "<")
			.from(
				".hero_about_title .word",
				{ yPercent: 110, stagger: 0.1 },
				"<"
			)
			.from(
				".hero_about_subtitle .word",
				{ yPercent: 110, stagger: 0.1 },
				"<"
			)
			.from(
				".hero_about_text .line",
				{ yPercent: 110, stagger: 0.01 },
				"<25%"
			);
	}, section);
}

function ideaAnim() {
	const section = document.querySelector(".idea_wrap");
	if (!section) return;

	gsap.context(() => {
		ScrollTrigger.create({
			trigger: ".idea_text_span > .idea_text__span",
			start: "clamp(top 80%)",
			end: "clamp(bottom 60%)",
			scrub: true,
			animation: gsap
				.timeline({ defaults: { ease: "none" } })
				.fromTo(
					".idea_text_span > .idea_text__span .char",
					{ autoAlpha: 0.4 },
					{ autoAlpha: 1, color: "#ff3b30", stagger: 0.1 }
				)
				.fromTo(
					".idea_text_img",
					{ clipPath: "inset(50% 0% 50% 0%)", autoAlpha: 0 },
					{
						clipPath: "inset(0% 0% 0% 0%)",
						autoAlpha: 0.4,
						duration: 1,
						delay: 0.6,
					},
					"<"
				),
		});
	}, section);
}

function inspiredGlobalAnim() {
	const section = document.querySelector(".inspired_wrap");

	if (!section) return;

	gsap.context(() => {
		const prevDelay = gsap.utils.distribute({
			base: 0,
			amount: 0.15,
			from: "start",
		});

		const activeDelay = gsap.utils.distribute({
			base: 0.35,
			amount: 0.15,
			from: "start",
		});

		const swiperDetail = new Swiper(".swiper.is-inspired-content", {
			slidesPerView: 1,
			loop: true,
			effect: "fade",
			fadeEffect: {
				crossFade: true,
			},
			slideActiveClass: "is-active",
			on: {
				slideChange: (swiper) => {
					gsap.utils
						.toArray(".swiper-slide.is-inspired-content")
						.forEach((slide, index) => {
							const titleLines = slide.querySelectorAll(
								".inspired_detail_title .line"
							);

							const textLines = slide.querySelectorAll(
								".inspired_detail_text .line"
							);

							const isActive = index === swiper.activeIndex;

							const delay = isActive ? activeDelay : prevDelay;

							gsap.set(titleLines, {
								transitionDelay: delay,
							});
							gsap.set(textLines, {
								transitionDelay: delay,
							});
						});
				},
			},
		});

		const swiperContent = new Swiper(".swiper.is-inspired", {
			slidesPerView: 1,
			direction: "horizontal",
			autoHeight: false,
			loop: true,
			centeredSlides: true,
			slideToClickedSlide: true,
			watchSlidesProgress: true,
			keyboard: { enabled: true, pageUpDown: false },
			mousewheel: { enabled: false, forceToAxis: true },
			grabCursor: true,
			speed: 1200,
			autoplay: {
				enabled: true,
				delay: 10000,
			},
			slideActiveClass: "is-active",
			breakpoints: {
				992: {
					slidesPerView: 2.5,
					direction: "vertical",
					autoHeight: true,
				},
			},
			on: {
				slideChange: (swiper) => {
					gsap.utils
						.toArray(".swiper-slide.is-inspired")
						.forEach((slide, index) => {
							const chars = slide.querySelectorAll(
								".inspired_content_title .char"
							);

							const isActive = index === swiper.activeIndex;

							const delay = isActive ? activeDelay : prevDelay;

							gsap.set(chars, {
								transitionDelay: delay,
							});
						});
				},
			},
		});

		swiperContent.on("realIndexChange", (swiper) => {
			const prevIndex = swiper.previousIndex;
			const currentIndex = swiper.realIndex;
			swiperDetail.slideToLoop(swiper.realIndex, 1200, false);
		});
	}, section);
}

function inviteAnim() {
	const section = document.querySelector(".invite_wrap");

	console.log("Invite Section:", section); // Debugging line to check if section is found

	if (!section) return;

	gsap.context(() => {
		const mm = gsap.matchMedia();
		mm.add("(max-width: 991px)", () => {
			gsap.from(".invite_quotes .word", {
				yPercent: 110,
				duration: 1,
				stagger: 0.015,
				scrollTrigger: {
					trigger: ".invite_quotes",
					start: "clamp(top bottom)",
					end: "clamp(top center)",
					toggleActions: "play none none none",
				},
			});

			gsap.from(".invite_text .line", {
				yPercent: 110,
				duration: 1,
				stagger: { amount: 0.15 },
				scrollTrigger: {
					trigger: ".invite_text",
					start: "clamp(top bottom)",
					end: "clamp(top center)",
					toggleActions: "play none none none",
				},
			});
		});

		mm.add("(min-width: 992px)", () => {
			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: "[data-trigger='invite-section']",
					start: "clamp(top bottom)",
					end: "clamp(bottom bottom+=10%)",
					scrub: true,
					// markers: true,
				},
			});

			tl.from(".invite_visual_wrap", {
				x: 0,
				duration: 1,
				ease: "power2.inOut",
			});
			tl.to(
				".invite_text .line",
				{ yPercent: -110, duration: 1, stagger: { amount: 0.15 } },
				0
			);
			tl.fromTo(
				".invite_quotes .word",
				{ yPercent: 110 },
				{ yPercent: 0, duration: 1, stagger: 0.1 },
				"<50%"
			);
		});
	}, section);
}

function ethosDetailAnim() {
	const section = document.querySelector(".ethos_2_wrap");

	if (!section) return;

	gsap.context(() => {
		const swiperEl = document.querySelector(".swiper.is-ethos");
		const links = gsap.utils.toArray(".ethos_2_link", section);

		const prevDelay = gsap.utils.distribute({
			base: 0,
			amount: 0.25,
			from: "start",
		});

		const activeDelay = gsap.utils.distribute({
			base: 0.35,
			amount: 0.25,
			from: "start",
		});

		let isTransitioning = false;

		const swiperInstance = new Swiper(swiperEl, {
			slidesPerView: "auto",
			effect: "fade",
			allowTouchMove: false,
			slideActiveClass: "is-active",
			fadeEffect: {
				crossFade: true,
			},
			speed: 1200,
			on: {
				slideChangeTransitionStart: () => {
					isTransitioning = true;
					links.forEach(
						(link) => (link.style.pointerEvents = "none")
					);
				},
				slideChangeTransitionEnd: () => {
					isTransitioning = false;
					links.forEach(
						(link) => (link.style.pointerEvents = "auto")
					);
				},
				slideChange: (swiper) => {
					gsap.utils
						.toArray(".swiper-slide.is-ethos")
						.forEach((slide, index) => {
							const lines = slide.querySelectorAll(
								".ethos_2_text .line"
							);

							const isActive = index === swiper.activeIndex;

							const delay = isActive ? activeDelay : prevDelay;

							gsap.set(lines, {
								transitionDelay: delay,
							});
						});
				},
			},
		});

		links.forEach((el, index) => {
			links[0].classList.add("is-active");
			el.addEventListener("click", () => {
				swiperInstance.slideTo(index);

				links.forEach((element) =>
					element.classList.remove("is-active")
				);

				el.classList.add("is-active");
			});
		});
	}, section);
}

// Membership page
function heroMemberAnim() {
	const section = document.querySelector(".hero_member_wrap");

	if (!section) return;
	gsap.context(() => {
		gsap.set(".btn_main_wrap", { pointerEvents: "none" });

		gsap.timeline({
			defaults: { duration: 1 },
			onComplete: () => {
				gsap.set(".btn_main_wrap", { clearProps: "pointerEvents" });
			},
		})
			.fromTo(
				".hero_member_visual",
				{
					clipPath: "inset(0% 0% 100% 0%)",
					stagger: 0.1,
				},
				{
					clipPath: "inset(0% 0% 0% 0%)",
					stagger: 0.1,
					delay: 0.4,
				}
			)
			.from(".g_visual_wrap", { scale: 1.2, stagger: 0.1 }, "<")
			.from(
				".hero_member_title .char",
				{ yPercent: 110, stagger: 0.015 },
				"<"
			)
			.from(
				".hero_member_subtitle .word",
				{ yPercent: 110, stagger: 0.1 },
				"<"
			)
			.from(
				".hero_member_text .line",
				{ yPercent: 110, stagger: 0.01 },
				"<25%"
			)
			.from(
				".btn_main_text .char",
				{ yPercent: 110, stagger: 0.01 },
				"<25%"
			)
			.fromTo(
				".btn_main_wrap",
				{ "--stroke-radius": "0turn" },
				{ "--stroke-radius": "1turn" },
				"<"
			);
	}, section);
}

function visionAnim() {
	const section = document.querySelector(".vision_2_wrap");

	if (!section) return;

	gsap.context(() => {
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: "[data-trigger]",
				start: "clamp(top bottom)",
				end: "clamp(bottom bottom)",
				scrub: true,
				// markers: true,
			},
		});
	}, section);
}

function impactAnim() {
	const section = document.querySelector(".impact_2_wrap");
	if (!section) return;

	gsap.context(() => {
		const swiperMain = new Swiper(".swiper.is-impact", {
			direction: "horizontal",
			slidesPerView: "auto",
			autoHeight: true,
			loop: true,
			centeredSlides: false,
			grabCursor: true,
			watchSlidesProgress: true,
			slideActiveClass: "is-active",
			slideToClickedSlide: true,
			speed: 1200,
			autoplay: {
				enabled: true,
				delay: 5000,
			},
			breakpoints: {
				992: {
					direction: "vertical",
					centeredSlides: true,
					slidesPerView: "auto",
				},
			},
		});

		const swiperDetail = new Swiper(".swiper.is-impact-detail", {
			slidesPerView: 1,
			slideActiveClass: "is-active",
			effect: "fade",
			fadeEffect: {
				crossFade: true,
			},
			allowTouchMove: false,
		});

		swiperMain.on("realIndexChange", (swiper) => {
			swiperDetail.slideToLoop(swiper.realIndex, 1200, false);
		});
	}, section);
}

// Customer stories page
function customerStoriesAnim() {
	const section = document.querySelector(".hero_stories_wrap");

	if (!section) return;

	gsap.context(() => {
		const swiperEl = document.querySelector(".swiper.is-hero-stories");
		const links = gsap.utils.toArray(".hero_stories_item_link", section);
		const buttons = gsap.utils.toArray(".btn_main_wrap a");
		const container = document.querySelector(".hero_stories_bg_flip");
		const visual = gsap.utils.toArray(".hero_stories_visual_wrap");

		// window.addEventListener("pageshow", (event) => {
		// 	if (event.persisted) {
		// 		window.location.reload();
		// 	}
		// });

		// buttons.forEach((button, index) => {
		// 	button.addEventListener("mouseenter", (e) => {
		// 		e.preventDefault();
		// 		linkToFlip(button, container, visual[index]);
		// 	});
		// });

		const prevDelay = gsap.utils.distribute({
			base: 0,
			amount: 0.25,
			from: "start",
		});

		const activeDelay = gsap.utils.distribute({
			base: 0.35,
			amount: 0.25,
			from: "start",
		});

		const tl = gsap
			.timeline({
				onComplete: () => {
					gsap.set(".btn_main_wrap", { clearProps: "pointerEvents" });
				},
			})
			.set(".btn_main_wrap", { pointerEvents: "none" })
			.from(links, {
				yPercent: 110,
				autoAlpha: 0,
				stagger: 0.05,
				duration: 1.5,
			})
			.fromTo(
				".hero_stories_visual_wrap",
				{
					clipPath: "inset(0 0 100% 0)",
				},
				{
					clipPath: "inset(0 0 0% 0)",
					duration: 1.5,
				},
				"<"
			)
			.from(".g_visual_wrap", { scale: 1.2, duration: 1.5 }, "<")
			.fromTo(
				".btn_main_wrap",
				{ "--stroke-radius": "0turn" },
				{ "--stroke-radius": "1turn", duration: 1 },
				"<50%"
			)
			.from(
				".btn_main_text .char",
				{
					yPercent: 110,
					stagger: 0.01,
					duration: 1,
					clearProps: "transform",
				},
				"<"
			);

		let isTransitioning = false;

		const swiperInstance = new Swiper(swiperEl, {
			slidesPerView: "auto",
			effect: "fade",
			allowTouchMove: false,
			preventInteractionOnTransition: true,
			slideActiveClass: "is-active",
			fadeEffect: {
				crossFade: true,
			},
			speed: 1200,
			on: {
				slideChangeTransitionStart: () => {
					isTransitioning = true;
					links.forEach(
						(link) => (link.style.pointerEvents = "none")
					);
				},
				slideChangeTransitionEnd: () => {
					isTransitioning = false;
					links.forEach(
						(link) => (link.style.pointerEvents = "auto")
					);
				},
				slideChange: (swiper) => {
					gsap.utils
						.toArray(".swiper-slide.is-hero-stories")
						.forEach((slide, index) => {
							const lines = slide.querySelectorAll(
								".hero_stories_text .line"
							);

							const isActive = index === swiper.activeIndex;

							const delay = isActive ? activeDelay : prevDelay;

							gsap.set(lines, {
								transitionDelay: delay,
							});
						});
				},
			},
		});

		links.forEach((el, index) => {
			links[0].classList.add("is-active");
			el.addEventListener("mouseenter", () => {
				// Prevent interaction if already transitioning
				if (isTransitioning) return;

				swiperInstance.slideTo(index);

				links.forEach((element) =>
					element.classList.remove("is-active")
				);

				el.classList.add("is-active");
			});
		});
	}, section);
}

function heroJournalAnim() {
	const section = document.querySelector(".hero_journal_wrap");

	if (!section) return;

	gsap.context(() => {
		let swiperVisualInstance = null;
		let swiperContentInstance = null;
		let isInitializing = false;
		const filterBtns = gsap.utils.toArray(".radio_btn");

		filterBtns.forEach((btn) => {
			btn.addEventListener("click", () => {
				gsap.set(".hero_slider_visual", { autoAlpha: 0 });

				gsap.delayedCall(0.2, () => {
					gsap.timeline()
						.fromTo(
							".hero_slider_visual",
							{
								autoAlpha: 0,
								clipPath: "inset(50% 0% 50% 0%",
							},
							{
								autoAlpha: 1,
								duration: 1,
								clipPath: "inset(0% 0% 0% 0%)",
								stagger: {
									each: 0.1,
									from: "center",
								},
							}
						)
						.fromTo(
							".g_visual_wrap",
							{ scale: 1.2 },
							{
								scale: 1,
								duration: 1,
								stagger: {
									each: 0.1,
									from: "center",
								},
							},
							"<"
						);
				});
			});
		});

		function destroySwipers() {
			if (swiperVisualInstance) {
				swiperVisualInstance.destroy(true, true);
				swiperVisualInstance = null;
			}
			if (swiperContentInstance) {
				swiperContentInstance.destroy(true, true);
				swiperContentInstance = null;
			}
		}

		const prevDelay = gsap.utils.distribute({
			base: 0,
			amount: 0.25,
			from: "start",
		});

		const activeDelay = gsap.utils.distribute({
			base: 0.35,
			amount: 0.25,
			from: "start",
		});

		const tl = gsap.timeline({
			onComplete: () => {
				gsap.set(".btn_main_wrap", { clearProps: "pointerEvents" });
			},
		});
		tl.set(".btn_main_wrap", { pointerEvents: "none" });
		tl.fromTo(
			".hero_slider_visual",
			{
				autoAlpha: 0,
				clipPath: "inset(50% 0% 50% 0%",
			},
			{
				autoAlpha: 1,
				duration: 1,
				clipPath: "inset(0% 0% 0% 0%)",
				stagger: {
					each: 0.1,
					from: "center",
				},
			}
		).fromTo(
			".g_visual_wrap",
			{ scale: 1.2 },
			{
				scale: 1,
				duration: 1,
				stagger: {
					each: 0.1,
					from: "center",
				},
			},
			"<"
		);

		tl.from(
			".hero_journal_title .word",
			{
				yPercent: 110,
				stagger: 0.1,
				duration: 1,
			},
			"<25%"
		);

		tl.from(
			".radio_btn_label",
			{
				yPercent: 110,
				stagger: 0.1,
				duration: 1,
			},
			"<"
		);

		tl.fromTo(
			".btn_main_wrap",
			{
				"--stroke-radius": "0turn",
			},
			{
				"--stroke-radius": "1turn",
			},
			"<"
		).from(
			".btn_main_text .char",
			{
				yPercent: 110,
				stagger: 0.01,
				duration: 1,
				clearProps: "transform",
			},
			"<"
		);

		tl.from(
			".hero_journal_number > div",
			{
				yPercent: 110,
				autoAlpha: 0,
				duration: 1,
			},
			"<25%"
		);

		function initSwiper() {
			if (isInitializing) return;
			isInitializing = true;

			const swiperVisualEl = document.querySelector(
				".swiper.is-journal-visual"
			);
			const swiperContentEl = document.querySelector(
				".swiper.is-journal-content"
			);
			const currentNumberEl = document.querySelector(
				"[data-swiper-pagination=current]"
			);
			const totalNumberEl = document.querySelector(
				"[data-swiper-pagination=total]"
			);

			if (!swiperVisualEl || !swiperContentEl) {
				console.warn("Swiper elements not found");
				isInitializing = false;
				return;
			}

			const visualSlides = swiperVisualEl.querySelectorAll(
				".swiper-slide:not(.swiper-slide-duplicate)"
			);
			const contentSlides = swiperContentEl.querySelectorAll(
				".swiper-slide:not(.swiper-slide-duplicate)"
			);

			const slideCount = Math.max(
				visualSlides.length,
				contentSlides.length
			);
			let enableLoop = slideCount > 3;

			console.log(`Found ${slideCount} slides, loop: ${enableLoop}`);

			requestAnimationFrame(() => {
				try {
					// Initialize Visual Swiper
					swiperVisualInstance = new Swiper(swiperVisualEl, {
						modules: [EffectPanorama],
						direction: "horizontal",
						slidesPerView: "auto",
						centeredSlides: true,
						spaceBetween: 16,
						slideToClickedSlide: true,
						loop: enableLoop,
						watchSlidesProgress: true,
						lazy: {
							loadPrevNext: true,
						},
						effect: "panorama",
						panoramaEffect: { depth: 1000, rotate: 36 },
						mousewheel: { enabled: true },
						speed: 800,
						breakpoints: {
							992: {
								direction: "vertical",
								spaceBetween: 32,
							},
						},
					});

					// Initialize Content Swiper
					swiperContentInstance = new Swiper(swiperContentEl, {
						slidesPerView: 1,
						effect: "fade",
						fadeEffect: {
							crossFade: true,
						},
						allowTouchMove: false,
						slideActiveClass: "is-active",
						loop: enableLoop,
						speed: 1200,
						on: {
							// The slideChange logic seems fine, no changes needed here.
							slideChange: (swiper) => {
								gsap.utils
									.toArray(".swiper-slide.is-journal-content")
									.forEach((slide, index) => {
										const lines = slide.querySelectorAll(
											".hero_slider_text .line"
										);

										const isActive =
											index === swiper.activeIndex;

										const delay = isActive
											? activeDelay
											: prevDelay;

										gsap.set(lines, {
											transitionDelay: delay,
										});
									});
							},
						},
					});

					// Update pagination and sync swipers (your existing logic is good)
					if (swiperVisualInstance && swiperVisualInstance.slides) {
						const totalSlides = enableLoop
							? swiperVisualInstance.slides.filter(
									(slide) =>
										!slide.classList.contains(
											"swiper-slide-duplicate"
										)
							  ).length
							: swiperVisualInstance.slides.length;

						if (currentNumberEl && totalNumberEl) {
							const currentIndex = enableLoop
								? swiperVisualInstance.realIndex
								: swiperVisualInstance.activeIndex;
							currentNumberEl.innerHTML = currentIndex + 1;
							totalNumberEl.innerHTML = totalSlides;
						}
					}

					const syncHandler = () => {
						const currentIndex = enableLoop
							? swiperVisualInstance.realIndex
							: swiperVisualInstance.activeIndex;
						if (currentNumberEl) {
							currentNumberEl.innerHTML = currentIndex + 1;
						}
						if (swiperContentInstance) {
							if (enableLoop) {
								swiperContentInstance.slideToLoop(
									currentIndex,
									1200,
									false
								);
							} else {
								swiperContentInstance.slideTo(
									currentIndex,
									1200,
									false
								);
							}
						}
					};

					if (enableLoop) {
						swiperVisualInstance.on("realIndexChange", syncHandler);
					} else {
						swiperVisualInstance.on("slideChange", syncHandler);
					}

					console.log("Swipers initialized successfully");
					isInitializing = false;
				} catch (error) {
					console.error("Error initializing swipers:", error);
					isInitializing = false;
				}
			});
		}

		initSwiper();

		window.FinsweetAttributes ||= [];
		window.FinsweetAttributes.push([
			"list",
			(listInstances) => {
				console.log("Finsweet List instances:", listInstances);
				const [listInstance] = listInstances;
				if (!listInstance) return;

				listInstance.addHook("beforeRender", (renderedItems) => {
					destroySwipers();
				});

				listInstance.addHook("render", (renderedItems) => {
					initSwiper();
				});
			},
		]);

		return () => {
			console.log("Cleaning up swipers");
			destroySwipers();
		};
	}, section);
}

function initAllAnimation() {
	const buttonElements = document.querySelectorAll('[data-block="button"]');

	buttonElements.forEach((buttonElement) => {
		new Button(buttonElement);
	});

	customCursor();
	applySlowZoomEffect();

	// init global function
	initSplit();
	textCharsReveal();
	textWordsReveal();
	textLinesReveal();
	// buttonHoverSetup();
	footerLogoReveal();
	horizontalScrollSetup();

	// init homepage function
	heroAnim();
	menuAnim();
	experienceAnim();
	inspireAnim();
	journalAnim();

	// init about page function
	heroAboutAnim();
	ideaAnim();
	inspiredGlobalAnim();
	inviteAnim();
	ethosDetailAnim();

	// init membership page function
	heroMemberAnim();
	impactAnim();

	// init customer stories page function
	customerStoriesAnim();

	// init journal page function
	heroJournalAnim();

	gsap.set('[data-prevent-flicker="true"]', { autoAlpha: 1 });
}

/* document.addEventListener("DOMContentLoaded", () => {
const buttonElements = document.querySelectorAll('[data-block="button"]');

buttonElements.forEach((buttonElement) => {
	new Button(buttonElement);
});

customCursor();
applySlowZoomEffect();

document.fonts.ready.then(() => {
	preloadImages().then(() => {
		// init global function
		initSplit();
		textCharsReveal();
		textWordsReveal();
		textLinesReveal();
		buttonHoverSetup();
		footerLogoReveal();
		horizontalScrollSetup();

		// init homepage function
		heroAnim();
		menuAnim();
		experienceAnim();
		inspireAnim();
		journalAnim();

		// init about page function
		heroAboutAnim();
		ideaAnim();
		inspiredGlobalAnim();
		inviteAnim();
		ethosDetailAnim();

		// init membership page function
		heroMemberAnim();
		impactAnim();

		// init customer stories page function
		customerStoriesAnim();

		gsap.set('[data-prevent-flicker="true"]', { autoAlpha: 1 });
	});
});
}); */

document.addEventListener("DOMContentLoaded", () => {
	document.fonts.ready.then(() => {
		preloadImages().then(() => {
			initShaderOnScroll();
			initAllAnimation();
		});
	});
});
