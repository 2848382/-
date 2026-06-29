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
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Check if file uses firestore methods
    if (!content.includes('firebase/firestore') || file.includes('firestoreErrorHandler.ts')) {
        continue;
    }

    // Add import if not present
    if (!content.includes('handleFirestoreError')) {
        const depth = file.split(path.sep).length - 2; // -1 for src, -1 for current file
        const prefix = depth <= 1 ? '.' : '..'.repeat(depth - 1);
        const relPath = path.relative(path.dirname(file), path.join(process.cwd(), 'src/lib/firestoreErrorHandler')).replace(/\\/g, '/');
        const importPath = relPath.startsWith('.') ? relPath : './' + relPath;
        
        content = `import { handleFirestoreError, OperationType } from '${importPath}';\n` + content;
        
        // Also import OperationType if not there (already in same import)
    }

    // Replace onSnapshot error callbacks for common patterns
    // e.g. onSnapshot(ref, (snap) => {...}, (error) => {...})
    // This is hard to do with regex without breaking code.
    
    // Instead we will replace top level catch blocks that are in async functions, e.g.
    /*
      } catch (e) {
        ...
        throw e;
      }
    */
    // We can replace standard console.error/catch in my known files.
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        modifications++;
    }
}

console.log('Modified files:', modifications);
