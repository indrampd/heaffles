import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
	base: "./",
	plugins: [glsl()],
	build: {
		outDir: "dist",
		minify: "terser",
		rollupOptions: {
			input: {
				main: "./src/main.js",
			},
			output: {
				entryFileNames: "[name].min.js",
				chunkFileNames: "[name]-[hash].js",
				assetFileNames: "assets/[name].[ext]",
				format: "iife",
			},
		},
		sourcemap: false,
		chunkSizeWarningLimit: 500,
		reportCompressedSize: true,
	},
});
