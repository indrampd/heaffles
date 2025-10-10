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
				{ yPercent: 110, stagger: 0.01, clearProps: "transform" },
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

export { heroMemberAnim, visionAnim, impactAnim };
