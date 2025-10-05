export function resetWebflow(data) {
	let dom = $(
		new DOMParser().parseFromString(data.next.html, "text/html")
	).find("html");
	// reset webflow interactions
	$("html").attr("data-wf-page", dom.attr("data-wf-page"));
	window.Webflow && window.Webflow.destroy();
	window.Webflow && window.Webflow.ready();
	window.Webflow && window.Webflow.require("ix2").init();
	// reset w--current class
	$(".w--current").removeClass("w--current");
	$("a").each(function () {
		if ($(this).attr("href") === window.location.pathname) {
			$(this).addClass("w--current");
		}
	});
	// reset scripts
	dom.find("[data-barba-script]").each(function () {
		let codeString = $(this).text();
		if (codeString.includes("DOMContentLoaded")) {
			let newCodeString = codeString.replace(
				/window\.addEventListener\("DOMContentLoaded",\s*\(\s*event\s*\)\s*=>\s*{\s*/,
				""
			);
			codeString = newCodeString.replace(/\s*}\s*\);\s*$/, "");
		}
		let script = document.createElement("script");
		script.type = "text/javascript";
		if ($(this).attr("src")) script.src = $(this).attr("src");
		script.text = codeString;
		document.body.appendChild(script).remove();
	});
}
