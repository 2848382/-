const { execSync } = require('child_process');
try {
  console.log(execSync('git log -p src/components/SchoolMap.tsx').toString());
} catch(e) {
  console.log(e.toString());
}
