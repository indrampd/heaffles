import { gsap } from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);

export function linkToFlip(button, container, visual) {
	const href = button.getAttribute("href");
	const state = Flip.getState(visual);
	const containerState = Flip.getState(container);

	// Create timeline with the animation
	const tl = gsap.timeline({
		// onComplete: () => {
		// 	console.log("navigating to", href);
		// 	if (href) {
		// 		// window.location.href = href;
		// 	}
		// },
	});

	// Add flip animation
	tl.add(() => {
		container.appendChild(visual);
		Flip.from(state, {
			duration: 3,
			// absolute: true,
			props: "height",
			// scale: true,
		});
	});
	tl.to(visual, { height: "100vh", duration: 0.5 }, "<");
	tl.to(
		".hero_stories_item_text",
		{
			xPercent: -110,
			autoAlpha: 0,
			stagger: 0.1,
			duration: 0.8,
		},
		"<"
	);

	return tl;
}
