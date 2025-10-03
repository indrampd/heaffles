import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
	base: "./",
	plugins: [glsl()],
	build: {
		outDir: "dist",
		minify: "terser",
		rollupOptions: {
			input: "./src/main.js",
			output: {
				entryFileNames: "index.min.js",
				chunkFileNames: "index.min.js",
				assetFileNames: "index.[ext]",
				format: "iife",
				name: "ScriptInit",
			},
		},
		sourcemap: false,
		chunkSizeWarningLimit: 500,
		reportCompressedSize: true,
	},
});
