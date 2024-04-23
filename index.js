import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {import('@sveltejs/kit').Adapter} Adapter
 * @typedef {import('@sveltejs/kit').Builder} Builder
 */

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Default function to create the SvelteKit adapter.
 * @returns {Adapter} The adapter configuration
 */
export default function () {
  const adapter = {
    name: 'sveltekit-adapter-aws',

    /**
     * Adapts the project for deployment.
     * @param {Builder} builder - The builder instance from SvelteKit
     */
    async adapt(builder) {
      const out = path.join('.svelte-kit', 'sveltekit-adapter-aws');
      const clientDir = path.join(out, 'client');
      const serverDir = path.join(out, 'server');
      const prerenderedDir = path.join(out, 'prerendered');

      // Cleanup output folder
      builder.rimraf(out);
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
      // save a list of files in server handler folder
      fs.writeFileSync(
        path.join(serverDir, 'lambda-handler', 'prerendered-file-list.js'),
        `export default ${JSON.stringify(prerenderedFiles)}`
      );
    }
  };

  return adapter;
}
