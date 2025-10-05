export function cleanupAnimations() {
	// Kill all ScrollTriggers
	ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

	// Clear GSAP timeline
	gsap.globalTimeline.clear();

	// Kill all tweens
	gsap.killTweensOf("*");

	// Destroy all Swiper instances
	document.querySelectorAll(".swiper").forEach((swiperEl) => {
		if (swiperEl.swiper) {
			swiperEl.swiper.destroy(true, true);
		}
	});

	// Revert all SplitText instances
	if (window.SplitText && SplitText.revert) {
		SplitText.revert("[data-split]");
	}

	console.log("Animations cleaned up");
}
