import esbuild from 'esbuild';

async function check() {
  try {
    await esbuild.build({
      entryPoints: ['src/App.tsx'],
      outfile: 'out.js',
      bundle: true,
      external: ['react', 'react-dom']
    });
    console.log("Build SUCCESS");
  } catch (e) {
    console.error("Build FAILED", e);
  }
}
check();
