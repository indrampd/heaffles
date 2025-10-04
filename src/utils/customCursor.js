class CustomCursor {
	constructor() {
		this.cursor = document.querySelector(".cursor");
		this.cursorDot = document.querySelector(".cursor-dot");
		this.cursorOutline = document.querySelector(".cursor-outline");
		this.cursorIcon = document.querySelector(".cursor-icon");
		this.cursorTextBar = document.querySelector(".cursor-text-bar");

		this.mouse = { x: 0, y: 0 };
		this.cursorPos = { x: 0, y: 0 };
		this.isHovering = false;
		this.currentState = "default";

		this.init();
	}

	init() {
		// Hide default cursor and show custom cursor
		document.body.style.cursor = "none";
		this.cursor.style.display = "block";

		// Mouse move event
		document.addEventListener("mousemove", (e) => {
			this.mouse.x = e.clientX;
			this.mouse.y = e.clientY;
			this.updateCursorPosition();
		});

		// Mouse leave event
		document.addEventListener("mouseleave", () => {
			gsap.to(this.cursor, {
				duration: 0.3,
				opacity: 0,
				ease: "power2.out",
			});
		});

		// Mouse enter event
		document.addEventListener("mouseenter", () => {
			gsap.to(this.cursor, {
				duration: 0.3,
				opacity: 1,
				ease: "power2.out",
			});
		});

		this.bindHoverEvents();
		this.startAnimationLoop();
	}

	updateCursorPosition() {
		gsap.set(this.cursor, {
			x: this.mouse.x,
			y: this.mouse.y,
		});
	}

	bindHoverEvents() {
		// Button and link hover
		const interactiveElements = document.querySelectorAll(
			'[data-cursor="button"], [data-cursor="link"], button, a'
		);

		interactiveElements.forEach((el) => {
			el.addEventListener("mouseenter", () => {
				const cursorType =
					el.getAttribute("data-cursor") ||
					(el.tagName.toLowerCase() === "button" ? "button" : "link");
				this.setState(cursorType);
			});

			el.addEventListener("mouseleave", () => {
				this.setState("default");
			});
		});

		// Gallery and slider hover
		const galleryElements = document.querySelectorAll(
			'[data-cursor="gallery"], [data-cursor="slider"]'
		);

		galleryElements.forEach((el) => {
			el.addEventListener("mouseenter", () => {
				const cursorType = el.getAttribute("data-cursor");
				this.setState(cursorType);
			});

			el.addEventListener("mouseleave", () => {
				this.setState("default");
			});

			// Add mouse move for directional arrows on sliders
			if (el.getAttribute("data-cursor") === "slider") {
				el.addEventListener("mousemove", (e) => {
					const rect = el.getBoundingClientRect();
					const centerX = rect.left + rect.width / 2;
					const isLeft = e.clientX < centerX;

					this.updateSliderDirection(isLeft);
				});
			}
		});

		// Text hover
		const textElements = document.querySelectorAll(
			'[data-cursor="text"], p:not([data-cursor]), h1:not([data-cursor]), h2:not([data-cursor]), h3:not([data-cursor])'
		);

		textElements.forEach((el) => {
			el.addEventListener("mouseenter", () => {
				if (!el.closest("a, button")) {
					this.setState("text");
				}
			});

			el.addEventListener("mouseleave", () => {
				this.setState("default");
			});
		});
	}

	setState(state) {
		if (this.currentState === state) return;

		// Remove all state classes
		this.cursor.className = "cursor";

		// Add new state class
		if (state !== "default") {
			this.cursor.classList.add(`hover-${state}`);
		}

		this.currentState = state;
		this.animateStateChange(state);
	}

	animateStateChange(state) {
		const timeline = gsap.timeline();

		switch (state) {
			case "button":
				timeline
					.to(this.cursorDot, {
						duration: 0.2,
						scale: 0,
						ease: "back.in(2)",
					})
					.to(
						this.cursorOutline,
						{
							duration: 0.3,
							scale: 1.2,
							ease: "back.out(2)",
						},
						0
					);
				break;

			case "link":
				timeline
					.to(this.cursorDot, {
						duration: 0.2,
						scale: 1.5,
						ease: "back.out(2)",
					})
					.to(
						this.cursorOutline,
						{
							duration: 0.2,
							scale: 1.1,
							ease: "power2.out",
						},
						0
					);
				break;

			case "gallery":
			case "slider":
				timeline
					.to([this.cursorDot, this.cursorOutline], {
						duration: 0.2,
						opacity: 0,
						scale: 0.5,
						ease: "power2.in",
					})
					.to(
						this.cursorIcon,
						{
							duration: 0.3,
							opacity: 1,
							scale: 1,
							ease: "back.out(2)",
						},
						0.1
					);
				break;

			case "text":
				timeline
					.to([this.cursorDot, this.cursorOutline], {
						duration: 0.2,
						opacity: 0,
						ease: "power2.in",
					})
					.to(
						this.cursorTextBar,
						{
							duration: 0.3,
							opacity: 1,
							scaleY: 1,
							ease: "back.out(2)",
						},
						0.1
					);
				break;

			default:
				timeline
					.to([this.cursorIcon, this.cursorTextBar], {
						duration: 0.2,
						opacity: 0,
						scale: 0.5,
						ease: "power2.in",
					})
					.to(
						[this.cursorDot, this.cursorOutline],
						{
							duration: 0.3,
							opacity: 1,
							scale: 1,
							ease: "back.out(2)",
						},
						0.1
					);
				break;
		}
	}

	updateSliderDirection(isLeft) {
		const leftArrow = this.cursorIcon.querySelector(".arrow-left");
		const rightArrow = this.cursorIcon.querySelector(".arrow-right");
		const dragIcon = this.cursorIcon.querySelector(".drag-icon");

		if (isLeft) {
			leftArrow.style.display = "block";
			rightArrow.style.display = "none";
			dragIcon.style.display = "none";
		} else {
			leftArrow.style.display = "none";
			rightArrow.style.display = "block";
			dragIcon.style.display = "none";
		}
	}

	startAnimationLoop() {
		const animate = () => {
			// Smooth cursor following
			this.cursorPos.x += (this.mouse.x - this.cursorPos.x) * 0.1;
			this.cursorPos.y += (this.mouse.y - this.cursorPos.y) * 0.1;

			// Add slight rotation based on movement
			const deltaX = this.mouse.x - this.cursorPos.x;
			const deltaY = this.mouse.y - this.cursorPos.y;
			const rotation = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

			gsap.set(this.cursorIcon, {
				rotation: rotation,
			});

			requestAnimationFrame(animate);
		};

		animate();
	}
}

export default CustomCursor;
