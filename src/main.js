import gsap from "gsap";
import Lenis from "lenis";
import Button from "./utils/button";
import calculateInitialTransform from "./utils/calculateInitialTransform";

import { preloadImages } from "./utils/preloadImages.js";
import { initShaderOnScroll } from "./shader/initShaderOnScroll.js";
import {
	heroAnim,
	menuAnim,
	experienceAnim,
	inspireAnim,
	journalAnim,
} from "./homepage/homepage.js";

import {
	heroAboutAnim,
	ideaAnim,
	inspiredGlobalAnim,
	inviteAnim,
	ethosDetailAnim,
} from "./about/about.js";

import { heroMemberAnim, impactAnim } from "./membership/membership.js";
import { customerStoriesAnim } from "./customerStories/customerStories.js";
import { heroJournalAnim } from "./journal/journal.js";

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
