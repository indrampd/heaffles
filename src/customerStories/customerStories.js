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

export { customerStoriesAnim };
