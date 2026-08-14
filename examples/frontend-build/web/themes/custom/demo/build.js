'use strict';

const fs = require('fs');
const path = require('path');
const dest = path.join(__dirname, 'dist');
fs.mkdirSync(dest, {recursive: true});
fs.writeFileSync(path.join(dest, 'built.txt'), 'built\n');
