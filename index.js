import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {import('@sveltejs/kit').Adapter} Adapter
 * @typedef {import('@sveltejs/kit').Builder} Builder
 */

/**
 * Adapter options type definition.
 * @typedef {Object} AdapterOptions
 * @property {string} [out] - The output directory for the adapter
 * @property {boolean} [stream] - Whether to build for response streaming (requires lambda invoke method to be RESPONSE_STREAMING)
 * @property {import('esbuild').BuildOptions} [esbuild] - Additional esbuild options
 */

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Default function to create the SvelteKit adapter.
 * @param {AdapterOptions} [options] - The adapter options
 * @returns {Adapter} The adapter configuration
 */
export default function (options = {}) {
  const adapter = {
    name: 'sveltekit-adapter-aws',

    /**
     * Adapts the project for deployment.
     * @param {Builder} builder - The builder instance from SvelteKit
     */
    async adapt(builder) {
      const tmp = path.join('.svelte-kit', 'sveltekit-adapter-aws');
      const clientDir = path.join(tmp, 'client');
      const serverDir = path.join(tmp, 'server');
      const prerenderedDir = path.join(tmp, 'prerendered');

      // Cleanup temporary output folder
      builder.rimraf(tmp);
      builder.mkdirp(clientDir);
      builder.mkdirp(serverDir);
      builder.mkdirp(prerenderedDir);

      // Create static output
      builder.log.minor('Copying assets...');
      builder.writeClient(clientDir);
      const prerenderedFiles = builder.writePrerendered(prerenderedDir);

      // Create Lambda function
      builder.log.minor('Generating server function...');
      builder.writeServer(serverDir);
      // copy over handler files in server handler folder
      builder.copy(
        path.join(__dirname, 'handler'),
        path.join(serverDir, 'lambda-handler')
      );
      // copy over cloudfront files in server handler folder
      builder.copy(
        path.join(__dirname, 'cloudfront'),
        path.join(serverDir, 'cloudfront')
      );
      // save a list of files in server handler folder
      fs.writeFileSync(
        path.join(serverDir, 'lambda-handler', 'prerendered-file-list.js'),
        `export default ${JSON.stringify(prerenderedFiles)}`
      );

      // Set output directory
      const out = path.resolve(options.out ?? 'build');
      const s3 = path.join(out, 's3');
      const lambda = path.join(out, 'lambda');
      const cloudfront = path.join(out, 'cloudfront');

      // Cleanup output directory
      builder.rimraf(out);
      builder.mkdirp(s3);
      builder.mkdirp(lambda);
      builder.mkdirp(cloudfront);

      // Copy static files & prerendered pages to S3
      builder.log.minor('Copying assets for S3...');
      builder.copy(clientDir, s3);
      builder.copy(prerenderedDir, s3);

      // Bundle and minify Cloudfront Function code
      builder.log.minor('Bundling Cloudfront function...');
      await build({
        entryPoints: [path.join(serverDir, 'cloudfront', 'index.js')],
        outfile: path.join(cloudfront, 'index.js'),
        bundle: true,
        minify: true,
        platform: 'node',
        target: 'esnext',
        format: 'cjs',
        external: ['aws-sdk'],
        ...(options.esbuild ?? {})
      });

      // Bundle and minify server code
      builder.log.minor('Bundling Lambda function...');
      await build({
        entryPoints: [path.join(serverDir, 'lambda-handler', 'index.js')],
        outfile: path.join(lambda, 'index.mjs'),
        outExtension: {
          '.js': '.mjs'
        },
        bundle: true,
        minify: true,
        platform: 'node',
        target: 'esnext',
        format: 'esm',
        external: ['aws-sdk'],
        ...(options.esbuild ?? {})
      });
    }
  };

  return adapter;
}
