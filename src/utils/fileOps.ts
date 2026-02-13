import * as fs from 'fs/promises';
import * as path from 'path';

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function copyFiles(
  sourceDir: string,
  targetDir: string,
  files: string[]
): Promise<void> {
  for (const file of files) {
    const src = path.join(sourceDir, file);
    const dest = path.join(targetDir, file);

    if (await pathExists(src)) {
      const destDir = path.dirname(dest);
      await fs.mkdir(destDir, { recursive: true });
      await fs.copyFile(src, dest);
    }
  }
}

export async function createSymlinks(
  sourceDir: string,
  targetDir: string,
  dirs: string[]
): Promise<void> {
  for (const dir of dirs) {
    const src = path.join(sourceDir, dir);
    const dest = path.join(targetDir, dir);

    if (!(await pathExists(src))) {
      continue;
    }

    if (await pathExists(dest)) {
      continue;
    }

    const destParent = path.dirname(dest);
    await fs.mkdir(destParent, { recursive: true });

    // Use 'junction' on Windows (doesn't require admin privileges)
    const type = process.platform === 'win32' ? 'junction' : 'dir';
    await fs.symlink(src, dest, type);
  }
}
