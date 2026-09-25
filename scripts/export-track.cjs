// Run after compiling tests / lib to /tmp/apex-tests (README).
const fs=require('node:fs');
const {TRACK}=require('/tmp/apex-tests/lib/sim/track.js');
fs.writeFileSync('public/data/suzuka/derived-track.json',JSON.stringify({units:'metres; curvature 1/metre; grade dimensionless',provenance:'See NOTICE.md; elevation estimated',points:TRACK}));
