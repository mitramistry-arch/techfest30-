#!/usr/bin/env bash
# Bootstrap the headless Chromium used by the Playwright QA harnesses.
#
# The sandbox image does not ship a browser, and `npx playwright install
# chromium` cannot reach the CDN. `@sparticuz/chromium` ships a compressed
# build instead — but the pieces have to land in exactly the right places
# or WebGL silently fails to start:
#
#   /tmp/chromium        the browser binary
#   /tmp/*.so            SwiftShader (libGLESv2.so, libvk_swiftshader.so, …)
#                        Chromium looks for these NEXT TO the binary
#   /tmp/fonts/          the fontconfig tree
#   /tmp/al2023/lib/     the Amazon Linux shared libraries
#
# Usage: ./tools/setup-chromium.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d node_modules/@sparticuz/chromium ]; then
  echo "==> installing dev dependencies"
  npm install
fi

BIN="node_modules/@sparticuz/chromium/bin"

if [ ! -x /tmp/chromium ]; then
  echo "==> unpacking chromium"
  node -e "
    const zlib=require('zlib'),fs=require('fs');
    fs.writeFileSync('/tmp/chromium', zlib.brotliDecompressSync(fs.readFileSync('$BIN/chromium.br')));
  "
  chmod +x /tmp/chromium
fi

if [ ! -f /tmp/libGLESv2.so ]; then
  echo "==> unpacking swiftshader (must sit flat in /tmp, beside the binary)"
  node -e "
    const zlib=require('zlib'),fs=require('fs');
    fs.writeFileSync('/tmp/swiftshader.tar', zlib.brotliDecompressSync(fs.readFileSync('$BIN/swiftshader.tar.br')));
  "
  tar -xf /tmp/swiftshader.tar -C /tmp
fi

if [ ! -d /tmp/fonts/fonts ]; then
  echo "==> unpacking fonts"
  node -e "
    const zlib=require('zlib'),fs=require('fs');
    fs.writeFileSync('/tmp/fonts.tar', zlib.brotliDecompressSync(fs.readFileSync('$BIN/fonts.tar.br')));
  "
  tar -xf /tmp/fonts.tar -C /tmp
fi

if [ ! -d /tmp/al2023/lib ]; then
  echo "==> unpacking the al2023 shared libraries"
  node -e "
    const zlib=require('zlib'),fs=require('fs');
    fs.writeFileSync('/tmp/al2023.tar', zlib.brotliDecompressSync(fs.readFileSync('$BIN/al2023.tar.br')));
  "
  mkdir -p /tmp/al2023
  tar -xf /tmp/al2023.tar -C /tmp/al2023
fi

echo "==> $(LD_LIBRARY_PATH=/tmp/al2023/lib /tmp/chromium --version)"
cat <<'EOF'

Ready. Run the QA suites with:

  CHROME_PATH=/tmp/chromium LD_LIBRARY_PATH=/tmp/al2023/lib node tools/interact.js
  CHROME_PATH=/tmp/chromium LD_LIBRARY_PATH=/tmp/al2023/lib node tools/interact3d.js
  CHROME_PATH=/tmp/chromium LD_LIBRARY_PATH=/tmp/al2023/lib node tools/shoot3d.js

and serve the site with:

  npm start        # http://localhost:4173
EOF
