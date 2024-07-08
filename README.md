# sveltekit-adapter-aws

SvelteKit AWS universal adapter for creating necessary assets and code which can later be deployed using a custom IaC pipeline.

## Install

Run:

```sh
pnpm dlx jsr add @hearchco/sveltekit-adapter-aws
```

Switch your adapter in sveltekit config to `@hearchco/sveltekit-adapter-aws`

## Acknowledgements

This project wouldn't be possible without:

- [sst](https://github.com/sst/sst) for most of the code logic
- [jill64](https://github.com/jill64/sveltekit-adapter-aws) for initial spark on how to make this
- [sdocquir](https://github.com/sdocquir/svelte-kit-sst-streaming) for showing how to implement response streaming
