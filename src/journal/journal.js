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

export { heroJournalAnim };
