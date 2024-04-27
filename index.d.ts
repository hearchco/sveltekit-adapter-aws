/**
 * Default function to create the SvelteKit adapter.
 * @param {AdapterOptions} [options] - The adapter options
 * @returns {Adapter} The adapter configuration
 */
export default function _default(options?: AdapterOptions | undefined): Adapter;
export type Adapter = import('@sveltejs/kit').Adapter;
export type Builder = import('@sveltejs/kit').Builder;
/**
 * Adapter options type definition.
 */
export type AdapterOptions = {
  /**
   * - The output directory for the adapter
   */
  out?: string | undefined;
  /**
   * - Whether to build for edge deployment (requires environment variables to use placeholders)
   */
  edge?: boolean | undefined;
  /**
   * - Whether to build for response streaming (requires lambda invoke method to be RESPONSE_STREAM)
   */
  stream?: boolean | undefined;
  /**
   * - Additional esbuild options
   */
  esbuild?: import('esbuild').BuildOptions | undefined;
};
