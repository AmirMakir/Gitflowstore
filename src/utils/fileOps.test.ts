import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pathExists, copyFiles, createSymlinks } from './fileOps';

vi.mock('fs/promises', () => ({
  access: vi.fn(),
  copyFile: vi.fn(),
  mkdir: vi.fn(),
  symlink: vi.fn(),
}));

import * as fs from 'fs/promises';

const mockAccess = vi.mocked(fs.access);
const mockCopyFile = vi.mocked(fs.copyFile);
const mockMkdir = vi.mocked(fs.mkdir);
const mockSymlink = vi.mocked(fs.symlink);

describe('fileOps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockCopyFile.mockResolvedValue(undefined);
    mockSymlink.mockResolvedValue(undefined);
  });

  // Test 36
  it('pathExists returns true when fs.access succeeds', async () => {
    mockAccess.mockResolvedValue(undefined);

    const result = await pathExists('/some/file');

    expect(result).toBe(true);
  });

  // Test 37
  it('pathExists returns false when fs.access throws', async () => {
    mockAccess.mockRejectedValue(new Error('ENOENT'));

    const result = await pathExists('/missing/file');

    expect(result).toBe(false);
  });

  // Test 38
  it('copyFiles copies only existing source files', async () => {
    // .env exists, .env.local does not
    mockAccess.mockImplementation(async (filePath) => {
      const p = String(filePath);
      if (p.endsWith('.env.local')) {
        throw new Error('ENOENT');
      }
      return undefined;
    });

    await copyFiles('/source', '/target', ['.env', '.env.local']);

    expect(mockCopyFile).toHaveBeenCalledTimes(1);
    expect(mockMkdir).toHaveBeenCalled();
  });

  // Test 39
  it('createSymlinks uses correct type and skips existing destinations', async () => {
    // node_modules: source exists, dest does NOT exist → should create symlink
    // .cache: source exists, dest ALSO exists → should skip
    mockAccess.mockImplementation(async (filePath) => {
      const p = String(filePath).replace(/\\/g, '/');
      // Source paths: always exist
      if (p.includes('source/node_modules') || p.includes('source/.cache')) {
        return undefined;
      }
      // Dest: node_modules does not exist
      if (p.includes('target/node_modules')) {
        throw new Error('ENOENT');
      }
      // Dest: .cache exists
      if (p.includes('target/.cache')) {
        return undefined;
      }
      throw new Error('ENOENT');
    });

    await createSymlinks('/source', '/target', ['node_modules', '.cache']);

    // symlink called only for node_modules (not .cache since dest already exists)
    expect(mockSymlink).toHaveBeenCalledTimes(1);
    // On win32 platform the type would be 'junction', on linux 'dir'
    const symlinkType = mockSymlink.mock.calls[0][2];
    expect(['junction', 'dir']).toContain(symlinkType);
  });
});
