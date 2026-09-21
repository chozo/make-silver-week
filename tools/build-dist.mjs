import { cp, mkdir, rm } from 'node:fs/promises';

const distributionDirectory = new URL('../dist/', import.meta.url);
const outputDirectory = new URL('../dist/make-silver-week/', import.meta.url);
await rm(distributionDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const file of ['index.html', 'style.css', 'game.js', 'favicon.svg']) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(`./${file}`, outputDirectory));
}
