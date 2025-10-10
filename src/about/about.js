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

export {
	heroAboutAnim,
	ideaAnim,
	inspiredGlobalAnim,
	inviteAnim,
	ethosDetailAnim,
};
