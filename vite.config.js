import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import path from 'path';

console.log(
	path.resolve(
		__dirname,
		fileURLToPath(new URL('./src/dashboard/setup.html', import.meta.url))
	)
);

export default defineConfig({
	optimizeDeps: {
		esbuildOptions: {
			target: 'es2020',
		},
	},
	build: {
		rollupOptions: {
			input: {
				setup: path.resolve(
					__dirname,
					fileURLToPath(new URL('./src/dashboard/setup.html', import.meta.url))
				),
			},
		},
		outDir: '../../dashboard',
		emptyOutDir: true,
		sourcemap: true,
	},
	root: fileURLToPath(new URL('./src/dashboard', import.meta.url)),
	base: './',
	resolve: {
		preserveSymlinks: true,
	},
});
