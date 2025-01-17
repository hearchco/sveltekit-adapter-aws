// @ts-self-types="./index.d.ts"

/**
 * SvelteKit adapter for AWS Lambda and Lambda@Edge.
 * @module sveltekit-adapter-aws
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, transform } from 'esbuild';

/**
 * @typedef {import('@sveltejs/kit').Adapter} Adapter
 * @typedef {import('@sveltejs/kit').Builder} Builder
 */

/**
 * Adapter options type definition.
 * @typedef {object} AdapterOptions
 * @property {string} [out] - The output directory for the adapter
 * @property {boolean} [edge] - Whether to build for edge deployment (requires environment variables to use placeholders)
 * @property {boolean} [stream] - Whether to build for response streaming (requires lambda invoke method to be RESPONSE_STREAM)
 * @property {import('esbuild').BuildOptions} [esbuild] - Additional esbuild options
 */

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Default function to create the SvelteKit adapter.
 * @param {AdapterOptions} [options] - The adapter options
 * @returns {Adapter} The adapter configuration
 */
export default function (options = {}) {
  const name = 'sveltekit-adapter-aws';

  const opt = {
    out: options.out ?? 'build',
    edge: options.edge ?? false,
    stream: options.stream ?? false,
    esbuild: options.esbuild ?? {}
  };

  /**
   * WARNING: This is a workaround to inject environment variables into the edge function
   * The placeholder '{{_EDGE_FUNCTION_ENVIRONMENT_}}' must be replaced with your IaC pipeline
   */
  const banner = opt.edge
    ? "process.env = { ...process.env, ...'{{_EDGE_FUNCTION_ENVIRONMENT_}}' }; import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
    : "import { createRequire } from 'module'; const require = createRequire(import.meta.url);";

  const adapter = {
    name: name,

    /**
     * Adapts the project for deployment.
     * @param {Builder} builder - The builder instance from SvelteKit
     * @returns {Promise<void>}
     */
    async adapt(builder) {
      const tmp = path.join('.svelte-kit', name);
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
      const out = path.resolve(opt.out);
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

      // Minify Cloudfront Function code
      builder.log.minor('Minifying Cloudfront function...');
      const minifiedCloudfrontFunction = await transform(
        fs.readFileSync(
          path.join(serverDir, 'cloudfront', 'index.js'),
          'utf-8'
        ),
        {
          minify: true,
          target: 'es2020'
        }
      );
      fs.writeFileSync(
        path.join(cloudfront, 'index.js'),
        `${minifiedCloudfrontFunction.code}`
      );

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
        banner: {
          js: banner
        },
        ...opt.esbuild
      });
    }
  };

  return adapter;
}
