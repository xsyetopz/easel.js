/**
 * Navigate to a hash route.
 * @param {string} hash - Route path without leading #, e.g. "examples/hello-cube"
 */
export function navigate(hash) {
	window.location.hash = `#/${hash}`;
}
