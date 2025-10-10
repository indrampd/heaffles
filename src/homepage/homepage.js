import calculateInitialTransform from "../utils/calculateInitialTransform";

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

export { heroAnim, menuAnim, experienceAnim, inspireAnim, journalAnim };
