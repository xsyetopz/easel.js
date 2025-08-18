// https://vitejs.dev/config/
export default {
    root: '.',
    build: {
        lib: {
            entry: "src/index.js",
            fileName: (format, entryName) => `${entryName}.${format}.js`,
            name: "Easel",
        },
        rollupOptions: {
            external: [],
            output: {
                globals: {}
            }
        }
    },
    server: {
        port: 3000,
        open: true
    }
};
