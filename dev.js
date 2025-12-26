const { spawn } = require('child_process');
const chokidar = require('chokidar');

function runBuild() {
  return spawn(process.execPath, ['build.js'], {
    stdio: 'inherit',
  });
}

let building = false;
let pending = false;

async function buildOnce() {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  pending = false;

  await new Promise((resolve, reject) => {
    const child = runBuild();
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`build.js exited with code ${code}`));
    });
  }).catch(err => {
    console.error(err);
  });

  building = false;
  if (pending) buildOnce();
}

async function main() {
  await buildOnce();

  const watcher = chokidar.watch('icons/**/*.svg', {
    ignoreInitial: true,
  });
  watcher.on('add', buildOnce);
  watcher.on('change', buildOnce);
  watcher.on('unlink', buildOnce);

  const devServer = spawn('npx', ['wrangler', 'dev', '--local', '--port', '8787'], {
    stdio: 'inherit',
    shell: true,
  });

  devServer.on('exit', code => {
    process.exit(code ?? 0);
  });
}

main();
