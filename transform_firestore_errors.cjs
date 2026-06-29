const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else {
            results.push(fullPath);
        }
    });
    return results;
}

const allFiles = walk(path.join(process.cwd(), 'src'));
const filesToProcess = allFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

let modifications = 0;

for (const file of filesToProcess) {
    if (!file.includes('firestoreErrorHandler')) {
        let content = fs.readFileSync(file, 'utf8');
        let original = content;

        // If it doesn't import onSnapshot or getDocs etc, we skip unless it has them
        if (!content.includes('firebase/firestore')) continue;

        // Add import
        if (!content.includes('handleFirestoreError')) {
            const depth = file.split(path.sep).length - 2;
            const prefix = depth <= 1 ? '.' : '..'.repeat(depth - 1);
            let relPath = path.relative(path.dirname(file), path.join(process.cwd(), 'src/lib/firestoreErrorHandler')).replace(/\\/g, '/');
            if (!relPath.startsWith('.')) relPath = './' + relPath;
            content = `import { handleFirestoreError, OperationType } from '${relPath}';\n` + content;
        } else if (content.includes('handleFirestoreError') && !content.includes('OperationType')) {
            content = content.replace(/import { handleFirestoreError }/, 'import { handleFirestoreError, OperationType }');
        }

        // Extremely simple hack for onSnapshot error handling:
        // We look for `onSnapshot(` and see if it ends with `});` or similar, but the easiest way is to modify the components manually, or just do a regex for common cases.
        // Let's do catch blocks first:
        // catch (error) { ... } or catch (e) { ... }
        // We can replace standard `catch (e: any) { alert(e.message) }` or similar, 
        // string replacement is very brittle. Let's just output which ones need manual work.

        if (content !== original) {
            fs.writeFileSync(file, content, 'utf8');
        }
    }
}
